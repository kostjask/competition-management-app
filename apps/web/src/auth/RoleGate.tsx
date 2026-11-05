import type { ReactNode } from "react";
import { useRole } from "./useRole";

type RoleGateProps = {
  children: ReactNode;
  roles?: string[];
  permissions?: string[];
  eventId?: string;
  adminOnly?: boolean;
  requireAuth?: boolean;
  guestsOnly?: boolean;
  fallback?: ReactNode;
};

// All supplied conditions must pass; an auth condition cannot bypass a role.
export function RoleGate({ children, roles, permissions, eventId, adminOnly, requireAuth, guestsOnly, fallback = null }: RoleGateProps) {
  const { isAdmin, isAuthenticated, hasAnyRole, hasPermission, loading } = useRole();
  if (loading) return null;
  const allowed = (!guestsOnly || !isAuthenticated)
    && (!requireAuth || isAuthenticated)
    && (!adminOnly || isAdmin)
    && (!roles?.length || hasAnyRole(roles, eventId))
    && (!permissions?.length || permissions.every(key => hasPermission(key, eventId)));
  return <>{allowed ? children : fallback}</>;
}
