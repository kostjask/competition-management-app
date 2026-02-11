import { z } from "zod";
import { NamedEntitySchema, IdSchema } from "./common.schema.js";

export const DanceCategorySchema = NamedEntitySchema;

export const AgeGroupSchema = NamedEntitySchema.extend({
  minAge: z.number().int().min(0, "Min age must be 0 or higher"),
  maxAge: z.number().int().min(1).max(999, "Max age must be 999 or less"),
}).refine(
  (data) => data.minAge < data.maxAge,
  { message: "Max age must be greater than min age", path: ["maxAge"] }
);

export const DanceFormatSchema = NamedEntitySchema.extend({
  minParticipants: z
    .number()
    .int()
    .min(1, "Min participants must be at least 1"),
  maxParticipants: z
    .number()
    .int()
    .min(1)
    .max(999, "Max participants must be 999 or less"),
  maxDurationSeconds: z
    .number()
    .int()
    .min(30, "Duration must be at least 30 seconds"),
}).refine(
  (data) => data.minParticipants <= data.maxParticipants,
  {
    message: "Max participants must be >= min participants",
    path: ["maxParticipants"],
  }
);

export type DanceCategory = z.infer<typeof DanceCategorySchema>;
export type AgeGroup = z.infer<typeof AgeGroupSchema>;
export type DanceFormat = z.infer<typeof DanceFormatSchema>;