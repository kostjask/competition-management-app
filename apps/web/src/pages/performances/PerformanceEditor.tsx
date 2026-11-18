import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { UpdatePerformanceBodySchema, EntryFieldSchema, type UpdatePerformanceInput, type Performance, type Category, type AgeGroup, type Format, type Dancer, type EntryContext, type EntryField } from "@dance/schemas";
import { getCategories } from "../../api/categories";
import { getAgeGroups } from "../../api/age-groups";
import { getFormats } from "../../api/formats";
import { getDancers } from "../../api/dancers";
import { getPerformance, updatePerformance } from "../../api/performances";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { Button, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import EntryLoading from "./EntryLoading";
import { useUnsaved } from "../entries/useUnsaved";
import { formatIssue } from "../../i18n/errors";
import { getEntryContext } from "../../api/entry-workflow";

export default function PerformanceEditor({ row, saved, close, context: initialContext }: { context?: EntryContext; row: Performance; saved: (value: Performance) => void; close: () => void }) {
  const [context, setContext] = useState(initialContext);
  const { t, locale } = useTranslation();
  const [params, setParams] = useSearchParams();
  const search = params.get("participantQ") ?? "";
  const [dirty, setDirty] = useState(false);
  useUnsaved(dirty);
  const allowed = (field: EntryField) => !context || context.writableFields.includes(field);
  const { hash } = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const [options, setOptions] = useState<{ categories: Category[]; ages: AgeGroup[]; formats: Format[]; dancers: Dancer[] } | null>(null);
  const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  const [fields, setFields] = useState({ title: row.title ?? "", durationSec: row.durationSec?.toString() ?? "", teacher: row.teacher ?? "", author: row.author ?? "",
    categoryId: row.categoryId ?? "", ageGroupId: row.ageGroupId ?? "", formatId: row.formatId ?? "", dancerIds: row.participants.map(d => d.dancerId) });
  const [revision, setRevision] = useState(row.revision); const [pending, setPending] = useState(false); const lock = useRef(false);
  const [frozen, setFrozen] = useState<UpdatePerformanceInput | null>(null); const [acknowledged, setAcknowledged] = useState(false);
  const [comparison, setComparison] = useState<Performance | null>(null); const [compared, setCompared] = useState(false);
  async function refreshContext() {
    try { setContext(await getEntryContext(row.eventId, row.studioId, row.id)); }
    catch (err) { setError(toUiError(err)); }
  }
  useEffect(() => { if (options && hash.startsWith("#edit-")) document.getElementById(hash.slice(1))?.focus(); }, [hash, options]);
  useEffect(() => { let active = true;
    void Promise.all([context ? Promise.resolve(context.options.categories) : getCategories(row.eventId), context ? Promise.resolve(context.options.ages) : getAgeGroups(row.eventId), context ? Promise.resolve(context.options.formats) : getFormats(row.eventId), getDancers(row.studioId)])
      .then(([categories, ages, formats, dancers]) => { if (active) { setOptions({ categories, ages, formats, dancers }); setError(null); } })
      .catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; };
  }, [row.eventId, row.studioId, attempt, context]);
  async function save() {
    if (lock.current) return;
    const candidate = { ...fields, title: fields.title.trim() || null, teacher: fields.teacher.trim() || null, author: fields.author.trim() || null,
      categoryId: fields.categoryId || null, ageGroupId: fields.ageGroupId || null, formatId: fields.formatId || null,
      durationSec: fields.durationSec ? Number(fields.durationSec) : null };
    const changes: Record<string, unknown> = { expectedRevision: revision };
    for (const key of ["title", "teacher", "author", "categoryId", "ageGroupId", "formatId", "durationSec"] as const) {
      if (allowed(key)) changes[key] = candidate[key];
    }
    if (allowed("participants")) changes.dancerIds = fields.dancerIds;
    const parsed = UpdatePerformanceBodySchema.safeParse(frozen ?? changes);
    if (!parsed.success) { setError(toUiError(parsed.error)); return; }
    const body = parsed.data; setFrozen(body); setPending(true); lock.current = true; setError(null); setAcknowledged(false);
    try {
      const current = frozen ? await getPerformance(row.eventId, row.id) : null;
      const matches = current && current.revision === body.expectedRevision + 1 &&
        (["title", "teacher", "author", "durationSec", "categoryId", "ageGroupId", "formatId"] as const).every(key => body[key] === undefined || current[key] === body[key]) &&
        (body.dancerIds === undefined || JSON.stringify(current.participants.map(d => d.dancerId).sort()) === JSON.stringify([...body.dancerIds].sort()));
      const response = matches ? current : await updatePerformance(row.eventId, row.id, body);
      setRevision(response.revision); saved(response); setFrozen(null); setAcknowledged(true); setDirty(false);
      if (context) void refreshContext();
    } catch (err: unknown) {
      setError(toUiError(err));
      if (err instanceof ApiError && err.statusCode === 409) {
        try { setComparison(await getPerformance(row.eventId, row.id)); setCompared(false); } catch { /* Keep local fields and the original conflict. */ }
      }
      if (err instanceof ApiError && [400, 403, 404, 409, 422].includes(err.statusCode)) setFrozen(null);
    } finally { setPending(false); lock.current = false; }
  }
  function fieldError(key: string) { const issue = error?.issues.find(item => item.path[0] === key); return issue ? formatIssue(issue, locale) : undefined; }
  const format = options?.formats.find(row => row.id === fields.formatId);
  const nomination = context?.settings?.nominations.find(row => row.categoryId === fields.categoryId && row.ageGroupId === fields.ageGroupId && row.formatId === fields.formatId);
  const maxParticipants = nomination ? nomination.maxParticipants : format?.maxParticipants;
  return <section className="entry-editor participant-editor" aria-labelledby="entry-editor-title"><h2 id="entry-editor-title" ref={heading} tabIndex={-1}>{t("Entry.edit")}: {row.title ?? t("Performance.untitled")}</h2>
    {context && context.writableFields.length < EntryFieldSchema.options.length && <p>{t("Roster.locked")}</p>}
    <ErrorSummary error={error} title={t("Entry.error")} fields={{ title: "edit-title", categoryId: "edit-categoryId", ageGroupId: "edit-ageGroupId", formatId: "edit-formatId", durationSec: "edit-durationSec", teacher: "edit-teacher", author: "edit-author", dancerIds: "edit-participants" }} />
    {context && context.issues.some(issue => issue.performanceId === row.id) && <section className="entry-guidance"><h3>{t("Roster.checks")}</h3><p>{t("Roster.checksHelp")}</p><ul>{context.issues.filter(issue => issue.performanceId === row.id).map((issue, index) => <li key={index}><Link to={`#edit-${issue.field}`}>{t(`Entry.field_${issue.field}`)}</Link>: {t(`Entry.issue_${issue.reason}`)}</li>)}</ul></section>}
    {comparison && <section className="entry-comparison" aria-labelledby="entry-comparison-title"><h3 id="entry-comparison-title">{t("Entry.comparison")}</h3>
      <p>{t("Performance.revision")} {comparison.revision}</p>
      <dl>{(["title", "teacher", "author", "durationSec", "categoryId", "ageGroupId", "formatId"] as const).map(key => <div key={key}><dt>{t(`Entry.field_${key}`)}</dt><dd>
        {key === "categoryId" ? options?.categories.find(value => value.id === comparison[key])?.name ?? t("Performance.notSelected") : key === "ageGroupId" ? options?.ages.find(value => value.id === comparison[key])?.name ?? t("Performance.notSelected")
          : key === "formatId" ? options?.formats.find(value => value.id === comparison[key])?.name ?? t("Performance.notSelected") : comparison[key] ?? t("Performance.notSelected")}
      </dd></div>)}<div><dt>{t("Entry.field_participants")}</dt><dd>{comparison.participants.map(value => `${value.dancer.firstName} ${value.dancer.lastName}`).join(", ") || t("Performance.notSelected")}</dd></div></dl>
      <label className="entry-check"><input type="checkbox" checked={compared} onChange={event => setCompared(event.target.checked)} />{t("Entry.compareConfirm")}</label>
      <div className="entry-actions"><Button variant="quiet" disabled={!compared} onClick={() => { setRevision(comparison.revision); setFrozen(null); setComparison(null); setError(null); setAcknowledged(false); }}>{t("Entry.applyCompared")}</Button>
        <Button variant="quiet" disabled={!compared} onClick={() => { setRevision(comparison.revision); setFields({ title: comparison.title ?? "", durationSec: comparison.durationSec?.toString() ?? "", teacher: comparison.teacher ?? "", author: comparison.author ?? "",
          categoryId: comparison.categoryId ?? "", ageGroupId: comparison.ageGroupId ?? "", formatId: comparison.formatId ?? "", dancerIds: comparison.participants.map(value => value.dancerId) });
          saved(comparison); setFrozen(null); setComparison(null); setError(null); setAcknowledged(false); }}>{t("Entry.replaceSaved")}</Button></div>
    </section>}
    {!options ? error ? <Button onClick={() => setAttempt(value => value + 1)}>{t("Shell.retry")}</Button> : <EntryLoading /> : <form noValidate onChange={() => { setDirty(true); setAcknowledged(false); }} onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={pending || frozen !== null}><legend>{t("Entry.basic")}</legend>
        <Field id="edit-title" label={t("Entry.field_title")} error={fieldError("title")}>{attrs => <Input {...attrs} disabled={!allowed("title")} maxLength={500} value={fields.title} onChange={event => setFields(current => ({ ...current, title: event.target.value }))} />}</Field>
        {(["categoryId", "ageGroupId", "formatId"] as const).map(key => <Field key={key} id={`edit-${key}`} label={t(`Entry.field_${key}`)} error={fieldError(key)}>{attrs => <select {...attrs} disabled={!allowed(key)} className="ui-input" value={fields[key]} onChange={event => setFields(current => ({ ...current, [key]: event.target.value }))}>
          <option value="">{t("Performance.notSelected")}</option>{(key === "categoryId" ? options.categories : key === "ageGroupId" ? options.ages : options.formats).map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select>}</Field>)}
      </fieldset><fieldset disabled={pending || frozen !== null}><legend>{t("Entry.final")}</legend>
        <Field id="edit-durationSec" label={t("Entry.field_durationSec")} error={fieldError("durationSec")}>{attrs => <Input {...attrs} disabled={!allowed("durationSec")} type="number" min={1} value={fields.durationSec} onChange={event => setFields(current => ({ ...current, durationSec: event.target.value }))} />}</Field>
        {(["teacher", "author"] as const).map(key => <Field key={key} id={`edit-${key}`} label={t(`Entry.field_${key}`)}>{attrs => <Input {...attrs} disabled={!allowed(key)} maxLength={500} value={fields[key]} onChange={event => setFields(current => ({ ...current, [key]: event.target.value }))} />}</Field>)}
        {format && <p>{t("Roster.limits", { minimum: format.minParticipants, maximum: nomination?.maxDurationSeconds ?? format.maxDurationSeconds })}{maxParticipants !== undefined && maxParticipants !== null && <> {t("Roster.participantLimit", { maximum: maxParticipants })}</>}</p>}
        <fieldset className="entry-participants" id="edit-participants" tabIndex={-1} disabled={!allowed("participants")}><legend>{t("Entry.field_participants")}</legend>
          <p>{t("Roster.selected", { count: fields.dancerIds.length })}</p>
          <Field id="participant-search" label={t("Roster.search")}>{attrs => <Input {...attrs} maxLength={200} value={search} onChange={event => setParams(current => { const next = new URLSearchParams(current); if (event.target.value) next.set("participantQ", event.target.value); else next.delete("participantQ"); return next; }, { replace: true })} />}</Field>
          {!options.dancers.length && <p>{t("Roster.empty")}</p>}
          {fields.dancerIds.filter(id => !options.dancers.some(d => d.id === id)).map(id => <label className="entry-check" key={id}><input type="checkbox" checked onChange={() => setFields(current => ({ ...current, dancerIds: current.dancerIds.filter(value => value !== id) }))} />{t("Roster.unavailableParticipant")}</label>)}
          <div className="entry-participant-list">{options.dancers.filter(d => (d.firstName + " " + d.lastName).toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))).map(dancer => <label className="entry-check" key={dancer.id}>
            <input type="checkbox" checked={fields.dancerIds.includes(dancer.id)} onChange={event => setFields(current => ({ ...current, dancerIds: event.target.checked ? [...current.dancerIds, dancer.id] : current.dancerIds.filter(id => id !== dancer.id) }))} />{dancer.firstName} {dancer.lastName}</label>)}</div>
          {search && !options.dancers.some(d => (d.firstName + " " + d.lastName).toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))) && <p>{t("Roster.noMatch")}</p>}
        </fieldset>
      </fieldset>

      {frozen && <p>{t("Performance.retryHelp")}</p>}
      <div className="entry-actions">{context && <Button variant="quiet" disabled={pending || frozen !== null} onClick={() => { void refreshContext(); }}>{t("Roster.refresh")}</Button>}<Button type="submit" pending={pending} disabled={comparison !== null || (!frozen && context !== undefined && !context.writableFields.some(field => field !== "roster" && field !== "entries"))}>{t(frozen ? "Entry.retry" : "Entry.save")}</Button><Button variant="quiet" disabled={pending || frozen !== null} onClick={close}>{t("Entry.close")}</Button></div>
      {acknowledged && <p role="status">{t("Entry.saved")}</p>}
    </form>}
  </section>;
}
