import { z } from "zod";
import { AuthResponseSchema } from "./auth.schema.js";
import { EmailSchema, IdSchema } from "./common.schema.js";

/**
 * Role key validation.
 * Roles are defined in the database (Role table), not hardcoded here.
 * This accepts any non-empty string that matches the role.key pattern.
 */
export const RoleKeySchema = z
  .string()
  .min(1, "Role key is required")
  .regex(/^[a-z_]+$/, "Role key must be lowercase letters and underscores only");

export const CreateInvitationSchema = z.strictObject({
  email: EmailSchema,
  roleKey: RoleKeySchema,
  eventId: IdSchema.optional(),
});

export const AcceptInvitationSchema = z.strictObject({
  token: z.string().min(1, "Token is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;
export type RoleKey = z.infer<typeof RoleKeySchema>;

export const InvitationTokenParamsSchema = z.object({ token: z.string().min(1) });
const EventSummarySchema = z.strictObject({ id: IdSchema, name: z.string() });
export const InvitationSchema = z.strictObject({
  id: IdSchema, email: EmailSchema, roleKey: RoleKeySchema, eventId: IdSchema.nullable(),
  createdAt: z.iso.datetime(), expiresAt: z.iso.datetime(), usedAt: z.iso.datetime().nullable(),
});
export const InvitationsSchema = z.array(InvitationSchema);
export const InvitationPreviewSchema = z.strictObject({ email: EmailSchema, roleKey: RoleKeySchema, event: EventSummarySchema.nullable(), expiresAt: z.iso.datetime() });
export const CreateInvitationResponseSchema = z.strictObject({ message: z.string(), messageId: z.literal("invitationSent"), invitationId: IdSchema });
export const AcceptInvitationResponseSchema = AuthResponseSchema.extend({ message: z.string(), messageId: z.literal("invitationAccepted") });
export type Invitation = z.infer<typeof InvitationSchema>;
export type InvitationPreview = z.infer<typeof InvitationPreviewSchema>;
export type CreateInvitationResponse = z.infer<typeof CreateInvitationResponseSchema>;
