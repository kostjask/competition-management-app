import type { ApplicationReview } from "@dance/schemas";
import { useRef, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { getApplicationReview, retryReviewNotification } from "../../api/studios";
import { toUiError, type UiError } from "../../api/error";
import { Alert, Button, ErrorSummary } from "../../components/ui/Foundation";
import { statusKey, reasonKey } from "./policy";

const notificationKey = { SIMULATED: "Application.simulated", NO_RECIPIENT: "Application.noRecipient", QUEUED: "Application.queued", RETRYING: "Application.retrying", ACCEPTED: "Application.providerAccepted", EXPIRED: "Application.expired" } as const;
const historyKey = { STUDIO_APPROVAL_CHANGED: "Application.organization", REGISTRATION_APPROVAL_CHANGED: "Application.event", REGISTRATION_CORRECTED: "Application.corrected", REGISTRATION_CANCELLED: "Registration.cancelled", REGISTRATION_REAPPLIED: "Application.reapply", REGISTRATION_CREATED: "Application.created" } as const;
export function ApplicationHistory({ value, admin = false, eventId, studioId, onChanged }: {
  value: ApplicationReview; admin?: boolean; eventId: string; studioId: string; onChanged: (value: ApplicationReview) => void;
}) {
  const { t, locale } = useTranslation();
  const heading = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [saved, setSaved] = useState(false);
  const retry = async (id: string) => {
    setBusy(true); setError(null); setSaved(false);
    try {
      await retryReviewNotification(eventId, studioId, id);
      setSaved(true);
      onChanged(await getApplicationReview(eventId, studioId));
      heading.current?.focus();
    } catch (err: unknown) { setError(toUiError(err)); }
    finally { setBusy(false); }
  };
  const time = (date: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
  return <>
    <section className="application-section"><h3 ref={heading} tabIndex={-1}>{t("Application.notifications")}</h3>
      <ErrorSummary error={error} title={t("Application.notifications")} />
      {saved && <Alert tone="success">{t("Application.retrySaved")}</Alert>}
      {!value.notifications.length ? <p>{t("Application.noNotifications")}</p> : <ul className="application-history">{value.notifications.map(row => <li key={row.id}>
        <p>{t(row.axis === "ORGANIZATION" ? "Application.organization" : "Application.event")} ({t("Application.revision")} {row.revision})</p>
        <p>{t(notificationKey[row.state])}</p><time dateTime={row.createdAt}>{time(row.createdAt)}</time>
        {admin && row.retryable && <Button variant="secondary" disabled={busy} pending={busy} onClick={() => { void retry(row.id); }}>{t("Application.retryNotification")}</Button>}
      </li>)}</ul>}
    </section>
    <details><summary>{t("Application.history")}</summary>{!value.history.length ? <p>{t("Application.noHistory")}</p> : <ol className="application-history">{value.history.map((row, index) => <li key={index}>
      {t(historyKey[row.action])}{row.toStatus && <>: {t(statusKey[row.toStatus])}</>}
      {row.revision !== null && <> ({t("Application.revision")} {row.revision})</>}
      {row.reason && <p>{t(reasonKey[row.reason])}</p>}
      <time dateTime={row.createdAt}>{time(row.createdAt)}</time>
    </li>)}</ol>}</details>
  </>;
}
