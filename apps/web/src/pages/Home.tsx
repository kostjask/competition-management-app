import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/useTranslation";
import { useAuth } from "../auth/useAuth";
export function Home() {
  const { t } = useTranslation(); const { user } = useAuth();
  return <section className="mx-auto max-w-4xl p-4 sm:p-6"><h1 className="text-2xl font-semibold">{t("Shell.welcome")}</h1><p className="my-4">{t("Shell.welcomeText")}</p>
    {user && !user.roles.length && <p className="mb-4">{t("Shell.noRoles")}</p>}
    <Link className="ui-button ui-button-primary" to="/events">{t("Shell.events")}</Link>
    {user && <Link className="ui-button ui-button-secondary" to="/applications">{t("Application.title")}</Link>}
  </section>;
}
