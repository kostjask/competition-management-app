import { z } from "zod";
import { IdSchema } from "./common.schema.js";
import { EventStageSchema, EventTimeZoneSchema } from "./event.schema.js";
import { ScoringCalculationSchema, ScoringDecimalSchema } from "./scoring.schema.js";

const source = ScoringCalculationSchema.shape.source;
const revision = z.int().positive().max(2147483647);
const groupLabel = z.strictObject({ id: IdSchema, name: z.string() });
const resultEntry = z.strictObject({
  performanceId: IdSchema,
  title: z.string().nullable(),
  state: z.enum(["PENDING", "RANKABLE", "DISQUALIFIED", "WITHDRAWN"]),
  submitted: z.int().nonnegative(),
  required: z.int().nonnegative(),
  calculationSource: source.nullable(),
  total: ScoringCalculationSchema.shape.total,
  deduction: ScoringDecimalSchema.nullable(),
  rank: z.int().positive().nullable(),
});
const group = z.strictObject({
  id: source,
  category: groupLabel,
  ageGroup: groupLabel,
  format: groupLabel,
  entries: z.array(resultEntry),
});
export const ResultsSnapshotSchema = z.strictObject({
  policy: z.literal("normalized-v1"),
  eventName: z.string(),
  timeZone: EventTimeZoneSchema,
  groups: z.array(group),
  ungrouped: z.array(resultEntry),
  blockers: z.array(z.strictObject({
    kind: z.enum(["EMPTY", "GROUP", "QUEUE", "SHEETS", "SCORING"]),
    performanceId: IdSchema.nullable(),
    title: z.string().nullable(),
  })),
});
const summary = z.strictObject({ revision, source, createdAt: z.iso.datetime() });
const saved = summary.extend({ snapshot: ResultsSnapshotSchema });
export const ResultsCommandSchema = z.strictObject({
  operationId: z.uuid(),
  action: z.enum(["CALCULATE", "FINALIZE"]),
  expectedRevision: z.int().nonnegative().max(2147483647),
  source,
});
export const ResultsReceiptSchema = z.strictObject({
  operationId: z.uuid(),
  action: ResultsCommandSchema.shape.action,
  revision,
  createdAt: z.iso.datetime(),
});
export const ResultsQuerySchema = z.strictObject({
  operationId: z.uuid().optional(),
  revision: z.string().regex(/^[1-9]\d{0,9}$/).transform(Number).pipe(revision).optional(),
});
export const ResultsWorkspaceSchema = z.strictObject({
  eventId: IdSchema,
  eventName: z.string(),
  stage: EventStageSchema,
  current: z.strictObject({ source, snapshot: ResultsSnapshotSchema }).nullable(),
  saved: saved.nullable(),
  revisions: z.array(summary),
  finalized: z.strictObject({ revision, createdAt: z.iso.datetime() }).nullable(),
  receipt: ResultsReceiptSchema.nullable(),
});
export type ResultsCommand = z.infer<typeof ResultsCommandSchema>;
export type ResultsQuery = z.infer<typeof ResultsQuerySchema>;
export type ResultsReceipt = z.infer<typeof ResultsReceiptSchema>;
export type ResultsSnapshot = z.infer<typeof ResultsSnapshotSchema>;
export type ResultsWorkspace = z.infer<typeof ResultsWorkspaceSchema>;
