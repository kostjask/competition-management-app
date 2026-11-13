import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { Event, StudioRegistration } from "@dance/schemas";
import { getEvent } from "../../api/events";
import { getStudios } from "../../api/studios";
import { toUiError, type UiError } from "../../api/error";
import { Button, EmptyState, ErrorSummary, Field } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import { ApplicationDetail } from "./ApplicationDetail";
import { statusKey } from "./policy";
import "./application.css";

export default function ReviewPage() {
  const { eventId = "" } = useParams(); const { t } = useTranslation(); const [params, setParams] = useSearchParams();
  const [value, setValue] = useState<{ event: Event; rows: StudioRegistration[] } | null>(null); const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; void Promise.all([getEvent(eventId), getStudios(eventId)]).then(([event, rows]) => { if (active) setValue({ event, rows }); }).catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; }; }, [eventId, attempt]);
  const changed = useCallback(() => { void getStudios(eventId).then(rows => setValue(value => value ? { ...value, rows } : null)).catch(() => { /* Detail owns readback recovery. */ }); }, [eventId]);
  const axis = params.get("axis") === "EVENT" ? "EVENT" : "ORGANIZATION"; const filter = params.get("status") ?? "PENDING";
  const rows = value?.rows.filter(row => filter === "ALL" || (axis === "ORGANIZATION" ? row.studio.approvalStatus : row.status) === filter) ?? [];
  const selected = value?.rows.find(row => row.studioId === params.get("studio"));
  const change = (key: string, value: string) => { const next = new URLSearchParams(params); next.set(key, value); setParams(next); };
  return <div className="event-workbench"><Link to="/admin">{t("Setup.dashboard")}</Link><header className="event-masthead"><div><h1>{t("Application.review")}</h1><p>{value?.event.name}</p></div><Link to={`/events/${encodeURIComponent(eventId)}`}>{t("Staff.eventDetails")}</Link></header>
    <ErrorSummary error={error} title={t("Events.loadError")} />{error && <Button onClick={() => { setError(null); setAttempt(value => value + 1); }}>{t("Shell.retry")}</Button>}
    {!value && !error && <div className="application-skeleton" role="status">{t("Access.loading")}</div>}
    {value && !error && <><p>{t("Application.reviewHelp")}</p><div className="application-controls">
      <Field id="review-axis" label={t("Application.axis")}>{attrs => <select {...attrs} className="ui-input" value={axis} onChange={event => change("axis", event.target.value)}><option value="ORGANIZATION">{t("Application.organization")}</option><option value="EVENT">{t("Application.event")}</option></select>}</Field>
      <Field id="review-filter" label={t("Application.filter")}>{attrs => <select {...attrs} className="ui-input" value={filter} onChange={event => change("status", event.target.value)}><option value="ALL">{t("Application.all")}</option>{Object.entries(statusKey).map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}</select>}</Field>
    </div><div className="application-layout"><section aria-label={t("Application.review")}>
      {!rows.length ? <EmptyState title={t(value.rows.length ? "Application.noMatch" : "Application.none")} description={t(selected ? "Application.keepOpen" : "Application.reviewEmpty")} action={value.rows.length ? <Button variant="quiet" onClick={() => change("status", "ALL")}>{t("Application.showAll")}</Button> : undefined} /> : <ul className="application-queue">{rows.map(row => { const next = new URLSearchParams(params); next.set("studio", row.studioId); return <li key={row.id}><Link to={`?${next.toString()}`} aria-current={selected?.id === row.id || undefined}>{row.studio.name}</Link><p>{t("Application.organization")}: {t(statusKey[row.studio.approvalStatus])}</p><p>{t("Application.event")}: {t(statusKey[row.status])}</p></li>; })}</ul>}
    </section><section>{selected ? <ApplicationDetail key={`${eventId}-${selected.studioId}`} event={value.event} row={selected} admin onChanged={changed} /> : params.has("studio") ? <p>{t("Shell.notFound")}</p> : <p>{t("Application.reviewHelp")}</p>}</section></div></>}
  </div>;
}
