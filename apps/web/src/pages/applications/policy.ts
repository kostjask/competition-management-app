import type { Event, StudioRegistration } from "@dance/schemas";
import type { TranslationKey } from "../../i18n/translations";

export const statusKey = { PENDING: "Registration.pending", APPROVED: "Registration.approved", REJECTED: "Registration.rejected", CANCELLED: "Registration.cancelled", LOCKED: "Registration.locked" } as const satisfies Record<StudioRegistration["status"], TranslationKey>;
export const reasonKey = { CONTACT_ORGANIZER: "Registration.contactOrganizer", INCOMPLETE_DETAILS: "Registration.incompleteDetails", INELIGIBLE: "Registration.ineligible", CAPACITY: "Registration.capacity" } as const;
export function applicationOpen(event: Event, now = Date.now()) { return ["PRE_REGISTRATION", "REGISTRATION_OPEN"].includes(event.stage) && (!event.registrationDeadline || now < Date.parse(event.registrationDeadline)); }
export function reviewOpen(event: Event) { return ["PRE_REGISTRATION", "REGISTRATION_OPEN", "DATA_REVIEW"].includes(event.stage); }
