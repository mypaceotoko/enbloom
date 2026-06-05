-- Emergency repair for cross-cutting Supabase read/write failures.
-- Focuses on activity board writes, room messages, DMs, block lists, and
-- ambiguous public.is_admin() references caused by mixed is_admin overloads.

-- Keep the mode constraint aligned with the client payload used by /board/new
-- and /board/:postId/edit. Older databases may still only allow "either".
alter table public.activity_posts
  drop constraint if exists activity_posts_mode_valid;

alter table public.activity_posts
  add constraint activity_posts_mode_valid
  check (mode in ('online', 'offline', 'hybrid', 'either'));

-- Make account_status safe for environments that have not yet applied the
-- moderation migration, before any client join asks for this column.
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

-- Replace policies touched by the affected features with authenticated-user
-- policies that call public.is_admin(auth.uid()) explicitly. This avoids the
-- "function public.is_admin() is not unique" failure when both zero-argument and
-- uuid overloads exist in production.
alter table public.activity_posts enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_room_messages enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;

-- activity_posts: public board reads for authenticated users, owner/admin for
-- archived reads and writes. Insert WITH CHECK matches the real created_by column.
drop policy if exists "activity_posts_select_open_closed_or_admin" on public.activity_posts;
drop policy if exists "activity_posts_select_board_owner_interest_or_admin" on public.activity_posts;
create policy "activity_posts_select_board_owner_interest_or_admin"
  on public.activity_posts for select
  to authenticated
  using (
    status in ('open', 'closed')
    or created_by = auth.uid()
    or public.is_admin(auth.uid())
    or exists (
      select 1
      from public.activity_post_interests interest
      where interest.post_id = activity_posts.id
        and interest.user_id = auth.uid()
    )
  );

drop policy if exists "activity_posts_insert_creator" on public.activity_posts;
create policy "activity_posts_insert_creator"
  on public.activity_posts for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and coalesce(status, 'open') in ('open', 'closed', 'archived')
    and mode in ('online', 'offline', 'hybrid', 'either')
  );

drop policy if exists "activity_posts_update_owner_or_admin" on public.activity_posts;
create policy "activity_posts_update_owner_or_admin"
  on public.activity_posts for update
  to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()))
  with check (created_by = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "activity_posts_delete_owner_or_admin" on public.activity_posts;
create policy "activity_posts_delete_owner_or_admin"
  on public.activity_posts for delete
  to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()));

-- chat_rooms / chat_room_messages: route params may be slugs, but writes must
-- use chat_rooms.id. Policies allow authenticated users in official rooms.
drop policy if exists "chat_rooms_select_official_or_admin" on public.chat_rooms;
create policy "chat_rooms_select_official_or_admin"
  on public.chat_rooms for select
  to authenticated
  using (is_official = true or public.is_admin(auth.uid()));

drop policy if exists "chat_rooms_insert_admin" on public.chat_rooms;
create policy "chat_rooms_insert_admin"
  on public.chat_rooms for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "chat_rooms_update_admin" on public.chat_rooms;
create policy "chat_rooms_update_admin"
  on public.chat_rooms for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "chat_rooms_delete_admin" on public.chat_rooms;
create policy "chat_rooms_delete_admin"
  on public.chat_rooms for delete
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "chat_room_messages_select_official_or_admin" on public.chat_room_messages;
create policy "chat_room_messages_select_official_or_admin"
  on public.chat_room_messages for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.chat_rooms room
      where room.id = chat_room_messages.room_id
        and room.is_official = true
    )
  );

drop policy if exists "chat_room_messages_insert_own_official" on public.chat_room_messages;
create policy "chat_room_messages_insert_own_official"
  on public.chat_room_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and char_length(btrim(body)) between 1 and 2000
    and exists (
      select 1 from public.chat_rooms room
      where room.id = chat_room_messages.room_id
        and room.is_official = true
    )
  );

drop policy if exists "chat_room_messages_update_sender_or_admin" on public.chat_room_messages;
create policy "chat_room_messages_update_sender_or_admin"
  on public.chat_room_messages for update
  to authenticated
  using (sender_id = auth.uid() or public.is_admin(auth.uid()))
  with check (sender_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "chat_room_messages_delete_sender_or_admin" on public.chat_room_messages;
create policy "chat_room_messages_delete_sender_or_admin"
  on public.chat_room_messages for delete
  to authenticated
  using (sender_id = auth.uid() or public.is_admin(auth.uid()));

-- matches/messages: participant reads/inserts. Explicit EXISTS checks avoid
-- depending on helper overload resolution inside policy evaluation.
drop policy if exists "matches_select_participants_or_admin" on public.matches;
create policy "matches_select_participants_or_admin"
  on public.matches for select
  to authenticated
  using (user1_id = auth.uid() or user2_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "matches_update_participant_or_admin" on public.matches;
create policy "matches_update_participant_or_admin"
  on public.matches for update
  to authenticated
  using (user1_id = auth.uid() or user2_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user1_id = auth.uid() or user2_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "messages_select_match_participants_or_admin" on public.messages;
create policy "messages_select_match_participants_or_admin"
  on public.messages for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

drop policy if exists "messages_insert_match_sender" on public.messages;
create policy "messages_insert_match_sender"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and char_length(btrim(body)) between 1 and 2000
    and exists (
      select 1
      from public.matches m
      where m.id = messages.match_id
        and m.status = 'active'
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
        and not public.users_blocked_each_other(m.user1_id, m.user2_id)
    )
  );

drop policy if exists "messages_update_match_participants_or_admin" on public.messages;
create policy "messages_update_match_participants_or_admin"
  on public.messages for update
  to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

-- blocks: blocker can manage own list; involved users/admin can read for safety
-- filtering. Client reads /blocked-users with blocker_id = auth.uid().
drop policy if exists "blocks_select_blocker_or_admin" on public.blocks;
drop policy if exists "blocks_select_involved_or_admin" on public.blocks;
create policy "blocks_select_involved_or_admin"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid() or blocked_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "blocks_insert_blocker" on public.blocks;
create policy "blocks_insert_blocker"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid() and blocker_id <> blocked_id);

drop policy if exists "blocks_delete_blocker_or_admin" on public.blocks;
create policy "blocks_delete_blocker_or_admin"
  on public.blocks for delete
  to authenticated
  using (blocker_id = auth.uid() or public.is_admin(auth.uid()));

-- Refresh SECURITY DEFINER helpers that previously called public.is_admin()
-- without an explicit uuid argument.
create or replace function public.get_activity_post_interest_counts(post_ids uuid[])
returns table (post_id uuid, interest_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select api.id as post_id, count(interest.id)::bigint as interest_count
  from public.activity_posts api
  left join public.activity_post_interests interest
    on interest.post_id = api.id
    and interest.status in ('interested', 'accepted')
  where api.id = any(post_ids)
    and (
      api.status in ('open', 'closed')
      or api.created_by = auth.uid()
      or public.is_admin(auth.uid())
    )
  group by api.id;
$$;

create or replace function public.get_chat_room_message_counts()
returns table (room_id uuid, message_count bigint, latest_message_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select room.id as room_id,
    count(message.id)::bigint as message_count,
    max(message.created_at) as latest_message_at
  from public.chat_rooms room
  left join public.chat_room_messages message on message.room_id = room.id
  where auth.uid() is not null
    and (room.is_official = true or public.is_admin(auth.uid()))
  group by room.id;
$$;

grant execute on function public.get_activity_post_interest_counts(uuid[]) to authenticated;
grant execute on function public.get_chat_room_message_counts() to authenticated;

notify pgrst, 'reload schema';
