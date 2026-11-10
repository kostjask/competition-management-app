import { useCallback, useEffect, useRef, useState } from "react";
import type { ApplicationReview, Event, Studio, StudioRegistration, UpdateStudioRegistrationInput } from "@dance/schemas";
import { getStudio, getApplicationReview, getStudios, updateStudioApproval, updateStudioRegistration, cancelStudioRegistration, createStudio } from "../../api/studios";
import { getEvent } from "../../api/events";
import { toUiError, type UiError } from "../../api/error";
import { Button, Alert, ErrorSummary } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import { useAuth } from "../../auth/useAuth";
import { Confirmation } from "./Confirmation";
import { DecisionForm } from "./DecisionForm";
import { ApplicationHistory } from "./ApplicationHistory";
import { StudioEditor } from "./StudioEditor";
import { applicationOpen, reviewOpen, statusKey, reasonKey } from "./policy";

type Snapshot = { studio: Studio; row: StudioRegistration; review: ApplicationReview; event: Event };
type Command = { execute: () => Promise<unknown>; target: string; effect: string };
export function ApplicationDetail({ event, row, admin, onChanged }: { event: Event; row: StudioRegistration; admin: boolean; onChanged: () => void }) {
  const { t } = useTranslation(); const { user } = useAuth();
  const heading = useRef<HTMLHeadingElement>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  const [command, setCommand] = useState<Command | null>(null); const [confirmation, setConfirmation] = useState<Command | null>(null);
  const [comparison, setComparison] = useState<Snapshot | null>(null); const [readbackFailed, setReadbackFailed] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [editorVersion, setEditorVersion] = useState(0);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const read = useCallback(async (): Promise<Snapshot> => {
    const [studio, rows, review, currentEvent] = await Promise.all([getStudio(row.studioId), getStudios(event.id), getApplicationReview(event.id, row.studioId), getEvent(event.id)]);
    const current = rows.find(value => value.studioId === studio.id);
    if (!current || studio.eventId !== event.id) throw new Error("Application unavailable");
    return { studio, row: current, review, event: currentEvent };
  }, [event.id, row.studioId]);
  useEffect(() => { let active = true; void read().then(value => { if (active) setSnapshot(value); }).catch((err: unknown) => { if (active) setError(toUiError(err)); }); return () => { active = false; }; }, [read]);
  const install = (value: Snapshot) => { setSnapshot(value); setComparison(null); setCommand(null); setError(null); setReadbackFailed(false); setEditorVersion(value => value + 1); onChanged(); };
  const execute = async (value: Command) => {
    setBusy(true); setSaved(false); setError(null); setCommand(value);
    try {
      await value.execute(); setSaved(true); setCommand(null);
      try { install(await read()); } catch (err: unknown) { setReadbackFailed(true); setError(toUiError(err)); }
    } catch (err: unknown) { setError(toUiError(err)); setConfirmation(null); }
    finally { setConfirmation(null); setBusy(false); }
  };
  const compare = async () => { setBusy(true); setError(null); try { const value = await read(); if (!snapshot || readbackFailed) install(value); else setComparison(value); } catch (err: unknown) { setError(toUiError(err)); } finally { setBusy(false); } };
  const current = snapshot?.row ?? row; const currentEvent = snapshot?.event ?? event;
  const open = applicationOpen(currentEvent, now); const reviewAllowed = reviewOpen(currentEvent);
  const disabled = busy || !!command || readbackFailed;
  const savedTone = readbackFailed ? "warning" : "success";
  const decision = (axis: "ORGANIZATION" | "EVENT", body: UpdateStudioRegistrationInput) => setConfirmation({
    target: `${t(axis === "ORGANIZATION" ? "Application.organization" : "Application.event")}: ${current.studio.name} (${t(statusKey[body.status])})`, effect: t("Application.decisionEffect"),
    execute: () => axis === "ORGANIZATION" ? updateStudioApproval(current.studioId, body) : updateStudioRegistration(event.id, current.studioId, body),
  });
  return <article aria-busy={busy}>
    <h2 ref={heading} tabIndex={-1}>{current.studio.name}</h2><p>{t("Application.independent")}</p>
    <dl className="application-ledger">{(["ORGANIZATION", "EVENT"] as const).map(axis => {
      const reason = axis === "ORGANIZATION" ? current.studio.approvalReason : current.decisionReason;
      return <div key={axis}><dt>{t(axis === "ORGANIZATION" ? "Application.organization" : "Application.event")}</dt><dd>{t(statusKey[axis === "ORGANIZATION" ? current.studio.approvalStatus : current.status])}</dd>{reason && <dd>{t(reasonKey[reason])}</dd>}</div>;
    })}</dl>
    <p>{t(current.status === "APPROVED" && current.studio.approvalStatus === "APPROVED" ? "Application.accepted" : current.nextActor === "NONE" ? "Application.noNext" : current.nextActor === "ORGANIZER" ? "Registration.organizerNext" : "Registration.applicantNext")}</p>
    {currentEvent.organizerEmail && <a href={`mailto:${currentEvent.organizerEmail}`}>{t("Registration.contactOrganizer")}: {currentEvent.organizerEmail}</a>}
    {!open && <p>{t("Setup.windowClosed")}</p>}
    <ErrorSummary error={error} title={t("Feedback.validation")} />
    {saved && <Alert tone={savedTone}>{t(readbackFailed ? "Application.readbackFailed" : "Application.saved")}</Alert>}
    {command && <Alert tone="warning"><p>{t("Application.uncertain")}</p><Button variant="secondary" pending={busy} onClick={() => { void execute(command); }}>{t("Setup.retrySame")}</Button></Alert>}
    <div className="application-actions"><Button variant="quiet" disabled={busy} onClick={() => { void compare(); }}>{t("Application.compare")}</Button></div>
    {comparison && <section className="application-compare"><h3>{t("Setup.serverCopy")}</h3><p>{comparison.studio.name}</p>
      <p>{t("Application.organization")}: {t(statusKey[comparison.row.studio.approvalStatus])}</p>
      {comparison.row.studio.approvalReason && <p>{t(reasonKey[comparison.row.studio.approvalReason])}</p>}
      <p>{t("Application.event")}: {t(statusKey[comparison.row.status])}</p>
      {comparison.row.decisionReason && <p>{t(reasonKey[comparison.row.decisionReason])}</p>}
      <p>{t("Application.revision")}: {comparison.row.revision}</p>
      <dl className="setup-grid">
        <div><dt>{t("Flow.country")}</dt><dd>{comparison.studio.country || "—"}</dd></div>
        <div><dt>{t("Flow.city")}</dt><dd>{comparison.studio.city || "—"}</dd></div>
        <div><dt>{t("Flow.directorName")}</dt><dd>{comparison.studio.directorName || "—"}</dd></div>
        <div><dt>{t("Flow.directorPhone")}</dt><dd>{comparison.studio.directorPhone || "—"}</dd></div>
      </dl>
      {comparison.studio.representatives.map(rep => <p key={rep.id}>{rep.name}: {rep.email}</p>)}
      <p>{t("Application.refreshEffect")}</p><Button variant="secondary" onClick={() => install(comparison)}>{t("Application.replace")}</Button>
    </section>}
    {!snapshot && !error && <div className="application-skeleton" role="status">{t("Access.loading")}</div>}
    {snapshot && <>
      {admin ? <>
        <DecisionForm key={`organization-${snapshot.row.revision}-${editorVersion}`} row={current} axis="ORGANIZATION" disabled={disabled} submit={body => decision("ORGANIZATION", body)} />
        <DecisionForm key={`event-${snapshot.row.revision}-${editorVersion}`} row={current} axis="EVENT" disabled={disabled || !reviewAllowed || ["CANCELLED", "LOCKED"].includes(current.status)} submit={body => decision("EVENT", body)} />
      </> : <>
        {current.status === "PENDING" && reviewAllowed && <Button variant="secondary" disabled={disabled} onClick={() => setConfirmation({ target: `${t("Application.cancel")}: ${current.studio.name}`, effect: t("Application.cancelEffect"), execute: () => cancelStudioRegistration(event.id, current.studioId, current.revision) })}>{t("Application.cancel")}</Button>}
        {["CANCELLED", "REJECTED"].includes(current.status) && open && <Button disabled={disabled} onClick={() => { void execute({ target: t("Application.reapply"), effect: "", execute: () => createStudio(event.id, { studioId: current.studioId, revision: current.revision }) }); }}>{t("Application.reapply")}</Button>}
      </>}
      <StudioEditor key={`${snapshot.row.revision}-${editorVersion}`} studio={snapshot.studio} revision={snapshot.row.revision} disabled={disabled} editable={admin || (open && (current.status === "PENDING" || !!user?.permissions.some(value => value.keys.includes("studio.manage") && (value.eventId === event.id || value.eventId === null))))}
        save={value => { void execute({ target: t("Flow.save"), effect: "", execute: value }); }} />
      <ApplicationHistory value={snapshot.review} />
    </>}
    {confirmation && <Confirmation target={confirmation.target} effect={confirmation.effect} busy={busy} fallbackFocus={heading} onCancel={() => setConfirmation(null)} onConfirm={() => { void execute(confirmation); }} />}
  </article>;
}
