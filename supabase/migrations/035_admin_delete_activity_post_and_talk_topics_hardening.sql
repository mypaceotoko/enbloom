-- ConnectBloom admin archived activity-post hard delete and talk_topics hardening.
-- Keeps existing Founder/Admin checks through public.is_admin(auth.uid()).

alter table public.profiles
  add column if not exists talk_topics text;

comment on column public.profiles.talk_topics is 'Optional profile text for topics the user would like to talk about.';

alter table public.profiles
  drop constraint if exists profiles_talk_topics_length;

alter table public.profiles
  add constraint profiles_talk_topics_length
  check (talk_topics is null or char_length(talk_topics) <= 160);

create or replace function public.admin_delete_activity_post(p_post_id uuid)
returns table (
  success boolean,
  deleted_post_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  target_status text;
begin
  if current_user_id is null then
    raise exception 'auth uid missing'
      using errcode = '28000';
  end if;

  if not public.is_admin(current_user_id) then
    raise exception 'not admin'
      using errcode = '42501';
  end if;

  if p_post_id is null then
    raise exception 'post id missing'
      using errcode = '22004';
  end if;

  select status
    into target_status
  from public.activity_posts
  where id = p_post_id
  for update;

  if target_status is null then
    raise exception 'activity post not found'
      using errcode = 'P0002';
  end if;

  if target_status <> 'archived' then
    raise exception 'activity post must be archived before hard delete'
      using errcode = 'P0001';
  end if;

  -- Remove only records associated with the requested post. activity_post_interests
  -- already has ON DELETE CASCADE, but deleting it explicitly makes the operation
  -- deterministic across partially migrated environments and keeps the scope clear.
  delete from public.activity_post_interests
  where post_id = p_post_id;

  -- Reports keep moderation history; clear only the optional pointer to this post
  -- before the hard delete, matching the FK's ON DELETE SET NULL behavior.
  update public.reports
  set target_activity_post_id = null
  where target_activity_post_id = p_post_id;

  -- Notifications store activity links as text rather than an FK. Remove only
  -- notifications that point to the deleted post's board detail URL.
  delete from public.notifications
  where link_path in ('/board/' || p_post_id::text, '/activity/' || p_post_id::text);

  delete from public.activity_posts
  where id = p_post_id
  returning id into deleted_post_id;

  if deleted_post_id is null then
    raise exception 'activity post delete returned no rows'
      using errcode = 'P0002';
  end if;

  success := true;
  return next;
end;
$$;

revoke all on function public.admin_delete_activity_post(uuid) from public;
grant execute on function public.admin_delete_activity_post(uuid) to authenticated;

notify pgrst, 'reload schema';
