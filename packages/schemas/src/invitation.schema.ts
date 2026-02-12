import { z } from "zod";
import { EmailSchema, IdSchema } from "./common.schema.js";

export const RoleKeySchema = z.enum(["representative", "judge", "moderator"]);

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
