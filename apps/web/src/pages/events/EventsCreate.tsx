import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CreateEventInput } from "@dance/schemas";
import { createEvent } from "../../api/events";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { useAuth } from "../../auth/useAuth";
import { Alert, Button } from "../../components/ui/Foundation";
import { EventForm } from "./EventForm";
export default function EventsCreate() {
  const { t } = useTranslation(); const { sessionExpired } = useAuth(); const navigate = useNavigate();
  const [busy, setBusy] = useState(false); const [error, setError] = useState<UiError | null>(null); const [pending, setPending] = useState<CreateEventInput | null>(null);
  const operationId = useRef(crypto.randomUUID()); const locked = useRef(false);
  const initialValues = useMemo<CreateEventInput>(() => {
    const start = new Date(); start.setUTCMinutes(0, 0, 0);
    return { name: "", startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 7200000).toISOString() };
  }, []);
  const save = async (values: CreateEventInput) => {
    if (locked.current || sessionExpired) return;
    locked.current = true; setBusy(true); setError(null);
    const body = { ...values, operationId: operationId.current };
    try { const event = await createEvent(body); navigate(`/admin/events/${encodeURIComponent(event.id)}/setup`); }
    catch (err: unknown) { setError(toUiError(err)); if (!(err instanceof ApiError && err.statusCode === 400)) setPending(body); }
    finally { locked.current = false; setBusy(false); }
  };
  return <div className="event-workbench"><Link to="/admin">{t("Setup.dashboard")}</Link>
    {pending && <Alert tone="warning"><p>{t("Setup.reconcile")}</p><Button disabled={busy || sessionExpired} onClick={() => { void save(pending); }}>{t("Setup.retrySame")}</Button></Alert>}
    <EventForm title={t("Events.createTitle")} initialValues={initialValues} submitLabel={t("Events.createSubmit")} submitError={error} isSubmitting={busy} disabled={!!pending || sessionExpired} onSubmit={save} onCancel={() => navigate("/admin")} />
  </div>;
}
