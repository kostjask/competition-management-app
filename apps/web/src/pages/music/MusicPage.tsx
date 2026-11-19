import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { MusicPolicySchema, MusicCommandSchema, type MusicPolicy, type MusicTrack, type MusicWorkspace } from "@dance/schemas";
import { getMusic, createMusic, commandMusic, configureMusic, uploadMusic, musicAudioUrl } from "../../api/music";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { Button, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { useAuth } from "../../auth/useAuth";
import { useUnsaved } from "../entries/useUnsaved";
import EntryLoading from "../performances/EntryLoading";
import "./music.css";
import type { TranslationKey } from "../../i18n/translations";

type Operation = { success: TranslationKey; cancellable?: boolean; run: (signal: AbortSignal, progress: (value: number) => void) => Promise<unknown> };
function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  return now;
}
function PolicyEditor({ eventId, value, execute, disabled, dirty }: { eventId: string; value: MusicWorkspace["configuration"]; execute: (op: Operation) => void; disabled: boolean; dirty: (value: boolean) => void }) {
  const { t } = useTranslation(); const initial = value.policy;
  const [revision, setRevision] = useState(value.revision);
  const [fields, setFields] = useState({ maxBytes: initial ? String(initial.maxBytes / 1048576) : "", maxDurationMs: initial ? String(initial.maxDurationMs / 1000) : "", deadline: initial?.deadline.slice(0, 16) ?? "", exceptionUntil: initial?.exceptionUntil.slice(0, 16) ?? "" });
  const [types, setTypes] = useState<MusicPolicy["allowedMime"]>(initial?.allowedMime ?? []); const [error, setError] = useState<UiError | null>(null);
  return <details className="music-policy"><summary>{t("Music.configure")}</summary><form noValidate onChange={() => dirty(true)} onSubmit={event => {
    event.preventDefault(); const parsed = MusicPolicySchema.safeParse({ ...fields, maxBytes: Math.round(Number(fields.maxBytes) * 1048576), maxDurationMs: Math.round(Number(fields.maxDurationMs) * 1000),
      deadline: fields.deadline ? `${fields.deadline}:00.000Z` : "", exceptionUntil: fields.exceptionUntil ? `${fields.exceptionUntil}:00.000Z` : "", allowedMime: types });
    if (!parsed.success) { setError(toUiError(parsed.error)); return; } setError(null);
    execute({ success: "Music.policySaved", run: async () => { const result = await configureMusic(eventId, { expectedRevision: revision, policy: parsed.data }); setRevision(result.revision); dirty(false); return result; } });
  }}>
    <ErrorSummary title={t("Entry.error")} error={error} />
    <fieldset disabled={disabled}><legend>{t("Music.types")}</legend>{(["audio/mpeg", "audio/wav"] as const).map(type => <label className="entry-check" key={type}><input type="checkbox" checked={types.includes(type)} onChange={event => setTypes(current => event.target.checked ? [...current, type] : current.filter(value => value !== type))} />{t(type === "audio/mpeg" ? "Music.mp3" : "Music.wav")}</label>)}</fieldset>
    {(["maxBytes", "maxDurationMs", "deadline", "exceptionUntil"] as const).map(key => <Field key={key} id={`music-policy-${key}`} label={t(key === "maxDurationMs" ? "Music.maxDuration" : `Music.${key}`)}>{attrs => <Input {...attrs} type={key === "maxBytes" || key === "maxDurationMs" ? "number" : "datetime-local"} {...((key === "maxBytes" || key === "maxDurationMs") && { min: 0, step: "any" })} value={fields[key]} disabled={disabled} onChange={event => setFields(current => ({ ...current, [key]: event.target.value }))} />}</Field>)}
    {revision !== value.revision && <Button variant="quiet" disabled={disabled} onClick={() => setRevision(value.revision)}>{t("Music.compared")}</Button>}
    <Button type="submit" disabled={disabled || revision !== value.revision}>{t("Entry.save")}</Button>
  </form></details>;
}

