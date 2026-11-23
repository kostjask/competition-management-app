import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ScheduleCommandSchema, type ScheduleCommand, type SchedulePreview, type ScheduleQueues, type ScheduleWorkspace } from "@dance/schemas";
import { commandSchedule, getSchedule, previewSchedule } from "../../api/schedule";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { Alert, Button, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import { useAuth } from "../../auth/useAuth";
import { useUnsaved } from "../entries/useUnsaved";
import EntryLoading from "../performances/EntryLoading";
import { SessionEditor } from "./SessionEditor";
import "./schedule.css";

const queuesFrom = (value: ScheduleWorkspace): ScheduleQueues => value.sessions.map(session => ({ sessionId: session.id,
  performanceIds: session.slots.filter(slot => slot.state !== "REMOVED").sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(slot => slot.performanceId) }));

function Workspace({ eventId }: { eventId: string }) {
  const encodedEvent = encodeURIComponent(eventId);
  const { t, locale } = useTranslation(); const [params, setParams] = useSearchParams();
  const [value, setValue] = useState<ScheduleWorkspace | null>(null); const [queues, setQueues] = useState<ScheduleQueues>([]);
  const [comparison, setComparison] = useState<ScheduleWorkspace | null>(null); const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [sourceChanged, setSourceChanged] = useState(false);
  const [error, setError] = useState<UiError | null>(null); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [operation, setOperation] = useState<ScheduleCommand | null>(null); const [dirty, setDirty] = useState(false); const [formDirty, setFormDirty] = useState<string | null>(null); const [formEpoch, setFormEpoch] = useState(0);
  const [confirmed, setConfirmed] = useState(false); const [stageName, setStageName] = useState(""); const [ack, setAck] = useState<number | null>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null); const previewTrigger = useRef<HTMLDivElement>(null);
  useEffect(() => { if (preview) previewHeading.current?.focus(); }, [preview]);
  useUnsaved(dirty || !!formDirty || !!operation);
  useEffect(() => { let active = true; void getSchedule(eventId).then(result => { if (active) { setValue(result); setQueues(queuesFrom(result)); } }).catch(err => { if (active) setError(toUiError(err)); }); return () => { active = false; }; }, [eventId]);
  const changed = () => { setDirty(true); setPreview(null); setConfirmed(false); setAck(null); };
  const stageFilter = params.get("stage") ?? "";
  const sessions = value?.sessions.filter(s => !stageFilter || s.stageId === stageFilter) ?? [];
  const selected = sessions.find(s => s.id === params.get("session")) ?? sessions[0];
  const ids = queues.find(q => q.sessionId === selected?.id)?.performanceIds ?? [];
  const assigned = new Set(queues.flatMap(q => q.performanceIds));
  const available = value?.performances.filter(p => !assigned.has(p.id)) ?? [];
  const editable = value?.eventStage === "DATA_REVIEW" || value?.eventStage === "LIVE";
  const disabled = busy || !!operation || !editable || sourceChanged || !!comparison && comparison.revision !== value?.revision;
  const queueLocked = disabled || !!formDirty || selected?.state !== "PAUSED";
  const entry = (id: string) => value?.performances.find(p => p.id === id);
  const label = (id: string) => entry(id)?.title ?? t("Performance.untitled");
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: value?.timeZone ?? "UTC" }).format(new Date(iso));

  function editQueue(sessionId: string, next: string[]) { changed(); setQueues(current => current.map(q => q.sessionId === sessionId ? { ...q, performanceIds: next } : q)); }
  function move(id: string, direction: number) {
    if (!selected) return; const next = [...ids]; const i = next.indexOf(id); const target = i + direction;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target]!, next[i]!]; editQueue(selected.id, next);
    requestAnimationFrame(() => document.getElementById(`schedule-entry-${id}`)?.focus());
  }
  function reportError(err: unknown) {
    setError(toUiError(err));
    if (err instanceof ApiError && err.statusCode === 409 && err.reason === "concurrentChange") {
      setOperation(null);
      setPreview(null);
      setConfirmed(false);
      setComparison(null);
      setSourceChanged(true);
    }
  }
  async function execute(body: ScheduleCommand) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(null); setOperation(body);
    try {
      const result = await commandSchedule(eventId, body);
      setValue(result.workspace); setQueues(queuesFrom(result.workspace)); setDirty(false); setFormDirty(null); setFormEpoch(n => n + 1); setStageName(""); setPreview(null); setConfirmed(false); setComparison(null); setOperation(null); setAck(result.revision);
      // A replayed receipt acknowledges that operation, not the latest queue.
      // Keep the acknowledgement even when this separate current read fails.
      const current = await getSchedule(eventId);
      if (current.revision !== result.revision) setComparison(current);
    } catch (err) { reportError(err); }
    finally { setBusy(false); lock.current = false; }
  }
  function submit(raw: unknown) {
    const parsed = ScheduleCommandSchema.safeParse(typeof raw === "object" && raw !== null ? { ...raw, operationId: crypto.randomUUID(), expectedRevision: value?.revision } : raw);
    if (!parsed.success) { setError(toUiError(parsed.error)); return; }
    void execute(parsed.data);
  }
  async function validate() {
    if (!value || lock.current) return; lock.current = true; setBusy(true); setError(null); setConfirmed(false);
    try { const result = await previewSchedule(eventId, value.revision, queues); setPreview(result); }
    catch (err) { reportError(err); } finally { setBusy(false); lock.current = false; }
  }
  async function compare() {
    if (lock.current) return; lock.current = true; setBusy(true); setError(null);
    try { const result = await getSchedule(eventId); if (!value) { setValue(result); setQueues(queuesFrom(result)); } else setComparison(result); }
    catch (err) { setError(toUiError(err)); } finally { setBusy(false); lock.current = false; }
  }
  return <div className="event-workbench schedule-workbench"><header className="event-masthead"><div><h1>{t("Schedule.title")}</h1><p>{value?.eventName}</p></div><Link to={`/events/${encodedEvent}`}>{t("Staff.eventDetails")}</Link></header>
    <p>{t("Schedule.help")}</p><ErrorSummary title={t("Entry.error")} error={error} />
    {busy && <p role="status">{t("Access.loading")}</p>}
    <div className="entry-actions schedule-tools"><Button variant="quiet" disabled={busy} onClick={() => { void compare(); }}>{t("Schedule.compare")}</Button>
      {operation && <Button disabled={busy} onClick={() => { void execute(operation); }}>{t("Entry.retry")}</Button>}
      {operation && comparison && <Button variant="quiet" disabled={busy} onClick={() => { setOperation(null); setPreview(null); }}>{t("Schedule.compared")}</Button>}
      {value && <Button variant="quiet" disabled={busy || dirty || !!operation} onClick={() => window.print()}>{t("Schedule.print")}</Button>}
    </div>
    {sourceChanged && <Alert tone="warning">{t("Schedule.sourceChanged")}</Alert>}
    {operation && !busy && <p role="status">{t("Schedule.uncertain")}</p>}
    {comparison && <section className="schedule-comparison"><h2>{t("Schedule.compare")}</h2><p>{t("Schedule.revision")}: {comparison.revision}</p>
      {comparison.sessions.map(s => <section key={s.id}><h3>{s.name}</h3><p>{s.slots.filter(slot => slot.state !== "REMOVED").sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(slot => comparison.performances.find(p => p.id === slot.performanceId)?.title ?? t("Performance.untitled")).join(", ")}</p><dl className="schedule-facts"><div><dt>{t("Schedule.time")}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: comparison.timeZone }).format(new Date(s.startsAt))} ({comparison.timeZone})</dd></div><div><dt>{t("Schedule.buffer")}</dt><dd>{s.bufferSec}</dd></div><div><dt>{t("Schedule.rest")}</dt><dd>{s.restSec}</dd></div><div><dt>{t("Schedule.moderator")}</dt><dd>{s.moderatorId ? comparison.moderators.find(m => m.id === s.moderatorId)?.name ?? s.moderatorId : t("Schedule.none")}</dd></div></dl></section>)}
      <Button variant="secondary" disabled={busy || !!operation} onClick={() => { if (dirty && !window.confirm(t("Roster.discard"))) return; setValue(comparison); setQueues(queuesFrom(comparison)); setComparison(null); setSourceChanged(false); setDirty(false); setPreview(null); setConfirmed(false); }}>{t("Schedule.useServer")}</Button>
    </section>}
    {!value ? !error && <EntryLoading /> : <>
      <dl className="schedule-facts"><div><dt>{t("Schedule.revision")}</dt><dd>{value.revision}</dd></div><div><dt>{t("Setup.timeZone")}</dt><dd>{value.timeZone}</dd></div><div><dt>{t("Schedule.state")}</dt><dd>{selected ? t(`Schedule.${selected.state}`) : t("Schedule.none")}</dd></div></dl>
      {ack !== null && <p role="status">{t("Schedule.saved")}: {ack}</p>}{dirty && <p role="status">{t("Schedule.local")}</p>}
      {!editable && <p>{t("Schedule.locked")}</p>}
      <div className="schedule-layout"><aside className="schedule-settings-column">
        <Field id="schedule-stage" label={t("Schedule.stage")}>{attrs => <select {...attrs} className="ui-input" value={stageFilter} disabled={busy || !!formDirty} onChange={event => setParams(current => { const next = new URLSearchParams(current); if (event.target.value) next.set("stage", event.target.value); else next.delete("stage"); next.delete("session"); return next; })}><option value="">{t("Schedule.allStages")}</option>{value.stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select>}</Field>
        <Field id="schedule-session" label={t("Schedule.session")}>{attrs => <select {...attrs} className="ui-input" disabled={busy || !!formDirty || !sessions.length} value={selected?.id ?? ""} onChange={event => setParams(current => { const next = new URLSearchParams(current); next.set("session", event.target.value); return next; })}>{!sessions.length && <option value="">{t("Schedule.none")}</option>}{sessions.map(session => <option key={session.id} value={session.id}>{session.name}</option>)}</select>}</Field>
        <details className="schedule-settings"><summary>{t("Schedule.newStage")}</summary><form noValidate onSubmit={event => { event.preventDefault(); submit({ action: "CREATE_STAGE", id: crypto.randomUUID(), name: stageName }); }}><Field id="stage-name" label={t("Schedule.name")} required>{attrs => <Input {...attrs} disabled={disabled || dirty || !!formDirty && formDirty !== "stage"} maxLength={200} value={stageName} onChange={event => { setStageName(event.target.value); setFormDirty("stage"); }} />}</Field><Button type="submit" disabled={disabled || dirty || !!formDirty && formDirty !== "stage"}>{t("Schedule.newStage")}</Button></form></details>
        {!!value.stages.length && <SessionEditor key={`new-${formEpoch}`} value={value} disabled={disabled || dirty || !!formDirty && formDirty !== "new"} submit={submit} dirty={() => setFormDirty("new")} />}
        {selected && <SessionEditor key={`${selected.id}-${formEpoch}`} value={value} session={selected} disabled={disabled || dirty || selected.state !== "PAUSED" || !!formDirty && formDirty !== "edit"} submit={submit} dirty={() => setFormDirty("edit")} />}
      {formDirty && <Button variant="quiet" disabled={busy || !!operation} onClick={() => { if (!window.confirm(t("Roster.discard"))) return; setFormDirty(null); setFormEpoch(n => n + 1); setStageName(""); }}>{t("Entry.close")}</Button>}</aside><section className="schedule-queue" aria-labelledby="queue-title"><h2 id="queue-title">{selected?.name ?? t("Schedule.session")}</h2>
        {!selected ? <p>{t("Schedule.empty")}</p> : <>
          <p>{date(selected.startsAt)} ({value.timeZone})</p>
          {!ids.length && <p>{t("Schedule.noQueue")}</p>}
          <ol className="schedule-ledger">{ids.map((id, i) => {
            const slot = selected.slots.find(s => s.performanceId === id && s.state !== "REMOVED"); const fixed = !!slot && slot.state !== "WAITING";
            const previous = selected.slots.find(s => s.performanceId === ids[i - 1]); const next = selected.slots.find(s => s.performanceId === ids[i + 1]);
            return <li key={id}><div className="schedule-row-heading"><h3 id={`schedule-entry-${id}`} tabIndex={-1}>{i + 1}. {label(id)}</h3><span>{entry(id)?.studioName}</span>{slot && <span>{t(`Schedule.${slot.state}`)}</span>}</div>
              {!entry(id)?.eligible && <p>{t("Schedule.ineligible")}</p>}
              <div className="entry-actions schedule-row-actions"><Button variant="quiet" disabled={queueLocked || fixed || i === 0 || !!previous && previous.state !== "WAITING"} aria-label={`${t("Schedule.up")}: ${label(id)}`} onClick={() => move(id, -1)}>{t("Schedule.up")}</Button>
                <Button variant="quiet" disabled={queueLocked || fixed || i === ids.length - 1 || !!next && next.state !== "WAITING"} aria-label={`${t("Schedule.down")}: ${label(id)}`} onClick={() => move(id, 1)}>{t("Schedule.down")}</Button>
                <Button variant="quiet" disabled={queueLocked || fixed} aria-label={`${t("Schedule.remove")}: ${label(id)}`} onClick={() => { if (window.confirm(`${t("Schedule.remove")}: ${label(id)}?`)) editQueue(selected.id, ids.filter(p => p !== id)); }}>{t("Schedule.remove")}</Button>
                <Field id={`destination-${id}`} label={t("Schedule.destination")}>{attrs => <select {...attrs} className="ui-input" disabled={queueLocked || fixed} value="" onChange={event => { const target = event.target.value; if (!target) return; changed(); setQueues(current => current.map(q => q.sessionId === selected.id ? { ...q, performanceIds: q.performanceIds.filter(p => p !== id) } : q.sessionId === target ? { ...q, performanceIds: [...q.performanceIds, id] } : q)); }}><option value="">{t("Schedule.chooseDestination")}</option>{value.sessions.filter(s => s.id !== selected.id && s.state === "PAUSED").map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}</Field>
              </div></li>;
          })}</ol>
          <section className="schedule-unscheduled"><h3>{t("Schedule.unscheduled")}</h3><p>{t("Schedule.eligibility")}</p>
            <Button variant="secondary" disabled={queueLocked || !available.some(p => p.eligible)} onClick={() => editQueue(selected.id, [...ids, ...available.filter(p => p.eligible).map(p => p.id)])}>{t("Schedule.generate")}</Button><p className="ui-help">{t("Schedule.generateHelp")}</p>
            <ul className="schedule-ledger">{available.map(p => <li key={p.id}><span>{p.title ?? t("Performance.untitled")}<br />{p.studioName}</span>{p.eligible ? <Button variant="quiet" disabled={queueLocked} aria-label={`${t("Schedule.add")}: ${label(p.id)}`} onClick={() => editQueue(selected.id, [...ids, p.id])}>{t("Schedule.add")}</Button> : <><p>{t("Schedule.ineligible")}</p><Link to={`/admin/events/${encodedEvent}/performances`}>{t("Performance.title")}</Link></>}</li>)}</ul>
          </section>
        </>}
      </section></div>
      <div ref={previewTrigger} className="entry-actions schedule-save"><Button disabled={disabled || !selected || !!formDirty} onClick={() => { void validate(); }}>{t("Schedule.preview")}</Button></div>
      {preview && <section className="schedule-preview" aria-labelledby="schedule-preview-title"><h2 ref={previewHeading} id="schedule-preview-title" tabIndex={-1}>{t("Schedule.previewTitle")}</h2>
        {preview.conflicts.length ? <ul>{preview.conflicts.map((item, i) => <li key={i}><strong>{t(`Schedule.${item.kind}`)}</strong>: {item.performanceIds.map(label).join(", ")} {item.sessionIds.map(id => value.sessions.find(s => s.id === id)?.name).join(", ")}</li>)}</ul> : <p role="status">{t("Schedule.clear")}</p>}
        <ol className="schedule-ledger">{preview.times.map(time => <li key={`${time.sessionId}-${time.performanceId}`}><strong>{label(time.performanceId)}</strong><span><span className="schedule-mobile-label">{t("Schedule.session")}: </span>{value.sessions.find(s => s.id === time.sessionId)?.name}</span><span><span className="schedule-mobile-label">{t("Schedule.time")}: </span><time dateTime={time.startsAt}>{date(time.startsAt)}</time></span></li>)}</ol>
        <label className="entry-check"><input type="checkbox" checked={confirmed} disabled={disabled || !!preview.conflicts.length} onChange={event => setConfirmed(event.target.checked)} />{t("Schedule.confirm")}</label>
        <div className="entry-actions"><Button disabled={disabled || !confirmed || !!preview.conflicts.length} onClick={() => submit({ action: "SAVE", queues: preview.queues, previewToken: preview.previewToken })}>{t("Schedule.save")}</Button>
          <Button variant="quiet" disabled={busy} onClick={() => { setPreview(null); setConfirmed(false); previewTrigger.current?.querySelector("button")?.focus(); }}>{t("Schedule.cancelPreview")}</Button></div>
      </section>}
      <details className="schedule-history"><summary>{t("Schedule.history")}</summary><ol>{value.receipts.map(r => <li key={r.operationId}>{r.revision}: <time dateTime={r.createdAt}>{date(r.createdAt)}</time><code>{r.operationId}</code></li>)}</ol></details>
      <section className="schedule-print"><h2>{value.eventName}</h2><p>{t("Schedule.revision")}: {value.revision} ({value.timeZone})</p>{value.sessions.map(s => <section key={s.id}><h3>{value.stages.find(stage => stage.id === s.stageId)?.name}: {s.name}</h3><p>{date(s.startsAt)} ({value.timeZone})</p><ol>{s.slots.filter(slot => slot.state !== "REMOVED").sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(slot => <li key={slot.id}>{label(slot.performanceId)}: {entry(slot.performanceId)?.studioName} ({t(`Schedule.${slot.state}`)})</li>)}</ol></section>)}</section>
    </>}
  </div>;
}
export default function SchedulePage() { const { eventId = "" } = useParams(); const { user } = useAuth(); return <Workspace key={`${user?.id}:${eventId}`} eventId={eventId} />; }
