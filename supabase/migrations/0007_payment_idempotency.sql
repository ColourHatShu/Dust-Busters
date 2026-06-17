-- ============================================================
-- Production hardening: make Stripe webhook payment inserts idempotent.
-- Stripe may deliver checkout.session.completed more than once; without a
-- uniqueness guard each delivery would insert a duplicate payments row.
-- (NULLs are allowed multiple times in Postgres unique indexes, which is fine
-- since stripe_session_id is always set by the webhook insert.)
-- ============================================================

create unique index if not exists payments_session_unique
  on payments (stripe_session_id);
