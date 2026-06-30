-- 0029_deposit_deadline.sql
-- deposit_deadline (added in 0008) was NEVER set, so an 'accepted' booking whose
-- customer never paid the deposit sat in 'accepted' forever — silently holding
-- the cleaner's slot, because the accept_offer schedule-conflict guard treats
-- 'accepted' as a committed job. Mirror the 0019 lazy broadcast expiry (no cron):
--   1. set deposit_deadline when a cleaner accepts (accept_offer), and
--   2. lazily enforce it on read — cancel the unpaid acceptance, free the
--      cleaner, and notify both parties.

-- Configurable window (minutes) for the customer to pay the deposit after a
-- cleaner accepts. Generous default (24h) so we only ever cancel clearly
-- abandoned bookings; the founder can shorten it in settings.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS deposit_ttl_mins int NOT NULL DEFAULT 1440;

-- Recreate accept_offer (identical to 0024) + stamp deposit_deadline on accept.
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
  v_ttl     int := coalesce((SELECT deposit_ttl_mins FROM settings WHERE id = 1), 1440);
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

  -- Schedule-conflict guard (unchanged from 0024).
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
    SET cleaner_id = v_cleaner,
        status = 'accepted',
        deposit_deadline = now() + make_interval(mins => v_ttl)
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

-- Lazy enforcement (mirror of expire_booking_if_stale): if an 'accepted' booking
-- passed its deposit_deadline with no paid deposit, cancel it (freeing the
-- cleaner's slot), expire its offers, and notify both parties. Idempotent and
-- safe for anyone to call — it only ever enforces the real deadline. Called on
-- read, like 0019.
CREATE OR REPLACE FUNCTION expire_unpaid_acceptance(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count    int;
  v_customer uuid;
  v_cleaner  uuid;
BEGIN
  UPDATE bookings
  SET status = 'cancelled',
      cancellation_reason = 'Deposit not paid in time'
  WHERE id = p_booking_id
    AND status = 'accepted'
    AND deposit_deadline IS NOT NULL
    AND deposit_deadline < now()
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.booking_id = p_booking_id
        AND p.type = 'deposit'
        AND p.status = 'paid'
    )
  RETURNING customer_id, cleaner_id INTO v_customer, v_cleaner;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    UPDATE booking_offers
    SET state = 'expired', responded_at = now()
    WHERE booking_id = p_booking_id AND state IN ('rung', 'accepted');

    INSERT INTO notifications (user_id, type, title, body, booking_id)
    VALUES (
      v_customer, 'booking_expired', 'Booking cancelled',
      'Your booking was cancelled because the deposit wasn''t paid in time. You can book again anytime.',
      p_booking_id
    );

    IF v_cleaner IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, body, booking_id)
      VALUES (
        v_cleaner, 'booking_released', 'Job released',
        'A job you accepted was cancelled — the customer didn''t pay the deposit in time. The slot is free again.',
        p_booking_id
      );
    END IF;
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION expire_unpaid_acceptance(uuid) TO authenticated;
