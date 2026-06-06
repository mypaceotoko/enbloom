-- Stabilize ConnectBloom owner-initiated activity post withdrawal.
-- The real owner column is activity_posts.created_by. Admin moderation RPCs are intentionally untouched.

drop function if exists public.owner_withdraw_activity_post(uuid);

create function public.owner_withdraw_activity_post(p_post_id uuid)
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

  if target_post.created_by <> current_user_id then
    raise exception '自分の募集のみ取り下げできます。'
      using errcode = '42501';
  end if;

  if target_post.moderation_locked then
    raise exception 'この募集は管理者により非表示になっています。'
      using errcode = '42501';
  end if;

  if target_post.status <> 'open' then
    raise exception '募集中の募集のみ取り下げできます。'
      using errcode = '22023';
  end if;

  return query
  update public.activity_posts as ap
  set status = 'archived',
      closed_at = coalesce(ap.closed_at, now()),
      archived_by = current_user_id,
      archived_at = now(),
      moderation_locked = false,
      updated_at = now()
  where ap.id = p_post_id
    and ap.created_by = current_user_id
    and ap.status = 'open'
    and ap.moderation_locked = false
  returning true, ap.id, ap.status;

  if not found then
    raise exception '募集の取り下げに失敗しました。'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.owner_withdraw_activity_post(uuid) from public;
grant execute on function public.owner_withdraw_activity_post(uuid) to authenticated;

notify pgrst, 'reload schema';
