import { decode } from "./client.js";
import {
  RegisterResponseSchema, AuthResponseSchema, VerifyEmailResponseSchema, UserProfileSchema,
  type RegisterInput, type LoginInput, type VerifyEmailInput,
  type RegisterResponse, type AuthResponse, type VerifyEmailResponse, type UserProfile,
  ResendVerificationSchema, CorrectEmailSchema, RequestPasswordResetSchema, ResetPasswordSchema,
  AuthRequestAcceptedSchema, ResetPasswordResponseSchema,
  type ResendVerificationInput, type CorrectEmailInput, type RequestPasswordResetInput, type ResetPasswordInput,
} from "@dance/schemas";
import { apiClient, setToken, removeToken } from "./client.js";

export type RegisterData = RegisterInput;
export type LoginData = LoginInput;
export type VerifyEmailData = VerifyEmailInput;
export type { RegisterResponse } from "@dance/schemas";

export const register = async (data: RegisterData): Promise<RegisterResponse> =>
  decode(RegisterResponseSchema, await apiClient.post<RegisterData>("/auth/register", data));

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = decode(AuthResponseSchema, await apiClient.post<LoginData>("/auth/login", data));
  setToken(response.token);
  return response;
};

export const logout = (): void => {
  removeToken();
  window.location.href = "/auth/login";
};

export const getCurrentUser = async (): Promise<UserProfile> =>
  decode(UserProfileSchema, await apiClient.get("/auth/profile"));

export const isAuthenticated = (): boolean => !!localStorage.getItem("auth_token");

export const verifyEmail = async (data: VerifyEmailData): Promise<VerifyEmailResponse> => {
  const response = decode(VerifyEmailResponseSchema, await apiClient.post<VerifyEmailData>("/auth/verify-email", data));
  setToken(response.token);
  return response;
};

export const resendVerification = async (data: ResendVerificationInput) =>
  decode(AuthRequestAcceptedSchema, await apiClient.post("/auth/resend-verification", ResendVerificationSchema.parse(data)));
export const correctEmail = async (data: CorrectEmailInput) =>
  decode(AuthRequestAcceptedSchema, await apiClient.post("/auth/correct-email", CorrectEmailSchema.parse(data)));
export const requestPasswordReset = async (data: RequestPasswordResetInput) =>
  decode(AuthRequestAcceptedSchema, await apiClient.post("/auth/request-password-reset", RequestPasswordResetSchema.parse(data)));
export const resetPassword = async (data: ResetPasswordInput) => {
  const result = decode(ResetPasswordResponseSchema, await apiClient.post("/auth/reset-password", ResetPasswordSchema.parse(data)));
  removeToken();
  return result;
};
