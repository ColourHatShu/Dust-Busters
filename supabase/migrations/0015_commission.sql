-- 0015_commission.sql
-- Formalise the platform commission in DATA instead of a hardcoded display-only
-- constant. Adds a configurable settings.commission_percent and stores the
-- computed platform_fee + cleaner_payout on each booking at creation time, so the
-- split is locked per booking and real revenue can be reported. Additive.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS commission_percent numeric NOT NULL DEFAULT 15;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS platform_fee   numeric,
  ADD COLUMN IF NOT EXISTS cleaner_payout numeric;

-- Recreate request_booking to compute + persist the commission split.
-- (Differences from 0012: reads commission_percent and stores platform_fee /
-- cleaner_payout on the booking.)
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
  v_commission_pct numeric;
  v_total numeric;
  v_deposit numeric;
  v_platform_fee numeric;
  v_payout numeric;
  v_booking uuid;
  v_count int;
begin
  if v_customer is null then
    raise exception 'Not authenticated';
  end if;

  select hourly_rate, deposit_percent, commission_percent
    into v_rate, v_deposit_pct, v_commission_pct
  from settings where id = 1;

  v_total := round(v_rate * p_hours, 2);
  v_deposit := round(v_total * v_deposit_pct / 100.0, 2);
  v_platform_fee := round(v_total * coalesce(v_commission_pct, 15) / 100.0, 2);
  v_payout := v_total - v_platform_fee;

  insert into bookings (customer_id, scheduled_at, hours, area,
                        total_amount, deposit_amount, balance_amount,
                        platform_fee, cleaner_payout, status)
  values (v_customer, p_scheduled_at, p_hours, p_area,
          v_total, v_deposit, v_total - v_deposit,
          v_platform_fee, v_payout, 'broadcasting')
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

-- Backfill the split for existing bookings using the current commission rate.
UPDATE bookings b
SET platform_fee = round(b.total_amount * s.commission_percent / 100.0, 2),
    cleaner_payout = b.total_amount - round(b.total_amount * s.commission_percent / 100.0, 2)
FROM settings s
WHERE s.id = 1 AND b.platform_fee IS NULL;
