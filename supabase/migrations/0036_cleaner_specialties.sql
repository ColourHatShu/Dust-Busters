-- 0036_cleaner_specialties.sql
-- Cleaner specialties/tags — a structured trust + (future) filtering signal shown
-- to customers on the cleaner card, beyond the free-text bio (e.g. deep cleaning,
-- pet-friendly, eco products). Additive `cleaner_details.specialties text[]`; the
-- cleaner edits it on their own profile (existing RLS lets them update their own
-- row). Customers can't read cleaner_details directly, so a tiny SECURITY DEFINER
-- reader exposes just the specialties array — same pattern as get_cleaner_bio (0035).

ALTER TABLE cleaner_details ADD COLUMN IF NOT EXISTS specialties text[];

CREATE OR REPLACE FUNCTION get_cleaner_specialties(p_cleaner uuid)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT cd.specialties
  FROM cleaner_details cd
  WHERE cd.profile_id = p_cleaner;
$$;

GRANT EXECUTE ON FUNCTION get_cleaner_specialties(uuid) TO authenticated;
