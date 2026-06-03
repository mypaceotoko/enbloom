-- ConnectBloom invite-code RPC diagnostics and user-facing messages
-- 招待コード = ただの入場券ではなく、誰のご縁から来たかを記録する参加ルート
-- 002適用済み環境向けに、RPCの戻り値へ reason / message を追加し、
-- プロフィール更新・introductions作成の失敗理由をフロントへ返しやすくします。

create or replace function public.validate_invite_code(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := upper(trim(invite_code));
  invite_record public.invite_codes%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_AUTH_REQUIRED', 'message', 'ログイン後に招待コードを利用してください。');
  end if;

  select *
    into invite_record
    from public.invite_codes
    where code = normalized_code;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_NOT_FOUND', 'message', '招待コードが見つかりません。');
  end if;

  if invite_record.created_by is null
     or not exists (select 1 from public.profiles where id = invite_record.created_by) then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_CREATOR_NOT_FOUND', 'message', 'この招待コードの紹介者を確認できません。');
  end if;

  if not invite_record.is_active then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_INACTIVE', 'message', 'この招待コードは現在利用できません。');
  end if;

  if invite_record.expires_at is not null and invite_record.expires_at <= now() then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_EXPIRED', 'message', 'この招待コードは期限切れです。');
  end if;

  if invite_record.max_uses is not null and invite_record.used_count >= invite_record.max_uses then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_LIMIT_REACHED', 'message', 'この招待コードは利用上限に達しています。');
  end if;

  return jsonb_build_object(
    'success', true,
    'reason', 'INVITE_CODE_VALID',
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
  normalized_code text := upper(trim(invite_code));
  invite_record public.invite_codes%rowtype;
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

  if not found then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_NOT_FOUND', 'message', '招待コードが見つかりません。');
  end if;

  if invite_record.created_by is null
     or not exists (select 1 from public.profiles where id = invite_record.created_by) then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_CREATOR_NOT_FOUND', 'message', 'この招待コードの紹介者を確認できません。');
  end if;

  if invite_record.created_by = user_id then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_SELF_USE_NOT_ALLOWED', 'message', '自分で作成した招待コードは利用できません。');
  end if;

  if not invite_record.is_active then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_INACTIVE', 'message', 'この招待コードは現在利用できません。');
  end if;

  if invite_record.expires_at is not null and invite_record.expires_at <= now() then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_EXPIRED', 'message', 'この招待コードは期限切れです。');
  end if;

  if invite_record.max_uses is not null and invite_record.used_count >= invite_record.max_uses then
    return jsonb_build_object('success', false, 'reason', 'INVITE_CODE_LIMIT_REACHED', 'message', 'この招待コードは利用上限に達しています。');
  end if;

  update public.invite_codes
    set used_count = used_count + 1
    where id = invite_record.id;

  update public.profiles
    set invited_by = invite_record.created_by,
        invite_code_used = invite_record.code
    where id = user_id
    returning id into updated_profile_id;

  if updated_profile_id is null then
    return jsonb_build_object('success', false, 'reason', 'PROFILE_NOT_FOUND', 'message', 'プロフィール保存後の紹介情報更新に失敗しました。');
  end if;

  insert into public.introductions (
    introducer_id,
    introduced_user_id,
    target_user_id,
    comment,
    status
  ) values (
    invite_record.created_by,
    user_id,
    null,
    '招待コード経由',
    'active'
  );

  return jsonb_build_object(
    'success', true,
    'reason', 'INVITE_CODE_USED',
    'message', '紹介情報を保存しました。',
    'invite_code_id', invite_record.id,
    'introducer_id', invite_record.created_by,
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
