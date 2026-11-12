import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEvents, type Event } from "../../api/events";
import { toUiError, type UiError } from "../../api/error";
import { ErrorSummary, LoadingState, Button } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import "../events/Organizer.css";
export default function AdminDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<Event[] | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getEvents()
      .then((result) => {
        if (active) {
          setData(result);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) setError(toUiError(e));
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <section className="organizer">
      <h1>{t("Organizer.title")}</h1>
      <Link className="ui-button ui-button-primary" to="/events/new">
        {t("Events.createSubmit")}
      </Link>
      <ErrorSummary error={error} title={t("Organizer.title")} />
      {error && <Button onClick={() => setAttempt((a) => a + 1)}>{t("Shell.retry")}</Button>}
      {!data && !error && <LoadingState label={t("Events.loading")} />}
      {data?.length === 0 && <p>{t("Organizer.empty")}</p>}
      <ul className="organizer-list">
        {data?.map((event) => (
          <li key={event.id}>
            <h2>{event.name}</h2>
            <p>{event.timeZone}</p>
            <div className="ui-actions">
              <Link to={`/admin/events/${encodeURIComponent(event.id)}/setup`}>
                {t("Organizer.setup")}
              </Link>
              <Link to={`/admin/events/${encodeURIComponent(event.id)}/applications`}>
                {t("Organizer.review")}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
