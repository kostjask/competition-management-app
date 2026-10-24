import { useLanguage } from "./useLanguage";
import { getTranslation, type TranslationKey, type TranslationArgs } from "./translations";
export function useTranslation() {
  const { locale } = useLanguage();
  const t = <K extends TranslationKey>(key: K, ...args: TranslationArgs<K>): string => getTranslation(key, locale, ...args);
  return { t, locale };
}