function TrackEditor({ track, value, performanceId, execute, disabled, dirty }: { track: MusicTrack; value: MusicWorkspace; performanceId: string | null; execute: (op: Operation) => void; disabled: boolean; dirty: (value: boolean) => void }) {
  const { t, locale } = useTranslation(); const [file, setFile] = useState<File | null>(null); const [replace, setReplace] = useState(false);
  const [reason, setReason] = useState(""); const [until, setUntil] = useState(""); const [previewError, setPreviewError] = useState(false);
  const [error, setError] = useState<UiError | null>(null); const version = track.currentVersion; const policy = value.configuration.policy;
  const now = useClock();
  const writable = track.state === "DRAFT" && !!policy && (Date.parse(policy.deadline) > now || !!track.correctionUntil && Date.parse(track.correctionUntil) > now);
  const input = useRef<HTMLInputElement>(null);
  function command(action: "ATTACH" | "CONFIRM" | "ACCEPT" | "REOPEN") {
    const parsed = MusicCommandSchema.safeParse({ operationId: crypto.randomUUID(), expectedRevision: track.revision, action,
      ...(["CONFIRM", "ACCEPT"].includes(action) && { versionId: version?.id }), ...(action === "ATTACH" && { performanceId }),
      ...(action === "REOPEN" && { reason, until: until ? `${until}:00.000Z` : "" }) });
    if (!parsed.success) { setError(toUiError(parsed.error)); return; } setError(null);
    const messages = { ATTACH: "Music.attached", CONFIRM: "Music.confirmed", ACCEPT: "Music.accepted", REOPEN: "Music.reopened" } as const;
    execute({ success: messages[action], run: async () => { const result = await commandMusic(track.eventId, track.studioId, track.id, parsed.data); dirty(false); return result; } });
  }
  return <section className="music-track" aria-labelledby="music-track-title"><h2 id="music-track-title">{t("Music.current")}</h2>
    <ErrorSummary title={t("Entry.error")} error={error} />
    <dl className="music-ledger"><div><dt>{t("Performance.revision")}</dt><dd>{track.revision}</dd></div><div><dt>{t("Music.title")}</dt><dd>{t(`Music.${track.state}`)}</dd></div>
      <div className="music-wide-fact"><dt>{t("Music.current")}</dt><dd>{version?.displayName ?? t("Music.noFile")}</dd></div>
      {version && <><div><dt>{t("Music.size")}</dt><dd>{new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(version.byteLength / 1048576)}</dd></div><div><dt>{t("Music.duration")}</dt><dd>{new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(version.durationMs / 1000)}</dd></div></>}
      {track.correctionUntil && <div><dt>{t("Music.until")}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(track.correctionUntil))}</dd></div>}
    </dl>
    {!track.performanceId && <><p>{t("Music.unattached")}</p>{performanceId && <Button variant="quiet" disabled={disabled || !writable} onClick={() => command("ATTACH")}>{t("Music.attach")}</Button>}</>}
    {version && <><audio key={version.id} aria-label={`${t("Music.current")}: ${version.displayName}`} controls preload="none" crossOrigin="use-credentials" src={musicAudioUrl(track.eventId, track.studioId, track.id, version.id)} onError={() => setPreviewError(true)} />{previewError && <p role="alert">{t("Music.previewError")}</p>}</>}
    {track.state === "DRAFT" && <form noValidate onSubmit={event => {
      event.preventDefault(); if (!file || !policy) return;
      const body = { operationId: crypto.randomUUID(), expectedRevision: track.revision, policyRevision: value.configuration.revision };
      execute({ success: "Music.fileSaved", cancellable: true, run: async (signal, progress) => { const result = await uploadMusic(track.eventId, track.studioId, track.id, body, file, signal, progress); setFile(null); setReplace(false); if (input.current) input.current.value = ""; dirty(false); return result; } });
    }}>
      <Field id="music-file" label={t("Music.file")}>{attrs => <input {...attrs} className="ui-input" ref={input} type="file" accept={policy?.allowedMime.join(",")} disabled={disabled || !writable || !value.configuration.providerReady} onChange={event => { setFile(event.target.files?.[0] ?? null); setReplace(false); dirty(!!event.target.files?.length); }} />}</Field>
      {version && <label className="entry-check"><input type="checkbox" checked={replace} disabled={disabled} onChange={event => setReplace(event.target.checked)} />{t("Music.replaceConfirm")}</label>}
      {version && <p>{t("Music.confirmEffect")}</p>}<div className="entry-actions"><Button type="submit" disabled={disabled || !file || !writable || !!version && !replace}>{t(version ? "Music.replace" : "Music.upload")}</Button>
        {version && <Button variant="quiet" disabled={disabled || !!file || !writable} onClick={() => command("CONFIRM")}>{t("Music.confirm")}</Button>}</div>
    </form>}
    {value.organizer && track.state === "CONFIRMED" && <Button disabled={disabled} onClick={() => command("ACCEPT")}>{t("Music.accept")}</Button>}
    {value.organizer && track.state !== "DRAFT" && <form noValidate onChange={() => dirty(true)} onSubmit={event => { event.preventDefault(); command("REOPEN"); }}>
      <Field id="music-reason" label={t("Music.reason")}>{attrs => <Input {...attrs} maxLength={500} disabled={disabled} value={reason} onChange={event => setReason(event.target.value)} />}</Field>
      <Field id="music-until" label={t("Music.until")}>{attrs => <Input {...attrs} type="datetime-local" disabled={disabled} value={until} onChange={event => setUntil(event.target.value)} />}</Field>
      <Button type="submit" disabled={disabled}>{t("Music.reopen")}</Button>
    </form>}
  </section>;
}

