export const FOUNDER_INVITE_CODE = 'MYPACE-2026';

const fullWidthAsciiOffset = 0xfee0;
const unicodeHyphenPattern = /[‐‑‒–—―−ー－]/g;
const invisibleCharacterPattern = /[\u200B-\u200D\uFEFF]/g;
const whitespacePattern = /[\s\u3000]+/g;

function toHalfWidthAscii(value: string) {
  return value.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (character) => String.fromCharCode(character.charCodeAt(0) - fullWidthAsciiOffset));
}

export function normalizeInviteCodeInput(code: string) {
  return toHalfWidthAscii(code)
    .normalize('NFKC')
    .replace(unicodeHyphenPattern, '-')
    .replace(invisibleCharacterPattern, '')
    .replace(whitespacePattern, '')
    .replace(/-+/g, '-')
    .trim()
    .toUpperCase();
}

export function isFounderInviteCode(code: string) {
  return normalizeInviteCodeInput(code) === FOUNDER_INVITE_CODE;
}
