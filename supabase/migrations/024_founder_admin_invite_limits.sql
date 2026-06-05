-- Founder/Admin access and per-user invite slot limits.
-- Founder is identified by the Google account email and keeps existing role-based
-- admin support for already-promoted admin profiles.

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id = user_id
      and (
        p.role = 'admin'
        or lower(trim(coalesce(u.email, ''))) = 'mypaceotoko@gmail.com'
      )
  );
$$;

create or replace function public.invite_code_count_for_user(user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.invite_codes
  where created_by = user_id;
$$;

-- Keep direct invite_codes inserts protected even if the client is bypassed.
-- Founder/admin accounts can create unlimited invite codes; regular users can
-- create up to three current invite code rows of their own.
drop policy if exists "invite_codes_insert_creator_or_admin" on public.invite_codes;
create policy "invite_codes_insert_creator_or_admin"
  on public.invite_codes for insert
  with check (
    auth.uid() is not null
    and (created_by = auth.uid() or public.is_admin())
    and (max_uses is null or max_uses > 0)
    and (
      public.is_admin()
      or (
        created_by = auth.uid()
        and public.invite_code_count_for_user(auth.uid()) < 3
      )
    )
  );

revoke all on function public.invite_code_count_for_user(uuid) from public;
grant execute on function public.invite_code_count_for_user(uuid) to authenticated;
