-- 0021_book_favorite.sql
-- "Book a favorite": optionally direct a booking to a specific cleaner. Adds a
-- 5th param p_preferred_cleaner (DEFAULT NULL) so existing 4-arg callers are
-- unchanged. If a preferred cleaner is given and is eligible (active, verified,
-- accepting, serves the area), the offer rings only them; otherwise it broadcasts
-- to everyone as before. Recreates the 0015 function body + this branch.

DROP FUNCTION IF EXISTS request_booking(timestamptz, numeric, text, text);

CREATE OR REPLACE FUNCTION request_booking(
  p_scheduled_at timestamptz,
  p_hours numeric,
  p_area text,
  p_full_address text,
  p_preferred_cleaner uuid DEFAULT NULL
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

  if p_preferred_cleaner is not null and exists (
    select 1 from cleaner_details cd
    where cd.profile_id = p_preferred_cleaner
      and cd.active and cd.id_verified and cd.accepting_jobs
      and p_area = any (cd.areas_served)
  ) then
    -- Direct request: ring only the requested cleaner.
    insert into booking_offers (booking_id, cleaner_id)
    values (v_booking, p_preferred_cleaner);
    v_count := 1;
  else
    -- Broadcast to every matching available cleaner.
    insert into booking_offers (booking_id, cleaner_id)
    select v_booking, cd.profile_id
    from cleaner_details cd
    where cd.active and cd.id_verified and cd.accepting_jobs
      and p_area = any (cd.areas_served);
    get diagnostics v_count = row_count;
  end if;

  if v_count = 0 then
    update bookings set status = 'no_cleaner_found' where id = v_booking;
  end if;

  return v_booking;
end;
$$;
