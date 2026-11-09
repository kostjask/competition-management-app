import { useEffect, useState } from "react";
import { downloadImage, uploadEventImage } from "../../api/images";
import { getEvent } from "../../api/events";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { Alert, Button, ErrorSummary, Field, Input, LoadingState } from "../../components/ui/Foundation";

export function PrivateEventImage({ url }: { url: string | null }) {
  const { t } = useTranslation(); const [blob, setBlob] = useState<string | null>(null); const [failed, setFailed] = useState(false); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; let objectUrl: string | null = null;
    if (url) void downloadImage(url).then(result => { objectUrl = URL.createObjectURL(result); if (active) setBlob(objectUrl); else URL.revokeObjectURL(objectUrl); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, attempt]);
  if (!url) return <p>{t("Setup.noImage")}</p>;
  if (failed) return <div><p>{t("Shell.unavailable")}</p><Button variant="secondary" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>{t("Shell.retry")}</Button></div>;
  return blob ? <img className="setup-image" src={blob} alt={t("Common.eventPhoto")} /> : <LoadingState label={t("Access.loading")} />;
}
export function EventImageEditor({ eventId, imageUrl, disabled, onSaved }: { eventId: string; imageUrl: string | null; disabled: boolean; onSaved: (url: string | null) => void }) {
  const { t } = useTranslation(); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false); const [saved, setSaved] = useState(false); const [error, setError] = useState<UiError | null>(null);
  const [version, setVersion] = useState(0);
  return <section><h2>{t("Setup.image")}</h2><PrivateEventImage key={imageUrl + ":" + version} url={imageUrl} />
    <p>{t("Setup.imageHelp")}</p><ErrorSummary error={error} title={t("Feedback.validation")} />
    {saved && <Alert tone="success">{t("Setup.imageSaved")}</Alert>}
    {uncertain && <Alert tone="warning">{t("Setup.imageUncertain")}</Alert>}
    <form onSubmit={event => { event.preventDefault(); if (!file || busy || disabled || uncertain) return;
      setBusy(true); setError(null); setSaved(false);
      void uploadEventImage(eventId, file).then(result => { onSaved(result.imageUrl); setVersion(value => value + 1); setSaved(true); })
        .catch((err: unknown) => { setError(toUiError(err)); setUncertain(true); }).finally(() => setBusy(false));
    }}><fieldset disabled={disabled || busy || uncertain}>
      <Field id="event-image-file" label={t("Setup.image")}>{props => <Input {...props} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { setFile(event.target.files?.[0] ?? null); setSaved(false); }} />}</Field>
      <Button type="submit" pending={busy} disabled={!file}>{t("Setup.upload")}</Button>
    </fieldset></form>
    {uncertain && <Button variant="secondary" disabled={disabled || busy} onClick={() => {
      setBusy(true); setError(null);
      void getEvent(eventId).then(event => { onSaved(event.imageUrl); setVersion(value => value + 1); setUncertain(false); })
        .catch((err: unknown) => setError(toUiError(err))).finally(() => setBusy(false));
    }}>{t("Setup.refresh")}</Button>}
  </section>;
}
