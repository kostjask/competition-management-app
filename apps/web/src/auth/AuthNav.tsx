import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { ErrorFeedback } from "../components/ErrorFeedback";
import { Button } from "../components/ui/Foundation";

export function AuthNav({ hideSignIn = false }: { hideSignIn?: boolean }) {
  const { user, loading, error, logout, refreshUser } = useAuth(); const { t } = useTranslation(); const navigate = useNavigate();
  const [open, setOpen] = useState(false); const root = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  if (!user && hideSignIn) return null;
  if (loading && !user) return <span role="status">{t("Access.loading")}</span>;
  if (!user && error) return <div className="max-w-sm"><ErrorFeedback error={error} /><Button onClick={() => { void refreshUser().catch(() => {}); }}>{t("Shell.retry")}</Button></div>;
  if (!user) return <Link className="ui-button ui-button-secondary" to="/auth/login">{t("Shell.login")}</Link>;
  return <div ref={root} className="workspace-account">
    <button ref={trigger} type="button" className="workspace-utility-trigger" aria-expanded={open} aria-controls={open ? "account-disclosure" : undefined} onClick={() => setOpen(value => !value)}>{t("Shell.account")}</button>
    {open && <div id="account-disclosure" className="workspace-account-panel">
      <p>{user.name}</p>
      <Link to="/auth/profile" onClick={() => setOpen(false)}>{t("Shell.profile")}</Link>
      <Link to="/applications" onClick={() => setOpen(false)}>{t("Application.title")}</Link>
      <Link to="/auth/onboarding" onClick={() => setOpen(false)}>{t("Flow.onboarding")}</Link>
      <ErrorFeedback error={error} />
      <Button variant="quiet" disabled={loading} onClick={() => {
        if (window.confirm(t("Shell.logoutConfirm"))) void logout().then(() => { setOpen(false); navigate("/auth/login", { replace: true }); }).catch(() => {});
      }}>{t("Shell.logout")}</Button>
    </div>}
  </div>;
}
