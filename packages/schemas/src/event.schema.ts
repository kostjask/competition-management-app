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

const InstantSchema = z.iso.datetime({ offset: true });
const TextSchema = z.string().trim().min(1);
const LimitSchema = z.number().int().positive().max(2147483647);
const eventFields = {
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

export const CreateEventBodySchema = z.strictObject(eventFields).refine(
  (data) => new Date(data.startsAt) < new Date(data.endsAt),
  { params: { reason: "dateOrder" }, message: "End date must be after start date", path: ["endsAt"] }
);

export const UpdateEventBodySchema = z.strictObject(eventFields).partial()
.refine((body) => Object.keys(body).length > 0, { message: "At least one field is required", params: { reason: "nonemptyPatch" } })
.refine(
  (data) => {
    if (data.startsAt && data.endsAt) {
      return new Date(data.startsAt) < new Date(data.endsAt);
    }
    return true;
  },
  { params: { reason: "dateOrder" }, message: "End date must be after start date", path: ["endsAt"] }
);

export type CreateEventInput = z.infer<typeof CreateEventBodySchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventBodySchema>;

export const EventSchema = z.strictObject({
  id: IdSchema, name: z.string(), startsAt: z.iso.datetime(), endsAt: z.iso.datetime(),
  stage: EventStageSchema, createdAt: z.iso.datetime(),
  venue: z.string().nullable(), country: z.string().nullable(), city: z.string().nullable(),
  description: z.string().nullable(), maxStudios: z.int().nullable(),
  maxPerformances: z.int().nullable(), imageUrl: z.string().nullable(),
});
export const EventsSchema = z.array(EventSchema);
export type Event = z.infer<typeof EventSchema>;
export type EventStage = z.infer<typeof EventStageSchema>;
