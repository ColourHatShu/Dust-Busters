-- 0026_fix_admin_verify.sql
-- Bug: admin "Verify cleaner" did nothing. setCleanerVerified writes id_verified
-- via the service-role client, but the 0009 trigger forced id_verified back to its
-- old value whenever NOT is_admin() — and is_admin() is false for the service role
-- (its auth.uid() is null), so the verify was silently reverted. Allow the trusted
-- service role (auth.role() = 'service_role') in addition to admins. Authenticated
-- non-admins (cleaners) still cannot self-verify.

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
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.id_verified := COALESCE(OLD.id_verified, false);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
