import { toUiError, type UiError } from "../api/error";
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
  const [initialHasToken] = useState(isAuthenticated);
  const [loading, setLoading] = useState(initialHasToken);
  const [error, setError] = useState<UiError | null>(null);
  const [hasToken, setHasToken] = useState(initialHasToken);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadUser = useCallback(() => {
    return getCurrentUser()
      .then((profile) => {
        setUser(profile);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.statusCode === 401) {
          removeToken();
          setHasToken(false);
        }
        setUser(null);
        setError(toUiError(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated()) {
      setHasToken(false);
      setUser(null);
      setError(null);
      setLoading(false);
      return;
    }

    setHasToken(true);
    setLoading(true);
    setError(null);
    await loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (initialHasToken) {
      void loadUser();
    }
  }, [initialHasToken, loadUser]);

  const login = useCallback(
    async (data: LoginData) => {
      setLoading(true);
      setError(null);

      try {
        await loginApi(data);
        setHasToken(true);
        await refreshUser();
      } catch (err) {
        setError(toUiError(err));
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
        setError(toUiError(err));
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
