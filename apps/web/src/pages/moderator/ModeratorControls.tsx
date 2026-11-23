import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { LiveScheduleAcknowledgement, LiveScheduleWorkspace } from "@dance/schemas";
import { commandSchedule, getLiveSchedule } from "../../api/schedule";
import { commandScoring } from "../../api/scoring";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { useAuth } from "../../auth/useAuth";
import { ErrorFeedback } from "../../components/ErrorFeedback";
import { Alert, Button, EmptyState, Field, LoadingState, StatusBadge } from "../../components/ui/Foundation";
import { stageKey } from "../../features/events/setup";
import { formatNumber } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { useUnsaved } from "../entries/useUnsaved";
import { LIVE_REQUEST_MS, useLiveConnection } from "../live/useLiveConnection";
import { canRun, exceptionActions, liveActions, matchesAcknowledgement, scheduleTarget, type ExceptionAction, type LiveOperation, type LiveSession } from "./liveOperations";
import "./moderator.css";

type Proposal = {
  action: ExceptionAction;
  workspace: LiveScheduleWorkspace;
  session: LiveSession;
};
const queueLabel = { PAUSED: "Schedule.PAUSED", RUNNING: "Schedule.RUNNING", FINISHED: "Schedule.FINISHED" } as const;

export default function ModeratorControls({ organizer = false }: { organizer?: boolean }) {
  const { eventId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [search, setSearch] = useSearchParams();
  const [focusSession, setFocusSession] = useState<string>();
  const sessionId = search.get("session") ?? undefined;

  if (eventId) return <LiveConsole key={JSON.stringify([eventId, user?.id, sessionId])} eventId={eventId} sessionId={sessionId} organizer={organizer}
    focusSelector={sessionId !== undefined && focusSession === sessionId} selectSession={(id, replace = false) => {
      if (!replace) setFocusSession(id);
      setSearch(id ? { session: id } : {}, { replace });
    }} />;
  const events = new Map((user?.roles ?? []).flatMap(assignment =>
    assignment.role.key === "moderator" && assignment.event ? [[assignment.event.id, assignment.event] as const] : []));
  return <div className="event-workbench moderator-workbench">
    <h1>{t("Moderator.title")}</h1>
    {events.size ? <ul className="moderator-event-list">{[...events.values()].map(event => <li key={event.id}>
      <Link className="ui-button ui-button-secondary" to={"events/" + encodeURIComponent(event.id) + "/live"}>{event.name}</Link>
    </li>)}</ul> : <EmptyState title={t("Moderator.noEvents")} description={t("Moderator.contact")} />}
  </div>;
}

function LiveConsole({ eventId, sessionId, organizer, focusSelector, selectSession }: {
  eventId: string; sessionId?: string; organizer: boolean; focusSelector: boolean; selectSession: (id?: string, replace?: boolean) => void;
}) {
  const { t, locale } = useTranslation();
  const { sessionExpired } = useAuth();
  const [pending, setPending] = useState<LiveOperation | null>(null);
  const [sending, setSending] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [writeError, setWriteError] = useState<UiError | null>(null);
  const [lastAck, setLastAck] = useState<LiveScheduleAcknowledgement | null>(null);
  const writing = useRef<AbortController | null>(null);
  const selector = useRef<HTMLSelectElement>(null);
  const exceptionTrigger = useRef<HTMLButtonElement>(null);
  const exceptionsHeading = useRef<HTMLHeadingElement>(null);
  const operationId = pending?.command.operationId;
  const reconcile = useCallback((workspace: LiveScheduleWorkspace) => {
    if (!workspace.organizer) setProposal(previous => previous?.action === "SKIP" ? previous : null);
    const receipt = workspace.acknowledgement;
    if (!pending || !receipt || !sessionId || !matchesAcknowledgement(pending, sessionId, receipt)) return;
    setPending(null);
    setWriteError(null);
    setLastAck(receipt);
  }, [pending, sessionId]);
  const read = useCallback(async (signal: AbortSignal) => {
    const result = await getLiveSchedule(eventId, { sessionId, operationId }, signal);
    if (organizer && !result.organizer) throw new ApiError(403, "Organizer access ended", undefined, "FORBIDDEN", "permissionDenied");
    return result;
  }, [eventId, sessionId, operationId, organizer]);
  const clearProtectedState = useCallback(() => {
    setPending(null);
    setProposal(null);
    setWriteError(null);
    setLastAck(null);
  }, []);
  const connection = useLiveConnection(eventId, sending || sessionExpired, read, reconcile, clearProtectedState);
  const { snapshot, failure, loading, online, connected, interrupted, fresh, invalidate, refresh } = connection;
  const workspace = snapshot?.workspace;
  const session = workspace?.session;

  useEffect(() => {
    if (sessionId === undefined && session) selectSession(session.id, true);
  }, [selectSession, session, sessionId]);
  const selectedId = session?.id;
  useEffect(() => {
    if (focusSelector && selectedId) selector.current?.focus();
  }, [focusSelector, selectedId]);
  useEffect(() => () => { writing.current?.abort(); }, []);
  useUnsaved(!!proposal || !!pending, true, t("Moderator.leave"));

  async function send(operation: LiveOperation) {
    if (!sessionId || !fresh() || writing.current || !canRun(workspace, operation)) return;
    const request = new AbortController();
    writing.current = request;
    invalidate();
    setPending(operation);
    setSending(true);
    setProposal(null);
    setWriteError(null);
    setLastAck(null);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(LIVE_REQUEST_MS)]);
    try {
      if (operation.kind === "schedule") await commandSchedule(eventId, operation.command, signal);
      else await commandScoring(eventId, operation.command, signal);
    } catch (error) {
      if (!request.signal.aborted) setWriteError(toUiError(error));
    } finally {
      if (writing.current === request) writing.current = null;
      if (!request.signal.aborted) setSending(false);
    }
  }

  const run = (action: "START" | "ADVANCE" | "PAUSE") => {
    if (!workspace || !session || pending || proposal) return;
    void send({ kind: "schedule", command: { action, operationId: crypto.randomUUID(), ...scheduleTarget(workspace, session) } });
  };

  const actions = workspace ? liveActions(workspace) : null;
  const disabled = !sessionId || !connected || !!pending || !!proposal;
  const nextAction = session?.state === "RUNNING" ? "ADVANCE" : "START";
  const startLabel = session?.current ? "Moderator.resume" : session?.hasQueue && !session.next ? "Moderator.finish" : "Moderator.START";
  const retryable = pending && connected && workspace?.acknowledgement === null && canRun(workspace, pending);
  const changed = pending && connected && (workspace?.acknowledgement !== null || !canRun(workspace, pending));
  const proposalChanged = !!proposal && (workspace?.revision !== proposal.workspace.revision ||
    workspace.session?.id !== proposal.session.id || workspace.eventStage !== proposal.workspace.eventStage);
  const showPrint = !!session && !sessionExpired && !failure?.denied;
  const showInterruption = interrupted && !sessionExpired;
  const interruptionHelp = showInterruption && <p>{t("Moderator.interruptionHelp")}</p>;
  const connectionStatus = t(!online ? "Moderator.offline" : connected ? "Moderator.connected" : "Moderator.stale");
  const time = (date: Date, zone = workspace?.timeZone) => new Intl.DateTimeFormat(locale, {
    dateStyle: "short", timeStyle: "medium", timeZone: zone,
  }).format(date);
  const revision = (value: number) => formatNumber(value, locale);
  const back = organizer ? "/admin/events/" + encodeURIComponent(eventId) + "/setup" : "/moderator";

  return <div className="event-workbench moderator-workbench">
    <header className="moderator-header">
      <Link className="moderator-link" to={back}>{t(organizer ? "Setup.title" : "Moderator.title")}</Link>
      <h1>{workspace?.eventName ?? t("Moderator.title")}</h1>
      {workspace && <p>{t(stageKey[workspace.eventStage])}</p>}
      {workspace && session && <div className="moderator-selector">
        <Field id="live-session" label={t("Moderator.session")}>{attributes => <select {...attributes} ref={selector} className="ui-input" value={session.id} disabled={!!pending || !!proposal}
          onChange={event => selectSession(event.target.value)}>
          {workspace.sessions.map(row => <option key={row.id} value={row.id}>{row.stageName + " / " + row.name}</option>)}
        </select>}</Field>
        <p className="ui-help">{t("Moderator.scheduledAt", { time: time(new Date(session.startsAt)), zone: workspace.timeZone })}</p>
      </div>}
    </header>

    {workspace && session && <>
      <div className="moderator-ledger" aria-live="polite">
        <section aria-labelledby="live-current"><h2 id="live-current">{t("Moderator.current")}</h2>
          <Performance slot={session.current} empty={t("Moderator.noCurrent")} />
          {session.current && <Completion completion={session.current.completion} />}
        </section>
        <section aria-labelledby="live-next"><h2 id="live-next">{t("Moderator.next")}</h2>
          <Performance slot={session.next} empty={t("Moderator.noNext")} />
        </section>
      </div>
      <div className="moderator-operating">
        <section className="moderator-command-area" aria-labelledby="live-actions"><h2 id="live-actions">{t("Moderator.controls")}</h2>
          <p><StatusBadge tone={session.state === "RUNNING" ? "info" : "neutral"}>{t(queueLabel[session.state])}</StatusBadge></p>
          {workspace.eventStage !== "LIVE" ? <p>{t("Moderator.notLive")}</p> : <>
            {!session.hasQueue && <p>{t("Moderator.emptyQueue")}</p>}
            {session.hasQueue && !workspace.scoringReady && <p>{t("Moderator.notReady")}</p>}
            <div className="moderator-actions">
              <Button disabled={disabled || !actions?.[nextAction]} onClick={() => run(nextAction)}>{t(nextAction === "START" ? startLabel : "Moderator.ADVANCE")}</Button>
              <Button variant="secondary" disabled={disabled || !actions?.PAUSE} onClick={() => run("PAUSE")}>{t("Moderator.PAUSE")}</Button>
            </div>
          </>}
        </section>
        <section aria-labelledby="live-connection"><h2 id="live-connection">{t("Moderator.connection")}</h2>
          <div role="status" className={showInterruption ? "ui-alert ui-tone-warning" : undefined}>
            <p>{showInterruption ? <strong>{connectionStatus}</strong> : connectionStatus}</p>
            {interruptionHelp}
          </div>
          {snapshot && <p className="ui-help">{t("Moderator.sync", { revision: revision(workspace.revision), time: time(new Date(snapshot.receivedAt)) })}</p>}
          <div className="moderator-actions">
            <Button variant="secondary" disabled={!online || loading || sending} onClick={() => void refresh()}>{t("Moderator.refresh")}</Button>
            {showPrint && <Button variant="quiet" onClick={() => window.print()}>{t("Moderator.print")}</Button>}
          </div>
        </section>
      </div>
      {session.following.length > 0 && <section className="moderator-upcoming" aria-labelledby="live-upcoming">
        <h2 id="live-upcoming">{t("Moderator.upcoming")}</h2>
        <ol>{session.following.map(slot => <li key={slot.slotId} value={slot.position}>
          <span>{slot.title ?? t("Judge.untitled")}</span><span className="ui-help">{slot.studioName}</span>
        </li>)}</ol>
      </section>}
    </>}

    {!workspace && (failure ? <>
      <Alert tone="danger" announce={false}><ErrorFeedback error={failure.ui} /></Alert>
      <div className="moderator-actions">
        <Button disabled={!online || loading} onClick={() => void refresh()}>{t("Moderator.refresh")}</Button>
        {sessionId !== undefined && <Button variant="secondary" onClick={() => selectSession()}>{t("Moderator.chooseSession")}</Button>}
      </div>
    </> : online ? <>
      <div className="moderator-ledger moderator-loading" aria-hidden="true"><span /><span /></div>
      <LoadingState label={t("Access.loading")} />
    </> : null)}
    {!session && <div role="status" className={showInterruption ? "ui-alert ui-tone-warning" : undefined}>
      {!online && !failure && <p><strong>{connectionStatus}</strong></p>}
      {interruptionHelp}
    </div>}
    {workspace && !session && <EmptyState title={t("Moderator.noSessions")} description={t(workspace.organizer ? "Moderator.configure" : "Moderator.contact")} />}
    {workspace && failure && <Alert tone="warning"><ErrorFeedback error={failure.ui} /></Alert>}

    {workspace && lastAck && <Alert tone="success">
      {t("Moderator.ack", {
        action: t(lastAck.kind === "sheet" ? "Moderator.REOPEN_SHEET" : `Moderator.${lastAck.action}`),
        revision: revision(lastAck.revision), time: time(new Date(lastAck.createdAt)),
      })}
    </Alert>}
    {pending && (workspace || !failure?.denied) && <Alert tone="warning" announce={false}>
      <p role="status">{t(sending ? "Moderator.sending" : changed ? "Moderator.changed" : "Moderator.reconciling")}</p>
      {writeError && <ErrorFeedback error={writeError} />}
      <div className="moderator-actions">
        {retryable && <Button variant="secondary" onClick={() => void send(pending)}>{t("Moderator.retrySame")}</Button>}
        {connected && <Button variant="secondary" onClick={() => { setPending(null); setWriteError(null); }}>{t("Moderator.useCurrent")}</Button>}
      </div>
    </Alert>}

    {workspace && session && workspace.eventStage === "LIVE" && <section className="moderator-exceptions" aria-labelledby="live-exceptions">
      <h2 id="live-exceptions" ref={exceptionsHeading} tabIndex={-1}>{t("Moderator.exceptions")}</h2>
      <div className="moderator-actions" hidden={!!proposal}>
        {exceptionActions.filter(action => workspace.organizer || action === "SKIP").map(action => <Button key={action}
          variant="secondary" disabled={disabled || !actions?.[action]} onClick={event => {
            exceptionTrigger.current = event.currentTarget;
            setProposal({ action, workspace, session });
          }}>{t(`Moderator.${action}`)}</Button>)}
      </div>
      {proposal && <ExceptionReview proposal={proposal} current={session} disabled={!connected || proposalChanged || !actions?.[proposal.action]} changed={proposalChanged}
        onCancel={() => {
          setProposal(null);
          requestAnimationFrame(() => {
            const trigger = exceptionTrigger.current;
            (trigger?.disabled ? exceptionsHeading.current : trigger)?.focus();
          });
        }}
        onConfirm={operation => { if (!proposalChanged && !pending) void send(operation); }} />}
    </section>}

    {showPrint && workspace && session && snapshot && <section className="moderator-print">
      <h1>{t("Moderator.printTitle")}</h1>
      <h2>{workspace.eventName}</h2>
      <p>{session.stageName + " / " + session.name}</p>
      <p>{t(stageKey[workspace.eventStage])} / {t(queueLabel[session.state])}</p>
      <p>{t("Moderator.scheduledAt", { time: time(new Date(session.startsAt)), zone: workspace.timeZone })}</p>
      <p>{t("Moderator.printTime", { revision: revision(workspace.revision), time: time(new Date(snapshot.receivedAt)), zone: workspace.timeZone })}</p>
      <p>{t("Moderator.printHelp")}</p>
      <h2>{t("Moderator.current")}</h2><Performance slot={session.current} empty={t("Moderator.noCurrent")} />
      {session.current && <Completion completion={session.current.completion} />}
      <h2>{t("Moderator.next")}</h2><Performance slot={session.next} empty={t("Moderator.noNext")} />
    </section>}
  </div>;
}

