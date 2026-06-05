-- ConnectBloom profile talk topics field.
-- Adds an optional user-authored profile field without changing existing data.

alter table public.profiles
  add column if not exists talk_topics text;

alter table public.profiles
  drop constraint if exists profiles_talk_topics_length;

alter table public.profiles
  add constraint profiles_talk_topics_length
  check (talk_topics is null or char_length(talk_topics) <= 160);
