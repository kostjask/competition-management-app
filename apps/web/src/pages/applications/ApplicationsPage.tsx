import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Studio, Event } from "@dance/schemas";
import { getMyStudios } from "../../api/studios";
import { getEvents } from "../../api/events";
import { toUiError, type UiError } from "../../api/error";
import { Button, EmptyState, ErrorSummary } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import { useAuth } from "../../auth/useAuth";
import { statusKey } from "./policy";
import "./application.css";

export default function ApplicationsPage() {
  const { t } = useTranslation(); const { user } = useAuth();
  const [value, setValue] = useState<{ studios: Studio[]; events: Event[] } | null>(null);
  const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; void Promise.all([getMyStudios(), getEvents()]).then(([studios, events]) => { if (active) setValue({ studios: studios.filter(studio => studio.representatives.some(rep => rep.active && rep.userId === user?.id)), events }); }).catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; }; }, [user?.id, attempt]);
  return <div className="event-workbench"><header className="event-masthead"><h1>{t("Application.title")}</h1><Link to="/events">{t("Shell.events")}</Link></header>
    <ErrorSummary error={error} title={t("Events.loadError")} />
    {error ? <Button onClick={() => { setError(null); setAttempt(value => value + 1); }}>{t("Shell.retry")}</Button> : !value ? <div className="application-skeleton" role="status">{t("Access.loading")}</div> : !value.studios.length ? <EmptyState title={t("Application.none")} description={t("Application.emptyHelp")} action={<Link to="/events">{t("Shell.events")}</Link>} /> :
      <ul className="application-queue">{value.studios.map(studio => <li key={studio.id}><h2>{studio.name}</h2><p>{value.events.find(event => event.id === studio.eventId)?.name}</p>
        <p>{t("Application.organization")}: {t(statusKey[studio.approvalStatus])}</p>{studio.registrations.filter(row => row.eventId === studio.eventId).map(row => <p key={row.id}>{t("Application.event")}: {t(statusKey[row.status])}</p>)}
        <Link to={`/events/${encodeURIComponent(studio.eventId)}/studio?studio=${encodeURIComponent(studio.id)}`}>{t("Application.open")}: {studio.name}</Link>
      </li>)}</ul>}
  </div>;
}
