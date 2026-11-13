import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Event } from "@dance/schemas";
import { getEvent } from "../../api/events";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { RoleGate } from "../../auth";
import { Button, ErrorSummary, LoadingState } from "../../components/ui/Foundation";
import { EventSnapshot } from "./EventSnapshot";
import { PrivateEventImage } from "./EventImage";
import "./event-setup.css";

export default function EventInfo() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Event | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (id) {
      void getEvent(id)
        .then(result => { if (active) setData(result); })
        .catch((err: unknown) => { if (active) setError(toUiError(err)); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [id, attempt]);

  const open = data && ["PRE_REGISTRATION", "REGISTRATION_OPEN"].includes(data.stage) && (!data.registrationDeadline || now < Date.parse(data.registrationDeadline));

  return (
    <div className="event-workbench">
      <Link to="/events">{t("Events.backToList")}</Link>
      {loading ? (
        <LoadingState label={t("Access.loading")} />
      ) : error ? (
        <section className="event-load-error">
          <h1>{t(error.reason === "recordNotFound" ? "Shell.notFound" : error.reason === "permissionDenied" ? "Access.denied" : "Shell.unavailable")}</h1>
          <ErrorSummary error={error} title={t("Events.loadError")} />
          <Button onClick={() => {
            setLoading(true);
            setError(null);
            setAttempt(value => value + 1);
          }}>{t("Shell.retry")}</Button>
        </section>
      ) : data && (
        <>
          <header className="event-masthead">
            <div>
              <h1>{data.name}</h1>
              <p className="ui-help">{t("Setup.authenticated")}</p>
              <p className="event-status">{t(open ? "Setup.windowOpen" : "Setup.windowClosed")}</p>
              <Link to={`/events/${encodeURIComponent(data.id)}/register`}>{t("Application.open")}</Link>
            </div>
            <RoleGate adminOnly>
              <div className="event-heading-actions">
                <Link className="ui-button ui-button-primary" to={`/admin/events/${encodeURIComponent(data.id)}/setup`}>
                  {t("Setup.title")}
                </Link>
                <Link to={`/admin/events/${encodeURIComponent(data.id)}/staff`}>{t("Staff.title")}</Link>
                <Link to={`/admin/events/${encodeURIComponent(data.id)}/applications`}>{t("Application.review")}</Link>
                <Link to={`/admin/events/${encodeURIComponent(data.id)}/performances`}>{t("Performance.title")}</Link>
              </div>
            </RoleGate>
          </header>
          <div className={`event-detail-layout${data.imageUrl ? " event-detail-layout--with-media" : ""}`}>
            <div className="event-detail-data">
              <EventSnapshot event={data} allLanguages={false} />
            </div>
            {data.imageUrl && (
              <section className="event-detail-media">
                <h2>{t("Common.eventPhoto")}</h2>
                <PrivateEventImage key={data.imageUrl} url={data.imageUrl} />
              </section>
            )}
          </div>
          {!data.imageUrl && (
            <section className="event-detail-media event-detail-media--empty">
              <h2>{t("Common.eventPhoto")}</h2>
              <PrivateEventImage key={data.imageUrl} url={data.imageUrl} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
