import { getTranslation } from "../i18n/translations";
import type { Locale } from "../i18n/locale";
export function roleLabel(key: string, name: string, locale: Locale): string {
  if (key === "admin") return getTranslation("Shell.administrator", locale);
  if (key === "judge") return getTranslation("Shell.judge", locale);
  if (key === "moderator") return getTranslation("Shell.moderator", locale);
  if (key === "representative") return getTranslation("Shell.representative", locale);
  return getTranslation("Shell.customRole", locale, { name });
}
