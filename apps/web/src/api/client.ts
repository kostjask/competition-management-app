/**
 * API Client for Dance Competition App
 * Handles HTTP requests with automatic JWT token injection and error handling
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const TOKEN_KEY = "auth_token";

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

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
  window.location.href = "/login";
};

/**
 * Make an authenticated API request
 */
async function request<TResponse = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<TResponse> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  // Prepare headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
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
    if (response.status === 401) {
      redirectToLogin();
      throw new ApiError(401, "Unauthorized - Please log in again");
    }

    if (response.status === 403) {
      throw new ApiError(
        403,
        "Forbidden - You don't have permission to access this resource"
      );
    }

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let errorDetails: unknown = undefined;

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
        errorDetails = errorData.details || errorData;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      throw new ApiError(response.status, errorMessage, errorDetails);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as TResponse;
    }

    // Parse JSON response
    try {
      return await response.json();
    } catch {
      // If response is not JSON, return empty object
      return {} as TResponse;
    }
  } catch (error) {
    // Re-throw ApiError instances
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiError(0, "Network error - Please check your connection");
    }

    // Handle unknown errors
    throw new ApiError(
      500,
      error instanceof Error ? error.message : "An unknown error occurred"
    );
  }
}

/**
 * HTTP client with typed methods
 */
export const apiClient = {
  /**
   * GET request
   */
  get: <TResponse = unknown>(
    endpoint: string,
    options?: Omit<RequestInit, "method" | "body">
  ): Promise<TResponse> => {
    return request<TResponse>(endpoint, { ...options, method: "GET" });
  },

  /**
   * POST request
   */
  post: <TResponse = unknown, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    options?: Omit<RequestInit, "method" | "body">
  ): Promise<TResponse> => {
    return request<TResponse>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PUT request
   */
  put: <TResponse = unknown, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    options?: Omit<RequestInit, "method" | "body">
  ): Promise<TResponse> => {
    return request<TResponse>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PATCH request
   */
  patch: <TResponse = unknown, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    options?: Omit<RequestInit, "method" | "body">
  ): Promise<TResponse> => {
    return request<TResponse>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * DELETE request
   */
  delete: <TResponse = unknown>(
    endpoint: string,
    options?: Omit<RequestInit, "method" | "body">
  ): Promise<TResponse> => {
    return request<TResponse>(endpoint, { ...options, method: "DELETE" });
  },
};

/**
 * Type-safe auth response
 */
export interface AuthResponse {
  token: string;
  tokenType: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Type-safe user profile response
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  isAdmin: boolean;
  roles: Array<{
    id: string;
    role: {
      id: string;
      name: string;
    };
    event: {
      id: string;
      name: string;
    } | null;
  }>;
}

/**
 * Error response from API
 */
export interface ErrorResponse {
  error: string;
  statusCode: number;
  details?: unknown;
}
