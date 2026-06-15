-- Roles enum
create type user_role as enum ('customer', 'cleaner', 'admin');

-- Profiles: one row per auth user, created on signup via trigger.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'customer',
  name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);

-- Cleaner-specific details.
create table cleaner_details (
  profile_id uuid primary key references profiles (id) on delete cascade,
  areas_served text[] not null default '{}',
  id_verified boolean not null default false,
  verified_at timestamptz,
  active boolean not null default true
);

-- Single-row platform settings.
create table settings (
  id int primary key default 1,
  hourly_rate numeric not null default 20,
  deposit_percent int not null default 60,
  currency text not null default 'CAD',
  constraint settings_singleton check (id = 1)
);

-- Auto-create a profile when a new auth user signs up.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
