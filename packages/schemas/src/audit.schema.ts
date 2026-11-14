import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const AuditActionSchema = z.enum([
  "ENTRY_CONFIGURED", "ENTRY_SUBMITTED", "ENTRY_ACCEPTED", "ENTRY_REOPENED",
  "PERFORMANCE_CREATED", "PERFORMANCE_UPDATED", "PERFORMANCE_ARCHIVED", "PERFORMANCE_RESTORED",
  "EVENT_UPDATED", "REGISTRATION_CREATED", "REGISTRATION_CORRECTED", "REGISTRATION_CANCELLED", "REGISTRATION_REAPPLIED",
  "ONBOARDING_SAVED", "ONBOARDING_CANCELLED", "SESSION_REVOKED", "IMAGE_REPLACED", "ACCOUNT_REGISTERED", "EMAIL_VERIFIED", "EMAIL_CORRECTED", "PASSWORD_RESET",
  "TOKEN_ROTATED", "INVITATION_CREATED", "INVITATION_ACCEPTED", "INVITATION_REVOKED",
  "INVITATION_ROTATED", "ACCESS_GRANTED", "ACCESS_RECONCILED", "ACCESS_REMOVED", "STUDIO_APPROVAL_CHANGED", "REGISTRATION_APPROVAL_CHANGED",
]);
export const AuditActorSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("USER"), userId: IdSchema }),
  z.strictObject({ kind: z.literal("SYSTEM") }), z.strictObject({ kind: z.literal("ANONYMOUS") }),
]);
export const AuditMetadataSchema = z.strictObject({
  revision: z.int().positive().optional(),
  reasonCode: z.enum(["CONTACT_ORGANIZER", "INCOMPLETE_DETAILS", "INELIGIBLE", "CAPACITY"]).nullable().optional(),
  reviewAllowed: z.boolean().optional(),
  fromStage: z.enum(["PRE_REGISTRATION", "REGISTRATION_OPEN", "DATA_REVIEW", "FINALIZED", "ENDED", "CANCELLED"]).optional(),
  toStage: z.enum(["PRE_REGISTRATION", "REGISTRATION_OPEN", "DATA_REVIEW", "FINALIZED", "ENDED", "CANCELLED"]).optional(),
  roleKey: z.enum(["admin", "representative", "judge", "moderator"]).optional(),
  purpose: z.enum(["VERIFY_EMAIL", "PASSWORD_RECOVERY"]).optional(),
  fromStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "LOCKED", "CANCELLED"]).optional(),
  toStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "LOCKED", "CANCELLED"]).optional(),
});
export const AuditRecordSchema = z.strictObject({
  action: AuditActionSchema, actor: AuditActorSchema,
  targetType: z.enum(["EVENT", "DANCER", "USER", "INVITATION", "USER_ROLE", "STUDIO", "REGISTRATION", "PERFORMANCE", "ENTRY_CHECKPOINT"]),
  targetId: IdSchema, eventId: IdSchema.nullable().optional(), studioId: IdSchema.nullable().optional(),
  metadata: AuditMetadataSchema.default({}),
});
export type AuditActor = z.infer<typeof AuditActorSchema>;
export type AuditRecord = z.input<typeof AuditRecordSchema>;
