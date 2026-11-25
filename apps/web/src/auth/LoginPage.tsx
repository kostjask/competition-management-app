import { Link, useSearchParams } from "react-router-dom";
import { ReturnPathSchema, routerReturnPath } from "@dance/schemas";
import { LoginForm } from "./LoginForm";
import { useTranslation } from "../i18n/useTranslation";

export function LoginPage() {
  const [params] = useSearchParams(); const { t } = useTranslation();
  const returnTo = params.get("returnTo");
  const checkedReturn = ReturnPathSchema.safeParse(returnTo);
  const recoveryQuery = checkedReturn.success ? "?" + new URLSearchParams({ returnTo: checkedReturn.data }) : "";
  const eventId = /^\/events\/([A-Za-z0-9_-]+)(?:\/(?:register|studio))?(?:\?studio=[A-Za-z0-9_-]+)?$/.exec(routerReturnPath(returnTo))?.[1];
  return <section className="workspace-sheet workspace-login">
    <h1>{t("Shell.login")}</h1>
    <div className="workspace-login-layout">
      <LoginForm recoveryLink={"/auth/forgot-password" + recoveryQuery} />
      <div className="workspace-login-help">
        <Link className="ui-button ui-button-secondary" to={"/auth/register" + (eventId ? "?eventId=" + encodeURIComponent(eventId) : "")}>{t("Flow.signup")}</Link>
        <details><summary>{t("Shell.accountHelp")}</summary>
          <ul>
            <li><Link to={"/auth/resend-verification" + recoveryQuery}>{t("Flow.resend")}</Link></li>
            <li><Link to="/auth/onboarding">{t("Flow.resume")}</Link></li>
          </ul>
        </details>
      </div>
    </div>
  </section>;
}
