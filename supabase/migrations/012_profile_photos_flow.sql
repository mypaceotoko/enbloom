-- Ensure the profile photo DB flow exists for uploads that already succeed in Storage.
-- The current application stores display order in `position` and derives public URLs
-- from `storage_path` because the `profile-photos` bucket is public.

create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  position integer not null default 0 check (position >= 0),
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, storage_path),
  unique (user_id, position)
);

alter table public.profile_photos
  add column if not exists updated_at timestamptz not null default now();

create index if not exists profile_photos_user_position_idx on public.profile_photos (user_id, position);
create unique index if not exists profile_photos_one_primary_per_user
  on public.profile_photos (user_id)
  where is_primary;

create or replace function public.set_profile_photos_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profile_photos_updated_at on public.profile_photos;
create trigger set_profile_photos_updated_at
  before update on public.profile_photos
  for each row execute function public.set_profile_photos_updated_at();

alter table public.profile_photos enable row level security;

-- Authenticated users can read profile photo rows. Storage objects are in a public
-- bucket, and profile visibility filtering stays in profile queries.
drop policy if exists "profile_photos_select_visible_owner_or_admin" on public.profile_photos;
drop policy if exists "profile_photos_select_authenticated" on public.profile_photos;
create policy "profile_photos_select_authenticated"
  on public.profile_photos for select
  to authenticated
  using (true);

-- Owners can write their own photo rows. Admins retain moderation access for update/delete.
drop policy if exists "profile_photos_insert_owner" on public.profile_photos;
create policy "profile_photos_insert_owner"
  on public.profile_photos for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "profile_photos_update_owner_or_admin" on public.profile_photos;
create policy "profile_photos_update_owner_or_admin"
  on public.profile_photos for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "profile_photos_delete_owner_or_admin" on public.profile_photos;
create policy "profile_photos_delete_owner_or_admin"
  on public.profile_photos for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());
