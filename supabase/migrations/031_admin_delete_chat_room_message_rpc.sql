-- Add a Founder/Admin-only hard-delete RPC for room messages.
-- This keeps normal sender deletes on the existing RLS policy while giving
-- administrative deletion a single SECURITY DEFINER path with explicit checks.

create or replace function public.admin_delete_chat_room_message(
  p_message_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  deleted_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth uid missing'
      using errcode = '28000';
  end if;

  if p_message_id is null then
    raise exception 'message id missing'
      using errcode = '22004';
  end if;

  if not public.is_admin(auth.uid()) then
    raise exception 'not admin'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.chat_room_messages
    where id = p_message_id
  ) then
    raise exception 'message not found'
      using errcode = 'P0002';
  end if;

  delete from public.chat_room_messages
  where id = p_message_id
  returning id into deleted_message_id;

  if deleted_message_id is null then
    raise exception 'delete returned no rows'
      using errcode = 'P0002';
  end if;

  return deleted_message_id;
end;
$$;

revoke all on function public.admin_delete_chat_room_message(uuid) from public;
grant execute on function public.admin_delete_chat_room_message(uuid) to authenticated;

notify pgrst, 'reload schema';
