-- ============================================================
-- Plan 2: Booking + real-time broadcast dispatch
-- ============================================================

create type booking_status as enum (
  'broadcasting', 'accepted', 'deposit_paid', 'in_progress',
  'completed', 'balance_paid', 'closed', 'cancelled', 'no_cleaner_found'
);

create type offer_state as enum ('rung', 'accepted', 'declined', 'expired');

create table bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  cleaner_id uuid references profiles (id),
  scheduled_at timestamptz not null,
  hours numeric not null check (hours > 0),
  area text not null,
  total_amount numeric not null,
  deposit_amount numeric not null,
  balance_amount numeric not null,
  status booking_status not null default 'broadcasting',
  created_at timestamptz not null default now()
);

-- Address kept in a separate table so RLS can mask it independently.
create table booking_addresses (
  booking_id uuid primary key references bookings (id) on delete cascade,
  full_address text not null
);

create table booking_offers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  cleaner_id uuid not null references profiles (id) on delete cascade,
  state offer_state not null default 'rung',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id, cleaner_id)
);

create index booking_offers_cleaner_idx on booking_offers (cleaner_id, state);
create index bookings_status_idx on bookings (status);

-- ============================================================
-- RLS
-- ============================================================
alter table bookings enable row level security;
alter table booking_addresses enable row level security;
alter table booking_offers enable row level security;

-- bookings: customer (owner), assigned cleaner, any cleaner with an offer, admin
create policy bookings_select on bookings
  for select using (
    customer_id = auth.uid()
    or cleaner_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from booking_offers o
      where o.booking_id = bookings.id and o.cleaner_id = auth.uid()
    )
  );
create policy bookings_admin_update on bookings
  for update using (is_admin());

-- booking_offers: the offered cleaner and admins
create policy offers_select on booking_offers
  for select using (cleaner_id = auth.uid() or is_admin());

-- booking_addresses: customer owner always; assigned cleaner only once the
-- booking has reached deposit_paid or later; admins always.
create policy address_select on booking_addresses
  for select using (
    exists (
      select 1 from bookings b
      where b.id = booking_addresses.booking_id
        and (
          b.customer_id = auth.uid()
          or is_admin()
          or (
            b.cleaner_id = auth.uid()
            and b.status in ('deposit_paid','in_progress','completed','balance_paid','closed')
          )
        )
    )
  );

-- ============================================================
-- Functions (SECURITY DEFINER): all authz checks are explicit inside.
-- ============================================================

-- Create a booking and ring every active, verified cleaner serving the area.
create function request_booking(
  p_scheduled_at timestamptz,
  p_hours numeric,
  p_area text,
  p_full_address text
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_customer uuid := auth.uid();
  v_rate numeric;
  v_deposit_pct int;
  v_total numeric;
  v_deposit numeric;
  v_booking uuid;
  v_count int;
begin
  if v_customer is null then
    raise exception 'Not authenticated';
  end if;

  select hourly_rate, deposit_percent into v_rate, v_deposit_pct
  from settings where id = 1;

  v_total := round(v_rate * p_hours, 2);
  v_deposit := round(v_total * v_deposit_pct / 100.0, 2);

  insert into bookings (customer_id, scheduled_at, hours, area,
                        total_amount, deposit_amount, balance_amount, status)
  values (v_customer, p_scheduled_at, p_hours, p_area,
          v_total, v_deposit, v_total - v_deposit, 'broadcasting')
  returning id into v_booking;

  insert into booking_addresses (booking_id, full_address)
  values (v_booking, p_full_address);

  insert into booking_offers (booking_id, cleaner_id)
  select v_booking, cd.profile_id
  from cleaner_details cd
  where cd.active and cd.id_verified and p_area = any (cd.areas_served);

  get diagnostics v_count = row_count;
  if v_count = 0 then
    update bookings set status = 'no_cleaner_found' where id = v_booking;
  end if;

  return v_booking;
end;
$$;

-- First cleaner to accept wins. Atomic via row lock on the booking.
create function accept_offer(p_booking_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_cleaner uuid := auth.uid();
  v_status booking_status;
begin
  if v_cleaner is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the booking row so concurrent accepts serialize.
  select status into v_status from bookings where id = p_booking_id for update;

  if v_status is null or v_status <> 'broadcasting' then
    return false; -- already taken or not open
  end if;

  -- Caller must have an active offer for this booking.
  if not exists (
    select 1 from booking_offers
    where booking_id = p_booking_id and cleaner_id = v_cleaner and state = 'rung'
  ) then
    return false;
  end if;

  update bookings
    set cleaner_id = v_cleaner, status = 'accepted'
    where id = p_booking_id;

  update booking_offers
    set state = 'accepted', responded_at = now()
    where booking_id = p_booking_id and cleaner_id = v_cleaner;

  return true;
end;
$$;

-- A cleaner declines (or backs out after accepting). Re-opens for re-broadcast.
create function decline_offer(p_booking_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_cleaner uuid := auth.uid();
  v_status booking_status;
  v_assigned uuid;
begin
  if v_cleaner is null then
    raise exception 'Not authenticated';
  end if;

  update booking_offers
    set state = 'declined', responded_at = now()
    where booking_id = p_booking_id and cleaner_id = v_cleaner;

  select status, cleaner_id into v_status, v_assigned
  from bookings where id = p_booking_id for update;

  -- If this cleaner had accepted and is now backing out, re-broadcast
  -- (only before deposit is paid).
  if v_assigned = v_cleaner and v_status = 'accepted' then
    update bookings
      set cleaner_id = null, status = 'broadcasting'
      where id = p_booking_id;
    -- Re-ring everyone who has not declined (touch rows so realtime re-notifies).
    update booking_offers
      set state = 'rung', responded_at = null
      where booking_id = p_booking_id and state <> 'declined';
  end if;
end;
$$;

-- Cleaner marks job started / completed (after deposit).
create function start_job(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update bookings set status = 'in_progress'
   where id = p_booking_id and cleaner_id = auth.uid() and status = 'deposit_paid';
end; $$;

create function complete_job(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update bookings set status = 'completed'
   where id = p_booking_id and cleaner_id = auth.uid() and status = 'in_progress';
end; $$;

-- ============================================================
-- Realtime: let cleaners subscribe to their offers + booking changes.
-- ============================================================
alter publication supabase_realtime add table booking_offers;
alter publication supabase_realtime add table bookings;
