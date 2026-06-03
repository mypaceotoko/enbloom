-- ConnectBloom Phase 1 chat rooms: official conversation spaces that can seed activity board posts.

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  category text,
  is_official boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_rooms_slug_length check (char_length(btrim(slug)) between 1 and 80),
  constraint chat_rooms_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint chat_rooms_description_length check (char_length(btrim(description)) between 1 and 2000)
);

create table if not exists public.chat_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_room_messages_body_length check (char_length(btrim(body)) between 1 and 2000)
);

alter table public.activity_posts
  add column if not exists room_id uuid references public.chat_rooms(id) on delete set null;

create index if not exists chat_rooms_slug_idx on public.chat_rooms (slug);
create index if not exists chat_rooms_official_created_at_idx on public.chat_rooms (is_official, created_at);
create index if not exists chat_room_messages_room_created_at_idx on public.chat_room_messages (room_id, created_at);
create index if not exists chat_room_messages_sender_idx on public.chat_room_messages (sender_id);
create index if not exists activity_posts_room_id_idx on public.activity_posts (room_id);

insert into public.chat_rooms (slug, name, description, category, is_official)
values
  (
    'creative',
    'クリエイティブルーム',
    'AI、発信、動画、音声、ゲーム制作、イベント企画など、一緒に何かを作りたい人が集まる部屋です。会話の中で企画の種が見つかったら、募集ボードで仲間を募れます。',
    'creative',
    true
  ),
  (
    'casual',
    '雑談ルーム',
    '趣味、日常、映画、音楽、旅、ゲーム、ちょっとした近況など、気軽に話せる部屋です。雑談の中で「一緒にやってみたい」が生まれたら、募集ボードにつなげられます。',
    'casual',
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  is_official = excluded.is_official,
  updated_at = now();

drop trigger if exists set_chat_rooms_updated_at on public.chat_rooms;
create trigger set_chat_rooms_updated_at
before update on public.chat_rooms
for each row execute function public.set_updated_at();

drop trigger if exists set_chat_room_messages_updated_at on public.chat_room_messages;
create trigger set_chat_room_messages_updated_at
before update on public.chat_room_messages
for each row execute function public.set_updated_at();

create or replace function public.get_chat_room_message_counts()
returns table (room_id uuid, message_count bigint, latest_message_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select room.id as room_id,
    count(message.id)::bigint as message_count,
    max(message.created_at) as latest_message_at
  from public.chat_rooms room
  left join public.chat_room_messages message on message.room_id = room.id
  where auth.uid() is not null
    and (room.is_official = true or public.is_admin())
  group by room.id;
$$;

grant execute on function public.get_chat_room_message_counts() to authenticated;

alter table public.chat_rooms enable row level security;
alter table public.chat_room_messages enable row level security;

-- chat_rooms: authenticated users can read official rooms; admins can read all.
drop policy if exists "chat_rooms_select_official_or_admin" on public.chat_rooms;
create policy "chat_rooms_select_official_or_admin"
  on public.chat_rooms for select
  using (auth.uid() is not null and (is_official = true or public.is_admin()));

-- chat_rooms: admins manage all rooms.
drop policy if exists "chat_rooms_insert_admin" on public.chat_rooms;
create policy "chat_rooms_insert_admin"
  on public.chat_rooms for insert
  with check (public.is_admin());

drop policy if exists "chat_rooms_update_admin" on public.chat_rooms;
create policy "chat_rooms_update_admin"
  on public.chat_rooms for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "chat_rooms_delete_admin" on public.chat_rooms;
create policy "chat_rooms_delete_admin"
  on public.chat_rooms for delete
  using (public.is_admin());

-- chat_room_messages: authenticated users can read messages in official rooms; admins can read all.
drop policy if exists "chat_room_messages_select_official_or_admin" on public.chat_room_messages;
create policy "chat_room_messages_select_official_or_admin"
  on public.chat_room_messages for select
  using (
    auth.uid() is not null
    and (
      public.is_admin()
      or exists (
        select 1 from public.chat_rooms room
        where room.id = chat_room_messages.room_id
          and room.is_official = true
      )
    )
  );

-- chat_room_messages: authenticated users can insert their own messages into official rooms.
drop policy if exists "chat_room_messages_insert_own_official" on public.chat_room_messages;
create policy "chat_room_messages_insert_own_official"
  on public.chat_room_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_rooms room
      where room.id = chat_room_messages.room_id
        and room.is_official = true
    )
  );

-- chat_room_messages: sender or admin can update/delete.
drop policy if exists "chat_room_messages_update_sender_or_admin" on public.chat_room_messages;
create policy "chat_room_messages_update_sender_or_admin"
  on public.chat_room_messages for update
  using (sender_id = auth.uid() or public.is_admin())
  with check (sender_id = auth.uid() or public.is_admin());

drop policy if exists "chat_room_messages_delete_sender_or_admin" on public.chat_room_messages;
create policy "chat_room_messages_delete_sender_or_admin"
  on public.chat_room_messages for delete
  using (sender_id = auth.uid() or public.is_admin());
