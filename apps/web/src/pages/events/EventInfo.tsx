import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Event } from "@dance/schemas";
import { getEvent } from "../../api/events";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { useRole } from "../../auth/useRole";
import { OrganizerEvent } from "../../components/layouts/OrganizerEventLayout";
import { Button, ErrorSummary, LoadingState } from "../../components/ui/Foundation";
import { discoveryTime, eventDateRange, eventLocality } from "../../features/events/discovery";
import { stageKey } from "../../features/events/setup";
import { EventContent } from "./EventContent";
import { PrivateEventImage } from "./EventImage";
import "./event-discovery.css";

const organizerActions = {
  PRE_REGISTRATION: { path: "setup", label: "Setup.title" },
  REGISTRATION_OPEN: { path: "applications", label: "Application.review" },
  DATA_REVIEW: { path: "applications", label: "Application.review" },
  SCHEDULED: { path: "schedule", label: "Schedule.title" },
  LIVE: { path: "live", label: "Events.sectionLive" },
  FINALIZED: { path: "results", label: "Results.title" },
  ENDED: { path: "results", label: "Results.title" },
  CANCELLED: { path: "setup", label: "Setup.title" },
} as const satisfies Record<Event["stage"], { path: string; label: string }>;

export default function EventInfo() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { t, locale } = useTranslation();
  const { isAdmin } = useRole();
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
  const organizerAction = isAdmin && data ? organizerActions[data.stage] : null;

  const content = (
    <div className="event-discovery">
      <Link className="discovery-back" to="/events">{t("Events.backToList")}</Link>
      {loading ? (
        <LoadingState label={t("Access.loading")} />
      ) : error ? (
        <section>
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
          <div className="discovery-overview">
            <header className="discovery-event-heading">
              <h1>{data.name}</h1>
              <p className="discovery-date">{eventDateRange(data, locale)}</p>
              {data.venue && <p>{data.venue}</p>}
              {(data.city || data.country) && <p>{eventLocality(data, locale)}</p>}
            </header>
            <div className="discovery-application">
              {organizerAction && <p className="discovery-window">{t(stageKey[data.stage])}</p>}
              <p className="discovery-window" aria-live="polite">{t(open ? "Setup.windowOpen" : "Setup.windowClosed")}</p>
              {data.registrationDeadline && (
                <p>
                  {t("Setup.cutoff")}{": "}
                  <time dateTime={data.registrationDeadline}>{discoveryTime(data.registrationDeadline, locale, data.timeZone)}</time>
                </p>
              )}
              <div className="discovery-application-actions">
                {organizerAction && <Link className="ui-button ui-button-primary" to={`/admin/events/${encodeURIComponent(data.id)}/${organizerAction.path}`}>
                  {t(organizerAction.label)}
                </Link>}
                <Link className={`ui-button ${organizerAction ? "ui-button-quiet" : open ? "ui-button-primary" : "ui-button-secondary"}`} to={`/events/${encodeURIComponent(data.id)}/register`}>
                  {t(open ? "Application.open" : "Application.view")}
                </Link>
              </div>
            </div>
          </div>
          <div className={`discovery-information${data.imageUrl ? " discovery-information--with-image" : ""}`}>
            <div className="discovery-particulars">
              {(data.description || data.unclassifiedDescription) && <EventContent event={data} />}
              <details>
                <summary>{t("Events.eventTimes")}</summary>
                <dl>
                  <dt>{t("Events.startsAtLabel")}</dt>
                  <dd><time dateTime={data.startsAt}>{discoveryTime(data.startsAt, locale, data.timeZone)}</time></dd>
                  <dt>{t("Events.endsAtLabel")}</dt>
                  <dd><time dateTime={data.endsAt}>{discoveryTime(data.endsAt, locale, data.timeZone)}</time></dd>
                </dl>
              </details>
              {(data.organizerEmail || data.organizerPhone) && (
                <details>
                  <summary>{t("Events.organizerContact")}</summary>
                  {data.organizerEmail && <p><a href={`mailto:${data.organizerEmail}`}>{data.organizerEmail}</a></p>}
                  {data.organizerPhone && <p><a href={`tel:${data.organizerPhone}`}>{data.organizerPhone}</a></p>}
                </details>
              )}
            </div>
            {data.imageUrl && (
              <div className="discovery-image">
                <PrivateEventImage key={data.imageUrl} url={data.imageUrl} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
  return isAdmin && data && data.id === id && !error && !loading
    ? <OrganizerEvent key={id} eventId={data.id}>{content}</OrganizerEvent>
    : content;
}