function Performance({ slot, empty }: { slot: LiveSession["next"]; empty: string }) {
  const { t, locale } = useTranslation();
  if (!slot) return <p>{empty}</p>;
  return <div className="moderator-performance"><p className="moderator-performance-title">{slot.title ?? t("Judge.untitled")}</p>
    <p className="ui-help">{t("Moderator.slotIdentity", { position: formatNumber(slot.position, locale), studio: slot.studioName })}</p></div>;
}

function Completion({ completion }: { completion: NonNullable<LiveSession["current"]>["completion"] }) {
  const { t, locale } = useTranslation();
  return <div className="moderator-completion">
    <p>{completion?.required ? t("Moderator.completion", {
      locked: formatNumber(completion.locked, locale), required: formatNumber(completion.required, locale),
    }) : t("Moderator.noCompletion")}</p>
    {!!completion?.unavailable && <p>{t("Moderator.unavailable", { count: completion.unavailable })}</p>}
  </div>;
}

function ExceptionReview({ proposal, current, disabled, changed, onCancel, onConfirm }: {
  proposal: Proposal; current: LiveSession; disabled: boolean; changed: boolean; onCancel: () => void; onConfirm: (operation: LiveOperation) => void;
}) {
  const { t, locale } = useTranslation();
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const targetInput = useRef<HTMLSelectElement>(null);
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");
  const { action, workspace, session } = proposal;
  const sheet = action === "REOPEN_SHEET" ? session.correctionSheets.find(row => row.id === target) : undefined;
  const targetChanged = !!sheet && !current.correctionSheets.some(row => row.id === sheet.id && row.revision === sheet.revision);
  const performanceLabel = (slot: NonNullable<LiveSession["next"]>) => (slot.title ?? t("Judge.untitled")) + " / " +
    t("Moderator.slotIdentity", { position: formatNumber(slot.position, locale), studio: slot.studioName });
  const choices = action === "REQUEUE"
    ? session.skipped.map(slot => ({ id: slot.slotId, label: performanceLabel(slot) }))
    : action === "REOPEN_SHEET"
      ? session.correctionSheets.map(sheet => ({
          id: sheet.id, label: performanceLabel(sheet.performance) + " / " + sheet.judgeName + " / " + t(sheet.state === "LOCKED" ? "Moderator.sheetLocked" : "Moderator.sheetDraft"),
        }))
      : [];
  const selected = choices.find(choice => choice.id === target);
  useEffect(() => { (targetInput.current ?? reasonInput.current)?.focus(); }, []);
  const submit = () => {
    const trimmed = reason.trim();
    if (disabled || targetChanged || !trimmed || (choices.length > 0 && !target)) return;
    const operationId = crypto.randomUUID();
    if (action === "REOPEN_SHEET") {
      if (sheet) onConfirm({ kind: "sheet", command: { action: "REOPEN", operationId, expectedRevision: sheet.revision, sheetId: sheet.id, reason: trimmed } });
      return;
    }
    const base = { ...scheduleTarget(workspace, session), operationId, reason: trimmed };
    onConfirm({ kind: "schedule", command: action === "REQUEUE" ? { ...base, action, targetSlotId: target } : { ...base, action } });
  };

  return <form className="moderator-review" onSubmit={event => { event.preventDefault(); submit(); }}>
    <h3>{t(`Moderator.${action}`)}</h3>
    <p>{session.stageName + " / " + session.name}</p>
    {(action === "SKIP" || action === "ADVANCE_OVERRIDE") && <Performance slot={session.current} empty={t("Moderator.noCurrent")} />}
    <p>{t(`Moderator.effect_${action}`)}</p>
    {(changed || targetChanged) && <Alert tone="warning">{t("Moderator.reviewChanged")}</Alert>}
    {choices.length > 0 && <Field id="live-exception-target" label={t("Moderator.target")} required>{attributes =>
      <select {...attributes} className="ui-input" ref={targetInput} value={target} onChange={event => setTarget(event.target.value)}>
        <option value="">{t("Moderator.chooseTarget")}</option>
        {choices.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
      </select>}</Field>}
    {selected && <p className="moderator-target-detail" aria-hidden="true">{selected.label}</p>}
    <Field id="live-exception-reason" label={t("Moderator.reason")} required>{attributes =>
      <textarea {...attributes} ref={reasonInput} className="ui-input" rows={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} />
    }</Field>
    <div className="moderator-actions">
      <Button type="submit" disabled={disabled || targetChanged || !reason.trim() || (choices.length > 0 && !target)}>{t("Setup.confirm")}</Button>
      <Button variant="secondary" onClick={onCancel}>{t("Common.cancel")}</Button>
    </div>
  </form>;
}
