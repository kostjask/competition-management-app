import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CreatePerformanceBodySchema, EntryFieldSchema, performanceMissingFields, type CreatePerformanceInput, type EntryContext, type Performance } from "@dance/schemas";
import { createPerformance, getPerformances } from "../../api/performances";
import { getEntryContext } from "../../api/entry-workflow";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { Button, EmptyState, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import { formatCalendarDate } from "../../i18n/format";
import { useAuth } from "../../auth/useAuth";
import PerformanceEditor from "../performances/PerformanceEditor";
import PerformanceLifecycle from "../performances/PerformanceLifecycle";
import EntryLoading from "../performances/EntryLoading";
import EntryReviewPanel from "../performances/EntryReviewPanel";
import { useUnsaved } from "./useUnsaved";
import "./entries.css";

function NewEntry({ context, saved, close }: { context: EntryContext; saved: (row: Performance) => void; close: () => void }) {
  const { t } = useTranslation(); const [title, setTitle] = useState(""); const [operation, setOperation] = useState<CreatePerformanceInput | null>(null);
  const [error, setError] = useState<UiError | null>(null); const [pending, setPending] = useState(false); const busy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null); useEffect(() => { heading.current?.focus(); }, []);
  const permitLeave = useUnsaved(!!title || operation !== null);
  async function save() {
    if (busy.current) return;
    const parsed = CreatePerformanceBodySchema.safeParse(operation ?? { studioId: context.studioId, title: title.trim() || null, operationId: crypto.randomUUID() });
    if (!parsed.success) { setError(toUiError(parsed.error)); return; }
    setOperation(parsed.data); setError(null); setPending(true); busy.current = true;
    try { const row = await createPerformance(context.eventId, parsed.data); permitLeave(); saved(row); }
    catch (err) { setError(toUiError(err)); if (err instanceof ApiError && [400, 403, 404, 422].includes(err.statusCode)) setOperation(null); }
    finally { setPending(false); busy.current = false; }
  }
  return <section className="entry-editor"><h2 ref={heading} tabIndex={-1}>{t("Roster.newEntry")}</h2><p>{t("Performance.draftHelp")}</p>
    <ErrorSummary error={error} title={t("Entry.error")} fields={{ title: "entry-new-title" }} />
    <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}><Field id="entry-new-title" label={t("Performance.optionalTitle")}>{attrs => <Input {...attrs} maxLength={500} value={title} disabled={pending || operation !== null} onChange={event => setTitle(event.target.value)} />}</Field>
      {operation && <p>{t("Performance.retryHelp")}</p>}<div className="entry-actions"><Button type="submit" pending={pending} disabled={!operation && !context.writableFields.includes("entries")}>{t(operation ? "Entry.retry" : "Performance.saveDraft")}</Button>
        <Button variant="quiet" disabled={pending || operation !== null} onClick={close}>{t("Entry.close")}</Button></div>
    </form>
  </section>;
}

