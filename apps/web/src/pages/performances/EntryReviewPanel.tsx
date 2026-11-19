import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { z } from "zod";
import { BASIC_ENTRY_FIELDS, FINAL_ENTRY_FIELDS, EntryCommandSchema, type EntryCommand, type EntryField,
  EntryReviewSchema, EntryCheckpointSchema, EntryReceiptSchema, type EntryReview, type Performance } from "@dance/schemas";
import { getEntryReview, commandEntryCheckpoint } from "../../api/entry-workflow";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { Button, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import EntryDeadline from "./EntryDeadline";
import EntryLoading from "./EntryLoading";
import { useUnsaved } from "../entries/useUnsaved";

function Checkpoint({ value, eventId, studioId, zone, entries, refresh, organizer, ownWorkspace, retain, available, music }: { value: z.infer<typeof EntryCheckpointSchema>;
  eventId: string; studioId: string; zone: string; entries: Performance[]; refresh: () => Promise<void>; organizer: boolean; ownWorkspace: boolean; retain: (value: boolean) => void; available: boolean; music: EntryReview["music"] }) {
  const { t, locale } = useTranslation();
  const [params] = useSearchParams();
  const [error, setError] = useState<UiError | null>(null);
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [frozen, setFrozen] = useState<EntryCommand | null>(null);
  const [receipt, setReceipt] = useState<z.infer<typeof EntryReceiptSchema> | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null); const [reason, setReason] = useState("");
  const confirmed = confirmation === value.reviewToken;
  const setConfirmed = (selected: boolean) => setConfirmation(selected ? value.reviewToken : null);
  const [visible, setVisible] = useState(false); const [exception, setException] = useState(false);
  const [until, setUntil] = useState<string | null>(null); const [selected, setSelected] = useState<EntryField[]>([]);
  const [performanceId, setPerformanceId] = useState("");
  const [compared, setCompared] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const receiptHeading = useRef<HTMLHeadingElement>(null);
  const dirty = frozen !== null || !!reason || confirmed || selected.length > 0;
  useUnsaved(dirty, true);
  useEffect(() => { retain(dirty || busy); }, [dirty, busy, retain]);
  useEffect(() => { if (receipt) receiptHeading.current?.focus(); }, [receipt]);
  const fields = [...new Set(value.kind === "BASIC" ? BASIC_ENTRY_FIELDS : [...BASIC_ENTRY_FIELDS, ...FINAL_ENTRY_FIELDS])];
  const prefix = `entry-${value.kind}`;
  async function run(action: "SUBMIT" | "ACCEPT" | "REOPEN") {
    if (lock.current) return;
    setError(null);
    const parsed = EntryCommandSchema.safeParse(frozen ?? { expectedRevision: value.revision, expectedReview: value.reviewToken, operationId: crypto.randomUUID(), action,
      ...(reason.trim() && { reason: reason.trim() }), visible, exception,
      ...(action === "REOPEN" && { grant: { fields: selected, performanceIds: performanceId ? [performanceId] : null, until } }) });
    if (!parsed.success) { setError(toUiError(parsed.error)); return; }
    const body = parsed.data; setFrozen(body); setCompared(false); lock.current = true; setBusy(true);
    try {
      const result = await commandEntryCheckpoint(eventId, studioId, value.kind, body);
      setReceipt(result); setFrozen(null); setConfirmed(false); setReason(""); setSelected([]);
      await refresh();
    } catch (err: unknown) {
      setError(toUiError(err));
      if (err instanceof ApiError && [400, 403, 404, 409].includes(err.statusCode)) { setFrozen(null); setConfirmed(false); setNeedsRefresh(true); }
    } finally { lock.current = false; setBusy(false); }
  }
  const date = (instant: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: zone }).format(new Date(instant));
  async function reload() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try { await refresh(); setConfirmed(false); setCompared(true); setNeedsRefresh(false); } catch (err: unknown) { setError(toUiError(err)); }
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
      {value.grant?.performanceIds && <p>{t("Entry.performance")}: {value.grant.performanceIds.map(id => entries.find(row => row.id === id)?.title ?? t("Performance.untitled")).join(", ")}</p>}
      {value.issues.length ? <><h4>{t("Entry.blockers")}</h4><ul>{value.issues.map((issue, index) => <li key={index}>
        {issue.performanceId && <>{entries.find(row => row.id === issue.performanceId)?.title ?? t("Performance.untitled")}: </>}
        {issue.performanceId ? <Link to={{ ...(ownWorkspace ? { pathname: `/events/${eventId}/studios/${studioId}/performances/${issue.performanceId}/edit`, search: `?entry=review&checkpoint=${value.kind}` } : { search: (() => { const next = new URLSearchParams(params); next.set("edit", issue.performanceId); return `?${next}`; })() }),
          hash: `#edit-${issue.field}` }}>{t(`Entry.field_${issue.field}`)}</Link> : ownWorkspace ? <Link to={`/events/${eventId}/studios/${studioId}/performances/new?entry=review&checkpoint=${value.kind}`}>{t(`Entry.field_${issue.field}`)}</Link> : t(`Entry.field_${issue.field}`)} ({t(`Entry.issue_${issue.reason}`)})
      </li>)}</ul></> : !frozen && <p>{t(available && !needsRefresh ? "Entry.ready" : "Entry.reviewNeeded")}</p>}
      {value.kind === "FINAL" && <section className="entry-music-review" aria-labelledby="entry-music-title"><h4 id="entry-music-title">{t("Entry.musicReview")}</h4><p>{t("Entry.musicIndependent")}</p>
        {!music.configured && <p>{t("Entry.musicUnconfigured")}</p>}
        <ul>{music.entries.map(row => <li key={row.performanceId}><Link to={`/events/${eventId}/studios/${studioId}/music?performance=${row.performanceId}`}>{entries.find(entry => entry.id === row.performanceId)?.title ?? t("Performance.untitled")}</Link>: {t(`Entry.music_${row.status}`)}</li>)}</ul>
      </section>}
      <ErrorSummary error={error} title={t("Entry.error")} fields={{ reason: `${prefix}-reason`, grant: `${prefix}-scope` }} />
      <Button variant="quiet" pending={busy} onClick={() => { void reload(); }}>{t("Entry.refresh")}</Button>
      {frozen ? <><p>{t("Performance.retryHelp")}</p><Button pending={busy} onClick={() => { void run(frozen.action); }}>{t("Entry.retrySubmission")}</Button>
        {compared && <><p>{t("Entry.compareSubmission")}</p><Button variant="quiet" disabled={busy} onClick={() => { setFrozen(null); setConfirmed(false); setCompared(false); }}>{t("Entry.useReview")}</Button></>}
      </> : <>
        {value.canSubmit && <p>{t("Entry.independent")}</p>}
        {!value.canSubmit && !value.locked && <p>{t("Entry.submitUnavailable")}</p>}
        <label className="entry-check"><input type="checkbox" checked={confirmed} disabled={busy || !available || needsRefresh || !value.canSubmit} onChange={event => setConfirmed(event.target.checked)} />{t("Entry.confirm")}</label>
        <div className="entry-actions"><Button disabled={busy || !available || needsRefresh || !confirmed || !value.canSubmit || (value.issues.length > 0 && !exception)} pending={busy} onClick={() => { void run("SUBMIT"); }}>{t("Entry.submit")}</Button>
          {organizer && <Button variant="quiet" disabled={busy || !available || needsRefresh || !confirmed || value.status !== "REVIEW_PENDING" || (value.issues.length > 0 && !exception)} onClick={() => { void run("ACCEPT"); }}>{t("Entry.accept")}</Button>}</div>
        {organizer && <><Field id={`${prefix}-reason`} label={t("Entry.reason")}>{attrs => <Input {...attrs} value={reason} maxLength={1000} disabled={busy} onChange={event => setReason(event.target.value)} />}</Field>
        <label className="entry-check"><input type="checkbox" checked={exception} disabled={busy} onChange={event => setException(event.target.checked)} />{t("Entry.exception")}</label>
        <details><summary>{t("Entry.reopen")}</summary><form onSubmit={event => { event.preventDefault(); void run("REOPEN"); }}>
          <fieldset id={`${prefix}-scope`} disabled={busy}><legend>{t("Entry.scope")}</legend>{fields.map(field => <label className="entry-check" key={field}>
            <input type="checkbox" checked={selected.includes(field)} onChange={event => setSelected(current => event.target.checked ? [...current, field] : current.filter(item => item !== field))} />{t(`Entry.field_${field}`)}</label>)}</fieldset>
          <Field id={`${prefix}-performance`} label={t("Entry.performance")}>{attrs => <select {...attrs} className="ui-input" value={performanceId} disabled={busy} onChange={event => setPerformanceId(event.target.value)}>
            <option value="">{t("Entry.allEntries")}</option>{entries.map(row => <option key={row.id} value={row.id}>{row.title ?? t("Performance.untitled")}</option>)}</select>}</Field>
          <EntryDeadline id={`${prefix}-until`} label={t("Entry.until")} zone={zone} value={until} change={setUntil} required disabled={busy} />
          <label className="entry-check"><input type="checkbox" checked={visible} disabled={busy} onChange={event => setVisible(event.target.checked)} />{t("Entry.visible")}</label>
          <Button type="submit" disabled={busy || !reason.trim() || !selected.length || !until}>{t("Entry.reopen")}</Button>
        </form></details></>}
        {dirty && <Button variant="quiet" disabled={busy} onClick={() => { setConfirmed(false); setReason(""); setSelected([]); setUntil(null); setPerformanceId(""); setException(false); }}>{t("Entry.clearReview")}</Button>}
      </>}
      {receipt && <div className="entry-submission-receipt" role="status"><h4 ref={receiptHeading} tabIndex={-1}>{t("Entry.saved")} {t(`Entry.action_${receipt.action}`)}</h4><p>{t("Entry.receipt")}: {receipt.id}</p><p><time dateTime={receipt.createdAt}>{date(receipt.createdAt)}</time> ({zone})</p><p>{t("Performance.revision")} {receipt.revision}: {t("Entry.dances", { count: receipt.manifest.entries.length })}</p>{receipt.action === "SUBMIT" && <p>{t("Entry.nextReview")}</p>}</div>}
      {value.receipts.length ? <ol className="entry-receipts">{value.receipts.map(row => <li key={row.id}>
        <strong>{t(`Entry.action_${row.action}`)}</strong> <time dateTime={row.createdAt}>{date(row.createdAt)}</time>
        <p>{t("Entry.receipt")}: {row.id}</p>{row.reason && <p>{row.reason}</p>}
        <p>{t("Performance.revision")} {row.revision}: {t("Entry.dances", { count: row.manifest.entries.length })}</p>
      </li>)}</ol> : !frozen && available && !needsRefresh && <p>{t("Entry.noReceipts")}</p>}
    </>}
  </section>;
}

