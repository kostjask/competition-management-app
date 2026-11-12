import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { UpdateStudioBodySchema, UpdateRepresentativeBodySchema, type Event, type Studio, type StudioRegistration } from "@dance/schemas";
import { getEvent } from "../../api/events";
import { getStudio, getMyStudios, getStudios, updateStudio, updateStudioRepresentative, cancelStudioRegistration, createStudio } from "../../api/studios";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { useAuth } from "../../auth/useAuth";
import { useRole } from "../../auth/useRole";
import { useTranslation } from "../../i18n/useTranslation";
import { Alert, Button, ErrorSummary, LoadingState } from "../../components/ui/Foundation";
import { ApplicationFields } from "./ApplicationForm";
import { applicationFields, type ApplicationValues } from "./applicationFields";
import { ApprovalRows, EventContext } from "./shared";
import { applicationOpen, ownedStudios, studioUrl } from "./applicationModel";
import { useUnsavedWork } from "./useUnsavedWork";

type Snapshot = { studio: Studio; event: Event; registration: StudioRegistration };
async function readStudio(studioId: string): Promise<Snapshot> {
  const studio = await getStudio(studioId);
  const [event, registrations] = await Promise.all([getEvent(studio.eventId), getStudios(studio.eventId)]);
  const registration = registrations.find(item => item.studioId === studio.id && item.eventId === event.id);
  if (!registration) throw new ApiError(404, "Missing application", undefined, "NOT_FOUND", "recordNotFound");
  return { studio, event, registration };
}
export default function StudioRoute() {
  const { studioId, id } = useParams(); const { user } = useAuth();
  return <StudioPage key={`${user?.id}/${studioId}/${id}`} />;
}
function StudioPage() {
  const { studioId, id } = useParams(); const { user, refreshUser } = useAuth(); const [params] = useSearchParams(); const { t } = useTranslation();
  const [data, setData] = useState<Snapshot | null>(null); const [choices, setChoices] = useState<Studio[] | null>(null);
  const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false); const [stale, setStale] = useState(false); const [saved, setSaved] = useState(false); const [editorKey, setEditorKey] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (attempt > 0) await refreshUser();
      if (studioId) return readStudio(studioId);
      const studios = ownedStudios(await getMyStudios(), user?.id ?? "").filter(studio => studio.eventId === id);
      const selected = params.get("studio");
      if (selected) {
        if (!studios.some(studio => studio.id === selected)) throw new ApiError(404, "Unavailable studio selection", undefined, "NOT_FOUND", "recordNotFound");
        return readStudio(selected);
      }
      if (studios.length === 1) return readStudio(studios[0].id);
      if (active) setChoices(studios);
      return null;
    };
    void load().then(result => { if (active) { setData(result); setError(null); setStale(false); } }).catch((e: unknown) => { if (active) { setError(toUiError(e)); setStale(true); } });
    return () => { active = false; };
  }, [studioId, id, params, user?.id, attempt, refreshUser]);
  const mutate = async (action: () => Promise<unknown>) => {
    if (!data || busy || stale) return null;
    setBusy(true); setError(null); setSaved(false);
    try { await action(); const [result] = await Promise.all([readStudio(data.studio.id), refreshUser()]); setData(result); setSaved(true); return result; }
    catch (e) { setError(toUiError(e)); setStale(true); return null; }
    finally { setBusy(false); }
  };
  const next = data?.registration.nextActor;
  return <section className="application"><Link to="/applications">{t("Application.title")}</Link><h1>{t("Application.status")}</h1>
    <ErrorSummary error={error} title={t("Application.status")} />
    {stale && <Alert tone="warning">{t("Application.uncertain")}</Alert>}
    {saved && <Alert tone="success">{t("Application.saved")}</Alert>}
    <Button variant="secondary" disabled={busy} onClick={() => { setSaved(false); setAttempt(value => value + 1); }}>{t("Application.refresh")}</Button>
    {!data && choices === null && !error && <LoadingState label={t("Access.loading")} />}
    {choices && !data && !error && <>{choices.length === 0 ? <p>{t("Application.empty")}</p> : <ul>{choices.map(studio => <li key={studio.id}><Link to={studioUrl(studio.id)}>{studio.name}</Link></li>)}</ul>}<Link to="/events">{t("Shell.events")}</Link></>}
    {data && <>
      <h2>{data.studio.name}</h2>
      <div className="application-grid"><div>
        <ApprovalRows organization={data.studio.approvalStatus} status={data.registration.status} />
        <p>{t(next === "ORGANIZER" ? "Registration.organizerNext" : next === "APPLICANT" ? "Registration.applicantNext" : "Registration.locked")}</p>
        {data.registration.decisionReason && <p>{t(({ CONTACT_ORGANIZER: "Registration.contactOrganizer", INCOMPLETE_DETAILS: "Registration.incompleteDetails", INELIGIBLE: "Registration.ineligible", CAPACITY: "Registration.capacity" } as const)[data.registration.decisionReason])}</p>}
        {data.studio.approvalStatus === "APPROVED" && data.registration.status === "APPROVED" && <p>{t("Application.approvedHelp")}</p>}
        <EventContext event={data.event} />
        {!applicationOpen(data.event) && <p>{t("Application.closed")}</p>}
        {data.registration.status === "PENDING" && ["PRE_REGISTRATION", "REGISTRATION_OPEN", "DATA_REVIEW"].includes(data.event.stage) && <Button variant="danger" disabled={busy || stale} onClick={() => {
          if (window.confirm(t("Application.cancelConfirm"))) void mutate(() => cancelStudioRegistration(data.event.id, data.studio.id, data.registration.revision)).then(result => { if (result) setEditorKey(value => value + 1); });
        }}>{t("Application.cancel")}</Button>}
        {["CANCELLED", "REJECTED"].includes(data.registration.status) && applicationOpen(data.event) && <Button disabled={busy || stale} onClick={() => void mutate(() => createStudio(data.event.id, { studioId: data.studio.id, revision: data.registration.revision }))}>{t("Application.reapply")}</Button>}
      </div><StudioEditor key={editorKey} data={data} busy={busy} stale={stale} mutate={mutate} /></div>
    </>}
    {data && error && <p>{t("Application.compare")}</p>}
  </section>;
}

