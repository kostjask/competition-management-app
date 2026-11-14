import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { EntryConfigurationSchema, EntryConfigurationBodySchema, type EntryConfigurationInput, type EntryOptions, type EntrySettings, type Event, type Category, type AgeGroup, type Format } from "@dance/schemas";
import { getEntryConfiguration, saveEntryConfiguration } from "../../api/entry-workflow";
import { getCategories } from "../../api/categories";
import { getAgeGroups } from "../../api/age-groups";
import { getFormats } from "../../api/formats";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { Button, Field, Input, ErrorSummary } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import EntryDeadline from "./EntryDeadline";
import EntryLoading from "./EntryLoading";
import EntryOptionCreator from "./EntryOptionCreator";
import { danceExpressPreset } from "./entryPreset";

const defaults: EntrySettings = { basic: { enabled: true, deadline: null }, final: { enabled: true, deadline: null },
  allowYounger: false, olderPercent: 0, requireTeacher: false, requireAuthor: false, nominations: [] };
type Data = { configuration: z.infer<typeof EntryConfigurationSchema>; categories: Category[]; ages: AgeGroup[]; formats: Format[] };
const mergeOptions = <T extends { id: string },>(local: T[], saved: T[]) => [...saved, ...local.filter(row => !saved.some(value => value.id === row.id))];
export default function EntryConfiguration({ event }: { event: Event }) {
  const { t, locale } = useTranslation(); const [data, setData] = useState<Data | null>(null);
  const [settings, setSettings] = useState<EntrySettings>(defaults); const [error, setError] = useState<UiError | null>(null);
  const [attempt, setAttempt] = useState(0); const [pending, setPending] = useState(false); const busy = useRef(false);
  const [frozen, setFrozen] = useState<EntryConfigurationInput | null>(null);
  const [newOptions, setNewOptions] = useState<EntryOptions>({ categories: [], ages: [], formats: [] });
  const [presetConfirmed, setPresetConfirmed] = useState(false);
  const presetDetails = useRef<HTMLDetailsElement>(null);
  const [categoryFilter, setCategoryFilter] = useState(""); const [ageFilter, setAgeFilter] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [comparison, setComparison] = useState<z.infer<typeof EntryConfigurationSchema> | null>(null);
  const [comparisonOptions, setComparisonOptions] = useState<Omit<Data, "configuration"> | null>(null);
  const [compared, setCompared] = useState(false);
  useEffect(() => { let active = true;
    void Promise.all([getEntryConfiguration(event.id), getCategories(event.id), getAgeGroups(event.id), getFormats(event.id)])
      .then(([configuration, categories, ages, formats]) => { if (active) { setData({ configuration, categories, ages, formats }); setSettings(configuration.settings ?? defaults); setError(null); } })
      .catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; };
  }, [event.id, attempt]);
  async function save() {
    if (!data || busy.current) return;
    const parsed = EntryConfigurationBodySchema.safeParse(frozen ?? { expectedRevision: data.configuration.revision, settings, options: newOptions });
    if (!parsed.success) { setError(toUiError(parsed.error)); return; }
    const body = parsed.data;
    setFrozen(body); busy.current = true; setPending(true); setError(null); setAcknowledged(false);
    try {
      const current = await getEntryConfiguration(event.id);
      const catalog = { categories: await getCategories(event.id), ages: await getAgeGroups(event.id), formats: await getFormats(event.id) };
      const optionsSaved = (["categories", "ages", "formats"] as const).every(key => (body.options?.[key] ?? []).every(row => catalog[key].some(existing => Object.entries(row).every(([name, value]) => Object.entries(existing).some(([key, saved]) => key === name && saved === value)))));
      const alreadySaved = JSON.stringify(current.settings) === JSON.stringify(body.settings) && optionsSaved;
      if (current.revision !== body.expectedRevision && !alreadySaved) {
        setComparison(current); setComparisonOptions(catalog); setCompared(false);
        throw new ApiError(409, "Entry setup changed", undefined, "CONFLICT", "concurrentChange");
      }
      const saved = alreadySaved ? current : await saveEntryConfiguration(event.id, body);
      setData({ ...data, configuration: saved }); setFrozen(null); setNewOptions({ categories: [], ages: [], formats: [] }); setAcknowledged(true);
    } catch (err: unknown) {
      setError(toUiError(err));
      if (err instanceof ApiError && err.statusCode === 409) {
        try {
          const [configuration, categories, ages, formats] = await Promise.all([getEntryConfiguration(event.id), getCategories(event.id), getAgeGroups(event.id), getFormats(event.id)]);
          setComparison(configuration); setComparisonOptions({ categories, ages, formats }); setCompared(false);
        } catch { /* Preserve local settings and the original conflict. */ }
      }
      if (frozen === null && err instanceof ApiError && [400, 403, 404, 409].includes(err.statusCode)) setFrozen(null);
    } finally { setPending(false); busy.current = false; }
  }
  const rulesFrozen = data?.configuration.frozen === true;
  function addOptions(options: EntryOptions) {
    if (!data) return;
    setNewOptions(current => ({ categories: [...current.categories, ...options.categories], ages: [...current.ages, ...options.ages], formats: [...current.formats, ...options.formats] }));
    setData({ ...data, categories: [...data.categories, ...options.categories.map(row => ({ ...row, eventId: event.id }))],
      ages: [...data.ages, ...options.ages.map(row => ({ ...row, eventId: event.id, maxAge: row.maxAge ?? null }))],
      formats: [...data.formats, ...options.formats.map(row => ({ ...row, eventId: event.id }))] });
    setAcknowledged(false);
  }
  return <section className="entry-configuration" aria-labelledby="entry-config-title"><h2 id="entry-config-title">{t("Entry.rules")}</h2>
    <ErrorSummary error={error} title={t("Entry.error")} />
    {comparison && data && <section className="entry-comparison" aria-labelledby="configuration-comparison-title"><h3 id="configuration-comparison-title">{t("Entry.comparison")}</h3>
      <p>{t("Performance.revision")} {comparison.revision}</p>
      {comparison.settings ? <><dl>{(["basic", "final"] as const).map(kind => <div key={kind}><dt>{t(`Entry.${kind}`)}</dt><dd>
        {t(comparison.settings?.[kind].enabled ? "Entry.enabled" : "Entry.disabled")}, {comparison.settings?.[kind].deadline
          ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: event.timeZone }).format(new Date(comparison.settings[kind].deadline)) : t("Entry.noDeadline")}
      </dd></div>)}<div><dt>{t("Entry.olderPercent")}</dt><dd>{comparison.settings.olderPercent}</dd></div>
        {(["allowYounger", "requireTeacher", "requireAuthor"] as const).map(key => <div key={key}><dt>{t(`Entry.${key}`)}</dt><dd>{t(comparison.settings?.[key] ? "Entry.enabled" : "Entry.disabled")}</dd></div>)}</dl>
        <ul>{comparison.settings.nominations.map((row, index) => <li key={index}>{data.categories.find(value => value.id === row.categoryId)?.name ?? t("Performance.unavailable")}, {data.ages.find(value => value.id === row.ageGroupId)?.name ?? t("Performance.unavailable")}, {data.formats.find(value => value.id === row.formatId)?.name ?? t("Performance.unavailable")}: {t("Entry.maxDuration")} {row.maxDurationSeconds}, {t("Entry.maxParticipants")} {row.maxParticipants ?? t("Entry.unlimited")}</li>)}</ul>
      </> : <p>{t("Entry.noSetup")}</p>}
      <label className="entry-check"><input type="checkbox" checked={compared} onChange={event => setCompared(event.target.checked)} />{t("Entry.compareConfirm")}</label>
      <div className="entry-actions"><Button variant="quiet" disabled={!compared || !comparisonOptions} onClick={() => {
        if (!comparisonOptions) return;
        setData({ configuration: comparison, categories: mergeOptions(data.categories, comparisonOptions.categories), ages: mergeOptions(data.ages, comparisonOptions.ages), formats: mergeOptions(data.formats, comparisonOptions.formats) });
        setFrozen(null); setComparison(null); setComparisonOptions(null); setError(null); setAcknowledged(false);
      }}>{t("Entry.applyCompared")}</Button>
        <Button variant="quiet" disabled={!compared || !comparisonOptions} onClick={() => {
          if (!comparisonOptions) return;
          setData({ ...comparisonOptions, configuration: comparison }); setNewOptions({ categories: [], ages: [], formats: [] });
          setCategoryFilter(""); setAgeFilter(""); setSettings(comparison.settings ?? defaults); setFrozen(null); setComparison(null); setComparisonOptions(null); setError(null); setAcknowledged(false);
        }}>{t("Entry.replaceSaved")}</Button></div>
    </section>}
    {!data ? error ? <Button onClick={() => setAttempt(value => value + 1)}>{t("Shell.retry")}</Button> : <EntryLoading /> : <form noValidate onChange={() => setAcknowledged(false)} onSubmit={event => { event.preventDefault(); void save(); }}>
      {rulesFrozen && <p>{t("Entry.frozen")}</p>}
      <fieldset disabled={pending || frozen !== null}><legend className="sr-only">{t("Entry.rules")}</legend>
        {(["basic", "final"] as const).map(kind => <div key={kind} className="entry-window">
          <label className="entry-check"><input type="checkbox" checked={settings[kind].enabled} disabled={rulesFrozen}
            onChange={event => setSettings(current => ({ ...current, [kind]: { ...current[kind], enabled: event.target.checked } }))} />{t(`Entry.${kind}`)}</label>
          <EntryDeadline key={`${kind}-${data.configuration.revision}`} id={`config-${kind}-deadline`} zone={event.timeZone} label={t("Entry.deadline")}
            value={settings[kind].deadline} change={deadline => setSettings(current => ({ ...current, [kind]: { ...current[kind], deadline } }))} />
        </div>)}
        <fieldset disabled={rulesFrozen}><legend>{t("Performance.configuration")}</legend>
          <details className="entry-option-creator" ref={presetDetails}><summary>{t("Entry.presetFull")}</summary><p>{t("Entry.presetHelp")}</p>
            <label className="entry-check"><input type="checkbox" checked={presetConfirmed} onChange={event => setPresetConfirmed(event.target.checked)} />{t("Entry.presetConfirm")}</label>
            <Button variant="quiet" disabled={!presetConfirmed} onClick={() => {
              const result = danceExpressPreset(data, settings, {
                stage: t("Entry.preset_stage"), contemporary: t("Entry.preset_contemporary"), lyrical: t("Entry.preset_lyrical"), folk: t("Entry.preset_folk"), folkStylized: t("Entry.preset_folkStylized"),
                show: t("Entry.preset_show"), street: t("Entry.preset_street"), classical: t("Entry.preset_classical"), ballroom: t("Entry.preset_ballroom"), kids: t("Entry.preset_kids"),
                big: t("Entry.preset_big"), small: t("Entry.preset_small"), duet: t("Entry.preset_duet"), solo: t("Entry.preset_solo"), kidsAge: t("Entry.preset_kidsAge"),
                age7: t("Entry.preset_age7"), age11: t("Entry.preset_age11"), age14: t("Entry.preset_age14"), age18: t("Entry.preset_age18"), age26: t("Entry.preset_age26"),
              }, () => crypto.randomUUID());
              addOptions({ categories: result.options.categories.filter(row => !data.categories.some(existing => existing.id === row.id)),
                ages: result.options.ages.filter(row => !data.ages.some(existing => existing.id === row.id)), formats: result.options.formats.filter(row => !data.formats.some(existing => existing.id === row.id)) });
              setSettings(result.settings); setPresetConfirmed(false); setCategoryFilter(result.settings.nominations.at(-1)?.categoryId ?? ""); setAgeFilter("");
              if (presetDetails.current) { presetDetails.current.open = false; presetDetails.current.querySelector("summary")?.focus(); }
            }}>{t("Entry.copyPreset")}</Button>
          </details>
          <EntryOptionCreator add={addOptions} />
          <label className="entry-check"><input type="checkbox" checked={settings.allowYounger} onChange={event => setSettings(current => ({ ...current, allowYounger: event.target.checked }))} />{t("Entry.allowYounger")}</label>
          <Field id="entry-older-percent" label={t("Entry.olderPercent")}>{attrs => <Input {...attrs} type="number" min={0} max={100} required value={settings.olderPercent}
            onChange={event => setSettings(current => ({ ...current, olderPercent: Number(event.target.value) }))} />}</Field>
          <p>{t("Entry.olderHelp")}</p>
          {(["requireTeacher", "requireAuthor"] as const).map(key => <label className="entry-check" key={key}><input type="checkbox" checked={settings[key]}
            onChange={event => setSettings(current => ({ ...current, [key]: event.target.checked }))} />{t(`Entry.${key}`)}</label>)}
          <h3>{t("Entry.nominations")}</h3><p>{t("Entry.nominationHelp")}</p>
          <div className="entry-nomination"><Field id="nomination-category-filter" label={t("Entry.filterCategory")}>{attrs => <select {...attrs} className="ui-input" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="">{t("Entry.allOptions")}</option>{data.categories.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select>}</Field>
            <Field id="nomination-age-filter" label={t("Entry.filterAge")}>{attrs => <select {...attrs} className="ui-input" value={ageFilter} onChange={event => setAgeFilter(event.target.value)}><option value="">{t("Entry.allOptions")}</option>{data.ages.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select>}</Field></div>
          {settings.nominations.map((row, index) => {
            if ((categoryFilter && row.categoryId !== categoryFilter) || (ageFilter && row.ageGroupId !== ageFilter)) return null;
            const update = (patch: Partial<EntrySettings["nominations"][number]>) => setSettings(current => ({ ...current, nominations: current.nominations.map((value, i) => i === index ? { ...value, ...patch } : value) }));
            return <fieldset className="entry-nomination" key={index}><legend>{t("Entry.nominations")} {index + 1}</legend>
              <Field id={`nomination-${index}-category`} label={t("Entry.field_categoryId")}>{attrs => <select {...attrs} className="ui-input" value={row.categoryId} onChange={event => update({ categoryId: event.target.value })}>{data.categories.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select>}</Field>
              <Field id={`nomination-${index}-age`} label={t("Entry.field_ageGroupId")}>{attrs => <select {...attrs} className="ui-input" value={row.ageGroupId} onChange={event => update({ ageGroupId: event.target.value })}>{data.ages.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select>}</Field>
              <Field id={`nomination-${index}-format`} label={t("Entry.field_formatId")}>{attrs => <select {...attrs} className="ui-input" value={row.formatId} onChange={event => update({ formatId: event.target.value })}>{data.formats.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select>}</Field>
              <Field id={`nomination-${index}-duration`} label={t("Entry.maxDuration")}>{attrs => <Input {...attrs} type="number" min={1} required value={row.maxDurationSeconds} onChange={event => update({ maxDurationSeconds: Number(event.target.value) })} />}</Field>
              <Field id={`nomination-${index}-count`} label={t("Entry.maxParticipants")}>{attrs => <Input {...attrs} type="number" min={1} value={row.maxParticipants ?? ""} onChange={event => update({ maxParticipants: event.target.value ? Number(event.target.value) : null })} />}</Field>
              <Button variant="quiet" onClick={() => setSettings(current => ({ ...current, nominations: current.nominations.filter((_, i) => i !== index) }))}>{t("Entry.remove")}</Button>
            </fieldset>;
          })}
          <Button variant="quiet" disabled={!data.categories.length || !data.ages.length || !data.formats.length} onClick={() => {
            const category = data.categories[0]; const age = data.ages[0]; const format = data.formats[0];
            if (category && age && format) setSettings(current => ({ ...current, nominations: [...current.nominations, { categoryId: category.id, ageGroupId: age.id, formatId: format.id, maxParticipants: format.maxParticipants, maxDurationSeconds: format.maxDurationSeconds }] }));
          }}>{t("Entry.add")}</Button>
        </fieldset>
      </fieldset>
      {frozen && <p>{t("Performance.retryHelp")}</p>}
      <Button type="submit" pending={pending} disabled={comparison !== null || (rulesFrozen && data.configuration.settings === null)}>{t(frozen ? "Entry.retry" : "Entry.save")}</Button>
      {acknowledged && <p role="status">{t("Entry.saved")}</p>}
    </form>}
  </section>;
}
