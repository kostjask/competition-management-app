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
  dancerIds: z.array(IdSchema).min(1).refine((ids) => new Set(ids).size === ids.length, { message: "Dancer IDs must be unique", params: { reason: "duplicate" } }),
};
export const CreatePerformanceBodySchema = z.strictObject({ studioId: IdSchema, ...fields });
export const UpdatePerformanceBodySchema = z.strictObject({ ...z.object(fields).partial().shape, expectedRevision: z.int().positive() }).refine(
  (body) => Object.keys(body).some((key) => key !== "expectedRevision"),
  { message: "At least one performance field is required", params: { reason: "nonemptyPatch" } },
);
export const PerformanceSchema = z.strictObject({
  revision: z.int().positive(),
  id: IdSchema, eventId: IdSchema, studioId: IdSchema, registrationId: IdSchema, title: z.string(), durationSec: z.number().int(),
  orderOnStage: z.number().int(), categoryId: IdSchema, ageGroupId: IdSchema, formatId: IdSchema,
  participants: z.array(z.strictObject({ dancerId: IdSchema, dancer: DancerSchema })),
});
export const PerformancesSchema = z.array(PerformanceSchema);
export const PerformanceDeleteQuerySchema = z.strictObject({ expectedRevision: z.coerce.number().int().positive() });
const snapshotConfiguration = z.strictObject({
  category: z.strictObject({ id: IdSchema, name: z.string() }),
  ageGroup: z.strictObject({ id: IdSchema, name: z.string(), minAge: z.int(), maxAge: z.int().nullable() }),
  format: z.strictObject({ id: IdSchema, name: z.string(), minParticipants: z.int(), maxParticipants: z.int(), maxDurationSeconds: z.int() }),
});
export const PerformanceSnapshotSchema = z.strictObject({
  policyVersion: z.literal(1), eventId: IdSchema, studioId: IdSchema, registrationId: IdSchema,
  studioName: z.string(), title: z.string(), durationSec: z.int(), orderOnStage: z.int(),
  timeZone: z.string(), ageDate: z.iso.date(), configuration: snapshotConfiguration,
  participants: z.array(z.strictObject({ dancerId: IdSchema, firstName: z.string(), lastName: z.string(), birthDate: z.iso.date() })),
  archived: z.boolean(),
});
export const PerformanceRevisionSchema = z.strictObject({
  revision: z.int().positive(), origin: z.enum(["LEGACY_BASELINE", "CREATE", "EDIT", "ARCHIVE"]),
  capturedAt: z.iso.datetime(), actorKind: z.enum(["USER", "MIGRATION"]), snapshot: PerformanceSnapshotSchema,
});
export const PerformanceHistorySchema = z.array(PerformanceRevisionSchema);
export type PerformanceRevision = z.infer<typeof PerformanceRevisionSchema>;
export type Performance = z.infer<typeof PerformanceSchema>;
export type CreatePerformanceInput = z.input<typeof CreatePerformanceBodySchema>;
export type UpdatePerformanceInput = z.input<typeof UpdatePerformanceBodySchema>;
