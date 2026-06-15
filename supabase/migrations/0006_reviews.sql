-- Reviews: customers can review a booking once it's done. Reviews are public so
-- the cleaner card can surface an average rating.
create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table reviews enable row level security;

create policy reviews_insert on reviews
  for insert
  with check (
    exists (
      select 1 from bookings b
      where b.id = booking_id
        and b.customer_id = auth.uid()
        and b.status in ('completed', 'balance_paid', 'closed')
    )
  );

create policy reviews_select on reviews
  for select
  using (true);

-- Redefine the cleaner card to include the average rating. The function
-- currently returns a table, so we must drop then recreate it.
drop function if exists get_cleaner_card(uuid);

create function get_cleaner_card(p_cleaner uuid)
returns table (name text, id_verified boolean, jobs_completed bigint, avg_rating numeric)
language sql
security definer set search_path = public
stable
as $$
  select
    p.name,
    coalesce(cd.id_verified, false),
    (
      select count(*) from bookings b
      where b.cleaner_id = p.id
        and b.status in ('completed', 'balance_paid', 'closed')
    ),
    (
      select round(avg(r.rating), 1)
      from reviews r
      join bookings b2 on b2.id = r.booking_id
      where b2.cleaner_id = p.id
    )
  from profiles p
  left join cleaner_details cd on cd.profile_id = p.id
  where p.id = p_cleaner;
$$;
