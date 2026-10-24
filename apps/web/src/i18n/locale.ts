export const SUPPORTED_LOCALES = ["et", "en", "ru"] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: Locale = "et";
export const STORAGE_KEY = "app-language";
export function isLocale(value: unknown): value is Locale { return value === "et" || value === "en" || value === "ru"; }
export function resolveLocale(saved: unknown, browserLanguages: readonly string[] = []): Locale {
  if (isLocale(saved)) return saved;
  for (const language of browserLanguages) { const base = language.toLowerCase().split("-")[0]; if (isLocale(base)) return base; }
  return DEFAULT_LOCALE;
}
export function initialLocale(): Locale {
  let saved: unknown;
  try { saved = globalThis.localStorage?.getItem(STORAGE_KEY); } catch { /* Storage can be unavailable. */ }
  return resolveLocale(saved, typeof navigator === "undefined" ? [] : navigator.languages);
}
