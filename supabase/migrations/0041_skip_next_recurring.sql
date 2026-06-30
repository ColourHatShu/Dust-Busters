-- 0041_skip_next_recurring.sql
-- Skip just the NEXT recurring visit (e.g. away one week) without pausing the
-- whole plan. Cancels the upcoming not-yet-committed booking for the series (if
-- one was generated — no deposit paid, so nothing to refund) and advances the
-- series' next_at past the skipped slot, so generation resumes at the FOLLOWING
-- occurrence. Owner-only.

CREATE OR REPLACE FUNCTION skip_next_occurrence(p_series uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
declare
  s recurring_series%rowtype;
  v_booking bookings%rowtype;
  v_skip timestamptz;
  v_guard int := 0;
begin
  select * into s from recurring_series where id = p_series for update;
  if not found then raise exception 'Series not found'; end if;
  if s.customer_id <> auth.uid() then raise exception 'forbidden'; end if;

  -- The upcoming, not-yet-committed booking for this series (if generated).
  select * into v_booking from bookings
   where series_id = p_series
     and status in ('broadcasting', 'accepted', 'no_cleaner_found')
     and scheduled_at >= now()
   order by scheduled_at asc
   limit 1;

  if found then
    v_skip := v_booking.scheduled_at;
    delete from booking_offers where booking_id = v_booking.id;
    update bookings set status = 'cancelled' where id = v_booking.id;
  else
    v_skip := s.next_at;
  end if;

  -- Advance to the occurrence AFTER the skipped one, rolled to the future.
  s.next_at := v_skip + (s.frequency_weeks * interval '7 days');
  while s.next_at < now() and v_guard < 520 loop
    s.next_at := s.next_at + (s.frequency_weeks * interval '7 days');
    v_guard := v_guard + 1;
  end loop;
  update recurring_series set next_at = s.next_at where id = p_series;

  return s.next_at;
end; $$;

GRANT EXECUTE ON FUNCTION skip_next_occurrence(uuid) TO authenticated;
