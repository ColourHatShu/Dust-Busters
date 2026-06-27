-- 0017_rebroadcast.sql
-- A booking that ended in 'no_cleaner_found' was a dead end. Let the customer
-- (or an admin) re-broadcast it: clear the stale offers, re-ring every matching
-- available cleaner, and reopen the search. Additive + idempotent.

CREATE OR REPLACE FUNCTION rebroadcast_booking(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b bookings%rowtype;
  v_count int;
  v_expires timestamptz;
BEGIN
  SELECT * INTO b FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;

  IF NOT (b.customer_id = auth.uid() OR is_admin()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF b.status <> 'no_cleaner_found' THEN
    RAISE EXCEPTION 'Only a booking with no cleaner found can be re-broadcast';
  END IF;

  -- Clear the stale offers (none were accepted in this state).
  DELETE FROM booking_offers WHERE booking_id = p_booking_id;

  -- Re-ring every matching, available, verified cleaner.
  INSERT INTO booking_offers (booking_id, cleaner_id)
  SELECT p_booking_id, cd.profile_id
  FROM cleaner_details cd
  WHERE cd.active AND cd.id_verified AND cd.accepting_jobs
    AND b.area = ANY (cd.areas_served);
  GET DIAGNOSTICS v_count = row_count;

  v_expires := now() + make_interval(
    mins => coalesce((SELECT broadcast_ttl_mins FROM settings WHERE id = 1), 5)
  );

  IF v_count = 0 THEN
    -- Still nobody available — stay in no_cleaner_found, just refresh the window.
    UPDATE bookings SET broadcast_expires_at = v_expires WHERE id = p_booking_id;
  ELSE
    UPDATE bookings
    SET status = 'broadcasting', broadcast_expires_at = v_expires
    WHERE id = p_booking_id;
  END IF;

  RETURN jsonb_build_object('notified', v_count, 'status',
    CASE WHEN v_count = 0 THEN 'no_cleaner_found' ELSE 'broadcasting' END);
END; $$;

GRANT EXECUTE ON FUNCTION rebroadcast_booking(uuid) TO authenticated;
