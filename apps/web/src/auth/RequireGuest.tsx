import type { JSX } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { routerReturnPath } from "@dance/schemas";
import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { LoadingState } from "../components/ui/Foundation";
import { signInDestination } from "./workspaces";

export function RequireGuest({ children, signIn = false }: { children: JSX.Element; signIn?: boolean }) {
  const { user, initializing, loading } = useAuth(); const [params] = useSearchParams(); const { t } = useTranslation();
  if (!user && (signIn ? initializing : loading)) return <LoadingState label={t("Access.loading")} />;
  if (!user) return children;
  const returnTo = params.get("returnTo");
  return <Navigate to={signIn ? signInDestination(user, returnTo) : routerReturnPath(returnTo)} replace />;
}
