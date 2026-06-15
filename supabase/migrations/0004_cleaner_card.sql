-- Expose only safe, public-facing cleaner info (for the trust layer on the
-- booking / payment screen). SECURITY DEFINER so customers can read it without
-- gaining access to the full profiles row.
create function get_cleaner_card(p_cleaner uuid)
returns table (name text, id_verified boolean, jobs_completed bigint)
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
    )
  from profiles p
  left join cleaner_details cd on cd.profile_id = p.id
  where p.id = p_cleaner;
$$;
