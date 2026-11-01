import type { z } from "zod";
import { ApiError, parseApiError } from "./error";
export { ApiError } from "./error";
export type { AuthResponse, UserProfile, ErrorResponse } from "@dance/schemas";

/**
 * API Client for Dance Competition App
 * Handles HTTP requests with automatic JWT token injection and error handling
 */

const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:4000/api/v1";

const TOKEN_KEY = "auth_token";

/**
 * Get the stored JWT token from localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Store JWT token in localStorage
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Remove JWT token from localStorage
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Redirect to login page and clear token
 */
const redirectToLogin = (): void => {
  removeToken();
  window.location.href = "/auth/login";
};

/**
 * Make an authenticated API request
 */
async function request(
  endpoint: string,
  options: RequestInit = {},
  image = false,
): Promise<unknown> {
  let url = `${API_BASE_URL}${endpoint}`;
  if (image) {
    let target: URL;
    try { target = new URL(endpoint, API_BASE_URL); }
    catch { throw new ApiError(502, "Invalid image URL", undefined, "INVALID_RESPONSE", "invalidResponse"); }
    if (target.origin !== new URL(API_BASE_URL).origin || target.username || target.password || target.search || target.hash ||
        !/^\/uploads\/(events|users|studios|dancers)\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/.test(target.pathname)) {
      throw new ApiError(502, "Invalid image URL", undefined, "INVALID_RESPONSE", "invalidResponse");
    }
    url = target.href;
  }
  const token = getToken();

  // Prepare headers
  const headers: Record<string, string> = {
    ...(image || options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
  };

  // Add Authorization header if token exists
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Merge with provided headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle authentication errors
    if (response.status === 401 && token) {
      redirectToLogin();
      throw new ApiError(401, "Unauthorized", undefined, "UNAUTHORIZED", "authenticationRequired");
    }

    // Handle non-OK responses
    if (!response.ok) {
      const data: unknown = await response.json().catch(() => null);
      throw parseApiError(response.status, data);
    }

    if (image) {
      if (response.headers.get("Content-Type") !== "image/webp") throw new ApiError(502, "Invalid image response", undefined, "INVALID_RESPONSE", "invalidResponse");
      return await response.blob();
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined;
    }

    // Parse JSON response
    try {
      return await response.json();
    } catch {
      // A successful HTTP status still requires valid JSON.
      throw new ApiError(502, "Invalid response", undefined, "INVALID_RESPONSE", "invalidResponse");
    }
  } catch (error) {
    // Re-throw ApiError instances
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiError(0, "Network error", undefined, "NETWORK", "network");
    }

    // Handle unknown errors
    throw new ApiError(
      500,
      "Request failed"
    );
  }
}

/**
 * HTTP transport returns unknown; feature helpers decode shared contracts
 */
export function decode<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(502, "Invalid response", undefined, "INVALID_RESPONSE", "invalidResponse");
  return result.data;
}
export const apiClient = {
  image: async (url: string): Promise<Blob> => {
    const result = await request(url, { redirect: "error", cache: "no-store" }, true);
    if (!(result instanceof Blob)) throw new ApiError(502, "Invalid image response", undefined, "INVALID_RESPONSE", "invalidResponse");
    return result;
  },
  get: (endpoint: string, options?: Omit<RequestInit, "method" | "body">): Promise<unknown> => request(endpoint, { ...options, method: "GET" }),
  post: <TBody = unknown>(endpoint: string, body?: TBody): Promise<unknown> => request(endpoint, { method: "POST", ...(body !== undefined && { body: JSON.stringify(body) }) }),
  patch: <TBody = unknown>(endpoint: string, body?: TBody): Promise<unknown> => request(endpoint, { method: "PATCH", ...(body !== undefined && { body: JSON.stringify(body) }) }),
  upload: (endpoint: string, body: FormData): Promise<unknown> => request(endpoint, { method: "POST", body }),
  delete: async (endpoint: string): Promise<void> => { await request(endpoint, { method: "DELETE" }); },
};
