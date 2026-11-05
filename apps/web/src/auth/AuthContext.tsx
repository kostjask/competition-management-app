import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toUiError, ApiError, type UiError } from "../api/error";
import { getCurrentUser, login as loginApi, logout as logoutApi, register as registerApi, type LoginData, type RegisterData } from "../api/auth";
import { clearLegacyToken, sessionEvents } from "../api/client";
import type { UserProfile } from "../api/client";
import { AuthContext } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const current = useRef<UserProfile | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UiError | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const clearError = useCallback(() => setError(null), []);
  const loadUser = useCallback(async () => {
    try {
      const profile = await getCurrentUser();
      current.current = profile; setUser(profile); setSessionExpired(false); setError(null);
      return profile;
    } catch (err: unknown) {
      if (!(err instanceof ApiError && err.statusCode === 401)) setError(toUiError(err));
      else if (current.current) setSessionExpired(true);
      else setError(null);
      throw err;
    } finally { setLoading(false); }
  }, []);
  const refreshUser = useCallback(async () => {
    const wasGuest = !current.current;
    setLoading(true); await loadUser();
    if (wasGuest) channel.current?.postMessage("changed");
  }, [loadUser]);
  useEffect(() => {
    clearLegacyToken();
    let active = true;
    void getCurrentUser().then(profile => {
      if (active) { current.current = profile; setUser(profile); setError(null); }
    }).catch((err: unknown) => {
      if (active && !(err instanceof ApiError && err.statusCode === 401)) setError(toUiError(err));
    }).finally(() => { if (active) setLoading(false); });
    const expired = () => { if (current.current) setSessionExpired(true); };
    sessionEvents.addEventListener("expired", expired);
    const otherTabs = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("dance-session");
    channel.current = otherTabs;
    if (otherTabs) otherTabs.onmessage = event => {
      if (event.data === "changed") {
        if (current.current) expired(); else void loadUser().catch(() => {});
      }
    };
    return () => { active = false; sessionEvents.removeEventListener("expired", expired); otherTabs?.close(); channel.current = null; };
  }, [loadUser]);
  const login = useCallback(async (data: LoginData) => {
    if (current.current && sessionExpired && data.email.trim().toLowerCase() !== current.current.email) throw new ApiError(403, "Account mismatch", undefined, "FORBIDDEN", "permissionDenied");
    setLoading(true); setError(null);
    try { await loginApi(data); await loadUser(); channel.current?.postMessage("changed"); }
    catch (err: unknown) { setError(toUiError(err)); throw err; }
    finally { setLoading(false); }
  }, [loadUser, sessionExpired]);
  const register = useCallback(async (data: RegisterData) => {
    setLoading(true); setError(null);
    try { await registerApi(data); } // Registration never establishes a session.
    catch (err: unknown) { setError(toUiError(err)); throw err; }
    finally { setLoading(false); }
  }, []);
  const logout = useCallback(async () => {
    setLoading(true); setError(null);
    try { await logoutApi(); }
    catch (err: unknown) { if (!(err instanceof ApiError && err.statusCode === 401)) { setError(toUiError(err)); throw err; } }
    finally { setLoading(false); }
    current.current = null; setUser(null); setSessionExpired(false);
    channel.current?.postMessage("changed");
  }, []);
  const value = useMemo(() => ({ user, loading, error, sessionExpired, login, register, logout, refreshUser, clearError }), [user, loading, error, sessionExpired, login, register, logout, refreshUser, clearError]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
