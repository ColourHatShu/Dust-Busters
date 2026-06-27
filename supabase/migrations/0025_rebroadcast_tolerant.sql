-- 0025_rebroadcast_tolerant.sql
-- "Search again" could crash: re-broadcast only allowed status='no_cleaner_found',
-- but after a successful re-broadcast (or a normal broadcast) the booking is
-- 'broadcasting', and a second click (the client button lingers until the next
-- 2.5s poll) raised "Only a booking with no cleaner found can be re-broadcast".
-- Make it idempotent: allow re-ringing while broadcasting OR no_cleaner_found, and
-- always resolve the status from how many cleaners were rung. Other (committed /
-- terminal) states are still rejected.

CREATE OR REPLACE FUNCTION rebroadcast_booking(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b bookings%rowtype;
  v_count int;
  v_expires timestamptz;
BEGIN
  SELECT * INTO b FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;

  IF NOT (b.customer_id = auth.uid() OR is_admin()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF b.status NOT IN ('no_cleaner_found', 'broadcasting') THEN
    RAISE EXCEPTION 'This booking is no longer searching for a cleaner';
  END IF;

  -- Clear the stale offers (none were accepted in these states).
  DELETE FROM booking_offers WHERE booking_id = p_booking_id;

  -- Re-ring every matching, available, verified cleaner.
  INSERT INTO booking_offers (booking_id, cleaner_id)
  SELECT p_booking_id, cd.profile_id
  FROM cleaner_details cd
  WHERE cd.active AND cd.id_verified AND cd.accepting_jobs
    AND b.area = ANY (cd.areas_served);
  GET DIAGNOSTICS v_count = row_count;

  v_expires := now() + make_interval(
    mins => coalesce((SELECT broadcast_ttl_mins FROM settings WHERE id = 1), 5)
  );

  IF v_count = 0 THEN
    UPDATE bookings
    SET status = 'no_cleaner_found', broadcast_expires_at = v_expires
    WHERE id = p_booking_id;
  ELSE
    UPDATE bookings
    SET status = 'broadcasting', broadcast_expires_at = v_expires
    WHERE id = p_booking_id;
  END IF;

  RETURN jsonb_build_object('notified', v_count, 'status',
    CASE WHEN v_count = 0 THEN 'no_cleaner_found' ELSE 'broadcasting' END);
END; $$;

GRANT EXECUTE ON FUNCTION rebroadcast_booking(uuid) TO authenticated;
