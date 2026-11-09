import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CreateInvitationSchema, RecipientLocaleSchema, type StaffOverview, type StaffAssignment, type Invitation } from "@dance/schemas";
import { getStaff, removeStaff } from "../../api/staff";
import { createInvitation, resendInvitation, revokeInvitation } from "../../api/invitations";
import { useTranslation } from "../../i18n/useTranslation";
import { languageNames } from "../../i18n/locale";
import { formatInstant } from "../../i18n/format";
import { roleLabel } from "../../auth/roleLabel";
import { useAuth } from "../../auth/useAuth";
import { AccountField } from "../../auth/AccountField";
import { toUiError, type UiError } from "../../api/error";
import { Alert, Button, ErrorSummary, Field, LoadingState, StatusBadge } from "../../components/ui/Foundation";
import { StaffConfirmation } from "./StaffConfirmation";

type Confirmation = { kind: "remove"; row: StaffAssignment } | { kind: "revoke"; row: Invitation };
type Notice = "created" | "resent" | "revoked" | "removed";
function EventStaff({ eventId }: { eventId: string }) {
  const { t, locale } = useTranslation(); const { sessionExpired } = useAuth();
  const [data, setData] = useState<StaffOverview | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [fresh, setFresh] = useState(false);
  const [error, setError] = useState<UiError | null>(null); const [notice, setNotice] = useState<Notice | null>(null);
  const [email, setEmail] = useState(""); const [roleKey, setRoleKey] = useState<"judge" | "moderator">("judge"); const [mailLocale, setMailLocale] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const trigger = useRef<HTMLElement | null>(null); const refresh = useRef<HTMLButtonElement>(null);
  const section = useRef<HTMLElement>(null); const mutationPending = useRef(false);
  const readRevision = useRef(0);
  const load = useCallback(async () => {
    const revision = ++readRevision.current;
    setLoading(true); setFresh(false); setError(null);
    try { const result = await getStaff(eventId); if (revision === readRevision.current) { setData(result); setFresh(true); } }
    catch (err: unknown) { if (revision === readRevision.current) setError(toUiError(err)); }
    finally { if (revision === readRevision.current) setLoading(false); }
  }, [eventId]);
  useEffect(() => {
    let active = true; const revision = ++readRevision.current;
    void getStaff(eventId).then(result => { if (active && revision === readRevision.current) { setData(result); setFresh(true); } })
      .catch((err: unknown) => { if (active && revision === readRevision.current) setError(toUiError(err)); })
      .finally(() => { if (active && revision === readRevision.current) setLoading(false); });
    return () => { active = false; };
  }, [eventId]);
  const disabled = busy || loading || !fresh || sessionExpired;
  const close = (focusError = false) => { setConfirmation(null); requestAnimationFrame(() => {
    if (focusError) { section.current?.querySelector<HTMLElement>(".ui-error-summary")?.focus(); return; }
    const previous = trigger.current;
    if (previous?.isConnected && !(previous instanceof HTMLButtonElement && previous.disabled)) previous.focus();
    else refresh.current?.focus();
  }); };
  const run = async (operation: () => Promise<unknown>, result: Notice) => {
    if (disabled || mutationPending.current) return;
    mutationPending.current = true; let failed = false;
    setBusy(true); setFresh(false); setError(null); setNotice(null);
    try {
      await operation(); setNotice(result);
      const overview = await getStaff(eventId); setData(overview); setFresh(true);
    } catch (err: unknown) { failed = true; setError(toUiError(err)); }
    finally { mutationPending.current = false; setBusy(false); if (confirmation) close(failed); }
  };
  const confirm = (value: Confirmation, source: HTMLElement) => { trigger.current = source; setConfirmation(value); };
  const assignmentStatus = (row: StaffAssignment) => t(row.status === "REMOVED" ? "Staff.removedStatus" : row.status === "ACCOUNT_UNAVAILABLE" ? "Staff.accountUnavailable" : row.status === "JUDGE_MISSING" ? "Staff.judgeMissing" : "Staff.active");
  const removeButton = (row: StaffAssignment) => row.removedAt ? null : <Button variant="danger" disabled={disabled} aria-label={t("Staff.removeNamed", { name: row.user.name })}
    onClick={event => confirm({ kind: "remove", row }, event.currentTarget)}>{t("Staff.remove")}</Button>;
  return <section ref={section} className="mx-auto max-w-6xl p-4 sm:p-6">
    <h1 className="text-2xl font-semibold">{t("Staff.title")}</h1>
    <Link className="my-3 inline-block" to="/admin/invitations">{t("Flow.manage")}</Link>
    {data && <><h2 className="text-xl font-semibold break-words">{data.event.name}</h2><Link to={`/events/${encodeURIComponent(eventId)}`}>{t("Staff.eventDetails")}</Link></>}
    <ErrorSummary error={error} title={t("Feedback.validation")} fields={{ email: "event-staff-email", roleKey: "event-staff-role", locale: "event-staff-locale" }} />
    {notice && <Alert tone="success">{t(notice === "created" ? "Staff.created" : notice === "resent" ? "Staff.resent" : notice === "revoked" ? "Staff.revoked" : "Staff.removed")}</Alert>}
    {loading && <LoadingState label={t("Access.loading")} />}
    {!fresh && !loading && <Alert tone="warning">{t("Staff.stale")}</Alert>}
    <button ref={refresh} type="button" className="ui-button ui-button-secondary my-4" disabled={loading || busy || sessionExpired} onClick={() => { void load(); }}>{t("Staff.refresh")}</button>
    {data && <>
      <p className="mb-4">{t("Staff.readinessHelp")}</p>
      <form noValidate className="my-6 rounded-xl border border-slate-200 bg-white p-4" onSubmit={event => {
        event.preventDefault(); if (disabled) return;
        const parsed = CreateInvitationSchema.safeParse({ eventId, email, roleKey, ...(mailLocale ? { locale: mailLocale } : {}) });
        if (!parsed.success) { setError(toUiError(parsed.error)); return; }
        void run(() => createInvitation(parsed.data), "created");
      }}>
        <h2 className="text-xl font-semibold">{t("Flow.invite")}</h2>
        <fieldset disabled={disabled} className="min-w-0">
          <AccountField id="event-staff-email" path="email" label={t("Shell.email")} value={email} onChange={setEmail} error={error} type="email" autoComplete="email" />
          <Field id="event-staff-role" label={t("Flow.role")} required>{props => <select {...props} className="ui-input" value={roleKey} onChange={event => setRoleKey(CreateInvitationSchema.shape.roleKey.parse(event.target.value))}>
            <option value="judge">{t("Shell.judge")}</option><option value="moderator">{t("Shell.moderator")}</option>
          </select>}</Field>
          <Field id="event-staff-locale" label={t("Flow.language")}>{props => <select {...props} className="ui-input" value={mailLocale} onChange={event => setMailLocale(event.target.value ? RecipientLocaleSchema.parse(event.target.value) : "")}>
            <option value="">{t("Flow.defaultLanguage")}</option>{Object.entries(languageNames).map(([key, label]) => <option key={key} value={key} lang={key}>{label}</option>)}
          </select>}</Field>
          <Button type="submit" pending={busy}>{t("Flow.invite")}</Button>
        </fieldset>
      </form>
      <h2 className="text-xl font-semibold">{t("Staff.assignments")}</h2>
      {!data.assignments.length && <p className="my-4">{t("Staff.noAssignments")}</p>}
      <ul className="my-4 grid gap-4 md:hidden">{data.assignments.map(row => <li key={row.id} className="rounded-xl border bg-white p-4 [overflow-wrap:anywhere]">
        <h3 className="font-semibold">{row.user.name}</h3><p>{row.user.email}</p><p>{roleLabel(row.roleKey, row.roleKey, locale)}</p>
        <StatusBadge>{assignmentStatus(row)}</StatusBadge>{row.removedAt && <p>{formatInstant(row.removedAt, locale, "long", "short")}</p>}
        <div className="mt-3">{removeButton(row)}</div>
      </li>)}</ul>
      {!!data.assignments.length && <table className="my-4 hidden w-full table-fixed border-collapse text-left md:table">
        <caption className="sr-only">{t("Staff.assignments")}</caption>
        <thead><tr>{[t("Shell.name"), t("Flow.role"), t("Staff.access"), t("Staff.actions")].map(label => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
        <tbody>{data.assignments.map(row => <tr key={row.id} className="border-t bg-white align-top [overflow-wrap:anywhere]">
          <th scope="row" className="p-3 font-normal"><p className="font-semibold">{row.user.name}</p><p>{row.user.email}</p></th>
          <td className="p-3">{roleLabel(row.roleKey, row.roleKey, locale)}</td><td className="p-3"><StatusBadge>{assignmentStatus(row)}</StatusBadge>{row.removedAt && <p>{formatInstant(row.removedAt, locale, "long", "short")}</p>}</td><td className="p-3">{removeButton(row)}</td>
        </tr>)}</tbody>
      </table>}
      <h2 className="mt-6 text-xl font-semibold">{t("Staff.invitations")}</h2>
      {!data.invitations.length && <p className="my-4">{t("Flow.none")}</p>}
      <ul className="my-4 grid gap-4 md:grid-cols-2">{data.invitations.map(row => <li key={row.id} className="rounded-xl border bg-white p-4 [overflow-wrap:anywhere]">
        <h3 className="font-semibold">{row.email}</h3><p>{roleLabel(row.roleKey, row.roleKey, locale)}</p>
        <StatusBadge>{t(row.status === "PENDING" ? "Flow.pending" : row.status === "ACCEPTED" ? "Flow.acceptedStatus" : row.status === "REVOKED" ? "Flow.revoked" : row.status === "SUPERSEDED" ? "Flow.superseded" : "Flow.expired")}</StatusBadge>
        <p>{t("Flow.expires", { date: formatInstant(row.expiresAt, locale, "long", "short") })}</p>
        {row.status === "ACCEPTED" && <p>{t("Staff.acceptedHelp")}</p>}
        {row.status === "PENDING" && <div className="mt-3 flex flex-wrap gap-3">
          <Button disabled={disabled} aria-label={t("Staff.resendNamed", { email: row.email })} onClick={() => { void run(() => resendInvitation(row.id, row.expiresAt), "resent"); }}>{t("Flow.renew")}</Button>
          <Button variant="quiet" disabled={disabled} aria-label={t("Staff.revokeNamed", { email: row.email })} onClick={event => confirm({ kind: "revoke", row }, event.currentTarget)}>{t("Flow.revoke")}</Button>
        </div>}
      </li>)}</ul>
    </>}
    {confirmation && data && <StaffConfirmation kind={confirmation.kind} busy={busy}
      target={`${data.event.name} · ${confirmation.kind === "remove" ? confirmation.row.user.name + " · " + roleLabel(confirmation.row.roleKey, confirmation.row.roleKey, locale) : confirmation.row.email}`}
      onCancel={() => close()} onConfirm={() => { if (confirmation.kind === "remove") void run(() => removeStaff(eventId, confirmation.row.id), "removed"); else void run(() => revokeInvitation(confirmation.row.id, confirmation.row.expiresAt), "revoked"); }} />}
  </section>;
}

export default function StaffPage() {
  const { eventId = "" } = useParams();
  return <EventStaff key={eventId} eventId={eventId} />;
}
