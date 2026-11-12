import { toUiError, type UiError } from "../../api/error";
import { ErrorFeedback } from "../../components/ErrorFeedback";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTranslation } from "@i18n/translations";
import { type Locale } from "@i18n/LanguageContext";
import { useTranslation } from "@i18n/useTranslation";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { type Event, getEvent } from "@api/events";
import { RoleGate } from "@auth";
import { Button } from "../../components/ui/Foundation";
import { resolveAuthoredContent } from "@dance/schemas";
import { EventImage } from "./EventImage";
import {
  type StageBadge,
  useStageBadges,
} from "../../features/events/hooks/useStageBadges";



// const useDateFormatter = (locale: Locale) => {
//   return useCallback(
//     (value: string): string => {
//       try {
//         const date = new Date(value);
//         if (isNaN(date.getTime())) {
//           return value; // Return original string if date is invalid
//         }
//         return new Intl.DateTimeFormat(locale, {
//           dateStyle: "long",
//           timeStyle: "short",
//         }).format(date);
//       } catch {
//         return value; // Return original string if formatting fails
//       }
//     },
//     [locale],
//   );
// };

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

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
      <div className="p-4"><EventImage id={event.id} url={event.imageUrl} /><span className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${stageBadge.className}`}>{stageBadge.label}</span></div>
      {/* Content Section */}
      <div className="flex flex-col gap-8 p-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">{event.name}</h1>
          {event.authoredDescription ? <>
            {resolveAuthoredContent(event.authoredDescription, locale).fallback && <p>{getTranslation("Registration.contentFallback", locale)}</p>}
            <p lang={resolveAuthoredContent(event.authoredDescription, locale).lang}>{resolveAuthoredContent(event.authoredDescription, locale).text}</p>
          </> : <p className="mt-2 text-lg text-slate-600">{event.description}</p>}

          <p>{event.timeZone}</p>
          <p>{getTranslation("Organizer.contact", locale)}: {event.organizerEmail} {event.organizerPhone}</p>
          <p>{getTranslation("Organizer.deadline", locale)}: {event.registrationDeadline ? formatDateTime(event.registrationDeadline) : getTranslation("Organizer.noDeadline", locale)}</p>
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
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
          <RoleGate
            adminOnly
            fallback={<p>{getTranslation("Shell.registrationUnavailable", locale)}</p>}
          >
            <Link
              className="flex-1 rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400"
              to={`/events/${event.id}/edit`}
            >
              {getTranslation("Events.editButton", locale)}
            </Link>
            <Link className="ui-button ui-button-secondary" to={`/admin/events/${encodeURIComponent(event.id)}/staff`}>
              {getTranslation("Staff.title", locale)}
            </Link>
            <Link className="ui-button ui-button-secondary" to={`/admin/events/${encodeURIComponent(event.id)}/applications`}>{getTranslation("Organizer.review", locale)}</Link>

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
  const [loadError, setLoadError] = useState<UiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  const stageBadges = useStageBadges(locale);
  const formatDateTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: eventData?.timeZone ?? "UTC" }).format(new Date(value));

  useEffect(() => {
    let active = true;

    const fetchEvent = async () => {
      if (!id) {
        setLoadError(toUiError(null));
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
            toUiError(err);
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
  }, [id, attempt]);

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
            <h1>{getTranslation(loadError.reason === "recordNotFound" ? "Shell.notFound" : loadError.reason === "permissionDenied" ? "Access.denied" : "Shell.unavailable", locale)}</h1>
            <ErrorFeedback error={loadError} />
            <Button onClick={() => setAttempt(value => value + 1)}>{getTranslation("Shell.retry", locale)}</Button>
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
