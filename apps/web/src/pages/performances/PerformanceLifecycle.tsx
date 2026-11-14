import { useEffect, useRef, useState } from "react";
import type { Performance, PerformanceLifecycleInput } from "@dance/schemas";
import { changePerformanceLifecycle, getPerformance } from "../../api/performances";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { Button, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";

export default function PerformanceLifecycle({ row, refresh, close }: { row: Performance; refresh: () => Promise<void>; close: () => void }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState(""); const [confirmed, setConfirmed] = useState(false);
  const [operation, setOperation] = useState<PerformanceLifecycleInput | null>(null);
  const [error, setError] = useState<UiError | null>(null); const [pending, setPending] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false); const [refreshed, setRefreshed] = useState(false);
  const [comparison, setComparison] = useState<Performance | null>(null); const busy = useRef(false);
  const [revision, setRevision] = useState(row.revision);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  async function save() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(null);
    const body = operation ?? { expectedRevision: revision, operationId: crypto.randomUUID(), action: row.archived ? "RESTORE" : "WITHDRAW", reason } satisfies PerformanceLifecycleInput;
    if (!acknowledged) setOperation(body);
    try {
      if (!acknowledged) { await changePerformanceLifecycle(row.eventId, row.id, body); setAcknowledged(true); }
      await refresh(); setRefreshed(true);
    } catch (err: unknown) {
      setError(toUiError(err));
      if (err instanceof ApiError && [400, 403, 404, 409].includes(err.statusCode)) setOperation(null);
      if (err instanceof ApiError && err.statusCode === 409) {
        try { setComparison(await getPerformance(row.eventId, row.id)); } catch { /* Keep the frozen operation if comparison fails. */ }
      }
    } finally { busy.current = false; setPending(false); }
  }
  return <section className="entry-editor" aria-labelledby="entry-lifecycle-title">
    <h2 id="entry-lifecycle-title" ref={heading} tabIndex={-1}>{t(row.archived ? "Entry.restore" : "Entry.withdraw")}: {row.title ?? t("Performance.untitled")}</h2>
    <p>{t("Entry.lifecycleHelp")}</p><ErrorSummary error={error} title={t("Entry.error")} />
    {acknowledged && <p role="status">{t(row.archived ? "Entry.restored" : "Entry.withdrawn")}</p>}
    {comparison && <section className="entry-comparison"><h3>{t("Entry.comparison")}</h3><p>{t("Performance.revision")} {comparison.revision}: {t(comparison.archived ? "Entry.withdrawnState" : "Entry.activeState")}</p>
      <Button variant="quiet" disabled={pending || comparison.archived !== row.archived} onClick={() => { setRevision(comparison.revision); setComparison(null); setOperation(null); setConfirmed(false); setError(null); }}>{t("Entry.applyCompared")}</Button></section>}
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={pending || operation !== null || acknowledged}><legend className="sr-only">{t("Entry.reason")}</legend>
        <Field id="entry-lifecycle-reason" label={t("Entry.reason")}>{attrs => <Input {...attrs} required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} />}</Field>
        <label className="entry-check"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{t("Entry.lifecycleConfirm")}</label>
      </fieldset>
      <div className="entry-actions">{!refreshed && <Button type="submit" pending={pending} disabled={comparison !== null || (!acknowledged && !operation && (!confirmed || !reason.trim()))}>{t(acknowledged ? "Shell.retry" : operation ? "Entry.retry" : row.archived ? "Entry.restore" : "Entry.withdraw")}</Button>}
        <Button variant="quiet" disabled={pending || (operation !== null && !acknowledged)} onClick={close}>{t("Entry.close")}</Button></div>
    </form>
  </section>;
}
