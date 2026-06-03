-- Notification Center Phase 1: in-app notifications for activity interests and DMs.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link_path text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_type_check check (type in ('activity_interest_received', 'activity_interest_accepted', 'direct_message_received')),
  constraint notifications_title_length_check check (char_length(btrim(title)) between 1 and 120),
  constraint notifications_body_length_check check (char_length(btrim(body)) between 1 and 500)
);

create index if not exists notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read, created_at desc)
  where is_read = false;

alter table public.notifications enable row level security;

-- Users can only read and manage their own notifications; admins may inspect them for support/moderation.
drop policy if exists "notifications_select_self_or_admin" on public.notifications;
create policy "notifications_select_self_or_admin"
  on public.notifications for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_update_self_or_admin" on public.notifications;
create policy "notifications_update_self_or_admin"
  on public.notifications for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_delete_self_or_admin" on public.notifications;
create policy "notifications_delete_self_or_admin"
  on public.notifications for delete
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.create_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_body text,
  notification_link_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_notification_id uuid;
  normalized_title text := btrim(coalesce(notification_title, ''));
  normalized_body text := btrim(coalesce(notification_body, ''));
begin
  if current_user_id is null then
    raise exception 'ログイン状態を確認できませんでした。';
  end if;

  if target_user_id is null or not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception '通知先ユーザーを確認できませんでした。';
  end if;

  if notification_type not in ('activity_interest_received', 'activity_interest_accepted', 'direct_message_received') then
    raise exception '通知タイプを確認できませんでした。';
  end if;

  if char_length(normalized_title) < 1 or char_length(normalized_title) > 120 then
    raise exception '通知タイトルは1〜120文字で入力してください。';
  end if;

  if char_length(normalized_body) < 1 or char_length(normalized_body) > 500 then
    raise exception '通知本文は1〜500文字で入力してください。';
  end if;

  if current_user_id = target_user_id then
    return null;
  end if;

  insert into public.notifications (user_id, type, title, body, link_path)
  values (target_user_id, notification_type, normalized_title, normalized_body, nullif(btrim(notification_link_path), ''))
  returning id into inserted_notification_id;

  return inserted_notification_id;
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text, text) to authenticated;
