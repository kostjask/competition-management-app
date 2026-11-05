import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { formatInstant } from "../i18n/format";
import { roleLabel } from "./roleLabel";

export function ProfilePage() {
  const { user } = useAuth(); const { t, locale } = useTranslation();
  if (!user) return null;
  return <section className="mx-auto max-w-4xl p-4 sm:p-6">
    <h1 className="text-2xl font-semibold">{t("Shell.profile")}</h1>
    <p className="my-2">{t("Shell.joined", { date: formatInstant(user.createdAt, locale) })}</p><p>{t("Shell.readOnly")}</p>
    <dl className="my-6 grid gap-4 break-words rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <div><dt>{t("Shell.name")}</dt><dd className="font-semibold">{user.name}</dd></div>
      <div className="min-w-0"><dt>{t("Shell.email")}</dt><dd className="font-semibold [overflow-wrap:anywhere]">{user.email}</dd></div>
    </dl>
    <h2 className="text-xl font-semibold">{t("Shell.roles")}</h2>
    {!user.roles.length && <p className="mt-3">{t("Shell.noRoles")}</p>}
    <ul className="mt-3 grid gap-3">{user.roles.map(assignment => <li key={assignment.id} className="rounded-xl border border-slate-200 bg-white p-4 break-words">
      <p className="font-semibold">{roleLabel(assignment.role.key, assignment.role.name, locale)}</p>
      <p>{assignment.event?.name ?? t("Shell.global")}</p>
      {((assignment.role.key === "admin" && assignment.eventId !== null) || (["judge", "moderator"].includes(assignment.role.key) && assignment.eventId === null)) && <p>{t("Shell.unsupportedScope")}</p>}
    </li>)}</ul>
  </section>;
}
