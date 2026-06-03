-- EnBloom activity board: posts and "参加したい" interests.

create table if not exists public.activity_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null,
  area text,
  tags text[] not null default '{}',
  mode text not null default 'either',
  max_participants integer,
  scheduled_at timestamptz,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint activity_posts_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint activity_posts_body_length check (char_length(btrim(body)) between 1 and 2000),
  constraint activity_posts_max_participants_positive check (max_participants is null or max_participants >= 1),
  constraint activity_posts_status_valid check (status in ('open', 'closed', 'archived')),
  constraint activity_posts_mode_valid check (mode in ('online', 'offline', 'either'))
);

create table if not exists public.activity_post_interests (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.activity_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'interested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_post_interests_unique_user unique (post_id, user_id),
  constraint activity_post_interests_message_length check (message is null or char_length(message) <= 500),
  constraint activity_post_interests_status_valid check (status in ('interested', 'accepted', 'declined', 'cancelled'))
);

create index if not exists activity_posts_created_by_idx on public.activity_posts (created_by);
create index if not exists activity_posts_status_created_at_idx on public.activity_posts (status, created_at desc);
create index if not exists activity_posts_category_idx on public.activity_posts (category);
create index if not exists activity_posts_tags_idx on public.activity_posts using gin (tags);
create index if not exists activity_post_interests_post_id_idx on public.activity_post_interests (post_id);
create index if not exists activity_post_interests_user_id_idx on public.activity_post_interests (user_id);

create or replace function public.activity_post_interest_not_self()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.activity_posts
    where id = new.post_id
      and created_by = new.user_id
  ) then
    raise exception '自分の募集には参加したいを送れません。';
  end if;

  return new;
end;
$$;

drop trigger if exists activity_post_interests_not_self on public.activity_post_interests;
create trigger activity_post_interests_not_self
before insert or update of post_id, user_id on public.activity_post_interests
for each row execute function public.activity_post_interest_not_self();

drop trigger if exists set_activity_posts_updated_at on public.activity_posts;
create trigger set_activity_posts_updated_at
before update on public.activity_posts
for each row execute function public.set_updated_at();

drop trigger if exists set_activity_post_interests_updated_at on public.activity_post_interests;
create trigger set_activity_post_interests_updated_at
before update on public.activity_post_interests
for each row execute function public.set_updated_at();

create or replace function public.get_activity_post_interest_counts(post_ids uuid[])
returns table (post_id uuid, interest_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select api.id as post_id, count(interest.id)::bigint as interest_count
  from public.activity_posts api
  left join public.activity_post_interests interest
    on interest.post_id = api.id
    and interest.status in ('interested', 'accepted')
  where api.id = any(post_ids)
    and (
      api.status in ('open', 'closed')
      or api.created_by = auth.uid()
      or public.is_admin()
    )
  group by api.id;
$$;

grant execute on function public.get_activity_post_interest_counts(uuid[]) to authenticated;

alter table public.activity_posts enable row level security;
alter table public.activity_post_interests enable row level security;

-- activity_posts: authenticated users can read open/closed posts; admins can read all.
drop policy if exists "activity_posts_select_open_closed_or_admin" on public.activity_posts;
create policy "activity_posts_select_open_closed_or_admin"
  on public.activity_posts for select
  using (auth.uid() is not null and (status in ('open', 'closed') or public.is_admin()));

-- activity_posts: authenticated users create their own posts.
drop policy if exists "activity_posts_insert_creator" on public.activity_posts;
create policy "activity_posts_insert_creator"
  on public.activity_posts for insert
  with check (created_by = auth.uid());

-- activity_posts: owners and admins can update.
drop policy if exists "activity_posts_update_owner_or_admin" on public.activity_posts;
create policy "activity_posts_update_owner_or_admin"
  on public.activity_posts for update
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

-- activity_posts: owners and admins can delete.
drop policy if exists "activity_posts_delete_owner_or_admin" on public.activity_posts;
create policy "activity_posts_delete_owner_or_admin"
  on public.activity_posts for delete
  using (created_by = auth.uid() or public.is_admin());

-- activity_post_interests: post owners, interest senders, and admins can read.
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

-- activity_post_interests: authenticated users can insert their own interest, not for their own post.
drop policy if exists "activity_post_interests_insert_own_not_self" on public.activity_post_interests;
create policy "activity_post_interests_insert_own_not_self"
  on public.activity_post_interests for insert
  with check (
    user_id = auth.uid()
    and not exists (
      select 1
      from public.activity_posts post
      where post.id = activity_post_interests.post_id
        and post.created_by = auth.uid()
    )
  );

-- activity_post_interests: interest sender, post owner, and admins can update.
drop policy if exists "activity_post_interests_update_parties_or_admin" on public.activity_post_interests;
create policy "activity_post_interests_update_parties_or_admin"
  on public.activity_post_interests for update
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.activity_posts post
      where post.id = activity_post_interests.post_id
        and post.created_by = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.activity_posts post
      where post.id = activity_post_interests.post_id
        and post.created_by = auth.uid()
    )
  );

-- activity_post_interests: interest sender, post owner, and admins can delete.
drop policy if exists "activity_post_interests_delete_parties_or_admin" on public.activity_post_interests;
create policy "activity_post_interests_delete_parties_or_admin"
  on public.activity_post_interests for delete
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
