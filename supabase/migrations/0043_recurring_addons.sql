-- 0043_recurring_addons.sql
-- Let a recurring plan carry paid add-ons applied to EVERY occurrence (e.g. a
-- weekly clean that always includes interior windows). Stores the chosen add-on
-- keys on recurring_series and passes them to request_booking when the series
-- creates each booking. Promo codes stay one-time-only (not on series).

ALTER TABLE recurring_series ADD COLUMN IF NOT EXISTS addons text[];

-- Recreate create_recurring_series (0039 body) with a 9th param p_addons. Old
-- 8-arg signature dropped so the named/positional callers aren't ambiguous.
DROP FUNCTION IF EXISTS create_recurring_series(timestamptz, int, numeric, text, text, uuid, text, text[]);

CREATE OR REPLACE FUNCTION create_recurring_series(
  p_first_scheduled_at timestamptz,
  p_frequency_weeks int,
  p_hours numeric,
  p_area text,
  p_full_address text,
  p_preferred_cleaner uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_checklist text[] DEFAULT NULL,
  p_addons text[] DEFAULT NULL
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
                                addons, next_at)
  values (v_customer, p_frequency_weeks, p_hours, p_area, p_full_address,
          nullif(btrim(coalesce(p_notes, '')), ''),
          case when coalesce(array_length(p_checklist, 1), 0) = 0
               then null else p_checklist end,
          p_preferred_cleaner,
          case when coalesce(array_length(p_addons, 1), 0) = 0
               then null else p_addons end,
          p_first_scheduled_at + (p_frequency_weeks * interval '7 days'))
  returning id into v_series;

  -- First occurrence (named args so we set p_addons without a promo).
  v_booking := request_booking(
    p_scheduled_at => p_first_scheduled_at,
    p_hours => p_hours,
    p_area => p_area,
    p_full_address => p_full_address,
    p_preferred_cleaner => p_preferred_cleaner,
    p_notes => p_notes,
    p_checklist => p_checklist,
    p_addons => p_addons
  );
  update bookings set series_id = v_series where id = v_booking;

  return v_booking;
end; $$;

GRANT EXECUTE ON FUNCTION create_recurring_series(timestamptz, int, numeric, text, text, uuid, text, text[], text[]) TO authenticated;

-- generate_due_recurring: pass the series' add-ons to each generated occurrence.
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
      v_booking := request_booking(
        p_scheduled_at => s.next_at,
        p_hours => s.hours,
        p_area => s.area,
        p_full_address => s.full_address,
        p_preferred_cleaner => s.preferred_cleaner,
        p_notes => s.notes,
        p_checklist => s.checklist,
        p_addons => s.addons
      );
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
