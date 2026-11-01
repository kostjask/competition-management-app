import { z } from "zod";
import { AuthResponseSchema, AuthUserSchema, RegisterSchema } from "./auth.schema.js";
import { EmailSchema, IdSchema } from "./common.schema.js";
import { RecipientLocaleSchema } from "./onboarding.schema.js";

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
  roleKey: z.enum(["judge", "moderator"]),
  eventId: IdSchema,
  locale: RecipientLocaleSchema.optional(),
});

const InvitationSecretSchema = z.string().min(1, "Token is required");
export const AcceptInvitationSchema = z.union([
  z.strictObject({ token: InvitationSecretSchema }),
  z.strictObject({ token: InvitationSecretSchema, name: RegisterSchema.shape.name, password: RegisterSchema.shape.password }),
]);

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
export const CreateInvitationResponseSchema = z.strictObject({ message: z.string(), messageId: z.literal("invitationCreated"), invitationId: IdSchema, delivery: z.literal("unconfirmed") });
const AcceptanceMessageSchema = z.strictObject({ message: z.string(), messageId: z.literal("invitationAccepted") });
export const AcceptInvitationResponseSchema = z.union([
  AuthResponseSchema.extend({ ...AcceptanceMessageSchema.shape, accountCreated: z.literal(true) }),
  AcceptanceMessageSchema.extend({ user: AuthUserSchema, accountCreated: z.literal(false) }),
]);
export type Invitation = z.infer<typeof InvitationSchema>;
export type InvitationPreview = z.infer<typeof InvitationPreviewSchema>;
export type CreateInvitationResponse = z.infer<typeof CreateInvitationResponseSchema>;
