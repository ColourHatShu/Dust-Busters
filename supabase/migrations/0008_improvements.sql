-- 0008_improvements.sql

-- 1. Add columns to bookings if not exists
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancelled_by text,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS deposit_deadline timestamptz;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_cancelled_by_check
    CHECK (cancelled_by IN ('customer', 'cleaner', 'system', 'admin'))
    NOT VALID;

-- 2. Add 'disputed' to booking_status enum
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'disputed' AFTER 'completed';

-- 3. Create booking_messages table
CREATE TABLE IF NOT EXISTS booking_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY booking_messages_select ON booking_messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
        AND (b.customer_id = auth.uid() OR b.cleaner_id = auth.uid())
    )
  );

CREATE POLICY booking_messages_insert ON booking_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'booking_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE booking_messages;
  END IF;
END$$;

-- 4. Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  raised_by   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category    text        NOT NULL CHECK (category IN ('no_show', 'poor_quality', 'property_damage', 'payment_issue', 'other')),
  description text        NOT NULL,
  status      text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution  text,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY disputes_select ON disputes
  FOR SELECT USING (
    raised_by = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id AND b.cleaner_id = auth.uid()
    )
  );

CREATE POLICY disputes_insert ON disputes
  FOR INSERT WITH CHECK (raised_by = auth.uid());

CREATE POLICY disputes_update_admin ON disputes
  FOR UPDATE USING (is_admin());

-- 5. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL,
  title       text        NOT NULL,
  body        text        NOT NULL,
  booking_id  uuid        REFERENCES bookings(id) ON DELETE CASCADE,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- Add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END$$;

-- 6. Create customer_favorites table
CREATE TABLE IF NOT EXISTS customer_favorites (
  customer_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cleaner_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, cleaner_id)
);

ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_favorites_select ON customer_favorites
  FOR SELECT USING (customer_id = auth.uid() OR is_admin());

CREATE POLICY customer_favorites_insert ON customer_favorites
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY customer_favorites_delete ON customer_favorites
  FOR DELETE USING (customer_id = auth.uid());

-- 7. Function: cancel_booking
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id uuid,
  p_reason     text,
  p_by         text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF NOT (v_booking.customer_id = auth.uid() OR is_admin()) THEN
    RAISE EXCEPTION 'Not authorised to cancel this booking';
  END IF;

  IF v_booking.status NOT IN ('broadcasting', 'accepted', 'deposit_paid') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled in status: %', v_booking.status;
  END IF;

  UPDATE bookings
  SET
    status              = 'cancelled',
    cancelled_by        = p_by,
    cancellation_reason = p_reason
  WHERE id = p_booking_id;
END;
$$;

-- 8. Function: open_dispute
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
  v_booking   bookings%ROWTYPE;
  v_dispute_id uuid;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.customer_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the customer can raise a dispute';
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

-- 9. Function: send_booking_message
CREATE OR REPLACE FUNCTION send_booking_message(
  p_booking_id uuid,
  p_body       text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking    bookings%ROWTYPE;
  v_message_id uuid;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF NOT (
    v_booking.customer_id = auth.uid()
    OR v_booking.cleaner_id = auth.uid()
    OR is_admin()
  ) THEN
    RAISE EXCEPTION 'Not authorised to message on this booking';
  END IF;

  INSERT INTO booking_messages (booking_id, sender_id, body)
  VALUES (p_booking_id, auth.uid(), p_body)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

-- 10. Function: create_notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id   uuid,
  p_type      text,
  p_title     text,
  p_body      text,
  p_booking_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, booking_id)
  VALUES (p_user_id, p_type, p_title, p_body, p_booking_id);
END;
$$;

-- 11. Index on booking_messages
CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_created
  ON booking_messages (booking_id, created_at);

-- 12. Index on notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, read_at);

-- 13. Index on disputes
CREATE INDEX IF NOT EXISTS idx_disputes_booking_id
  ON disputes (booking_id);
