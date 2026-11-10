import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import { LanguageSelector } from "../LanguageSelector";
import { AuthNav } from "../../auth/AuthNav";
import { useRole } from "../../auth/useRole";
import { getTranslation } from "../../i18n/translations";
import { EventContext } from "./EventContext";

export function SiteChrome({ children, auth = false }: { children: ReactNode; auth?: boolean }) {
  const { t, locale } = useTranslation(); const location = useLocation(); const { hasRole } = useRole();
  useEffect(() => {
    const path = location.pathname;
    const title = /^\/admin\/events\/[^/]+\/setup$/.test(path) ? t("Setup.title") : /^\/admin\/events\/[^/]+\/staff$/.test(path) ? t("Staff.title") : path === "/auth/onboarding" ? t("Flow.onboarding") : path === "/auth/forgot-password" ? t("Flow.forgot") : path === "/auth/resend-verification" ? t("Flow.resend") : path === "/auth/correct-email" ? t("Flow.correct") : path === "/auth/reset-password" ? t("Flow.reset") : path === "/auth/accept-invitation" ? t("Flow.invitation") : path === "/admin/invitations" ? t("Flow.manage") : path === "/auth/profile" ? t("Shell.profile") : path === "/auth/register" ? t("Auth.registerButton") : path.startsWith("/auth/") ? t("Shell.login") : path === "/verify-email" ? t("Shell.verify") : path.startsWith("/events") ? t("Shell.events") : path.startsWith("/admin") ? t("Shell.administrator") : path.startsWith("/judge") ? t("Shell.judge") : path.startsWith("/moderator") ? t("Shell.moderator") : path.startsWith("/representative") ? t("Shell.representative") : path === "/" ? t("Shell.home") : t("Shell.notFound");
    const applicationTitle = path === "/applications" || /^\/events\/[^/]+\/(register|studio)$/.test(path) ? t("Application.title") : /^\/admin\/events\/[^/]+\/applications$/.test(path) ? t("Application.review") : title;
    document.title = applicationTitle + " | " + t("Shell.brand");
  }, [location.pathname, t]);
  useEffect(() => {
    let done = false;
    const focus = () => { const heading = document.querySelector<HTMLElement>("#main-content h1"); if (heading && !done) { done = true; heading.tabIndex = -1; heading.focus({ preventScroll: true }); } };
    const observer = new MutationObserver(focus); observer.observe(document.getElementById("main-content") ?? document.body, { childList: true, subtree: true });
    focus(); return () => observer.disconnect();
  }, [location.pathname]);
  const destinations = [
    { key: "admin", path: "/admin", label: "Shell.administrator" }, { key: "judge", path: "/judge", label: "Shell.judge" },
    { key: "moderator", path: "/moderator", label: "Shell.moderator" }, { key: "representative", path: "/representative", label: "Shell.representative" },
  ] as const;
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <a className="sr-only focus:not-sr-only focus:block focus:p-3" href="#main-content">{t("Shell.skip")}</a>
    <header className="border-b border-slate-200 bg-white p-4">
      <nav aria-label={t("Shell.navigation")} className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
        <Link className="font-semibold" to="/">{t("Shell.home")}</Link><Link to="/events">{t("Shell.events")}</Link>
        {!auth && hasRole("admin") && <Link to="/admin/invitations">{t("Flow.manage")}</Link>}
        {!auth && destinations.filter(item => hasRole(item.key)).map(item => <Link key={item.key} to={item.path}>{getTranslation(item.label, locale)}</Link>)}
        <div className="ml-auto flex flex-wrap items-center gap-3"><LanguageSelector /><AuthNav /></div>
      </nav>
    </header>
    <main id="main-content" tabIndex={-1}><EventContext />{children}</main>
  </div>;
}
