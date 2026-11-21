import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { JudgeScoringAck, JudgeScoringCommand, JudgeScoringSheet, JudgeScoringWorkspace } from "@dance/schemas";
import { commandScoring } from "../../api/scoring";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { useAuth } from "../../auth/useAuth";
import { ErrorFeedback } from "../../components/ErrorFeedback";
import { Alert, Button, EmptyState, Field, Input, LoadingState } from "../../components/ui/Foundation";
import { formatInstant, formatNumber } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { useUnsaved } from "../entries/useUnsaved";
import { emptyField, readJudgeValues, savedFields, type JudgeFields } from "./judgeValues";
import { JUDGE_REQUEST_MS, useJudgeConnection } from "./useJudgeConnection";
import "./judge.css";

type Draft = { sheet: JudgeScoringSheet; fields: JudgeFields };
const AUTO_SAVE_MS = 900;
const sheetPriority = (a: JudgeScoringSheet, b: JudgeScoringSheet) =>
  Number(b.current) - Number(a.current) || Number(b.writable) - Number(a.writable) || b.savedAt.localeCompare(a.savedAt) || a.id.localeCompare(b.id);

export default function JudgeInterface() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  if (eventId) return <ScoreWorkspace key={JSON.stringify([eventId, user?.id])} eventId={eventId} />;
  const events = (user?.roles ?? []).flatMap(assignment => assignment.role.key === "judge" && assignment.event ? [assignment.event] : []);
  return <div className="event-workbench judge-workbench">
    <h1>{t("Judge.title")}</h1>
    {events.length ? <ul className="judge-ledger">{events.map(event => <li key={event.id}>
      <Link className="ui-button ui-button-secondary" to={`events/${encodeURIComponent(event.id)}/score`}>{event.name}</Link>
    </li>)}</ul> : <EmptyState title={t("Judge.noEvents")} description={t("Judge.contact")} />}
  </div>;
}

