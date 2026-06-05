-- Add a Founder/Admin-only hard-delete RPC for room messages.
-- This keeps normal sender deletes on the existing RLS policy while giving
-- administrative deletion a single SECURITY DEFINER path with explicit checks.

create or replace function public.admin_delete_chat_room_message(p_message_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  deleted_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated'
      using errcode = '28000';
  end if;

  if not public.is_admin(auth.uid()) then
    raise exception 'admin_required'
      using errcode = '42501';
  end if;

  delete from public.chat_room_messages
  where id = p_message_id
  returning id into deleted_message_id;

  return deleted_message_id;
end;
$$;

revoke all on function public.admin_delete_chat_room_message(uuid) from public;
grant execute on function public.admin_delete_chat_room_message(uuid) to authenticated;

notify pgrst, 'reload schema';
