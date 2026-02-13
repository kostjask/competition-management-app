import { useLanguage } from "../i18n/useLanguage";

const languages = [
  { code: "et" as const, label: "EE" },
  { code: "en" as const, label: "EN" },
  { code: "ru" as const, label: "RU" },
];

export function LanguageSelector() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
      {languages.map((lang) => (
        <button
          key={lang.code}
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