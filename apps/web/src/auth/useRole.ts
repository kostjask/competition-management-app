import { useAuth } from "./useAuth";
import { roleAccess } from "./access";

export type RoleName = string;

export function useRole() {
  const { user, loading } = useAuth();
  const access = roleAccess(user);
  return { user, loading, ...access, hasRoleInEvent: (key: string, eventId: string) => access.hasRole(key, eventId) };
}
