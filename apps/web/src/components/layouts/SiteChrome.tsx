import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import { LanguageSelector } from "../LanguageSelector";
import { AuthNav } from "../../auth/AuthNav";
import { useRole } from "../../auth/useRole";
import { availableWorkspaces, signInDestination } from "../../auth/workspaces";
import { AppearanceSelector } from "./WorkspaceAppearance";
import { EventContext } from "./EventContext";
import "./workspace.css";

export function SiteChrome({ children, auth = false }: { children: ReactNode; auth?: boolean }) {
  const { t } = useTranslation(); const location = useLocation(); const { isAdmin, user } = useRole();
  const destinations = availableWorkspaces(user);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const closeMenu = () => setMenuOpen(false);
  useEffect(() => {
    const path = location.pathname;
    const title = /^\/admin\/events\/[^/]+\/setup$/.test(path) ? t("Setup.title") : /^\/admin\/events\/[^/]+\/staff$/.test(path) ? t("Staff.title") : path === "/auth/onboarding" ? t("Flow.onboarding") : path === "/auth/forgot-password" ? t("Flow.forgot") : path === "/auth/resend-verification" ? t("Flow.resend") : path === "/auth/correct-email" ? t("Flow.correct") : path === "/auth/reset-password" ? t("Flow.reset") : path === "/auth/accept-invitation" ? t("Flow.invitation") : path === "/admin/invitations" ? t("Flow.manage") : path === "/auth/profile" ? t("Shell.profile") : path === "/auth/register" ? t("Auth.registerButton") : path.startsWith("/auth/") ? t("Shell.login") : path === "/verify-email" ? t("Shell.verify") : path.startsWith("/events") ? t("Shell.events") : path.startsWith("/admin") ? t("Shell.administrator") : path.startsWith("/judge") ? t("Shell.judge") : path.startsWith("/moderator") ? t("Shell.moderator") : path.startsWith("/representative") ? t("Shell.representative") : path === "/" ? t("Shell.home") : t("Shell.notFound");
    const applicationTitle = path === "/applications" || /^\/events\/[^/]+\/(register|studio)$/.test(path) ? t("Application.title") : /^\/admin\/events\/[^/]+\/applications$/.test(path) ? t("Application.review") : title;
    const entryTitle = /^\/studios\/[^/]+\/dancers$/.test(path) ? t("Roster.title") : /^\/events\/[^/]+\/studios\/[^/]+\/performances(?:\/|$)/.test(path) ? t("Roster.entries") : applicationTitle;
    const workspaceTitle = /^\/(admin|moderator)\/events\/[^/]+\/live$/.test(path) ? t("Moderator.title") : entryTitle;
    document.title = (path.startsWith("/content/") ? t("Content.title") : /^\/events\/[^/]+\/studios\/[^/]+\/music$/.test(path) ? t("Music.title") : workspaceTitle) + " | " + t("Shell.brand");
  }, [location.pathname, t]);
  useEffect(() => {
    let done = false;
    const focus = () => {
      const heading = document.querySelector<HTMLElement>("#main-content h1");
      if (!heading || done) return;
      done = true;
      heading.tabIndex = -1;
      if (!document.activeElement?.closest(".workspace-tools")) heading.focus({ preventScroll: true });
    };
    const observer = new MutationObserver(focus); observer.observe(document.getElementById("main-content") ?? document.body, { childList: true, subtree: true });
    focus(); return () => observer.disconnect();
  }, [location.pathname]);
  return <div className="workspace-shell">
    <a className="workspace-skip sr-only focus:not-sr-only focus:block focus:p-3" href="#main-content">{t("Shell.skip")}</a>
    <header className="workspace-header">
      <div className="workspace-header-inner">
        <div className="workspace-toolbar">
          <Link className="workspace-wordmark" to={user ? signInDestination(user, null) : "/"} onClick={closeMenu}>{t("Shell.brand")}</Link>
          <div className="workspace-tools"><LanguageSelector /><AppearanceSelector /><AuthNav hideSignIn={location.pathname === "/auth/login"} /></div>
          {!auth && <button className="workspace-menu-toggle" ref={menuTrigger} type="button" aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={() => setMenuOpen(open => !open)}>{t("Shell.menu")}</button>}
        </div>
        {!auth && <nav id="workspace-navigation" aria-label={t("Shell.navigation")} className="workspace-nav" data-open={menuOpen} onKeyDown={event => {
          if (event.key !== "Escape" || !menuOpen) return;
          closeMenu();
          menuTrigger.current?.focus();
        }}>
          <div className="workspace-nav-group">
            <NavLink to="/events" onClick={closeMenu}>{t("Shell.events")}</NavLink>
            {user && !destinations.length && <NavLink to="/applications" onClick={closeMenu}>{t("Application.title")}</NavLink>}
            {destinations.map(workspace => (
              <NavLink key={workspace.key} to={workspace.path} end={workspace.key === "admin" && location.pathname === "/admin/invitations"} onClick={closeMenu}>{t(workspace.label)}</NavLink>
            ))}
          </div>
          {isAdmin && <div className="workspace-nav-group workspace-management">
            <NavLink to="/admin/invitations" onClick={closeMenu}>{t("Flow.manage")}</NavLink>
            <NavLink to="/content/studio" onClick={closeMenu}>{t("Content.studio")}</NavLink>
            <NavLink to="/content/festivals" onClick={closeMenu}>{t("Content.festivals")}</NavLink>
          </div>}
        </nav>}
      </div>
    </header>
    <main id="main-content" tabIndex={-1}><EventContext />{children}</main>
  </div>;
}
