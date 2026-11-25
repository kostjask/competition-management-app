import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/useTranslation";
import { useRole } from "../auth/useRole";
import { availableWorkspaces } from "../auth/workspaces";
export function Home() {
  const { t } = useTranslation(); const { user, isAdmin } = useRole();
  const available = availableWorkspaces(user).filter(workspace => workspace.key !== "representative");
  return <section className="workspace-sheet workspace-home">
    <h1>{t("Shell.welcome")}</h1>
    {!user && <p>{t("Shell.welcomeText")}</p>}
    {user && !user.roles.length && !isAdmin && <p>{t("Shell.noRoles")}</p>}
    <div className="workspace-home-actions">
      <Link className="ui-button ui-button-primary" to="/events">{t("Shell.events")}</Link>
      {user && <Link className="ui-button ui-button-secondary" to="/applications">{t("Application.title")}</Link>}
    </div>
    {available.length > 0 && <section className="workspace-home-roles">
      <h2>{t("Shell.workspaces")}</h2>
      <ul>{available.map(workspace => <li key={workspace.key}><Link to={workspace.path}>{t(workspace.label)}</Link></li>)}</ul>
    </section>}
  </section>;
}
