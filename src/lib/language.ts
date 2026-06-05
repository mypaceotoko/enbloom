export type AppLanguage = 'ja' | 'en';

export const DEFAULT_LANGUAGE: AppLanguage = 'ja';
export const LANGUAGE_STORAGE_KEY = 'connectbloom.language';

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  ja: '日本語',
  en: 'English',
};

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'ja' || value === 'en';
}

export function readStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isAppLanguage(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
}

export function storeLanguage(language: AppLanguage) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}
