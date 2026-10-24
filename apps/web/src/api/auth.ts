import {
  RegisterResponseSchema, AuthResponseSchema, VerifyEmailResponseSchema, UserProfileSchema,
  type RegisterInput, type LoginInput, type VerifyEmailInput,
  type RegisterResponse, type AuthResponse, type VerifyEmailResponse, type UserProfile,
} from "@dance/schemas";
import { apiClient, setToken, removeToken } from "./client.js";

export type RegisterData = RegisterInput;
export type LoginData = LoginInput;
export type VerifyEmailData = VerifyEmailInput;
export type { RegisterResponse } from "@dance/schemas";

export const register = async (data: RegisterData): Promise<RegisterResponse> =>
  RegisterResponseSchema.parse(await apiClient.post<unknown, RegisterData>("/auth/register", data));

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = AuthResponseSchema.parse(await apiClient.post<unknown, LoginData>("/auth/login", data));
  setToken(response.token);
  return response;
};

export const logout = (): void => {
  removeToken();
  window.location.href = "/auth/login";
};

export const getCurrentUser = async (): Promise<UserProfile> =>
  UserProfileSchema.parse(await apiClient.get<unknown>("/auth/profile"));

export const isAuthenticated = (): boolean => !!localStorage.getItem("auth_token");

export const verifyEmail = async (data: VerifyEmailData): Promise<VerifyEmailResponse> => {
  const response = VerifyEmailResponseSchema.parse(await apiClient.post<unknown, VerifyEmailData>("/auth/verify-email", data));
  setToken(response.token);
  return response;
};
