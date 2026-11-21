import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ScoringSetupInputSchema, scoringUnits, type ScoringSetupInput, type ScoringCommand, type ScoringWorkspace, type ScoringPreview } from "@dance/schemas";
import { getScoring, previewScoring, commandScoring } from "../../api/scoring";
import { toUiError, type UiError } from "../../api/error";
import { Button, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import { useAuth } from "../../auth/useAuth";
import { useUnsaved } from "../entries/useUnsaved";
import EntryLoading from "../performances/EntryLoading";
import "./scoring.css";

type Template = ScoringSetupInput["templates"][number];
type CriterionDraft = Omit<Template["criteria"][number], "weightBps"> & { weight: string };
type TemplateDraft = { id: string; name: string; criteria: CriterionDraft[] };
const languages = ["et", "en", "ru"] as const;
const newCriterion = (): CriterionDraft => ({ id: crypto.randomUUID(), label: { et: "", en: "", ru: "" }, instructions: { et: "", en: "", ru: "" }, min: "", max: "", step: "", weight: "" });
const sourceKey = (workspace: ScoringWorkspace) => JSON.stringify([workspace.revision, workspace.eventStage, workspace.setup, workspace.categories, workspace.sessions, workspace.judges]);

function Workspace({ eventId }: { eventId: string }) {
  const { t, locale } = useTranslation();
  const [value, setValue] = useState<ScoringWorkspace | null>(null), [setup, setSetup] = useState<ScoringSetupInput | null>(null);
  const [draft, setDraft] = useState<TemplateDraft | null>(null), [dirty, setDirty] = useState(false), [invalid, setInvalid] = useState(false);
  const [comparison, setComparison] = useState<ScoringWorkspace | null>(null), [preview, setPreview] = useState<ScoringPreview | null>(null);
  const [operation, setOperation] = useState<ScoringCommand | null>(null), [confirmed, setConfirmed] = useState(false), [ack, setAck] = useState<number | null>(null);
  const [error, setError] = useState<UiError | null>(null), [busy, setBusy] = useState(false); const lock = useRef(false);
  const previewHeading = useRef<HTMLHeadingElement>(null), previewTrigger = useRef<HTMLButtonElement>(null), draftHeading = useRef<HTMLHeadingElement>(null);
  useUnsaved(dirty || !!operation);
  useEffect(() => { let active = true; void getScoring(eventId).then(result => { if (active) { setValue(result); setSetup(result.setup); } }).catch(err => { if (active) setError(toUiError(err)); }); return () => { active = false; }; }, [eventId]);
  useEffect(() => { if (preview) previewHeading.current?.focus(); }, [preview]);
  const draftId = draft?.id;
  useEffect(() => { if (draftId) draftHeading.current?.focus(); }, [draftId]);
  const changed = () => { setDirty(true); setPreview(null); setConfirmed(false); setAck(null); };
  const editable = value && ["PRE_REGISTRATION", "REGISTRATION_OPEN", "DATA_REVIEW", "SCHEDULED", "LIVE"].includes(value.eventStage) && value.sessions.every(s => s.state !== "RUNNING");
  const disabled = busy || !!operation || !editable || !!comparison && !!value && sourceKey(comparison) !== sourceKey(value);
  const decimal = (text: string) => text.trim().replace(",", ".");
  const target = (id: string) => value?.sessions.find(s => s.id === id)?.name ?? value?.judges.find(j => j.id === id)?.name ?? value?.categories.find(c => c.id === id)?.name ?? id;
  const candidate = () => ScoringSetupInputSchema.parse({ ...setup, templates: [...(setup?.templates ?? []), ...(draft ? [{ ...draft, criteria: draft.criteria.map(({ weight, ...c }) => ({ ...c, min: decimal(c.min), max: decimal(c.max), step: decimal(c.step), weightBps: scoringUnits(decimal(weight)) / 10 })) }] : [])] });
  const fieldError = invalid ? t("Scoring.invalid") : undefined;

  function editCriterion(id: string, update: Partial<CriterionDraft>) { changed(); setDraft(current => current && ({ ...current, criteria: current.criteria.map(c => c.id === id ? { ...c, ...update } : c) })); }
  function moveCriterion(index: number, delta: number) {
    if (!draft) return; const next = [...draft.criteria]; const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    const id = next[index]!.id; [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
    changed(); setDraft({ ...draft, criteria: next }); requestAnimationFrame(() => document.getElementById(`criterion-${id}`)?.focus());
  }
  async function validate() {
    if (!value || lock.current) return; lock.current = true; setBusy(true); setError(null); setConfirmed(false); setInvalid(false);
    let proposed: ScoringSetupInput;
    try { proposed = candidate(); } catch (err) { setInvalid(true); setError(toUiError(err)); lock.current = false; setBusy(false); return; }
    try { const result = await previewScoring(eventId, value.revision, proposed); setPreview(result); }
    catch (err) { setError(toUiError(err)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function execute(body: ScoringCommand) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(null); setOperation(body);
    try {
      const result = await commandScoring(eventId, body); setValue(result.workspace); setSetup(result.workspace.setup); setDraft(null); setDirty(false); setPreview(null); setConfirmed(false); setComparison(null); setOperation(null); setAck(result.revision); setInvalid(false);
      const current = await getScoring(eventId); if (sourceKey(current) !== sourceKey(result.workspace)) setComparison(current);
    } catch (err) { setError(toUiError(err)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function compare() {
    if (lock.current) return; lock.current = true; setBusy(true); setError(null);
    try { const current = await getScoring(eventId); if (!value) { setValue(current); setSetup(current.setup); } else setComparison(current); }
    catch (err) { setError(toUiError(err)); }
    finally { lock.current = false; setBusy(false); }
  }
  const ledger = (templates: Template[]) => templates.map(template => <section key={template.id} className="scoring-version"><h3>{template.name}</h3>
    <p className="scoring-id">{t("Scoring.version")}: {template.id}</p><ol>{template.criteria.map(c => <li key={c.id}><strong>{c.label[locale]}</strong><span>{t("Scoring.min")}: {c.min}; {t("Scoring.max")}: {c.max}; {t("Scoring.step")}: {c.step}; {t("Scoring.weight")}: {c.weightBps / 100}</span>{c.instructions[locale] && <p>{c.instructions[locale]}</p>}</li>)}</ol></section>);
  const mapping = (state: ScoringSetupInput) => <><dl>{value?.categories.map(c => <div key={c.id}><dt>{c.name}</dt><dd>{state.templates.find(template => template.id === state.bindings.find(b => b.categoryId === c.id)?.templateId)?.name ?? t("Schedule.none")}</dd></div>)}</dl>
    {value?.sessions.map(session => <p key={session.id}>{session.name}: {state.panels.find(p => p.sessionId === session.id)?.judgeIds.map(id => value.judges.find(j => j.id === id)?.name ?? id).join(", ") || t("Schedule.none")}</p>)}</>;
  return <div className="event-workbench scoring-workbench"><header className="event-masthead"><div><h1>{t("Scoring.title")}</h1><p>{value?.eventName}</p></div><Link to={`/events/${encodeURIComponent(eventId)}`}>{t("Staff.eventDetails")}</Link></header>
    <p>{t("Scoring.help")}</p><ErrorSummary title={t("Entry.error")} error={error} />
    {invalid && <p role="alert">{t("Scoring.invalid")}</p>}{busy && <p role="status">{t("Access.loading")}</p>}
    <div className="entry-actions"><Button variant="quiet" disabled={busy} onClick={() => { void compare(); }}>{t("Scoring.compare")}</Button>
      {operation && <Button disabled={busy} onClick={() => { void execute(operation); }}>{t("Entry.retry")}</Button>}
      {operation && comparison && <Button variant="quiet" disabled={busy} onClick={() => { setOperation(null); setPreview(null); setConfirmed(false); }}>{t("Scoring.resolve")}</Button>}</div>
    {operation && !busy && <p role="status">{t("Scoring.uncertain")}</p>}
    {comparison && <section className="scoring-preview"><h2>{t("Scoring.compare")}</h2><p>{t("Scoring.revision")}: {comparison.revision}</p>{ledger(comparison.setup.templates)}{mapping(comparison.setup)}
      {!!comparison.blockers.length && <ul>{comparison.blockers.map((b, i) => <li key={i}>{t(`Scoring.${b.kind}`)}: {target(b.targetId)}</li>)}</ul>}
      <Button variant="secondary" disabled={busy || !!operation} onClick={() => { if (dirty && !window.confirm(t("Roster.discard"))) return; setValue(comparison); setSetup(comparison.setup); setComparison(null); setDraft(null); setDirty(false); setPreview(null); setConfirmed(false); setInvalid(false); }}>{t("Scoring.useServer")}</Button></section>}
    {!value || !setup ? !error && <EntryLoading /> : <>
      <p>{t("Scoring.revision")}: {value.revision}</p>{ack !== null && <p role="status">{t("Scoring.saved")}: {ack}</p>}{dirty && <p role="status">{t("Scoring.local")}</p>}
      {!editable && <p>{t("Scoring.locked")}</p>}
      <div className="scoring-layout"><section aria-labelledby="rubric-title"><h2 id="rubric-title">{t("Scoring.rubric")}</h2><p>{t("Scoring.immutable")}</p>
        {!setup.templates.length && <p>{t("Scoring.empty")}</p>}
        {setup.templates.map(template => <details key={template.id} className="scoring-version"><summary>{template.name}</summary>{ledger([template])}<Button variant="secondary" disabled={disabled || !!draft || setup.templates.length >= 100} onClick={() => { changed(); setDraft({ id: crypto.randomUUID(), name: template.name, criteria: template.criteria.map(({ weightBps, ...c }) => ({ ...c, id: crypto.randomUUID(), weight: String(weightBps / 100) })) }); }}>{t("Scoring.copy")}</Button></details>)}
        {!draft && <Button disabled={disabled || setup.templates.length >= 100} onClick={() => { changed(); setDraft({ id: crypto.randomUUID(), name: "", criteria: [newCriterion()] }); }}>{t("Scoring.newVersion")}</Button>}
        {draft && <section className="scoring-editor"><h3 ref={draftHeading} tabIndex={-1}>{t("Scoring.newVersion")}</h3><Field id="rubric-name" label={t("Scoring.name")} error={invalid && !draft.name.trim() ? fieldError : undefined} required>{attrs => <Input {...attrs} value={draft.name} maxLength={200} disabled={disabled} onChange={event => { changed(); setDraft({ ...draft, name: event.target.value }); }} />}</Field>
          <p>{t("Scoring.exactHelp")}</p><p>{t("Scoring.weightsHelp")}</p>
          <ol className="scoring-criteria">{draft.criteria.map((criterion, index) => <li id={`criterion-${criterion.id}`} tabIndex={-1} key={criterion.id}><fieldset disabled={disabled}><legend>{t("Scoring.criterion")} {index + 1}</legend>
            {languages.map(language => <details key={language} open={language === locale || undefined}><summary lang={language}>{language.toUpperCase()}</summary>
              <Field id={`label-${criterion.id}-${language}`} label={`${t("Scoring.label")} (${language})`} error={invalid && !criterion.label[language].trim() ? fieldError : undefined} required>{attrs => <Input {...attrs} lang={language} value={criterion.label[language]} maxLength={200} onChange={event => editCriterion(criterion.id, { label: { ...criterion.label, [language]: event.target.value } })} />}</Field>
              <Field id={`instructions-${criterion.id}-${language}`} label={`${t("Scoring.instructions")} (${language})`}>{attrs => <textarea {...attrs} className="ui-input" lang={language} maxLength={1000} value={criterion.instructions[language]} onChange={event => editCriterion(criterion.id, { instructions: { ...criterion.instructions, [language]: event.target.value } })} />}</Field>
            </details>)}
            <div className="scoring-numbers">{(["min", "max", "step", "weight"] as const).map(key => <Field key={key} id={`${key}-${criterion.id}`} label={t(`Scoring.${key}`)} error={invalid ? fieldError : undefined} required>{attrs => <Input {...attrs} inputMode="decimal" autoComplete="off" value={criterion[key]} onChange={event => editCriterion(criterion.id, { [key]: event.target.value })} />}</Field>)}</div>
            <div className="entry-actions"><Button variant="quiet" disabled={index === 0} aria-label={`${t("Scoring.up")}: ${index + 1}`} onClick={() => moveCriterion(index, -1)}>{t("Scoring.up")}</Button><Button variant="quiet" disabled={index === draft.criteria.length - 1} aria-label={`${t("Scoring.down")}: ${index + 1}`} onClick={() => moveCriterion(index, 1)}>{t("Scoring.down")}</Button>
              <Button variant="quiet" disabled={draft.criteria.length === 1} aria-label={`${t("Scoring.remove")}: ${index + 1}`} onClick={() => { changed(); setDraft({ ...draft, criteria: draft.criteria.filter(c => c.id !== criterion.id) }); requestAnimationFrame(() => draftHeading.current?.focus()); }}>{t("Scoring.remove")}</Button></div>
          </fieldset></li>)}</ol><Button variant="secondary" disabled={disabled || draft.criteria.length >= 30} onClick={() => { changed(); setDraft({ ...draft, criteria: [...draft.criteria, newCriterion()] }); }}>{t("Scoring.add")}</Button>
          <Button variant="quiet" disabled={busy || !!operation} onClick={() => { if (!window.confirm(t("Roster.discard"))) return; changed(); setDraft(null); setSetup({ ...setup, bindings: setup.bindings.filter(b => b.templateId !== draft.id) }); setInvalid(false); }}>{t("Entry.close")}</Button>
        </section>}
      </section><aside className="scoring-settings"><section><h2>{t("Scoring.categories")}</h2>{!value.categories.length && <p>{t("Scoring.noCategories")}</p>}
        {value.categories.map(category => <Field key={category.id} id={`category-${category.id}`} label={category.name}>{attrs => <select {...attrs} className="ui-input" disabled={disabled} value={setup.bindings.find(b => b.categoryId === category.id)?.templateId ?? ""} onChange={event => { changed(); setSetup({ ...setup, bindings: [...setup.bindings.filter(b => b.categoryId !== category.id), ...(event.target.value ? [{ categoryId: category.id, templateId: event.target.value }] : [])] }); }}><option value="">{t("Schedule.none")}</option>{[...setup.templates, ...(draft ? [draft] : [])].map(template => <option key={template.id} value={template.id}>{template.name || t("Scoring.newVersion")} ({template.id.slice(0, 8)})</option>)}</select>}</Field>)}
      </section><section><h2>{t("Scoring.panels")}</h2><p>{t("Scoring.panelHelp")}</p>{!value.sessions.length && <p>{t("Scoring.noSessions")}</p>}{!value.judges.some(j => j.eligible) && <p>{t("Scoring.noJudges")}</p>}
        <Link to={`/admin/events/${encodeURIComponent(eventId)}/staff`}>{t("Staff.title")}</Link>{value.sessions.map(session => <fieldset key={session.id} disabled={disabled}><legend>{session.name}</legend>{value.judges.map(judge => { const selected = setup.panels.find(p => p.sessionId === session.id)?.judgeIds.includes(judge.id) ?? false; return <label className="entry-check" key={judge.id}><input type="checkbox" checked={selected} disabled={!judge.eligible && !selected} onChange={event => { changed(); const prior = setup.panels.find(p => p.sessionId === session.id)?.judgeIds ?? []; const ids = event.target.checked ? [...prior, judge.id] : prior.filter(id => id !== judge.id); setSetup({ ...setup, panels: [...setup.panels.filter(p => p.sessionId !== session.id), ...(ids.length ? [{ sessionId: session.id, judgeIds: ids }] : [])] }); }} />{judge.name}{!judge.eligible && <span> ({t("Scoring.JUDGE")})</span>}</label>; })}</fieldset>)}
      </section><section><h2>{t("Scoring.readiness")}</h2>{value.blockers.length ? <ul>{value.blockers.map((b, i) => <li key={i}>{t(`Scoring.${b.kind}`)}: {target(b.targetId)}</li>)}</ul> : <p>{t("Scoring.ready")}</p>}<p>{t("Scoring.policy")}</p><Link to={`/admin/events/${encodeURIComponent(eventId)}/schedule`}>{t("Schedule.title")}</Link></section></aside></div>
      <div className="entry-actions"><button ref={previewTrigger} type="button" className="ui-button ui-button-primary" disabled={disabled} onClick={() => { void validate(); }}>{t("Scoring.preview")}</button></div>
      {preview && <section className="scoring-preview"><h2 ref={previewHeading} tabIndex={-1}>{t("Scoring.preview")}</h2><p>{t("Scoring.revision")}: {preview.revision + 1}</p>{ledger(preview.setup.templates)}{mapping(preview.setup)}
        {preview.blockers.length ? <ul>{preview.blockers.map((b, i) => <li key={i}>{t(`Scoring.${b.kind}`)}: {target(b.targetId)}</li>)}</ul> : <p>{t("Scoring.ready")}</p>}
        <label className="entry-check"><input type="checkbox" checked={confirmed} disabled={disabled} onChange={event => setConfirmed(event.target.checked)} />{t("Scoring.confirm")}</label><div className="entry-actions"><Button disabled={disabled || !confirmed} onClick={() => { void execute({ action: "CONFIGURE", operationId: crypto.randomUUID(), expectedRevision: preview.revision, setup: preview.setup, previewToken: preview.previewToken }); }}>{t("Scoring.save")}</Button><Button variant="quiet" disabled={busy} onClick={() => { setPreview(null); setConfirmed(false); previewTrigger.current?.focus(); }}>{t("Scoring.cancel")}</Button></div></section>}
      <details className="scoring-history"><summary>{t("Schedule.history")}</summary><ol>{value.receipts.map(r => <li key={r.operationId}>{t("Scoring.operation")}: {r.revision} <time dateTime={r.createdAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(r.createdAt))}</time><code>{r.operationId}</code></li>)}</ol></details>
    </>}
  </div>;
}
export default function ScoringPage() { const { eventId = "" } = useParams(); const { user } = useAuth(); return <Workspace key={`${user?.id}:${eventId}`} eventId={eventId} />; }
