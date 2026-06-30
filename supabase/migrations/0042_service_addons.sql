-- 0042_service_addons.sql
-- Service add-ons / paid extras (inside fridge/oven, interior windows, laundry…)
-- the customer can add at booking — an AOV upsell. total = base (hours·rate) +
-- add-ons; the cleaner's payout is on the FULL total (they do the extra work);
-- any promo discount + commission then apply to the new total (consistent with
-- 0040). booking_addons snapshots the label+price at booking time so later price
-- edits don't rewrite past bookings. Test-mode safe (ordinary deposit/balance).

CREATE TABLE IF NOT EXISTS service_addons (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        NOT NULL UNIQUE,
  label      text        NOT NULL,
  price      numeric     NOT NULL CHECK (price >= 0),
  active     boolean     NOT NULL DEFAULT true,
  sort       int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_addons (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_key  text        NOT NULL,
  label      text        NOT NULL,
  price      numeric     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS booking_addons_booking_idx ON booking_addons (booking_id);

ALTER TABLE service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read the active add-on menu (it's shown on /book); admins
-- manage it. (Use an explicit read policy + admin-all.)
DROP POLICY IF EXISTS service_addons_read ON service_addons;
CREATE POLICY service_addons_read ON service_addons
  FOR SELECT USING (active OR is_admin());
DROP POLICY IF EXISTS service_addons_admin ON service_addons;
CREATE POLICY service_addons_admin ON service_addons
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- A booking's add-ons are visible to its customer, its assigned cleaner, or admin.
DROP POLICY IF EXISTS booking_addons_read ON booking_addons;
CREATE POLICY booking_addons_read ON booking_addons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_addons.booking_id
        AND (b.customer_id = auth.uid() OR b.cleaner_id = auth.uid() OR is_admin())
    )
  );
-- Rows are written only by request_booking (SECURITY DEFINER) — no insert policy.

-- Recreate request_booking (0040 body) with a 9th param p_addons and the add-on
-- math. Old 8-arg signature dropped; 7-arg callers (recurring) still resolve.
DROP FUNCTION IF EXISTS request_booking(timestamptz, numeric, text, text, uuid, text, text[], text);

CREATE OR REPLACE FUNCTION request_booking(
  p_scheduled_at timestamptz,
  p_hours numeric,
  p_area text,
  p_full_address text,
  p_preferred_cleaner uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_checklist text[] DEFAULT NULL,
  p_promo_code text DEFAULT NULL,
  p_addons text[] DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
declare
  v_customer uuid := auth.uid();
  v_rate numeric;
  v_deposit_pct int;
  v_commission_pct numeric;
  v_addons_total numeric := 0;
  v_total numeric;
  v_total_after numeric;
  v_discount numeric := 0;
  v_deposit numeric;
  v_platform_fee numeric;
  v_payout numeric;
  v_booking uuid;
  v_count int;
  v_promo promo_codes%rowtype;
  v_service_date date := (p_scheduled_at at time zone 'America/Vancouver')::date;
  v_dow int := extract(dow from (p_scheduled_at at time zone 'America/Vancouver'))::int;
begin
  if v_customer is null then
    raise exception 'Not authenticated';
  end if;

  select hourly_rate, deposit_percent, commission_percent
    into v_rate, v_deposit_pct, v_commission_pct
  from settings where id = 1;

  -- Paid add-ons (only valid, active ones count).
  select coalesce(sum(price), 0) into v_addons_total
  from service_addons
  where active and key = any (coalesce(p_addons, '{}'::text[]));

  v_total := round(v_rate * p_hours, 2) + v_addons_total;
  -- Cleaner is paid for the full work (incl. add-ons), regardless of any promo.
  v_payout := v_total - round(v_total * coalesce(v_commission_pct, 15) / 100.0, 2);

  -- Apply a valid promo (platform-absorbs). Lock the row so used_count is atomic.
  if p_promo_code is not null and btrim(p_promo_code) <> '' then
    select * into v_promo from promo_codes
      where code = upper(btrim(p_promo_code)) for update;
    if found and v_promo.active
       and (v_promo.expires_at is null or v_promo.expires_at >= now())
       and (v_promo.max_uses is null or v_promo.used_count < v_promo.max_uses)
       and (not v_promo.first_clean_only
            or not exists (select 1 from bookings b where b.customer_id = v_customer))
    then
      if v_promo.kind = 'percent' then
        v_discount := round(v_total * v_promo.value / 100.0, 2);
      else
        v_discount := v_promo.value;
      end if;
      v_discount := least(greatest(v_discount, 0), v_total);
      update promo_codes set used_count = used_count + 1 where id = v_promo.id;
    end if;
  end if;

  v_total_after := v_total - v_discount;
  v_deposit := round(v_total_after * v_deposit_pct / 100.0, 2);
  v_platform_fee := v_total_after - v_payout;

  insert into bookings (customer_id, scheduled_at, hours, area,
                        total_amount, deposit_amount, balance_amount,
                        platform_fee, cleaner_payout, discount_amount, promo_code,
                        notes, checklist, status)
  values (v_customer, p_scheduled_at, p_hours, p_area,
          v_total_after, v_deposit, v_total_after - v_deposit,
          v_platform_fee, v_payout, v_discount,
          case when v_discount > 0 then upper(btrim(p_promo_code)) else null end,
          nullif(btrim(coalesce(p_notes, '')), ''),
          case when coalesce(array_length(p_checklist, 1), 0) = 0
               then null else p_checklist end,
          'broadcasting')
  returning id into v_booking;

  insert into booking_addresses (booking_id, full_address)
  values (v_booking, p_full_address);

  -- Snapshot the chosen add-ons (label + price at booking time).
  insert into booking_addons (booking_id, addon_key, label, price)
  select v_booking, sa.key, sa.label, sa.price
  from service_addons sa
  where sa.active and sa.key = any (coalesce(p_addons, '{}'::text[]));

  if p_preferred_cleaner is not null and exists (
    select 1 from cleaner_details cd
    where cd.profile_id = p_preferred_cleaner
      and cd.active and cd.id_verified and cd.accepting_jobs
      and p_area = any (cd.areas_served)
      and not exists (
        select 1 from cleaner_time_off t
        where t.cleaner_id = cd.profile_id and t.off_date = v_service_date
      )
      and (coalesce(cardinality(cd.work_days), 0) = 0 or v_dow = any (cd.work_days))
  ) then
    insert into booking_offers (booking_id, cleaner_id)
    values (v_booking, p_preferred_cleaner);
    v_count := 1;
  else
    insert into booking_offers (booking_id, cleaner_id)
    select v_booking, cd.profile_id
    from cleaner_details cd
    where cd.active and cd.id_verified and cd.accepting_jobs
      and p_area = any (cd.areas_served)
      and not exists (
        select 1 from cleaner_time_off t
        where t.cleaner_id = cd.profile_id and t.off_date = v_service_date
      )
      and (coalesce(cardinality(cd.work_days), 0) = 0 or v_dow = any (cd.work_days));
    get diagnostics v_count = row_count;
  end if;

  if v_count = 0 then
    update bookings set status = 'no_cleaner_found' where id = v_booking;
  end if;

  return v_booking;
end;
$$;

-- Seed a starter add-on menu (founder can manage once an admin UI lands).
INSERT INTO service_addons (key, label, price, sort) VALUES
  ('inside_fridge',    'Inside the fridge',   25, 1),
  ('inside_oven',      'Inside the oven',      25, 2),
  ('interior_windows', 'Interior windows',     30, 3),
  ('laundry',          'Laundry & ironing',    20, 4)
ON CONFLICT (key) DO NOTHING;
