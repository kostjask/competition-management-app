import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Event } from "@dance/schemas";
import { getEvents } from "../../api/events";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { RoleGate } from "../../auth";
import { Button, EmptyState, ErrorSummary, LoadingState } from "../../components/ui/Foundation";
import { EventContent } from "./EventContent";
import { eventDate, stageKey } from "../../features/events/setup";
import "./event-setup.css";
export default function EventsList() {
  const { t, locale } = useTranslation(); const [events, setEvents] = useState<Event[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; void getEvents().then(result => { if (active) setEvents(result); }).catch((err: unknown) => { if (active) setError(toUiError(err)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [attempt]);
  return (
    <div className="event-workbench">
      <header className="event-masthead">
        <div>
          <h1>{t("Events.listTitle")}</h1>
          <p>{t("Setup.authenticated")}</p>
        </div>
        <div className="event-heading-actions">
          <RoleGate adminOnly>
            <Link className="ui-button ui-button-primary" to="/events/new">
              {t("Events.createTitle")}
            </Link>
          </RoleGate>
        </div>
      </header>
      <ErrorSummary error={error} title={t("Feedback.validation")} />
      {loading ? (
        <LoadingState label={t("Access.loading")} />
      ) : error ? (
        <Button onClick={() => { setLoading(true); setError(null); setAttempt(value => value + 1); }}>
          {t("Shell.retry")}
        </Button>
      ) : !events.length ? (
        <EmptyState title={t("Events.noEventsYet")} description={t("Setup.noEvents")} />
      ) : (
        <ul className="event-collection">
          {events.map(event => (
            <li className="event-row" key={event.id}>
              <div className="event-row-meta">
                <p>
                  <time dateTime={event.startsAt}>{eventDate(event.startsAt, locale, event.timeZone)}</time>
                  {", "}
                  <time dateTime={event.endsAt}>{eventDate(event.endsAt, locale, event.timeZone)}</time>
                </p>
                <p>{event.timeZone}</p>
              </div>
              <section className="event-row-main">
                <h2>{event.name}</h2>
                <p className="event-status">{t(stageKey[event.stage])}</p>
                <EventContent event={event} />
              </section>
              <div className="event-row-actions">
                <Link className="ui-button ui-button-secondary" to={`/events/${encodeURIComponent(event.id)}`}>
                  {t("Events.moreInfo")}: {event.name}
                </Link>
                <RoleGate adminOnly>
                  <Link to={`/admin/events/${encodeURIComponent(event.id)}/setup`}>
                    {t("Setup.title")}: {event.name}
                  </Link>
                </RoleGate>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
