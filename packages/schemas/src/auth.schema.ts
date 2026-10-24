import { z } from "zod";
import { EmailSchema, IdSchema } from "./common.schema.js";

export const RegisterSchema = z.strictObject({
  email: EmailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
});

export const LoginSchema = z.strictObject({
  email: EmailSchema,
  password: z.string().min(1, "Password is required"),
});

export const VerifyEmailSchema = z.strictObject({
  token: z.string().min(1, "Verification token is required"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export const AuthUserSchema = z.strictObject({ id: IdSchema, email: EmailSchema, name: z.string() });
export const RegisterResponseSchema = z.strictObject({ message: z.string(), userId: IdSchema });
export const AuthResponseSchema = z.strictObject({
  token: z.string().min(1), tokenType: z.literal("Bearer"), user: AuthUserSchema,
});
export const VerifyEmailResponseSchema = AuthResponseSchema.extend({ message: z.string() });
export const UserProfileSchema = AuthUserSchema.extend({
  createdAt: z.iso.datetime(), isAdmin: z.boolean(),
  roles: z.array(z.strictObject({
    id: IdSchema, eventId: IdSchema.nullable(),
    role: z.strictObject({ id: IdSchema, key: z.string().min(1), name: z.string() }),
    event: z.strictObject({ id: IdSchema, name: z.string() }).nullable(),
  })),
});
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type VerifyEmailResponse = z.infer<typeof VerifyEmailResponseSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
