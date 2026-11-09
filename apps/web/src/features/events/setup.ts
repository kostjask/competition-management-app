import type { CreateEventInput, Event, EventStage } from "@dance/schemas";
export const eventFieldIds: Record<string, string> = Object.fromEntries(["name", "venue", "city", "country", "organizerEmail", "organizerPhone", "timeZone", "startsAt", "endsAt", "registrationDeadline", "description", "maxStudios", "maxPerformances"].map(key => [key, "event-" + key]));
eventFieldIds.description = "event-description-language";
eventFieldIds.registrationDeadline = "event-cutoff";
export const stageKey = {
  PRE_REGISTRATION: "Events.stagePreRegistration", REGISTRATION_OPEN: "Events.stageRegistrationOpen", DATA_REVIEW: "Events.stageDataReview",
  FINALIZED: "Events.stageFinalized", ENDED: "Events.stageEnded", CANCELLED: "Events.stageCancelled",
} as const satisfies Record<EventStage, string>;
export function eventInput(event: Event): CreateEventInput {
  return { name: event.name, startsAt: event.startsAt, endsAt: event.endsAt, timeZone: event.timeZone,
    registrationDeadline: event.registrationDeadline, venue: event.venue, country: event.country, city: event.city,
    organizerEmail: event.organizerEmail, organizerPhone: event.organizerPhone, description: event.description,
    maxStudios: event.maxStudios, maxPerformances: event.maxPerformances };
}
export function eventDate(value: string, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone }).format(new Date(value));
}
