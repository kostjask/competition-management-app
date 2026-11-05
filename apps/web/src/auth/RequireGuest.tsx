import type { JSX } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { safeReturnPath } from "@dance/schemas";
import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { LoadingState } from "../components/ui/Foundation";
export function RequireGuest({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth(); const [params] = useSearchParams(); const { t } = useTranslation();
  if (loading && !user) return <LoadingState label={t("Access.loading")} />;
  return user ? <Navigate to={safeReturnPath(params.get("returnTo"))} replace /> : children;
}
