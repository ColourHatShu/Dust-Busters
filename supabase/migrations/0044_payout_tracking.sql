-- 0044_payout_tracking.sql
-- Cleaner payouts are arranged manually (off-system, see HANDOFF). This adds
-- lightweight bookkeeping so the admin can see who is OWED what and mark a
-- payout as recorded — RECORD-KEEPING ONLY (no money moves through the app; not a
-- transfer). A booking owes its cleaner_payout once it's settled (balance_paid /
-- closed) and payout_paid_at is still null.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payout_paid_at timestamptz;

-- Fast lookup of outstanding payouts per cleaner.
CREATE INDEX IF NOT EXISTS bookings_payout_owed_idx
  ON bookings (cleaner_id)
  WHERE payout_paid_at IS NULL AND status IN ('balance_paid', 'closed');
