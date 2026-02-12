import { useLanguage } from "../i18n/useLanguage";
import type { Locale } from "../i18n/LanguageContext";

export function LanguageSelector() {
  const { locale, setLocale } = useLanguage();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className="px-3 py-2 border border-slate-300 rounded hover:border-blue-600 cursor-pointer"
    >
      <option value="et">🇪🇪 Eesti</option>
      <option value="en">🇬🇧 English</option>
      <option value="ru">🇷🇺 Русский</option>
    </select>
  );
}