import { useMemo } from "react";
import type { JSX } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export type RoleKey = "admin" | "judge" | "representative" | "moderator";

const roleNameMap: Record<RoleKey, string> = {
  admin: "Administrator",
  judge: "Judge",
  representative: "Studio Representative",
  moderator: "Moderator",
};

export function RequireRole({ role, children }: { role: RoleKey; children: JSX.Element }) {
  const { user, loading, hasToken } = useAuth();
  const location = useLocation();

  const hasRole = useMemo(() => {
    if (!user) return false;
    if (role === "admin" && user.isAdmin) return true;

    const target = roleNameMap[role].toLowerCase();
    return user.roles.some(({ role: userRole }) => {
      const name = userRole.name.toLowerCase();
      return name === target || name.includes(target);
    });
  }, [role, user]);

  if (!hasToken) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!hasRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
