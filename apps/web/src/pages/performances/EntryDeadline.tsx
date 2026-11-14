import { useEffect, useRef, useState } from "react";
import { Field } from "../../components/ui/Foundation";
import { wallTime, wallTimeCandidates, resolveWallTime, offsetLabel, minuteInstant } from "../../features/events/eventTime";
import { useTranslation } from "../../i18n/useTranslation";

export default function EntryDeadline({ id, label, zone, value, change, disabled = false, required = false }: {
  id: string; label: string; zone: string; value: string | null; change: (value: string | null) => void; disabled?: boolean; required?: boolean;
}) {
  const { t } = useTranslation();
  const [wall, setWall] = useState(value ? wallTime(value, zone) : "");
  const ref = useRef<HTMLInputElement>(null);
  const candidates = wall ? wallTimeCandidates(wall, zone) : [];
  const valid = !wall || resolveWallTime(wall, zone, value ?? "") !== null;
  useEffect(() => { ref.current?.setCustomValidity(valid ? "" : t("Entry.invalidTime")); }, [valid, t]);
  return <Field id={id} label={`${label} (${zone})`} required={required}>{attrs => <>
    <input {...attrs} ref={ref} className="ui-input" type="datetime-local" value={wall} disabled={disabled} required={required}
      onChange={event => { const next = event.target.value; setWall(next); change(next ? resolveWallTime(next, zone, "") : null); }} />
    {candidates.length > 1 && <select aria-label={t("Entry.invalidTime")} className="ui-input" disabled={disabled}
      value={candidates.find(instant => minuteInstant(resolveWallTime(wall, zone, value ?? "") ?? "") === instant) ?? ""} required
      onChange={event => change(event.target.value || null)}>
      <option value="">{t("Entry.invalidTime")}</option>{candidates.map(instant => <option key={instant} value={instant}>{offsetLabel(instant, zone)}</option>)}
    </select>}
  </>}</Field>;
}
