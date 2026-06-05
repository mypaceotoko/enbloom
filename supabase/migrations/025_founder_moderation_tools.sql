-- Founder moderation tools: account suspension and optional report targets.
-- Uses the existing public.is_admin() helper, which includes Founder email
-- mypaceotoko@gmail.com from 024_founder_admin_invite_limits.sql.

alter table public.profiles
  add column if not exists account_status text not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('active', 'suspended'));
  end if;
end $$;

create index if not exists profiles_account_status_idx
  on public.profiles(account_status);

alter table public.reports
  add column if not exists target_activity_post_id uuid references public.activity_posts(id) on delete set null,
  add column if not exists target_chat_room_id uuid references public.chat_rooms(id) on delete set null,
  add column if not exists target_chat_room_message_id uuid references public.chat_room_messages(id) on delete set null;

create index if not exists reports_target_activity_post_id_idx
  on public.reports(target_activity_post_id);

create index if not exists reports_target_chat_room_id_idx
  on public.reports(target_chat_room_id);

create index if not exists reports_target_chat_room_message_id_idx
  on public.reports(target_chat_room_message_id);

create or replace function public.is_founder_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = target_user_id
      and lower(trim(coalesce(u.email, ''))) = 'mypaceotoko@gmail.com'
  );
$$;

create or replace function public.prevent_unsafe_account_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_status is distinct from old.account_status then
    if not public.is_admin() then
      raise exception 'Only admins can update account status.';
    end if;

    if public.is_founder_profile(new.id) then
      raise exception 'Founder cannot be suspended.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_unsafe_account_status_change on public.profiles;
create trigger profiles_prevent_unsafe_account_status_change
before update on public.profiles
for each row
execute function public.prevent_unsafe_account_status_change();

create or replace function public.set_profile_account_status(
  target_user_id uuid,
  new_account_status text
)
returns table(success boolean, user_id uuid, account_status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can update account status.';
  end if;

  if new_account_status not in ('active', 'suspended') then
    raise exception 'Invalid account status.';
  end if;

  if public.is_founder_profile(target_user_id) then
    raise exception 'Founder cannot be suspended.';
  end if;

  if not exists (select 1 from public.profiles p where p.id = target_user_id) then
    raise exception 'Profile not found.';
  end if;

  update public.profiles p
  set account_status = new_account_status,
      updated_at = now()
  where p.id = target_user_id;

  return query
    select true, p.id, p.account_status
    from public.profiles p
    where p.id = target_user_id;
end;
$$;

revoke all on function public.is_founder_profile(uuid) from public;
grant execute on function public.is_founder_profile(uuid) to authenticated;

revoke all on function public.set_profile_account_status(uuid, text) from public;
grant execute on function public.set_profile_account_status(uuid, text) to authenticated;
