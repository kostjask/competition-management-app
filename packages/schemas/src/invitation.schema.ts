import { z } from "zod";
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

export const CreateInvitationSchema = z.object({
  email: EmailSchema,
  roleKey: RoleKeySchema,
  eventId: IdSchema.optional(),
});

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;
export type RoleKey = z.infer<typeof RoleKeySchema>;
