import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const AuditActionSchema = z.enum([
  "ACCOUNT_REGISTERED", "EMAIL_VERIFIED", "EMAIL_CORRECTED", "PASSWORD_RESET",
  "TOKEN_ROTATED", "INVITATION_CREATED", "INVITATION_ACCEPTED", "INVITATION_REVOKED",
  "INVITATION_ROTATED", "ACCESS_GRANTED", "ACCESS_RECONCILED", "ACCESS_REMOVED", "STUDIO_APPROVAL_CHANGED", "REGISTRATION_APPROVAL_CHANGED",
]);
export const AuditActorSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("USER"), userId: IdSchema }),
  z.strictObject({ kind: z.literal("SYSTEM") }), z.strictObject({ kind: z.literal("ANONYMOUS") }),
]);
export const AuditMetadataSchema = z.strictObject({
  roleKey: z.enum(["admin", "representative", "judge", "moderator"]).optional(),
  purpose: z.enum(["VERIFY_EMAIL", "PASSWORD_RECOVERY"]).optional(),
  fromStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "LOCKED"]).optional(),
  toStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "LOCKED"]).optional(),
});
export const AuditRecordSchema = z.strictObject({
  action: AuditActionSchema, actor: AuditActorSchema,
  targetType: z.enum(["USER", "INVITATION", "USER_ROLE", "STUDIO", "REGISTRATION"]),
  targetId: IdSchema, eventId: IdSchema.nullable().optional(), studioId: IdSchema.nullable().optional(),
  metadata: AuditMetadataSchema.default({}),
});
export type AuditActor = z.infer<typeof AuditActorSchema>;
export type AuditRecord = z.input<typeof AuditRecordSchema>;
