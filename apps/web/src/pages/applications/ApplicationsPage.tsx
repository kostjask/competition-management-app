import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Event, Studio } from "@dance/schemas";
import { getMyStudios } from "../../api/studios";
import { getEvents } from "../../api/events";
import { readOnboarding } from "../../api/onboarding";
import { toUiError, type UiError } from "../../api/error";
import { useAuth } from "../../auth/useAuth";
import { useTranslation } from "../../i18n/useTranslation";
import { Button, ErrorSummary, LoadingState } from "../../components/ui/Foundation";
import { ApprovalRows } from "./shared";
import { applyUrl, ownedStudios, studioUrl } from "./applicationModel";

export default function ApplicationsPage() {
  const { user } = useAuth(); const { t } = useTranslation();
  const [data, setData] = useState<{ studios: Studio[]; events: Event[]; draftEvent: string | null } | null>(null);
  const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.all([getMyStudios(), getEvents(), readOnboarding({})]).then(([studios, events, context]) => {
      if (active) { setData({ studios: ownedStudios(studios, user?.id ?? ""), events, draftEvent: context.draft?.status === "DRAFT" ? context.draft.intendedEventId : null }); setError(null); }
    }).catch((e: unknown) => { if (active) setError(toUiError(e)); });
    return () => { active = false; };
  }, [attempt, user?.id]);
  return <section className="application"><h1>{t("Application.title")}</h1>
    <p>{t("Application.intro")}</p>
    <ErrorSummary error={error} title={t("Application.title")} />
    <div className="ui-actions"><Link to="/events">{t("Shell.events")}</Link><Link to="/auth/onboarding">{t("Flow.onboarding")}</Link><Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>{t("Application.refresh")}</Button></div>
    {!data && !error && <LoadingState label={t("Access.loading")} />}
    {data && !error && <>
      {data.draftEvent && <p><Link to={applyUrl(data.draftEvent)}>{t("Application.draft")}</Link></p>}
      {data.studios.length === 0 && <p>{t("Application.empty")}</p>}
      <ul className="application-list">{data.studios.map(studio => <li key={studio.id}>
        <h2><Link to={studioUrl(studio.id)}>{studio.name}</Link></h2>
        <p>{data.events.find(event => event.id === studio.eventId)?.name}</p>
        {studio.registrations.filter(reg => reg.eventId === studio.eventId).map(reg => <ApprovalRows key={reg.id} organization={studio.approvalStatus} status={reg.status} />)}
        <Link to={studioUrl(studio.id)}>{t("Application.status")}</Link>
      </li>)}</ul>
    </>}
  </section>;
}
