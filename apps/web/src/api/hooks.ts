/**
 * React hooks for API calls
 * 
 * Example usage patterns for the API client
 */

import { useState, useEffect } from "react";
import { ApiError } from "./client.js";

/**
 * Generic hook for API calls with loading and error states
 */
export function useApiCall<TData, TArgs extends unknown[]>(
  apiFunction: (...args: TArgs) => Promise<TData>
) {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (...args: TArgs) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof ApiError ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

/**
 * Example: Hook for fetching data on mount
 */
export function useFetch<TData>(
  fetcher: () => Promise<TData>
) {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetcher();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage =
            err instanceof ApiError ? err.message : "An error occurred";
          setError(errorMessage);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  return { data, loading, error };
}

/**
 * Example usage in a component:
 * 
 * import { useFetch } from './api/hooks';
 * import { getCurrentUser } from './api/auth';
 * 
 * function UserProfile() {
 *   const { data: user, loading, error } = useFetch(getCurrentUser);
 * 
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   if (!user) return null;
 * 
 *   return <div>Welcome, {user.name}!</div>;
 * }
 * 
 * // For mutations (login, register, etc.):
 * import { useApiCall } from './api/hooks';
 * import { login } from './api/auth';
 * 
 * function LoginForm() {
 *   const { loading, error, execute: doLogin } = useApiCall(login);
 * 
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       await doLogin({ email: '...', password: '...' });
 *       // Navigate to dashboard
 *     } catch (err) {
 *       // Error is already set in state
 *     }
 *   };
 * 
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <div className="error">{error}</div>}
 *       <button disabled={loading}>
 *         {loading ? 'Logging in...' : 'Login'}
 *       </button>
 *     </form>
 *   );
 * }
 */
