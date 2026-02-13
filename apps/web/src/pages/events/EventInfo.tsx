import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { getTranslation } from "@i18n/translations";
import { type Locale } from "@i18n/LanguageContext";
import { useTranslation } from "@i18n/useTranslation";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { type Event, getEvent } from "@api/events";
import { ApiError } from "@api/client";
import { RoleGate } from "@auth";

type StageBadge = {
  label: string;
  className: string;
};

const useStageBadges = (locale: Locale): Record<Event["stage"], StageBadge> => {
  return useMemo(
    () => ({
      PRE_REGISTRATION: {
        label: getTranslation("Events.stagePreRegistration", locale),
        className: "bg-amber-100 text-amber-700 border border-amber-200",
      },
      REGISTRATION_OPEN: {
        label: getTranslation("Events.stageRegistrationOpen", locale),
        className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      },
      DATA_REVIEW: {
        label: getTranslation("Events.stageDataReview", locale),
        className: "bg-sky-100 text-sky-700 border border-sky-200",
      },
      FINALIZED: {
        label: getTranslation("Events.stageFinalized", locale),
        className: "bg-emerald-200 text-emerald-700 border border-emerald-300",
      },
      ENDED: {
        label: getTranslation("Events.stageEnded", locale),
        className: "bg-gray-200 text-gray-700 border border-gray-300",
      },
    }),
    [locale],
  );
};

const useDateFormatter = (locale: Locale) => {
  return useCallback(
    (value: string): string => {
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return value; // Return original string if date is invalid
        }
        return new Intl.DateTimeFormat(locale, {
          dateStyle: "long",
          timeStyle: "short",
        }).format(date);
      } catch {
        return value; // Return original string if formatting fails
      }
    },
    [locale],
  );
};

interface EventCardProps {
  event: Event;
  stageBadge: StageBadge;
  formatDateTime: (value: string) => string;
  locale: Locale;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  stageBadge,
  formatDateTime,
  locale,
}) => {
  const isRegistrationOpen =
    event.stage === "PRE_REGISTRATION" ||
    event.stage === "REGISTRATION_OPEN" ||
    event.stage === "DATA_REVIEW";

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
      {/* Hero Image Section */}
      <div className="relative h-80 w-full bg-linear-to-br from-slate-100 to-slate-200">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="mx-auto h-20 w-20 text-slate-300"
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

        {/* Stage Badge - Top Right */}
        <div className="absolute right-4 top-4">
          <span
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${stageBadge.className}`}
          >
            {stageBadge.label}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col gap-8 p-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">{event.name}</h1>
          <p className="mt-2 text-lg text-slate-600">{event.description}</p>
        </div>

        {/* Date & Time Info */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {getTranslation("Events.startsAt", locale)}
            </p>
            <time className="block text-lg font-semibold text-slate-900">
              {formatDateTime(event.startsAt)}
            </time>
          </div>
          <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {getTranslation("Events.endsAt", locale)}
            </p>
            <time className="block text-lg font-semibold text-slate-900">
              {formatDateTime(event.endsAt)}
            </time>
          </div>
        </div>

        {/* Location Info */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {getTranslation("Events.venue", locale)}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {event.venue}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {getTranslation("Common.city", locale)}
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {event.city}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {getTranslation("Common.country", locale)}
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {event.country}
              </p>
            </div>
          </div>
        </div>

        {/* Event Metadata */}
        <div className="space-y-3 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>{getTranslation("Common.eventId", locale)}</span>
            <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs">
              {event.id}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span>{getTranslation("Events.createdAt", locale)}</span>
            <time>{formatDateTime(event.createdAt)}</time>
          </div>
          {event.updatedAt !== event.createdAt && (
            <div className="flex items-center justify-between">
              <span>{getTranslation("Events.updatedAt", locale)}</span>
              <time>{formatDateTime(event.updatedAt)}</time>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
          <RoleGate
            adminOnly
            fallback={
              isRegistrationOpen && (
                <Link
                  className="flex-1 rounded-full border border-emerald-500 bg-emerald-50 px-6 py-3 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-600"
                  to={`/events/${event.id}/register`}
                >
                  {getTranslation("Events.registerButton", locale)}
                </Link>
              )
            }
          >
            <Link
              className="flex-1 rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400"
              to={`/events/${event.id}/edit`}
            >
              {getTranslation("Events.editButton", locale)}
            </Link>

            <Link
              className="flex-1 rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400"
              to={`/events/${event.id}/studio`}
            >
              {getTranslation("Events.addStudio", locale)}
            </Link>
          </RoleGate>
        </div>
      </div>
    </div>
  );
};

export default function EventInfo() {
  const { locale } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [eventData, setEventData] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const stageBadges = useStageBadges(locale);
  const formatDateTime = useDateFormatter(locale);

  useEffect(() => {
    let active = true;

    const fetchEvent = async () => {
      if (!id) {
        setLoadError(getTranslation("Events.loadError", locale));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError(null);
        const data = await getEvent(id);
        if (active) {
          setEventData(data);
        }
      } catch (err) {
        if (active) {
          const message =
            err instanceof ApiError
              ? err.message
              : getTranslation("Events.loadError", locale);
          setLoadError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchEvent();

    return () => {
      active = false;
    };
  }, [id, locale]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-linear-to-br from-slate-50 via-white to-amber-50 px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          to="/events"
        >
          <span aria-hidden className="text-lg">
            ←
          </span>
          {getTranslation("Events.backToList", locale)}
        </Link>

        {loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
            <LoadingSpinner />
            <span className="text-sm text-slate-500">
              {getTranslation("Events.loading", locale)}
            </span>
          </div>
        )}

        {loadError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {loadError}
          </div>
        )}

        {!loading && !loadError && eventData && (
          <EventCard
            event={eventData}
            stageBadge={stageBadges[eventData.stage]}
            formatDateTime={formatDateTime}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
}
