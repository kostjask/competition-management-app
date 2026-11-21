import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const ScoringDecimalSchema = z.string().regex(/^(?:0|[1-9]\d{0,3})(?:\.\d{1,3})?$/).refine(value => Number(value) <= 1000);
export const scoringUnits = (value: string): number => {
  const [whole, fraction = ""] = ScoringDecimalSchema.parse(value).split(".");
  return Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
};
export const scoringDecimal = (units: number): string => `${Math.floor(units / 1000)}.${String(units % 1000).padStart(3, "0")}`;
export const scoreFitsRange = (value: number, min: number, max: number, step: number): boolean =>
  value >= min && value <= max && (value - min) % step === 0;
const Revision = z.int().min(0).max(2147483646);
const Text = z.string().trim().min(1).max(200);
export const ScoringLocalesSchema = z.strictObject({ et: Text, en: Text, ru: Text });
const Instructions = z.strictObject({ et: z.string().trim().max(1000), en: z.string().trim().max(1000), ru: z.string().trim().max(1000) });
export const ScoringCriterionInputSchema = z.strictObject({ id: z.uuid(), label: ScoringLocalesSchema, instructions: Instructions,
  min: ScoringDecimalSchema, max: ScoringDecimalSchema, step: ScoringDecimalSchema, weightBps: z.int().min(1).max(10000) }).superRefine((row, ctx) => {
    if (![row.min, row.max, row.step].every(value => ScoringDecimalSchema.safeParse(value).success)) return;
    const min = scoringUnits(row.min), max = scoringUnits(row.max), step = scoringUnits(row.step);
    if (max <= min) ctx.addIssue({ code: "custom", path: ["max"], message: "Maximum must exceed minimum" });
    if (step <= 0 || (max - min) % step !== 0) ctx.addIssue({ code: "custom", path: ["step"], message: "Step must reach the maximum exactly" });
  });
export const ScoringTemplateInputSchema = z.strictObject({ id: z.uuid(), name: Text, criteria: z.array(ScoringCriterionInputSchema).min(1).max(30) }).superRefine((row, ctx) => {
  if (row.criteria.reduce((sum, c) => sum + c.weightBps, 0) !== 10000) ctx.addIssue({ code: "custom", path: ["criteria"], message: "Weights must total 100%" });
  if (new Set(row.criteria.map(c => c.id)).size !== row.criteria.length) ctx.addIssue({ code: "custom", path: ["criteria"], message: "Duplicate criterion" });
});
export const ScoringSetupInputSchema = z.strictObject({
  templates: z.array(ScoringTemplateInputSchema).max(100),
  bindings: z.array(z.strictObject({ categoryId: IdSchema, templateId: z.uuid() })).max(200),
  panels: z.array(z.strictObject({ sessionId: z.uuid(), judgeIds: z.array(IdSchema).min(1).max(30) })).max(100),
}).superRefine((row, ctx) => {
  for (const [key, ids] of [["templates", row.templates.map(t => t.id)], ["bindings", row.bindings.map(b => b.categoryId)], ["panels", row.panels.map(p => p.sessionId)]] as const)
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: [key], message: "Duplicate identity" });
  for (const panel of row.panels) if (new Set(panel.judgeIds).size !== panel.judgeIds.length) ctx.addIssue({ code: "custom", path: ["panels"], message: "Duplicate judge" });
});
const base = { operationId: z.uuid(), expectedRevision: Revision };
const Reason = z.string().trim().min(1).max(500);
export const ScoringPreviewBodySchema = z.strictObject({ expectedRevision: Revision, setup: ScoringSetupInputSchema });
export const ScoringValuesSchema = z.array(z.strictObject({ criterionId: z.uuid(), value: ScoringDecimalSchema, comment: z.string().trim().max(1000).nullable() })).max(30);
export const JudgeScoringCommandSchema = z.strictObject({ ...base, action: z.enum(["DRAFT", "SUBMIT"]), sheetId: z.uuid(), values: ScoringValuesSchema });
export const ScoringCommandSchema = z.discriminatedUnion("action", [
  z.strictObject({ ...base, action: z.literal("CONFIGURE"), setup: ScoringSetupInputSchema, previewToken: z.string().regex(/^[a-f0-9]{64}$/) }),
  JudgeScoringCommandSchema,
  z.strictObject({ ...base, action: z.literal("REOPEN"), sheetId: z.uuid(), reason: Reason }),
  z.strictObject({ ...base, action: z.literal("ADJUST"), recordId: z.uuid(), penalty: ScoringDecimalSchema.refine(v => Number(v) <= 100), disqualified: z.boolean(), reason: Reason }),
  z.strictObject({ ...base, action: z.literal("CALCULATE"), recordId: z.uuid() }),
]);
export const ScoringSheetSchema = z.strictObject({ id: z.uuid(), recordId: z.uuid(), performanceId: IdSchema, title: z.string().nullable(), judgeId: IdSchema,
  templateId: z.uuid(), revision: z.int().positive(), state: z.enum(["DRAFT", "LOCKED"]), submittedAt: z.iso.datetime().nullable(), values: ScoringValuesSchema });
