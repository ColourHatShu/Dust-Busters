-- 0020_customer_reviews.sql
-- Two-way reviews: the assigned cleaner can review the customer / property after a
-- job (reviews were one-directional before). One review per booking. Additive.

CREATE TABLE IF NOT EXISTS customer_reviews (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid        NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cleaner_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating      int         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;

-- Only the booking's assigned cleaner may write, and only once the job is done.
DROP POLICY IF EXISTS customer_reviews_insert ON customer_reviews;
CREATE POLICY customer_reviews_insert ON customer_reviews
  FOR INSERT WITH CHECK (
    cleaner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
        AND b.cleaner_id = auth.uid()
        AND b.status IN ('completed', 'balance_paid', 'closed')
    )
  );

-- The authoring cleaner, the reviewed customer, and admins can read rows.
DROP POLICY IF EXISTS customer_reviews_select ON customer_reviews;
CREATE POLICY customer_reviews_select ON customer_reviews
  FOR SELECT USING (
    cleaner_id = auth.uid() OR customer_id = auth.uid() OR is_admin()
  );

CREATE INDEX IF NOT EXISTS customer_reviews_customer_idx
  ON customer_reviews (customer_id);

-- Aggregate a customer's overall rating without exposing individual rows.
CREATE OR REPLACE FUNCTION get_customer_rating(p_customer uuid)
RETURNS TABLE (avg_rating numeric, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT round(avg(rating), 1), count(*)
  FROM customer_reviews WHERE customer_id = p_customer;
$$;

GRANT EXECUTE ON FUNCTION get_customer_rating(uuid) TO authenticated;
