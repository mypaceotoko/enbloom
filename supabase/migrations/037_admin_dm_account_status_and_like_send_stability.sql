-- ConnectBloom tester bugfixes: stabilize Founder/Admin operational DMs,
-- account-status moderation, and PostgREST schema cache for these RPCs.

alter table public.matches
  add column if not exists admin_initiated_by uuid references public.profiles(id) on delete set null,
  add column if not exists admin_initiated_at timestamptz;

create index if not exists matches_admin_initiated_by_idx
  on public.matches(admin_initiated_by)
  where admin_initiated_by is not null;

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

create or replace function public.admin_create_or_get_direct_conversation(p_target_user_id uuid)
returns table (
  success boolean,
  match_id uuid,
  already_exists boolean,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_match_id uuid;
  inserted_match_id uuid;
begin
  if current_user_id is null then
    raise exception 'ログイン情報を確認できませんでした。';
  end if;

  if not public.is_admin(current_user_id) then
    raise exception '管理者のみ運営メッセージを開始できます。';
  end if;

  if p_target_user_id is null then
    raise exception '相手のプロフィールを確認できませんでした。';
  end if;

  if current_user_id = p_target_user_id then
    raise exception '自分自身へ管理者メッセージは開始できません。';
  end if;

  if not exists (select 1 from public.profiles where id = current_user_id) then
    raise exception '管理者プロフィールを確認できませんでした。';
  end if;

  if not exists (select 1 from public.profiles where id = p_target_user_id) then
    raise exception '相手のプロフィールを確認できませんでした。';
  end if;

  select id
    into existing_match_id
  from public.matches
  where user_low_id = least(current_user_id, p_target_user_id)
    and user_high_id = greatest(current_user_id, p_target_user_id)
    and status = 'active'
  limit 1;

  if existing_match_id is not null then
    return query select true, existing_match_id, true, '既存の会話を開きます。'::text;
    return;
  end if;

  insert into public.matches (user1_id, user2_id, status, admin_initiated_by, admin_initiated_at)
  values (current_user_id, p_target_user_id, 'active', current_user_id, now())
  on conflict (user_low_id, user_high_id) do update
    set status = 'active',
        admin_initiated_by = coalesce(public.matches.admin_initiated_by, excluded.admin_initiated_by),
        admin_initiated_at = coalesce(public.matches.admin_initiated_at, excluded.admin_initiated_at)
    where public.matches.status <> 'blocked'
  returning id into inserted_match_id;

  if inserted_match_id is null then
    select id
      into inserted_match_id
    from public.matches
    where user_low_id = least(current_user_id, p_target_user_id)
      and user_high_id = greatest(current_user_id, p_target_user_id)
      and status = 'active'
    limit 1;
  end if;

  if inserted_match_id is null then
    raise exception '会話の作成に失敗しました。';
  end if;

  return query select true, inserted_match_id, false, '運営メッセージ用の会話を開始しました。'::text;
end;
$$;

create or replace function public.prevent_unsafe_account_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_status is distinct from old.account_status then
    if not public.is_admin(auth.uid()) then
      raise exception 'Only admins can update account status.';
    end if;

    if new.account_status = 'suspended' and public.is_founder_profile(new.id) then
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

drop function if exists public.set_profile_account_status(uuid, text);

create function public.set_profile_account_status(
  p_profile_id uuid,
  p_account_status text
)
returns table(success boolean, user_id uuid, account_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'ログイン情報を確認できませんでした。';
  end if;

  if not public.is_admin(current_user_id) then
    raise exception 'Only admins can update account status.';
  end if;

  if p_profile_id is null then
    raise exception 'Profile id is required.';
  end if;

  if p_account_status not in ('active', 'suspended') then
    raise exception 'Invalid account status.';
  end if;

  if p_account_status = 'suspended' and public.is_founder_profile(p_profile_id) then
    raise exception 'Founder cannot be suspended.';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_profile_id) then
    raise exception 'Profile not found.';
  end if;

  update public.profiles p
  set account_status = p_account_status,
      updated_at = now()
  where p.id = p_profile_id;

  return query
    select true, p.id, p.account_status
    from public.profiles p
    where p.id = p_profile_id;
end;
$$;

revoke all on function public.admin_create_or_get_direct_conversation(uuid) from public;
grant execute on function public.admin_create_or_get_direct_conversation(uuid) to authenticated;

revoke all on function public.set_profile_account_status(uuid, text) from public;
grant execute on function public.set_profile_account_status(uuid, text) to authenticated;

notify pgrst, 'reload schema';
