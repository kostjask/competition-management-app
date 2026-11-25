import { AccountLanguage } from "./AccountLanguage";
import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { formatInstant } from "../i18n/format";
import { roleLabel } from "./roleLabel";

export function ProfilePage() {
  const { user } = useAuth(); const { t, locale } = useTranslation();
  if (!user) return null;
  return <section className="workspace-sheet workspace-profile">
    <h1>{t("Shell.profile")}</h1>
    <p className="workspace-joined">{t("Shell.joined", { date: formatInstant(user.createdAt, locale) })}</p>
    <dl className="workspace-profile-identity">
      <div><dt>{t("Shell.name")}</dt><dd>{user.name}</dd></div>
      <div><dt>{t("Shell.email")}</dt><dd>{user.email}</dd></div>
    </dl>
    <div className="workspace-profile-body">
      <section>
        <h2>{t("Shell.roles")}</h2>
        {user.roles.length ? <ul className="workspace-profile-roles">{user.roles.map(assignment => <li key={assignment.id}>
          <p>{roleLabel(assignment.role.key, assignment.role.name, locale)}</p>
          <p>{assignment.event?.name ?? t("Shell.global")}</p>
          {((assignment.role.key === "admin" && assignment.eventId !== null) || (["judge", "moderator"].includes(assignment.role.key) && assignment.eventId === null)) && <p>{t("Shell.unsupportedScope")}</p>}
        </li>)}</ul> : <p>{t("Shell.noRoles")}</p>}
      </section>
      <AccountLanguage />
    </div>
  </section>;
}
