import { useMemo, useState, type ReactNode } from 'react';
import { LanguageContext, type LanguageContextValue } from './LanguageContext';
import { translate } from '../lib/i18n';
import { readStoredLanguage, storeLanguage, type AppLanguage } from '../lib/language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => readStoredLanguage());

  function setLanguage(nextLanguage: AppLanguage) {
    setLanguageState(nextLanguage);
    storeLanguage(nextLanguage);
  }

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (key) => translate(language, key),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
