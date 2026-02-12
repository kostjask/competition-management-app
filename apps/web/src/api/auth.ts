/**
 * Authentication API methods
 */

import { apiClient, setToken, removeToken, type AuthResponse, type UserProfile } from "./client.js";

export interface RegisterData {
  email: string;
  name: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface VerifyEmailData {
  token: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

/**
 * Register a new user
 */
export const register = async (data: RegisterData): Promise<RegisterResponse> => {
  const response = await apiClient.post<RegisterResponse, RegisterData>("/auth/register", data);
  
  // No token is returned - user must verify email first
  return response;
};

/**
 * Login user
 */
export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse, LoginData>("/auth/login", data);
  
  // Store the token
  if (response.token) {
    setToken(response.token);
  }
  
  return response;
};

/**
 * Logout user
 */
export const logout = (): void => {
  removeToken();
  window.location.href = "/auth/login";
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (): Promise<UserProfile> => {
  return apiClient.get<UserProfile>("/auth/me");
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("auth_token");
};

/**
 * Verify email with token
 */
export const verifyEmail = async (data: VerifyEmailData): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse, VerifyEmailData>("/auth/verify-email", data);
  
  // Store the token if returned
  if (response.token) {
    setToken(response.token);
  }
  
  return response;
};
