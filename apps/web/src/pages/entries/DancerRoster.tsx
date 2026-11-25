import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { Dancer, EntryContext } from "@dance/schemas";
import { getStudio } from "../../api/studios";
import { getDancers } from "../../api/dancers";
import { getEntryContext } from "../../api/entry-workflow";
import { toUiError, type UiError } from "../../api/error";
import { Button, EmptyState, ErrorSummary, Field, Input } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import { formatCalendarDate } from "../../i18n/format";
import { useAuth } from "../../auth/useAuth";
import EntryLoading from "../performances/EntryLoading";
import DancerEditor from "./DancerEditor";
import "./entries.css";

function Roster({ studioId }: { studioId: string }) {
  const { t, locale } = useTranslation(); const [params, setParams] = useSearchParams();
  const [value, setValue] = useState<{ rows: Dancer[]; context: EntryContext } | null>(null);
  const [error, setError] = useState<UiError | null>(null); const [attempt, setAttempt] = useState(0); const [dirty, setDirty] = useState(false);
  const dirtyChanged = useCallback((next: boolean) => setDirty(next), []);
  const [notice, setNotice] = useState<"saved" | "archived" | null>(null);
  useEffect(() => { let active = true;
    void getStudio(studioId).then(async studio => {
      const [rows, context] = await Promise.all([getDancers(studioId), getEntryContext(studio.eventId, studioId)]);
      if (active) { setValue({ rows, context }); setError(null); }
    }).catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; };
  }, [studioId, attempt]);
  const selected = params.get("dancer"); const search = params.get("q") ?? "";
  const rows = value?.rows.filter(row => `${row.firstName} ${row.lastName}`.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))) ?? [];
  const mayLeave = () => !dirty || window.confirm(t("Roster.discard"));
  function select(id: string | null) {
    if (!mayLeave()) return;
    setDirty(false); setNotice(null); setParams(current => { const next = new URLSearchParams(current); if (id) next.set("dancer", id); else next.delete("dancer"); return next; });
  }
  const editor = selected && selected !== "new" ? value?.rows.find(row => row.id === selected) : null;
  return <div className="event-workbench"><header className="event-masthead"><div><h1>{t("Roster.title")}</h1><p>{value?.context.studioName}</p></div>
    {value && <Link to={`/events/${value.context.eventId}/studios/${studioId}/performances`}>{t("Roster.entries")}</Link>}</header>
    <ErrorSummary error={error} title={t("Events.loadError")} />
    {error && <Button onClick={() => { setError(null); setAttempt(value => value + 1); }}>{t("Shell.retry")}</Button>}
    {!value ? !error && <EntryLoading /> : <>
      <div className="entry-context"><p>{value.context.eventName}</p><p>{t("Roster.ageDate")}: <time dateTime={value.context.ageDate}>{formatCalendarDate(value.context.ageDate, locale)}</time></p></div>
      {!value.context.writableFields.includes("roster") && <p>{t("Roster.locked")}</p>}
      <div className="entry-actions"><Button id="roster-add" disabled={!value.context.writableFields.includes("roster")} onClick={() => select("new")}>{t("Roster.add")}</Button>
        <Button variant="quiet" onClick={() => setAttempt(value => value + 1)}>{t("Roster.refresh")}</Button></div>
      <Field id="roster-search" label={t("Roster.search")}>{attrs => <Input {...attrs} value={search} maxLength={200} onChange={event => setParams(current => { const next = new URLSearchParams(current); if (event.target.value) next.set("q", event.target.value); else next.delete("q"); return next; }, { replace: true })} />}</Field>
      {notice && <p role="status">{t(notice === "archived" ? "Roster.archived" : "Entry.saved")}</p>}
      {!rows.length ? <EmptyState title={t(search ? "Roster.noMatch" : "Roster.none")} description={t("Roster.empty")} /> : <table className="performance-register"><caption className="sr-only">{t("Roster.title")}</caption>
        <thead><tr><th scope="col">{t("Roster.firstName")}</th><th scope="col">{t("Roster.birthDate")}</th><th scope="col">{t("Entry.edit")}</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}><th scope="row">{row.firstName} {row.lastName}</th><td data-label={t("Roster.birthDate")}><time dateTime={row.birthDate}>{formatCalendarDate(row.birthDate, locale)}</time></td><td>
          <Button id={`dancer-open-${row.id}`} variant="quiet" onClick={() => select(row.id)} aria-expanded={selected === row.id} aria-label={`${t("Roster.edit")}: ${row.firstName} ${row.lastName}`}>{t("Entry.edit")}</Button></td></tr>)}</tbody>
      </table>}
      {selected && (selected === "new" || editor) && <DancerEditor key={selected} row={editor ?? null} studioId={studioId} editable={!error && value.context.writableFields.includes("roster")} dirtyChanged={dirtyChanged}
        saved={(row, archived) => { setValue(current => current && { ...current, rows: archived ? current.rows.filter(value => value.id !== row.id) : [...current.rows.filter(value => value.id !== row.id), row] }); if (archived) { setParams(current => { const next = new URLSearchParams(current); next.delete("dancer"); return next; }); setDirty(false); setNotice("archived"); document.getElementById("roster-add")?.focus(); } }}
        close={() => { const id = selected; setDirty(false); setParams(current => { const next = new URLSearchParams(current); next.delete("dancer"); return next; }); (document.getElementById(`dancer-open-${id}`) ?? document.getElementById("roster-add"))?.focus(); }} />}
      {selected && selected !== "new" && !editor && <p>{t("Shell.notFound")}</p>}
    </>}
  </div>;
}
export default function DancerRoster() { const { studioId = "" } = useParams(); const { user } = useAuth(); return <Roster key={`${user?.id}:${studioId}`} studioId={studioId} />; }
