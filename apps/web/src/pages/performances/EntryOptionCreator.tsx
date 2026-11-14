import { useState } from "react";
import { EntryOptionsSchema, type EntryOptions } from "@dance/schemas";
import { Button, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";

export default function EntryOptionCreator({ add }: { add: (options: EntryOptions) => void }) {
  const { t } = useTranslation(); const [kind, setKind] = useState<keyof EntryOptions>("categories");
  const [name, setName] = useState(""); const [minimum, setMinimum] = useState("0");
  const [maximum, setMaximum] = useState(""); const [duration, setDuration] = useState("240");
  const [error, setError] = useState<UiError | null>(null);
  function create() {
    const id = crypto.randomUUID(); const options: EntryOptions = { categories: [], ages: [], formats: [] };
    if (kind === "categories") options.categories.push({ id, name });
    if (kind === "ages") options.ages.push({ id, name, minAge: Number(minimum), maxAge: maximum ? Number(maximum) : null });
    if (kind === "formats") options.formats.push({ id, name, minParticipants: Number(minimum), maxParticipants: maximum ? Number(maximum) : null, maxDurationSeconds: Number(duration) });
    const parsed = EntryOptionsSchema.safeParse(options);
    if (!parsed.success) { setError(toUiError(parsed.error)); return; }
    add(parsed.data); setName(""); setError(null);
  }
  return <details className="entry-option-creator"><summary>{t("Entry.createOption")}</summary>
    <ErrorSummary error={error} title={t("Entry.error")} />
    <div className="entry-nomination">
      <Field id="entry-option-kind" label={t("Entry.optionKind")}>{attrs => <select {...attrs} className="ui-input" value={kind} onChange={event => {
        const value = event.target.value; if (value === "categories" || value === "ages" || value === "formats") { setKind(value); setMinimum(value === "formats" ? "1" : "0"); setError(null); }
      }}>{(["categories", "ages", "formats"] as const).map(key => <option key={key} value={key}>{t(`Entry.${key}`)}</option>)}</select>}</Field>
      <Field id="entry-option-name" label={t("Entry.optionName")}>{attrs => <Input {...attrs} maxLength={500} value={name} onChange={event => setName(event.target.value)} />}</Field>
      {kind !== "categories" && <>
        <Field id="entry-option-min" label={t(kind === "ages" ? "Entry.minAge" : "Entry.minParticipants")}>{attrs => <Input {...attrs} type="number" min={kind === "ages" ? 0 : 1} value={minimum} onChange={event => setMinimum(event.target.value)} />}</Field>
        <Field id="entry-option-max" label={t(kind === "ages" ? "Entry.maxAge" : "Entry.maxParticipants")}>{attrs => <Input {...attrs} type="number" min={kind === "ages" ? 0 : 1} value={maximum} onChange={event => setMaximum(event.target.value)} />}</Field>
      </>}
      {kind === "formats" && <Field id="entry-option-duration" label={t("Entry.maxDuration")}>{attrs => <Input {...attrs} type="number" min={1} value={duration} onChange={event => setDuration(event.target.value)} />}</Field>}
    </div><Button variant="quiet" disabled={!name.trim() || (kind !== "categories" && !minimum) || (kind === "formats" && !duration)} onClick={create}>{t("Entry.addOption")}</Button><p>{t("Entry.optionDraft")}</p>
  </details>;
}
