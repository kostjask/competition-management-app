import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { Event, StudioRegistration, OnboardingContextSchema } from "@dance/schemas";
import type { z } from "zod";
import { getEvent } from "../../api/events";
import { getStudios } from "../../api/studios";
import { readOnboarding } from "../../api/onboarding";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { useAuth } from "../../auth/useAuth";
import { Button, Alert, ErrorSummary } from "../../components/ui/Foundation";
import { ApplicationDetail } from "./ApplicationDetail";
import { ApplyForm } from "./ApplyForm";
import { applicationOpen } from "./policy";
import { eventDate } from "../../features/events/setup";
import "./application.css";

function EventApplication({ id }: { id: string }) {
  const { t, locale } = useTranslation(); const { user } = useAuth(); const [params, setParams] = useSearchParams();
  const [value, setValue] = useState<{ event: Event; rows: StudioRegistration[]; onboarding: z.infer<typeof OnboardingContextSchema> } | null>(null);
  const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0); const [created, setCreated] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { let active = true; void Promise.all([getEvent(id), getStudios(id), readOnboarding({})]).then(([event, rows, onboarding]) => { if (active) setValue({ event, rows, onboarding }); }).catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; }; }, [id, attempt]);
  const changed = useCallback(() => { void getStudios(id).then(rows => setValue(value => value ? { ...value, rows } : null)).catch(() => { /* Detail owns readback recovery. */ }); }, [id]);
  const selected = params.get("studio");
  const row = value?.rows.find(row => row.studioId === selected) ?? (!selected ? value?.rows[0] : undefined);
  const draft = value?.onboarding.draft?.status === "DRAFT" ? value.onboarding.draft : null;
  const wrongDraft = draft?.intendedEventId && draft.intendedEventId !== id ? draft.intendedEventId : null;
  return <div className="event-workbench"><Link to="/applications">{t("Application.title")}</Link><header className="event-masthead"><div><h1>{value?.event.name ?? t("Application.apply")}</h1></div><Link to={`/events/${encodeURIComponent(id)}`}>{t("Staff.eventDetails")}</Link></header>
    <ErrorSummary error={error} title={t("Events.loadError")} />{error && <Button onClick={() => { setError(null); setAttempt(value => value + 1); }}>{t("Shell.retry")}</Button>}
    {!value && !error && <div className="application-skeleton" role="status">{t("Access.loading")}</div>}
    {created && <Alert tone="success">{t("Application.saved")}</Alert>}
    {value && !error && <>
      <dl className="setup-grid"><div><dt>{t("Setup.timeZone")}</dt><dd>{value.event.timeZone}</dd></div><div><dt>{t("Setup.cutoff")}</dt><dd>{value.event.registrationDeadline ? eventDate(value.event.registrationDeadline, locale, value.event.timeZone) : t("Setup.noCutoff")}</dd></div></dl>
      {value.rows.length > 1 && <ul className="application-queue">{value.rows.map(value => <li key={value.id}><Link to={`?studio=${encodeURIComponent(value.studioId)}`} aria-current={value.id === row?.id || undefined}>{value.studio.name}</Link></li>)}</ul>}
      {selected && !row ? <Alert tone="danger">{t("Shell.notFound")}</Alert> : row ? <ApplicationDetail key={row.studioId} event={value.event} row={row} admin={false} onChanged={changed} /> : user?.isAdmin ? <Link to={`/admin/events/${encodeURIComponent(id)}/applications`}>{t("Application.review")}</Link> : wrongDraft ? <Alert><p>{t("Application.otherDraft")}</p><Link to={`/events/${encodeURIComponent(wrongDraft)}/register`}>{t("Application.open")}</Link></Alert> : <>
        {!applicationOpen(value.event, now) && <Alert>{t("Setup.windowClosed")}</Alert>}
        <ApplyForm eventId={id} draft={draft} disabled={!applicationOpen(value.event, now)} onCreated={row => { setValue({ ...value, rows: [...value.rows, row] }); setParams({ studio: row.studioId }, { replace: true }); setCreated(true); }} />
      </>}
    </>}
  </div>;
}
export default function EventApplicationPage() { const { id = "" } = useParams(); const { user } = useAuth(); return <EventApplication key={`${user?.id}-${id}`} id={id} />; }
