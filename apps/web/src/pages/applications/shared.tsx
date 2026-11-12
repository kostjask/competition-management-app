import { Link } from "react-router-dom";
import type { Event, Studio, StudioRegistration } from "@dance/schemas";
import { useTranslation } from "../../i18n/useTranslation";
import { StatusBadge } from "../../components/ui/Foundation";
import "./Application.css";

export function ApprovalRows({ organization, status }: { organization: Studio["approvalStatus"]; status: StudioRegistration["status"] }) {
  const { t } = useTranslation();
  const label = (value: StudioRegistration["status"]) => ({ PENDING: t("Registration.pending"), APPROVED: t("Registration.approved"), REJECTED: t("Registration.rejected"), CANCELLED: t("Registration.cancelled"), LOCKED: t("Registration.locked") })[value];
  const tone = (value: string) => value === "APPROVED" ? "success" : value === "REJECTED" ? "danger" : value === "PENDING" ? "warning" : "neutral";
  return <dl className="application-ledger">
    <div><dt>{t("Organizer.organization")}</dt><dd><StatusBadge tone={tone(organization)}>{label(organization)}</StatusBadge></dd></div>
    <div><dt>{t("Organizer.eventApproval")}</dt><dd><StatusBadge tone={tone(status)}>{label(status)}</StatusBadge></dd></div>
  </dl>;
}
export function EventContext({ event }: { event: Event }) {
  const { t, locale } = useTranslation();
  return <div className="application-event"><Link to={`/events/${encodeURIComponent(event.id)}`}>{event.name}</Link>
    <p><time dateTime={event.startsAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: event.timeZone }).format(new Date(event.startsAt))}</time> ({event.timeZone})</p>
    <p>{t("Organizer.deadline")}: {event.registrationDeadline ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: event.timeZone }).format(new Date(event.registrationDeadline)) : t("Organizer.noDeadline")}</p>
    <p>{t("Organizer.contact")}: {event.organizerEmail} {event.organizerPhone}</p>
  </div>;
}
