import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/useLanguage";
import { languageNames, SUPPORTED_LOCALES } from "../i18n/locale";
import { PreferenceDisclosure } from "./layouts/PreferenceDisclosure";

export function LanguageSelector() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLanguage();

  return <PreferenceDisclosure id="workspace-language" label={languageNames[locale]}
    accessibleLabel={t("Shell.currentLanguage", { language: languageNames[locale] })}
    choices={SUPPORTED_LOCALES.map(lang => ({
      id: lang, label: languageNames[lang], lang, selected: lang === locale, choose: () => setLocale(lang),
    }))} />;
}
