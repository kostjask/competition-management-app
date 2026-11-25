import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Event } from "@dance/schemas";
import { getEvents } from "../../api/events";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { RoleGate } from "../../auth";
import { Button, EmptyState, ErrorSummary, LoadingState } from "../../components/ui/Foundation";
import { eventDateRange, eventLocality } from "../../features/events/discovery";
import "./event-discovery.css";
export default function EventsList() {
  const { t, locale } = useTranslation(); const [events, setEvents] = useState<Event[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; void getEvents().then(result => { if (active) setEvents(result); }).catch((err: unknown) => { if (active) setError(toUiError(err)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [attempt]);
  return (
    <div className="event-discovery">
      <header className="discovery-heading">
        <h1>{t("Events.listTitle")}</h1>
        <RoleGate adminOnly>
          <Link className="ui-button ui-button-primary" to="/events/new">
            {t("Events.createTitle")}
          </Link>
        </RoleGate>
      </header>
      <ErrorSummary error={error} title={t("Events.loadError")} />
      {loading ? (
        <LoadingState label={t("Access.loading")} />
      ) : error ? (
        <Button onClick={() => { setLoading(true); setError(null); setAttempt(value => value + 1); }}>
          {t("Shell.retry")}
        </Button>
      ) : !events.length ? (
        <EmptyState title={t("Events.noEventsYet")} description={t("Events.emptyDiscovery")} />
      ) : (
        <ul className="discovery-list">
          {events.map(event => (
            <li className="discovery-list-item" key={event.id}>
              <div className="discovery-list-event">
                <h2>{event.name}</h2>
                <p className="discovery-date">{eventDateRange(event, locale)}</p>
                {event.venue && <p>{event.venue}</p>}
                {(event.city || event.country) && <p>{eventLocality(event, locale)}</p>}
              </div>
              <div className="discovery-list-actions">
                <Link className="ui-button ui-button-secondary" to={`/events/${encodeURIComponent(event.id)}`} aria-label={`${t("Events.moreInfo")}: ${event.name}`}>
                  {t("Events.moreInfo")}
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
