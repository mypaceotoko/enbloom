import { normalizeInviteCodeInput } from './inviteCodeNormalize';

const PENDING_INVITE_CODE_STORAGE_KEY = 'connectbloom.pendingInviteCode.v1';

export { normalizeInviteCodeInput };

export function getPendingInviteCode() {
  if (typeof window === 'undefined') return '';
  return normalizeInviteCodeInput(window.sessionStorage.getItem(PENDING_INVITE_CODE_STORAGE_KEY) ?? '');
}

export function setPendingInviteCode(code: string) {
  if (typeof window === 'undefined') return;
  const normalizedCode = normalizeInviteCodeInput(code);
  if (!normalizedCode) {
    window.sessionStorage.removeItem(PENDING_INVITE_CODE_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(PENDING_INVITE_CODE_STORAGE_KEY, normalizedCode);
}

export function clearPendingInviteCode() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(PENDING_INVITE_CODE_STORAGE_KEY);
}
