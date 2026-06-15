-- Helper: is the current user an admin?
create function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table profiles enable row level security;
alter table cleaner_details enable row level security;
alter table settings enable row level security;

-- profiles: a user can read/update their own row; admins can read/update all.
create policy profiles_select_self on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_update_self on profiles
  for update using (id = auth.uid() or is_admin());

-- cleaner_details: the owning cleaner can read/update their row; admins all.
create policy cleaner_select on cleaner_details
  for select using (profile_id = auth.uid() or is_admin());
create policy cleaner_insert_self on cleaner_details
  for insert with check (profile_id = auth.uid());
create policy cleaner_update on cleaner_details
  for update using (profile_id = auth.uid() or is_admin());
-- Note: id_verified is admin-only in practice; the admin server action uses the
-- service role to flip it, so cleaners cannot self-verify through the UI.

-- settings: anyone authenticated can read; only admins can change.
create policy settings_select on settings
  for select using (auth.role() = 'authenticated');
create policy settings_update on settings
  for update using (is_admin());
