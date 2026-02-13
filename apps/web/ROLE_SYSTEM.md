# Role-Based UI System - Usage Guide

This system is **database-driven**: roles are defined in the `Role` table, and permissions are managed through `RolePermission` relations.

**✅ Single source of truth: Database**  
**✅ No schema updates needed when adding roles**  
**✅ Frontend automatically works with any role from DB**

---

## Quick Start

```tsx
import { RoleGate, useRole, ROLES } from "@/auth";
```

---

## Approach 1: Using `<RoleGate>` Component (Recommended for UI)

### Admin-only content
```tsx
<RoleGate adminOnly>
  <button>Delete All Events</button>
</RoleGate>
```

### Specific role with type-safe constants
```tsx
<RoleGate roles={[ROLES.REPRESENTATIVE]}>
  <button>Register Team</button>
</RoleGate>
```

### Multiple roles
```tsx
<RoleGate roles={[ROLES.JUDGE, ROLES.MODERATOR]}>
  <button>View Scores</button>
</RoleGate>
```

### With fallback for non-authorized users
```tsx
<RoleGate 
  roles={[ROLES.REPRESENTATIVE]} 
  fallback={<button disabled>Login to Register</button>}
>
  <button>Register Team</button>
</RoleGate>
```

### Any authenticated user
```tsx
<RoleGate requireAuth>
  <button>View My Profile</button>
</RoleGate>
```

### Guests only (not logged in)
```tsx
<RoleGate guestsOnly>
  <button>Sign Up Now</button>
</RoleGate>
```

### Future-proof: custom role strings work too
```tsx
<RoleGate roles={["new_custom_role"]}>
  <button>Custom Feature</button>
</RoleGate>
```

---

## Approach 2: Using `useRole()` Hook (Recommended for Logic)

```tsx
function MyComponent() {
  const { isAdmin, isAuthenticated, hasRole, hasAnyRole } = useRole();

  // Early return based on role
  if (!hasRole(ROLES.REPRESENTATIVE)) {
    return <div>Access denied</div>;
  }

  // Conditional rendering
  return (
    <div>
      {isAdmin && <button>Admin Panel</button>}
      {hasRole(ROLES.JUDGE) && <button>Score Performance</button>}
      {hasAnyRole([ROLES.JUDGE, ROLES.MODERATOR]) && <button>View All Scores</button>}
      {isAuthenticated && <button>Logout</button>}
      
      {/* Future-proof: any role string works */}
      {hasRole("future_role") && <button>Future Feature</button>}
    </div>
  );
}
```

---

## Approach 3: Event-Specific Roles

```tsx
function EventPanel({ eventId }: { eventId: string }) {
  const { hasRoleInEvent } = useRole();

  return (
    <div>
      {hasRoleInEvent(ROLES.JUDGE, eventId) && (
        <button>Judge This Event</button>
      )}
    </div>
  );
}
```

---

## Best Practices

1. ✅ **Database is truth**: Always define roles in the `Role` table first
2. ✅ **Use `ROLES` constants**: For autocomplete and readability (but strings work too)
3. ✅ **Use `<RoleGate>`**: For simple UI conditional rendering
4. ✅ **Use `useRole()` hook**: When you need logic/early returns
5. ✅ **Admin bypass**: Admin users automatically bypass all role checks
6. ✅ **Permissions in DB**: Use `RolePermission` table for fine-grained access control

---

## Adding a New Role

### Step 1: Add to database
Insert the new role into the `Role` table:

```sql
INSERT INTO "Role" (id, key, name, description)
VALUES (gen_random_uuid(), 'coordinator', 'Coordinator', 'Event coordinator role');
```

### Step 2: Assign permissions (optional)
Link permissions via `RolePermission` table:

```sql
INSERT INTO "RolePermission" (role_id, permission_id)
VALUES (
  (SELECT id FROM "Role" WHERE key = 'coordinator'),
  (SELECT id FROM "Permission" WHERE key = 'manage_schedule')
);
```

### Step 3: Add constant for convenience (optional)
Edit `apps/web/src/auth/roles.ts`:

```ts
export const ROLES = {
  REPRESENTATIVE: "representative",
  JUDGE: "judge",
  MODERATOR: "moderator",
  COORDINATOR: "coordinator", // ← Add here for autocomplete
} as const;
```

### Step 4: Use anywhere!
```tsx
<RoleGate roles={[ROLES.COORDINATOR]}>
  <CoordinatorPanel />
</RoleGate>

// Or use the string directly
<RoleGate roles={["coordinator"]}>
  <CoordinatorPanel />
</RoleGate>
```

**That's it!** No schema changes, no type updates. The frontend automatically accepts any role from the database.

---

## Type Safety Features

- **Database-driven**: Roles defined in `Role` table (single source of truth)
- **Autocomplete**: Use `ROLES` constants for known roles
- **Flexible**: Accepts any string role from database
- **No duplication**: Add role once in DB, works everywhere
- **Permission-based**: Uses `RolePermission` for fine-grained control

---

## Role Management Architecture

```
Database (Single Source of Truth)
├── Role table           → Defines all available roles
├── Permission table     → Defines all available permissions
└── RolePermission table → Maps which roles have which permissions

Frontend
├── useRole() hook       → Checks user.roles[] from API
├── RoleGate component   → Conditional UI based on roles
└── ROLES constants      → Convenience for autocomplete (optional)
```

**Key principle**: The database controls what roles exist and what they can do. The frontend just checks if a user has a specific role string.

---

## Available Role Constants

From `apps/web/src/auth/roles.ts`:

- `ROLES.REPRESENTATIVE` - Studio representatives
- `ROLES.JUDGE` - Event judges
- `ROLES.MODERATOR` - Event moderators

**Note**: These are just convenience constants. The actual roles come from the database, so any role string from the `Role` table will work in the frontend.
