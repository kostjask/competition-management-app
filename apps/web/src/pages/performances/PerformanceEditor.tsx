import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { UpdatePerformanceBodySchema, type UpdatePerformanceInput, type Performance, type Category, type AgeGroup, type Format, type Dancer } from "@dance/schemas";
import { getCategories } from "../../api/categories";
import { getAgeGroups } from "../../api/age-groups";
import { getFormats } from "../../api/formats";
import { getDancers } from "../../api/dancers";
import { getPerformance, updatePerformance } from "../../api/performances";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { Button, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import EntryLoading from "./EntryLoading";

export default function PerformanceEditor({ row, saved, close }: { row: Performance; saved: (value: Performance) => void; close: () => void }) {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const [options, setOptions] = useState<{ categories: Category[]; ages: AgeGroup[]; formats: Format[]; dancers: Dancer[] } | null>(null);
  const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0);
  const [fields, setFields] = useState({ title: row.title ?? "", durationSec: row.durationSec?.toString() ?? "", teacher: row.teacher ?? "", author: row.author ?? "",
    categoryId: row.categoryId ?? "", ageGroupId: row.ageGroupId ?? "", formatId: row.formatId ?? "", dancerIds: row.participants.map(d => d.dancerId) });
  const [revision, setRevision] = useState(row.revision); const [pending, setPending] = useState(false); const lock = useRef(false);
  const [frozen, setFrozen] = useState<UpdatePerformanceInput | null>(null); const [acknowledged, setAcknowledged] = useState(false);
  const [comparison, setComparison] = useState<Performance | null>(null); const [compared, setCompared] = useState(false);
  useEffect(() => { if (options && hash.startsWith("#edit-")) document.getElementById(hash.slice(1))?.focus(); }, [hash, options]);
  useEffect(() => { let active = true;
    void Promise.all([getCategories(row.eventId), getAgeGroups(row.eventId), getFormats(row.eventId), getDancers(row.studioId)])
      .then(([categories, ages, formats, dancers]) => { if (active) { setOptions({ categories, ages, formats, dancers }); setError(null); } })
      .catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; };
  }, [row.eventId, row.studioId, attempt]);
  async function save() {
    if (lock.current) return;
    const parsed = UpdatePerformanceBodySchema.safeParse(frozen ?? { expectedRevision: revision,
      ...fields, title: fields.title.trim() || null, teacher: fields.teacher.trim() || null, author: fields.author.trim() || null,
      categoryId: fields.categoryId || null, ageGroupId: fields.ageGroupId || null, formatId: fields.formatId || null,
      durationSec: fields.durationSec ? Number(fields.durationSec) : null });
    if (!parsed.success) { setError(toUiError(parsed.error)); return; }
    const body = parsed.data; setFrozen(body); setPending(true); lock.current = true; setError(null); setAcknowledged(false);
    try {
      const current = frozen ? await getPerformance(row.eventId, row.id) : null;
      const matches = current && current.revision === body.expectedRevision + 1 && current.title === body.title && current.teacher === body.teacher &&
        current.author === body.author && current.durationSec === body.durationSec && current.categoryId === body.categoryId && current.ageGroupId === body.ageGroupId && current.formatId === body.formatId &&
        JSON.stringify(current.participants.map(d => d.dancerId).sort()) === JSON.stringify([...(body.dancerIds ?? [])].sort());
      const response = matches ? current : await updatePerformance(row.eventId, row.id, body);
      setRevision(response.revision); saved(response); setFrozen(null); setAcknowledged(true);
    } catch (err: unknown) {
      setError(toUiError(err));
      if (err instanceof ApiError && err.statusCode === 409) {
        try { setComparison(await getPerformance(row.eventId, row.id)); setCompared(false); } catch { /* Keep local fields and the original conflict. */ }
      }
      if (frozen === null && err instanceof ApiError && [400, 403, 404, 409].includes(err.statusCode)) setFrozen(null);
    } finally { setPending(false); lock.current = false; }
  }
  return <section className="entry-editor" aria-labelledby="entry-editor-title"><h2 id="entry-editor-title">{t("Entry.edit")}: {row.title ?? t("Performance.untitled")}</h2>
    <ErrorSummary error={error} title={t("Entry.error")} />
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
    {!options ? error ? <Button onClick={() => setAttempt(value => value + 1)}>{t("Shell.retry")}</Button> : <EntryLoading /> : <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={pending || frozen !== null}><legend>{t("Entry.basic")}</legend>
        <Field id="edit-title" label={t("Entry.field_title")}>{attrs => <Input {...attrs} maxLength={500} value={fields.title} onChange={event => setFields(current => ({ ...current, title: event.target.value }))} />}</Field>
        {(["categoryId", "ageGroupId", "formatId"] as const).map(key => <Field key={key} id={`edit-${key}`} label={t(`Entry.field_${key}`)}>{attrs => <select {...attrs} className="ui-input" value={fields[key]} onChange={event => setFields(current => ({ ...current, [key]: event.target.value }))}>
          <option value="">{t("Performance.notSelected")}</option>{(key === "categoryId" ? options.categories : key === "ageGroupId" ? options.ages : options.formats).map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select>}</Field>)}
      </fieldset><fieldset disabled={pending || frozen !== null}><legend>{t("Entry.final")}</legend>
        <Field id="edit-duration" label={t("Entry.field_durationSec")}>{attrs => <Input {...attrs} type="number" min={1} value={fields.durationSec} onChange={event => setFields(current => ({ ...current, durationSec: event.target.value }))} />}</Field>
        {(["teacher", "author"] as const).map(key => <Field key={key} id={`edit-${key}`} label={t(`Entry.field_${key}`)}>{attrs => <Input {...attrs} maxLength={500} value={fields[key]} onChange={event => setFields(current => ({ ...current, [key]: event.target.value }))} />}</Field>)}
        <fieldset id="edit-participants" tabIndex={-1}><legend>{t("Entry.field_participants")}</legend>{options.dancers.map(dancer => <label className="entry-check" key={dancer.id}>
          <input type="checkbox" checked={fields.dancerIds.includes(dancer.id)} onChange={event => setFields(current => ({ ...current, dancerIds: event.target.checked ? [...current.dancerIds, dancer.id] : current.dancerIds.filter(id => id !== dancer.id) }))} />{dancer.firstName} {dancer.lastName}</label>)}</fieldset>
      </fieldset>
      {frozen && <p>{t("Performance.retryHelp")}</p>}
      <div className="entry-actions"><Button type="submit" pending={pending} disabled={comparison !== null}>{t(frozen ? "Entry.retry" : "Entry.save")}</Button><Button variant="quiet" disabled={pending} onClick={close}>{t("Entry.close")}</Button></div>
      {acknowledged && <p role="status">{t("Entry.saved")}</p>}
    </form>}
  </section>;
}
