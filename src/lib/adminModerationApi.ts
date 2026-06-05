import { FOUNDER_EMAIL, normalizeEmail } from './admin';
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

export async function setProfileAccountStatus(userId: string, accountStatus: AccountStatus): Promise<AccountStatusUpdateResult> {
  if (!userId) throw new Error('ユーザーIDを確認できませんでした。');

  const { data, error } = await requireSupabaseClient()
    .rpc('set_profile_account_status', {
      target_user_id: userId,
      new_account_status: accountStatus,
    })
    .single<AccountStatusUpdateResult>();

  if (error) throw error;
  if (!data?.success) throw new Error('ユーザー利用制限の更新に失敗しました。');
  return data;
}

export async function suspendProfile(userId: string) {
  return setProfileAccountStatus(userId, 'suspended');
}

export async function restoreProfile(userId: string) {
  return setProfileAccountStatus(userId, 'active');
}
