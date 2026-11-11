import { useState } from "react";
import { NewStudioRegistrationBodySchema, type CreateStudioRegistrationInput, type OnboardingDraftSchema, type StudioRegistration } from "@dance/schemas";
import type { z } from "zod";
import { createStudio } from "../../api/studios";
import { toUiError, type UiError } from "../../api/error";
import { useTranslation } from "../../i18n/useTranslation";
import { useAuth } from "../../auth/useAuth";
import { StudioFields } from "../../auth/StudioFields";
import { emptyStudioDetails } from "../../auth/studioDetails";
import { AccountField } from "../../auth/AccountField";
import { Button, Alert, ErrorSummary } from "../../components/ui/Foundation";

export function ApplyForm({ eventId, draft, disabled, onCreated }: { eventId: string; draft: z.infer<typeof OnboardingDraftSchema> | null; disabled: boolean; onCreated: (row: StudioRegistration) => void }) {
  const { t } = useTranslation(); const { user } = useAuth();
  const [details, setDetails] = useState(draft?.details ?? emptyStudioDetails);
  const [name, setName] = useState(user?.name ?? ""); const [email, setEmail] = useState(user?.email ?? "");
  const [operationId] = useState(() => crypto.randomUUID()); const [frozen, setFrozen] = useState<CreateStudioRegistrationInput | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<UiError | null>(null);
  const submit = async (body: CreateStudioRegistrationInput) => { setBusy(true); setError(null); setFrozen(body); try { onCreated(await createStudio(eventId, body)); } catch (err: unknown) { setError(toUiError(err)); } finally { setBusy(false); } };
  const fields = { name: "apply-studioName", country: "optional-country", city: "optional-city", directorName: "optional-directorName", directorPhone: "optional-directorPhone", representativeName: "apply-representativeName", representativeEmail: "apply-representativeEmail" };
  return <section className="application-form"><h2>{t("Application.apply")}</h2><p>{t("Application.required")}</p>{draft && <Alert>{t("Application.draft")}</Alert>}
    <ErrorSummary error={error} title={t("Feedback.validation")} fields={fields} />
    {frozen && error && <Alert tone="warning"><p>{t("Application.uncertain")}</p><Button variant="secondary" pending={busy} onClick={() => { void submit(frozen); }}>{t("Setup.retrySame")}</Button></Alert>}
    <form noValidate onSubmit={event => { event.preventDefault(); const parsed = NewStudioRegistrationBodySchema.safeParse({ operationId, ...(draft && { onboardingRevision: draft.revision }), name: details.studioName,
      ...(details.country && { country: details.country }), ...(details.city && { city: details.city }), ...(details.directorName && { directorName: details.directorName }), ...(details.directorPhone && { directorPhone: details.directorPhone }), representativeName: name, representativeEmail: email });
      if (!parsed.success) { setError(toUiError(parsed.error)); return; } void submit(parsed.data); }}>
      <fieldset disabled={busy || disabled || !!frozen}>
        <AccountField id="apply-studioName" path="name" label={t("Flow.studioName")} value={details.studioName} onChange={value => setDetails({ ...details, studioName: value })} error={error} required />
        <AccountField id="apply-representativeName" path="representativeName" label={t("Application.representativeName")} value={name} onChange={setName} error={error} required />
        <AccountField id="apply-representativeEmail" path="representativeEmail" type="email" label={t("Application.representativeEmail")} value={email} onChange={setEmail} error={error} required />
        <details><summary>{t("Application.optional")}</summary><StudioFields prefix="optional-" omitName value={details} onChange={setDetails} error={error} /></details>
        <Button type="submit" pending={busy}>{t("Application.apply")}</Button>
      </fieldset>
    </form>
    {frozen && error && error.reason !== "network" && error.reason !== "authenticationRequired" && error.reason !== "invalidResponse" && <Button variant="quiet" onClick={() => setFrozen(null)}>{t("Application.editInput")}</Button>}
  </section>;
}
