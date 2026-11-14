import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { z } from "zod";
import { BASIC_ENTRY_FIELDS, FINAL_ENTRY_FIELDS, EntryCommandSchema, type EntryCommand, type EntryField,
  EntryReviewSchema, EntryCheckpointSchema, EntryReceiptSchema, type Performance } from "@dance/schemas";
import { getEntryReview, commandEntryCheckpoint } from "../../api/entry-workflow";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { Button, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import EntryDeadline from "./EntryDeadline";
import EntryLoading from "./EntryLoading";

function Checkpoint({ value, eventId, studioId, zone, entries, refresh }: { value: z.infer<typeof EntryCheckpointSchema>;
  eventId: string; studioId: string; zone: string; entries: Performance[]; refresh: () => Promise<void> }) {
  const { t, locale } = useTranslation();
  const [params] = useSearchParams();
  const [error, setError] = useState<UiError | null>(null);
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [frozen, setFrozen] = useState<EntryCommand | null>(null);
  const [receipt, setReceipt] = useState<z.infer<typeof EntryReceiptSchema> | null>(null);
  const [confirmed, setConfirmed] = useState(false); const [reason, setReason] = useState("");
  const [visible, setVisible] = useState(false); const [exception, setException] = useState(false);
  const [until, setUntil] = useState<string | null>(null); const [selected, setSelected] = useState<EntryField[]>([]);
  const [performanceId, setPerformanceId] = useState("");
  const fields = [...new Set(value.kind === "BASIC" ? BASIC_ENTRY_FIELDS : [...BASIC_ENTRY_FIELDS, ...FINAL_ENTRY_FIELDS])];
  const prefix = `entry-${value.kind}`;
  async function run(action: "SUBMIT" | "ACCEPT" | "REOPEN") {
    if (lock.current) return;
    setError(null);
    const parsed = EntryCommandSchema.safeParse(frozen ?? { expectedRevision: value.revision, operationId: crypto.randomUUID(), action,
      ...(reason.trim() && { reason: reason.trim() }), visible, exception,
      ...(action === "REOPEN" && { grant: { fields: selected, performanceIds: performanceId ? [performanceId] : null, until } }) });
    if (!parsed.success) { setError(toUiError(parsed.error)); return; }
    const body = parsed.data; setFrozen(body); lock.current = true; setBusy(true);
    try {
      const result = await commandEntryCheckpoint(eventId, studioId, value.kind, body);
      setReceipt(result); setFrozen(null); setConfirmed(false);
      await refresh();
    } catch (err: unknown) {
      setError(toUiError(err));
      if (frozen === null && err instanceof ApiError && [400, 403, 404, 409].includes(err.statusCode)) setFrozen(null);
    } finally { lock.current = false; setBusy(false); }
  }
  const date = (instant: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: zone }).format(new Date(instant));
  async function reload() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try { await refresh(); setConfirmed(false); } catch (err: unknown) { setError(toUiError(err)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="entry-checkpoint" aria-labelledby={`${prefix}-title`}>
    <h3 id={`${prefix}-title`}>{t(value.kind === "BASIC" ? "Entry.basic" : "Entry.final")}</h3>
    <p role="status">{t(`Entry.${value.status}`)}</p>
    {receipt && receipt.revision > value.revision && <p>{t("Entry.staleView")}</p>}
    {!value.enabled ? <p>{t("Entry.disabled")}</p> : <>
      <p>{value.deadline ? <>{t("Entry.deadline")}: <time dateTime={value.deadline}>{date(value.deadline)}</time> ({zone})</> : t("Entry.noDeadline")}</p>
      <p>{t(value.locked ? "Entry.locked" : "Entry.editable")}</p>
      {value.grant && <p>{t("Entry.scope")}: {value.grant.fields.map(field => t(`Entry.field_${field}`)).join(", ")}, <time dateTime={value.grant.until}>{date(value.grant.until)}</time></p>}
      {value.issues.length ? <><h4>{t("Entry.blockers")}</h4><ul>{value.issues.map((issue, index) => <li key={index}>
        {issue.performanceId && <>{entries.find(row => row.id === issue.performanceId)?.title ?? t("Performance.untitled")}: </>}
        {issue.performanceId ? <Link to={{ search: (() => { const next = new URLSearchParams(params); next.set("edit", issue.performanceId); return `?${next}`; })(),
          hash: `#edit-${issue.field === "durationSec" ? "duration" : issue.field}` }}>{t(`Entry.field_${issue.field}`)}</Link> : t(`Entry.field_${issue.field}`)} ({t(`Entry.issue_${issue.reason}`)})
      </li>)}</ul></> : <p>{t("Entry.ready")}</p>}
      <ErrorSummary error={error} title={t("Entry.error")} fields={{ reason: `${prefix}-reason`, grant: `${prefix}-scope` }} />
      {error && <Button variant="quiet" pending={busy} onClick={() => { void reload(); }}>{t("Entry.refresh")}</Button>}
      {frozen ? <><p>{t("Performance.retryHelp")}</p><Button pending={busy} onClick={() => { void run(frozen.action); }}>{t("Entry.retry")}</Button></> : <>
        <label className="entry-check"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />{t("Entry.confirm")}</label>
        <div className="entry-actions"><Button disabled={busy || !confirmed || (value.issues.length > 0 && !exception)} pending={busy} onClick={() => { void run("SUBMIT"); }}>{t("Entry.submit")}</Button>
          <Button variant="quiet" disabled={busy || !confirmed || value.status !== "REVIEW_PENDING" || (value.issues.length > 0 && !exception)} onClick={() => { void run("ACCEPT"); }}>{t("Entry.accept")}</Button></div>
        <Field id={`${prefix}-reason`} label={t("Entry.reason")}>{attrs => <Input {...attrs} value={reason} maxLength={1000} disabled={busy} onChange={event => setReason(event.target.value)} />}</Field>
        <label className="entry-check"><input type="checkbox" checked={exception} disabled={busy} onChange={event => setException(event.target.checked)} />{t("Entry.exception")}</label>
        <details><summary>{t("Entry.reopen")}</summary><form onSubmit={event => { event.preventDefault(); void run("REOPEN"); }}>
          <fieldset id={`${prefix}-scope`} disabled={busy}><legend>{t("Entry.scope")}</legend>{fields.map(field => <label className="entry-check" key={field}>
            <input type="checkbox" checked={selected.includes(field)} onChange={event => setSelected(current => event.target.checked ? [...current, field] : current.filter(item => item !== field))} />{t(`Entry.field_${field}`)}</label>)}</fieldset>
          <Field id={`${prefix}-performance`} label={t("Entry.performance")}>{attrs => <select {...attrs} className="ui-input" value={performanceId} disabled={busy} onChange={event => setPerformanceId(event.target.value)}>
            <option value="">{t("Entry.allEntries")}</option>{entries.map(row => <option key={row.id} value={row.id}>{row.title ?? t("Performance.untitled")}</option>)}</select>}</Field>
          <EntryDeadline id={`${prefix}-until`} label={t("Entry.until")} zone={zone} value={until} change={setUntil} required disabled={busy} />
          <label className="entry-check"><input type="checkbox" checked={visible} disabled={busy} onChange={event => setVisible(event.target.checked)} />{t("Entry.visible")}</label>
          <Button type="submit" disabled={busy || !reason.trim() || !selected.length || !until}>{t("Entry.reopen")}</Button>
        </form></details>
      </>}
      {receipt && <p role="status">{t("Entry.saved")} {t(`Entry.action_${receipt.action}`)}. {t("Entry.receipt")}: {receipt.id}</p>}
      {value.receipts.length ? <ol className="entry-receipts">{value.receipts.map(row => <li key={row.id}>
        <strong>{t(`Entry.action_${row.action}`)}</strong> <time dateTime={row.createdAt}>{date(row.createdAt)}</time>
        <p>{t("Entry.receipt")}: {row.id}</p>{row.reason && <p>{row.reason}</p>}
        <p>{t("Performance.revision")} {row.revision}: {t("Entry.dances", { count: row.manifest.entries.length })}</p>
      </li>)}</ol> : <p>{t("Entry.noReceipts")}</p>}
    </>}
  </section>;
}

export default function EntryReviewPanel({ eventId, studioId, zone, entries, changed }: { eventId: string; studioId: string; zone: string; entries: Performance[]; changed: () => Promise<void> }) {
  const { t } = useTranslation(); const [value, setValue] = useState<z.infer<typeof EntryReviewSchema> | null>(null);
  const [params, setParams] = useSearchParams();
  const selectedKind = params.get("checkpoint") === "FINAL" ? "FINAL" : "BASIC";
  const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  async function refresh() { const response = await getEntryReview(eventId, studioId); setValue(response); setError(null); await changed(); }
  const revisionKey = entries.map(row => `${row.id}:${row.revision}`).join();
  useEffect(() => { let active = true; void getEntryReview(eventId, studioId).then(response => { if (active) { setValue(response); setError(null); } })
    .catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; }; }, [eventId, studioId, attempt, revisionKey]);
  return <section className="entry-review" aria-labelledby="entry-review-title"><h2 id="entry-review-title">{t("Entry.review")}</h2>
    <div className="entry-actions" role="group" aria-label={t("Entry.review")}>{(["BASIC", "FINAL"] as const).map(kind => <Button key={kind} variant="quiet" aria-pressed={selectedKind === kind}
      onClick={() => setParams(current => { const next = new URLSearchParams(current); next.set("checkpoint", kind); return next; })}>{t(kind === "BASIC" ? "Entry.basic" : "Entry.final")}</Button>)}</div>
    {error && <><ErrorSummary error={error} title={t("Entry.error")} /><Button onClick={() => setAttempt(value => value + 1)}>{t("Shell.retry")}</Button></>}
    {!value ? !error && <EntryLoading /> : !value.checkpoints.length ? <p>{t("Entry.noSetup")}</p>
      : value.checkpoints.map(row => <div key={row.kind} hidden={selectedKind !== row.kind}><Checkpoint value={row} eventId={eventId} studioId={studioId} zone={zone} entries={entries} refresh={refresh} /></div>)}
  </section>;
}
