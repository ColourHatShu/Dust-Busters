-- ============================================================
-- 0016_live_matching.sql — geo + RPC for the Uber-style live cleaner map
-- (renumbered from the spec's 0009). A cleaner's real location is NEVER sent to
-- the browser: pins are synthesized (deterministic fuzz), authorised + fuzzed
-- entirely inside a SECURITY DEFINER RPC. See docs/specs/uber-cleaner-map.md.
-- ============================================================

-- 1. Area centroids (single source of truth in the DB).
CREATE TABLE IF NOT EXISTS area_centroids (
  area        text PRIMARY KEY,
  center_lat  double precision NOT NULL,
  center_lng  double precision NOT NULL,
  radius_km   double precision NOT NULL DEFAULT 1.8
);
INSERT INTO area_centroids (area, center_lat, center_lng) VALUES
  ('Courtenay',  49.6877, -124.9936),
  ('Comox',      49.6733, -124.9022),
  ('Cumberland', 49.6208, -125.0306)
ON CONFLICT (area) DO NOTHING;

ALTER TABLE area_centroids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS area_centroids_read ON area_centroids;
CREATE POLICY area_centroids_read ON area_centroids
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Honest broadcast timeout + admin-tunable TTL.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS broadcast_expires_at timestamptz;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS broadcast_ttl_mins int NOT NULL DEFAULT 5;

-- 3. Optional opt-in coarse cleaner base (never exposed raw — always fuzzed).
ALTER TABLE cleaner_details
  ADD COLUMN IF NOT EXISTS approx_lat double precision,
  ADD COLUMN IF NOT EXISTS approx_lng double precision;

-- 4. Set the broadcast expiry on insert (trigger keeps request_booking untouched).
CREATE OR REPLACE FUNCTION set_broadcast_expiry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'broadcasting' AND NEW.broadcast_expires_at IS NULL THEN
    NEW.broadcast_expires_at := now() + make_interval(
      mins => coalesce((SELECT broadcast_ttl_mins FROM settings WHERE id = 1), 5)
    );
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_set_broadcast_expiry ON bookings;
CREATE TRIGGER trg_set_broadcast_expiry
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_broadcast_expiry();

-- 5. Deterministic fuzz: stable per (cleaner, booking), inside the disc, fake.
CREATE OR REPLACE FUNCTION fuzz_pin(p_cleaner uuid, p_booking uuid, p_area text)
RETURNS TABLE (lat double precision, lng double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; h bigint; ang double precision; dist_km double precision;
BEGIN
  SELECT center_lat, center_lng, radius_km INTO c
  FROM area_centroids WHERE area = p_area;
  IF NOT FOUND THEN
    c := ROW(49.6877, -124.9936, 1.8);
  END IF;

  h       := ('x' || substr(md5(p_cleaner::text || ':' || p_booking::text), 1, 16))::bit(64)::bigint;
  ang     := (((h % 3600) + 3600) % 3600) / 3600.0 * 2 * pi();
  dist_km := 0.6 + (((abs(h) / 3600) % 1000) / 1000.0) * c.radius_km;

  lat := c.center_lat + (dist_km / 110.574) * cos(ang);
  lng := c.center_lng + (dist_km / (111.320 * cos(radians(c.center_lat)))) * sin(ang);
  RETURN NEXT;
END; $$;

-- 6. THE map data contract — the only path map data reaches the customer.
CREATE OR REPLACE FUNCTION get_booking_matching(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b bookings%rowtype; v_center record;
  v_pins jsonb; v_notified int; v_deciding int; v_winner jsonb := null;
BEGIN
  SELECT * INTO b FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  IF NOT (b.customer_id = auth.uid() OR is_admin()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT center_lat, center_lng INTO v_center FROM area_centroids WHERE area = b.area;

  SELECT count(*), count(*) FILTER (WHERE o.state = 'rung')
    INTO v_notified, v_deciding
  FROM booking_offers o WHERE o.booking_id = p_booking_id;

  SELECT coalesce(jsonb_agg(pin), '[]'::jsonb) INTO v_pins
  FROM (
    SELECT jsonb_build_object(
             'k',     substr(md5(o.cleaner_id::text || ':' || p_booking_id::text), 1, 8),
             'lat',   coalesce(cd.approx_lat, f.lat),
             'lng',   coalesce(cd.approx_lng, f.lng),
             'state', o.state
           ) AS pin
    FROM booking_offers o
    JOIN cleaner_details cd ON cd.profile_id = o.cleaner_id
    CROSS JOIN LATERAL fuzz_pin(o.cleaner_id, p_booking_id, b.area) f
    WHERE o.booking_id = p_booking_id
      AND o.state IN ('rung', 'accepted')
    ORDER BY o.created_at
    LIMIT 14
  ) s;

  IF b.status = 'accepted' AND b.cleaner_id IS NOT NULL THEN
    SELECT jsonb_build_object(
             'name', gc.name, 'verified', gc.id_verified,
             'jobs', gc.jobs_completed, 'rating', gc.avg_rating,
             'scheduled_at', b.scheduled_at)
      INTO v_winner
    FROM get_cleaner_card(b.cleaner_id) gc;
  END IF;

  RETURN jsonb_build_object(
    'status',     b.status,
    'area',       b.area,
    'center',     jsonb_build_object('lat', v_center.center_lat, 'lng', v_center.center_lng),
    'notified',   v_notified,
    'deciding',   v_deciding,
    'expires_at', b.broadcast_expires_at,
    'pins',       v_pins,
    'winner',     v_winner
  );
END; $$;

GRANT EXECUTE ON FUNCTION get_booking_matching(uuid) TO authenticated;
