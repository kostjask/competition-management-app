import { useState } from "react";
import { SaveApplicationEstimatesSchema, type ApplicationEstimateRevision, type Event, type StudioRegistration } from "@dance/schemas";
import { saveApplicationEstimates } from "../../api/studios";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { AccountField } from "../../auth/AccountField";
import { Alert, Button, ErrorSummary } from "../../components/ui/Foundation";
import { EstimateFields } from "./EstimateFields";
import { estimateFieldLinks, estimateInput } from "./estimates";
import "./estimates.css";

export function EstimatesEditor({ event, row, history, admin, disabled, editable, save }: {
  event: Event; row: StudioRegistration; history: ApplicationEstimateRevision[]; admin: boolean;
  disabled: boolean; editable: boolean; save: (execute: () => Promise<unknown>) => void;
}) {
  const { t, locale } = useTranslation(); const latest = history[0];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(latest?.counts.map(value => [value.date, String(value.count)]) ?? []));
  const [reason, setReason] = useState(""); const [error, setError] = useState<UiError | null>(null);
  const time = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: event.timeZone }).format(new Date(value));
  return <section className="application-section">
    <h3>{t("Application.estimates")}</h3><p>{t("Application.estimatesHelp")}</p><p>{event.timeZone}</p>
    {!latest && <Alert announce={false}>{t("Application.noEstimates")}</Alert>}
    {latest && latest.eventRevision !== event.revision && <Alert tone="warning" announce={false}>{t("Application.estimateDatesChanged")}</Alert>}
    {!editable && <Alert announce={false}>{t("Application.estimatesLocked")}</Alert>}
    <form noValidate onSubmit={submit => { submit.preventDefault(); const parsed = SaveApplicationEstimatesSchema.safeParse({ operationId: crypto.randomUUID(), revision: row.revision, eventRevision: event.revision, counts: estimateInput(event, values), ...(admin && { reason }) });
      if (!parsed.success) { setError(toUiError(parsed.error)); return; } setError(null); save(() => saveApplicationEstimates(event.id, row.studioId, parsed.data)); }}>
      <ErrorSummary error={error} title={t("Feedback.validation")} fields={{ ...estimateFieldLinks(event, "estimate"), reason: "estimate-reason" }} />
      <fieldset disabled={disabled || !editable}><EstimateFields event={event} values={values} onChange={setValues} error={error} prefix="estimate" />
        {admin && <AccountField id="estimate-reason" path="reason" label={t("Application.estimateReason")} value={reason} onChange={setReason} error={error} />}
        <Button type="submit" variant="secondary">{t("Application.saveEstimates")}</Button>
      </fieldset>
    </form>
    {history.length > 0 && <details className="application-section"><summary>{t("Application.estimateHistory")}</summary>
      <ol className="estimate-history">{history.map(value => <li key={value.revision}>
        <p>{t("Application.revision")}: {value.revision}; {time(value.createdAt)}</p>
        <p>{t(value.source === "ORGANIZER" ? "Application.estimateOrganizer" : "Application.estimateApplicant")}: {value.timeZone}</p>
        <dl className="estimate-ledger">{value.counts.map(count => <div key={count.date}><dt>{count.date}</dt><dd>{count.count}</dd></div>)}</dl>
        {value.reason && <p>{value.reason}</p>}
      </li>)}</ol>
    </details>}
  </section>;
}
