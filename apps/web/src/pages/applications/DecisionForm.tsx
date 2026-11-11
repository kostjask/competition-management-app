import { useState } from "react";
import { UpdateStudioRegistrationBodySchema, type StudioRegistration, type UpdateStudioRegistrationInput } from "@dance/schemas";
import { Button, Field } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import { reasonKey, statusKey } from "./policy";

export function DecisionForm({ row, axis, disabled, submit }: { row: StudioRegistration; axis: "ORGANIZATION" | "EVENT"; disabled: boolean; submit: (body: UpdateStudioRegistrationInput) => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(axis === "ORGANIZATION" ? row.studio.approvalStatus : row.status);
  const [reason, setReason] = useState((axis === "ORGANIZATION" ? row.studio.approvalReason : row.decisionReason) ?? "CONTACT_ORGANIZER");
  const [allow, setAllow] = useState(row.canEditDuringReview);
  const prefix = axis === "ORGANIZATION" ? "organization" : "event";
  return <form className="application-section" onSubmit={event => { event.preventDefault(); const parsed = UpdateStudioRegistrationBodySchema.safeParse({ revision: row.revision, status, reason: status === "REJECTED" ? reason : null, ...(axis === "EVENT" && { canEditDuringReview: allow }) }); if (parsed.success) submit(parsed.data); }}>
    <h3>{t(axis === "ORGANIZATION" ? "Application.organization" : "Application.event")}</h3>
    <fieldset disabled={disabled}>
      <Field id={prefix + "-status"} label={t("Application.status")}>{attrs => <select {...attrs} className="ui-input" value={status} onChange={event => { const parsed = UpdateStudioRegistrationBodySchema.shape.status.safeParse(event.target.value); if (parsed.success) setStatus(parsed.data); }}>
        {(["PENDING", "APPROVED", "REJECTED"] as const).map(value => <option key={value} value={value}>{t(statusKey[value])}</option>)}
      </select>}</Field>
      {status === "REJECTED" && <Field id={prefix + "-reason"} label={t("Application.reason")}>{attrs => <select {...attrs} className="ui-input" value={reason} onChange={event => { const parsed = UpdateStudioRegistrationBodySchema.shape.reason.safeParse(event.target.value); if (parsed.success && parsed.data) setReason(parsed.data); }}>
        {Object.entries(reasonKey).map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
      </select>}</Field>}
      {axis === "EVENT" && <><label className="application-check"><input type="checkbox" checked={allow} onChange={event => setAllow(event.target.checked)} />{t("Application.allowance")}</label><p className="ui-help">{t("Application.allowanceHelp")}</p></>}
      <Button type="submit" variant="secondary">{t("Application.saveDecision")}</Button>
    </fieldset>
  </form>;
}
