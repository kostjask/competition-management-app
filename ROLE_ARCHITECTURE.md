# Role & Permission System - Architecture

## ✅ Database-Driven Approach

**Single Source of Truth**: The database controls all roles and permissions. No hardcoded enums.

---

## Database Schema

```
Role
├── id: UUID (primary key)
├── key: String (unique, e.g., "representative")
├── name: String (display name, e.g., "Studio Representative")
└── description: String (optional)

Permission
├── id: UUID (primary key)
├── key: String (unique, e.g., "event.register")
├── name: String (display name)
└── description: String (optional)

RolePermission (junction table)
├── roleId: UUID (Role FK)
└── permissionId: UUID (Permission FK)

UserRole
├── id: UUID (primary key)
├── userId: UUID (User FK)
├── roleId: UUID (Role FK)
└── eventId: UUID? (Event FK, nullable for global roles)
```

---

## How It Works

### 1. **Backend** (Single source of truth)
- Roles defined in `Role` table
- Permissions defined in `Permission` table
- Mappings in `RolePermission` table
- User assignments in `UserRole` table (can be event-specific)

### 2. **Shared Schema** (`packages/schemas`)
```ts
// Simple string validation - accepts any role from DB
export const RoleKeySchema = z
  .string()
  .min(1)
  .regex(/^[a-z_]+$/);
```

### 3. **Frontend** (`apps/web`)
```ts
// Hook checks user.roles[] from API
const { hasRole, isAdmin } = useRole();

// Accepts any role string from database
<RoleGate roles={["representative"]}>
  <RegisterButton />
</RoleGate>
```

---

## Adding a New Role

### Option 1: Via Seed File (Recommended)
Edit `apps/api/prisma/seed.ts`:

```ts
const coordinatorRole = await prisma.role.upsert({
  where: { key: "coordinator" },
  create: {
    key: "coordinator",
    name: "Event Coordinator",
    description: "Coordinates event logistics",
  },
});

// Assign permissions
await prisma.rolePermission.upsert({
  where: {
    roleId_permissionId: {
      roleId: coordinatorRole.id,
      permissionId: manageSchedulePermission.id,
    },
  },
  create: {
    roleId: coordinatorRole.id,
    permissionId: manageSchedulePermission.id,
  },
});
```

Then run: `pnpm --filter api db:seed`

### Option 2: Manual SQL
```sql
-- 1. Create role
INSERT INTO "Role" (id, key, name, description)
VALUES (gen_random_uuid(), 'coordinator', 'Event Coordinator', 'Coordinates events');

-- 2. Assign permissions
INSERT INTO "RolePermission" (role_id, permission_id)
SELECT 
  (SELECT id FROM "Role" WHERE key = 'coordinator'),
  (SELECT id FROM "Permission" WHERE key = 'event.manage');
```

### Option 3: Via API (Future)
Create an admin API endpoint to manage roles dynamically.

---

## Frontend Usage

### No code changes needed!
Once the role exists in the database, the frontend automatically works:

```tsx
// Use string directly
<RoleGate roles={["coordinator"]}>
  <CoordinatorPanel />
</RoleGate>

// Or add to constants for autocomplete (optional)
// apps/web/src/auth/roles.ts
export const ROLES = {
  // ...
  COORDINATOR: "coordinator",
} as const;

// Then use constant
<RoleGate roles={[ROLES.COORDINATOR]}>
  <CoordinatorPanel />
</RoleGate>
```

---

## Benefits

✅ **No duplication**: Define role once in DB  
✅ **No schema updates**: Add roles without touching code  
✅ **Flexible permissions**: Fine-grained control via RolePermission  
✅ **Event-specific roles**: UserRole can be scoped to events  
✅ **Type-safe**: TypeScript accepts any string, but constants provide autocomplete  
✅ **Future-proof**: New roles work immediately  

---

## Migration Path

If you have existing hardcoded role checks:

### Before (hardcoded):
```ts
if (user.role === "admin" || user.role === "representative") {
  // ...
}
```

### After (database-driven):
```ts
const { hasAnyRole } = useRole();
if (hasAnyRole(["admin", "representative"])) {
  // ...
}

// Or use RoleGate
<RoleGate roles={["admin", "representative"]}>
  <Component />
</RoleGate>
```

---

## Current Roles in Database

From `apps/api/prisma/seed.ts`:

1. **admin** - Full system access
2. **representative** - Studio representative
3. **judge** - Event judge
4. **moderator** - Event moderator

All new roles can be added to the database without any frontend code changes!