function Workspace({ eventId, studioId }: { eventId: string; studioId: string }) {
  const { t, locale } = useTranslation(); const [params, setParams] = useSearchParams(); const performanceId = params.get("performance");
  const [value, setValue] = useState<MusicWorkspace | null>(null); const [error, setError] = useState<UiError | null>(null); const [readError, setReadError] = useState<UiError | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null); const [pending, setPending] = useState(false); const [progress, setProgress] = useState<number | null>(null);
  const [compared, setCompared] = useState(false); const [receipt, setReceipt] = useState<TranslationKey | null>(null); const [draft, setDraft] = useState(false); const [policyDirty, setPolicyDirty] = useState(false);
  const abort = useRef<AbortController | null>(null); const lock = useRef(false); const heading = useRef<HTMLHeadingElement>(null);
  useUnsaved(draft || policyDirty || !!operation);
  async function refresh() { try { setValue(await getMusic(eventId, studioId)); setReadError(null); setCompared(true); } catch (err) { setReadError(toUiError(err)); } }
  useEffect(() => { let active = true; void getMusic(eventId, studioId).then(value => { if (active) { setValue(value); setReadError(null); } }).catch((err: unknown) => { if (active) setReadError(toUiError(err)); });
    return () => { active = false; abort.current?.abort(); }; }, [eventId, studioId]);
  async function execute(op: Operation) {
    if (lock.current) return; lock.current = true; setPending(true); setOperation(op); setCompared(false); setError(null); setReceipt(null); setProgress(null);
    const controller = new AbortController(); abort.current = controller;
    try { await op.run(controller.signal, setProgress); setOperation(null); setReceipt(op.success); await refresh(); heading.current?.focus(); }
    catch (err) { setError(toUiError(err)); }
    finally { setPending(false); lock.current = false; abort.current = null; }
  }
  const rows = value?.tracks.filter(track => !performanceId || !track.performanceId || track.performanceId === performanceId) ?? [];
  const track = rows.find(row => row.id === params.get("track")) ?? rows.find(row => row.performanceId === performanceId) ?? rows[0];
  const policy = value?.configuration.policy;
  const now = useClock();
  return <div className="event-workbench music-workbench"><header className="event-masthead"><h1 ref={heading} tabIndex={-1}>{t("Music.title")}</h1>
    <Link to={performanceId ? `/events/${eventId}/studios/${studioId}/performances/${performanceId}/edit` : `/events/${eventId}/studio`}>{t("Entry.close")}</Link></header>
    {value && <p>{value.eventName}<br />{value.studioName}</p>}<p>{t("Music.help")}</p><ErrorSummary title={t("Entry.error")} error={error ?? readError} />
    <div className="entry-actions"><Button variant="quiet" disabled={pending} onClick={() => { void refresh(); }}>{t("Music.refresh")}</Button>
      {operation && !pending && <><Button onClick={() => { void execute(operation); }}>{t("Entry.retry")}</Button><Button variant="quiet" disabled={!compared} onClick={() => { setOperation(null); setError(null); }}>{t("Music.compared")}</Button></>}
    </div>
    {operation && !pending && <p role="status">{t("Music.uncertain")}</p>}
    {pending && <div role="status"><label htmlFor="music-progress">{t("Music.progress")}</label><progress id="music-progress" max={100} {...(progress !== null && { value: progress })} />{progress === 100 && <p>{t("Music.processing")}</p>}
      {operation?.cancellable && <Button variant="quiet" onClick={() => abort.current?.abort()}>{t("Music.cancel")}</Button>}</div>}
    {receipt && <p role="status" data-music-receipt>{t(receipt)}</p>}
    {!value ? !readError && <EntryLoading /> : <>
      {value.organizer && <PolicyEditor eventId={eventId} value={value.configuration} execute={op => { void execute(op); }} disabled={pending || !!operation} dirty={setPolicyDirty} />}
      {!policy || !value.configuration.providerReady ? <p>{t("Music.disabled")}</p> : <dl className="music-ledger music-limits">
        <div><dt>{t("Music.types")}</dt><dd>{policy.allowedMime.map(value => value === "audio/mpeg" ? t("Music.mp3") : t("Music.wav")).join(", ")}</dd></div>
        <div><dt>{t("Music.maxBytes")}</dt><dd>{new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(policy.maxBytes / 1048576)}</dd></div><div><dt>{t("Music.maxDuration")}</dt><dd>{new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(policy.maxDurationMs / 1000)}</dd></div>
        <div><dt>{t("Music.deadline")}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(policy.deadline))}</dd></div>
      </dl>}
      {rows.length > 1 && <Field id="music-track-select" label={t("Music.title")}>{attrs => <select {...attrs} className="ui-input" value={track?.id ?? ""} disabled={pending || !!operation || draft} onChange={event => { setDraft(false); setParams(current => { const next = new URLSearchParams(current); next.set("track", event.target.value); return next; }); }}>
        {rows.map(row => <option key={row.id} value={row.id}>{row.currentVersion?.displayName ?? `${t("Music.noFile")} ${row.id}`}</option>)}</select>}</Field>}
      {!rows.length && <p>{t("Music.noTracks")}</p>}
      {(!performanceId || !rows.some(row => row.performanceId === performanceId)) && <Button disabled={pending || !!operation || draft || !policy || !value.configuration.providerReady || Date.parse(policy.deadline) <= now} onClick={() => {
        const body = { operationId: crypto.randomUUID(), trackId: crypto.randomUUID(), ...(performanceId && { performanceId }) };
        void execute({ success: "Music.trackCreated", run: async () => { const result = await createMusic(eventId, studioId, body); setParams(current => { const next = new URLSearchParams(current); next.set("track", result.track.id); return next; }); return result; } });
      }}>{t("Music.newTrack")}</Button>}
      {track && <TrackEditor key={track.id} track={track} value={value} performanceId={performanceId} disabled={pending || !!operation} dirty={setDraft} execute={op => { void execute(op); }} />}
    </>}
  </div>;
}
export default function MusicPage() {
  const { eventId = "", studioId = "" } = useParams(); const { user } = useAuth();
  return <Workspace key={`${user?.id}:${eventId}:${studioId}`} eventId={eventId} studioId={studioId} />;
}
