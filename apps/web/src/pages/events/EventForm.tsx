import { useMemo, useState } from "react";
import { CreateEventBodySchema, EventStageSchema, type CreateEventInput } from "@dance/schemas";
import { useTranslation } from "@i18n/useTranslation";

const inputBaseClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200";

const getInputClassName = (hasError: boolean) =>
  hasError
    ? `${inputBaseClass} border-rose-400 focus:border-rose-400 focus:ring-rose-200`
    : inputBaseClass;

type EventStage = (typeof EventStageSchema)["options"][number];

type EventFormValues = {
  name: string;
  startsAt: string;
  endsAt: string;
  stage: EventStage;
};

type EventFormProps = {
  title: string;
  initialValues: CreateEventInput;
  submitLabel: string;
  submitError?: string | null;
  isSubmitting?: boolean;
  onSubmit: (values: CreateEventInput) => Promise<void>;
  onCancel: () => void;
};

const toLocalInputValue = (value: string | Date): string => {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toIsoString = (value: string): string => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
};

export function EventForm({
  title,
  initialValues,
  submitLabel,
  submitError,
  isSubmitting,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CreateEventInput, string>>
  >({});
  const [formValues, setFormValues] = useState<EventFormValues>(() => ({
    name: initialValues.name ?? "",
    startsAt: toLocalInputValue(initialValues.startsAt),
    endsAt: toLocalInputValue(initialValues.endsAt),
    stage: initialValues.stage ?? EventStageSchema.options[0],
  }));

  const stageLabels = useMemo<Record<EventStage, string>>(
    () => ({
      PRE_REGISTRATION: t("Events.stagePreRegistration"),
      REGISTRATION_OPEN: t("Events.stageRegistrationOpen"),
      DATA_REVIEW: t("Events.stageDataReview"),
      FINALIZED: t("Events.stageFinalized"),
      ENDED: t("Events.stageEnded"),
    }),
    [t]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const payload: CreateEventInput = {
      name: formValues.name.trim(),
      startsAt: toIsoString(formValues.startsAt),
      endsAt: toIsoString(formValues.endsAt),
      stage: formValues.stage,
    };

    const parsed = CreateEventBodySchema.safeParse(payload);

    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      setFieldErrors({
        name: flattened.fieldErrors.name?.[0],
        startsAt: flattened.fieldErrors.startsAt?.[0],
        endsAt: flattened.fieldErrors.endsAt?.[0],
        stage: flattened.fieldErrors.stage?.[0],
      });
      setFormError(flattened.formErrors[0] ?? null);
      return;
    }

    try {
      await onSubmit(parsed.data);
    } catch {
      // Error state is handled by the parent.
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/50">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-500">{t("Common.events")}</p>
          <h1 className="font-display text-3xl text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{t("Events.formHint")}</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              {t("Events.nameLabel")}
              <input
                className={getInputClassName(Boolean(fieldErrors.name))}
                value={formValues.name}
                onChange={(eventValue) =>
                  setFormValues((prev) => ({
                    ...prev,
                    name: eventValue.target.value,
                  }))
                }
                placeholder={t("Events.nameLabel")}
                aria-invalid={Boolean(fieldErrors.name)}
                required
              />
              {fieldErrors.name ? (
                <span className="text-xs font-medium text-rose-600">{fieldErrors.name}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              {t("Events.stageLabel")}
              <select
                className={getInputClassName(Boolean(fieldErrors.stage))}
                value={formValues.stage}
                onChange={(eventValue) =>
                  setFormValues((prev) => ({
                    ...prev,
                    stage: eventValue.target.value as EventStage,
                  }))
                }
                aria-invalid={Boolean(fieldErrors.stage)}
              >
                {EventStageSchema.options.map((stage) => (
                  <option key={stage} value={stage}>
                    {stageLabels[stage]}
                  </option>
                ))}
              </select>
              {fieldErrors.stage ? (
                <span className="text-xs font-medium text-rose-600">{fieldErrors.stage}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              {t("Events.startsAtLabel")}
              <input
                type="datetime-local"
                className={getInputClassName(Boolean(fieldErrors.startsAt))}
                value={formValues.startsAt}
                onChange={(eventValue) =>
                  setFormValues((prev) => ({
                    ...prev,
                    startsAt: eventValue.target.value,
                  }))
                }
                aria-invalid={Boolean(fieldErrors.startsAt)}
                required
              />
              {fieldErrors.startsAt ? (
                <span className="text-xs font-medium text-rose-600">{fieldErrors.startsAt}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              {t("Events.endsAtLabel")}
              <input
                type="datetime-local"
                className={getInputClassName(Boolean(fieldErrors.endsAt))}
                value={formValues.endsAt}
                onChange={(eventValue) =>
                  setFormValues((prev) => ({
                    ...prev,
                    endsAt: eventValue.target.value,
                  }))
                }
                aria-invalid={Boolean(fieldErrors.endsAt)}
                required
              />
              {fieldErrors.endsAt ? (
                <span className="text-xs font-medium text-rose-600">{fieldErrors.endsAt}</span>
              ) : null}
            </label>
          </div>

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          {submitError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {submitError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              onClick={onCancel}
            >
              {t("Common.cancel")}
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
