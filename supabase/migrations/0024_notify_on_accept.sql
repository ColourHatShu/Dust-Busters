-- 0024_notify_on_accept.sql
-- Gap fix: accept_offer committed the booking but never notified the customer, so
-- a customer who left the matching map never learned a cleaner was found and never
-- paid the deposit (the job silently fell through). Recreate the 0011 function +
-- a notification insert for the customer. (Runs in the function's definer context,
-- so the notifications insert is allowed.)

CREATE OR REPLACE FUNCTION accept_offer(p_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cleaner uuid := auth.uid();
  v_status  booking_status;
  v_sched   timestamptz;
  v_hours   numeric;
BEGIN
  IF v_cleaner IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the booking row so concurrent accepts serialize.
  SELECT status, scheduled_at, hours
    INTO v_status, v_sched, v_hours
    FROM bookings WHERE id = p_booking_id FOR UPDATE;

  IF v_status IS NULL OR v_status <> 'broadcasting' THEN
    RETURN false; -- already taken or not open
  END IF;

  -- Caller must have an active offer for this booking.
  IF NOT EXISTS (
    SELECT 1 FROM booking_offers
    WHERE booking_id = p_booking_id AND cleaner_id = v_cleaner AND state = 'rung'
  ) THEN
    RETURN false;
  END IF;

  -- Schedule-conflict guard: reject if this cleaner already holds a committed job
  -- whose window (expanded by a 1h travel buffer) overlaps this booking's window.
  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.cleaner_id = v_cleaner
      AND b.id <> p_booking_id
      AND b.status IN ('accepted', 'deposit_paid', 'in_progress')
      AND tstzrange(
            b.scheduled_at - interval '1 hour',
            b.scheduled_at + (b.hours::double precision * interval '1 hour') + interval '1 hour'
          )
          && tstzrange(
            v_sched,
            v_sched + (v_hours::double precision * interval '1 hour')
          )
  ) THEN
    RAISE EXCEPTION 'SCHEDULE_CONFLICT: you already have a job that overlaps this time';
  END IF;

  UPDATE bookings
    SET cleaner_id = v_cleaner, status = 'accepted'
    WHERE id = p_booking_id;

  UPDATE booking_offers
    SET state = 'accepted', responded_at = now()
    WHERE booking_id = p_booking_id AND cleaner_id = v_cleaner;

  -- Notify the customer so they pay the deposit even if they left the map.
  INSERT INTO notifications (user_id, type, title, body, booking_id)
  SELECT b.customer_id, 'cleaner_found', 'Cleaner found! 🎉',
         'A cleaner accepted your booking — pay your deposit to lock in your slot.',
         b.id
  FROM bookings b WHERE b.id = p_booking_id;

  RETURN true;
END;
$$;
