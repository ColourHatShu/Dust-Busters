-- 0039_recurring_bookings.sql
-- Recurring bookings — the retention/predictable-revenue engine for a cleaning
-- marketplace (most cleans are weekly/biweekly). A customer sets a cadence (every
-- 1/2/4 weeks); each occurrence is a normal booking that broadcasts to cleaners
-- and is paid per the existing deposit/balance flow (no auto-charge, no saved
-- cards — nothing founder-gated). Occurrences are generated LAZILY (cron-free,
-- like the 0019/0029 expiry pattern): on the customer's bookings page we ensure
-- the next occurrence exists when it's within a 10-day lead window and the series
-- has no current live booking (so never duplicates, never spams).

CREATE TABLE IF NOT EXISTS recurring_series (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  frequency_weeks   int         NOT NULL CHECK (frequency_weeks IN (1, 2, 4)),
  hours             numeric     NOT NULL,
  area              text        NOT NULL,
  full_address      text        NOT NULL,
  notes             text,
  checklist         text[],
  preferred_cleaner uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  active            boolean     NOT NULL DEFAULT true,
  next_at           timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES recurring_series(id) ON DELETE SET NULL;

ALTER TABLE recurring_series ENABLE ROW LEVEL SECURITY;

-- Owner reads/manages their own series; rows are CREATED only via the
-- create_recurring_series RPC (SECURITY DEFINER), so no INSERT policy.
DROP POLICY IF EXISTS recurring_series_select ON recurring_series;
CREATE POLICY recurring_series_select ON recurring_series
  FOR SELECT USING (customer_id = auth.uid());

DROP POLICY IF EXISTS recurring_series_update ON recurring_series;
CREATE POLICY recurring_series_update ON recurring_series
  FOR UPDATE USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS recurring_series_delete ON recurring_series;
CREATE POLICY recurring_series_delete ON recurring_series
  FOR DELETE USING (customer_id = auth.uid());

CREATE INDEX IF NOT EXISTS recurring_series_customer_idx
  ON recurring_series (customer_id, active);
CREATE INDEX IF NOT EXISTS bookings_series_idx ON bookings (series_id);

-- Create a series + its first occurrence. Returns the FIRST booking id (so the
-- caller can redirect to it like a normal booking).
CREATE OR REPLACE FUNCTION create_recurring_series(
  p_first_scheduled_at timestamptz,
  p_frequency_weeks int,
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
  v_series uuid;
  v_booking uuid;
begin
  if v_customer is null then raise exception 'Not authenticated'; end if;
  if p_frequency_weeks not in (1, 2, 4) then
    raise exception 'Invalid recurrence frequency';
  end if;

  insert into recurring_series (customer_id, frequency_weeks, hours, area,
                                full_address, notes, checklist, preferred_cleaner,
                                next_at)
  values (v_customer, p_frequency_weeks, p_hours, p_area, p_full_address,
          nullif(btrim(coalesce(p_notes, '')), ''),
          case when coalesce(array_length(p_checklist, 1), 0) = 0
               then null else p_checklist end,
          p_preferred_cleaner,
          p_first_scheduled_at + (p_frequency_weeks * interval '7 days'))
  returning id into v_series;

  -- First occurrence broadcasts now (reuses all the pricing/matching logic).
  v_booking := request_booking(p_first_scheduled_at, p_hours, p_area,
                               p_full_address, p_preferred_cleaner, p_notes,
                               p_checklist);
  update bookings set series_id = v_series where id = v_booking;

  return v_booking;
end; $$;

GRANT EXECUTE ON FUNCTION create_recurring_series(timestamptz, int, numeric, text, text, uuid, text, text[]) TO authenticated;

-- Lazily ensure each of the caller's active series has its next occurrence
-- scheduled. Idempotent + bounded: per series it creates at most one booking per
-- call, only when next_at is within a 10-day lead window AND no live booking for
-- the series already exists. Missed past occurrences are skipped (rolled forward,
-- not back-filled). Returns the number of occurrences created.
CREATE OR REPLACE FUNCTION generate_due_recurring(p_customer uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
declare
  s recurring_series%rowtype;
  v_booking uuid;
  v_made int := 0;
  v_guard int;
begin
  if p_customer is null or p_customer <> auth.uid() then
    raise exception 'forbidden';
  end if;

  for s in
    select * from recurring_series
    where customer_id = p_customer and active
    for update
  loop
    -- Roll next_at forward to the next future occurrence (bounded ~10y).
    v_guard := 0;
    while s.next_at < now() and v_guard < 520 loop
      s.next_at := s.next_at + (s.frequency_weeks * interval '7 days');
      v_guard := v_guard + 1;
    end loop;
    update recurring_series set next_at = s.next_at where id = s.id;

    if s.next_at <= now() + interval '10 days'
       and not exists (
         select 1 from bookings b
         where b.series_id = s.id
           and b.status in ('broadcasting', 'accepted', 'deposit_paid',
                            'in_progress', 'completed')
       )
    then
      v_booking := request_booking(s.next_at, s.hours, s.area, s.full_address,
                                   s.preferred_cleaner, s.notes, s.checklist);
      update bookings set series_id = s.id where id = v_booking;
      update recurring_series
        set next_at = s.next_at + (s.frequency_weeks * interval '7 days')
        where id = s.id;
      v_made := v_made + 1;
    end if;
  end loop;

  return v_made;
end; $$;

GRANT EXECUTE ON FUNCTION generate_due_recurring(uuid) TO authenticated;
