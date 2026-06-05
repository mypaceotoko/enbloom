-- Keep room message deletion hard-delete based and make the admin branch explicit.
-- This is idempotent and does not alter existing message data.

alter table public.chat_room_messages enable row level security;

-- chat_room_messages has no deleted_at column in the current schema, so
-- deletes are hard deletes. Senders can remove their own messages; Founder/Admin
-- accounts can remove any room message.
drop policy if exists "chat_room_messages_delete_sender_or_admin" on public.chat_room_messages;
create policy "chat_room_messages_delete_sender_or_admin"
  on public.chat_room_messages for delete
  to authenticated
  using (sender_id = auth.uid() or public.is_admin(auth.uid()));

notify pgrst, 'reload schema';
