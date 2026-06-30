-- 0033_cleaner_time_off.sql
-- Let a cleaner block specific dates they're unavailable (vacation, appointments)
-- beyond the on/off toggle. The dispatcher (request_booking) then skips a cleaner
-- who has the requested service date (in Pacific wall-time) blocked, so they're
-- never rung for a day they can't work — improving match quality and cutting
-- wasted offers. Fully additive: a cleaner with no time-off rows behaves exactly
-- as before (always eligible). RLS scopes every row to the owning cleaner.

CREATE TABLE IF NOT EXISTS cleaner_time_off (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  off_date    date        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cleaner_id, off_date)
);

ALTER TABLE cleaner_time_off ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cleaner_time_off_select ON cleaner_time_off;
CREATE POLICY cleaner_time_off_select ON cleaner_time_off
  FOR SELECT USING (cleaner_id = auth.uid());

DROP POLICY IF EXISTS cleaner_time_off_insert ON cleaner_time_off;
CREATE POLICY cleaner_time_off_insert ON cleaner_time_off
  FOR INSERT WITH CHECK (cleaner_id = auth.uid());

DROP POLICY IF EXISTS cleaner_time_off_delete ON cleaner_time_off;
CREATE POLICY cleaner_time_off_delete ON cleaner_time_off
  FOR DELETE USING (cleaner_id = auth.uid());

CREATE INDEX IF NOT EXISTS cleaner_time_off_cleaner_idx
  ON cleaner_time_off (cleaner_id, off_date);

-- Recreate request_booking (the 0032 7-arg body) with one added eligibility
-- filter: exclude cleaners who blocked the booking's service date. The date is
-- resolved in America/Vancouver wall-time to match how the customer picked it.
CREATE OR REPLACE FUNCTION request_booking(
  p_scheduled_at timestamptz,
  p_hours numeric,
  p_area text,
  p_full_address text,
  p_preferred_cleaner uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_checklist text[] DEFAULT NULL
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
  v_service_date date := (p_scheduled_at at time zone 'America/Vancouver')::date;
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
                        platform_fee, cleaner_payout, notes, checklist, status)
  values (v_customer, p_scheduled_at, p_hours, p_area,
          v_total, v_deposit, v_total - v_deposit,
          v_platform_fee, v_payout, nullif(btrim(coalesce(p_notes, '')), ''),
          case when coalesce(array_length(p_checklist, 1), 0) = 0
               then null else p_checklist end,
          'broadcasting')
  returning id into v_booking;

  insert into booking_addresses (booking_id, full_address)
  values (v_booking, p_full_address);

  if p_preferred_cleaner is not null and exists (
    select 1 from cleaner_details cd
    where cd.profile_id = p_preferred_cleaner
      and cd.active and cd.id_verified and cd.accepting_jobs
      and p_area = any (cd.areas_served)
      and not exists (
        select 1 from cleaner_time_off t
        where t.cleaner_id = cd.profile_id and t.off_date = v_service_date
      )
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
      );
    get diagnostics v_count = row_count;
  end if;

  if v_count = 0 then
    update bookings set status = 'no_cleaner_found' where id = v_booking;
  end if;

  return v_booking;
end;
$$;
