import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { LoginForm } from "./LoginForm";
import { useTranslation } from "../i18n/useTranslation";
import { Button } from "../components/ui/Foundation";

export function SessionRecovery({ children }: { children: ReactNode }) {
  const { user, sessionExpired, logout, loading } = useAuth(); const { t } = useTranslation(); const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (sessionExpired) dialog.current?.showModal(); else dialog.current?.close(); }, [sessionExpired]);
  return <><div inert={sessionExpired}>{children}</div>
    <dialog ref={dialog} aria-labelledby="session-recovery-title" onCancel={event => event.preventDefault()} className="w-[calc(100%_-_2rem)] max-w-md rounded-xl p-6 backdrop:bg-slate-900/50">
      {sessionExpired && <><h1 id="session-recovery-title" className="text-xl font-semibold">{t("Shell.expired")}</h1><p className="my-4">{t("Shell.recover")}</p>
        <LoginForm lockedEmail={user?.email} />
        <Button variant="quiet" disabled={loading} onClick={() => {
          if (window.confirm(t("Shell.logoutConfirm"))) void logout().then(() => navigate("/auth/login", { replace: true })).catch(() => {});
        }}>{t("Shell.logout")}</Button>
      </>}
    </dialog>
  </>;
}
