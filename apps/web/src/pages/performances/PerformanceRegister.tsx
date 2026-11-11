import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { eventAgeDate, performanceMissingFields, type Event, type Performance, type StudioRegistration } from "@dance/schemas";
import { getEvent } from "../../api/events";
import { getPerformances } from "../../api/performances";
import { getStudios } from "../../api/studios";
import { toUiError, type UiError } from "../../api/error";
import { Button, EmptyState, ErrorSummary, Field } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import "./performance-register.css";
import PerformanceHistory from "./PerformanceHistory";
import PerformanceDraftForm from "./PerformanceDraftForm";
const historyRegionId = "performance-history";

function Register({ eventId, studioId, clear }: { eventId: string; studioId: string; clear: () => void }) {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<{ event: Event; rows: Performance[]; studios: StudioRegistration[]; studioId: string } | null>(null);
  const [error, setError] = useState<{ eventId: string; studioId: string; error: UiError } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.all([getEvent(eventId), getPerformances(eventId, studioId || undefined), getStudios(eventId)])
      .then(([event, rows, studios]) => { if (active) { setData({ event, rows, studios, studioId }); setError(null); } })
      .catch((err: unknown) => { if (active) setError({ eventId, studioId, error: toUiError(err) }); });
    return () => { active = false; };
  }, [eventId, studioId, attempt]);
  const [params, setParams] = useSearchParams();
  const selected = params.get("performance") ?? "";
  const value = data?.event.id === eventId && data.studioId === studioId ? data : null;
  const issue = error?.eventId === eventId && error.studioId === studioId ? error.error : null;
  const studios = data?.event.id === eventId ? data.studios : [];
  return <>
    <header className="event-masthead"><div><h1>{t("Performance.title")}</h1><p>{value?.event.name}</p></div>
      <Link to={`/events/${encodeURIComponent(eventId)}`}>{t("Staff.eventDetails")}</Link>
    </header>
    <p>{t("Performance.help")}</p>
    {value && <p className="performance-date-policy">{t("Performance.agePolicy")} <time dateTime={eventAgeDate(value.event.startsAt, value.event.timeZone)}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: value.event.timeZone }).format(new Date(value.event.startsAt))}</time> ({value.event.timeZone}). {t("Performance.leapPolicy")}</p>}
    <div className="performance-filter">
      <Field id="performance-studio" label={t("Performance.filter")}>{attrs => <select {...attrs} className="ui-input" value={studioId}
        onChange={event => setParams(params => { const next = new URLSearchParams(params); next.delete("performance"); if (event.target.value) next.set("studio", event.target.value); else next.delete("studio"); return next; })}>
        <option value="">{t("Performance.all")}</option>
        {studioId && !studios.some(row => row.studioId === studioId) && <option value={studioId}>{t("Performance.unavailable")}</option>}
        {studios.map(row => <option key={row.id} value={row.studioId}>{row.studio.name}</option>)}
      </select>}</Field>
      {studioId && <Button variant="quiet" onClick={clear}>{t("Performance.clear")}</Button>}
    </div>
    {issue ? <section><ErrorSummary error={issue} title={t("Events.loadError")} /><Button onClick={() => { setError(null); setData(null); setAttempt(value => value + 1); }}>{t("Shell.retry")}</Button></section>
      : !value ? <div className="performance-skeleton" role="status"><p>{t("Access.loading")}</p>
        <div aria-hidden="true">{[0, 1, 2].map(row => <div className="performance-skeleton-row" key={row}><span /><span /><span /></div>)}</div>
      </div>
        : !value.rows.length ? <EmptyState title={t(studioId ? "Performance.noMatch" : "Performance.none")} description={t("Performance.empty")} />
          : <table className="performance-register">
            <caption className="sr-only">{t("Performance.title")}</caption>
            <thead><tr><th scope="col">{t("Performance.performance")}</th><th scope="col">{t("Performance.owner")}</th><th scope="col">{t("Performance.participants")}</th></tr></thead>
            <tbody>{value.rows.map(row => <tr key={row.id}>
              <th scope="row">{row.title ?? t("Performance.untitled")}<span className="performance-completeness">{performanceMissingFields(row).length
                ? <>{t("Performance.missing")} {performanceMissingFields(row).map(field => t(`Performance.missing_${field}`)).join(", ")}</>
                : t("Performance.fieldsPresent")}</span>
                <span className="performance-completeness">{t(row.orderOnStage === null ? "Performance.unscheduled" : "Performance.scheduled")}</span>
                <span className="performance-row-action"><Button id={`history-${row.id}`} variant="quiet" aria-expanded={selected === row.id} aria-controls={selected === row.id ? historyRegionId : undefined}
                onClick={() => setParams(params => { const next = new URLSearchParams(params); next.set("performance", row.id); return next; })}>{t("Performance.history")} {new Intl.NumberFormat(locale).format(row.revision)}</Button></span></th>
              <td data-label={t("Performance.owner")}><Link to={`/admin/events/${encodeURIComponent(eventId)}/applications?studio=${encodeURIComponent(row.studioId)}`}>
                {value.studios.find(studio => studio.id === row.registrationId && studio.studioId === row.studioId)?.studio.name ?? t("Performance.unavailable")}
              </Link></td>
              <td data-label={t("Performance.participants")}>{new Intl.NumberFormat(locale).format(row.participants.length)}</td>
            </tr>)}</tbody>
          </table>}
    <PerformanceDraftForm key={eventId} eventId={eventId} studios={studios} ready={!!value && !issue} saved={row => {
      setData(current => current && current.event.id === eventId ? { ...current,
        rows: !current.studioId || row.studioId === current.studioId ? [row, ...current.rows.filter(existing => existing.id !== row.id)] : current.rows,
      } : current);
    }} />
    {selected && value && !issue && <PerformanceHistory key={`${eventId}:${studioId}:${selected}`} eventId={eventId} performanceId={selected}
      close={() => { setParams(params => { const next = new URLSearchParams(params); next.delete("performance"); return next; });
        document.getElementById(`history-${selected}`)?.focus(); }} />}
  </>;
}

export default function PerformanceRegister() {
  const { eventId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const studioId = params.get("studio") ?? "";
  return <div className="event-workbench"><Register eventId={eventId} studioId={studioId}
    clear={() => setParams(params => { const next = new URLSearchParams(params); next.delete("studio"); return next; })} /></div>;
}
