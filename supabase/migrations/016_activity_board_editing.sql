-- ConnectBloom activity board editing safeguards.
-- Owners and admins can update activity_posts, but created_by remains immutable
-- and editable enum-like fields stay constrained.

alter table public.activity_posts
  drop constraint if exists activity_posts_status_valid;

alter table public.activity_posts
  add constraint activity_posts_status_valid
  check (status in ('open', 'closed', 'archived'));

alter table public.activity_posts
  drop constraint if exists activity_posts_mode_valid;

alter table public.activity_posts
  add constraint activity_posts_mode_valid
  check (mode in ('online', 'offline', 'hybrid', 'either'));

create or replace function public.enforce_activity_post_editing_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by <> old.created_by then
    raise exception '募集の投稿者は変更できません。';
  end if;

  if new.status not in ('open', 'closed', 'archived') then
    raise exception '募集ステータスが不正です。';
  end if;

  return new;
end;
$$;

drop trigger if exists activity_posts_editing_rules on public.activity_posts;
create trigger activity_posts_editing_rules
before update on public.activity_posts
for each row execute function public.enforce_activity_post_editing_rules();

-- Keep editing scoped to the original owner or admins.
drop policy if exists "activity_posts_update_owner_or_admin" on public.activity_posts;
create policy "activity_posts_update_owner_or_admin"
  on public.activity_posts for update
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
