import { z } from "zod";
import { IdSchema, DateSchema } from "./common.schema.js";

export const EventStageSchema = z.enum([
  "PRE_REGISTRATION",
  "REGISTRATION_OPEN",
  "DATA_REVIEW",
  "FINALIZED",
  "ENDED",
]);

export const EventIdParamsSchema = z.object({
  id: IdSchema,
});

export const CreateEventBodySchema = z.object({
  name: z.string().min(1, "Event name is required"),
  startsAt: DateSchema,
  endsAt: DateSchema,
  stage: EventStageSchema.optional(),
}).refine(
  (data) => new Date(data.startsAt) < new Date(data.endsAt),
  { message: "End date must be after start date", path: ["endsAt"] }
);

export const UpdateEventBodySchema = z.object({
  name: z.string().min(1).optional(),
  startsAt: DateSchema.optional(),
  endsAt: DateSchema.optional(),
  stage: EventStageSchema.optional(),
}).refine(
  (data) => {
    if (data.startsAt && data.endsAt) {
      return new Date(data.startsAt) < new Date(data.endsAt);
    }
    return true;
  },
  { message: "End date must be after start date", path: ["endsAt"] }
);

export type CreateEventInput = z.infer<typeof CreateEventBodySchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventBodySchema>;
