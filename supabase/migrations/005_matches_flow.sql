-- Matches flow for mutual Supabase likes.
-- A match is treated as a quiet "ご縁が咲いた" state and is only created when
-- both participants have liked each other.

alter table public.matches enable row level security;

alter table public.matches
  drop constraint if exists matches_check;

alter table public.matches
  add constraint matches_check check (user1_id <> user2_id);

create index if not exists matches_user1_id_idx on public.matches (user1_id);
create index if not exists matches_user2_id_idx on public.matches (user2_id);
create unique index if not exists matches_user_pair_unique_idx
  on public.matches (user_low_id, user_high_id);

-- Participants and admins can read matches they are part of.
drop policy if exists "matches_select_participants_or_admin" on public.matches;
create policy "matches_select_participants_or_admin"
  on public.matches for select
  to authenticated
  using (user1_id = auth.uid() or user2_id = auth.uid() or public.is_admin());

-- Direct client inserts are allowed only for a participant pair that already has
-- likes in both directions. The RPC below is the preferred creation path.
drop policy if exists "matches_insert_participant_or_admin" on public.matches;
drop policy if exists "matches_insert_mutual_like_participant_or_admin" on public.matches;
create policy "matches_insert_mutual_like_participant_or_admin"
  on public.matches for insert
  to authenticated
  with check (
    user1_id <> user2_id
    and (
      public.is_admin()
      or (
        (user1_id = auth.uid() or user2_id = auth.uid())
        and exists (
          select 1
          from public.likes
          where from_user_id = user1_id
            and to_user_id = user2_id
        )
        and exists (
          select 1
          from public.likes
          where from_user_id = user2_id
            and to_user_id = user1_id
        )
      )
    )
  );

-- Keep updates participant/admin only for future archive/block state changes.
drop policy if exists "matches_update_participant_or_admin" on public.matches;
create policy "matches_update_participant_or_admin"
  on public.matches for update
  to authenticated
  using (user1_id = auth.uid() or user2_id = auth.uid() or public.is_admin())
  with check (user1_id = auth.uid() or user2_id = auth.uid() or public.is_admin());

create or replace function public.create_match_if_mutual_like(target_user_id uuid)
returns table (
  success boolean,
  matched boolean,
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
    return query select false, false, null::uuid, false, 'ログイン情報を確認できませんでした。';
    return;
  end if;

  if target_user_id is null then
    return query select false, false, null::uuid, false, '相手のプロフィールを確認できませんでした。';
    return;
  end if;

  if current_user_id = target_user_id then
    return query select false, false, null::uuid, false, '自分自身とはマッチできません。';
    return;
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    return query select false, false, null::uuid, false, '相手のプロフィールを確認できませんでした。';
    return;
  end if;

  if not exists (
    select 1
    from public.likes
    where from_user_id = current_user_id
      and to_user_id = target_user_id
  ) then
    return query select true, false, null::uuid, false, '自分からのいいねがまだ保存されていません。';
    return;
  end if;

  if not exists (
    select 1
    from public.likes
    where from_user_id = target_user_id
      and to_user_id = current_user_id
  ) then
    return query select true, false, null::uuid, false, '相互いいねはまだ成立していません。';
    return;
  end if;

  select id
    into existing_match_id
  from public.matches
  where user_low_id = least(current_user_id, target_user_id)
    and user_high_id = greatest(current_user_id, target_user_id)
  limit 1;

  if existing_match_id is not null then
    return query select true, true, existing_match_id, true, 'すでにご縁が咲いています。';
    return;
  end if;

  insert into public.matches (user1_id, user2_id)
  values (current_user_id, target_user_id)
  returning id into inserted_match_id;

  return query select true, true, inserted_match_id, false, 'ご縁が咲きました。';
end;
$$;

grant execute on function public.create_match_if_mutual_like(uuid) to authenticated;
