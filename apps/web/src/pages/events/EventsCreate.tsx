import { toUiError, type UiError } from "../../api/error";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EventStageSchema, type CreateEventInput } from "@dance/schemas";
import { createEvent } from "../../api/events";
import { useTranslation } from "@i18n/useTranslation";
import { getTranslation } from "@i18n/translations";
import { Alert } from "../../components/ui/Foundation";
import { EventForm } from "./EventForm";

export default function EventsCreate() {
  const { locale } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [submitError, setSubmitError] = useState<UiError | null>(null);

  const initialValues = useMemo<CreateEventInput>(() => {
    const startsAt = new Date();
    startsAt.setUTCSeconds(0, 0);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
    return {
      name: "",
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      stage: EventStageSchema.options[0],
    };
  }, []);

  const handleSubmit = async (values: CreateEventInput) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const created = await createEvent(values);
      navigate(`/admin/events/${encodeURIComponent(created.id)}/setup`);
    } catch (err) {
      const message = toUiError(err);
      setSubmitError(message);
      if (message.reason !== "invalidInput") setUncertain(true);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

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
        {uncertain && <Alert tone="warning">{getTranslation("Organizer.stale", locale)} <Link to="/admin">{getTranslation("Organizer.title", locale)}</Link></Alert>}
        <EventForm blocked={uncertain}
          title={getTranslation("Events.createTitle", locale)}
          initialValues={initialValues}
          submitLabel={getTranslation("Events.createSubmit", locale)}
          submitError={submitError}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/events")}
        />
      </div>
    </div>
  );
}
