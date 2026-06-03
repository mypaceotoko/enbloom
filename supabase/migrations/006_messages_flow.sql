-- Messages flow for matched Supabase users.
-- DM is intentionally limited to active match participants: a quiet place where
-- ご縁が咲いた相手とだけ、焦らず丁寧に会話を始められるようにする。

alter table public.messages enable row level security;

create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists messages_match_id_created_at_idx on public.messages (match_id, created_at);

alter table public.messages
  drop constraint if exists messages_body_check;

alter table public.messages
  add constraint messages_body_check check (char_length(btrim(body)) between 1 and 2000);

-- Participants and admins can read only messages that belong to matches they can access.
drop policy if exists "messages_select_match_participants_or_admin" on public.messages;
create policy "messages_select_match_participants_or_admin"
  on public.messages for select
  to authenticated
  using (public.is_match_participant(match_id) or public.is_admin());

-- Direct client inserts remain possible, but only for the authenticated sender
-- inside an active match. The RPC below is preferred because it trims body and
-- updates matches.last_message_at in one transaction.
drop policy if exists "messages_insert_match_sender" on public.messages;
create policy "messages_insert_match_sender"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and char_length(btrim(body)) between 1 and 2000
    and exists (
      select 1
      from public.matches
      where id = match_id
        and status = 'active'
        and (user1_id = auth.uid() or user2_id = auth.uid())
    )
  );

-- read_at can be updated later by match participants; this phase does not wire
-- read receipts in the client yet, but keeps the policy ready for mark-as-read.
drop policy if exists "messages_update_match_participants_or_admin" on public.messages;
create policy "messages_update_match_participants_or_admin"
  on public.messages for update
  to authenticated
  using (public.is_match_participant(match_id) or public.is_admin())
  with check (public.is_match_participant(match_id) or public.is_admin());

create or replace function public.send_match_message(target_match_id uuid, message_body text)
returns table (
  success boolean,
  message_id uuid,
  created_at timestamptz,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  trimmed_body text := btrim(coalesce(message_body, ''));
  inserted_message_id uuid;
  inserted_created_at timestamptz;
begin
  if current_user_id is null then
    return query select false, null::uuid, null::timestamptz, 'ログイン情報を確認できませんでした。';
    return;
  end if;

  if target_match_id is null then
    return query select false, null::uuid, null::timestamptz, 'マッチ済みの相手とのみメッセージできます。';
    return;
  end if;

  if char_length(trimmed_body) = 0 then
    return query select false, null::uuid, null::timestamptz, 'メッセージを入力してください。';
    return;
  end if;

  if char_length(trimmed_body) > 2000 then
    return query select false, null::uuid, null::timestamptz, 'メッセージは2000文字以内で入力してください。';
    return;
  end if;

  if not exists (
    select 1
    from public.matches
    where id = target_match_id
      and status = 'active'
      and (user1_id = current_user_id or user2_id = current_user_id)
  ) then
    return query select false, null::uuid, null::timestamptz, 'マッチ済みの相手とのみメッセージできます。';
    return;
  end if;

  insert into public.messages (match_id, sender_id, body)
  values (target_match_id, current_user_id, trimmed_body)
  returning id, public.messages.created_at into inserted_message_id, inserted_created_at;

  update public.matches
    set last_message_at = inserted_created_at
    where id = target_match_id;

  return query select true, inserted_message_id, inserted_created_at, 'メッセージを送信しました。';
end;
$$;

grant execute on function public.send_match_message(uuid, text) to authenticated;
