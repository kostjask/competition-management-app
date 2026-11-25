import { useId, useRef, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import "./organizer-event.css";

const sections = [
  { path: "", label: "Events.sectionOverview" },
  { path: "setup", label: "Events.sectionSetup" },
  { path: "applications", label: "Events.sectionApplications" },
  { path: "performances", label: "Events.sectionEntries" },
  { path: "staff", label: "Events.sectionStaff" },
  { path: "schedule", label: "Events.sectionSchedule" },
  { path: "scoring", label: "Events.sectionScoring" },
  { path: "live", label: "Events.sectionLive" },
  { path: "results", label: "Events.sectionResults" },
] as const;

export function OrganizerEvent({ eventId, children }: { eventId: string; children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const pathname = location.pathname.replace(/\/$/, "");
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const overview = `/events/${encodeURIComponent(eventId)}`;
  const base = `/admin${overview}`;
  const pathFor = (path: string) => path ? `${base}/${path}` : overview;
  const legacySetup = pathname === `${overview}/edit`;
  const current = sections.find(section => pathFor(section.path) === pathname || (legacySetup && section.path === "setup"));

  return <div className="organizer-event">
    <div className="organizer-event-navigation" data-expanded={expanded} onKeyDown={event => {
      const button = trigger.current;
      if (event.key !== "Escape" || !expanded || !button?.getClientRects().length) return;
      event.stopPropagation();
      setExpanded(false);
      button.focus();
    }}>
      <button ref={trigger} type="button" className="organizer-event-toggle" aria-expanded={expanded} aria-controls={id}
        onClick={() => setExpanded(value => !value)}>
        {t("Events.manageEvent")}{current && <span>{t(current.label)}</span>}
      </button>
      <nav id={id} aria-label={t("Events.manageEvent")}>
        {sections.map(section => <Link key={section.path} to={{ pathname: pathFor(section.path), search: current === section ? location.search : "" }}
          aria-current={current === section ? "page" : undefined} onClick={() => {
            if (expanded && trigger.current?.getClientRects().length) trigger.current.focus();
            setExpanded(false);
          }}>
          {t(section.label)}
        </Link>)}
      </nav>
    </div>
    <div className="organizer-event-content">{children}</div>
  </div>;
}

export function OrganizerEventLayout() {
  const { eventId } = useParams();
  return eventId ? <OrganizerEvent key={eventId} eventId={eventId}><Outlet /></OrganizerEvent> : <Outlet />;
}
