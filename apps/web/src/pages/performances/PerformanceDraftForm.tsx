import { useRef, useState, type FormEvent } from "react";
import { CreatePerformanceBodySchema, type CreatePerformanceInput, type Performance, type StudioRegistration } from "@dance/schemas";
import { createPerformance } from "../../api/performances";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { Button, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";

export default function PerformanceDraftForm({ eventId, studios, ready, saved, withdrawnView = false }: {
  eventId: string; studios: StudioRegistration[]; ready: boolean; saved: (performance: Performance) => void; withdrawnView?: boolean;
}) {
  const { t } = useTranslation();
  const [studioId, setStudioId] = useState("");
  const [title, setTitle] = useState("");
  const [frozen, setFrozen] = useState<CreatePerformanceInput | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<UiError | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const eligible = studios.filter(row => row.status === "APPROVED" && row.studio.approvalStatus === "APPROVED");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    setAcknowledged(false); setError(null);
    const parsed = CreatePerformanceBodySchema.safeParse(frozen ?? { studioId, title: title.trim() || null, operationId: crypto.randomUUID() });
    if (!parsed.success) { setError(toUiError(parsed.error)); return; }
    const body = parsed.data;
    setFrozen(body); busy.current = true; setPending(true);
    try {
      const performance = await createPerformance(eventId, body);
      saved(performance); setFrozen(null); setTitle(""); setAcknowledged(true);
    } catch (error: unknown) {
      setError(toUiError(error));
      // A definite rejection made no write. Uncertain outcomes keep the exact retry.
      if (frozen === null && error instanceof ApiError && [400, 403, 404, 422].includes(error.statusCode)) setFrozen(null);
    } finally { busy.current = false; setPending(false); }
  }
  return <section className="performance-draft" aria-labelledby="performance-draft-title">
    <h2 id="performance-draft-title">{t("Performance.newDraft")}</h2>
    <p>{t("Performance.draftHelp")}</p>
    {!ready ? <p>{t(withdrawnView ? "Entry.draftActiveOnly" : "Performance.draftUnavailable")}</p> : !eligible.length ? <p>{t("Performance.noDraftOwner")}</p> : <form onSubmit={event => { void submit(event); }}>
      <ErrorSummary error={error} title={t("Performance.saveError")} fields={{ studioId: "draft-owner", title: "draft-title" }} />
      <div className="performance-draft-fields">
        <Field id="draft-owner" label={t("Performance.draftOwner")} required>{attrs => <select {...attrs} className="ui-input" value={studioId}
          disabled={pending || frozen !== null} onChange={event => { setStudioId(event.target.value); setAcknowledged(false); }}>
          <option value="">{t("Performance.chooseOwner")}</option>
          {eligible.map(row => <option key={row.id} value={row.studioId}>{row.studio.name}</option>)}
        </select>}</Field>
        <Field id="draft-title" label={t("Performance.optionalTitle")}>{attrs => <Input {...attrs} value={title} maxLength={500}
          disabled={pending || frozen !== null} onChange={event => { setTitle(event.target.value); setAcknowledged(false); }} />}</Field>
      </div>
      {frozen && <p>{t("Performance.retryHelp")}</p>}
      <Button type="submit" pending={pending}>{t(pending ? "Performance.saving" : frozen ? "Performance.retrySave" : "Performance.saveDraft")}</Button>
      {acknowledged && <p role="status">{t("Performance.draftSaved")}</p>}
    </form>}
  </section>;
}
