import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { eventSetupBlockers, type Event } from "@dance/schemas";
import { getEvents } from "../../api/events";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { Button, EmptyState, ErrorSummary, LoadingState } from "../../components/ui/Foundation";
import { stageKey } from "../../features/events/setup";
import "../events/event-setup.css";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getEvents()
      .then(result => { if (active) setEvents(result); })
      .catch((err: unknown) => { if (active) setError(toUiError(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const ordered = [...events].sort((a, b) => Number(eventSetupBlockers(b).length > 0) - Number(eventSetupBlockers(a).length > 0));

  return (
    <div className="event-workbench">
      <header className="event-masthead">
        <div>
          <h1>{t("Setup.dashboard")}</h1>
          <p>{t("Setup.hint")}</p>
        </div>
        <div className="event-heading-actions">
          <Link className="ui-button ui-button-primary" to="/events/new">
            {t("Events.createTitle")}
          </Link>
        </div>
      </header>

      <ErrorSummary error={error} title={t("Events.loadError")} />
      {loading ? (
        <LoadingState label={t("Access.loading")} />
      ) : error ? (
        <Button variant="secondary" onClick={() => {
          setLoading(true);
          setError(null);
          setAttempt(value => value + 1);
        }}>
          {t("Shell.retry")}
        </Button>
      ) : !events.length ? (
        <EmptyState title={t("Events.noEventsYet")} description={t("Setup.noEvents")} />
      ) : (
        <ul className="event-collection">
          {ordered.map(event => (
            <li className="event-row" key={event.id}>
              <div className="event-row-main">
                <h2>{event.name}</h2>
                <p>{t(stageKey[event.stage])}</p>
              </div>
              <div className="event-row-meta">
                <p className="event-status">
                  {t(eventSetupBlockers(event).length ? "Setup.incomplete" : "Setup.ready")}
                </p>
              </div>
              <div className="event-row-actions">
                <Link to={`/admin/events/${encodeURIComponent(event.id)}/setup`}>
                  {t("Setup.title")}: {event.name}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
