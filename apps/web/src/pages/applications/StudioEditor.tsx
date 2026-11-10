import { useState } from "react";
import { UpdateStudioBodySchema, UpdateRepresentativeBodySchema, type Studio } from "@dance/schemas";
import { updateStudio, updateStudioRepresentative } from "../../api/studios";
import { useAuth } from "../../auth/useAuth";
import { StudioFields } from "../../auth/StudioFields";
import { AccountField } from "../../auth/AccountField";
import { Alert, Button, ErrorSummary } from "../../components/ui/Foundation";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";

export function StudioEditor({ studio, revision, disabled, editable, save }: { studio: Studio; revision: number; disabled: boolean; editable: boolean; save: (execute: () => Promise<unknown>) => void }) {
  const { t } = useTranslation(); const { user } = useAuth();
  const [details, setDetails] = useState({ studioName: studio.name, country: studio.country ?? "", city: studio.city ?? "", directorName: studio.directorName ?? "", directorPhone: studio.directorPhone ?? "" });
  const rep = studio.representatives.find(value => value.userId === user?.id);
  const [contact, setContact] = useState({ name: rep?.name ?? "", email: rep?.email ?? "" });
  const [error, setError] = useState<UiError | null>(null);
  const profileError = error ? { ...error, issues: error.issues.map(issue => issue.path[0] === "name" ? { ...issue, path: ["studioName", ...issue.path.slice(1)] } : issue) } : null;
  return <section className="application-section"><h3>{t("Application.profile")}</h3>
    <p>{t("Application.profileHelp")}</p>{!editable && <Alert announce={false}>{t("Application.locked")}</Alert>}
    <ErrorSummary error={error} title={t("Feedback.validation")} fields={{ name: "profile-studioName", email: "contact-email" }} />
    <form noValidate onSubmit={event => { event.preventDefault(); const parsed = UpdateStudioBodySchema.safeParse({ expectedRevision: revision, name: details.studioName, country: details.country || null, city: details.city || null, directorName: details.directorName || null, directorPhone: details.directorPhone || null });
      if (!parsed.success) { setError(toUiError(parsed.error)); return; } setError(null); save(() => updateStudio(studio.id, parsed.data)); }}>
      <fieldset disabled={disabled || !editable}><StudioFields prefix="profile-" value={details} onChange={setDetails} error={profileError} /><Button type="submit" variant="secondary">{t("Application.saveProfile")}</Button></fieldset>
    </form>
    {rep && <form className="application-section" noValidate onSubmit={event => { event.preventDefault(); const parsed = UpdateRepresentativeBodySchema.safeParse({ ...contact, expectedRevision: revision }); if (!parsed.success) { setError(toUiError(parsed.error)); return; } setError(null); save(() => updateStudioRepresentative(studio.id, rep.id, parsed.data)); }}>
      <h3>{t("Application.contact")}</h3><p>{t("Application.contactHelp")}</p><fieldset disabled={disabled || !editable}>
        <AccountField id="contact-name" path="name" label={t("Application.representativeName")} value={contact.name} onChange={value => setContact({ ...contact, name: value })} error={error} />
        <AccountField id="contact-email" path="email" label={t("Application.representativeEmail")} type="email" value={contact.email} onChange={value => setContact({ ...contact, email: value })} error={error} />
        <Button type="submit" variant="secondary">{t("Application.saveContact")}</Button>
      </fieldset>
    </form>}
    {!rep && studio.representatives.map(value => <p key={value.id}>{value.name}: {value.email}</p>)}
  </section>;
}
