import { z } from "zod";
import { IdSchema } from "./common.schema.js";
import { DancerSchema } from "./dancer.schema.js";

export const PerformanceCollectionParamsSchema = z.object({ eventId: IdSchema });
export const PerformanceItemParamsSchema = PerformanceCollectionParamsSchema.extend({ performanceId: IdSchema });
export const PerformanceQuerySchema = z.strictObject({ studioId: IdSchema.optional(), state: z.enum(["active", "withdrawn"]).default("active") });
export const PerformanceLifecycleBodySchema = z.strictObject({ expectedRevision: z.int().positive(), operationId: z.uuid(),
  action: z.enum(["WITHDRAW", "RESTORE"]), reason: z.string().trim().min(1).max(1000) });
export const PerformanceWithdrawalBodySchema = PerformanceLifecycleBodySchema.extend({ action: z.literal("WITHDRAW") });
export const PerformanceRestoreBodySchema = PerformanceLifecycleBodySchema.extend({ action: z.literal("RESTORE") });
export const PerformanceLifecycleResultSchema = z.strictObject({ id: IdSchema, revision: z.int().positive(), archived: z.boolean() });
export type PerformanceLifecycleInput = z.infer<typeof PerformanceLifecycleBodySchema>;
const fields = {
  teacher: z.string().trim().min(1).max(500).nullable(), author: z.string().trim().min(1).max(500).nullable(),
  title: z.string().trim().min(1).max(500).nullable(),
  durationSec: z.number().int().positive().max(2147483647).nullable(),
  orderOnStage: z.number().int().positive().max(2147483647).nullable(),
  categoryId: IdSchema.nullable(), ageGroupId: IdSchema.nullable(), formatId: IdSchema.nullable(),
  dancerIds: z.array(IdSchema).max(1000).refine((ids) => new Set(ids).size === ids.length, { message: "Dancer IDs must be unique", params: { reason: "duplicate" } }),
};
export const CreatePerformanceBodySchema = z.strictObject({ studioId: IdSchema, operationId: z.uuid().optional(),
  teacher: fields.teacher.default(null), author: fields.author.default(null),
  title: fields.title.default(null), durationSec: fields.durationSec.default(null), orderOnStage: fields.orderOnStage.default(null),
  categoryId: fields.categoryId.default(null), ageGroupId: fields.ageGroupId.default(null), formatId: fields.formatId.default(null),
  dancerIds: fields.dancerIds.default([]),
});
export const UpdatePerformanceBodySchema = z.strictObject({ ...z.object(fields).partial().shape, expectedRevision: z.int().positive() }).refine(
  (body) => Object.keys(body).some((key) => key !== "expectedRevision"),
  { message: "At least one performance field is required", params: { reason: "nonemptyPatch" } },
);
export const PerformanceSchema = z.strictObject({
  archived: z.boolean().default(false),
  teacher: z.string().nullable().default(null), author: z.string().nullable().default(null),
  revision: z.int().positive(),
  id: IdSchema, eventId: IdSchema, studioId: IdSchema, registrationId: IdSchema, title: z.string().nullable(), durationSec: z.number().int().nullable(),
  orderOnStage: z.number().int().nullable(), categoryId: IdSchema.nullable(), ageGroupId: IdSchema.nullable(), formatId: IdSchema.nullable(),
  participants: z.array(z.strictObject({ dancerId: IdSchema, dancer: DancerSchema })),
});
export const PerformancesSchema = z.array(PerformanceSchema);
export const PerformanceDeleteQuerySchema = z.strictObject({ expectedRevision: z.coerce.number().int().positive() });
const snapshotConfiguration = z.strictObject({
  category: z.strictObject({ id: IdSchema, name: z.string() }).nullable(),
  ageGroup: z.strictObject({ id: IdSchema, name: z.string(), minAge: z.int(), maxAge: z.int().nullable() }).nullable(),
  format: z.strictObject({ id: IdSchema, name: z.string(), minParticipants: z.int(), maxParticipants: z.int().nullable(), maxDurationSeconds: z.int() }).nullable(),
});
export const PerformanceSnapshotSchema = z.strictObject({
  teacher: z.string().nullable().optional(), author: z.string().nullable().optional(),
  policyVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]), eventId: IdSchema, studioId: IdSchema, registrationId: IdSchema,
  studioName: z.string(), title: z.string().nullable(), durationSec: z.int().nullable(), orderOnStage: z.int().nullable(),
  timeZone: z.string(), ageDate: z.iso.date(), configuration: snapshotConfiguration,
  participants: z.array(z.strictObject({ dancerId: IdSchema, firstName: z.string(), lastName: z.string(), birthDate: z.iso.date() })),
  archived: z.boolean(),
});
export const PerformanceRevisionSchema = z.strictObject({
  revision: z.int().positive(), origin: z.enum(["LEGACY_BASELINE", "CREATE", "EDIT", "ARCHIVE", "RESTORE", "CHECKPOINT"]),
  capturedAt: z.iso.datetime(), actorKind: z.enum(["USER", "MIGRATION"]), snapshot: PerformanceSnapshotSchema,
});
export const PerformanceHistorySchema = z.array(PerformanceRevisionSchema);
export type PerformanceRevision = z.infer<typeof PerformanceRevisionSchema>;
export type Performance = z.infer<typeof PerformanceSchema>;
export type CreatePerformanceInput = z.input<typeof CreatePerformanceBodySchema>;
export type UpdatePerformanceInput = z.input<typeof UpdatePerformanceBodySchema>;

// Presence only: this is not eligibility validation or submission acknowledgement.
export function performanceMissingFields(performance: Pick<Performance, "title" | "durationSec" | "categoryId" | "ageGroupId" | "formatId" | "participants">) {
  const missing: ("title" | "durationSec" | "categoryId" | "ageGroupId" | "formatId" | "participants")[] = [];
  for (const key of ["title", "durationSec", "categoryId", "ageGroupId", "formatId"] as const) {
    if (performance[key] === null) missing.push(key);
  }
  if (performance.participants.length === 0) missing.push("participants");
  return missing;
}
