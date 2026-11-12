import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { resolveAuthoredContent, type Event } from "@dance/schemas";
import { getEvents } from "../../api/events";
import { toUiError, type UiError } from "../../api/error";
import { RoleGate } from "../../auth";
import { useTranslation } from "../../i18n/useTranslation";
import { Button, ErrorSummary, LoadingState } from "../../components/ui/Foundation";
import { useStageBadges } from "../../features/events/hooks/useStageBadges";
import { EventApplicationAction } from "../applications/EventApplicationAction";
import { useOwnedApplications } from "../applications/useOwnedApplications";

export default function EventsList() {
  const { t, locale } = useTranslation(); const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  const applications = useOwnedApplications(); const stages = useStageBadges(locale);
  useEffect(() => {
    let active = true;
    void getEvents().then(value => { if (active) { setEvents(value); setError(null); } }).catch((e: unknown) => { if (active) setError(toUiError(e)); });
    return () => { active = false; };
  }, [attempt]);
  const [now] = useState(() => Date.now());
  const groups = [
    { label: t("Events.current"), items: events?.filter(event => Date.parse(event.startsAt) <= now && Date.parse(event.endsAt) >= now) },
    { label: t("Events.upcoming"), items: events?.filter(event => Date.parse(event.startsAt) > now) },
    { label: t("Events.past"), items: events?.filter(event => Date.parse(event.endsAt) < now) },
  ];
  return <section className="application"><h1>{t("Events.listTitle")}</h1><p>{t("Events.listSubtitle")}</p>
    <div className="ui-actions"><Link to="/applications">{t("Application.title")}</Link><RoleGate adminOnly><Link className="ui-button ui-button-primary" to="/events/new">{t("Events.createButton")}</Link></RoleGate></div>
    <ErrorSummary error={error} title={t("Shell.unavailable")} />
    {error && <Button onClick={() => setAttempt(value => value + 1)}>{t("Shell.retry")}</Button>}
    {!events && !error && <LoadingState label={t("Events.loading")} />}
    {events?.length === 0 && !error && <><h2>{t("Events.noEventsYet")}</h2><RoleGate adminOnly><p>{t("Events.createFirstEvent")}</p></RoleGate></>}
    {!error && groups.map(group => group.items && group.items.length > 0 && <section key={group.label}><h2>{group.label}</h2><ul className="application-list">{group.items.map(event => {
      const content = event.authoredDescription ? resolveAuthoredContent(event.authoredDescription, locale) : null;
      return <li key={event.id}><h3><Link to={`/events/${encodeURIComponent(event.id)}`}>{event.name}</Link></h3><p>{stages[event.stage].label}</p>
        <p><time dateTime={event.startsAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: event.timeZone }).format(new Date(event.startsAt))}</time> ({event.timeZone})</p>
        <p>{t("Events.endsAt")}: <time dateTime={event.endsAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: event.timeZone }).format(new Date(event.endsAt))}</time></p>
        {content ? <>{content.fallback && <p>{t("Registration.contentFallback")}</p>}<p lang={content.lang}>{content.text}</p></> : <p>{event.description}</p>}
        <div className="ui-actions"><Link className="ui-button ui-button-secondary" to={`/events/${encodeURIComponent(event.id)}`}>{t("Events.moreInfo")}</Link><EventApplicationAction event={event} {...applications} /><RoleGate adminOnly><Link to={`/events/${encodeURIComponent(event.id)}/edit`}>{t("Events.editButton")}</Link></RoleGate></div>
      </li>;
    })}</ul></section>)}
  </section>;
}
