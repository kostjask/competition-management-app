import { useState } from "react";
import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { isLocale, languageNames, SUPPORTED_LOCALES } from "../i18n/locale";
import { toUiError, type UiError } from "../api/error";
import { Alert, Button, ErrorSummary } from "../components/ui/Foundation";
export function AccountLanguage() {
  const { user, savePreference } = useAuth();
  const { t } = useTranslation();
  const [choice, setChoice] = useState(user?.preferredLocale ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  return <form className="my-6 grid min-w-0 max-w-md gap-3" onSubmit={event => {
    event.preventDefault();
    setBusy(true); setSaved(false); setError(null);
    void savePreference(isLocale(choice) ? choice : null).then(() => setSaved(true)).catch((err: unknown) => setError(toUiError(err))).finally(() => setBusy(false));
  }}>
    <label htmlFor="account-language">{t("Preferences.language")}</label>
    <p>{t("Preferences.help")}</p>
    <select id="account-language" className="min-w-0 w-full rounded border p-2" disabled={busy} value={choice} onChange={event => { setChoice(event.target.value); setSaved(false); }}>
      <option value="">{t("Preferences.default")}</option>
      {SUPPORTED_LOCALES.map(value => <option key={value} value={value} lang={value}>{languageNames[value]}</option>)}
    </select>
    <ErrorSummary error={error} title={t("Feedback.validation")} />
    {saved && <Alert tone="success">{t("Preferences.saved")}</Alert>}
    <Button type="submit" pending={busy}>{t("Preferences.save")}</Button>
  </form>;
}
