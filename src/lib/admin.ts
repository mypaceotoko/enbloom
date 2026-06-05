export const FOUNDER_EMAIL = 'mypaceotoko@gmail.com';
export const GENERAL_USER_INVITE_CODE_LIMIT = 3;

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? '';
}

export function isFounderEmail(email?: string | null): boolean {
  return normalizeEmail(email) === FOUNDER_EMAIL;
}
