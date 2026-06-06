import { FOUNDER_EMAIL, normalizeEmail } from './admin';
import { getSafeErrorLog } from './errorMessage';
import { requireSupabaseClient } from './supabase';

export type AccountStatus = 'active' | 'suspended';

export type AccountStatusUpdateResult = {
  success: boolean;
  user_id: string;
  account_status: AccountStatus;
};

export function isFounderAccountEmail(email?: string | null) {
  return normalizeEmail(email) === FOUNDER_EMAIL;
}

async function getAccountStatusDiagnostics(userId: string, accountStatus: AccountStatus) {
  const client = requireSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  const currentUser = authData.user;
  const currentUserEmail = currentUser?.email ?? null;

  const [{ data: profileData }, { data: publicIsAdminData, error: publicIsAdminError }] = currentUser
    ? await Promise.all([
      client.from('profiles').select('role').eq('id', currentUser.id).maybeSingle<{ role: string | null }>(),
      client.rpc('is_admin', { user_id: currentUser.id }).maybeSingle<boolean>(),
    ])
    : [{ data: null }, { data: null, error: null }];

  if (publicIsAdminError) {
    console.warn('[ConnectBloom] account status is_admin diagnostic failed', getSafeErrorLog(publicIsAdminError, 'admin_update_profile_account_status_is_admin_check'));
  }

  return {
    action: 'admin_update_profile_account_status' as const,
    currentUserId: currentUser?.id ?? null,
    currentUserEmail,
    targetProfileId: userId,
    nextAccountStatus: accountStatus,
    isFounder: normalizeEmail(currentUserEmail) === FOUNDER_EMAIL,
    isAdmin: profileData?.role === 'admin' || normalizeEmail(currentUserEmail) === FOUNDER_EMAIL,
    publicIsAdminAuthUid: Boolean(publicIsAdminData),
    rpcName: 'set_profile_account_status' as const,
    rpcPayloadKeys: ['p_profile_id', 'p_account_status'],
  };
}

export async function setProfileAccountStatus(userId: string, accountStatus: AccountStatus): Promise<AccountStatusUpdateResult> {
  if (!userId) throw new Error('ユーザーIDを確認できませんでした。');

  const diagnostics = await getAccountStatusDiagnostics(userId, accountStatus);
  const { data, error } = await requireSupabaseClient()
    .rpc('set_profile_account_status', {
      p_profile_id: userId,
      p_account_status: accountStatus,
    })
    .single<AccountStatusUpdateResult>();

  if (error) {
    console.warn('[ConnectBloom] account status update failed', {
      ...diagnostics,
      ...getSafeErrorLog(error, 'admin_update_profile_account_status'),
    });
    throw error;
  }
  if (!data?.success) throw new Error('ユーザー利用制限の更新に失敗しました。');
  return data;
}

export async function suspendProfile(userId: string) {
  return setProfileAccountStatus(userId, 'suspended');
}

export async function restoreProfile(userId: string) {
  return setProfileAccountStatus(userId, 'active');
}
