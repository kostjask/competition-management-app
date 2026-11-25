import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { OrganizerEvent } from "../../components/layouts/OrganizerEventLayout";
import { eventSetupBlockers, eventStageTargets, type Event, type EventStage, type UpdateEventInput } from "@dance/schemas";
import { getEvent, updateEvent } from "../../api/events";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { useAuth } from "../../auth/useAuth";
import { Alert, Button, ErrorSummary, LoadingState, StatusBadge } from "../../components/ui/Foundation";
import { EventForm } from "./EventForm";
import { EventImageEditor } from "./EventImage";
import { EventSnapshot } from "./EventSnapshot";
import { eventInput, eventFieldIds, stageKey } from "../../features/events/setup";
import type { TranslationKey } from "../../i18n/translations";
function stageAction(from: EventStage, target: EventStage): TranslationKey {
  switch (target) {
    case "REGISTRATION_OPEN": return "Setup.open";
    case "DATA_REVIEW": return from === "SCHEDULED" ? "Schedule.returnReview" : "Setup.close";
    case "SCHEDULED": return "Schedule.confirmSchedule";
    case "LIVE": return "Schedule.startLive";
    case "ENDED": return "Schedule.endEvent";
    default: return "Setup.cancelEvent";
  }
}
function StageConfirmation({ event, target, busy, onCancel, onConfirm }: { event: Event; target: EventStage; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation(); const dialog = useRef<HTMLDialogElement>(null); const cancel = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => { const element = dialog.current; element?.showModal(); cancel.current?.focus(); return () => element?.close(); }, []);
  const variant = target === "CANCELLED" ? "danger" : "primary";
  const effect = target === "SCHEDULED" ? "Schedule.scheduleEffect" : target === "LIVE" ? "Moderator.liveEffect" :
    event.stage === "SCHEDULED" && target === "DATA_REVIEW" ? "Schedule.reviewEffect" : "Setup.stageEffect";
  return <dialog ref={dialog} className="setup-dialog" aria-labelledby="stage-confirm-title" aria-describedby="stage-confirm-effect" onCancel={value => { value.preventDefault(); if (!busy) onCancel(); }} onKeyDown={value => {
    if (value.key !== "Tab") return;
    const buttons = value.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
    const first = buttons[0]; const last = buttons[buttons.length - 1];
    if (!first) value.preventDefault();
    else if (value.shiftKey && document.activeElement === first) { value.preventDefault(); last?.focus(); }
    else if (!value.shiftKey && document.activeElement === last) { value.preventDefault(); first.focus(); }
  }}>
    <h2 id="stage-confirm-title">{t("Setup.confirm")}</h2><p>{event.name}</p><p>{t(stageKey[event.stage])} → {t(stageKey[target])}</p><p id="stage-confirm-effect">{t(effect)}</p>
    <div className="ui-actions"><button ref={cancel} type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={onCancel}>{t("Common.cancel")}</button><Button variant={variant} pending={busy} onClick={onConfirm}>{t("Setup.confirm")}</Button></div>
  </dialog>;
}
function EventSetup({ id }: { id: string }) {
  const { t } = useTranslation(); const { sessionExpired } = useAuth(); const navigate = useNavigate();
  const [data, setData] = useState<Event | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiError | null>(null); const [notice, setNotice] = useState<"saved" | "stageSaved" | null>(null);
  const [dirty, setDirty] = useState(false); const [formVersion, setFormVersion] = useState(0);
  const [pending, setPending] = useState<UpdateEventInput | null>(null); const [server, setServer] = useState<Event | null>(null);
  const [target, setTarget] = useState<EventStage | null>(null); const trigger = useRef<HTMLElement | null>(null); const locked = useRef(false);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  // Restore only after React has closed the modal and committed the new stage.
  // A frame scheduled by the request can run while the destination is still inert.
  useLayoutEffect(() => {
    if (target !== null || busy || !restoreFocus.current) return;
    restoreFocus.current.focus(); restoreFocus.current = null;
  }, [target, busy]);
  const load = useCallback(async (compare = false) => {
    if (locked.current) return; locked.current = true; setLoading(true); setError(null);
    try { const result = await getEvent(id); if (compare) setServer(result); else setData(result); }
    catch (err: unknown) { setError(toUiError(err)); }
    finally { locked.current = false; setLoading(false); }
  }, [id]);
  useEffect(() => { let active = true; void getEvent(id).then(result => { if (active) setData(result); }).catch((err: unknown) => { if (active) setError(toUiError(err)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);
  const run = async (body: UpdateEventInput) => {
    if (locked.current || sessionExpired) return;
    locked.current = true; setBusy(true); setError(null); setNotice(null); setServer(null);
    try { const result = await updateEvent(id, body); setData(result); setPending(null); setDirty(false); setNotice(body.stage ? "stageSaved" : "saved"); }
    catch (err: unknown) { setError(toUiError(err)); if (!(err instanceof ApiError && err.statusCode === 400)) setPending(body); }
    finally { locked.current = false; if (body.stage) restoreFocus.current = stageHeading.current; setBusy(false); setTarget(null); }
  };
  const disabled = busy || loading || !!pending || sessionExpired;
  const blockers = data ? eventSetupBlockers(data) : [];
  const stageTargets = data ? eventStageTargets(data.stage).filter(stage => stage !== data.stage && stage !== "FINALIZED") : [];
  const reviewStage = (stage: EventStage, button: HTMLButtonElement) => {
    trigger.current = button;
    setTarget(stage);
  };
  const blockerLabel = (field: typeof blockers[number]) => t(field === "venue" ? "Events.venue" : field === "city" ? "Common.city" : field === "country" ? "Common.country" : field === "description" ? "Setup.sourceLocale" : "Setup.organizerEmail");
  return <div className="event-workbench setup-workbench">
    <Link to="/admin">{t("Setup.dashboard")}</Link>
    {!data && <>{!loading && <h1>{t("Setup.title")}</h1>}<ErrorSummary error={error} title={t("Events.loadError")} />{!loading && <Button onClick={() => { void load(); }}>{t("Shell.retry")}</Button>}</>}
    {loading && <LoadingState label={t("Access.loading")} />}
    {notice && <Alert tone="success">{t(notice === "saved" ? "Setup.saved" : "Setup.stageSaved")}</Alert>}
    {pending && <Alert tone="warning"><p>{t("Setup.reconcile")}</p><div className="ui-actions"><Button disabled={busy || loading || sessionExpired} onClick={() => { void run(pending); }}>{t("Setup.retrySame")}</Button><Button variant="secondary" disabled={busy || loading || sessionExpired} onClick={() => { void load(true); }}>{t("Setup.compare")}</Button></div></Alert>}
    {server && <section aria-label={t("Setup.serverCopy")}><h2>{t("Setup.serverCopy")}</h2><EventSnapshot event={server} /><div className="ui-actions">
      <Button variant="secondary" disabled={busy || sessionExpired} onClick={() => { setData(server); setServer(null); setPending(null); setError(null); setDirty(false); setFormVersion(value => value + 1); }}>{t("Setup.useServer")}</Button>
      <Button variant="secondary" disabled={busy || sessionExpired} onClick={() => { setData(server); setServer(null); setPending(null); setError(null); setDirty(true); }}>{t("Setup.keepMine")}</Button>
    </div></section>}
    {data && <>
      <header className="event-masthead">
        <div><h1>{t("Setup.title") + ": " + data.name}</h1><p>{t("Setup.hint")}</p></div>
        <StatusBadge>{t(stageKey[data.stage])}</StatusBadge>
      </header>
      <div className="event-setup-layout">
        <div className="setup-editor">
          <EventForm key={formVersion} title="" initialValues={eventInput(data)} unclassifiedDescription={data.unclassifiedDescription}
            submitLabel={t("Events.saveChanges")} submitError={error} isSubmitting={busy} disabled={disabled} onDirty={() => { setDirty(true); setNotice(null); }}
            onSubmit={values => run({ ...values, expectedRevision: data.revision })} onCancel={() => navigate(`/events/${encodeURIComponent(id)}`)} />
          <EventImageEditor eventId={id} imageUrl={data.imageUrl} disabled={disabled} onSaved={latest => {
            const previousFields = { ...data, imageUrl: null, revision: 0 };
            const latestFields = { ...latest, imageUrl: null, revision: 0 };
            if (JSON.stringify(previousFields) === JSON.stringify(latestFields)) setData(latest);
            else setServer(latest);
          }} />
        </div>
        <aside className="setup-rail">
          <section aria-labelledby="setup-checklist-title"><h2 id="setup-checklist-title">{t("Setup.checklist")}</h2>
            <p>{t(blockers.length ? "Setup.incomplete" : "Setup.ready")}</p>
            {blockers.length > 0 && <ul className="setup-checklist">{blockers.map(field => <li key={field}><a href={"#" + eventFieldIds[field]} onClick={event => { event.preventDefault(); document.getElementById(eventFieldIds[field] ?? "")?.focus(); }}>{blockerLabel(field)}</a></li>)}</ul>}
            <p className="ui-help">{t("Setup.optionalHelp")}</p>
          </section>
          <section>
            <h2 ref={stageHeading} id="event-stage-heading" tabIndex={-1}>{t("Setup.lifecycle")}</h2>
            <p>{t(stageKey[data.stage])}</p>
            {["PRE_REGISTRATION", "REGISTRATION_OPEN", "DATA_REVIEW"].includes(data.stage) && <p>{t("Setup.preHelp")}</p>}
            {dirty && <p>{t("Setup.saveFirst")}</p>}
            <div className="ui-actions">
              {stageTargets.filter(stage => stage !== "CANCELLED").map(stage => <Button key={stage} variant="tonal"
                disabled={disabled || dirty || (stage === "REGISTRATION_OPEN" && blockers.length > 0)}
                onClick={event => reviewStage(stage, event.currentTarget)}>{t(stageAction(data.stage, stage))}</Button>)}
            </div>
            {data.stage === "LIVE" && <p>{t("Moderator.finalizationPending")}</p>}
            {stageTargets.includes("CANCELLED") && <details className="setup-danger-actions">
              <summary>{t("Setup.eventActions")}</summary>
              <Button variant="quiet" disabled={disabled || dirty} onClick={event => reviewStage("CANCELLED", event.currentTarget)}>{t("Setup.cancelEvent")}</Button>
            </details>}
          </section>
        </aside>
      </div>
      {target && <StageConfirmation event={data} target={target} busy={busy} onCancel={() => { restoreFocus.current = trigger.current; setTarget(null); }} onConfirm={() => { void run({ stage: target, expectedStage: data.stage, expectedRevision: data.revision }); }} />}
    </>}
  </div>;
}
export default function EventEdit() {
  const { id, eventId } = useParams<{ id: string; eventId: string }>(); const selected = id ?? eventId;
  if (!selected) return null;
  const editor = <EventSetup key={selected} id={selected} />;
  return id ? <OrganizerEvent key={id} eventId={id}>{editor}</OrganizerEvent> : editor;
}
