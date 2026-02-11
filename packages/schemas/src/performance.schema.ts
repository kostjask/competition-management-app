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