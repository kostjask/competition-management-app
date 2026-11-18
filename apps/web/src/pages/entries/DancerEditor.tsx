import { useEffect, useRef, useState } from "react";
import { CreateDancerBodySchema, UpdateDancerBodySchema, type Dancer, type CreateDancerInput, type UpdateDancerInput } from "@dance/schemas";
import { createDancer, updateDancer, deleteDancer, getDancer } from "../../api/dancers";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { AccountField } from "../../auth/AccountField";
import { Button, ErrorSummary } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import { useUnsaved } from "./useUnsaved";

type Operation = { action: "create"; body: CreateDancerInput } | { action: "edit"; body: UpdateDancerInput } | { action: "archive"; body: { operationId: string; expectedRevision: number } };
export default function DancerEditor({ row: initial, studioId, editable, saved, close, dirtyChanged }: {
  row: Dancer | null; studioId: string; editable: boolean; saved: (row: Dancer, archived: boolean) => void; close: () => void; dirtyChanged: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const [row, setRow] = useState(initial);
  const [fields, setFields] = useState({ firstName: row?.firstName ?? "", lastName: row?.lastName ?? "", birthDate: row?.birthDate ?? "" });
  const [revision, setRevision] = useState(row?.revision ?? 1); const [dirty, setDirty] = useState(false);
  const [operation, setOperation] = useState<Operation | null>(null); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [error, setError] = useState<UiError | null>(null); const [acknowledged, setAcknowledged] = useState(false);
  const [archive, setArchive] = useState(false); const [confirmed, setConfirmed] = useState(false);
  const [comparison, setComparison] = useState<Dancer | null>(null); const [reviewed, setReviewed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { dirtyChanged(dirty || operation !== null); }, [dirty, operation, dirtyChanged]);
  useUnsaved(dirty || operation !== null);
  async function compare() {
    if (!row) return;
    try { setComparison(await getDancer(studioId, row.id)); setReviewed(false); } catch (err) { setError(toUiError(err)); }
  }
  async function save() {
    if (lock.current) return;
    let command = operation;
    if (!command) {
      if (archive && row) command = { action: "archive", body: { operationId: crypto.randomUUID(), expectedRevision: revision } };
      else if (row) {
        const result = UpdateDancerBodySchema.safeParse({ ...fields, operationId: crypto.randomUUID(), expectedRevision: revision });
        if (!result.success) { setError(toUiError(result.error)); return; }
        command = { action: "edit", body: result.data };
      } else {
        const result = CreateDancerBodySchema.safeParse({ ...fields, operationId: crypto.randomUUID() });
        if (!result.success) { setError(toUiError(result.error)); return; }
        command = { action: "create", body: result.data };
      }
    }
    const frozen = command; setOperation(frozen); setBusy(true); lock.current = true; setError(null); setAcknowledged(false);
    try {
      if (frozen.action === "archive" && row) { await deleteDancer(studioId, row.id, frozen.body); saved(row, true); }
      else {
        const response = frozen.action === "create" ? await createDancer(studioId, frozen.body) : frozen.action === "edit" && row ? await updateDancer(studioId, row.id, frozen.body) : null;
        if (!response) throw new Error("Missing dancer response");
        setRow(response); setRevision(response.revision); setFields({ firstName: response.firstName, lastName: response.lastName, birthDate: response.birthDate }); saved(response, false);
      }
      setOperation(null); setDirty(false); setAcknowledged(true);
    } catch (err) {
      setError(toUiError(err));
      if (err instanceof ApiError && [400, 403, 404, 409, 422].includes(err.statusCode)) setOperation(null);
      if (err instanceof ApiError && err.statusCode === 409) await compare();
    } finally { setBusy(false); lock.current = false; }
  }
  return <section className="entry-editor dancer-editor" aria-labelledby="dancer-editor-title">
    <h2 ref={heading} tabIndex={-1} id="dancer-editor-title">{t(row ? "Roster.edit" : "Roster.add")}{row ? `: ${row.firstName} ${row.lastName}` : ""}</h2>
    <ErrorSummary error={error} title={t("Entry.error")} fields={{ firstName: "dancer-firstName", lastName: "dancer-lastName", birthDate: "dancer-birthDate" }} />
    {comparison && <section className="entry-comparison"><h3>{t("Entry.comparison")}</h3><p>{comparison.firstName} {comparison.lastName}: <time dateTime={comparison.birthDate}>{comparison.birthDate}</time></p><p>{t("Performance.revision")} {comparison.revision}</p>
      <label className="entry-check"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />{t("Entry.compareConfirm")}</label>
      <div className="entry-actions"><Button variant="quiet" disabled={!reviewed} onClick={() => { setRevision(comparison.revision); setComparison(null); setError(null); setConfirmed(false); }}>{t("Entry.applyCompared")}</Button>
        <Button variant="quiet" disabled={!reviewed} onClick={() => { setRow(comparison); setFields({ firstName: comparison.firstName, lastName: comparison.lastName, birthDate: comparison.birthDate }); setRevision(comparison.revision); saved(comparison, false); setComparison(null); setError(null); setDirty(false); setConfirmed(false); }}>{t("Entry.replaceSaved")}</Button></div>
    </section>}
    {acknowledged && <p role="status">{t(archive ? "Roster.archived" : "Entry.saved")}</p>}
    <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={!editable || busy || operation !== null || archive}><legend className="sr-only">{t("Roster.title")}</legend>
        {(["firstName", "lastName", "birthDate"] as const).map(key => <AccountField key={key} id={`dancer-${key}`} path={key} label={t(`Roster.${key}`)} type={key === "birthDate" ? "date" : "text"} value={fields[key]} error={error} onChange={value => { setFields(current => ({ ...current, [key]: value })); setDirty(true); setAcknowledged(false); }} />)}
      </fieldset>
      {archive && <><p>{t("Roster.archiveHelp")}</p><label className="entry-check"><input type="checkbox" checked={confirmed} disabled={busy || operation !== null || acknowledged} onChange={event => setConfirmed(event.target.checked)} />{t("Roster.archiveConfirm")}</label></>}
      {operation && <p>{t("Performance.retryHelp")}</p>}
      <div className="entry-actions">
        {!(archive && acknowledged) && <Button type="submit" pending={busy} disabled={comparison !== null || (!operation && (!editable || (!archive && !!row && !dirty) || (archive && !confirmed)))}>{t(operation ? "Entry.retry" : archive ? "Roster.archive" : "Entry.save")}</Button>}
        {row && !archive && <Button variant="quiet" disabled={!editable || busy || operation !== null} onClick={() => { setArchive(true); setAcknowledged(false); }}>{t("Roster.archive")}</Button>}
        {error?.reason === "concurrentChange" && !comparison && <Button variant="quiet" onClick={() => { void compare(); }}>{t("Entry.comparison")}</Button>}
        <Button variant="quiet" disabled={busy || operation !== null} onClick={() => { if (!dirty || window.confirm(t("Roster.discard"))) close(); }}>{t("Entry.close")}</Button>
      </div>
    </form>
  </section>;
}
