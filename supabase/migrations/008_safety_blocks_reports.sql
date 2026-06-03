-- Safety migration for Supabase-backed block / report flows.
-- Keeps the original tables, tightens RLS around ownership, and lets the app hide
-- both users I blocked and users who blocked me without exposing tokens/secrets.

alter table public.reports
  add column if not exists admin_note text;

create index if not exists blocks_blocker_id_idx on public.blocks(blocker_id);
create index if not exists blocks_blocked_id_idx on public.blocks(blocked_id);
create index if not exists reports_reporter_id_idx on public.reports(reporter_id);
create index if not exists reports_reported_user_id_idx on public.reports(reported_user_id);
create index if not exists reports_status_created_at_idx on public.reports(status, created_at desc);

create or replace function public.users_blocked_each_other(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blocks b
    where (b.blocker_id = user_a and b.blocked_id = user_b)
       or (b.blocker_id = user_b and b.blocked_id = user_a)
  );
$$;

-- blocks: blockers manage their own block list. Users may also select rows where
-- they are blocked so the client can remove those profiles from discovery lists.
drop policy if exists "blocks_select_blocker_or_admin" on public.blocks;
drop policy if exists "blocks_select_involved_or_admin" on public.blocks;
create policy "blocks_select_involved_or_admin"
  on public.blocks for select
  using (blocker_id = auth.uid() or blocked_id = auth.uid() or public.is_admin());

drop policy if exists "blocks_insert_blocker" on public.blocks;
create policy "blocks_insert_blocker"
  on public.blocks for insert
  with check (blocker_id = auth.uid() and blocker_id <> blocked_id);

drop policy if exists "blocks_delete_blocker_or_admin" on public.blocks;
create policy "blocks_delete_blocker_or_admin"
  on public.blocks for delete
  using (blocker_id = auth.uid() or public.is_admin());

-- reports: users create/read their reports; admins review all reports.
drop policy if exists "reports_select_reporter_or_admin" on public.reports;
create policy "reports_select_reporter_or_admin"
  on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "reports_insert_reporter" on public.reports;
create policy "reports_insert_reporter"
  on public.reports for insert
  with check (reporter_id = auth.uid() and reporter_id <> reported_user_id and length(trim(reason)) > 0);

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- Stop new likes / matches / messages across an active block without deleting history.
drop policy if exists "likes_insert_sender" on public.likes;
create policy "likes_insert_sender"
  on public.likes for insert
  with check (
    from_user_id = auth.uid()
    and from_user_id <> to_user_id
    and not public.users_blocked_each_other(from_user_id, to_user_id)
  );

drop policy if exists "matches_insert_participant_or_admin" on public.matches;
create policy "matches_insert_participant_or_admin"
  on public.matches for insert
  with check (
    (user1_id = auth.uid() or user2_id = auth.uid() or public.is_admin())
    and user1_id <> user2_id
    and not public.users_blocked_each_other(user1_id, user2_id)
  );

drop policy if exists "messages_insert_match_sender" on public.messages;
create policy "messages_insert_match_sender"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_message_sender_in_match(match_id, sender_id)
    and not exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.users_blocked_each_other(m.user1_id, m.user2_id)
    )
  );