function ScoreWorkspace({ eventId }: { eventId: string }) {
  const { sessionExpired } = useAuth();
  const { t, locale } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selection, setSelection] = useState<{ id: string; explicit: boolean } | null>(null);
  const [reviewing, setReviewing] = useState<{ id: string; revision: number } | null>(null);
  const [pending, setPending] = useState<JudgeScoringCommand | null>(null);
  const [sending, setSending] = useState(false);
  const [writeError, setWriteError] = useState<UiError | null>(null);
  const [lastAck, setLastAck] = useState<JudgeScoringAck | null>(null);
  const [comparing, setComparing] = useState(false);
  const writing = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const reviewTrigger = useRef<HTMLButtonElement>(null);
  const reconcile = useCallback(({ acknowledgement, sheets }: JudgeScoringWorkspace) => {
    setSelection(previous => {
      const selected = sheets.find(sheet => sheet.id === previous?.id);
      if (selected && (previous?.explicit || selected.current || selected.writable)) return previous;
      const next = [...sheets].sort(sheetPriority)[0];
      if (!next) return null;
      return next.id === previous?.id ? previous : { id: next.id, explicit: false };
    });
    if (!pending || !acknowledgement || acknowledgement.operationId !== pending.operationId || acknowledgement.sheetId !== pending.sheetId ||
      acknowledgement.action !== pending.action || acknowledgement.revision !== pending.expectedRevision + 1) return;
    setLastAck(acknowledgement);
    if (acknowledgement.action === "SUBMIT") setSelection({ id: acknowledgement.sheetId, explicit: true });
    setDraft(null);
    setPending(null);
    setWriteError(null);
    setComparing(false);
  }, [pending]);
  const { snapshot, failure, loading, online, connected, fresh, invalidate, refresh } = useJudgeConnection(eventId, pending?.operationId, sending || sessionExpired, reconcile);
  useUnsaved(!!draft || !!pending, false, t("Judge.discard"));
  useEffect(() => () => { writing.current?.abort(); }, []);

  const send = useCallback(async (command: JudgeScoringCommand) => {
    if (!fresh() || writing.current) return;
    const request = new AbortController();
    writing.current = request;
    invalidate();
    setPending(command);
    setSending(true);
    setWriteError(null);
    setReviewing(null);
    try {
      const receipt = await commandScoring(eventId, command, AbortSignal.any([request.signal, AbortSignal.timeout(JUDGE_REQUEST_MS)]));
      const saved = receipt.workspace.sheets.find(sheet => sheet.id === command.sheetId);
      if (receipt.operationId !== command.operationId || receipt.action !== command.action || receipt.workspace.eventId !== eventId || saved?.revision !== command.expectedRevision + 1) {
        throw new ApiError(502, "Unexpected scoring receipt", undefined, "INVALID_RESPONSE", "invalidResponse");
      }
    } catch (error) {
      if (!request.signal.aborted) setWriteError(toUiError(error));
    } finally {
      if (writing.current === request) writing.current = null;
      if (!request.signal.aborted) setSending(false);
    }
  }, [eventId, fresh, invalidate]);

  const workspace = snapshot?.workspace;
  const acknowledgement = workspace?.acknowledgement;

  const sheets = [...(workspace?.sheets ?? [])].sort(sheetPriority);
  const pinnedId = draft?.sheet.id ?? pending?.sheetId ?? reviewing?.id;
  const serverSheet = sheets.find(sheet => sheet.id === (pinnedId ?? selection?.id)) ?? (pinnedId ? undefined : sheets[0]);
  const sheet = failure?.denied ? undefined : draft?.sheet ?? serverSheet;
  const sheetId = sheet?.id;
  useEffect(() => { heading.current?.focus(); }, [sheetId]);
  useEffect(() => { if (reviewing) reviewHeading.current?.focus(); }, [reviewing]);

  const revision = draft?.sheet.revision ?? pending?.expectedRevision ?? reviewing?.revision;
  const changed = revision !== undefined && (serverSheet?.revision !== revision || !serverSheet.writable);
  const editable = !!serverSheet?.writable && connected && !pending && !changed && !reviewing;
  const fields = draft?.fields ?? (sheet ? savedFields(sheet, locale) : {});
  const currentFields = serverSheet ? savedFields(serverSheet, locale) : {};
  const parsed = sheet ? readJudgeValues(sheet, fields) : null;
  useEffect(() => {
    if (!draft || !editable || !fresh()) return;
    const values = readJudgeValues(draft.sheet, draft.fields);
    if (!values.valid) return;
    const timer = window.setTimeout(() => void send({ operationId: crypto.randomUUID(), action: "DRAFT", sheetId: draft.sheet.id,
      expectedRevision: draft.sheet.revision, values: values.values }), AUTO_SAVE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, editable, fresh, send]);

  const edit = (id: string, key: "value" | "comment", value: string) => {
    if (!sheet || !editable || !fresh() || writing.current) return;
    setDraft({ sheet, fields: { ...fields, [id]: { ...(fields[id] ?? emptyField), [key]: value } } });
  };
  const choose = (id: string) => {
    if (pending || (draft && !window.confirm(t("Judge.discard")))) return;
    setDraft(null);
    setReviewing(null);
    setComparing(false);
    setSelection({ id, explicit: true });
  };
  const submit = () => {
    if (!reviewing || !sheet || !parsed?.valid || !parsed.complete || changed || pending || !fresh()) return;
    setDraft({ sheet, fields });
    void send({ operationId: crypto.randomUUID(), action: "SUBMIT", sheetId: reviewing.id, expectedRevision: reviewing.revision, values: parsed.values });
  };
  const title = (row: JudgeScoringSheet) => row.title ?? t("Judge.untitled");
  const formatTime = (value: string) => t("Judge.utc", { time: formatInstant(value, locale, "short", "medium") });
  const shownAck = lastAck?.sheetId === sheetId ? lastAck : null;
  const retryable = !!pending && !sending && !changed && connected && acknowledgement === null;
  const compare = connected && changed && !sending && (!!draft || !!pending);

  return <div className="event-workbench judge-workbench">
    <header className="judge-header">
      <div>
        <Link className="judge-back" to="/judge">{t("Judge.title")}</Link><h1>{workspace?.eventName ?? t("Judge.scoring")}</h1>
        {sheet && <div className="judge-performance">
          <h2 ref={heading} tabIndex={-1} id="judge-performance">{title(sheet)}</h2>
          <p className="judge-fact">{t("Judge.stage", { stage: sheet.stageName, session: sheet.sessionName })}</p>
        </div>}
      </div>
      <div>
        <p role="status">{!online ? t("Judge.offline") : connected ? t("Judge.connected") : t("Judge.checking")}</p>
        {snapshot && <p className="judge-fact">{t("Judge.lastCheck", { time: formatTime(new Date(snapshot.receivedAt).toISOString()) })}</p>}
        <Button variant="secondary" disabled={!online || loading || sending} onClick={() => void refresh()}>{t("Judge.refresh")}</Button>
      </div>
    </header>
    {failure && <ErrorFeedback error={failure.ui} />}
    {!failure && !workspace && online && <LoadingState label={t("Judge.loading")} />}
    {workspace && !sheet && <EmptyState title={t("Judge.waiting")} description={t("Judge.waitingHelp")} />}
    {sheets.length > 1 && <div className="judge-picker"><Field id="judge-sheet" label={t("Judge.pick")}>
      {attributes => <select {...attributes} name="sheet" className="ui-input" value={sheetId ?? ""} disabled={!!pending} onChange={event => choose(event.target.value)}>
        {!sheets.some(row => row.id === sheetId) && <option value="">{t("Judge.pick")}</option>}
        {sheets.map(row => <option key={row.id} value={row.id}>{t("Judge.sheetOption", { title: title(row), session: t("Judge.stage", { stage: row.stageName, session: row.sessionName }),
          status: row.current ? t("Judge.current") : row.writable ? t("Judge.correction") : row.state === "LOCKED" ? t("Judge.locked") : t("Judge.readOnly") })}</option>)}
      </select>}
    </Field></div>}
    {sheet && parsed && <section aria-labelledby="judge-performance" className="judge-sheet">
      {serverSheet?.reopenReason && <Alert tone="warning">{t("Judge.reopened", { reason: serverSheet.reopenReason })}</Alert>}
      <div className="judge-progress" role="status">
        {sending ? t(pending?.action === "SUBMIT" ? "Judge.submitting" : "Judge.saving") : pending ? t("Judge.uncertain") :
          draft ? t("Judge.unsaved") : sheet.state === "LOCKED" ? t("Judge.locked") : !sheet.writable ? t("Judge.readOnly") : sheet.revision === 1 ? t("Judge.blank") : t("Judge.saved")}
      </div>
      {writeError && <ErrorFeedback error={writeError} />}
      {serverSheet && serverSheet.revision > 1 && <p className="judge-fact">{t(serverSheet.state === "LOCKED" ? "Judge.submittedAt" : "Judge.savedAt", {
        revision: serverSheet.revision, time: formatTime(serverSheet.submittedAt ?? serverSheet.savedAt),
      })}</p>}
      {shownAck && shownAck.revision !== serverSheet?.revision && <p className="judge-fact">{t(shownAck.action === "SUBMIT" ? "Judge.submittedAt" : "Judge.savedAt", {
        revision: shownAck.revision, time: formatTime(shownAck.createdAt),
      })}</p>}
      {retryable && <Button variant="secondary" onClick={() => void send(pending)}>{t("Judge.retry")}</Button>}
      {compare && <div className="judge-compare">
        <Alert tone="warning">{t("Judge.changed")}</Alert>
        <Button variant="secondary" onClick={() => setComparing(value => !value)} aria-expanded={comparing}>{t("Judge.compare")}</Button>
        {comparing && <>
          {serverSheet && <dl className="judge-ledger">{serverSheet.rubric.criteria.map(criterion => <div key={criterion.id}>
            <dt>{criterion.label[locale]}</dt><dd>{t("Judge.compareValues", { saved: currentFields[criterion.id]?.value || t("Judge.missing"), local: fields[criterion.id]?.value || t("Judge.missing") })}</dd>
            {(currentFields[criterion.id]?.comment || fields[criterion.id]?.comment) && <dd>{t("Judge.compareComments", { saved: currentFields[criterion.id]?.comment || t("Judge.missing"), local: fields[criterion.id]?.comment || t("Judge.missing") })}</dd>}
          </div>)}</dl>}
          <div className="judge-actions">
            {serverSheet?.writable && <Button onClick={() => { if (!fresh()) return; setDraft({ sheet: serverSheet, fields }); setPending(null); setWriteError(null); setComparing(false); }}>{t("Judge.reapply")}</Button>}
            <Button variant="secondary" onClick={() => {
              if (!window.confirm(t("Judge.discard"))) return;
              setDraft(null); setPending(null); setReviewing(null); setWriteError(null); setComparing(false);
              if (!serverSheet) setSelection(null);
            }}>{t("Judge.useServer")}</Button>
          </div>
        </>}
      </div>}
      <div className="judge-rubric">
        <h3>{sheet.rubric.name}</h3>
        <p className="judge-fact">{t("Judge.progress", { filled: parsed.values.length, total: sheet.rubric.criteria.length })}</p>
        <ol className="judge-ledger">{sheet.rubric.criteria.map(criterion => {
          const id = `criterion-${criterion.id}`;
          const field = fields[criterion.id] ?? emptyField;
          const range = t("Judge.range", { min: formatNumber(Number(criterion.min), locale), max: formatNumber(Number(criterion.max), locale), step: formatNumber(Number(criterion.step), locale) });
          const hint = [range, criterion.instructions[locale]].filter(Boolean).join(" ");
          return <li key={criterion.id}>
            <Field id={id} label={criterion.label[locale]} hint={hint} error={parsed.invalid[criterion.id] ? t(parsed.invalid[criterion.id] === "range" ? "Judge.invalid" : "Judge.commentNeedsScore") : undefined}>
              {attributes => <Input {...attributes} name={id} type="text" inputMode="decimal" autoComplete="off" maxLength={16} readOnly={!editable} value={field.value} onChange={event => edit(criterion.id, "value", event.target.value)} />}
            </Field>
            {(sheet.state === "DRAFT" || field.comment) && <Field id={`${id}-comment`} label={t("Judge.comment", { criterion: criterion.label[locale] })}>
              {attributes => <textarea {...attributes} name={`${id}-comment`} className="ui-input" rows={2} maxLength={1000} readOnly={!editable} value={field.comment} onChange={event => edit(criterion.id, "comment", event.target.value)} />}
            </Field>}
          </li>;
        })}</ol>
      </div>
      {reviewing ? <section className="judge-confirm" aria-labelledby="judge-review-heading">
        <h3 id="judge-review-heading" ref={reviewHeading} tabIndex={-1}>{t("Judge.confirmTitle")}</h3>
        <p>{t("Judge.confirmHelp", { title: title(sheet) })}</p>
        {changed && <Alert tone="warning">{t("Judge.changed")}</Alert>}
        <div className="judge-actions"><Button disabled={changed || !connected} onClick={submit}>{t("Judge.submit")}</Button>
          <Button variant="secondary" onClick={() => { setReviewing(null); requestAnimationFrame(() => reviewTrigger.current?.focus()); }}>{t("Judge.cancel")}</Button></div>
      </section> : <button type="button" ref={reviewTrigger} className="ui-button ui-button-primary judge-review" disabled={!editable || !parsed.complete || !parsed.valid} onClick={() => {
        if (fresh()) setReviewing({ id: sheet.id, revision: sheet.revision });
      }}>{t("Judge.review")}</button>}
    </section>}
  </div>;
}
