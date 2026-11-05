import type { UserProfile } from "@dance/schemas";

// Profiles contain active assignments only. Labels never confer access.
// Unscoped role queries select a section landing page, not event authority.
export function roleAccess(user: UserProfile | null) {
  const isAdmin = user?.isAdmin === true;
  const hasRole = (key: string, eventId?: string): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    if (key === "admin") return false;
    return user.roles.some(assignment => assignment.role.key === key
      && !(["judge", "moderator"].includes(key) && assignment.eventId === null)
      && (eventId === undefined || assignment.eventId === null || assignment.eventId === eventId));
  };
  const hasPermission = (key: string, eventId?: string): boolean => isAdmin || (user?.permissions.some(scope =>
    (scope.eventId === null || (eventId !== undefined && scope.eventId === eventId)) && scope.keys.includes(key)) ?? false);
  return { isAdmin, isAuthenticated: user !== null, hasRole, hasPermission,
    hasAnyRole: (keys: readonly string[], eventId?: string) => keys.some(key => hasRole(key, eventId)) };
}
