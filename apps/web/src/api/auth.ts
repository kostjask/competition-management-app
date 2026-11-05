import { decode } from "./client.js";
import {
  RegisterResponseSchema, BrowserSessionSchema, BrowserVerifyEmailResponseSchema, UserProfileSchema,
  type RegisterInput, type LoginInput, type VerifyEmailInput,
  type RegisterResponse, type UserProfile,
  ResendVerificationSchema, CorrectEmailSchema, RequestPasswordResetSchema, ResetPasswordSchema,
  AuthRequestAcceptedSchema, ResetPasswordResponseSchema,
  type ResendVerificationInput, type CorrectEmailInput, type RequestPasswordResetInput, type ResetPasswordInput,
} from "@dance/schemas";
import { apiClient } from "./client.js";

export type RegisterData = RegisterInput;
export type LoginData = LoginInput;
export type VerifyEmailData = VerifyEmailInput;
export type { RegisterResponse } from "@dance/schemas";

export const register = async (data: RegisterData): Promise<RegisterResponse> =>
  decode(RegisterResponseSchema, await apiClient.post<RegisterData>("/auth/register", data));

export const login = async (data: LoginData) =>
  decode(BrowserSessionSchema, await apiClient.post<LoginData>("/auth/login", data));

export const logout = async (): Promise<void> => { await apiClient.post("/auth/logout", {}); };

export const getCurrentUser = async (): Promise<UserProfile> =>
  decode(UserProfileSchema, await apiClient.get("/auth/profile"));

export const verifyEmail = async (data: VerifyEmailData) =>
  decode(BrowserVerifyEmailResponseSchema, await apiClient.post<VerifyEmailData>("/auth/verify-email", data));

export const resendVerification = async (data: ResendVerificationInput) =>
  decode(AuthRequestAcceptedSchema, await apiClient.post("/auth/resend-verification", ResendVerificationSchema.parse(data)));
export const correctEmail = async (data: CorrectEmailInput) =>
  decode(AuthRequestAcceptedSchema, await apiClient.post("/auth/correct-email", CorrectEmailSchema.parse(data)));
export const requestPasswordReset = async (data: RequestPasswordResetInput) =>
  decode(AuthRequestAcceptedSchema, await apiClient.post("/auth/request-password-reset", RequestPasswordResetSchema.parse(data)));
export const resetPassword = async (data: ResetPasswordInput) => {
  const result = decode(ResetPasswordResponseSchema, await apiClient.post("/auth/reset-password", ResetPasswordSchema.parse(data)));
  // Reset revokes sessions on the server; the next profile check reconciles state.
  return result;
};
