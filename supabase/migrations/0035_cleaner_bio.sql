-- 0035_cleaner_bio.sql
-- Cleaner "About me" — a short self-introduction shown to customers on the
-- booking cleaner card. A trust signal in a marketplace where a stranger enters
-- your home: "who is coming?". Additive `cleaner_details.bio`; the cleaner edits
-- it on their own profile (existing RLS lets them update their own row). Customers
-- can't read cleaner_details directly, so a tiny SECURITY DEFINER reader exposes
-- just the (trimmed) bio — the same controlled-reveal pattern as get_cleaner_card.

ALTER TABLE cleaner_details ADD COLUMN IF NOT EXISTS bio text;

CREATE OR REPLACE FUNCTION get_cleaner_bio(p_cleaner uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT nullif(btrim(cd.bio), '')
  FROM cleaner_details cd
  WHERE cd.profile_id = p_cleaner;
$$;

GRANT EXECUTE ON FUNCTION get_cleaner_bio(uuid) TO authenticated;
