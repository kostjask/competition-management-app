import { z } from "zod";
import { IdSchema } from "./common.schema.js";
import { PerformanceSnapshotSchema } from "./performance.schema.js";
import { CreateCategoryBodySchema } from "./category.schema.js";
import { CreateAgeGroupBodySchema } from "./age-group.schema.js";
import { CreateFormatBodySchema } from "./format.schema.js";

export const EntryKindSchema = z.enum(["BASIC", "FINAL"]);
export const EntryFieldSchema = z.enum(["title", "categoryId", "ageGroupId", "formatId", "durationSec", "teacher", "author", "participants", "roster", "entries"]);
const windowSchema = z.strictObject({ enabled: z.boolean(), deadline: z.iso.datetime({ offset: true }).nullable() });
export const EntrySettingsSchema = z.strictObject({
  basic: windowSchema, final: windowSchema,
  allowYounger: z.boolean(), olderPercent: z.int().min(0).max(100),
  requireTeacher: z.boolean(), requireAuthor: z.boolean(),
  nominations: z.array(z.strictObject({ categoryId: IdSchema, ageGroupId: IdSchema, formatId: IdSchema,
    maxDurationSeconds: z.int().positive().max(2147483647), maxParticipants: z.int().positive().max(2147483647).nullable(),
  })).max(2000),
}).refine(value => new Set(value.nominations.map(row => JSON.stringify([row.categoryId, row.ageGroupId, row.formatId]))).size === value.nominations.length,
{ message: "Nomination combinations must be unique" });
export const EntryConfigurationSchema = z.strictObject({ revision: z.int().nonnegative(), frozen: z.boolean(), settings: EntrySettingsSchema.nullable() });
export const EntryOptionsSchema = z.strictObject({
  categories: z.array(CreateCategoryBodySchema.extend({ id: IdSchema, name: z.string().trim().min(1).max(500) })).max(100),
  ages: z.array(CreateAgeGroupBodySchema.safeExtend({ id: IdSchema, name: z.string().trim().min(1).max(500) })).max(100),
  formats: z.array(CreateFormatBodySchema.safeExtend({ id: IdSchema })).max(100),
}).refine(value => [value.categories, value.ages, value.formats].every(rows => new Set(rows.map(row => row.id)).size === rows.length), { message: "Option IDs must be unique" });
export const EntryConfigurationBodySchema = z.strictObject({ expectedRevision: z.int().nonnegative(), settings: EntrySettingsSchema, options: EntryOptionsSchema.optional() });
export type EntryOptions = z.infer<typeof EntryOptionsSchema>;
export type EntryConfigurationInput = z.infer<typeof EntryConfigurationBodySchema>;
export const EntryParamsSchema = z.object({ eventId: IdSchema, studioId: IdSchema });
export const EntryCheckpointParamsSchema = EntryParamsSchema.extend({ kind: EntryKindSchema });
export const EntryGrantSchema = z.strictObject({ fields: z.array(EntryFieldSchema).min(1).max(11).refine(values => new Set(values).size === values.length),
  performanceIds: z.array(IdSchema).max(1000).nullable(), until: z.iso.datetime({ offset: true }),
});
export const EntryIssueSchema = z.strictObject({ performanceId: IdSchema.nullable(), field: EntryFieldSchema, reason: z.enum(["required", "configuration", "participants", "birthDate", "age", "count", "duration"]) });
export const EntryManifestSchema = z.strictObject({
  settings: EntrySettingsSchema,
  entries: z.array(z.strictObject({ id: IdSchema, revision: z.int().positive(), snapshot: PerformanceSnapshotSchema })),
  roster: z.array(z.strictObject({ id: IdSchema, firstName: z.string(), lastName: z.string(), birthDate: z.iso.date() })),
});
export const EntryReceiptSchema = z.strictObject({ id: IdSchema, revision: z.int().positive(), kind: EntryKindSchema,
  action: z.enum(["SUBMIT", "ACCEPT", "REOPEN"]), createdAt: z.iso.datetime(), actorKind: z.literal("USER"),
  reason: z.string().nullable(), visible: z.boolean(), manifest: EntryManifestSchema,
});
export const EntryCheckpointSchema = z.strictObject({ kind: EntryKindSchema, revision: z.int().nonnegative(),
  status: z.enum(["DRAFT", "REVIEW_PENDING", "ACCEPTED", "REQUIRES_CHANGES"]), enabled: z.boolean(),
  locked: z.boolean(), deadline: z.iso.datetime({ offset: true }).nullable(), grant: EntryGrantSchema.nullable(),
  issues: z.array(EntryIssueSchema), receipts: z.array(EntryReceiptSchema),
});
export const EntryReviewSchema = z.strictObject({ studioId: IdSchema, checkpoints: z.array(EntryCheckpointSchema) });
export const EntryCommandSchema = z.strictObject({ expectedRevision: z.int().nonnegative(), operationId: z.uuid(),
  action: z.enum(["SUBMIT", "ACCEPT", "REOPEN"]),
  reason: z.string().trim().min(1).max(1000).optional(), visible: z.boolean().default(false),
  grant: EntryGrantSchema.optional(), exception: z.boolean().default(false),
}).superRefine((value, ctx) => {
  if ((value.action === "REOPEN" || value.exception) && !value.reason) ctx.addIssue({ code: "custom", path: ["reason"], message: "A reason is required" });
  if ((value.action === "REOPEN") !== (value.grant !== undefined)) ctx.addIssue({ code: "custom", path: ["grant"], message: "Only reopening requires a field scope and deadline" });
});
export type EntrySettings = z.infer<typeof EntrySettingsSchema>;
export type EntryKind = z.infer<typeof EntryKindSchema>;
export type EntryField = z.infer<typeof EntryFieldSchema>;
export type EntryGrant = z.infer<typeof EntryGrantSchema>;
export type EntryIssue = z.infer<typeof EntryIssueSchema>;
export type EntryManifest = z.infer<typeof EntryManifestSchema>;
export type EntryCommand = z.input<typeof EntryCommandSchema>;
export const BASIC_ENTRY_FIELDS: readonly EntryField[] = ["title", "categoryId", "ageGroupId", "formatId", "entries"];
export const FINAL_ENTRY_FIELDS: readonly EntryField[] = ["durationSec", "teacher", "author", "participants", "roster", "entries"];
