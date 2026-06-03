-- ConnectBloom activity board management pages.
-- Owners can manage their posts, participants can review their sent interests,
-- and owner/participant/admin status transitions stay explicit in RLS + triggers.

-- Replace the public-board-only select policy so owners can also select archived
-- posts and participants can still see posts for interests they already sent.
drop policy if exists "activity_posts_select_open_closed_or_admin" on public.activity_posts;
create policy "activity_posts_select_board_owner_interest_or_admin"
  on public.activity_posts for select
  using (
    auth.uid() is not null
    and (
      status in ('open', 'closed')
      or created_by = auth.uid()
      or public.is_admin()
      or exists (
        select 1
        from public.activity_post_interests interest
        where interest.post_id = activity_posts.id
          and interest.user_id = auth.uid()
      )
    )
  );

-- Keep post updates and deletes owner/admin-scoped. This explicitly covers
-- closing, reopening, and archiving from /my-board.
drop policy if exists "activity_posts_update_owner_or_admin" on public.activity_posts;
create policy "activity_posts_update_owner_or_admin"
  on public.activity_posts for update
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "activity_posts_delete_owner_or_admin" on public.activity_posts;
create policy "activity_posts_delete_owner_or_admin"
  on public.activity_posts for delete
  using (created_by = auth.uid() or public.is_admin());

-- Tighten interest transitions for management flows:
-- participant: interested/cancelled toggles for own request
-- owner: interested -> accepted/declined for requests on own post
-- admin: all management actions
create or replace function public.enforce_activity_interest_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner uuid;
begin
  if public.is_admin() then
    return new;
  end if;

  select created_by into post_owner
  from public.activity_posts
  where id = old.post_id;

  if post_owner is null then
    raise exception '募集が見つかりません。';
  end if;

  if new.post_id <> old.post_id or new.user_id <> old.user_id then
    raise exception '参加希望の対象は変更できません。';
  end if;

  if post_owner = auth.uid() then
    if old.status = 'interested' and new.status in ('accepted', 'declined') then
      return new;
    end if;

    raise exception '投稿者は参加希望中の依頼のみ承認または見送りできます。';
  end if;

  if old.user_id = auth.uid() then
    if new.status = 'cancelled' then
      return new;
    end if;

    if old.status = 'cancelled' and new.status = 'interested' then
      return new;
    end if;

    raise exception '参加希望者本人は参加希望の取り消しのみできます。';
  end if;

  raise exception '参加希望を更新する権限がありません。';
end;
$$;

drop trigger if exists activity_post_interests_status_transition on public.activity_post_interests;
create trigger activity_post_interests_status_transition
before update on public.activity_post_interests
for each row execute function public.enforce_activity_interest_status_transition();

drop policy if exists "activity_post_interests_select_parties_or_admin" on public.activity_post_interests;
create policy "activity_post_interests_select_parties_or_admin"
  on public.activity_post_interests for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.activity_posts post
      where post.id = activity_post_interests.post_id
        and post.created_by = auth.uid()
    )
  );

drop policy if exists "activity_post_interests_update_parties_or_admin" on public.activity_post_interests;
drop policy if exists "activity_post_interests_update_management_status" on public.activity_post_interests;
create policy "activity_post_interests_update_management_status"
  on public.activity_post_interests for update
  using (
    public.is_admin()
    or user_id = auth.uid()
    or exists (
      select 1
      from public.activity_posts post
      where post.id = activity_post_interests.post_id
        and post.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or (user_id = auth.uid() and status in ('cancelled', 'interested'))
    or (
      status in ('accepted', 'declined')
      and exists (
        select 1
        from public.activity_posts post
        where post.id = activity_post_interests.post_id
          and post.created_by = auth.uid()
      )
    )
  );
