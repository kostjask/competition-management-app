import { useEffect, useRef, type JSX } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useRole } from "./useRole";
import { useTranslation } from "../i18n/useTranslation";
import { safeReturnPath } from "@dance/schemas";
import { RequireAuth } from "./RequireAuth";

export type RoleKey = "admin" | "judge" | "representative" | "moderator";

function AccessDenied() {
  const { t } = useTranslation();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <section className="p-6">
    <h1 ref={heading} tabIndex={-1}>{t("Access.denied")}</h1>
    <Link className="ui-button ui-button-secondary" to="/">{t("Access.home")}</Link>
  </section>;
}

export function RequireRole({ role, eventId, children }: { role: RoleKey; eventId?: string; children: JSX.Element }) {
  const { user, loading, error } = useAuth();
  const { hasRole } = useRole();
  const { t } = useTranslation();
  const location = useLocation();
  if (loading && !user) return <div className="p-6" role="status">{t("Access.loading")}</div>;
  if (!user && error) return <RequireAuth>{children}</RequireAuth>;
  if (!user) return <Navigate to={"/auth/login?returnTo=" + encodeURIComponent(safeReturnPath(location.pathname))} replace />;
  if (!hasRole(role, eventId)) return <AccessDenied />;
  return children;
}
