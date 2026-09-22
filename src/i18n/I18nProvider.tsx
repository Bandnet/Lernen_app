import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Repository } from '../data/repository';
import { readMirror, writeMirror } from '../utils/mirror';
import { KEYS } from '../settings/theme';
import { translations, type Language, type TranslationKey } from './translations';

type Vars = Record<string, string | number>;

interface I18nValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const LANGUAGE_KEY = 'setting:language';

function detectLanguage(): Language {
  const mirrored = readMirror(KEYS.languageMirror);
  if (mirrored && mirrored in translations) return mirrored as Language;
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'de';
}

export function I18nProvider({ repository, children }: { repository: Repository; children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage);

  useEffect(() => {
    repository
      .getMeta<Language>(LANGUAGE_KEY)
      .then((saved) => {
        if (saved && saved in translations) {
          setLanguageState(saved);
          writeMirror(KEYS.languageMirror, saved);
        }
      })
      .catch(() => undefined);
  }, [repository]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translations[language].appName;
  }, [language]);

  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      writeMirror(KEYS.languageMirror, lang);
      repository.setMeta(LANGUAGE_KEY, lang).catch(() => undefined);
    },
    [repository],
  );

  const t = useCallback(
    (key: TranslationKey, vars?: Vars) => {
      let text: string = translations[language][key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(value));
        }
      }
      return text;
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