function Workspace({ eventId, studioId, performanceId, creating }: { eventId: string; studioId: string; performanceId?: string; creating: boolean }) {
  const { t, locale } = useTranslation(); const navigate = useNavigate(); const [params, setParams] = useSearchParams();
  const state = params.get("entry") !== "review" && params.get("state") === "withdrawn" ? "withdrawn" : "active";
  const [value, setValue] = useState<{ context: EntryContext; rows: Performance[] } | null>(null);
  const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0); const [notice, setNotice] = useState(false);
  const [lifecycle, setLifecycle] = useState<Performance | null>(null);
  const base = `/events/${eventId}/studios/${studioId}/performances`;
  const review = params.get("entry") === "review";
  const reviewSearch = review ? `?entry=review&checkpoint=${params.get("checkpoint") === "FINAL" ? "FINAL" : "BASIC"}` : "";
  const returnTo = base + reviewSearch;
  useEffect(() => { let active = true;
    void Promise.all([getEntryContext(eventId, studioId, performanceId), getPerformances(eventId, studioId, state)]).then(([context, rows]) => { if (active) { setValue({ context, rows }); setError(null); } })
      .catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; };
  }, [eventId, studioId, state, attempt, performanceId]);
  const row = value?.rows.find(row => row.id === performanceId && row.studioId === studioId && row.eventId === eventId && !row.archived);
  return <div className="event-workbench"><header className="event-masthead"><div><h1>{t("Roster.entries")}</h1><p>{value?.context.studioName}</p></div>
    {!creating && !performanceId && <Link to={`/studios/${studioId}/dancers`}>{t("Roster.title")}</Link>}</header>
    <ErrorSummary error={error} title={t("Events.loadError")} />
    {error ? <Button onClick={() => { setError(null); setAttempt(value => value + 1); }}>{t("Shell.retry")}</Button> : !value ? <EntryLoading /> : <>
      <div className="entry-context"><p>{value.context.eventName}</p><p>{t("Roster.ageDate")}: <time dateTime={value.context.ageDate}>{formatCalendarDate(value.context.ageDate, locale)}</time> ({value.context.timeZone})</p></div>
      {!review && <p>{t("Roster.draftsOnly")}</p>}
      {!performanceId && value.context.writableFields.length < EntryFieldSchema.options.length && <p>{t("Roster.locked")}</p>}
      {Object.values(value.context.options).some(rows => !rows.length) && <p>{t("Roster.optionsMissing")}</p>}
      {notice && <p role="status">{t("Performance.draftSaved")}</p>}
      {creating ? <NewEntry context={value.context} close={() => navigate(returnTo)} saved={row => { setValue(current => current && { ...current, rows: [...current.rows, row] }); setNotice(true); navigate(`${base}/${row.id}/edit${reviewSearch}`, { replace: true }); }} />
        : performanceId ? row ? <PerformanceEditor key={row.id} row={row} context={value.context} saved={row => setValue(current => current && { ...current, rows: current.rows.map(value => value.id === row.id ? row : value) })} close={() => navigate(returnTo)} /> : <><p>{t("Shell.notFound")}</p><Link to={returnTo}>{t("Entry.close")}</Link></>
          : <>
            {review ? <><Link to={base}>{t("Roster.entries")}</Link><EntryReviewPanel ownWorkspace eventId={eventId} studioId={studioId} zone={value.context.timeZone} entries={value.rows} changed={async () => {
              const [context, rows] = await Promise.all([getEntryContext(eventId, studioId), getPerformances(eventId, studioId)]); setValue({ context, rows });
            }} /></> : <>
            <div className="entry-actions"><Link className="ui-button ui-button-primary" to={`${base}/new`}>{t("Roster.newEntry")}</Link><Link className="ui-button ui-button-tonal" to={`${base}?entry=review`}>{t("Entry.review")}</Link><Button variant="quiet" onClick={() => setAttempt(value => value + 1)}>{t("Roster.refresh")}</Button></div>
            <Field id="entry-state" label={t("Entry.entryState")}>{attrs => <select {...attrs} className="ui-input" value={state} onChange={event => { setValue(null); setParams({ state: event.target.value }); }}><option value="active">{t("Entry.activeState")}</option><option value="withdrawn">{t("Entry.withdrawnState")}</option></select>}</Field>
            {!value.rows.length ? <EmptyState title={t(state === "withdrawn" ? "Entry.noWithdrawn" : "Performance.none")} description={t(state === "withdrawn" ? "Entry.noWithdrawnHelp" : "Performance.empty")} /> : <table className="performance-register"><caption className="sr-only">{t("Roster.entries")}</caption>
              <thead><tr><th scope="col">{t("Performance.performance")}</th><th scope="col">{t("Performance.participants")}</th><th scope="col">{t("Entry.edit")}</th></tr></thead><tbody>{value.rows.map(row => <tr key={row.id}><th scope="row">{row.title ?? t("Performance.untitled")}<span className="performance-completeness">{t(row.orderOnStage === null ? "Performance.unscheduled" : "Performance.scheduled")}</span>
                <span className="performance-completeness">{performanceMissingFields(row).length ? `${t("Performance.missing")} ${performanceMissingFields(row).map(key => t(`Performance.missing_${key}`)).join(", ")}` : t("Performance.fieldsPresent")}</span></th>
                <td data-label={t("Performance.participants")}>{new Intl.NumberFormat(locale).format(row.participants.length)}</td><td>{!row.archived && <Link to={`${base}/${row.id}/edit`}>{t("Entry.edit")}</Link>}
                  <Button variant="quiet" id={`lifecycle-${row.id}`} disabled={lifecycle !== null || !value.context.writableFields.includes("entries")} onClick={() => setLifecycle(row)}>{t(row.archived ? "Entry.restore" : "Entry.withdraw")}</Button></td></tr>)}</tbody>
            </table>}
            {lifecycle && <PerformanceLifecycle key={lifecycle.id} row={lifecycle} refresh={async () => { const rows = await getPerformances(eventId, studioId, state); setValue(current => current && { ...current, rows }); }} close={() => { const id = lifecycle.id; setLifecycle(null); (document.getElementById(`lifecycle-${id}`) ?? document.getElementById("entry-state"))?.focus(); }} />}
            </>}
          </>}
    </>}
  </div>;
}
export default function EntryWorkspace({ creating = false }: { creating?: boolean }) {
  const { eventId = "", studioId = "", performanceId } = useParams(); const { user } = useAuth();
  return <Workspace key={`${user?.id}:${eventId}:${studioId}:${performanceId ?? ""}:${creating}`} eventId={eventId} studioId={studioId} performanceId={performanceId} creating={creating} />;
}
