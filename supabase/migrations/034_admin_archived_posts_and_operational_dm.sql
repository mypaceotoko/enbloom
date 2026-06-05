-- Founder/Admin operational moderation tools: archived activity-post deletion
-- and admin-initiated direct conversations.

alter table public.matches
  add column if not exists admin_initiated_by uuid references public.profiles(id) on delete set null,
  add column if not exists admin_initiated_at timestamptz;

create index if not exists matches_admin_initiated_by_idx
  on public.matches(admin_initiated_by)
  where admin_initiated_by is not null;

create or replace function public.admin_delete_activity_post(p_post_id uuid)
returns table (
  success boolean,
  deleted_post_id uuid
)
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
    raise exception '管理者のみ募集を完全削除できます。';
  end if;

  if p_post_id is null then
    raise exception '募集IDを確認できませんでした。';
  end if;

  if not exists (select 1 from public.activity_posts where id = p_post_id) then
    raise exception '対象の募集を確認できませんでした。';
  end if;

  delete from public.activity_posts
  where id = p_post_id;

  return query select true, p_post_id;
end;
$$;

revoke all on function public.admin_delete_activity_post(uuid) from public;
grant execute on function public.admin_delete_activity_post(uuid) to authenticated;

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

  insert into public.matches (user1_id, user2_id, status, created_at, updated_at, admin_initiated_by, admin_initiated_at)
  values (current_user_id, p_target_user_id, 'active', now(), now(), current_user_id, now())
  on conflict (user_low_id, user_high_id) do update
    set status = 'active',
        admin_initiated_by = coalesce(public.matches.admin_initiated_by, excluded.admin_initiated_by),
        admin_initiated_at = coalesce(public.matches.admin_initiated_at, excluded.admin_initiated_at),
        updated_at = now()
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

revoke all on function public.admin_create_or_get_direct_conversation(uuid) from public;
grant execute on function public.admin_create_or_get_direct_conversation(uuid) to authenticated;

notify pgrst, 'reload schema';