function StudioEditor({ data, busy, stale, mutate }: { data: Snapshot; busy: boolean; stale: boolean; mutate: (action: () => Promise<unknown>) => Promise<Snapshot | null> }) {
  const { user } = useAuth(); const { hasPermission, isAdmin } = useRole(); const { t } = useTranslation();
  const member = data.studio.representatives.find(rep => rep.active && rep.userId === user?.id);
  const [baseRevision, setBaseRevision] = useState(data.registration.revision);
  const initial = (): ApplicationValues => ({ name: data.studio.name, country: data.studio.country ?? "", city: data.studio.city ?? "", directorName: data.studio.directorName ?? "", directorPhone: data.studio.directorPhone ?? "", representativeName: member?.name ?? "", representativeEmail: member?.email ?? "" });
  const [values, setValues] = useState(initial); const [profileDirty, setProfileDirty] = useState(false); const [contactDirty, setContactDirty] = useState(false); const [error, setError] = useState<UiError | null>(null);
  const dirty = profileDirty || contactDirty;
  if (baseRevision !== data.registration.revision && !dirty) {
    setBaseRevision(data.registration.revision); setValues(initial());
  }
  useUnsavedWork(dirty);
  const conflict = baseRevision !== data.registration.revision;
  const canManage = isAdmin || (!!member && hasPermission("studio.manage", data.event.id) && ["PRE_REGISTRATION", "REGISTRATION_OPEN"].includes(data.event.stage));
  const canCorrect = !!member && data.registration.status === "PENDING" && applicationOpen(data.event);
  const change = (value: ApplicationValues) => { setValues(value); setProfileDirty(true); setError(null); };
  const changeContact = (value: ApplicationValues) => { setValues(value); setContactDirty(true); setError(null); };
  return <div className="application-editor">
    <ErrorSummary error={error} title={t("Feedback.validation")} fields={Object.fromEntries(applicationFields.map(key => [key, "profile-" + key]))} />
    {conflict && <Alert tone="warning">{t("Application.compare")}<Button variant="secondary" onClick={() => {
      if (!dirty || window.confirm(t("Flow.reloadConfirm"))) { setValues(initial()); setBaseRevision(data.registration.revision); setProfileDirty(false); setContactDirty(false); setError(null); }
    }}>{t("Application.reload")}</Button></Alert>}
    <form noValidate onSubmit={event => {
      event.preventDefault();
      const parsed = UpdateStudioBodySchema.safeParse({ revision: baseRevision, name: values.name, country: values.country.trim() || null, city: values.city.trim() || null, directorName: values.directorName.trim() || null, directorPhone: values.directorPhone.trim() || null });
      if (!parsed.success) { setError(toUiError(parsed.error)); return; }
      void mutate(() => updateStudio(data.studio.id, parsed.data)).then(result => { if (result) { setBaseRevision(result.registration.revision); setProfileDirty(false); } });
    }}><h2>{t("Application.profile")}</h2>
      {canCorrect && <p>{t("Application.correction")}</p>}
      {!canManage && !canCorrect && <p>{t("Application.readOnly")}</p>}
      <fieldset disabled={busy || stale || conflict || (!canManage && !canCorrect)}><ApplicationFields prefix="profile-" value={values} onChange={change} error={error} /><Button type="submit" pending={busy}>{t("Application.saveProfile")}</Button></fieldset>
    </form>
    {member && <form noValidate onSubmit={event => {
      event.preventDefault(); const parsed = UpdateRepresentativeBodySchema.safeParse({ revision: baseRevision, name: values.representativeName, email: values.representativeEmail });
      if (!parsed.success) { const invalid = toUiError(parsed.error); setError({ ...invalid, issues: invalid.issues.map(issue => ({ ...issue, path: [issue.path[0] === "email" ? "representativeEmail" : "representativeName"] })) }); return; }
      void mutate(() => updateStudioRepresentative(data.studio.id, member.id, parsed.data)).then(result => { if (result) { setBaseRevision(result.registration.revision); setContactDirty(false); } });
    }}><h2>{t("Application.contact")}</h2><p>{t("Application.identity")}</p>{!canManage && <p>{t("Application.readOnly")}</p>}
      <fieldset disabled={busy || stale || conflict || !canManage}><ApplicationFields prefix="profile-" contact value={values} onChange={changeContact} error={error} /><Button type="submit" pending={busy}>{t("Application.saveContact")}</Button></fieldset>
    </form>}
  </div>;
}
