-- 0028_rls_insert_participation_and_cleaner_moderation.sql
-- Closes two REST-bypassable RLS holes found in the 2026-06-28 audit (items 7 & 8).
-- All statements are idempotent (DROP ... IF EXISTS + CREATE / CREATE OR REPLACE),
-- so this migration is safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. booking_messages / disputes INSERT policies only checked the actor's own
--    id (sender_id / raised_by = auth.uid()), NOT booking participation. Via the
--    auto-generated REST API a user could insert a row for ANY booking (setting
--    their own id) and post into / open disputes on bookings they have nothing
--    to do with. The legitimate paths go through the SECURITY DEFINER RPCs
--    (send_booking_message, raise_dispute) which already enforce participation
--    and bypass RLS — so tightening these policies only blocks the direct-REST
--    abuse, not normal app usage.
--
--    Require the actor to be the booking's customer or assigned cleaner (admins
--    remain allowed, consistent with the matching SELECT policies).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS booking_messages_insert ON booking_messages;
CREATE POLICY booking_messages_insert ON booking_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.id = booking_id
          AND (b.customer_id = auth.uid() OR b.cleaner_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS disputes_insert ON disputes;
CREATE POLICY disputes_insert ON disputes
  FOR INSERT WITH CHECK (
    raised_by = auth.uid()
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.id = booking_id
          AND (b.customer_id = auth.uid() OR b.cleaner_id = auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. cleaner_details UPDATE had a USING clause but no WITH CHECK, and the
--    moderation field `active` (admin suspension) was not pinned. A suspended
--    cleaner (active=false, set by an admin via the service role) could simply
--    flip active=true on their own row through the REST API and re-enter the
--    matching fan-out, bypassing moderation. The 0009 trigger only pinned
--    id_verified.
--
--    `active` is admin-only moderation, so we pin it for non-admins exactly the
--    way id_verified is pinned (RLS WITH CHECK can't compare to the OLD value).
--    `accepting_jobs` is intentionally NOT pinned: it is the cleaner's own
--    self-service vacation toggle (setAvailability), and while suspended
--    (active=false) it cannot re-enable matching on its own. The added WITH
--    CHECK also stops a non-admin from re-homing the row to another profile_id.
-- ---------------------------------------------------------------------------

-- Extend the existing verification trigger function to also pin `active`.
-- NOTE: keep the 0026 guard (admin OR service_role). Admin moderation
-- (setCleanerActive / setCleanerVerified) writes via the service-role client,
-- whose auth.uid() is null (is_admin() = false); without the service_role
-- branch those trusted writes would be silently reverted — the exact bug 0026
-- fixed for id_verified.
CREATE OR REPLACE FUNCTION enforce_cleaner_verification_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_admin() OR auth.role() = 'service_role') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.id_verified := false;
      NEW.active      := true;   -- table default; cleaners onboard active
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.id_verified := COALESCE(OLD.id_verified, false);
      NEW.active      := COALESCE(OLD.active, true);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger already exists from 0009 and points at this function; re-create it
-- idempotently so a fresh DB / re-run is consistent.
DROP TRIGGER IF EXISTS trg_enforce_cleaner_verification ON cleaner_details;
CREATE TRIGGER trg_enforce_cleaner_verification
  BEFORE INSERT OR UPDATE ON cleaner_details
  FOR EACH ROW EXECUTE FUNCTION enforce_cleaner_verification_admin_only();

-- Add the missing WITH CHECK to the UPDATE policy (mirror of USING) so a
-- non-admin cannot validate a NEW row that belongs to someone else.
DROP POLICY IF EXISTS cleaner_update ON cleaner_details;
CREATE POLICY cleaner_update ON cleaner_details
  FOR UPDATE
  USING (profile_id = auth.uid() OR is_admin())
  WITH CHECK (profile_id = auth.uid() OR is_admin());
