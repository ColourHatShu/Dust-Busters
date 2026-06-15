-- ============================================================
-- Plan 3: Payments (Stripe)
-- ============================================================

create type payment_type as enum ('deposit', 'balance');
create type payment_status as enum ('pending', 'paid', 'failed');

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  type payment_type not null,
  stripe_payment_intent_id text,
  stripe_session_id text,
  amount numeric not null,
  status payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index payments_booking_idx on payments (booking_id);

alter table payments enable row level security;

-- A customer can read payments for their own bookings; admins read all.
-- (Writes happen only from the Stripe webhook using the service role, which
-- bypasses RLS — so no insert/update policy is granted to normal users.)
create policy payments_select on payments
  for select using (
    is_admin()
    or exists (
      select 1 from bookings b
      where b.id = payments.booking_id and b.customer_id = auth.uid()
    )
  );
