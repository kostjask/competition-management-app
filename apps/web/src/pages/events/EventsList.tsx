import { toUiError, type UiError } from "../../api/error";
import { ErrorFeedback } from "../../components/ErrorFeedback";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { type Event, getEvents } from "@api/events";
import { RoleGate } from "@auth";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { getTranslation } from "@i18n/translations";
import { type Locale } from "@i18n/LanguageContext";
import { useTranslation } from "@i18n/useTranslation";
import {
  type StageBadge,
  useStageBadges,
} from "../../features/events/hooks/useStageBadges";
import { useDateFormatter } from "../../features/events/hooks/useDateFormatter";

const EventStatus = {
  UPCOMING: "UPCOMING",
  PAST: "PAST",
  CURRENT: "CURRENT",
} as const;

type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

interface EventsByStatus {
  upcoming: Event[];
  current: Event[];
  past: Event[];
}

const useEventsByStatus = (events: Event[]): EventsByStatus => {
  return useMemo(() => {
    const now = new Date();
    return {
      upcoming: events.filter((event) => new Date(event.startsAt) > now),
      current: events.filter(
        (event) =>
          new Date(event.startsAt) <= now && new Date(event.endsAt) > now,
      ),
      past: events.filter((event) => new Date(event.endsAt) < now),
    };
  }, [events]);
};

interface EventCardProps {
  event: Event;
  status: EventStatus;
  stageBadge: StageBadge;
  formatDateTime: (value: string) => string;
  locale: Locale;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  status,
  stageBadge,
  formatDateTime,
  locale,
}) => {
  const isEditable = status !== EventStatus.PAST;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="aspect-video w-60 shrink-0 rounded-lg bg-gray-200">
            <div className="relative h-40 w-full bg-linear-to-br from-slate-100 to-slate-200 rounded-2xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="mx-auto h-15 w-15 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-slate-500">
                    {getTranslation("Common.eventPhoto", locale)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-semibold text-slate-900">
              {event.name}
            </h3>
            <time className="mt-1 block text-xs text-slate-500">
              {formatDateTime(event.startsAt)} – {formatDateTime(event.endsAt)}
            </time>
            <p className="mt-1 text-sm text-slate-700">{event.description}</p>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-semibold ${stageBadge.className}`}
        >
          {stageBadge.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          to={`/events/${event.id}`}
        >
          {getTranslation("Events.moreInfo", locale)}
        </Link>
        {isEditable && (
          <RoleGate adminOnly>
            <Link
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              to={`/events/${event.id}/edit`}
            >
              {getTranslation("Events.editButton", locale)}
            </Link>
          </RoleGate>
        )}
      </div>
    </div>
  );
};

interface EventSectionProps {
  status: EventStatus;
  events: Event[];
  stageBadges: Record<Event["stage"], StageBadge>;
  formatDateTime: (value: string) => string;
  locale: Locale;
}

const EventSection: React.FC<EventSectionProps> = ({
  status,
  events,
  stageBadges,
  formatDateTime,
  locale,
}) => {
  const getTitleKey = (status: EventStatus): "Events.current" | "Events.upcoming" | "Events.past" => {
    const keys: Record<EventStatus, "Events.current" | "Events.upcoming" | "Events.past"> = {
      [EventStatus.CURRENT]: "Events.current",
      [EventStatus.UPCOMING]: "Events.upcoming",
      [EventStatus.PAST]: "Events.past",
    };
    return keys[status];
  };

  const getDefaultTitle = (status: EventStatus): string => {
    const defaults: Record<EventStatus, string> = {
      [EventStatus.CURRENT]: "Current Events",
      [EventStatus.UPCOMING]: "Upcoming Events",
      [EventStatus.PAST]: "Past Events",
    };
    return defaults[status];
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">
        {getTranslation(getTitleKey(status), locale) || getDefaultTitle(status)}
      </h2>
      <div className="grid gap-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            status={status}
            stageBadge={stageBadges[event.stage]}
            formatDateTime={formatDateTime}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
};

export default function EventsList() {
  const { locale } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UiError | null>(null);

  const stageBadges = useStageBadges(locale);
  const { upcoming, current, past } = useEventsByStatus(events);
  const formatDateTime = useDateFormatter(locale);

  useEffect(() => {
    let active = true;

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getEvents();
        if (active) {
          setEvents(data);
        }
      } catch (err) {
        if (active) {
          const message =
            toUiError(err);
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchEvents();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-linear-to-br from-slate-50 via-white to-amber-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-500">
              {getTranslation("Common.events", locale)}
            </p>
            <h1 className="font-display text-3xl text-slate-900 md:text-4xl">
              {getTranslation("Events.listTitle", locale)}
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 md:text-base">
              {getTranslation("Events.listSubtitle", locale)}
            </p>
          </div>
          <RoleGate adminOnly>
            <Link
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
              to="/events/new"
            >
              {getTranslation("Events.createButton", locale)}
            </Link>
          </RoleGate>
        </header>

        {loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
            <LoadingSpinner />
            <span className="text-sm text-slate-500">
              {getTranslation("Events.loading", locale)}
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <ErrorFeedback error={error} />
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-10 text-center shadow-sm">
            <h2 className="font-display text-2xl text-slate-900">
              {getTranslation("Events.noEventsYet", locale)}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {getTranslation("Events.createFirstEvent", locale)}
            </p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="space-y-8">
            {current.length > 0 && (
              <EventSection
                status={EventStatus.CURRENT}
                events={current}
                stageBadges={stageBadges}
                formatDateTime={formatDateTime}
                locale={locale}
              />
            )}

            {upcoming.length > 0 && (
              <EventSection
                status={EventStatus.UPCOMING}
                events={upcoming}
                stageBadges={stageBadges}
                formatDateTime={formatDateTime}
                locale={locale}
              />
            )}

            {past.length > 0 && (
              <EventSection
                status={EventStatus.PAST}
                events={past}
                stageBadges={stageBadges}
                formatDateTime={formatDateTime}
                locale={locale}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
