import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { NewStudioRegistrationBodySchema, resolveAuthoredContent, type Event, type Studio } from "@dance/schemas";
import { getEvent } from "../../api/events";
import { createStudio, getMyStudios } from "../../api/studios";
import { readOnboarding } from "../../api/onboarding";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { useAuth } from "../../auth/useAuth";
import { useTranslation } from "../../i18n/useTranslation";
import { Alert, Button, ErrorSummary, LoadingState } from "../../components/ui/Foundation";
import { ApplicationFields } from "./ApplicationForm";
import { applicationFields, type ApplicationValues } from "./applicationFields";
import { EventContext } from "./shared";
import { applicationOpen, applyUrl, ownedStudios, studioUrl } from "./applicationModel";
import { useUnsavedWork } from "./useUnsavedWork";

type Context = Awaited<ReturnType<typeof readOnboarding>>;
type Payload = Parameters<typeof createStudio>[1];
export default function ApplyRoute() {
  const { id } = useParams(); const { user } = useAuth();
  return <ApplyPage key={`${user?.id}/${id}`} />;
}
function ApplyPage() {
  const { id = "" } = useParams(); const { user } = useAuth(); const { t, locale } = useTranslation(); const navigate = useNavigate();
  const [data, setData] = useState<{ event: Event; studios: Studio[]; context: Context } | null>(null);
  const [values, setValues] = useState<ApplicationValues>({ name: "", country: "", city: "", directorName: "", directorPhone: "", representativeName: user?.name ?? "", representativeEmail: user?.email ?? "" });
  const [error, setError] = useState<UiError | null>(null); const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false); const [attempt, setAttempt] = useState(0);
  const [operationId] = useState(() => crypto.randomUUID()); const [uncertain, setUncertain] = useState<Payload | null>(null);
  useUnsavedWork(dirty || uncertain !== null);
  useEffect(() => {
    let active = true;
    void Promise.all([getEvent(id), getMyStudios(), readOnboarding({})]).then(([event, studios, context]) => {
      if (!active) return;
      setData({ event, studios: ownedStudios(studios, user?.id ?? "").filter(studio => studio.eventId === id), context }); setError(null);
      const draft = context.draft;
      if (draft?.status === "DRAFT" && (draft.intendedEventId === null || draft.intendedEventId === id)) {
        setValues(previous => ({ ...previous, name: draft.details.studioName, country: draft.details.country, city: draft.details.city, directorName: draft.details.directorName, directorPhone: draft.details.directorPhone }));
      }
    }).catch((e: unknown) => { if (active) setError(toUiError(e)); });
    return () => { active = false; };
  }, [id, user?.id, attempt]);
  const submit = async (retry?: Payload) => {
    if (busy || !data) return;
    const draft = data.context.draft;
    const payload = retry ?? {
      operationId, name: values.name, representativeName: values.representativeName, representativeEmail: values.representativeEmail,
      ...Object.fromEntries((["country", "city", "directorName", "directorPhone"] as const).filter(key => values[key].trim()).map(key => [key, values[key]])),
      ...(draft?.status === "DRAFT" && (draft.intendedEventId === null || draft.intendedEventId === id) && { onboarding: { draftId: draft.id, revision: draft.revision } }),
    };
    const parsed = NewStudioRegistrationBodySchema.safeParse(payload);
    if (!parsed.success) { setError(toUiError(parsed.error)); return; }
    setBusy(true); setError(null); setUncertain(parsed.data);
    try {
      const result = await createStudio(id, parsed.data);
      setDirty(false); setUncertain(null); navigate(studioUrl(result.studioId), { replace: true });
    } catch (e) {
      setError(toUiError(e));
      if (e instanceof ApiError && e.statusCode >= 400 && e.statusCode < 500 && e.reason !== "concurrentChange") setUncertain(null);
    } finally { setBusy(false); }
  };
  const content = data?.event.authoredDescription ? resolveAuthoredContent(data.event.authoredDescription, locale) : null;
  const reconcile = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const [event, studios, context] = await Promise.all([getEvent(id), getMyStudios(), readOnboarding({})]);
      setData({ event, studios: ownedStudios(studios, user?.id ?? "").filter(studio => studio.eventId === id), context });
      // A definite conflict plus owned reads permits a corrected attempt. Keep the
      // operationId: any previously committed attempt still cannot create a duplicate.
      if (error?.reason === "concurrentChange") setUncertain(null);
      setError(null);
    } catch (e) { setError(toUiError(e)); }
    finally { setBusy(false); }
  };
  return <section className="application application-editor"><Link to="/applications">{t("Application.title")}</Link><h1>{t("Application.apply")}</h1>
    <ErrorSummary error={error} title={t("Feedback.validation")} fields={Object.fromEntries(applicationFields.map(key => [key, "apply-" + key]))} />
    {!data && !error && <LoadingState label={t("Access.loading")} />}
    {!data && error && <Button onClick={() => setAttempt(value => value + 1)}>{t("Shell.retry")}</Button>}
    {data && error && <Button variant="secondary" disabled={busy} onClick={() => void reconcile()}>{t("Application.refresh")}</Button>}
    {data && <><EventContext event={data.event} />
      {content && <>{content.fallback && <p>{t("Registration.contentFallback")}</p>}<p lang={content.lang}>{content.text}</p></>}
      {data.studios.length > 0 ? <ul>{data.studios.map(studio => <li key={studio.id}><Link to={studioUrl(studio.id)}>{studio.name}: {t("Application.status")}</Link></li>)}</ul>
        : user?.isAdmin ? <><p>{t("Application.admin")}</p><Link to={`/admin/events/${encodeURIComponent(id)}/applications`}>{t("Organizer.review")}</Link></>
        : <>
          {!applicationOpen(data.event) && <Alert tone="warning">{t("Application.closed")}</Alert>}
          {data.context.draft?.status === "DRAFT" && data.context.draft.intendedEventId && data.context.draft.intendedEventId !== id && <p>{t("Application.draftOther")} <Link to={applyUrl(data.context.draft.intendedEventId)}>{t("Application.draft")}</Link></p>}
          <p>{t("Application.intro")}</p><p>{t("Application.optional")}</p>
          {uncertain && <Alert tone="warning">{t("Application.uncertain")} {t("Application.retryHelp")}</Alert>}
          <form noValidate onSubmit={event => { event.preventDefault(); void submit(uncertain ?? undefined); }}>
            <fieldset disabled={busy || uncertain !== null}>
              <ApplicationFields prefix="apply-" value={values} onChange={value => { setValues(value); setDirty(true); }} error={error} />
              <h2>{t("Application.contact")}</h2><ApplicationFields prefix="apply-" contact value={values} onChange={value => { setValues(value); setDirty(true); }} error={error} />
              <p>{t("Application.identity")}</p>
            </fieldset>
            <Button type="submit" pending={busy} disabled={!uncertain && !applicationOpen(data.event)}>{t(uncertain ? "Application.retryCreate" : "Application.apply")}</Button>
          </form>
        </>}
    </>}
  </section>;
}
