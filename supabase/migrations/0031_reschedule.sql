-- 0031_reschedule.sql
-- Let a customer RESCHEDULE a booking before a deposit locks it in, instead of
-- cancelling and rebooking (recovers "not today" bookings). reschedule_booking()
-- validates ownership + a pre-deposit status + a future time, moves scheduled_at,
-- resets the match, and re-rings matching cleaners for the NEW time (same logic
-- as rebroadcast_booking). If a cleaner had accepted the old time, they're
-- released + notified.

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

  -- Reset the match and re-ring for the new time.
  DELETE FROM booking_offers WHERE booking_id = p_booking_id;

  INSERT INTO booking_offers (booking_id, cleaner_id)
  SELECT p_booking_id, cd.profile_id
  FROM cleaner_details cd
  WHERE cd.active AND cd.id_verified AND cd.accepting_jobs
    AND b.area = ANY (cd.areas_served);
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
