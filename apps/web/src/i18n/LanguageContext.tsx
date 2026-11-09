import { createContext } from "react";
import type { Locale } from "./locale";
export type { Locale } from "./locale";
export const LanguageContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void; reconcileAccountLocale: (locale: Locale | null) => void } | undefined>(undefined);
