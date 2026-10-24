import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/useLanguage";

const languages = [
  { code: "et" as const, label: "Eesti" },
  { code: "en" as const, label: "English" },
  { code: "ru" as const, label: "Русский" },
];

export function LanguageSelector() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLanguage();

  return (
    <div role="group" aria-label={t("Feedback.selectedLanguage")} className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          lang={lang.code}
          aria-pressed={locale === lang.code}
          onClick={() => setLocale(lang.code)}
          className={`px-3 py-1.5 text-xs font-semibold rounded transition-all duration-200 ${
            locale === lang.code
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200 hover:cursor-pointer"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}