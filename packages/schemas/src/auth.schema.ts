import { z } from "zod";
import { EmailSchema, IdSchema } from "./common.schema.js";
import { RecipientLocaleSchema } from "./onboarding.schema.js";

const NewPasswordSchema = z.string().min(8, "Password must be at least 8 characters")
  .refine(value => new TextEncoder().encode(value).length <= 72, "Password must be at most 72 UTF-8 bytes");
export const RegisterSchema = z.strictObject({
  email: EmailSchema,
  password: NewPasswordSchema,
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  locale: RecipientLocaleSchema.optional(),
});

export const LoginSchema = z.strictObject({
  email: EmailSchema,
  password: z.string().min(1, "Password is required"),
});

export const VerifyEmailSchema = z.strictObject({
  token: z.string().min(1, "Verification token is required"),
});

export const ResendVerificationSchema = z.strictObject({ email: EmailSchema });
export const RequestPasswordResetSchema = z.strictObject({ email: EmailSchema });
export const CorrectEmailSchema = z.strictObject({
  email: EmailSchema, password: LoginSchema.shape.password, newEmail: EmailSchema,
});
export const ResetPasswordSchema = z.strictObject({ token: VerifyEmailSchema.shape.token, password: RegisterSchema.shape.password });
export const AuthRequestAcceptedSchema = z.strictObject({ messageId: z.literal("authRequestAccepted"), delivery: z.literal("unconfirmed") });
export const ResetPasswordResponseSchema = z.strictObject({ messageId: z.literal("passwordReset") });
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;
export type CorrectEmailInput = z.infer<typeof CorrectEmailSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type AuthRequestAccepted = z.infer<typeof AuthRequestAcceptedSchema>;
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponseSchema>;

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export const AuthUserSchema = z.strictObject({ id: IdSchema, email: EmailSchema, name: z.string() });
export const RegisterResponseSchema = z.strictObject({ message: z.string(), messageId: z.literal("registered"), userId: IdSchema, delivery: z.literal("unconfirmed") });
export const AuthResponseSchema = z.strictObject({
  token: z.string().min(1), tokenType: z.literal("Bearer"), user: AuthUserSchema,
});
export const VerifyEmailResponseSchema = AuthResponseSchema.extend({ message: z.string(), messageId: z.literal("emailVerified") });
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
