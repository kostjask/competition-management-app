import type { ReactNode } from "react";
import { useRole } from "./useRole";

type RoleGateProps = {
  children: ReactNode;
  /** Show content only for these roles. Admin always sees everything. Accepts any role string (roles defined in DB). */
  roles?: string[];
  /** Show content only for admin */
  adminOnly?: boolean;
  /** Show content only for authenticated users */
  requireAuth?: boolean;
  /** Show content only for guests (not authenticated) */
  guestsOnly?: boolean;
  /** Show fallback content instead of hiding */
  fallback?: ReactNode;
};

/**
 * Conditionally render children based on user roles/auth status.
 * 
 * @example
 * // Admin-only button
 * <RoleGate adminOnly>
 *   <button>Create Event</button>
 * </RoleGate>
 * 
 * @example
 * // Show for specific roles or guest fallback
 * <RoleGate roles={["representative"]} fallback={<LoginPrompt />}>
 *   <RegisterButton eventId={id} />
 * </RoleGate>
 * 
 * @example
 * // Any authenticated user
 * <RoleGate requireAuth>
 *   <ProfileLink />
 * </RoleGate>
 */
export function RoleGate({
  children,
  roles,
  adminOnly,
  requireAuth,
  guestsOnly,
  fallback = null,
}: RoleGateProps) {
  const { isAdmin, isAuthenticated, hasAnyRole, loading } = useRole();

  if (loading) {
    return null;
  }

  // Admin sees everything (unless guestsOnly)
  if (isAdmin && !guestsOnly) {
    return <>{children}</>;
  }

  // Guests only
  if (guestsOnly) {
    return !isAuthenticated ? <>{children}</> : <>{fallback}</>;
  }

  // Admin only
  if (adminOnly) {
    return isAdmin ? <>{children}</> : <>{fallback}</>;
  }

  // Require auth
  if (requireAuth) {
    return isAuthenticated ? <>{children}</> : <>{fallback}</>;
  }

  // Specific roles
  if (roles && roles.length > 0) {
    return hasAnyRole(roles) ? <>{children}</> : <>{fallback}</>;
  }

  // Default: show to everyone
  return <>{children}</>;
}