export const JudgeScoringQuerySchema = z.strictObject({ operationId: z.uuid().optional() });
export const JudgeScoringSheetSchema = ScoringSheetSchema.omit({ recordId: true, judgeId: true, templateId: true }).extend({
  sessionName: z.string(), stageName: z.string(), current: z.boolean(), writable: z.boolean(), reopenReason: Reason.nullable(),
  savedAt: z.iso.datetime(), rubric: ScoringTemplateInputSchema,
});
export const JudgeScoringAckSchema = z.strictObject({
  operationId: z.uuid(), action: z.enum(["DRAFT", "SUBMIT"]), sheetId: z.uuid(), revision: z.int().positive(), createdAt: z.iso.datetime(),
});
export const JudgeScoringWorkspaceSchema = z.strictObject({
  eventId: IdSchema, eventName: z.string(), sheets: z.array(JudgeScoringSheetSchema), acknowledgement: JudgeScoringAckSchema.nullable(),
});
export const ScoringBlockerSchema = z.strictObject({ kind: z.enum(["NO_QUEUE", "TEMPLATE", "PANEL", "JUDGE", "SHEETS"]), targetId: IdSchema });
export const ScoringWorkspaceSchema = z.strictObject({ eventId: IdSchema, eventName: z.string(), eventStage: z.string(), revision: Revision, organizer: z.boolean(),
  setup: ScoringSetupInputSchema, categories: z.array(z.strictObject({ id: IdSchema, name: z.string() })),
  sessions: z.array(z.strictObject({ id: z.uuid(), name: z.string(), state: z.string() })), judges: z.array(z.strictObject({ id: IdSchema, name: z.string(), eligible: z.boolean() })),
  blockers: z.array(ScoringBlockerSchema), sheets: z.array(ScoringSheetSchema),
  completion: z.array(z.strictObject({ recordId: z.uuid(), performanceId: IdSchema, required: z.int().positive(), submitted: z.int().nonnegative() })),
  receipts: z.array(z.strictObject({ operationId: z.uuid(), revision: z.int().positive(), action: z.string(), createdAt: z.iso.datetime() })) });
export const ScoringPreviewSchema = z.strictObject({ revision: Revision, setup: ScoringSetupInputSchema, previewToken: z.string(), blockers: z.array(ScoringBlockerSchema) });
export const ScoringCalculationSchema = z.strictObject({ policy: z.literal("normalized-v1"), source: z.string().regex(/^[a-f0-9]{64}$/),
  total: z.string().regex(/^(?:0|[1-9]\d?|100)\.\d{3}$/).refine(value => Number(value) <= 100).nullable(), disqualified: z.boolean()
}).refine(value => value.disqualified === (value.total === null));
export const ScoringReceiptSchema = z.strictObject({ operationId: z.uuid(), revision: z.int().positive(), action: z.string(), workspace: ScoringWorkspaceSchema, calculation: ScoringCalculationSchema.nullable() });
export type ScoringSetupInput = z.infer<typeof ScoringSetupInputSchema>;
export type ScoringCommand = z.infer<typeof ScoringCommandSchema>;
export type ScoringWorkspace = z.infer<typeof ScoringWorkspaceSchema>;
export type ScoringPreview = z.infer<typeof ScoringPreviewSchema>;
export type ScoringValues = z.infer<typeof ScoringValuesSchema>;
export type JudgeScoringCommand = z.infer<typeof JudgeScoringCommandSchema>;
export type JudgeScoringWorkspace = z.infer<typeof JudgeScoringWorkspaceSchema>;
export type JudgeScoringSheet = z.infer<typeof JudgeScoringSheetSchema>;
export type JudgeScoringAck = z.infer<typeof JudgeScoringAckSchema>;
