import { normalizeInviteCodeInput, isFounderInviteCode, FOUNDER_INVITE_CODE } from './inviteCodeNormalize';
import { requireSupabaseClient } from './supabase';

export type InviteCodeRow = {
  id: string;
  code: string;
  created_by: string | null;
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
  | { ok: true; inviteCodeId: string; introducerId: string | null; code: string; message?: string }
  | { ok: false; error: string };


type InviteCodeFailureReason = 'not_found' | 'inactive' | 'expired' | 'max_uses_reached' | 'network' | 'auth_required' | 'creator_not_found' | 'self_use' | 'unknown';

type InviteCodeErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function getFounderInviteCodeRow(): InviteCodeRow {
  return {
    id: 'founder-special-mypace-2026',
    code: FOUNDER_INVITE_CODE,
    created_by: null,
    max_uses: null,
    used_count: 0,
    is_active: true,
    expires_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function getInviteFailureReason(message: string): InviteCodeFailureReason {
  if (message.includes('INVITE_CODE_NOT_FOUND')) return 'not_found';
  if (message.includes('INVITE_CODE_INACTIVE')) return 'inactive';
  if (message.includes('INVITE_CODE_EXPIRED')) return 'expired';
  if (message.includes('INVITE_CODE_LIMIT_REACHED')) return 'max_uses_reached';
  if (message.includes('INVITE_CODE_AUTH_REQUIRED')) return 'auth_required';
  if (message.includes('INVITE_CODE_CREATOR_NOT_FOUND')) return 'creator_not_found';
  if (isInviteCodeSelfUseError(message)) return 'self_use';
  return 'unknown';
}

function getRpcFailureReason(result: InviteCodeRpcResult | null) {
  return getInviteFailureReason(result?.reason ?? result?.error ?? result?.message ?? '');
}

function getErrorLog(error: InviteCodeErrorLike | null | undefined) {
  if (!error) return undefined;
  return {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  };
}

function logInviteCodeVerifyFailed(params: {
  rawCode: string;
  normalizedCode: string;
  isFounderCode: boolean;
  reason: InviteCodeFailureReason;
  error?: InviteCodeErrorLike | null;
  result?: InviteCodeRpcResult | null;
}) {
  console.warn('[ConnectBloom] invite code verify failed', {
    action: 'invite_code_verify_failed',
    rawCodeLength: params.rawCode.length,
    normalizedCode: params.normalizedCode,
    isFounderCode: params.isFounderCode,
    error: getErrorLog(params.error),
    rpc: params.result ? {
      reason: params.result.reason,
      error: params.result.error,
      message: params.result.message,
    } : undefined,
    reason: params.reason,
  });
}

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

const selfInviteErrorTokens = [
  'INVITE_CODE_SELF_USE_NOT_ALLOWED',
  '自分で作成した招待コードは利用できません',
];

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

export { normalizeInviteCodeInput, isFounderInviteCode, FOUNDER_INVITE_CODE };

export function isInviteCodeSelfUseError(message: string) {
  return selfInviteErrorTokens.some((token) => message.includes(token));
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
  if (message.includes('INVITE_CODE_NOT_FOUND')) return '招待コードを確認できませんでした。入力内容をもう一度お確かめください。';
  if (message.includes('INVITE_CODE_INACTIVE')) return 'この招待コードは現在利用できません。紹介者に確認してください。';
  if (message.includes('INVITE_CODE_EXPIRED')) return 'この招待コードは期限切れです。新しいコードを紹介者に確認してください。';
  if (message.includes('INVITE_CODE_LIMIT_REACHED')) return 'この招待コードは利用上限に達しています。紹介者に確認してください。';
  if (message.includes('INVITE_CODE_CREATOR_NOT_FOUND')) return 'この招待コードの紹介者を確認できません。紹介者に確認してください。';
  if (isInviteCodeSelfUseError(message)) return '自分で作成した招待コードは利用できません。別の紹介者のコードを入力してください。';
  if (message.includes('INVITE_CODE_AUTH_REQUIRED')) return 'ログイン後に招待コードを利用してください。';
  if (message.includes('INVITE_CODE_LIMIT_PER_USER_REACHED')) return '招待枠を使い切りました。追加の招待が必要な場合は、管理者に相談してください。';
  if (message.includes('duplicate key')) return '紹介情報はすでに保存されています。画面を更新してもう一度お試しください。';
  return message || '招待コードを確認できませんでした。入力内容をもう一度お確かめください。';
}

function inviteErrorFromRpc(result: InviteCodeRpcResult | null, fallback: string) {
  const rawMessage = result?.message ?? result?.reason ?? result?.error ?? '';
  return formatSupabaseInviteError(rawMessage) || fallback;
}

export async function validateInviteCode(code: string): Promise<InviteCodeValidationResult> {
  const normalizedCode = normalizeInviteCodeInput(code);
  const founderCode = isFounderInviteCode(normalizedCode);
  if (!normalizedCode) return { ok: false, error: '招待コードを入力してください。' };
  if (founderCode) return { ok: true, inviteCode: getFounderInviteCodeRow() };

  const { data, error } = await requireSupabaseClient().rpc('validate_invite_code', {
    invite_code: normalizedCode,
  });

  if (error) {
    logInviteCodeVerifyFailed({ rawCode: code, normalizedCode, isFounderCode: founderCode, reason: 'network', error });
    return { ok: false, error: formatSupabaseInviteError(error.message) };
  }

  const result = pickRpcResult(data);
  const isSuccess = result?.success === true || result?.ok === true;
  if (!isSuccess || !result?.invite_code) {
    const reason = getRpcFailureReason(result);
    logInviteCodeVerifyFailed({ rawCode: code, normalizedCode, isFounderCode: founderCode, reason, result });
    return { ok: false, error: inviteErrorFromRpc(result, '招待コードを確認できませんでした。入力内容をもう一度お確かめください。') };
  }

  const inviteCode = result.invite_code;
  if (!inviteCode.created_by) {
    logInviteCodeVerifyFailed({ rawCode: code, normalizedCode, isFounderCode: founderCode, reason: 'creator_not_found', result });
    return { ok: false, error: 'この招待コードの紹介者を確認できません。紹介者に確認してください。' };
  }
  if (!inviteCode.is_active) {
    logInviteCodeVerifyFailed({ rawCode: code, normalizedCode, isFounderCode: founderCode, reason: 'inactive', result });
    return { ok: false, error: 'この招待コードは現在利用できません。紹介者に確認してください。' };
  }
  if (isExpired(inviteCode)) {
    logInviteCodeVerifyFailed({ rawCode: code, normalizedCode, isFounderCode: founderCode, reason: 'expired', result });
    return { ok: false, error: 'この招待コードは期限切れです。新しいコードを紹介者に確認してください。' };
  }
  if (isLimitReached(inviteCode)) {
    logInviteCodeVerifyFailed({ rawCode: code, normalizedCode, isFounderCode: founderCode, reason: 'max_uses_reached', result });
    return { ok: false, error: 'この招待コードは利用上限に達しています。紹介者に確認してください。' };
  }

  return { ok: true, inviteCode };
}

export async function useInviteCode(code: string, userId: string): Promise<InviteCodeUseResult> {
  const normalizedCode = normalizeInviteCodeInput(code);
  if (!normalizedCode) return { ok: false, error: '招待コードを入力してください。' };

  const { data, error } = await requireSupabaseClient().rpc('use_invite_code', {
    invite_code: normalizedCode,
    user_id: userId,
  });

  const founderCode = isFounderInviteCode(normalizedCode);

  if (error) {
    return { ok: false, error: `紹介情報の保存に失敗しました。${formatSupabaseInviteError(error.message)}` };
  }

  const result = pickRpcResult(data);
  const isSuccess = result?.success === true || result?.ok === true;
  const hasRequiredResult = Boolean(result?.invite_code_id && result.code && (result.introducer_id || founderCode));
  if (!isSuccess || !hasRequiredResult) {
    const reason = getRpcFailureReason(result);
    if (founderCode && ['not_found', 'creator_not_found', 'self_use'].includes(reason)) {
      return {
        ok: true,
        inviteCodeId: result?.invite_code_id ?? 'founder-special-mypace-2026',
        introducerId: null,
        code: FOUNDER_INVITE_CODE,
        message: result?.message,
      };
    }
    return { ok: false, error: `紹介情報の保存に失敗しました。${inviteErrorFromRpc(result, '少し時間を置いてもう一度お試しください。')}` };
  }

  return {
    ok: true,
    inviteCodeId: result?.invite_code_id ?? 'founder-special-mypace-2026',
    introducerId: result?.introducer_id ?? null,
    code: result?.code ?? FOUNDER_INVITE_CODE,
    message: result?.message,
  };
}

export async function createInviteCode(params: InviteCodeCreateParams): Promise<InviteCodeRow> {
  const normalizedCode = normalizeInviteCodeInput(params.code);
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

export async function getManagedInviteCodes(): Promise<InviteCodeRow[]> {
  const { data, error } = await requireSupabaseClient()
    .from('invite_codes')
    .select(inviteCodeColumns)
    .order('created_at', { ascending: false })
    .returns<InviteCodeRow[]>();

  if (error) throw new Error(formatSupabaseInviteError(error.message));
  return data ?? [];
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

export async function deleteInviteCode(codeId: string): Promise<void> {
  const { error } = await requireSupabaseClient()
    .from('invite_codes')
    .delete()
    .eq('id', codeId)
    .eq('used_count', 0)
    .select('id')
    .single();

  if (error) throw new Error(formatSupabaseInviteError(error.message || '招待コードの削除に失敗しました。'));
}

export async function deactivateInviteCode(codeId: string): Promise<InviteCodeRow> {
  const { data, error } = await requireSupabaseClient()
    .from('invite_codes')
    .update({ is_active: false })
    .eq('id', codeId)
    .select(inviteCodeColumns)
    .single<InviteCodeRow>();

  if (error) throw new Error(formatSupabaseInviteError(error.message));
  return data;
}
