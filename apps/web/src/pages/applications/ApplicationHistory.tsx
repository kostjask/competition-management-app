import type { ApplicationReview } from "@dance/schemas";
import { useTranslation } from "../../i18n/useTranslation";
import { statusKey, reasonKey } from "./policy";

const notificationKey = { SIMULATED: "Application.simulated", NO_RECIPIENT: "Application.noRecipient", QUEUED: "Application.queued", RETRYING: "Application.retrying", ACCEPTED: "Application.providerAccepted", EXPIRED: "Application.expired" } as const;
const historyKey = { STUDIO_APPROVAL_CHANGED: "Application.organization", REGISTRATION_APPROVAL_CHANGED: "Application.event", REGISTRATION_CORRECTED: "Application.corrected", REGISTRATION_CANCELLED: "Registration.cancelled", REGISTRATION_REAPPLIED: "Application.reapply", REGISTRATION_CREATED: "Application.created" } as const;
export function ApplicationHistory({ value }: { value: ApplicationReview }) {
  const { t, locale } = useTranslation();
  const time = (date: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
  return <>
    <section className="application-section"><h3>{t("Application.notifications")}</h3>
      {!value.notifications.length ? <p>{t("Application.noNotifications")}</p> : <ul className="application-history">{value.notifications.map(row => <li key={row.id}>
        <p>{t(row.axis === "ORGANIZATION" ? "Application.organization" : "Application.event")} ({t("Application.revision")} {row.revision})</p>
        <p>{t(notificationKey[row.state])}</p><time dateTime={row.createdAt}>{time(row.createdAt)}</time>
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
