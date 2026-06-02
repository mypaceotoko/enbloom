-- EnBloom Phase 3 前半: Supabase initial schema proposal
-- This migration prepares the relational foundation for moving the current
-- localStorage demo experience to Supabase. It intentionally does not implement
-- Google login, production auth flows, billing, or verification workflows.
--
-- Supabase SQL Editorで全文を一括実行しやすいように、テーブルに依存する
-- helper関数とRLS policyは、参照先テーブル作成後に定義します。

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared helpers that do not depend on application tables
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Core tables
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  age integer check (age is null or age >= 18),
  birthdate date,
  gender text,
  location text not null default '',
  occupation text,
  bio text not null default '',
  interests text[] not null default '{}',
  relationship_goal text not null default '',
  dating_temperature text not null default '',
  invited_by uuid references public.profiles(id) on delete set null,
  invite_code_used text,
  onboarding_completed boolean not null default false,
  visibility text not null default 'public' check (visibility in ('public', 'private', 'hidden')),
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  max_uses integer not null default 1 check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (used_count <= max_uses)
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references public.profiles(id) on delete cascade,
  user2_id uuid not null references public.profiles(id) on delete cascade,
  user_low_id uuid generated always as (least(user1_id, user2_id)) stored,
  user_high_id uuid generated always as (greatest(user1_id, user2_id)) stored,
  status text not null default 'active' check (status in ('active', 'archived', 'blocked')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  unique (user_low_id, user_high_id),
  check (user1_id <> user2_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  detail text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  position integer not null default 0 check (position >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, storage_path),
  unique (user_id, position)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'natural',
  language text not null default 'ja',
  notification_enabled boolean not null default true,
  show_introducer boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.introductions (
  id uuid primary key default gen_random_uuid(),
  introducer_id uuid not null references public.profiles(id) on delete cascade,
  introduced_user_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete cascade,
  comment text,
  visibility text not null default 'private' check (visibility in ('private', 'introduced_users', 'public')),
  status text not null default 'active' check (status in ('active', 'hidden', 'archived')),
  created_at timestamptz not null default now(),
  check (introducer_id <> introduced_user_id),
  check (target_user_id is null or target_user_id <> introducer_id)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

-- -----------------------------------------------------------------------------
-- Indexes / constraints for future Supabase queries
-- -----------------------------------------------------------------------------

create index if not exists profiles_visibility_idx on public.profiles (visibility);
create index if not exists profiles_invited_by_idx on public.profiles (invited_by);
create index if not exists invite_codes_created_by_idx on public.invite_codes (created_by);
create index if not exists likes_from_user_id_idx on public.likes (from_user_id);
create index if not exists likes_to_user_id_idx on public.likes (to_user_id);
create index if not exists matches_user1_id_idx on public.matches (user1_id);
create index if not exists matches_user2_id_idx on public.matches (user2_id);
create index if not exists messages_match_id_created_at_idx on public.messages (match_id, created_at);
create index if not exists blocks_blocker_id_idx on public.blocks (blocker_id);
create index if not exists blocks_blocked_id_idx on public.blocks (blocked_id);
create index if not exists reports_status_idx on public.reports (status);
create index if not exists profile_photos_user_position_idx on public.profile_photos (user_id, position);
create unique index if not exists profile_photos_one_primary_per_user
  on public.profile_photos (user_id)
  where is_primary;
create index if not exists introductions_introducer_idx on public.introductions (introducer_id);
create index if not exists introductions_introduced_user_idx on public.introductions (introduced_user_id);
create index if not exists introductions_target_user_idx on public.introductions (target_user_id);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS helper functions that depend on profiles
-- -----------------------------------------------------------------------------

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- RLS helper functions that depend on matches / messages relationships
-- -----------------------------------------------------------------------------

create or replace function public.is_match_participant(match_uuid uuid, user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches
    where id = match_uuid
      and (user1_id = user_id or user2_id = user_id)
  );
$$;

create or replace function public.is_message_sender_in_match(match_uuid uuid, sender_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches
    where id = match_uuid
      and (user1_id = sender_uuid or user2_id = sender_uuid)
  );
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.profile_photos enable row level security;
alter table public.user_preferences enable row level security;
alter table public.introductions enable row level security;
alter table public.app_settings enable row level security;

-- -----------------------------------------------------------------------------
-- RLS policies
-- -----------------------------------------------------------------------------

-- profiles: self-management, public discovery, admin moderation.
drop policy if exists "profiles_select_self_public_or_admin" on public.profiles;
create policy "profiles_select_self_public_or_admin"
  on public.profiles for select
  using (id = auth.uid() or visibility = 'public' or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- invite_codes: creators and admins manage codes; authenticated users may read active usable codes for invite validation.
drop policy if exists "invite_codes_select_active_or_owner_or_admin" on public.invite_codes;
create policy "invite_codes_select_active_or_owner_or_admin"
  on public.invite_codes for select
  using (
    (is_active and (expires_at is null or expires_at > now()) and used_count < max_uses)
    or created_by = auth.uid()
    or public.is_admin()
  );

drop policy if exists "invite_codes_insert_creator_or_admin" on public.invite_codes;
create policy "invite_codes_insert_creator_or_admin"
  on public.invite_codes for insert
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "invite_codes_update_owner_or_admin" on public.invite_codes;
create policy "invite_codes_update_owner_or_admin"
  on public.invite_codes for update
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

-- likes: only the sender, receiver, and admins can see relationship data.
drop policy if exists "likes_select_participants_or_admin" on public.likes;
create policy "likes_select_participants_or_admin"
  on public.likes for select
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_admin());

drop policy if exists "likes_insert_sender" on public.likes;
create policy "likes_insert_sender"
  on public.likes for insert
  with check (from_user_id = auth.uid());

drop policy if exists "likes_delete_sender_or_admin" on public.likes;
create policy "likes_delete_sender_or_admin"
  on public.likes for delete
  using (from_user_id = auth.uid() or public.is_admin());

-- matches: participants only; admins for moderation.
drop policy if exists "matches_select_participants_or_admin" on public.matches;
create policy "matches_select_participants_or_admin"
  on public.matches for select
  using (user1_id = auth.uid() or user2_id = auth.uid() or public.is_admin());

drop policy if exists "matches_insert_participant_or_admin" on public.matches;
create policy "matches_insert_participant_or_admin"
  on public.matches for insert
  with check (user1_id = auth.uid() or user2_id = auth.uid() or public.is_admin());

drop policy if exists "matches_update_participant_or_admin" on public.matches;
create policy "matches_update_participant_or_admin"
  on public.matches for update
  using (user1_id = auth.uid() or user2_id = auth.uid() or public.is_admin())
  with check (user1_id = auth.uid() or user2_id = auth.uid() or public.is_admin());

-- messages: match participants can read and send messages; sender must be part of the match.
drop policy if exists "messages_select_match_participants_or_admin" on public.messages;
create policy "messages_select_match_participants_or_admin"
  on public.messages for select
  using (public.is_match_participant(match_id) or public.is_admin());

drop policy if exists "messages_insert_match_sender" on public.messages;
create policy "messages_insert_match_sender"
  on public.messages for insert
  with check (sender_id = auth.uid() and public.is_message_sender_in_match(match_id, sender_id));

drop policy if exists "messages_update_match_participants_or_admin" on public.messages;
create policy "messages_update_match_participants_or_admin"
  on public.messages for update
  using (public.is_match_participant(match_id) or public.is_admin())
  with check (public.is_match_participant(match_id) or public.is_admin());

-- blocks: only the blocker manages their own block list; admins can inspect for safety operations.
drop policy if exists "blocks_select_blocker_or_admin" on public.blocks;
create policy "blocks_select_blocker_or_admin"
  on public.blocks for select
  using (blocker_id = auth.uid() or public.is_admin());

drop policy if exists "blocks_insert_blocker" on public.blocks;
create policy "blocks_insert_blocker"
  on public.blocks for insert
  with check (blocker_id = auth.uid());

drop policy if exists "blocks_delete_blocker_or_admin" on public.blocks;
create policy "blocks_delete_blocker_or_admin"
  on public.blocks for delete
  using (blocker_id = auth.uid() or public.is_admin());

-- reports: users create and read their own reports; admins review all reports.
drop policy if exists "reports_select_reporter_or_admin" on public.reports;
create policy "reports_select_reporter_or_admin"
  on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "reports_insert_reporter" on public.reports;
create policy "reports_insert_reporter"
  on public.reports for insert
  with check (reporter_id = auth.uid());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- profile_photos: public photos follow public profile visibility; owners and admins manage rows.
drop policy if exists "profile_photos_select_visible_owner_or_admin" on public.profile_photos;
create policy "profile_photos_select_visible_owner_or_admin"
  on public.profile_photos for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = profile_photos.user_id
        and p.visibility = 'public'
    )
  );

drop policy if exists "profile_photos_insert_owner" on public.profile_photos;
create policy "profile_photos_insert_owner"
  on public.profile_photos for insert
  with check (user_id = auth.uid());

drop policy if exists "profile_photos_update_owner_or_admin" on public.profile_photos;
create policy "profile_photos_update_owner_or_admin"
  on public.profile_photos for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "profile_photos_delete_owner_or_admin" on public.profile_photos;
create policy "profile_photos_delete_owner_or_admin"
  on public.profile_photos for delete
  using (user_id = auth.uid() or public.is_admin());

-- user_preferences: private to the user.
drop policy if exists "user_preferences_select_self_or_admin" on public.user_preferences;
create policy "user_preferences_select_self_or_admin"
  on public.user_preferences for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_preferences_insert_self" on public.user_preferences;
create policy "user_preferences_insert_self"
  on public.user_preferences for insert
  with check (user_id = auth.uid());

drop policy if exists "user_preferences_update_self" on public.user_preferences;
create policy "user_preferences_update_self"
  on public.user_preferences for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- introductions: involved users can read; introducers and admins can manage.
drop policy if exists "introductions_select_involved_or_public_or_admin" on public.introductions;
create policy "introductions_select_involved_or_public_or_admin"
  on public.introductions for select
  using (
    introducer_id = auth.uid()
    or introduced_user_id = auth.uid()
    or target_user_id = auth.uid()
    or visibility = 'public'
    or public.is_admin()
  );

drop policy if exists "introductions_insert_introducer" on public.introductions;
create policy "introductions_insert_introducer"
  on public.introductions for insert
  with check (introducer_id = auth.uid());

drop policy if exists "introductions_update_introducer_or_admin" on public.introductions;
create policy "introductions_update_introducer_or_admin"
  on public.introductions for update
  using (introducer_id = auth.uid() or public.is_admin())
  with check (introducer_id = auth.uid() or public.is_admin());

-- app_settings: readable by authenticated users for feature flags; writable by admins only.
drop policy if exists "app_settings_select_authenticated" on public.app_settings;
create policy "app_settings_select_authenticated"
  on public.app_settings for select
  using (auth.uid() is not null);

drop policy if exists "app_settings_insert_admin" on public.app_settings;
create policy "app_settings_insert_admin"
  on public.app_settings for insert
  with check (public.is_admin());

drop policy if exists "app_settings_update_admin" on public.app_settings;
create policy "app_settings_update_admin"
  on public.app_settings for update
  using (public.is_admin())
  with check (public.is_admin());
