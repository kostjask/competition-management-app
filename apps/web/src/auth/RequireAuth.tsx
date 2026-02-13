import type { JSX } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { hasToken, user, loading } = useAuth();
  const location = useLocation();

  if (!hasToken) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (loading && !user) {
    return <div className="p-6">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return children;
}
