-- 0018_saved_addresses.sql
-- Let customers save addresses to reuse at /book. Additive; RLS scopes every row
-- to its owner.

CREATE TABLE IF NOT EXISTS saved_addresses (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label        text,
  full_address text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_addresses_select ON saved_addresses;
CREATE POLICY saved_addresses_select ON saved_addresses
  FOR SELECT USING (customer_id = auth.uid());

DROP POLICY IF EXISTS saved_addresses_insert ON saved_addresses;
CREATE POLICY saved_addresses_insert ON saved_addresses
  FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS saved_addresses_delete ON saved_addresses;
CREATE POLICY saved_addresses_delete ON saved_addresses
  FOR DELETE USING (customer_id = auth.uid());

CREATE INDEX IF NOT EXISTS saved_addresses_customer_idx
  ON saved_addresses (customer_id);
