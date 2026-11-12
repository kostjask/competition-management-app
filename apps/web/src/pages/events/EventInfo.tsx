import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { resolveAuthoredContent, type Event } from "@dance/schemas";
import { getEvent } from "../../api/events";
import { toUiError, type UiError } from "../../api/error";
import { RoleGate } from "../../auth";
import { useTranslation } from "../../i18n/useTranslation";
import { Button, ErrorSummary, LoadingState } from "../../components/ui/Foundation";
import { useStageBadges } from "../../features/events/hooks/useStageBadges";
import { EventImage } from "./EventImage";
import { EventContext } from "../applications/shared";
import { EventApplicationAction } from "../applications/EventApplicationAction";
import { useOwnedApplications } from "../applications/useOwnedApplications";

export default function EventInfo() {
  const { id = "" } = useParams(); const { t, locale } = useTranslation();
  const [event, setEvent] = useState<Event | null>(null); const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  const applications = useOwnedApplications(); const stages = useStageBadges(locale);
  useEffect(() => {
    let active = true;
    void getEvent(id).then(value => { if (active) { setEvent(value); setError(null); } }).catch((e: unknown) => { if (active) setError(toUiError(e)); });
    return () => { active = false; };
  }, [id, attempt]);
  const content = event?.authoredDescription ? resolveAuthoredContent(event.authoredDescription, locale) : null;
  return <section className="application"><Link to="/events">{t("Events.backToList")}</Link>
    {error ? <><h1>{t(error.reason === "recordNotFound" ? "Shell.notFound" : error.reason === "permissionDenied" ? "Access.denied" : "Shell.unavailable")}</h1><ErrorSummary error={error} title={t("Shell.unavailable")} /><Button onClick={() => setAttempt(value => value + 1)}>{t("Shell.retry")}</Button></> : !event ? <LoadingState label={t("Events.loading")} /> : <>
      <h1>{event.name}</h1><p>{stages[event.stage].label}</p>
      <div className="ui-actions"><EventApplicationAction event={event} {...applications} /></div>
      <div className="application-grid"><div><EventImage id={event.id} url={event.imageUrl} /></div><div>
        {content ? <>{content.fallback && <p>{t("Registration.contentFallback")}</p>}<p lang={content.lang}>{content.text}</p></> : <p>{event.description}</p>}
        <EventContext event={event} />
        <p>{t("Events.endsAt")}: <time dateTime={event.endsAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: event.timeZone }).format(new Date(event.endsAt))}</time></p>
        <dl><dt>{t("Events.venue")}</dt><dd>{event.venue}</dd><dt>{t("Common.city")}</dt><dd>{event.city}</dd><dt>{t("Common.country")}</dt><dd>{event.country}</dd></dl>
      </div></div>
      <details><summary>{t("Events.details")}</summary><dl><dt>{t("Common.eventId")}</dt><dd>{event.id}</dd><dt>{t("Events.createdAt")}</dt><dd><time dateTime={event.createdAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: event.timeZone }).format(new Date(event.createdAt))}</time></dd></dl></details>
      <RoleGate adminOnly><div className="ui-actions"><Link className="ui-button ui-button-secondary" to={`/events/${encodeURIComponent(event.id)}/edit`}>{t("Events.editButton")}</Link><Link className="ui-button ui-button-secondary" to={`/admin/events/${encodeURIComponent(event.id)}/staff`}>{t("Staff.title")}</Link><Link className="ui-button ui-button-secondary" to={`/admin/events/${encodeURIComponent(event.id)}/applications`}>{t("Organizer.review")}</Link></div></RoleGate>
    </>}
  </section>;
}
