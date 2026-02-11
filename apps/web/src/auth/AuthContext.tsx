import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getCurrentUser,
  isAuthenticated,
  login as loginApi,
  register as registerApi,
  type LoginData,
  type RegisterData,
} from "../api/auth";
import { ApiError, removeToken } from "../api/client";
import type { UserProfile } from "../api/client";
import { AuthContext } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(isAuthenticated());

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated()) {
      setHasToken(false);
      setUser(null);
      setError(null);
      return;
    }

    setHasToken(true);
    setLoading(true);
    setError(null);

    try {
      const profile = await getCurrentUser();
      setUser(profile);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        removeToken();
        setHasToken(false);
      }
      setUser(null);
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasToken) {
      void refreshUser();
    }
  }, [hasToken, refreshUser]);

  const login = useCallback(
    async (data: LoginData) => {
      setLoading(true);
      setError(null);

      try {
        await loginApi(data);
        setHasToken(true);
        await refreshUser();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshUser]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      setLoading(true);
      setError(null);

      try {
        await registerApi(data);
        setHasToken(true);
        await refreshUser();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshUser]
  );

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    setHasToken(false);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      hasToken,
      login,
      register,
      logout,
      refreshUser,
      clearError,
    }),
    [user, loading, error, hasToken, login, register, logout, refreshUser, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
