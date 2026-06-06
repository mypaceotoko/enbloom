-- Founder permanent invite code hardening for ConnectBloom.
-- MYPACE-2026 is the Founder / マイペース男 code: no expiry, no usage cap,
-- and robust normalization across Android / iPhone / PC input variants.

create or replace function public.normalize_invite_code_input(raw_code text)
returns text
language sql
immutable
as $$
  select upper(
    regexp_replace(
      regexp_replace(
        translate(
          coalesce(raw_code, ''),
          'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９－‐‑‒–—―−ー',
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789---------'
        ),
        '[[:space:]　​‌‍﻿]+',
        '',
        'g'
      ),
      '-+',
      '-',
      'g'
    )
  );
$$;

revoke all on function public.normalize_invite_code_input(text) from public;
grant execute on function public.normalize_invite_code_input(text) to anon, authenticated;

insert into public.invite_codes (
  code,
  created_by,
  max_uses,
  used_count,
  is_active,
  expires_at
)
select
  'MYPACE-2026',
  (
    select p.id
    from public.profiles p
    join auth.users u on u.id = p.id
    where lower(trim(coalesce(u.email, ''))) = 'mypaceotoko@gmail.com'
    order by p.created_at asc
    limit 1
  ),
  null,
  0,
  true,
  null
on conflict (code) do update
set
  created_by = coalesce(public.invite_codes.created_by, excluded.created_by),
  max_uses = null,
  is_active = true,
  expires_at = null;

create or replace function public.validate_invite_code(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := public.normalize_invite_code_input(invite_code);
  is_founder_code boolean := normalized_code = 'MYPACE-2026';
  invite_record public.invite_codes%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_AUTH_REQUIRED', 'message', 'ログイン後に招待コードを利用してください。');
  end if;

  select *
    into invite_record
    from public.invite_codes
    where code = normalized_code;

  if not found and is_founder_code then
    insert into public.invite_codes (code, created_by, max_uses, used_count, is_active, expires_at)
    values ('MYPACE-2026', null, null, 0, true, null)
    on conflict (code) do update
    set max_uses = null,
        is_active = true,
        expires_at = null
    returning * into invite_record;
  end if;

  if not found and not is_founder_code then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_NOT_FOUND', 'message', '招待コードが見つかりません。');
  end if;

  if not is_founder_code and (
    invite_record.created_by is null
    or not exists (select 1 from public.profiles where id = invite_record.created_by)
  ) then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_CREATOR_NOT_FOUND', 'message', 'この招待コードの紹介者を確認できません。');
  end if;

  if not invite_record.is_active then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_INACTIVE', 'message', 'この招待コードは現在利用できません。');
  end if;

  if not is_founder_code and invite_record.expires_at is not null and invite_record.expires_at <= now() then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_EXPIRED', 'message', 'この招待コードは期限切れです。');
  end if;

  if not is_founder_code and invite_record.max_uses is not null and invite_record.used_count >= invite_record.max_uses then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_LIMIT_REACHED', 'message', 'この招待コードは利用上限に達しています。');
  end if;

  return jsonb_build_object(
    'success', true,
    'reason', case when is_founder_code then 'FOUNDER_INVITE_CODE_VALID' else 'INVITE_CODE_VALID' end,
    'message', '招待コードを確認しました。',
    'invite_code', jsonb_build_object(
      'id', invite_record.id,
      'code', invite_record.code,
      'created_by', invite_record.created_by,
      'max_uses', invite_record.max_uses,
      'used_count', invite_record.used_count,
      'is_active', invite_record.is_active,
      'expires_at', invite_record.expires_at,
      'created_at', invite_record.created_at
    )
  );
end;
$$;

grant execute on function public.validate_invite_code(text) to authenticated;

create or replace function public.use_invite_code(invite_code text, user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := public.normalize_invite_code_input(invite_code);
  is_founder_code boolean := normalized_code = 'MYPACE-2026';
  invite_record public.invite_codes%rowtype;
  official_introducer_id uuid;
  updated_profile_id uuid;
begin
  if auth.uid() is null or auth.uid() <> user_id then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_AUTH_REQUIRED', 'message', 'ログイン後に招待コードを利用してください。');
  end if;

  select *
    into invite_record
    from public.invite_codes
    where code = normalized_code
    for update;

  if not found and is_founder_code then
    insert into public.invite_codes (code, created_by, max_uses, used_count, is_active, expires_at)
    values ('MYPACE-2026', null, null, 0, true, null)
    on conflict (code) do update
    set max_uses = null,
        is_active = true,
        expires_at = null
    returning * into invite_record;
  end if;

  if not found and not is_founder_code then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_NOT_FOUND', 'message', '招待コードが見つかりません。');
  end if;

  if not is_founder_code and (
    invite_record.created_by is null
    or not exists (select 1 from public.profiles where id = invite_record.created_by)
  ) then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_CREATOR_NOT_FOUND', 'message', 'この招待コードの紹介者を確認できません。');
  end if;

  if not is_founder_code and invite_record.created_by = user_id then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_SELF_USE_NOT_ALLOWED', 'message', '自分で作成した招待コードは利用できません。');
  end if;

  if not invite_record.is_active then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_INACTIVE', 'message', 'この招待コードは現在利用できません。');
  end if;

  if not is_founder_code and invite_record.expires_at is not null and invite_record.expires_at <= now() then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_EXPIRED', 'message', 'この招待コードは期限切れです。');
  end if;

  if not is_founder_code and invite_record.max_uses is not null and invite_record.used_count >= invite_record.max_uses then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_LIMIT_REACHED', 'message', 'この招待コードは利用上限に達しています。');
  end if;

  official_introducer_id := case
    when is_founder_code and invite_record.created_by = user_id then null
    else invite_record.created_by
  end;

  update public.invite_codes
    set used_count = used_count + 1,
        max_uses = case when is_founder_code then null else max_uses end,
        expires_at = case when is_founder_code then null else expires_at end
    where id = invite_record.id;

  update public.profiles
    set invited_by = official_introducer_id,
        invite_code_used = invite_record.code
    where id = user_id
    returning id into updated_profile_id;

  if updated_profile_id is null then
    return jsonb_build_object('success', false, 'reason', 'PROFILE_NOT_FOUND', 'message', 'プロフィール保存後の紹介情報更新に失敗しました。');
  end if;

  if official_introducer_id is not null then
    insert into public.introductions (
      introducer_id,
      introduced_user_id,
      target_user_id,
      comment,
      status
    ) values (
      official_introducer_id,
      user_id,
      null,
      '招待コード経由',
      'active'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'reason', case when is_founder_code then 'FOUNDER_INVITE_CODE_USED' else 'INVITE_CODE_USED' end,
    'message', '紹介情報を保存しました。',
    'invite_code_id', invite_record.id,
    'introducer_id', official_introducer_id,
    'code', invite_record.code
  );
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'reason', 'INVITE_CODE_RPC_ERROR',
      'message', '紹介情報の保存に失敗しました。',
      'sqlstate', sqlstate
    );
end;
$$;

grant execute on function public.use_invite_code(text, uuid) to authenticated;
