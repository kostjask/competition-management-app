import { z } from "zod";
import { IdSchema } from "./common.schema.js";
import { DancerSchema } from "./dancer.schema.js";

export const PerformanceCollectionParamsSchema = z.object({ eventId: IdSchema });
export const PerformanceItemParamsSchema = PerformanceCollectionParamsSchema.extend({ performanceId: IdSchema });
export const PerformanceQuerySchema = z.strictObject({ studioId: IdSchema.optional() });
const fields = {
  title: z.string().trim().min(1),
  durationSec: z.number().int().positive().max(2147483647),
  orderOnStage: z.number().int().positive().max(2147483647),
  categoryId: IdSchema, ageGroupId: IdSchema, formatId: IdSchema,
  dancerIds: z.array(IdSchema).min(1).refine((ids) => new Set(ids).size === ids.length, { message: "Dancer IDs must be unique" }),
};
export const CreatePerformanceBodySchema = z.strictObject({ studioId: IdSchema, ...fields });
export const UpdatePerformanceBodySchema = z.strictObject(fields).partial().refine(
  (body) => Object.values(body).some((value) => value !== undefined),
  { message: "At least one performance field is required" },
);
export const PerformanceSchema = z.strictObject({
  id: IdSchema, eventId: IdSchema, title: z.string(), durationSec: z.number().int(),
  orderOnStage: z.number().int(), categoryId: IdSchema, ageGroupId: IdSchema, formatId: IdSchema,
  participants: z.array(z.strictObject({ dancerId: IdSchema, dancer: DancerSchema })),
});
export const PerformancesSchema = z.array(PerformanceSchema);
export type Performance = z.infer<typeof PerformanceSchema>;
export type CreatePerformanceInput = z.input<typeof CreatePerformanceBodySchema>;
export type UpdatePerformanceInput = z.input<typeof UpdatePerformanceBodySchema>;
