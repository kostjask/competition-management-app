/**
 * Commonly used role constants for developer convenience.
 * 
 * NOTE: Roles are defined in the database (Role table), not here.
 * These constants are just helpers for autocomplete and readability.
 * 
 * To add a new role:
 * 1. Insert into the database Role table
 * 2. Optionally add a constant here for convenience
 * 
 * @example
 * import { ROLES } from "@/auth/roles";
 * <RoleGate roles={[ROLES.REPRESENTATIVE]}>...</RoleGate>
 */
export const ROLES = {
  REPRESENTATIVE: "representative",
  JUDGE: "judge",
  MODERATOR: "moderator",
} as const;

/**
 * Type helper for known role values
 */
export type KnownRole = (typeof ROLES)[keyof typeof ROLES];

/**
 * Array of commonly used role keys.
 * Useful for UI iteration.
 */
export const COMMON_ROLES = Object.values(ROLES);
