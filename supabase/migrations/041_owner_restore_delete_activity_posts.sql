-- Allow post owners to restore or hard-delete only their own self-withdrawn activity posts.
-- Admin-moderated archives remain protected by moderation_locked = true.

create or replace function public.owner_restore_activity_post(p_post_id uuid)
returns table(success boolean, post_id uuid, status text)
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

  if target_post.created_by is distinct from current_user_id then
    raise exception '自分の募集のみ再開できます。'
      using errcode = '42501';
  end if;

  if target_post.status <> 'archived' then
    raise exception '取り下げ済みの募集のみ再開できます。'
      using errcode = '22023';
  end if;

  if coalesce(target_post.moderation_locked, false) then
    raise exception 'この募集は管理者により非表示になっています。'
      using errcode = '42501';
  end if;

  update public.activity_posts as ap
  set status = 'open',
      moderation_locked = false,
      closed_at = null,
      archived_by = null,
      archived_at = null,
      updated_at = now()
  where ap.id = p_post_id
    and ap.created_by = current_user_id
    and ap.status = 'archived'
    and coalesce(ap.moderation_locked, false) = false;

  if not found then
    raise exception '募集の再開に失敗しました。'
      using errcode = 'P0002';
  end if;

  return query select true, p_post_id, 'open'::text;
end;
$$;

create or replace function public.owner_delete_activity_post(p_post_id uuid)
returns table(success boolean, deleted_post_id uuid)
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

  if target_post.created_by is distinct from current_user_id then
    raise exception '自分の募集のみ完全削除できます。'
      using errcode = '42501';
  end if;

  if target_post.status <> 'archived' then
    raise exception '取り下げ済みの募集のみ完全削除できます。'
      using errcode = '22023';
  end if;

  if coalesce(target_post.moderation_locked, false) then
    raise exception 'この募集は管理者により非表示になっています。'
      using errcode = '42501';
  end if;

  delete from public.activity_post_interests
  where post_id = p_post_id;

  update public.reports
  set target_activity_post_id = null
  where target_activity_post_id = p_post_id;

  delete from public.notifications
  where link_path in ('/board/' || p_post_id::text, '/activity/' || p_post_id::text);

  delete from public.activity_posts
  where id = p_post_id
    and created_by = current_user_id
    and status = 'archived'
    and coalesce(moderation_locked, false) = false
  returning id into deleted_post_id;

  if deleted_post_id is null then
    raise exception '募集の完全削除に失敗しました。'
      using errcode = 'P0002';
  end if;

  success := true;
  return next;
end;
$$;

revoke all on function public.owner_restore_activity_post(uuid) from public;
revoke all on function public.owner_delete_activity_post(uuid) from public;
grant execute on function public.owner_restore_activity_post(uuid) to authenticated;
grant execute on function public.owner_delete_activity_post(uuid) to authenticated;

notify pgrst, 'reload schema';
