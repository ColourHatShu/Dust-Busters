-- 0013_refund_support.sql
-- The admin refund path was broken: issueRefund inserted into payments with a
-- nonexistent column (payment_type/notes/updated_at) and an invalid enum value
-- ('refund'), so the Stripe refund fired but the DB record always failed.
-- This adds first-class refund support to the payments model.
-- NOTE: ALTER TYPE ... ADD VALUE must NOT run inside a transaction that also
-- USES the value; the apply script runs these statements with autocommit and
-- the new values are only used later at runtime.

ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'refund';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes text;
