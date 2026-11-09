import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const EventStageSchema = z.enum([
  "PRE_REGISTRATION",
  "REGISTRATION_OPEN",
  "DATA_REVIEW",
  "FINALIZED",
  "ENDED",
  "CANCELLED"
]);

export const EventIdParamsSchema = z.object({
  eventId: IdSchema,
});

export const EventIdStudioIdParamsSchema = z.object({
  eventId: IdSchema,
  studioId: IdSchema,
});

export const EventTimeZoneSchema = z.string().min(1).max(100).refine(value => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}, { message: "Invalid IANA timezone" });
const InstantSchema = z.iso.datetime({ offset: true });
const TextSchema = z.string().trim().min(1);
const LimitSchema = z.number().int().positive().max(2147483647);
const eventFields = {
  timeZone: EventTimeZoneSchema.optional(),
  registrationDeadline: InstantSchema.nullable().optional(),
  name: TextSchema,
  startsAt: InstantSchema,
  endsAt: InstantSchema,
  stage: EventStageSchema.optional(),
  venue: TextSchema.nullable().optional(),
  country: TextSchema.nullable().optional(),
  city: TextSchema.nullable().optional(),
  description: TextSchema.nullable().optional(),
  maxStudios: LimitSchema.nullable().optional(),
  maxPerformances: LimitSchema.nullable().optional(),
};

const deadlineOrder = (data: { registrationDeadline?: string | null | undefined; startsAt?: string | undefined }) =>
  !data.registrationDeadline || !data.startsAt || new Date(data.registrationDeadline) <= new Date(data.startsAt);
const deadlineIssue = { params: { reason: "dateOrder" }, message: "Deadline must be at or before start", path: ["registrationDeadline"] };
export function eventStageTargets(stage?: z.infer<typeof EventStageSchema>): z.infer<typeof EventStageSchema>[] {
  if (!stage) return ["PRE_REGISTRATION", "REGISTRATION_OPEN"];
  if (stage === "PRE_REGISTRATION") return [stage, "REGISTRATION_OPEN", "CANCELLED"];
  if (stage === "REGISTRATION_OPEN") return [stage, "DATA_REVIEW", "CANCELLED"];
  if (stage === "DATA_REVIEW") return [stage, "CANCELLED"];
  return [stage];
}

export const CreateEventBodySchema = z.strictObject(eventFields).refine(
  (data) => new Date(data.startsAt) < new Date(data.endsAt),
  { params: { reason: "dateOrder" }, message: "End date must be after start date", path: ["endsAt"] }
).refine(deadlineOrder, deadlineIssue);

export const UpdateEventBodySchema = z.strictObject({ ...eventFields, expectedStage: EventStageSchema.optional() }).partial()
.refine((body) => Object.keys(body).some(key => key !== "expectedStage"), { message: "At least one field is required", params: { reason: "nonemptyPatch" } })
.refine(
  (data) => {
    if (data.startsAt && data.endsAt) {
      return new Date(data.startsAt) < new Date(data.endsAt);
    }
    return true;
  },
  { params: { reason: "dateOrder" }, message: "End date must be after start date", path: ["endsAt"] }
).refine(deadlineOrder, deadlineIssue);

export type CreateEventInput = z.infer<typeof CreateEventBodySchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventBodySchema>;

export const EventSchema = z.strictObject({
  id: IdSchema, name: z.string(), startsAt: z.iso.datetime(), endsAt: z.iso.datetime(),
  timeZone: EventTimeZoneSchema, registrationDeadline: z.iso.datetime().nullable(),
  stage: EventStageSchema, createdAt: z.iso.datetime(),
  venue: z.string().nullable(), country: z.string().nullable(), city: z.string().nullable(),
  description: z.string().nullable(), maxStudios: z.int().nullable(),
  maxPerformances: z.int().nullable(), imageUrl: z.string().nullable(),
});
export const EventsSchema = z.array(EventSchema);
export type Event = z.infer<typeof EventSchema>;
export type EventStage = z.infer<typeof EventStageSchema>;
