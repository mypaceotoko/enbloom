-- Activity board -> direct message flow.
-- Accepted activity interests can open the existing 1:1 matches/messages DM.

create or replace function public.has_block_between(user_a_id uuid, user_b_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.blocks
    where (blocker_id = user_a_id and blocked_id = user_b_id)
       or (blocker_id = user_b_id and blocked_id = user_a_id)
  );
$$;

grant execute on function public.has_block_between(uuid, uuid) to authenticated;

create or replace function public.ensure_direct_conversation(target_user_id uuid)
returns table (
  success boolean,
  match_id uuid,
  already_exists boolean,
  blocked boolean,
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
    return query select false, null::uuid, false, false, 'ログイン状態を確認できませんでした。';
    return;
  end if;

  if target_user_id is null or not exists (select 1 from public.profiles where id = target_user_id) then
    return query select false, null::uuid, false, false, '相手のプロフィールを確認できませんでした。';
    return;
  end if;

  if current_user_id = target_user_id then
    return query select false, null::uuid, false, false, '自分自身とは会話を開始できません。';
    return;
  end if;

  if public.has_block_between(current_user_id, target_user_id) then
    return query select false, null::uuid, false, true, 'ブロック中のため会話を開始できません。';
    return;
  end if;

  select id
    into existing_match_id
  from public.matches
  where user_low_id = least(current_user_id, target_user_id)
    and user_high_id = greatest(current_user_id, target_user_id)
    and status = 'active'
  limit 1;

  if existing_match_id is not null then
    return query select true, existing_match_id, true, false, 'すでに会話を始められます。';
    return;
  end if;

  insert into public.matches (user1_id, user2_id, status)
  values (current_user_id, target_user_id, 'active')
  on conflict (user_low_id, user_high_id) do update
    set status = 'active'
    where public.matches.status <> 'blocked'
  returning id into inserted_match_id;

  if inserted_match_id is null then
    select id
      into inserted_match_id
    from public.matches
    where user_low_id = least(current_user_id, target_user_id)
      and user_high_id = greatest(current_user_id, target_user_id)
      and status = 'active'
    limit 1;
  end if;

  if inserted_match_id is null then
    return query select false, null::uuid, false, true, 'ブロック中のため会話を開始できません。';
    return;
  end if;

  return query select true, inserted_match_id, false, false, '会話を始められます。';
end;
$$;

grant execute on function public.ensure_direct_conversation(uuid) to authenticated;

create or replace function public.ensure_activity_interest_match(target_post_id uuid, target_interest_id uuid)
returns table (
  success boolean,
  match_id uuid,
  already_exists boolean,
  blocked boolean,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  post_owner_id uuid;
  interested_user_id uuid;
  interest_status text;
  existing_match_id uuid;
  inserted_match_id uuid;
begin
  if current_user_id is null then
    return query select false, null::uuid, false, false, 'ログイン状態を確認できませんでした。';
    return;
  end if;

  select p.created_by, i.user_id, i.status
    into post_owner_id, interested_user_id, interest_status
  from public.activity_post_interests i
  join public.activity_posts p on p.id = i.post_id
  where i.id = target_interest_id
    and i.post_id = target_post_id
  limit 1;

  if post_owner_id is null or interested_user_id is null then
    return query select false, null::uuid, false, false, '参加希望を確認できませんでした。';
    return;
  end if;

  if current_user_id <> post_owner_id and current_user_id <> interested_user_id and not public.is_admin() then
    return query select false, null::uuid, false, false, 'この参加希望の会話は作成できません。';
    return;
  end if;

  if interest_status <> 'accepted' then
    return query select false, null::uuid, false, false, '参加希望が承認済みではありません。';
    return;
  end if;

  if public.has_block_between(post_owner_id, interested_user_id) then
    return query select false, null::uuid, false, true, 'ブロック中のため会話を開始できません。';
    return;
  end if;

  select id
    into existing_match_id
  from public.matches
  where user_low_id = least(post_owner_id, interested_user_id)
    and user_high_id = greatest(post_owner_id, interested_user_id)
    and status = 'active'
  limit 1;

  if existing_match_id is not null then
    return query select true, existing_match_id, true, false, 'すでに会話を始められます。';
    return;
  end if;

  insert into public.matches (user1_id, user2_id, status)
  values (post_owner_id, interested_user_id, 'active')
  on conflict (user_low_id, user_high_id) do update
    set status = 'active'
    where public.matches.status <> 'blocked'
  returning id into inserted_match_id;

  if inserted_match_id is null then
    select id
      into inserted_match_id
    from public.matches
    where user_low_id = least(post_owner_id, interested_user_id)
      and user_high_id = greatest(post_owner_id, interested_user_id)
      and status = 'active'
    limit 1;
  end if;

  if inserted_match_id is null then
    return query select false, null::uuid, false, true, 'ブロック中のため会話を開始できません。';
    return;
  end if;

  return query select true, inserted_match_id, false, false, '承認済み。会話を始められます。';
end;
$$;

grant execute on function public.ensure_activity_interest_match(uuid, uuid) to authenticated;
