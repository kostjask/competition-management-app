import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { type CreateEventInput } from "@dance/schemas";
import { getEvent, updateEvent, type Event } from "../../api/events";
import { toUiError, type UiError } from "../../api/error";
import { Alert, Button, ErrorSummary, LoadingState } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import { EventForm } from "./EventForm";
import "./Organizer.css";
import { EventImage } from "./EventImage";
export default function EventEditRoute() {
  const { id, eventId } = useParams();
  return <EventEdit key={id ?? eventId} />;
}
function EventEdit() {
  const { t } = useTranslation();
  const { id, eventId } = useParams();
  const selectedId = id ?? eventId;
  const navigate = useNavigate();
  const [data, setData] = useState<Event | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [compared, setCompared] = useState(false);
  const [saved, setSaved] = useState(false);
  const load = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const result = await getEvent(selectedId);
      setData(result);
      setError(null);
      setStale(false);
    } catch (e) {
      setError(toUiError(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let active = true;
    if (selectedId) {
      getEvent(selectedId)
        .then((result) => {
          if (active) setData(result);
        })
        .catch((e) => {
          if (active) setError(toUiError(e));
        });
    }
    return () => {
      active = false;
    };
  }, [selectedId]);
  const submit = async (values: CreateEventInput) => {
    if (!data || !selectedId) return;
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const result = await updateEvent(selectedId, {
        ...values,
        expectedStage: data.stage,
        expectedRevision: data.revision,
      });
      setData(result);
      setSaved(true);
    } catch (e) {
      setError(toUiError(e));
      setStale(true);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="organizer">
        <nav className="ui-actions">
          <Link to="/admin">{t("Organizer.title")}</Link>
          {selectedId && (
            <>
              <Link to={`/events/${encodeURIComponent(selectedId)}`}>{t("Organizer.details")}</Link>
              <Link to={`/admin/events/${encodeURIComponent(selectedId)}/applications`}>
                {t("Organizer.review")}
              </Link>
            </>
          )}
        </nav>
        {!data && !error && <LoadingState label={t("Events.loading")} />}
        <ErrorSummary title={t("Organizer.setup")} error={data ? null : error} />
        {data && (
          <>
            <h2>{data.name}</h2>
            <section aria-label={t("Organizer.checklist")}>
              <h2>{t("Organizer.checklist")}</h2>
              <ul>
                {[
                  [
                    "event-name",
                    t("Organizer.details"),
                    !!(data.name && data.venue && data.city && data.country),
                  ],
                  ["event-timeZone", t("Organizer.registration"), !!data.timeZone],
                  [
                    "event-organizerEmail",
                    t("Organizer.contact"),
                    !!(data.organizerEmail || data.organizerPhone),
                  ],
                  ["event-sourceLocale", t("Organizer.description"), !!data.authoredDescription],
                ].map(([target, label, complete]) => (
                  <li key={String(target)}>
                    <a href={`#${target}`}>{label}</a>:{" "}
                    {t(complete ? "Organizer.ready" : "Organizer.optional")}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
        {data && <EventImage id={data.id} url={data.imageUrl} editable onSaved={load} />}
        {saved && <Alert tone="success">{t("Organizer.ready")}</Alert>}
        {stale && <Alert tone="warning">{t("Organizer.stale")}</Alert>}
        {(stale || (!data && error)) && (
          <Button
            pending={busy}
            onClick={() => {
              setCompared(true);
              void load();
            }}
          >
            {t("Organizer.refresh")}
          </Button>
        )}
        {compared && data && (
          <details open>
            <summary>{t("Organizer.serverState")}</summary>
            <p>{t("Organizer.compare")}</p>
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>
          </details>
        )}
      </div>
      {data && (
        <EventForm
          key={data.id}
          title={t("Organizer.setup")}
          initialValues={data}
          currentStage={data.stage}
          submitLabel={t("Events.saveChanges")}
          submitError={error}
          isSubmitting={busy}
          blocked={stale}
          onSubmit={submit}
          onCancel={() => navigate("/admin")}
        />
      )}
    </>
  );
}
