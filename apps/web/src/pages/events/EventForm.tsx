import { useMemo, useState, type ReactNode } from "react";
import { CreateEventBodySchema, resolveAuthoredContent, type CreateEventInput } from "@dance/schemas";
import { toUiError, type UiError } from "../../api/error";
import { formatIssue } from "../../i18n/errors";
import { useTranslation } from "../../i18n/useTranslation";
import { isLocale, languageNames, type Locale } from "../../i18n/locale";
import { Button, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { offsetLabel, wallTime, wallTimeCandidates } from "../../features/events/eventTime";
import { eventFieldIds } from "../../features/events/setup";
import "./event-setup.css";

type Props = {
  title: string; initialValues: CreateEventInput; unclassifiedDescription?: string | null;
  submitLabel: string; submitError?: UiError | null; isSubmitting?: boolean; disabled?: boolean;
  onSubmit: (values: CreateEventInput) => Promise<void>; onCancel: () => void; onDirty?: () => void;
};

function TimeField({ id, label, value, zone, choice, onChange, onChoice, error }: {
  id: string; label: string; value: string; zone: string; choice: string; onChange: (value: string) => void; onChoice: (value: string) => void; error?: string;
}) {
  const { t } = useTranslation();
  const candidates = useMemo(() => wallTimeCandidates(value, zone), [value, zone]);
  return <div><Field id={id} label={label} required {...(error && { error })}>{props => <Input {...props} type="datetime-local" value={value} onChange={event => onChange(event.target.value)} />}</Field>
    {value && zone && candidates.length === 0 && <p className="ui-field-error">{t("Setup.invalidTime")}</p>}
    {candidates.length > 1 && <Field id={id + "-offset"} label={label + ": " + t("Setup.offset")} hint={t("Setup.ambiguousTime")} required>{props =>
      <select {...props} className="ui-input" value={candidates.includes(choice) ? choice : ""} onChange={event => onChoice(event.target.value)}>
        <option value="">{t("Setup.choose")}</option>{candidates.map(instant => <option key={instant} value={instant}>{offsetLabel(instant, zone)}</option>)}
      </select>}</Field>}
  </div>;
}
export function EventForm({ title, initialValues, unclassifiedDescription, submitLabel, submitError, isSubmitting, disabled, onSubmit, onCancel, onDirty }: Props) {
  const { t, locale } = useTranslation();
  const [error, setError] = useState<UiError | null>(null);
  const [form, setForm] = useState(() => {
    const zone = initialValues.timeZone ?? "";
    return {
      name: initialValues.name, venue: initialValues.venue ?? "", country: initialValues.country ?? "", city: initialValues.city ?? "",
      organizerEmail: initialValues.organizerEmail ?? "", organizerPhone: initialValues.organizerPhone ?? "", timeZone: zone,
      startsAt: wallTime(initialValues.startsAt, zone || "UTC"), endsAt: wallTime(initialValues.endsAt, zone || "UTC"),
      registrationDeadline: initialValues.registrationDeadline ? wallTime(initialValues.registrationDeadline, zone || "UTC") : "",
      cutoff: initialValues.registrationDeadline === undefined ? "" : initialValues.registrationDeadline === null ? "none" : "timed",
      maxStudios: initialValues.maxStudios?.toString() ?? "", maxPerformances: initialValues.maxPerformances?.toString() ?? "",
      sourceLocale: initialValues.description?.sourceLocale ?? "", sourceText: initialValues.description?.sourceText ?? unclassifiedDescription ?? "",
      et: initialValues.description?.translations.et ?? "", en: initialValues.description?.translations.en ?? "", ru: initialValues.description?.translations.ru ?? "",
    };
  });
  const [offsets, setOffsets] = useState({ startsAt: initialValues.startsAt, endsAt: initialValues.endsAt, registrationDeadline: initialValues.registrationDeadline ?? "" });
  const visibleError = error ?? submitError ?? null;
  const issue = (field: string) => { const value = visibleError?.issues.find(item => item.path[0] === field); return value ? formatIssue(value, locale) : undefined; };
  const change = (key: keyof typeof form, value: string) => { setForm(previous => ({ ...previous, [key]: value })); setError(null); onDirty?.(); };
  const field = (key: keyof typeof form, label: string, type = "text", required = false) => <Field id={"event-" + key} label={label} required={required} {...(issue(key) && { error: issue(key) })}>{props =>
    <Input {...props} type={type} value={form[key]} onChange={event => change(key, event.target.value)} {...(type === "number" ? { min: 1, max: 2147483647, step: 1 } : { maxLength: 500 })} />}</Field>;
  const section = (id: string, label: string, children: ReactNode) => <fieldset className="setup-section" id={id}><legend>{label}</legend>{children}</fieldset>;
  const content = isLocale(form.sourceLocale) && form.sourceText.trim() ? { sourceLocale: form.sourceLocale, sourceText: form.sourceText.trim(), translations: Object.fromEntries(
    (["et", "en", "ru"] as const).filter(language => language !== form.sourceLocale && form[language].trim()).map(language => [language, form[language].trim()])) } : null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (disabled || isSubmitting) return;
    setError(null);
    const issues: UiError["issues"] = [];
    const instant = (key: keyof typeof offsets) => {
      const candidates = wallTimeCandidates(form[key], form.timeZone);
      const result = candidates.length === 1 ? candidates[0] : candidates.find(value => value === offsets[key]);
      if (!result) issues.push({ path: [key], rule: "invalid", params: {} });
      return result ?? "";
    };
    if (!form.timeZone) issues.push({ path: ["timeZone"], rule: "invalid", params: {} });
    if (!form.cutoff) issues.push({ path: ["registrationDeadline"], rule: "invalid", params: {} });
    if ((form.sourceText.trim() || form.et.trim() || form.en.trim() || form.ru.trim()) && !content) issues.push({ path: ["description"], rule: "invalid", params: {} });
    const payload = { name: form.name, venue: form.venue.trim() || null, country: form.country.trim() || null, city: form.city.trim() || null,
      organizerEmail: form.organizerEmail.trim() || null, organizerPhone: form.organizerPhone.trim() || null,
      timeZone: form.timeZone, startsAt: instant("startsAt"), endsAt: instant("endsAt"),
      registrationDeadline: form.cutoff === "timed" ? instant("registrationDeadline") : null,
      maxStudios: form.maxStudios ? Number(form.maxStudios) : null, maxPerformances: form.maxPerformances ? Number(form.maxPerformances) : null,
      description: content,
    };
    const parsed = CreateEventBodySchema.safeParse(payload);
    if (!parsed.success) issues.push(...toUiError(parsed.error).issues);
    if (issues.length || !parsed.success) { setError({ reason: "invalidInput", params: {}, issues }); return; }
    try { await onSubmit(parsed.data); } catch { /* The owner preserves authoritative and uncertain state. */ }
  };
  return <div>
    {title && <header className="event-masthead"><div><h1>{title}</h1><p>{t("Setup.hint")}</p></div></header>}
    <ErrorSummary error={visibleError} title={t("Feedback.validation")} fields={eventFieldIds} />
    <form noValidate onSubmit={submit}>
      <fieldset disabled={disabled || isSubmitting}>
        {section("event-details", t("Setup.details"), field("name", t("Events.nameLabel"), "text", true))}
        {section("event-location", t("Setup.location"), <div className="setup-grid">{field("venue", t("Events.venue"))}{field("city", t("Common.city"))}{field("country", t("Common.country"))}</div>)}
        {section("event-contact", t("Setup.contact"), <><p>{t("Setup.contactHelp")}</p><div className="setup-grid">{field("organizerEmail", t("Setup.organizerEmail"), "email")}{field("organizerPhone", t("Setup.organizerPhone"), "tel")}</div></>)}
        {section("event-dates", t("Setup.dates"), <>
          <Field id="event-timeZone" label={t("Setup.timeZone")} hint={t("Setup.zoneHelp")} required {...(issue("timeZone") && { error: issue("timeZone") })}>{props => <Input {...props} list="event-zones" value={form.timeZone} onChange={event => change("timeZone", event.target.value)} />}</Field>
          <datalist id="event-zones">{["UTC", ...Intl.supportedValuesOf("timeZone")].map(zone => <option key={zone} value={zone} />)}</datalist>
          <div className="setup-grid">{(["startsAt", "endsAt"] as const).map(key => <TimeField key={key} id={"event-" + key} label={t(key === "startsAt" ? "Events.startsAtLabel" : "Events.endsAtLabel")} value={form[key]} zone={form.timeZone} choice={offsets[key]} onChange={value => change(key, value)} onChoice={value => { setOffsets(previous => ({ ...previous, [key]: value })); onDirty?.(); }} {...(issue(key) && { error: issue(key) })} />)}</div>
          <Field id="event-cutoff" label={t("Setup.cutoff")} required hint={t("Setup.cutoffHelp")} {...(issue("registrationDeadline") && { error: issue("registrationDeadline") })}>{props => <select {...props} className="ui-input" value={form.cutoff} onChange={event => change("cutoff", event.target.value)}><option value="">{t("Setup.choose")}</option><option value="none">{t("Setup.noCutoff")}</option><option value="timed">{t("Setup.timedCutoff")}</option></select>}</Field>
          {form.cutoff === "timed" && <TimeField id="event-registrationDeadline" label={t("Setup.deadline")} value={form.registrationDeadline} zone={form.timeZone} choice={offsets.registrationDeadline} onChange={value => change("registrationDeadline", value)} onChoice={value => { setOffsets(previous => ({ ...previous, registrationDeadline: value })); onDirty?.(); }} {...(issue("registrationDeadline") && { error: issue("registrationDeadline") })} />}
        </>)}
        {section("event-description", t("Setup.description"), <>
          <p>{t("Setup.sourceHelp")}</p>{unclassifiedDescription && <p className="ui-help">{t("Setup.unclassified")}</p>}
          <Field id="event-description-language" label={t("Setup.sourceLocale")} {...(issue("description") && { error: issue("description") })}>{props => <select {...props} className="ui-input" value={form.sourceLocale} onChange={event => change("sourceLocale", event.target.value)}><option value="">{t("Setup.choose")}</option>{Object.entries(languageNames).map(([key, label]) => <option key={key} value={key} lang={key}>{label}</option>)}</select>}</Field>
          <Field id="event-description-text" label={t("Setup.sourceText")}>{props => <textarea {...props} className="ui-input" rows={4} maxLength={20000} value={form.sourceText} lang={form.sourceLocale || ""} onChange={event => change("sourceText", event.target.value)} />}</Field>
          {(["et", "en", "ru"] as const).filter(language => language !== form.sourceLocale).map(language => <Field key={language} id={"event-description-" + language} label={t("Setup.translation") + ": " + languageNames[language]}>{props => <textarea {...props} className="ui-input" rows={3} maxLength={20000} lang={language} value={form[language]} onChange={event => change(language, event.target.value)} />}</Field>)}
          {content && <details><summary>{t("Setup.preview")}</summary>{(["et", "en", "ru"] as Locale[]).map(language => { const result = resolveAuthoredContent(content, language); return <div key={language}><h3 lang={language}>{languageNames[language]}</h3>{result.fallback && <p>{t("Registration.contentFallback")}</p>}<p className="setup-prose" lang={result.lang}>{result.text}</p></div>; })}</details>}
        </>)}
        {section("event-limits", t("Setup.limits"), <><p>{t("Setup.limitsHelp")}</p><div className="setup-grid">{field("maxStudios", t("Setup.maxStudios"), "number")}{field("maxPerformances", t("Setup.maxPerformances"), "number")}</div></>)}
        <div className="ui-actions"><Button type="submit" pending={!!isSubmitting}>{submitLabel}</Button><Button variant="secondary" onClick={onCancel}>{t("Common.cancel")}</Button></div>
      </fieldset>
    </form>
  </div>;
}
