/**
 * React hooks for API calls
 * 
 * Example usage patterns for the API client
 */

import { useState, useEffect } from "react";
import { toUiError, type UiError } from "./error";

/**
 * Generic hook for API calls with loading and error states
 */
export function useApiCall<TData, TArgs extends unknown[]>(
  apiFunction: (...args: TArgs) => Promise<TData>
) {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const execute = async (...args: TArgs) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage =
        toUiError(err);
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
  const [error, setError] = useState<UiError | null>(null);

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
            toUiError(err);
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
