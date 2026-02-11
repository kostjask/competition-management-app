import { createContext } from 'react';

export type Locale = 'et' | 'en' | 'ru';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const SUPPORTED_LOCALES: Locale[] = ['et', 'en', 'ru'];
export const STORAGE_KEY = 'app-language';

export const detectBrowserLanguage = (): Locale => {
  const browserLang = navigator.language.split('-')[0];
  if (SUPPORTED_LOCALES.includes(browserLang as Locale)) {
    return browserLang as Locale;
  }
  return 'et'; // default fallback
};