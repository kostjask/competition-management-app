import { useMemo } from "react";
import { useAuth } from "./useAuth";

/**
 * Role name type.
 * Accepts any string since roles are defined dynamically in the database.
 * Use ROLES constants from './roles' for autocomplete on commonly used roles.
 */
export type RoleName = string;

/**
 * Hook for checking user roles and permissions
 */
export function useRole() {
  const { user, loading } = useAuth();

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    if (user.isAdmin) return true;
    return user.roles.some((r) => r.role.name === roleName);
  };

  const hasRoleInEvent = (roleName: string, eventId: string): boolean => {
    if (!user) return false;
    if (user.isAdmin) return true;
    return user.roles.some(
      (r) => r.role.name === roleName && r.event?.id === eventId
    );
  };

  const hasAnyRole = (roleNames: string[]): boolean => {
    return roleNames.some((roleName) => hasRole(roleName));
  };

  const isAdmin = useMemo(() => user?.isAdmin ?? false, [user?.isAdmin]);

  const isAuthenticated = useMemo(() => user !== null, [user]);

  return {
    user,
    loading,
    isAdmin,
    isAuthenticated,
    hasRole,
    hasRoleInEvent,
    hasAnyRole,
  };
}
