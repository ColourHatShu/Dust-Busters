-- 0023_fix_role_onboarding.sql
-- Regression fix: the 0009 privilege-escalation trigger blocked ALL role changes
-- by non-admins, which also broke legitimate self-service onboarding (a customer
-- upgrading themselves to 'cleaner' via /cleaner/onboard). Narrow the rule: a
-- non-admin may switch their own role between customer/cleaner, but may NEVER
-- grant themselves 'admin'. The escalation protection (no self-promote to admin)
-- is preserved.

CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    -- Block self-promotion to admin (the original security fix)...
    IF NEW.role = 'admin' AND OLD.role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only an admin can grant the admin role';
    END IF;
    -- ...and never let the row's id (the auth user id) change.
    NEW.id := OLD.id;
  END IF;
  RETURN NEW;
END;
$$;
