import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { safeReturnPath } from "@dance/schemas";
import { LoginForm } from "./LoginForm";
import { useTranslation } from "../i18n/useTranslation";

export function LoginPage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const { t } = useTranslation();
  const eventId = /^\/events\/([A-Za-z0-9_-]+)(?:\/(?:register|studio))?(?:\?studio=[A-Za-z0-9_-]+)?$/.exec(safeReturnPath(params.get("returnTo")))?.[1];
  return <section className="mx-auto max-w-md p-6"><h1 className="mb-6 text-2xl font-semibold">{t("Shell.login")}</h1>
    <LoginForm onSuccess={() => navigate(safeReturnPath(params.get("returnTo")), { replace: true })} />
    <div className="my-4 flex flex-wrap gap-3"><Link to={"/auth/register" + (eventId ? "?eventId=" + encodeURIComponent(eventId) : "")}>{t("Flow.signup")}</Link><Link to="/auth/forgot-password">{t("Flow.forgot")}</Link><Link to="/auth/resend-verification">{t("Flow.resend")}</Link><Link to="/auth/onboarding">{t("Flow.resume")}</Link></div>
  </section>;
}
