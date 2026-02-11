import { z } from "zod";
import { NamedEntitySchema } from "./common.schema.js";

export const DanceCategorySchema = NamedEntitySchema;

export const AgeGroupSchema = NamedEntitySchema.extend({
  minAge: z.number().int().min(0),
  maxAge: z.number().int().max(999)
});

export const DanceFormatSchema = NamedEntitySchema.extend({
  minParticipants: z.number().int().min(1),
  maxParticipants: z.number().int().min(1).max(999),
  maxDurationSeconds: z.number().int().min(30)
});