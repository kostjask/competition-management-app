import { useEffect, useState } from "react";
import type { PerformanceRevision } from "@dance/schemas";
import { getPerformanceHistory } from "../../api/performances";
import { toUiError, type UiError } from "../../api/error";
import { Button, EmptyState, ErrorSummary } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";

export default function PerformanceHistory({ eventId, performanceId, close }: { eventId: string; performanceId: string; close: () => void }) {
  const { t, locale } = useTranslation();
  const [rows, setRows] = useState<PerformanceRevision[] | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void getPerformanceHistory(eventId, performanceId).then(value => { if (active) setRows(value); })
      .catch((error: unknown) => { if (active) setError(toUiError(error)); });
    return () => { active = false; };
  }, [eventId, performanceId, attempt]);
  const number = new Intl.NumberFormat(locale);
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  return <section id="performance-history" className="performance-history" aria-labelledby="performance-history-title">
    <div className="performance-history-heading"><h2 id="performance-history-title">{t("Performance.history")}</h2>
      <Button variant="quiet" onClick={close}>{t("Performance.closeHistory")}</Button></div>
    <p>{t("Performance.historyHelp")}</p>
    {error ? <><ErrorSummary error={error} title={t("Performance.historyError")} /><Button onClick={() => { setError(null); setRows(null); setAttempt(value => value + 1); }}>{t("Shell.retry")}</Button></>
      : rows === null ? <div className="performance-skeleton performance-history-skeleton" role="status"><p>{t("Access.loading")}</p>
        <div aria-hidden="true"><span className="performance-history-skeleton-title" /><span className="performance-history-skeleton-provenance" />
          <div className="performance-history-skeleton-facts">{[0, 1, 2, 3, 4].map(fact => <div key={fact}><span /><span /></div>)}</div>
        </div></div>
        : rows.length === 0 ? <EmptyState title={t("Performance.noHistory")} description={t("Performance.noHistoryHelp")} />
          : <ol className="performance-revisions">{rows.map(row => <li key={row.revision}>
            <h3>{t("Performance.revision")} {number.format(row.revision)}: {row.snapshot.title}</h3>
            <p>{t(row.origin === "LEGACY_BASELINE" ? "Performance.baseline" : row.origin === "CREATE" ? "Performance.created" : row.origin === "ARCHIVE" ? "Performance.archived" : "Performance.edited")}</p>
            <dl><div><dt>{t("Performance.owner")}</dt><dd>{row.snapshot.studioName}</dd></div>
              <div><dt>{t("Performance.configuration")}</dt><dd>{row.snapshot.configuration.category.name}, {row.snapshot.configuration.ageGroup.name}, {row.snapshot.configuration.format.name}</dd></div>
              <div><dt>{t("Performance.participants")}</dt><dd>{number.format(row.snapshot.participants.length)}</dd></div>
              <div><dt>{t("Performance.ageDate")}</dt><dd><time dateTime={row.snapshot.ageDate}>{date(row.snapshot.ageDate)}</time> ({row.snapshot.timeZone})</dd></div>
              <div><dt>{t("Performance.captured")}</dt><dd><time dateTime={row.capturedAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: row.snapshot.timeZone }).format(new Date(row.capturedAt))}</time></dd></div>
            </dl>
          </li>)}</ol>}
  </section>;
}
