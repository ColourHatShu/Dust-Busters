-- 0009_security_hardening.sql
-- Closes three P0 security holes found in the production-readiness audit.
-- All changes are additive (new functions/triggers + grant changes); safe to
-- apply with `supabase db push`.

-- ---------------------------------------------------------------------------
-- 1. Privilege escalation via profiles UPDATE
--    profiles_update_self had USING but no WITH CHECK, so a user updating their
--    own row could set role='admin'. RLS WITH CHECK can't compare to the OLD
--    value, so enforce it with a BEFORE UPDATE trigger: non-admins may not
--    change their role (or id).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only an admin can change a user role';
    END IF;
    -- id is the auth user id; it must never change.
    NEW.id := OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privesc ON profiles;
CREATE TRIGGER trg_prevent_profile_privesc
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_profile_privilege_escalation();

-- ---------------------------------------------------------------------------
-- 2. Cleaner self-verification via cleaner_details INSERT/UPDATE
--    Policies allowed the owning cleaner to write their row, including
--    id_verified=true. Force id_verified to stay admin-controlled.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_cleaner_verification_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.id_verified := false;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.id_verified := COALESCE(OLD.id_verified, false);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_cleaner_verification ON cleaner_details;
CREATE TRIGGER trg_enforce_cleaner_verification
  BEFORE INSERT OR UPDATE ON cleaner_details
  FOR EACH ROW EXECUTE FUNCTION enforce_cleaner_verification_admin_only();

-- ---------------------------------------------------------------------------
-- 3. create_notification SECURITY DEFINER RPC was callable by any user against
--    any recipient (notification spoofing). The app never calls this RPC from
--    the client (it inserts notifications via the service role), so revoke
--    client access entirely; keep it available to the service role only.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION create_notification(uuid, text, text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_notification(uuid, text, text, text, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION create_notification(uuid, text, text, text, uuid) TO service_role;
