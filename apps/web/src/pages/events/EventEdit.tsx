import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { type CreateEventInput } from "@dance/schemas";
import { ApiError } from "@api/client";
import { type Event, getEvent, updateEvent } from "@api/events";
import { LoadingSpinner } from "@components/LoadingSpinner";
import { getTranslation } from "@i18n/translations";
import { useTranslation } from "@i18n/useTranslation";
import { EventForm } from "./EventForm";

export default function EventEdit() {
  const { locale } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [eventData, setEventData] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
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

    load();

    return () => {
      active = false;
    };
  }, [id, locale]);

  const handleSubmit = async (values: CreateEventInput) => {
    if (!id) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await updateEvent(id, values);
      navigate("/events");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : getTranslation("Events.submitError", locale);
      setSubmitError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialValues: CreateEventInput | null = eventData
    ? {
        name: eventData.name,
        startsAt: eventData.startsAt,
        endsAt: eventData.endsAt,
        stage: eventData.stage,
      }
    : null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-linear-to-br from-slate-50 via-white to-amber-50 px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          to="/events"
        >
          <span aria-hidden>←</span>
          {getTranslation("Events.backToList", locale)}
        </Link>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
            <LoadingSpinner />
            <span className="text-sm text-slate-500">
              {getTranslation("Events.loading", locale)}
            </span>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {loadError}
          </div>
        ) : initialValues ? (
          <EventForm
            key={eventData?.id}
            title={getTranslation("Events.editTitle", locale)}
            initialValues={initialValues}
            submitLabel={getTranslation("Events.saveChanges", locale)}
            submitError={submitError}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/events")}
          />
        ) : null}
      </div>
    </div>
  );
}
