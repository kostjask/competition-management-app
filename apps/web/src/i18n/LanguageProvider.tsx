import React, { useState, type ReactNode } from 'react';
import { LanguageContext, type Locale, SUPPORTED_LOCALES, STORAGE_KEY, detectBrowserLanguage } from './LanguageContext';

interface LanguageProviderProps {
  children: ReactNode;
}

const getInitialLocale = (): Locale => {
  if (typeof window === 'undefined') return 'en';
  
  const savedLocale = localStorage.getItem(STORAGE_KEY) as Locale | null;
  return savedLocale || detectBrowserLanguage();
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = (newLocale: Locale) => {
    if (SUPPORTED_LOCALES.includes(newLocale)) {
      setLocaleState(newLocale);
      localStorage.setItem(STORAGE_KEY, newLocale);
      return;
    }

    const fallbackLocale: Locale = 'et';

    setLocaleState(fallbackLocale);
    localStorage.setItem(STORAGE_KEY, fallbackLocale);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
};