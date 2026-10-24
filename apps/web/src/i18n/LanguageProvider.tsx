import { useState, type ReactNode } from "react";
import { LanguageContext } from "./LanguageContext";
import { initialLocale, isLocale, DEFAULT_LOCALE, STORAGE_KEY, type Locale } from "./locale";
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(initialLocale);
  const setLocale = (value: Locale) => {
    const next = isLocale(value) ? value : DEFAULT_LOCALE;
    updateLocale(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep the in-memory choice. */ }
  };
  return <LanguageContext.Provider value={{ locale, setLocale }}>{children}</LanguageContext.Provider>;
}
