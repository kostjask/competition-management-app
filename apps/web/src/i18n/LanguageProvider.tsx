import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LanguageContext } from "./LanguageContext";
import { initialLocale, isLocale, DEFAULT_LOCALE, STORAGE_KEY, type Locale } from "./locale";
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(initialLocale);
  const explicit = useRef(false);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const setLocale = useCallback((value: Locale) => {
    const next = isLocale(value) ? value : DEFAULT_LOCALE;
    explicit.current = true;
    updateLocale(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep the in-memory choice. */ }
  }, []);
  const reconcileAccountLocale = useCallback((preference: Locale | null) => {
    if (!explicit.current) updateLocale(preference ?? initialLocale());
  }, []);
  return <LanguageContext.Provider value={{ locale, setLocale, reconcileAccountLocale }}>{children}</LanguageContext.Provider>;
}
