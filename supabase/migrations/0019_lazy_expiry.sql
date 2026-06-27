-- 0019_lazy_expiry.sql
-- broadcast_expires_at (0016) was set but nothing enforced it — a booking could
-- sit in 'broadcasting' forever past its window. Without a cron, enforce it
-- lazily: this is called on read (e.g. when the customer opens the booking) and
-- flips an expired broadcast to no_cleaner_found + expires its still-rung offers.
-- Idempotent and safe to call by anyone (it only ever enforces the real timeout).

CREATE OR REPLACE FUNCTION expire_booking_if_stale(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE bookings
  SET status = 'no_cleaner_found'
  WHERE id = p_booking_id
    AND status = 'broadcasting'
    AND broadcast_expires_at IS NOT NULL
    AND broadcast_expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    UPDATE booking_offers
    SET state = 'expired', responded_at = now()
    WHERE booking_id = p_booking_id AND state = 'rung';
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION expire_booking_if_stale(uuid) TO authenticated;
