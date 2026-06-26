-- 0014_cleaner_disputes.sql
-- open_dispute hard-rejected anyone but the customer, so a lone cleaner in a
-- stranger's home had no way to report a no-show, unsafe conditions, or
-- harassment. Allow the customer OR the assigned cleaner (or an admin) to raise a
-- dispute. Only difference from 0008 is the authorisation check. Idempotent.

CREATE OR REPLACE FUNCTION open_dispute(
  p_booking_id  uuid,
  p_category    text,
  p_description text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking    bookings%ROWTYPE;
  v_dispute_id uuid;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.customer_id != auth.uid()
     AND v_booking.cleaner_id IS DISTINCT FROM auth.uid()
     AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only a participant in this booking can raise a dispute';
  END IF;

  IF v_booking.status NOT IN ('deposit_paid', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Cannot raise a dispute for booking in status: %', v_booking.status;
  END IF;

  INSERT INTO disputes (booking_id, raised_by, category, description)
  VALUES (p_booking_id, auth.uid(), p_category, p_description)
  RETURNING id INTO v_dispute_id;

  IF v_booking.status = 'completed' THEN
    UPDATE bookings SET status = 'disputed' WHERE id = p_booking_id;
  END IF;

  RETURN v_dispute_id;
END;
$$;