export default function EntryReviewPanel({ eventId, studioId, zone, entries, changed, ownWorkspace = false }: { eventId: string; studioId: string; zone: string; entries: Performance[]; changed: () => Promise<void>; ownWorkspace?: boolean }) {
  const { t } = useTranslation(); const [value, setValue] = useState<z.infer<typeof EntryReviewSchema> | null>(null);
  const [params, setParams] = useSearchParams();
  const selectedKind = params.get("checkpoint") === "FINAL" ? "FINAL" : "BASIC";
  const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  const [retained, setRetained] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  async function refresh() { setLoadedKey(null); const response = await getEntryReview(eventId, studioId); setValue(response); setError(null); setLoadedKey(requestKey); await changed(); }
  const revisionKey = entries.map(row => `${row.id}:${row.revision}`).join();
  const requestKey = JSON.stringify([eventId, studioId, attempt, revisionKey]);
  const available = loadedKey === requestKey;
  useEffect(() => { let active = true; void getEntryReview(eventId, studioId).then(response => { if (active) { setValue(response); setError(null); setLoadedKey(requestKey); } })
    .catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; }; }, [eventId, studioId, requestKey]);
  return <section className="entry-review" aria-labelledby="entry-review-title"><h2 id="entry-review-title">{t("Entry.review")}</h2>
    <div className="entry-actions" role="group" aria-label={t("Entry.review")}>{(["BASIC", "FINAL"] as const).map(kind => <Button key={kind} variant="quiet" disabled={retained} aria-pressed={selectedKind === kind}
      onClick={() => setParams(current => { const next = new URLSearchParams(current); next.set("checkpoint", kind); return next; })}>{t(kind === "BASIC" ? "Entry.basic" : "Entry.final")}</Button>)}</div>
    {error && <><ErrorSummary error={error} title={t("Entry.error")} /><Button onClick={() => setAttempt(value => value + 1)}>{t("Shell.retry")}</Button></>}
    {!value ? !error && <EntryLoading /> : !value.checkpoints.length ? <p>{t("Entry.noSetup")}</p>
      : value.checkpoints.filter(row => row.kind === selectedKind).map(row => <Checkpoint key={row.kind} value={row} eventId={eventId} studioId={studioId} zone={zone} entries={entries} refresh={refresh} organizer={value.organizer} ownWorkspace={ownWorkspace} retain={setRetained} available={available} music={value.music} />)}
  </section>;
}
