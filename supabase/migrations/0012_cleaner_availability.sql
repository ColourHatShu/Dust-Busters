-- 0012_cleaner_availability.sql
-- Cleaner self-serve Online/Offline toggle. Previously the only on/off was the
-- admin-controlled `active` flag, so a cleaner who is sick / fully booked / on
-- vacation kept getting offers they had to decline. Add `accepting_jobs` (the
-- cleaner controls this themselves) and gate the dispatch fan-out on it.
-- Additive + idempotent.

ALTER TABLE cleaner_details
  ADD COLUMN IF NOT EXISTS accepting_jobs boolean NOT NULL DEFAULT true;

-- Recreate request_booking with the extra dispatch condition (only difference
-- from 0003 is `and cd.accepting_jobs` in the fan-out WHERE).
CREATE OR REPLACE FUNCTION request_booking(
  p_scheduled_at timestamptz,
  p_hours numeric,
  p_area text,
  p_full_address text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
declare
  v_customer uuid := auth.uid();
  v_rate numeric;
  v_deposit_pct int;
  v_total numeric;
  v_deposit numeric;
  v_booking uuid;
  v_count int;
begin
  if v_customer is null then
    raise exception 'Not authenticated';
  end if;

  select hourly_rate, deposit_percent into v_rate, v_deposit_pct
  from settings where id = 1;

  v_total := round(v_rate * p_hours, 2);
  v_deposit := round(v_total * v_deposit_pct / 100.0, 2);

  insert into bookings (customer_id, scheduled_at, hours, area,
                        total_amount, deposit_amount, balance_amount, status)
  values (v_customer, p_scheduled_at, p_hours, p_area,
          v_total, v_deposit, v_total - v_deposit, 'broadcasting')
  returning id into v_booking;

  insert into booking_addresses (booking_id, full_address)
  values (v_booking, p_full_address);

  insert into booking_offers (booking_id, cleaner_id)
  select v_booking, cd.profile_id
  from cleaner_details cd
  where cd.active and cd.id_verified and cd.accepting_jobs
    and p_area = any (cd.areas_served);

  get diagnostics v_count = row_count;
  if v_count = 0 then
    update bookings set status = 'no_cleaner_found' where id = v_booking;
  end if;

  return v_booking;
end;
$$;
