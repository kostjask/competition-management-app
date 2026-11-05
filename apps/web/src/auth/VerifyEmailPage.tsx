import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { safeReturnPath } from "@dance/schemas";
import { verifyEmail } from "../api/auth";
import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { toUiError, type UiError } from "../api/error";
import { ErrorFeedback } from "../components/ErrorFeedback";
import { Button } from "../components/ui/Foundation";
import { readOnboarding } from "../api/onboarding";
import { SwitchAccount } from "./SwitchAccount";

export function VerifyEmailPage() {
  const [params] = useSearchParams(); const [token] = useState(() => params.get("token")); const [destination] = useState(() => safeReturnPath(params.get("returnTo")));
  const [resolvedDestination, setResolvedDestination] = useState(destination);
  const { user, loading: sessionLoading, error: sessionError, refreshUser } = useAuth(); const { t } = useTranslation();
  const [status, setStatus] = useState<"ready" | "busy" | "success">("ready"); const [error, setError] = useState<UiError | null>(null);
  useEffect(() => { if (token) window.history.replaceState(null, "", window.location.pathname + (destination === "/" ? "" : "?returnTo=" + encodeURIComponent(destination))); }, [token, destination]);
  return <section className="mx-auto max-w-md p-6"><h1 className="text-2xl font-semibold">{t(status === "success" ? "Shell.verifySuccess" : "Shell.verify")}</h1>
    <ErrorFeedback error={error} />
    {sessionLoading && status === "ready" && <p role="status">{t("Access.loading")}</p>}
    {!user && sessionError && <ErrorFeedback error={sessionError} />}
    {status === "success" ? <Link className="ui-button ui-button-primary mt-4" to={resolvedDestination}>{t("Shell.continue")}</Link> : <>
      <p className="my-4">{t(user ? "Shell.switchAccount" : "Shell.verifyHelp")}</p>
      {user && <SwitchAccount />}
      {token && !user && <Button disabled={sessionLoading || !!sessionError} pending={status === "busy"} onClick={() => {
        setStatus("busy"); setError(null);
        void verifyEmail({ token }).then(async () => {
          await refreshUser();
          try { const context = await readOnboarding({}); setResolvedDestination(context.draft ? context.returnTo : destination); }
          catch (err: unknown) { setResolvedDestination("/auth/onboarding"); setError(toUiError(err)); }
          setStatus("success");
        }).catch((err: unknown) => { setError(toUiError(err)); setStatus("ready"); });
      }}>{t("Shell.verify")}</Button>}
      <Link className="ui-button ui-button-secondary mt-4" to="/auth/login">{t("Shell.login")}</Link>
    </>}
  </section>;
}
