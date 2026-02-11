import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const PerformanceSchema = z.object({
  id: IdSchema,
  nominationId: IdSchema,
  formatId: IdSchema,
  ageGroupId: IdSchema,
  participantCount: z.number().int().min(1).max(999),
  durationSeconds: z.number().int().min(1)
});

export const ParamsWithStudioIdSchema = z.object({
  studioId: IdSchema,
});

export const ParamsWithStudioAndPerformanceIdSchema = z.object({
  studioId: IdSchema,
  performanceId: IdSchema,
});

export const CreatePerformanceBodySchema = z.object({
  title: z.string().min(1),
  durationSec: z.number().int().positive(),
  orderOnStage: z.number().int().positive(),
  categoryId: IdSchema,
  ageGroupId: IdSchema,
  formatId: IdSchema,
  dancerIds: z.array(IdSchema).min(1),
});

export const UpdatePerformanceBodySchema = z.object({
  title: z.string().min(1).optional(),
  durationSec: z.number().int().positive().optional(),
  orderOnStage: z.number().int().positive().optional(),
  categoryId: IdSchema.optional(),
  ageGroupId: IdSchema.optional(),
  formatId: IdSchema.optional(),
  dancerIds: z.array(IdSchema).min(1).optional(),
});