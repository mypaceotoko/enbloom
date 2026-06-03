-- Likes flow hardening for the first Supabase-backed like implementation.
-- The existing schema uses from_user_id/to_user_id for the same concept that the app
-- exposes as sender_id/receiver_id in TypeScript helpers.

alter table public.likes enable row level security;

alter table public.likes
  drop constraint if exists likes_from_user_id_to_user_id_key;

alter table public.likes
  add constraint likes_from_user_id_to_user_id_key unique (from_user_id, to_user_id);

alter table public.likes
  drop constraint if exists likes_check;

alter table public.likes
  add constraint likes_check check (from_user_id <> to_user_id);

create index if not exists likes_from_user_id_idx on public.likes (from_user_id);
create index if not exists likes_to_user_id_idx on public.likes (to_user_id);

drop policy if exists "likes_select_participants_or_admin" on public.likes;
create policy "likes_select_participants_or_admin"
  on public.likes for select
  to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_admin());

drop policy if exists "likes_insert_sender" on public.likes;
create policy "likes_insert_sender"
  on public.likes for insert
  to authenticated
  with check (from_user_id = auth.uid() and from_user_id <> to_user_id);

drop policy if exists "likes_delete_sender_or_admin" on public.likes;
create policy "likes_delete_sender_or_admin"
  on public.likes for delete
  to authenticated
  using (from_user_id = auth.uid() or public.is_admin());
