import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { CmsPayloadSchema, CmsIndexSchema, cmsReadiness, type CmsDocument, type CmsLocale, type CmsPreviewSchema, type CmsReceiptSchema, type CmsRevisionSchema, type ErrorReason } from "@dance/schemas";
import type { z } from "zod";
import { contentApi } from "../../api/content";
import { getEvents } from "../../api/events";
import { ApiError, toUiError } from "../../api/error";
import { errorMessages } from "../../i18n/feedback";
import { useTranslation } from "../../i18n/useTranslation";
import { contentTranslations, type ContentKey } from "../../i18n/contentTranslations";
import { ContentField, HandoffField } from "./ContentFields";
import { contentFields, fieldLabel, record, setField } from "./fieldDefinitions";
import { ContentPreview } from "./ContentPreview";
import { ContentFacts } from "./ContentFacts";
import "./content.css";

type Index = z.infer<typeof CmsIndexSchema>;
type Preview = { documentId: string; revisionId: string; result: z.infer<typeof CmsPreviewSchema> };
type Pending = { documentId: string; version: number; operationId: string; path: string; body: Record<string, unknown>; file?: File; conflict?: boolean };
export default function ContentPage() {
  const { locale } = useTranslation(); const t = (key: ContentKey) => contentTranslations[key][locale]; const location = useLocation(); const { editionId } = useParams(); const [query, setQuery] = useSearchParams();
  const [index, setIndex] = useState<Index>(); const [base, setBase] = useState<CmsDocument>(); const [local, setLocal] = useState<unknown>();
  const [error, setError] = useState<ErrorReason>(); const [errors, setErrors] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [pending, setPending] = useState<Pending>();
  const [compared, setCompared] = useState<CmsDocument>(); const [retryAllowed, setRetryAllowed] = useState(false); const [ack, setAck] = useState<z.infer<typeof CmsReceiptSchema>>();
  const [previewResult, setPreview] = useState<Preview>(); const [history, setHistory] = useState<z.infer<typeof CmsRevisionSchema>[]>([]);
  const [confirmation, setConfirmation] = useState<{ path: string; body: Record<string, unknown>; text: string }>(); const [reviewed, setReviewed] = useState(false);
  const [file, setFile] = useState<File>(); const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [festival, setFestival] = useState(""); const [copy, setCopy] = useState(""); const [copySections, setCopySections] = useState<string[]>([]);
  const [eventId, setEventId] = useState(""); const [migrationReviewed, setMigrationReviewed] = useState(false);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getEvents>>>();
  const errorRef = useRef<HTMLDivElement>(null); const confirmationRef = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLElement | null>(null);
  const previewRef = useRef<HTMLElement>(null); const previewTrigger = useRef<HTMLElement | null>(null);
  const selected = index?.documents.find(row => editionId ? row.editionId === editionId : row.kind === (location.pathname.endsWith("/studio") ? "STUDIO_SITE" : "FESTIVAL_PORTAL"));
  const activeId = selected?.id; const dirty = base !== undefined && JSON.stringify(local) !== JSON.stringify(base.draft.payload);
  // Queued responses must stay bound to their document even during navigation commits.
  const preview = previewResult?.documentId === activeId ? previewResult?.result : undefined;
  const reviewRevision = preview ? previewResult?.revisionId : undefined;
  const previewScope = useRef({ active: true });
  // Invalidate the previous request at commit, before passive effects run.
  useLayoutEffect(() => {
    const scope = { active: true }; previewScope.current = scope;
    return () => { scope.active = false; };
  }, [activeId]);
  const previewLocale: CmsLocale = query.get("previewLocale") === "en" ? "en" : query.get("previewLocale") === "ru" ? "ru" : "et";
  const fail = (failure: unknown) => setError(toUiError(failure).reason);
  const load = async () => { try { setError(undefined); setIndex(await contentApi.index()); } catch (failure) { fail(failure); } };
  useEffect(() => { let active = true; void contentApi.index().then(value => { if (active) setIndex(value); }).catch(failure => { if (active) setError(toUiError(failure).reason); }); return () => { active = false; }; }, []);
  // Reset only when the selected identity changes. Locale and readbacks retain work.
  if (selected && base?.id !== selected.id) {
    setBase(selected); setLocal(selected.draft.payload); setEventId(selected.facts?.eventId ?? ""); setHistory([]); setPreview(undefined); setErrors([]); setAck(undefined); setCompared(undefined); setPending(undefined);
    setConfirmation(undefined); setReviewed(false); setRetryAllowed(false); setMigrationReviewed(false); setFile(undefined);
    setBusy(false);
  }
  if (index && !selected && base) { setBase(undefined); setLocal(undefined); }
  useEffect(() => { if (error || errors.length) errorRef.current?.focus(); }, [error, errors]);
  useEffect(() => { if (confirmation) confirmationRef.current?.focus(); }, [confirmation]);
  useEffect(() => { if (preview) previewRef.current?.focus(); }, [preview]);
  useEffect(() => { if (!dirty && !pending) return; const before = (event: BeforeUnloadEvent) => { event.preventDefault(); }; window.addEventListener("beforeunload", before); return () => window.removeEventListener("beforeunload", before); }, [dirty, pending]);
  const execute = async (operation: Pending) => {
    setBusy(true); setError(undefined); setAck(undefined);
    try {
      const result = operation.file ? await contentApi.upload(operation.documentId, operation.file, operation.operationId, operation.version) : await contentApi.command(operation.path, operation.body);
      const latest = await contentApi.index(); setIndex(latest); const doc = latest.documents.find(row => row.id === activeId);
      setAck(result); setPending(undefined); setCompared(undefined); setRetryAllowed(false); setPreview(undefined); setConfirmation(undefined); setReviewed(false);
      if (doc) { setBase(doc); if (operation.path.endsWith("/revisions")) setLocal(doc.draft.payload); }
      trigger.current?.focus();
    } catch (failure) {
      fail(failure);
      setPreview(undefined); setConfirmation(undefined); setReviewed(false);
      if (failure instanceof ApiError && failure.issues.length) setErrors(failure.issues.map(issue => issue.path.filter((part, index) => !(index === 0 && part === "payload")).join(".")));
      if (failure instanceof ApiError && [0, 401, 409, 500, 502, 503].includes(failure.statusCode)) setPending({ ...operation, conflict: failure.statusCode === 409 }); else setPending(undefined);
    } finally { setBusy(false); }
  };
  const command = (path: string, extras: Record<string, unknown> = {}, document = base, upload?: File) => {
    if (!document || pending || busy) return;
    const operationId = crypto.randomUUID(); const body = { operationId, expectedVersion: document.version, ...extras };
    const operation: Pending = { documentId: document.id, version: document.version, operationId, path, body, ...(upload && { file: upload }) }; setPending(operation); void execute(operation);
  };
  const reconcile = async () => {
    if (!pending) return; setBusy(true); setError(undefined);
    try {
      let targetId = pending.documentId;
      if (pending.version === 0) {
        const listing = await contentApi.index(); const existing = listing.documents.find(row => row.kind === pending.body.kind);
        if (!existing) { setRetryAllowed(true); return; } targetId = existing.id;
      }
      let result: z.infer<typeof CmsReceiptSchema> | undefined;
      try { result = await contentApi.receipt(targetId, pending.operationId); } catch (failure) { if (!(failure instanceof ApiError && failure.statusCode === 404)) throw failure; }
      let current: CmsDocument;
      try { current = await contentApi.detail(targetId); }
      catch (failure) { if (!result && pending.version === 0 && failure instanceof ApiError && failure.statusCode === 404) { setRetryAllowed(true); return; } throw failure; }
      setCompared(current); setRetryAllowed(!result && !pending.conflict && current.version === pending.version); if (result) setAck(result);
    } catch (failure) { fail(failure); } finally { setBusy(false); }
  };
  const save = () => { const parsed = CmsPayloadSchema.safeParse(local); if (!parsed.success) { setErrors(parsed.error.issues.map(issue => issue.path.join("."))); return; } setErrors([]); command(`documents/${base!.id}/revisions`, { payload: parsed.data }); };
  const showPreview = async (revision = base?.draft.id) => {
    if (!base || !revision) return;
    const scope = previewScope.current;
    previewTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setBusy(true); setError(undefined); setPreview(undefined); setConfirmation(undefined); setReviewed(false);
    try {
      const result = await contentApi.preview(base.id, revision, previewLocale);
      if (scope.active) setPreview({ documentId: base.id, revisionId: revision, result });
    } catch (failure) { if (scope.active) fail(failure); }
    finally { if (scope.active) setBusy(false); }
  };
  const confirm = (path: string, body: Record<string, unknown>, text: string) => { trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setConfirmation({ path, body, text }); setReviewed(false); };
  const keys = base ? Object.keys(record(local)).filter(key => key !== "kind" && (key in contentFields || key === "handoff")) : [];
  const section = keys.includes(query.get("section") ?? "") ? query.get("section")! : "title";
  const update = (key: string, value: unknown) => { setLocal((previous: unknown) => setField(previous, [key], value)); setPreview(undefined); setConfirmation(undefined); setReviewed(false); setAck(undefined); setErrors([]); };
  const parsed = CmsPayloadSchema.safeParse(local); const issues = preview?.issues ?? (parsed.success ? cmsReadiness(parsed.data) : []); const locked = busy || !!pending || !!base?.archived;
  const chooseSection = (key: string) => setQuery(previous => { previous.set("section", key); return previous; });
  const focusField = (path: string) => {
    chooseSection(path.split(".")[0] ?? "title");
    setTimeout(() => {
      const fieldId = path.replace(/\.sourceText$/, "-sourceText").replace(/\.translations\.(et|en|ru)$/, "-$1");
      const container = document.getElementById(`cms-${fieldId}`) ?? document.getElementById(`cms-${path.split(".")[0]}`);
      const target = container?.matches("input,select,textarea,button,a") ? container : container?.querySelector("input,select,textarea,button,a");
      if (target instanceof HTMLElement) { const details = target.closest("details"); if (details) details.open = true; target.focus(); }
    }, 0);
  };
  const initialize = () => {
    if (pending || busy) return;
    const operationId = crypto.randomUUID(); const operation: Pending = { operationId, documentId: operationId, version: 0, path: "documents", body: { operationId, expectedVersion: 0, kind: location.pathname.endsWith("/studio") ? "STUDIO_SITE" : "FESTIVAL_PORTAL" } };
    setPending(operation); void execute(operation);
  };
  const leave = (event: React.MouseEvent) => { if (pending || busy || (dirty && !window.confirm(t("leave")))) event.preventDefault(); };
  return <div className="event-workbench cms-workbench">
    <header className="cms-mast"><h1>{t("title")}</h1><nav aria-label={t("title")}><Link to="/content/studio" onClick={leave}>{t("studio")}</Link><Link to="/content/festivals" onClick={leave}>{t("festivals")}</Link><Link to="/admin" onClick={leave}>{t("operations")}</Link></nav></header>
    {(error || errors.length > 0) && <div className="cms-error-summary" ref={errorRef} tabIndex={-1} role="alert"><p>{error ? errorMessages[error][locale] : t("fieldInvalid")}</p>{errors.map((path, i) => <p key={i}><a href={`#cms-${path}`} onClick={event => { event.preventDefault(); focusField(path); }}>{fieldLabel(path.split(".")[0] ?? "title", locale)}: {t("fieldInvalid")}</a></p>)}<button onClick={() => void load()} disabled={busy}>{t("retry")}</button></div>}
    {!index && !error && <div role="status" className="cms-loading"><p>{t("loading")}</p><div /><div /><div /></div>}
    {index && <>
      {!selected && !editionId && <section><p>{t("empty")}</p><button disabled={busy || !!pending} onClick={initialize}>{t("add")} {location.pathname.endsWith("/studio") ? t("studio") : t("festivals")}</button></section>}
      {!base && pending && <section className="cms-recovery"><p>{t("uncertain")}</p><button disabled={busy} onClick={() => void reconcile()}>{t("reconcile")}</button><button disabled={busy || !retryAllowed} onClick={() => void execute(pending)}>{t("retrySame")}</button>{compared && <button onClick={() => { setPending(undefined); void load(); }}>{t("useServer")}</button>}</section>}
      {editionId && !selected && <p role="status">{errorMessages.recordNotFound[locale]}</p>}
      {location.pathname !== "/content/studio" && <section className="cms-index"><h2>{t("festivals")}</h2>{index.documents.filter(row => row.editionId).map(row => <div className="cms-index-row" key={row.id}><Link to={`/content/editions/${row.editionId}`} onClick={leave}>{row.label}</Link><span>{row.archived ? t("archived") : row.publishedRevisionId ? t("published") : t("unpublished")}</span></div>)}
        <details><summary>{t("createFestival")}</summary><fieldset disabled={locked}><label htmlFor="cms-new-name">{t("name")}</label><input id="cms-new-name" value={name} onChange={e => setName(e.target.value)} /><label htmlFor="cms-new-slug">{t("slug")}</label><input id="cms-new-slug" value={slug} onChange={e => setSlug(e.target.value)} /><button onClick={() => command("festivals", { name, slug }, index.documents.find(row => row.kind === "FESTIVAL_PORTAL"))}>{t("createFestival")}</button></fieldset></details>
        <details><summary>{t("createEdition")}</summary><fieldset disabled={locked}><label htmlFor="cms-new-festival">{t("festivalId")}</label><select id="cms-new-festival" value={festival} onChange={e => setFestival(e.target.value)}><option value="">{t("none")}</option>{index.festivals.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select><label htmlFor="cms-edition-slug">{t("slug")}</label><input id="cms-edition-slug" value={slug} onChange={e => setSlug(e.target.value)} />
          <label htmlFor="cms-copy">{t("copy")}</label><select id="cms-copy" value={copy} onChange={e => setCopy(e.target.value)}><option value="">{t("none")}</option>{index.documents.filter(row => row.editionId).map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select><p>{t("copyHelp")}</p>{(["title", "introduction", "brand", "rules", "judges", "contact"] as const).map(key => <label key={key}><input type="checkbox" checked={copySections.includes(key)} onChange={e => setCopySections(previous => e.target.checked ? [...previous, key] : previous.filter(row => row !== key))} />{fieldLabel(key, locale)}</label>)}<button onClick={() => command("editions", { festivalId: festival, slug, copyDocumentId: copy || null, sections: copySections }, index.documents.find(row => row.kind === "FESTIVAL_PORTAL"))}>{t("createEdition")}</button></fieldset></details>
      </section>}
      {base && <><h2>{base.kind === "STUDIO_SITE" ? t("studio") : base.kind === "FESTIVAL_PORTAL" ? t("festivals") : base.label}</h2><div className="cms-layout"><aside className="cms-ledger" aria-label={t("version")}>
        <dl><dt>{t("version")}</dt><dd>{base.version}</dd><dt>{t("draft")}</dt><dd>{base.draft.number}<details><summary>{t("currentRevision")}</summary><small>{base.draft.id}</small></details></dd><dt>{t("published")}</dt><dd>{base.publishedRevisionId === base.draft.id ? t("publishedCurrent") : base.publishedRevisionId ? <small>{base.publishedRevisionId}</small> : t("unpublished")}</dd></dl>
        {dirty && <p role="status">{t("unsaved")}</p>}{busy && <p role="status">{t("pending")}</p>}{ack && <div role="status"><p>{t("saved")}</p><details><summary>{t("receiptIdentity")}</summary><small>{ack.operationId}</small><p>{t("version")}: {ack.version}</p></details>{ack.version !== base.version && <p>{t("receiptOld")}</p>}</div>}
        <div className="cms-actions"><button className="cms-primary" disabled={locked || !dirty} onClick={save}>{t("save")}</button><button disabled={locked || dirty} onClick={() => void showPreview()}>{t("preview")}</button></div>{dirty ? <p>{t("saveFirst")}</p> : !preview && !pending && <p>{t("previewFirst")}</p>}
        {issues.length > 0 && <ul>{issues.map((issue, i) => <li key={i}><a href={`#cms-${issue.path}`} onClick={event => { event.preventDefault(); focusField(issue.path); }}>{fieldLabel(issue.path.split(".")[0]!, locale)}: {t(issue.reason === "asset" ? "assetIssue" : issue.reason === "review" ? "reviewIssue" : issue.reason === "internalDisabled" ? "internalDisabled" : "required")}</a></li>)}</ul>}
        <label htmlFor="cms-preview-locale">{t("locale")}</label><select id="cms-preview-locale" value={previewLocale} disabled={busy} onChange={e => { setQuery(previous => { previous.set("previewLocale", e.target.value); return previous; }); setPreview(undefined); }}>{["et","en","ru"].map(lang => <option key={lang}>{lang}</option>)}</select>
        <div className="cms-actions"><button disabled={locked || dirty || !preview || preview.issues.length > 0} onClick={() => confirm(`documents/${base.id}/publish`, { revisionId: reviewRevision ?? base.draft.id, reviewed: true, policyDigest: preview?.policyDigest }, t("publishConfirm"))}>{t("publish")}</button><button disabled={locked || !base.publishedRevisionId} onClick={() => confirm(`documents/${base.id}/unpublish`, {}, t("impact"))}>{t("unpublish")}</button></div><details><summary>{t("impactTitle")}</summary><p className="cms-help">{t("impact")}</p></details>
        <button disabled={busy || !!pending} onClick={() => { setBusy(true); void contentApi.history(base.id).then(setHistory).catch(fail).finally(() => setBusy(false)); }}>{t("history")}</button>{history.map(row => <div className="cms-history-row" key={row.id}><span>{row.number}</span><time dateTime={row.createdAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.createdAt))}</time><button disabled={locked || dirty} onClick={() => void showPreview(row.id)}>{t("rollback")}</button></div>)}{history.length >= 20 && <button disabled={busy} onClick={() => { setBusy(true); void contentApi.history(base.id, history.at(-1)?.number).then(rows => setHistory(previous => [...previous,...rows])).catch(fail).finally(() => setBusy(false)); }}>{t("older")}</button>}
      </aside><div className="cms-editor">
        {pending && <section className="cms-recovery" aria-label={t("uncertain")}><h3>{t("uncertain")}</h3><button disabled={busy} onClick={() => void reconcile()}>{t("reconcile")}</button><button disabled={busy || !retryAllowed} onClick={() => void execute(pending)}>{t("retrySame")}</button>{compared && <><h3>{t("server")}</h3><p>{t("version")}: {compared.version}</p><fieldset disabled><ContentField field={contentFields[section] ?? contentFields.title!} value={record(compared.draft.payload)[section]} path={`comparison.${section}`} locale={locale} root={compared.draft.payload} document={compared} festivals={index.festivals} onChange={() => {}} /></fieldset><button disabled={busy} onClick={() => { setBase(compared); setLocal(compared.draft.payload); setPending(undefined); setCompared(undefined); setRetryAllowed(false); }}>{t("useServer")}</button><button disabled={busy || pending.path !== `documents/${base.id}/revisions`} onClick={() => { setBase(compared); setPending(undefined); setCompared(undefined); setRetryAllowed(false); }}>{t("keepLocal")}</button></>}</section>}
        {confirmation && <div ref={confirmationRef} tabIndex={-1} className="cms-confirm" role="region" aria-label={t("confirm")}><p>{confirmation.text}</p><label><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />{t("confirm")}</label><button disabled={!reviewed || busy || !!pending} onClick={() => command(confirmation.path, confirmation.body)}>{t("confirm")}</button><button onClick={() => { setConfirmation(undefined); trigger.current?.focus(); }} disabled={busy}>{t("cancel")}</button></div>}
        {(preview ? preview.facts : base.facts) && <ContentFacts facts={(preview ? preview.facts : base.facts)!} locale={locale} />}
        <label htmlFor="cms-section">{t("section")}</label><select id="cms-section" value={section} onChange={e => chooseSection(e.target.value)}>{keys.map(key => <option key={key} value={key}>{fieldLabel(key, locale)}</option>)}</select>
        <fieldset disabled={locked || (!!base.facts && ["startsOn","endsOn","location"].includes(section))} className="cms-form">{section === "handoff" ? <HandoffField value={record(local).handoff} locale={locale} onChange={value => update("handoff", value)} /> : <ContentField field={contentFields[section]!} value={record(local)[section]} path={section} locale={locale} root={local} document={base} festivals={index.festivals} errors={errors} onChange={value => update(section, value)} />}</fieldset>
        {preview && <section className="cms-preview-result" ref={previewRef} tabIndex={-1} aria-label={t("preview")}><p>{t("currentRevision")}: {reviewRevision}</p><button onClick={() => previewTrigger.current?.focus()}>{t("backToEditor")}</button><ContentPreview content={preview.content} locale={locale} /></section>}
        <details><summary>{t("assets")}</summary><fieldset disabled={locked}><p>{t("uploadHelp")}</p><label htmlFor="cms-upload">{t("upload")}</label><input id="cms-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0])} /><button disabled={!file} onClick={() => command(`documents/${base.id}/assets`, {}, base, file)}>{t("upload")}</button>{base.assets.map(asset => <div className="cms-asset-row" key={asset.id}><small>{asset.id}</small><p>{asset.width} × {asset.height} / {t(asset.retired || asset.rights === "REVOKED" ? "rightsRevoked" : asset.rights === "APPROVED" ? "rightsApproved" : "rightsPending")}</p><div className="cms-actions"><button disabled={asset.retired || asset.rights !== "PENDING"} onClick={() => confirm(`documents/${base.id}/assets/${asset.id}/review`, { approved: true }, t("rightsConfirm"))}>{t("approve")}</button><button disabled={asset.retired || asset.rights === "REVOKED"} onClick={() => confirm(`documents/${base.id}/assets/${asset.id}/review`, { approved: false }, t("rightsConfirm"))}>{t("revoke")}</button><button disabled={asset.retired || asset.rights === "REVOKED"} onClick={() => confirm(`documents/${base.id}/assets/${asset.id}/retire`, {}, t("rightsConfirm"))}>{t("retire")}</button></div></div>)}</fieldset></details>
        {base.editionId && <details onToggle={event => { if (event.currentTarget.open && !events) void getEvents().then(setEvents).catch(fail); }}><summary>{t("link")}</summary><fieldset disabled={locked || !!base.publishedRevisionId}><label htmlFor="cms-event">{t("competition")}</label><select id="cms-event" value={eventId} onChange={e => setEventId(e.target.value)}><option value="">{t("none")}</option>{events?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select><label><input type="checkbox" checked={migrationReviewed} onChange={e => setMigrationReviewed(e.target.checked)} />{t("migrationReviewed")}</label><button disabled={!events} onClick={() => confirm(`editions/${base.editionId}/link`, { eventId: eventId || null, migrationReviewed }, t("migrationReviewed"))}>{t("link")}</button><button onClick={() => confirm(`documents/${base.id}/archive`, {}, t("archiveConfirm"))}>{t("archive")}</button></fieldset></details>}
      </div></div></>}
    </>}
  </div>;
}
