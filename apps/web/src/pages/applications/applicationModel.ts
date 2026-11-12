import type { Event, Studio } from "@dance/schemas";
export const studioUrl = (studioId: string) => `/studios/${encodeURIComponent(studioId)}`;
export const applyUrl = (eventId: string) => `/events/${encodeURIComponent(eventId)}/register`;
export function applicationOpen(event: Event, now = Date.now()) {
  return ["PRE_REGISTRATION", "REGISTRATION_OPEN"].includes(event.stage)
    && (event.registrationDeadline === null || now < Date.parse(event.registrationDeadline));
}
export function ownedStudios(studios: Studio[], userId: string) {
  return studios.filter(studio => studio.representatives.some(rep => rep.active && rep.userId === userId));
}
