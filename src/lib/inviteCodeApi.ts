import { requireSupabaseClient } from './supabase';

export type InviteCodeRow = {
  id: string;
  code: string;
  created_by: string;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

export type InviteCodeCreateParams = {
  code: string;
  createdBy: string;
  maxUses?: number | null;
  isActive?: boolean;
  expiresAt?: string | null;
};

export type InviteCodeValidationResult =
  | { ok: true; inviteCode: InviteCodeRow }
  | { ok: false; error: string };

export type InviteCodeUseResult =
  | { ok: true; inviteCodeId: string; introducerId: string; code: string; message?: string }
  | { ok: false; error: string };

type InviteCodeRpcResult = {
  success?: boolean;
  ok?: boolean;
  error?: string;
  reason?: string;
  message?: string;
  invite_code?: InviteCodeRow;
  invite_code_id?: string;
  introducer_id?: string;
  code?: string;
};

const inviteCodeColumns = [
  'id',
  'code',
  'created_by',
  'max_uses',
  'used_count',
  'is_active',
  'expires_at',
  'created_at',
].join(',');

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase();
}

function isLimitReached(inviteCode: InviteCodeRow) {
  return inviteCode.max_uses !== null && inviteCode.used_count >= inviteCode.max_uses;
}

function isExpired(inviteCode: InviteCodeRow) {
  return Boolean(inviteCode.expires_at && new Date(inviteCode.expires_at).getTime() <= Date.now());
}

function pickRpcResult(data: unknown): InviteCodeRpcResult | null {
  if (Array.isArray(data)) return (data[0] as InviteCodeRpcResult | undefined) ?? null;
  if (data && typeof data === 'object') return data as InviteCodeRpcResult;
  return null;
}

function formatSupabaseInviteError(message: string) {
  if (message.includes('INVITE_CODE_NOT_FOUND')) return '招待コードが見つかりません。コードを確認してもう一度お試しください。';
  if (message.includes('INVITE_CODE_INACTIVE')) return 'この招待コードは現在利用できません。紹介者に確認してください。';
  if (message.includes('INVITE_CODE_EXPIRED')) return 'この招待コードは期限切れです。新しいコードを紹介者に確認してください。';
  if (message.includes('INVITE_CODE_LIMIT_REACHED')) return 'この招待コードは利用上限に達しています。紹介者に確認してください。';
  if (message.includes('INVITE_CODE_CREATOR_NOT_FOUND')) return 'この招待コードの紹介者を確認できません。紹介者に確認してください。';
  if (message.includes('INVITE_CODE_SELF_USE_NOT_ALLOWED')) return '自分で作成した招待コードは利用できません。別の紹介者のコードを入力してください。';
  if (message.includes('INVITE_CODE_AUTH_REQUIRED')) return 'ログイン後に招待コードを利用してください。';
  if (message.includes('duplicate key')) return '紹介情報はすでに保存されています。画面を更新してもう一度お試しください。';
  return message || '招待コードの確認に失敗しました。少し時間を置いてもう一度お試しください。';
}

function inviteErrorFromRpc(result: InviteCodeRpcResult | null, fallback: string) {
  const rawMessage = result?.message ?? result?.reason ?? result?.error ?? '';
  return formatSupabaseInviteError(rawMessage) || fallback;
}

export async function validateInviteCode(code: string): Promise<InviteCodeValidationResult> {
  const normalizedCode = normalizeInviteCode(code);
  if (!normalizedCode) return { ok: false, error: '招待コードを入力してください。' };

  const { data, error } = await requireSupabaseClient().rpc('validate_invite_code', {
    invite_code: normalizedCode,
  });

  if (error) return { ok: false, error: `招待コードの確認に失敗しました。${formatSupabaseInviteError(error.message)}` };

  const result = pickRpcResult(data);
  const isSuccess = result?.success === true || result?.ok === true;
  if (!isSuccess || !result?.invite_code) {
    return { ok: false, error: `招待コードの確認に失敗しました。${inviteErrorFromRpc(result, 'コードを確認してもう一度お試しください。')}` };
  }

  const inviteCode = result.invite_code;
  if (!inviteCode.created_by) return { ok: false, error: 'この招待コードの紹介者を確認できません。紹介者に確認してください。' };
  if (!inviteCode.is_active) return { ok: false, error: 'この招待コードは現在利用できません。紹介者に確認してください。' };
  if (isExpired(inviteCode)) return { ok: false, error: 'この招待コードは期限切れです。新しいコードを紹介者に確認してください。' };
  if (isLimitReached(inviteCode)) return { ok: false, error: 'この招待コードは利用上限に達しています。紹介者に確認してください。' };

  return { ok: true, inviteCode };
}

export async function useInviteCode(code: string, userId: string): Promise<InviteCodeUseResult> {
  const normalizedCode = normalizeInviteCode(code);
  if (!normalizedCode) return { ok: false, error: '招待コードを入力してください。' };

  const { data, error } = await requireSupabaseClient().rpc('use_invite_code', {
    invite_code: normalizedCode,
    user_id: userId,
  });

  if (error) return { ok: false, error: `紹介情報の保存に失敗しました。${formatSupabaseInviteError(error.message)}` };

  const result = pickRpcResult(data);
  const isSuccess = result?.success === true || result?.ok === true;
  if (!isSuccess || !result?.invite_code_id || !result.introducer_id || !result.code) {
    return { ok: false, error: `紹介情報の保存に失敗しました。${inviteErrorFromRpc(result, '少し時間を置いてもう一度お試しください。')}` };
  }

  return {
    ok: true,
    inviteCodeId: result.invite_code_id,
    introducerId: result.introducer_id,
    code: result.code,
    message: result.message,
  };
}

export async function createInviteCode(params: InviteCodeCreateParams): Promise<InviteCodeRow> {
  const normalizedCode = normalizeInviteCode(params.code);
  if (!normalizedCode) throw new Error('招待コードを入力してください。');

  const maxUses = params.maxUses ?? null;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
    throw new Error('利用上限は1以上の整数で入力してください。');
  }

  const { data, error } = await requireSupabaseClient()
    .from('invite_codes')
    .insert({
      code: normalizedCode,
      created_by: params.createdBy,
      max_uses: maxUses,
      is_active: params.isActive ?? true,
      expires_at: params.expiresAt || null,
    })
    .select(inviteCodeColumns)
    .single<InviteCodeRow>();

  if (error) throw new Error(formatSupabaseInviteError(error.message));
  return data;
}

export async function getMyInviteCodes(userId: string): Promise<InviteCodeRow[]> {
  const { data, error } = await requireSupabaseClient()
    .from('invite_codes')
    .select(inviteCodeColumns)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .returns<InviteCodeRow[]>();

  if (error) throw new Error(formatSupabaseInviteError(error.message));
  return data ?? [];
}
