-- EnBloom invite-code flows
-- 招待コードは「1回限りのチケット」ではなく、紹介者に紐づいた参加ルートとして扱います。
-- max_uses が null の場合は無制限、数値の場合のみ利用上限を適用します。

-- invite_codes.max_uses を無制限(null)対応に変更します。
alter table public.invite_codes
  alter column max_uses drop not null,
  alter column max_uses drop default;

alter table public.invite_codes
  drop constraint if exists invite_codes_max_uses_check,
  drop constraint if exists invite_codes_check;

alter table public.invite_codes
  add constraint invite_codes_max_uses_positive_or_null
    check (max_uses is null or max_uses > 0),
  add constraint invite_codes_used_count_not_above_limited_max
    check (max_uses is null or used_count <= max_uses);

create index if not exists invite_codes_code_idx on public.invite_codes (code);
create index if not exists invite_codes_active_lookup_idx
  on public.invite_codes (code, is_active, expires_at)
  where is_active;


-- エラー理由をUIに返すための検証専用RPCです。used_countは増やしません。
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
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_AUTH_REQUIRED');
  end if;

  select *
    into invite_record
    from public.invite_codes
    where code = normalized_code;

  if not found then
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_NOT_FOUND');
  end if;

  if invite_record.created_by is null
     or not exists (select 1 from public.profiles where id = invite_record.created_by) then
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_CREATOR_NOT_FOUND');
  end if;

  if not invite_record.is_active then
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_INACTIVE');
  end if;

  if invite_record.expires_at is not null and invite_record.expires_at <= now() then
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_EXPIRED');
  end if;

  if invite_record.max_uses is not null and invite_record.used_count >= invite_record.max_uses then
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_LIMIT_REACHED');
  end if;

  return jsonb_build_object(
    'success', true,
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

-- 有効コード検証・used_count加算・profiles更新・introductions作成を1回のRPCにまとめます。
create or replace function public.use_invite_code(invite_code text, user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := upper(trim(invite_code));
  invite_record public.invite_codes%rowtype;
begin
  if auth.uid() is null or auth.uid() <> user_id then
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_AUTH_REQUIRED');
  end if;

  select *
    into invite_record
    from public.invite_codes
    where code = normalized_code
    for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_NOT_FOUND');
  end if;

  if invite_record.created_by is null
     or not exists (select 1 from public.profiles where id = invite_record.created_by) then
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_CREATOR_NOT_FOUND');
  end if;

  if invite_record.created_by = user_id then
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_SELF_USE_NOT_ALLOWED');
  end if;

  if not invite_record.is_active then
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_INACTIVE');
  end if;

  if invite_record.expires_at is not null and invite_record.expires_at <= now() then
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_EXPIRED');
  end if;

  if invite_record.max_uses is not null and invite_record.used_count >= invite_record.max_uses then
    return jsonb_build_object('success', false, 'error', 'INVITE_CODE_LIMIT_REACHED');
  end if;

  update public.invite_codes
    set used_count = used_count + 1
    where id = invite_record.id;

  update public.profiles
    set invited_by = invite_record.created_by,
        invite_code_used = invite_record.code
    where id = user_id;

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
    'invite_code_id', invite_record.id,
    'introducer_id', invite_record.created_by,
    'code', invite_record.code
  );
end;
$$;

grant execute on function public.use_invite_code(text, uuid) to authenticated;

-- invite_codes: 作成者・管理者は管理可能。認証済みユーザーは有効で利用可能なコードを検証できます。
drop policy if exists "invite_codes_select_active_or_owner_or_admin" on public.invite_codes;
create policy "invite_codes_select_active_or_owner_or_admin"
  on public.invite_codes for select
  using (
    auth.uid() is not null
    and (
      (is_active and (expires_at is null or expires_at > now()) and (max_uses is null or used_count < max_uses))
      or created_by = auth.uid()
      or public.is_admin()
    )
  );

drop policy if exists "invite_codes_insert_creator_or_admin" on public.invite_codes;
create policy "invite_codes_insert_creator_or_admin"
  on public.invite_codes for insert
  with check (
    auth.uid() is not null
    and (created_by = auth.uid() or public.is_admin())
    and (max_uses is null or max_uses > 0)
  );

drop policy if exists "invite_codes_update_owner_or_admin" on public.invite_codes;
create policy "invite_codes_update_owner_or_admin"
  on public.invite_codes for update
  using (created_by = auth.uid() or public.is_admin())
  with check (
    (created_by = auth.uid() or public.is_admin())
    and (max_uses is null or max_uses > 0)
  );

-- introductions: 紹介者・紹介されたユーザー・対象ユーザー・管理者が閲覧できます。
drop policy if exists "introductions_select_involved_or_public_or_admin" on public.introductions;
create policy "introductions_select_involved_or_public_or_admin"
  on public.introductions for select
  using (
    introducer_id = auth.uid()
    or introduced_user_id = auth.uid()
    or target_user_id = auth.uid()
    or public.is_admin()
  );
