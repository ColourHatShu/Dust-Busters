-- 0027_longer_broadcast_window.sql
-- The broadcast search window was 5 minutes — far too short for a scheduled-
-- cleaning marketplace with thin supply: an offer vanished from cleaners' lists
-- (and the booking expired to no_cleaner_found) before a cleaner realistically
-- saw it. Dust Busters books future appointments, so the search can stay open
-- much longer. Bump the default + the live settings row to 24h (1440 min).
-- (Decision logged in AUTONOMOUS-LOG; admin can tune this later.)

ALTER TABLE settings ALTER COLUMN broadcast_ttl_mins SET DEFAULT 1440;
UPDATE settings SET broadcast_ttl_mins = 1440 WHERE id = 1;
