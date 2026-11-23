import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { ResultsCommand, ResultsReceipt, ResultsSnapshot, ResultsWorkspace } from "@dance/schemas";
import { getResults, saveResults } from "../../api/results";
import { ApiError, toUiError, type UiError } from "../../api/error";
import { useAuth } from "../../auth/useAuth";
import { Button, ErrorSummary, Field } from "../../components/ui/Foundation";
import { stageKey } from "../../features/events/setup";
import { useTranslation } from "../../i18n/useTranslation";
import { useUnsaved } from "../entries/useUnsaved";
import EntryLoading from "../performances/EntryLoading";
import "./results.css";

type Entries = ResultsSnapshot["ungrouped"];
const groupName = (group: ResultsSnapshot["groups"][number]) => [group.category.name, group.ageGroup.name, group.format.name].join(" / ");

function RankingTable({ entries, name }: { entries: Entries; name: string }) {
  const { t, locale } = useTranslation();
  const score = new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const rank = new Intl.NumberFormat(locale);
  const counts = new Map<number, number>();
  for (const entry of entries) if (entry.rank !== null) counts.set(entry.rank, (counts.get(entry.rank) ?? 0) + 1);
  return <table className="results-table">
    <caption>{name}</caption>
    <thead><tr><th scope="col">{t("Results.rank")}</th><th scope="col">{t("Results.performance")}</th><th scope="col">{t("Results.total")}</th></tr></thead>
    <tbody>{entries.map(entry => <tr key={entry.performanceId}>
      <td>{entry.rank === null ? "—" : rank.format(entry.rank)}</td>
      <th scope="row">{entry.title ?? t("Performance.untitled")}
        {entry.rank !== null && (counts.get(entry.rank) ?? 0) > 1 && <small>{t("Results.tie")}</small>}
        {entry.state !== "RANKABLE" && <small>{t(`Results.${entry.state}`)}</small>}
        {entry.state === "PENDING" && entry.required > 0 && <small>{t("Results.sheets")} {rank.format(entry.submitted)}/{rank.format(entry.required)}</small>}
      </th>
      <td>{entry.total === null ? "—" : score.format(Number(entry.total))}
        {entry.deduction && Number(entry.deduction) > 0 && <small>{t("Results.deduction")} {score.format(Number(entry.deduction))}</small>}
      </td>
    </tr>)}</tbody>
  </table>;
}

function ResultsLedger({ snapshot, historic }: { snapshot: ResultsSnapshot; historic: boolean }) {
  const { t, locale } = useTranslation();
  const [params, setParams] = useSearchParams();
  const groups = [...snapshot.groups].sort((a, b) => groupName(a).localeCompare(groupName(b), locale));
  const selected = groups.find(group => group.id === params.get("group")) ?? groups[0];
  function selectGroup(id: string) {
    setParams(current => { const next = new URLSearchParams(current); next.set("group", id); return next; });
  }
  return <>
    {!historic && (snapshot.blockers.length ? <section className="results-checks" aria-labelledby="results-check-title">
      <h2 id="results-check-title">{t("Results.blockers")}</h2>
      <ul>{snapshot.blockers.map(issue => <li key={`${issue.kind}:${issue.performanceId}`}>
        {issue.performanceId && <strong>{issue.title ?? t("Performance.untitled")} </strong>}
        {t(`Results.${issue.kind}`)}
      </li>)}</ul>
    </section> : <p className="results-checks">{t("Results.ready")}</p>)}
    {(selected || snapshot.ungrouped.length > 0) && <section aria-labelledby="results-ranking-title">
      <h2 id="results-ranking-title">{t("Results.ranking")}</h2>
      {selected && <>
        <Field id="result-group" label={t("Results.group")}>{attrs => <select {...attrs} className="ui-input" value={selected.id}
          onChange={event => selectGroup(event.target.value)}>{groups.map(group => <option key={group.id} value={group.id}>{groupName(group)}</option>)}</select>}</Field>
        {selected.entries.some(entry => entry.state === "PENDING") && <p>{t("Results.withheld")}</p>}
        <RankingTable entries={selected.entries} name={groupName(selected)} />
      </>}
      {!!snapshot.ungrouped.length && <RankingTable entries={snapshot.ungrouped} name={t("Results.ungrouped")} />}
    </section>}
  </>;
}

