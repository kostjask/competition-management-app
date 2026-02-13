import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const CreateFormatBodySchema = z.object({
  name: z.string().min(1, "Format name is required"),
  minParticipants: z.number().int().min(1, "Minimum participants must be at least 1"),
  maxParticipants: z.number().int().min(1, "Maximum participants must be at least 1"),
  maxDurationSeconds: z.number().int().min(1, "Maximum duration must be at least 1 second"),
}).refine(
  (data) => data.minParticipants <= data.maxParticipants,
  { message: "Min participants cannot exceed max participants", path: ["maxParticipants"] }
);

export const UpdateFormatBodySchema = z.object({
  name: z.string().min(1).optional(),
  minParticipants: z.number().int().min(1).optional(),
  maxParticipants: z.number().int().min(1).optional(),
  maxDurationSeconds: z.number().int().min(1).optional(),
}).refine(
  (data) => {
    if (data.minParticipants !== undefined && data.maxParticipants !== undefined) {
      return data.minParticipants <= data.maxParticipants;
    }
    return true;
  },
  { message: "Min participants cannot exceed max participants", path: ["maxParticipants"] }
);

export const FormatIdParamsSchema = z.object({
  id: IdSchema,
  eventId: IdSchema,
});

export const FormatEventParamsSchema = z.object({
  eventId: IdSchema,
});

export type CreateFormatInput = z.infer<typeof CreateFormatBodySchema>;
export type UpdateFormatInput = z.infer<typeof UpdateFormatBodySchema>;