import type { JSX } from "react";
import { Link, useLocation } from "react-router-dom";
import { safeReturnPath } from "@dance/schemas";
import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { ErrorFeedback } from "../components/ErrorFeedback";
import { Button, LoadingState } from "../components/ui/Foundation";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading, error, refreshUser } = useAuth(); const location = useLocation(); const { t } = useTranslation();
  if (loading && !user) return <LoadingState label={t("Access.loading")} />;
  if (!user && error) return <section className="p-6"><h1>{t("Shell.unavailable")}</h1><ErrorFeedback error={error} /><Button onClick={() => { void refreshUser().catch(() => {}); }}>{t("Shell.retry")}</Button></section>;
  if (!user) return <section className="p-6"><h1>{t("Shell.signInRequired")}</h1><Link className="ui-button ui-button-primary" to={"/auth/login?returnTo=" + encodeURIComponent(safeReturnPath(location.pathname + location.search))}>{t("Shell.login")}</Link></section>;
  return children;
}
