import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const CreateAgeGroupBodySchema = z.object({
  name: z.string().min(1, "Age group name is required"),
  minAge: z.number().int().min(0, "Minimum age must be at least 0"),
  maxAge: z.number().int().min(0).optional().nullable(),
}).refine(
  (data) => {
    if (data.maxAge !== null && data.maxAge !== undefined) {
      return data.minAge <= data.maxAge;
    }
    return true;
  },
  { message: "Min age cannot exceed max age", path: ["maxAge"] }
);

export const UpdateAgeGroupBodySchema = z.object({
  name: z.string().min(1).optional(),
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().min(0).optional().nullable(),
}).refine(
  (data) => {
    if (data.minAge !== undefined && data.maxAge !== null && data.maxAge !== undefined) {
      return data.minAge <= data.maxAge;
    }
    return true;
  },
  { message: "Min age cannot exceed max age", path: ["maxAge"] }
);

export const AgeGroupIdParamsSchema = z.object({
  id: IdSchema,
  eventId: IdSchema,
});

export const AgeGroupEventParamsSchema = z.object({
  eventId: IdSchema,
});

export type CreateAgeGroupInput = z.infer<typeof CreateAgeGroupBodySchema>;
export type UpdateAgeGroupInput = z.infer<typeof UpdateAgeGroupBodySchema>;