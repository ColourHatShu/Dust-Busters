-- 0034_time_off_in_rebroadcast_reschedule.sql
-- Close the 0033 follow-up: rebroadcast_booking (0025) and reschedule_booking
-- (0031) re-ring matching cleaners but did NOT yet honour cleaner_time_off, so a
-- cleaner could still be rung for a date they blocked when a booking was
-- re-broadcast or moved to a new time. Recreate both with the same
-- "not blocked on the (Pacific) service date" filter request_booking uses (0033).
-- Bodies are otherwise identical to 0025 / 0031.

CREATE OR REPLACE FUNCTION rebroadcast_booking(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b bookings%rowtype;
  v_count int;
  v_expires timestamptz;
  v_service_date date;
BEGIN
  SELECT * INTO b FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;

  IF NOT (b.customer_id = auth.uid() OR is_admin()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF b.status NOT IN ('no_cleaner_found', 'broadcasting') THEN
    RAISE EXCEPTION 'This booking is no longer searching for a cleaner';
  END IF;

  v_service_date := (b.scheduled_at at time zone 'America/Vancouver')::date;

  -- Clear the stale offers (none were accepted in these states).
  DELETE FROM booking_offers WHERE booking_id = p_booking_id;

  -- Re-ring every matching, available, verified cleaner not blocked that date.
  INSERT INTO booking_offers (booking_id, cleaner_id)
  SELECT p_booking_id, cd.profile_id
  FROM cleaner_details cd
  WHERE cd.active AND cd.id_verified AND cd.accepting_jobs
    AND b.area = ANY (cd.areas_served)
    AND NOT EXISTS (
      SELECT 1 FROM cleaner_time_off t
      WHERE t.cleaner_id = cd.profile_id AND t.off_date = v_service_date
    );
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

CREATE OR REPLACE FUNCTION reschedule_booking(p_booking_id uuid, p_scheduled_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b           bookings%rowtype;
  v_count     int;
  v_expires   timestamptz;
  v_old_clean uuid;
  v_service_date date;
BEGIN
  SELECT * INTO b FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;

  IF b.customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Only before the deposit is paid (deposit_paid and later are committed).
  IF b.status NOT IN ('broadcasting', 'accepted', 'no_cleaner_found') THEN
    RAISE EXCEPTION 'This booking can no longer be rescheduled';
  END IF;

  IF p_scheduled_at < now() + interval '15 minutes' THEN
    RAISE EXCEPTION 'Please choose a time at least 15 minutes from now';
  END IF;

  v_old_clean := b.cleaner_id;
  v_service_date := (p_scheduled_at at time zone 'America/Vancouver')::date;

  -- Reset the match and re-ring for the new time.
  DELETE FROM booking_offers WHERE booking_id = p_booking_id;

  INSERT INTO booking_offers (booking_id, cleaner_id)
  SELECT p_booking_id, cd.profile_id
  FROM cleaner_details cd
  WHERE cd.active AND cd.id_verified AND cd.accepting_jobs
    AND b.area = ANY (cd.areas_served)
    AND NOT EXISTS (
      SELECT 1 FROM cleaner_time_off t
      WHERE t.cleaner_id = cd.profile_id AND t.off_date = v_service_date
    );
  GET DIAGNOSTICS v_count = row_count;

  v_expires := now() + make_interval(
    mins => coalesce((SELECT broadcast_ttl_mins FROM settings WHERE id = 1), 5)
  );

  UPDATE bookings
  SET scheduled_at = p_scheduled_at,
      cleaner_id = NULL,
      deposit_deadline = NULL,
      status = CASE WHEN v_count = 0 THEN 'no_cleaner_found' ELSE 'broadcasting' END,
      broadcast_expires_at = v_expires
  WHERE id = p_booking_id;

  -- Release + notify a cleaner who had accepted the old time.
  IF v_old_clean IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, booking_id)
    VALUES (v_old_clean, 'booking_rescheduled', 'A job was rescheduled',
      'A customer rescheduled a booking you had accepted, so it was released back to the pool.',
      p_booking_id);
  END IF;

  RETURN jsonb_build_object(
    'notified', v_count,
    'status', CASE WHEN v_count = 0 THEN 'no_cleaner_found' ELSE 'broadcasting' END
  );
END; $$;

GRANT EXECUTE ON FUNCTION reschedule_booking(uuid, timestamptz) TO authenticated;
