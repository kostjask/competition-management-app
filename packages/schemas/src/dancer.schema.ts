import { z } from "zod";
import { IdSchema, DateSchema } from "./common.schema.js";

export const DancerSchema = z.object({
  id: IdSchema,
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  birthDate: DateSchema,
  studioId: IdSchema,
});

export const CreateDancerBodySchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  birthDate: DateSchema,
});

export const UpdateDancerBodySchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  birthDate: DateSchema.optional(),
});

export type Dancer = z.infer<typeof DancerSchema>;
export type CreateDancerInput = z.infer<typeof CreateDancerBodySchema>;
export type UpdateDancerInput = z.infer<typeof UpdateDancerBodySchema>;