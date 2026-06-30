-- 0030_message_reports.sql
-- Trust & safety: let a booking participant flag an abusive chat message for
-- admin review. New message_reports table + a SECURITY DEFINER report_message()
-- that validates the caller participates in the message's booking (so inserts go
-- only through the RPC, never a raw client write). Admins (and the reporter) can
-- read; admins resolve status via the service-role admin client.

CREATE TABLE IF NOT EXISTS message_reports (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  uuid        NOT NULL REFERENCES booking_messages(id) ON DELETE CASCADE,
  booking_id  uuid        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reported_by uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason      text,
  status      text        NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One report per (message, reporter) — re-reporting just refreshes it.
CREATE UNIQUE INDEX IF NOT EXISTS message_reports_unique_reporter
  ON message_reports (message_id, reported_by);

ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

-- Admins see all; a reporter can see their own. No client INSERT/UPDATE policy —
-- inserts go through report_message() (definer); admins update via service role.
DROP POLICY IF EXISTS message_reports_select ON message_reports;
CREATE POLICY message_reports_select ON message_reports
  FOR SELECT USING (is_admin() OR reported_by = auth.uid());

CREATE OR REPLACE FUNCTION report_message(p_message_id uuid, p_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user    uuid := auth.uid();
  v_booking uuid;
  v_report  uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT m.booking_id INTO v_booking
  FROM booking_messages m WHERE m.id = p_message_id;
  IF v_booking IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Caller must be a participant of the message's booking.
  IF NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = v_booking
      AND (b.customer_id = v_user OR b.cleaner_id = v_user)
  ) THEN
    RAISE EXCEPTION 'Not authorized to report messages on this booking';
  END IF;

  INSERT INTO message_reports (message_id, booking_id, reported_by, reason)
  VALUES (p_message_id, v_booking, v_user, NULLIF(btrim(coalesce(p_reason, '')), ''))
  ON CONFLICT (message_id, reported_by) DO UPDATE
    SET reason = EXCLUDED.reason, status = 'open', created_at = now()
  RETURNING id INTO v_report;

  RETURN v_report;
END; $$;

GRANT EXECUTE ON FUNCTION report_message(uuid, text) TO authenticated;
