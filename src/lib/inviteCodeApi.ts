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
  | { ok: true; inviteCodeId: string; introducerId: string; code: string }
  | { ok: false; error: string };

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

function formatSupabaseInviteError(message: string) {
  if (message.includes('INVITE_CODE_NOT_FOUND')) return '招待コードが見つかりません';
  if (message.includes('INVITE_CODE_INACTIVE')) return 'この招待コードは現在利用できません';
  if (message.includes('INVITE_CODE_EXPIRED')) return 'この招待コードは期限切れです';
  if (message.includes('INVITE_CODE_LIMIT_REACHED')) return 'この招待コードは利用上限に達しています';
  if (message.includes('INVITE_CODE_CREATOR_NOT_FOUND')) return 'この招待コードの紹介者を確認できません';
  if (message.includes('INVITE_CODE_SELF_USE_NOT_ALLOWED')) return '自分で作成した招待コードは利用できません';
  if (message.includes('INVITE_CODE_AUTH_REQUIRED')) return 'ログイン後に招待コードを利用してください';
  return message || '招待コードの確認に失敗しました。時間をおいて再度お試しください。';
}

export async function validateInviteCode(code: string): Promise<InviteCodeValidationResult> {
  const normalizedCode = normalizeInviteCode(code);
  if (!normalizedCode) return { ok: false, error: '招待コードを入力してください' };

  const { data, error } = await requireSupabaseClient().rpc('validate_invite_code', {
    invite_code: normalizedCode,
  });

  if (error) return { ok: false, error: formatSupabaseInviteError(error.message) };

  const result = data as { success?: boolean; error?: string; invite_code?: InviteCodeRow } | null;
  if (!result?.success || !result.invite_code) {
    return { ok: false, error: formatSupabaseInviteError(result?.error ?? '') };
  }

  const inviteCode = result.invite_code;
  if (!inviteCode.created_by) return { ok: false, error: 'この招待コードの紹介者を確認できません' };
  if (!inviteCode.is_active) return { ok: false, error: 'この招待コードは現在利用できません' };
  if (isExpired(inviteCode)) return { ok: false, error: 'この招待コードは期限切れです' };
  if (isLimitReached(inviteCode)) return { ok: false, error: 'この招待コードは利用上限に達しています' };

  return { ok: true, inviteCode };
}

export async function useInviteCode(code: string, userId: string): Promise<InviteCodeUseResult> {
  const normalizedCode = normalizeInviteCode(code);
  if (!normalizedCode) return { ok: false, error: '招待コードを入力してください' };

  const { data, error } = await requireSupabaseClient().rpc('use_invite_code', {
    invite_code: normalizedCode,
    user_id: userId,
  });

  if (error) return { ok: false, error: formatSupabaseInviteError(error.message) };

  const result = data as { success?: boolean; error?: string; invite_code_id?: string; introducer_id?: string; code?: string } | null;
  if (!result?.success || !result.invite_code_id || !result.introducer_id || !result.code) {
    return { ok: false, error: formatSupabaseInviteError(result?.error ?? '') };
  }

  return {
    ok: true,
    inviteCodeId: result.invite_code_id,
    introducerId: result.introducer_id,
    code: result.code,
  };
}

export async function createInviteCode(params: InviteCodeCreateParams): Promise<InviteCodeRow> {
  const normalizedCode = normalizeInviteCode(params.code);
  if (!normalizedCode) throw new Error('招待コードを入力してください');

  const maxUses = params.maxUses ?? null;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
    throw new Error('利用上限は1以上の整数で入力してください');
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
