import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const CreateJudgeBodySchema = z.object({
  userId: IdSchema,
  name: z.string().min(1, "Judge name is required"),
  description: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  eventId: IdSchema,
});

export const UpdateJudgeBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  eventId: IdSchema,
});

export const JudgeIdParamsSchema = z.object({
  id: IdSchema,
});

export const JudgeEventParamsSchema = z.object({
  eventId: IdSchema,
});

export type CreateJudgeInput = z.infer<typeof CreateJudgeBodySchema>;
export type UpdateJudgeInput = z.infer<typeof UpdateJudgeBodySchema>;