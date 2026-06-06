-- ConnectBloom activity board owner withdrawal and admin moderation lock.
-- Separates owner-initiated soft withdrawal from Founder/Admin moderation actions.

alter table public.activity_posts
  add column if not exists archived_by uuid references public.profiles(id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists moderation_locked boolean not null default false;

update public.activity_posts
set archived_at = coalesce(archived_at, closed_at, updated_at)
where status = 'archived'
  and archived_at is null;

create index if not exists activity_posts_archived_by_idx
  on public.activity_posts(archived_by)
  where archived_by is not null;

create index if not exists activity_posts_moderation_locked_idx
  on public.activity_posts(moderation_locked)
  where moderation_locked = true;

create or replace function public.enforce_activity_post_editing_rules()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_is_admin boolean := public.is_admin(current_user_id);
begin
  if new.created_by <> old.created_by then
    raise exception '募集の投稿者は変更できません。';
  end if;

  if new.status not in ('open', 'closed', 'archived') then
    raise exception '募集ステータスが不正です。';
  end if;

  if current_user_is_admin then
    return new;
  end if;

  if old.moderation_locked then
    if new.status is distinct from old.status
      or new.archived_by is distinct from old.archived_by
      or new.archived_at is distinct from old.archived_at
      or new.moderation_locked is distinct from old.moderation_locked then
      raise exception '管理者により非表示の募集は投稿者から変更できません。'
        using errcode = '42501';
    end if;
  end if;

  if new.moderation_locked is distinct from old.moderation_locked then
    raise exception '管理者ロックは変更できません。'
      using errcode = '42501';
  end if;

  if new.archived_by is distinct from old.archived_by
    or new.archived_at is distinct from old.archived_at then
    if not (
      old.status <> 'archived'
      and new.status = 'archived'
      and new.moderation_locked = false
      and new.archived_by = current_user_id
      and new.archived_at is not null
    ) then
      raise exception '募集の非表示情報は変更できません。'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.owner_withdraw_activity_post(p_post_id uuid)
returns setof public.activity_posts
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  target_post public.activity_posts%rowtype;
begin
  if current_user_id is null then
    raise exception 'ログイン情報を確認できませんでした。'
      using errcode = '28000';
  end if;

  if p_post_id is null then
    raise exception '募集IDを確認できませんでした。'
      using errcode = '22004';
  end if;

  select *
    into target_post
  from public.activity_posts
  where id = p_post_id
  for update;

  if target_post.id is null then
    raise exception '対象の募集を確認できませんでした。'
      using errcode = 'P0002';
  end if;

  if target_post.created_by <> current_user_id then
    raise exception '自分の募集のみ取り下げできます。'
      using errcode = '42501';
  end if;

  if target_post.moderation_locked then
    raise exception 'この募集は管理者により非表示になっています。'
      using errcode = '42501';
  end if;

  return query
  update public.activity_posts
  set status = 'archived',
      closed_at = coalesce(closed_at, now()),
      archived_by = current_user_id,
      archived_at = now(),
      moderation_locked = false,
      updated_at = now()
  where id = p_post_id
  returning *;
end;
$$;

create or replace function public.admin_archive_activity_post(p_post_id uuid)
returns setof public.activity_posts
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'ログイン情報を確認できませんでした。'
      using errcode = '28000';
  end if;

  if not public.is_admin(current_user_id) then
    raise exception '管理者のみ募集を非表示にできます。'
      using errcode = '42501';
  end if;

  if p_post_id is null then
    raise exception '募集IDを確認できませんでした。'
      using errcode = '22004';
  end if;

  return query
  update public.activity_posts
  set status = 'archived',
      closed_at = coalesce(closed_at, now()),
      archived_by = current_user_id,
      archived_at = now(),
      moderation_locked = true,
      updated_at = now()
  where id = p_post_id
  returning *;

  if not found then
    raise exception '対象の募集を確認できませんでした。'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_restore_activity_post(p_post_id uuid)
returns setof public.activity_posts
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'ログイン情報を確認できませんでした。'
      using errcode = '28000';
  end if;

  if not public.is_admin(current_user_id) then
    raise exception '管理者のみ募集を再表示できます。'
      using errcode = '42501';
  end if;

  if p_post_id is null then
    raise exception '募集IDを確認できませんでした。'
      using errcode = '22004';
  end if;

  return query
  update public.activity_posts
  set status = 'open',
      closed_at = null,
      archived_by = null,
      archived_at = null,
      moderation_locked = false,
      updated_at = now()
  where id = p_post_id
  returning *;

  if not found then
    raise exception '対象の募集を確認できませんでした。'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.owner_withdraw_activity_post(uuid) from public;
revoke all on function public.admin_archive_activity_post(uuid) from public;
revoke all on function public.admin_restore_activity_post(uuid) from public;
grant execute on function public.owner_withdraw_activity_post(uuid) to authenticated;
grant execute on function public.admin_archive_activity_post(uuid) to authenticated;
grant execute on function public.admin_restore_activity_post(uuid) to authenticated;

-- Owner withdrawal is handled by owner_withdraw_activity_post; hard deletes stay admin-only.
drop policy if exists "activity_posts_delete_owner_or_admin" on public.activity_posts;
create policy "activity_posts_delete_admin"
  on public.activity_posts for delete
  to authenticated
  using (public.is_admin(auth.uid()));

notify pgrst, 'reload schema';
