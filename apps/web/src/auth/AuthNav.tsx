import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { ErrorFeedback } from "../components/ErrorFeedback";
import { Button } from "../components/ui/Foundation";

export function AuthNav() {
  const { user, loading, error, logout, refreshUser } = useAuth(); const { t } = useTranslation(); const navigate = useNavigate();
  const [open, setOpen] = useState(false); const root = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  if (loading && !user) return <span role="status">{t("Access.loading")}</span>;
  if (!user && error) return <div className="max-w-sm"><ErrorFeedback error={error} /><Button onClick={() => { void refreshUser().catch(() => {}); }}>{t("Shell.retry")}</Button></div>;
  if (!user) return <Link className="ui-button ui-button-primary" to="/auth/login">{t("Shell.login")}</Link>;
  return <div ref={root} className="relative max-w-full">
    <button ref={trigger} type="button" className="ui-button ui-button-secondary max-w-full" aria-expanded={open} aria-controls="account-disclosure" onClick={() => setOpen(value => !value)}>{t("Shell.account")}</button>
    {open && <div id="account-disclosure" className="absolute right-0 z-40 mt-2 grid w-64 max-w-[calc(100vw-2rem)] gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <p className="break-words">{user.name}</p>
      <Link to="/auth/profile" onClick={() => setOpen(false)}>{t("Shell.profile")}</Link>
      <Link to="/auth/onboarding" onClick={() => setOpen(false)}>{t("Flow.onboarding")}</Link>
      <ErrorFeedback error={error} />
      <Button variant="quiet" disabled={loading} onClick={() => {
        if (window.confirm(t("Shell.logoutConfirm"))) void logout().then(() => { setOpen(false); navigate("/auth/login", { replace: true }); }).catch(() => {});
      }}>{t("Shell.logout")}</Button>
    </div>}
  </div>;
}
