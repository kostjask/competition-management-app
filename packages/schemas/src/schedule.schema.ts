import { z } from "zod";
import { IdSchema } from "./common.schema.js";

const Name = z.string().trim().min(1).max(200);
const Revision = z.int().nonnegative().max(2147483646);
export const QueueStateSchema = z.enum(["PAUSED", "RUNNING", "FINISHED"]);
export const SlotStateSchema = z.enum(["WAITING", "CURRENT", "DONE", "SKIPPED", "REMOVED"]);
export const ScheduleQueuesSchema = z.array(z.strictObject({ sessionId: z.uuid(), performanceIds: z.array(IdSchema).max(2000) })).max(100);
export const SchedulePreviewBodySchema = z.strictObject({ expectedRevision: Revision, queues: ScheduleQueuesSchema });
const sessionFields = { stageId: z.uuid(), name: Name, startsAt: z.iso.datetime({ offset: true }), bufferSec: z.int().min(0).max(3600), restSec: z.int().min(0).max(86400), moderatorId: IdSchema.nullable() };
const base = { expectedRevision: Revision, operationId: z.uuid() };
export const ScheduleCommandSchema = z.discriminatedUnion("action", [
  z.strictObject({ ...base, action: z.literal("CREATE_STAGE"), id: z.uuid(), name: Name }),
  z.strictObject({ ...base, action: z.literal("CREATE_SESSION"), id: z.uuid(), ...sessionFields }),
  z.strictObject({ ...base, action: z.literal("UPDATE_SESSION"), id: z.uuid(), ...sessionFields }),
  z.strictObject({ ...base, action: z.literal("SAVE"), queues: ScheduleQueuesSchema, previewToken: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.strictObject({ ...base, action: z.enum(["START", "PAUSE", "ADVANCE"]), sessionId: z.uuid(), expectedSlotId: z.uuid().nullable() }),
  z.strictObject({ ...base, action: z.enum(["SKIP", "REOPEN"]), sessionId: z.uuid(), expectedSlotId: z.uuid().nullable(), reason: z.string().trim().min(1).max(500) }),
  z.strictObject({ ...base, action: z.literal("ADVANCE_OVERRIDE"), sessionId: z.uuid(), expectedSlotId: z.uuid().nullable(), reason: z.string().trim().min(1).max(500) }),
  z.strictObject({ ...base, action: z.literal("REQUEUE"), sessionId: z.uuid(), expectedSlotId: z.uuid().nullable(), targetSlotId: z.uuid(), reason: z.string().trim().min(1).max(500) }),
]);
export const SchedulePerformanceSchema = z.strictObject({ id: IdSchema, title: z.string().nullable(), studioName: z.string(), revision: z.int().positive(), durationSec: z.int().positive().nullable(), legacyOrder: z.int().positive().nullable(), eligible: z.boolean() });
export const ScheduleSessionSchema = z.strictObject({ id: z.uuid(), ...sessionFields, startsAt: z.iso.datetime(), state: QueueStateSchema,
  slots: z.array(z.strictObject({ id: z.uuid(), performanceId: IdSchema, position: z.int().positive().nullable(), state: SlotStateSchema, reason: z.string().nullable() })) });
export const ScheduleWorkspaceSchema = z.strictObject({ eventId: IdSchema, eventName: z.string(), eventStage: z.string(), timeZone: z.string(), revision: Revision, organizer: z.boolean(),
  stages: z.array(z.strictObject({ id: z.uuid(), name: z.string() })), sessions: z.array(ScheduleSessionSchema), performances: z.array(SchedulePerformanceSchema),
  moderators: z.array(z.strictObject({ id: IdSchema, name: z.string() })),
  receipts: z.array(z.strictObject({ operationId: z.uuid(), revision: z.int().positive(), action: z.string(), createdAt: z.iso.datetime() })) });
export const ScheduleConflictSchema = z.strictObject({ kind: z.enum(["ENTRY", "DANCER", "STAGE", "WINDOW", "LOCKED"]), performanceIds: z.array(IdSchema), sessionIds: z.array(z.uuid()) });
export const SchedulePreviewSchema = z.strictObject({ revision: Revision, previewToken: z.string(), queues: ScheduleQueuesSchema, conflicts: z.array(ScheduleConflictSchema),
  times: z.array(z.strictObject({ performanceId: IdSchema, sessionId: z.uuid(), startsAt: z.iso.datetime(), endsAt: z.iso.datetime() })) });
export const ScheduleReceiptSchema = z.strictObject({ operationId: z.uuid(), revision: z.int().positive(), action: z.string(), workspace: ScheduleWorkspaceSchema });
export type ScheduleCommand = z.infer<typeof ScheduleCommandSchema>;
export type ScheduleWorkspace = z.infer<typeof ScheduleWorkspaceSchema>;
export type ScheduleQueues = z.infer<typeof ScheduleQueuesSchema>;
export type SchedulePreview = z.infer<typeof SchedulePreviewSchema>;
export type ScheduleReceipt = z.infer<typeof ScheduleReceiptSchema>;
