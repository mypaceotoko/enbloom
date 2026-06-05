-- Keep the Founder account authorized even if the matching profile row has not
-- been created yet. The /admin route is email-gated on the client, while RLS and
-- moderation RPCs rely on public.is_admin() in the database.

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from auth.users u
      where u.id = user_id
        and lower(trim(coalesce(u.email, ''))) = 'mypaceotoko@gmail.com'
    ),
    false
  )
  or coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = user_id
        and p.role = 'admin'
    ),
    false
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;
