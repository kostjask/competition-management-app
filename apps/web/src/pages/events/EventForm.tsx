import { languageNames } from "../../i18n/locale";
import { useState } from "react";
import {
  CreateEventBodySchema,
  EventStageSchema,
  eventStageTargets,
  resolveAuthoredContent,
  type CreateEventInput,
  type EventStage,
  type AuthoredContent,
} from "@dance/schemas";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { formatIssue } from "../../i18n/errors";
import { Button, Field, Input, ErrorSummary, Alert } from "../../components/ui/Foundation";
import { matchingInstants, wallTime, minuteInstant, resolveWallTime } from "./eventTime";
import { OrganizerConfirmation } from "./OrganizerConfirmation";
import "./Organizer.css";

type Props = {
  title: string;
  initialValues: CreateEventInput;
  currentStage?: EventStage;
  submitLabel: string;
  submitError?: UiError | null;
  isSubmitting?: boolean;
  blocked?: boolean;
  onSubmit: (values: CreateEventInput) => Promise<void>;
  onCancel: () => void;
};
const languages = ["et", "en", "ru"] as const;
export function EventForm({
  title,
  initialValues: initial,
  currentStage,
  submitLabel,
  submitError,
  isSubmitting,
  blocked,
  onSubmit,
  onCancel,
}: Props) {
  const { t, locale } = useTranslation();
  const [localError, setError] = useState<UiError | null>(null);
  const [timeError, setTimeError] = useState(false);
  const [confirmation, setConfirmation] = useState<CreateEventInput | null>(null);
  const [values, setValues] = useState(() => ({
    name: initial.name,
    venue: initial.venue ?? "",
    city: initial.city ?? "",
    country: initial.country ?? "",
    organizerEmail: initial.organizerEmail ?? "",
    organizerPhone: initial.organizerPhone ?? "",
    timeZone: initial.timeZone ?? "UTC",
    maxStudios: initial.maxStudios?.toString() ?? "",
    maxPerformances: initial.maxPerformances?.toString() ?? "",
    stage: initial.stage ?? "PRE_REGISTRATION",
    startsAt: wallTime(initial.startsAt, initial.timeZone ?? "UTC"),
    endsAt: wallTime(initial.endsAt, initial.timeZone ?? "UTC"),
    registrationDeadline: initial.registrationDeadline
      ? wallTime(initial.registrationDeadline, initial.timeZone ?? "UTC")
      : "",
    sourceLocale: initial.authoredDescription?.sourceLocale ?? "",
    sourceText: initial.authoredDescription?.sourceText ?? initial.description ?? "",
    et: initial.authoredDescription?.translations.et ?? "",
    en: initial.authoredDescription?.translations.en ?? "",
    ru: initial.authoredDescription?.translations.ru ?? "",
  }));
  const [chosen, setChosen] = useState<Record<string, string>>(() => ({
    startsAt: minuteInstant(initial.startsAt),
    endsAt: minuteInstant(initial.endsAt),
    registrationDeadline: initial.registrationDeadline ? minuteInstant(initial.registrationDeadline) : "",
  }));
  const error = localError ?? submitError ?? null;
  const issues = Object.fromEntries(
    (error?.issues ?? []).map((issue) => [issue.path.join("."), issue]),
  );
  const labels = {
    name: t("Events.nameLabel"),
    venue: t("Events.venue"),
    city: t("Common.city"),
    country: t("Common.country"),
    organizerEmail: t("Organizer.email"),
    organizerPhone: t("Organizer.phone"),
    timeZone: t("Organizer.zone"),
    maxStudios: t("Organizer.maxStudios"),
    maxPerformances: t("Organizer.maxPerformances"),
    startsAt: t("Events.startsAtLabel"),
    endsAt: t("Events.endsAtLabel"),
    registrationDeadline: t("Organizer.deadline"),
  };
  const stageLabel = (stage: EventStage) =>
    ({
      PRE_REGISTRATION: t("Events.stagePreRegistration"),
      REGISTRATION_OPEN: t("Events.stageRegistrationOpen"),
      DATA_REVIEW: t("Events.stageDataReview"),
      FINALIZED: t("Events.stageFinalized"),
      ENDED: t("Events.stageEnded"),
      CANCELLED: t("Events.stageCancelled"),
    })[stage];
  const field = (key: keyof typeof labels, type = "text", required = false) => (
    <Field
      key={key}
      id={`event-${key}`}
      label={labels[key]}
      required={required}
      {...(issues[key] && { error: formatIssue(issues[key], locale) })}
    >
      {(attrs) => (
        <Input
          {...attrs}
          type={type}
          value={values[key]}
          onChange={(e) => {
            setValues((v) => ({ ...v, [key]: e.target.value }));
            if (key === "timeZone") setChosen({});
          }}
        />
      )}
    </Field>
  );
  const dateField = (key: "startsAt" | "endsAt" | "registrationDeadline") => {
    const candidates = matchingInstants(values[key], values.timeZone);
    return (
      <div key={key}>
        {field(key, "datetime-local", key !== "registrationDeadline")}
        {candidates.length > 1 && (
          <Field
            id={`event-${key}-offset`}
            label={t("Organizer.offset")}
            hint={t("Organizer.ambiguous")}
          >
            {(attrs) => (
              <select
                {...attrs}
                className="ui-input"
                value={candidates.includes(chosen[key] ?? "") ? chosen[key] : ""}
                onChange={(e) => setChosen((v) => ({ ...v, [key]: e.target.value }))}
              >
                <option value="">{t("Organizer.offset")}</option>
                {candidates.map((instant) => (
                  <option key={instant} value={instant}>
                    {instant}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
      </div>
    );
  };
  const content = (): AuthoredContent | null => {
    if (!languages.some((language) => language === values.sourceLocale)) return null;
    const sourceLocale = languages.find((language) => language === values.sourceLocale);
    if (!sourceLocale) return null;
    return {
      sourceLocale,
      sourceText: values.sourceText,
      translations: Object.fromEntries(
        languages
          .filter((language) => language !== sourceLocale && values[language].trim())
          .map((language) => [language, values[language]]),
      ),
    };
  };
  const commit = async (data: CreateEventInput) => {
    setConfirmation(null);
    try {
      await onSubmit(data);
    } catch {
      /* Parent owns server errors and recovery. */
    }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || blocked) return;
    setError(null);
    setTimeError(false);
    const instant = (key: "startsAt" | "endsAt" | "registrationDeadline") => {
      return resolveWallTime(values[key], values.timeZone, chosen[key], initial[key], initial.timeZone ?? "UTC");
    };
    const startsAt = instant("startsAt"),
      endsAt = instant("endsAt"),
      deadline = values.registrationDeadline ? instant("registrationDeadline") : null;
    if (!startsAt || !endsAt || deadline === undefined) {
      setTimeError(true);
      return;
    }
    if (values.sourceText.trim() && !values.sourceLocale) {
      setError({
        reason: "invalidInput",
        params: {},
        issues: [{ path: ["sourceLocale"], rule: "invalid", params: {} }],
      });
      return;
    }
    const parsed = CreateEventBodySchema.safeParse({
      name: values.name,
      stage: values.stage,
      startsAt,
      endsAt,
      timeZone: values.timeZone,
      registrationDeadline: deadline,
      venue: values.venue || null,
      city: values.city || null,
      country: values.country || null,
      organizerEmail: values.organizerEmail || null,
      organizerPhone: values.organizerPhone || null,
      maxStudios: values.maxStudios ? Number(values.maxStudios) : null,
      maxPerformances: values.maxPerformances ? Number(values.maxPerformances) : null,
      authoredDescription: content(),
      ...(values.sourceLocale && { description: null }),
    });
    if (!parsed.success) {
      setError(toUiError(parsed.error));
      return;
    }
    if (parsed.data.stage !== (currentStage ?? "PRE_REGISTRATION")) setConfirmation(parsed.data);
    else void commit(parsed.data);
  };
  const preview = content();
  return (
    <section className="organizer">
      <h1>{title}</h1>
      <p>{t("Organizer.requiredFields")}</p>
      <form noValidate onSubmit={submit}>
        <ErrorSummary
          error={error}
          title={t("Organizer.setup")}
          fields={Object.fromEntries(
            [...Object.keys(labels), "sourceLocale"].map((key) => [key, `event-${key}`]),
          )}
        />
        {timeError && <Alert tone="danger">{t("Organizer.timeInvalid")}</Alert>}
        <fieldset disabled={isSubmitting}>
          <legend>{t("Organizer.details")}</legend>
          <div className="organizer-fields">
            {field("name", "text", true)}
            {field("venue")}
            {field("city")}
            {field("country")}
          </div>
        </fieldset>
        <fieldset disabled={isSubmitting}>
          <legend>{t("Organizer.registration")}</legend>
          <p>{t("Organizer.dateHelp")}</p>
          {field("timeZone", "text", true)}
          <div className="organizer-fields">
            {dateField("startsAt")}
            {dateField("endsAt")}
            {dateField("registrationDeadline")}
          </div>
          <p className="ui-help">{t("Organizer.noDeadline")}</p>
          <Field id="event-stage" label={t("Events.stageLabel")}>
            {(attrs) => (
              <select
                {...attrs}
                className="ui-input"
                value={values.stage}
                onChange={(e) =>
                  setValues((v) => ({ ...v, stage: EventStageSchema.parse(e.target.value) }))
                }
              >
                {eventStageTargets(currentStage).map((stage) => (
                  <option key={stage} value={stage}>
                    {stageLabel(stage)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="organizer-fields">
            {field("maxStudios", "number")}
            {field("maxPerformances", "number")}
          </div>
          <p className="ui-help">{t("Organizer.limitsHelp")}</p>
        </fieldset>
        <fieldset disabled={isSubmitting}>
          <legend>{t("Organizer.contact")}</legend>
          <div className="organizer-fields">
            {field("organizerEmail", "email")}
            {field("organizerPhone", "tel")}
          </div>
        </fieldset>
        <fieldset disabled={isSubmitting}>
          <legend>{t("Organizer.description")}</legend>
          {initial.description && !initial.authoredDescription && <p>{t("Organizer.legacy")}</p>}
          <Field
            id="event-sourceLocale"
            label={t("Organizer.source")}
            {...(issues.sourceLocale && { error: t("Organizer.chooseSource") })}
          >
            {(attrs) => (
              <select
                {...attrs}
                className="ui-input"
                value={values.sourceLocale}
                onChange={(e) => setValues((v) => ({ ...v, sourceLocale: e.target.value }))}
              >
                <option value="">{t("Organizer.chooseSource")}</option>
                {languages.map((language) => (
                  <option key={language} value={language}>
                    {languageNames[language]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field id="event-sourceText" label={t("Organizer.sourceText")}>
            {(attrs) => (
              <textarea
                {...attrs}
                className="ui-input"
                maxLength={20000}
                value={values.sourceText}
                onChange={(e) => setValues((v) => ({ ...v, sourceText: e.target.value }))}
              />
            )}
          </Field>
          {languages
            .filter((language) => language !== values.sourceLocale)
            .map((language) => (
              <Field
                key={language}
                id={`event-translation-${language}`}
                label={`${t("Organizer.translation")} (${language})`}
              >
                {(attrs) => (
                  <textarea
                    {...attrs}
                    className="ui-input"
                    maxLength={20000}
                    value={values[language]}
                    onChange={(e) => setValues((v) => ({ ...v, [language]: e.target.value }))}
                  />
                )}
              </Field>
            ))}
          {preview && (
            <details>
              <summary>{t("Organizer.preview")}</summary>
              {languages.map((language) => {
                const resolved = resolveAuthoredContent(preview, language);
                return (
                  <section className="organizer-preview" key={language}>
                    <h3>{language}</h3>
                    {resolved.fallback && <p>{t("Registration.contentFallback")}</p>}
                    <p lang={resolved.lang}>{resolved.text}</p>
                  </section>
                );
              })}
            </details>
          )}
        </fieldset>
        <div className="ui-actions">
          <Button type="submit" pending={!!isSubmitting} disabled={blocked}>
            {submitLabel}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {t("Common.cancel")}
          </Button>
        </div>
      </form>
      {confirmation && (
        <OrganizerConfirmation
          title={t("Organizer.confirmStage")}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void commit(confirmation)}
        >
          <p>{stageLabel(confirmation.stage ?? "PRE_REGISTRATION")}</p>
          <p>{t("Organizer.stageEffect")}</p>
        </OrganizerConfirmation>
      )}
    </section>
  );
}
