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

/**
 * Register a new user
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse, RegisterData>("/auth/register", data);
  
  // Store the token
  if (response.token) {
    setToken(response.token);
  }
  
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
  window.location.href = "/login";
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