function Workspace({ eventId }: { eventId: string }) {
  const { t, locale } = useTranslation();
  const { sessionExpired } = useAuth();
  const [params, setParams] = useSearchParams();
  const revision = params.get("revision") ?? undefined;
  const [load, setLoad] = useState<{ generation: number; operationId?: string }>({ generation: 0 });
  const [read, setRead] = useState<{ generation: number; revision?: string; value: ResultsWorkspace } | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [pending, setPending] = useState<ResultsCommand | null>(null);
  const [ack, setAck] = useState<ResultsReceipt | null>(null);
  const [working, setWorking] = useState(false);
  const [compared, setCompared] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const action = useRef<AbortController | null>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  useUnsaved(!!pending || confirming);

  useEffect(() => () => { action.current?.abort(); }, []);
  useEffect(() => { if (confirming) confirmation.current?.focus(); }, [confirming]);
  useEffect(() => {
    if (sessionExpired) return;
    const abort = new AbortController();
    void getResults(eventId, { revision, operationId: load.operationId }, abort.signal).then(value => {
      if (abort.signal.aborted) return;
      setRead({ generation: load.generation, revision, value });
      if (load.operationId && value.receipt?.operationId === load.operationId) {
        setAck(value.receipt);
        setPending(current => current?.operationId === load.operationId ? null : current);
      } else if (load.operationId) setCompared(true);
    }).catch(reason => { if (!abort.signal.aborted) setError(toUiError(reason)); });
    return () => abort.abort();
  }, [eventId, load, revision, sessionExpired]);

  const value = !sessionExpired && read?.generation === load.generation && read.revision === revision ? read.value : null;
  const latest = value?.revisions[0];
  const saved = value?.saved;
  const snapshot = revision || !value?.current ? saved?.snapshot : value.current.snapshot;
  const historic = !!revision || !value?.current;
  const canEdit = !!value?.current && !historic && !working && !pending && !error;
  const matches = !!latest && latest.source === value?.current?.source;
  const complete = !!value?.current && value.current.snapshot.blockers.length === 0;
  const date = (time: string) => new Intl.DateTimeFormat(locale, {
    dateStyle: "medium", timeStyle: "short", timeZone: snapshot?.timeZone ?? "UTC",
  }).format(new Date(time));

  function refresh(operationId?: string) {
    setError(null);
    setCompared(false);
    setConfirming(false);
    setLoad(previous => ({ generation: previous.generation + 1, operationId }));
  }

  async function execute(command: ResultsCommand) {
    if (action.current || sessionExpired) return;
    const abort = new AbortController();
    action.current = abort;
    setWorking(true);
    setConfirming(false);
    setCompared(false);
    setError(null);
    setPending(command);
    setAck(null);
    try {
      const receipt = await saveResults(eventId, command, abort.signal);
      if (abort.signal.aborted) return;
      setAck(receipt);
      setPending(null);
      refresh();
    } catch (reason) {
      if (abort.signal.aborted) return;
      if (reason instanceof ApiError && [401, 403].includes(reason.statusCode)) setRead(null);
      setError(toUiError(reason));
    } finally {
      if (action.current === abort) action.current = null;
      if (!abort.signal.aborted) setWorking(false);
    }
  }

  function submit(action: ResultsCommand["action"]) {
    if (!canEdit || !complete || !value.current) return;
    void execute({ action, operationId: crypto.randomUUID(), expectedRevision: latest?.revision ?? 0, source: value.current.source });
  }

  return <div className="event-workbench results-workbench">
    <header className="event-masthead"><div><h1>{t("Results.title")}</h1><p>{snapshot?.eventName ?? value?.eventName}</p></div>
      <Link to={`/admin/events/${encodeURIComponent(eventId)}/setup`}>{t("Setup.title")}</Link>
    </header>
    <div className="results-toolbar">
      <div><p>{t("Results.privateReview")}</p>{value && <p>{t(stageKey[value.stage])}</p>}</div>
      <Button variant="secondary" disabled={working || sessionExpired} onClick={() => refresh(pending?.operationId)}>{t("Results.refresh")}</Button>
    </div>
    <ErrorSummary title={t("Entry.error")} error={error} />
    {pending && !working && <section className="results-confirm">
      <p role="status">{t(compared ? "Results.noReceipt" : "Results.uncertain")}</p>
      {compared && <div className="ui-actions">
        <Button disabled={sessionExpired} onClick={() => { void execute(pending); }}>{t("Entry.retry")}</Button>
        <Button variant="secondary" onClick={() => { setPending(null); setCompared(false); }}>{t("Results.useServer")}</Button>
      </div>}
    </section>}
    {working && <p role="status">{t("Access.loading")}</p>}
    {ack && !value?.finalized && <p className="results-version" role="status">
      {t(ack.action === "FINALIZE" ? "Results.finalized" : "Results.saved")} <span>{t("Results.revision")} {ack.revision}</span>
    </p>}
    {!value && !error && !sessionExpired && <EntryLoading />}
    {value && <>
      {value.finalized && <p className="results-version" role={ack?.action === "FINALIZE" ? "status" : undefined}><strong>{t("Results.finalized")}</strong>
        <span>{t("Results.revision")} {value.finalized.revision}</span><time dateTime={value.finalized.createdAt}>{date(value.finalized.createdAt)}</time>
      </p>}
      {!!value.revisions.length && <Field id="result-revision" label={t("Results.calculation")}>{attrs =>
        <select {...attrs} className="ui-input" value={revision ?? ""} disabled={!!pending || confirming}
          onChange={event => {
            setError(null);
            setParams(current => {
              const next = new URLSearchParams(current);
              if (event.target.value) next.set("revision", event.target.value);
              else next.delete("revision");
              return next;
            });
          }}>
          <option value="">{t(value.current ? "Results.current" : "Results.latest")}</option>
          {value.revisions.map(row => <option key={row.revision} value={row.revision}>{t("Results.revision")} {row.revision} ({date(row.createdAt)})</option>)}
        </select>}</Field>}
      {!snapshot && <p>{t(["FINALIZED", "ENDED", "CANCELLED"].includes(value.stage) ? "Results.terminalEmpty" : "Results.empty")}</p>}
      {snapshot && <ResultsLedger snapshot={snapshot} historic={historic} />}
      {!historic && <>
        {latest && !matches && <p>{t("Results.needsSave")}</p>}
        <div ref={actions} className="ui-actions results-actions">
          {!matches && <Button disabled={!canEdit || !complete} onClick={() => submit("CALCULATE")}>{t("Results.save")}</Button>}
          {matches && !confirming && <Button disabled={!canEdit || !complete} onClick={() => setConfirming(true)}>{t("Results.finalize")}</Button>}
        </div>
        {confirming && latest && <section className="results-confirm" aria-labelledby="results-confirm-title">
          <h2 ref={confirmation} tabIndex={-1} id="results-confirm-title">{t("Results.revision")} {latest.revision}</h2>
          <p>{snapshot?.eventName}</p>
          <p>{t("Results.confirmEffect")}</p>
          <div className="ui-actions">
            <Button disabled={!canEdit || !complete} onClick={() => submit("FINALIZE")}>{t("Results.confirm")}</Button>
            <Button variant="secondary" onClick={() => { setConfirming(false); requestAnimationFrame(() => actions.current?.querySelector("button")?.focus()); }}>{t("Common.cancel")}</Button>
          </div>
        </section>}
      </>}
    </>}
  </div>;
}

export default function ResultsPage() {
  const { eventId = "" } = useParams();
  const { user } = useAuth();
  return <Workspace key={`${user?.id}:${eventId}`} eventId={eventId} />;
}
