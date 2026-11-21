import { useState } from "react";
import type { ScheduleWorkspace } from "@dance/schemas";
import { Button, Field, Input } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";

export function SessionEditor({ value, session, disabled, submit, dirty }: { value: ScheduleWorkspace; session?: ScheduleWorkspace["sessions"][number]; disabled: boolean; submit: (body: unknown) => void; dirty: () => void }) {
  const { t } = useTranslation();
  const [fields, setFields] = useState({ name: session?.name ?? "", startsAt: session?.startsAt ?? "", bufferSec: String(session?.bufferSec ?? 30), restSec: String(session?.restSec ?? 120), stageId: session?.stageId ?? value.stages[0]?.id ?? "", moderatorId: session?.moderatorId ?? "" });
  const change = (key: keyof typeof fields, next: string) => { setFields(current => ({ ...current, [key]: next })); dirty(); };
  const prefix = session ? "session-edit" : "session-new";
  return <details className="schedule-settings"><summary>{t(session ? "Schedule.editSession" : "Schedule.newSession")}</summary>
    <form noValidate onSubmit={event => { event.preventDefault(); submit({ action: session ? "UPDATE_SESSION" : "CREATE_SESSION", id: session?.id ?? crypto.randomUUID(), ...fields, bufferSec: Number(fields.bufferSec), restSec: Number(fields.restSec), moderatorId: fields.moderatorId || null }); }}>
      <fieldset disabled={disabled}><legend>{t(session ? "Schedule.editSession" : "Schedule.newSession")}</legend>
        <Field id={`${prefix}-name`} label={t("Schedule.name")} required>{attrs => <Input {...attrs} maxLength={200} value={fields.name} onChange={event => change("name", event.target.value)} />}</Field>
        <Field id={`${prefix}-stage`} label={t("Schedule.stage")} required>{attrs => <select {...attrs} className="ui-input" value={fields.stageId} onChange={event => change("stageId", event.target.value)}>{value.stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select>}</Field>
        <Field id={`${prefix}-starts`} label={t("Schedule.startsAt")} hint={t("Schedule.instantHelp")} required>{attrs => <Input {...attrs} value={fields.startsAt} onChange={event => change("startsAt", event.target.value)} />}</Field>
        <div className="schedule-pair">{(["bufferSec", "restSec"] as const).map(key => <Field key={key} id={`${prefix}-${key}`} label={t(key === "bufferSec" ? "Schedule.buffer" : "Schedule.rest")}>{attrs => <Input {...attrs} type="number" min={0} max={key === "bufferSec" ? 3600 : 86400} step={1} value={fields[key]} onChange={event => change(key, event.target.value)} />}</Field>)}</div>
        <Field id={`${prefix}-moderator`} label={t("Schedule.moderator")}>{attrs => <select {...attrs} className="ui-input" value={fields.moderatorId} onChange={event => change("moderatorId", event.target.value)}><option value="">{t("Schedule.none")}</option>{value.moderators.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select>}</Field>
        <Button type="submit">{t(session ? "Common.save" : "Schedule.newSession")}</Button>
      </fieldset>
    </form>
  </details>;
}
