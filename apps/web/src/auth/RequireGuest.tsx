import type { JSX } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

/**
 * Redirects authenticated users away from guest-only pages (login, register, etc.)
 * Unauthenticated users can access the wrapped component
 */
export function RequireGuest({ children }: { children: JSX.Element }) {
  const { user, loading, hasToken } = useAuth();

  // If we have a token and user is loaded, redirect to home
  if (hasToken && user) {
    return <Navigate to="/" replace />;
  }

  // While checking authentication, show the page
  // (this prevents flash of login page when already authenticated)
  if (loading) {
    return children;
  }

  // Not authenticated, show the auth page
  return children;
}
