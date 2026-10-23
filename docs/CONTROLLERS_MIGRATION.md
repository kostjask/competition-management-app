# Controllers Layer Migration Guide

## Summary of Changes

The backend API now uses a **Controllers Layer** for cleaner separation of concerns between request handling (routes) and business logic (controllers).

### Changes Made

✅ **New Controllers Directory** - `src/controllers/`

- `BaseController.ts` - Abstract base class for all controllers
- `AuthController.ts` - Authentication logic (register, login, verify-email, profile)
- `EventsController.ts` - Events and studio registration logic
- `index.ts` - Centralized controller exports

✅ **Refactored Routes**

- `routes/auth.ts` - Now delegates to AuthController
- `routes/events.ts` - Now delegates to EventsController

✅ **Error Handling Integration**

- All controllers throw specific error types (ValidationError, ForbiddenError, NotFoundError, etc.)
- Errors automatically caught and handled by centralized error middleware

✅ **Documentation**

- `docs/CONTROLLERS.md` - Comprehensive controllers architecture guide
- `docs/ERROR_HANDLING.md` - Error handling system documentation

## Architecture

```
HTTP Request
    ↓
Route (src/routes/*)
    ├─ Validate middleware
    └─ Delegate to Controller
    ↓
Controller (src/controllers/*)
    ├─ Validate input (Zod)
    ├─ Check permissions
    ├─ Business logic
    └─ Throw typed errors
    ↓
Error Handler Middleware
    └─ Format response
    ↓
HTTP Response
```

## File Structure

```
src/
├── controllers/
│   ├── BaseController.ts          ← Base class with helpers
│   ├── AuthController.ts          ← Auth methods
│   ├── EventsController.ts        ← Events methods
│   └── index.ts                   ← Exports all controllers
├── routes/
│   ├── auth.ts                    ← Thin route handler
│   ├── events.ts                  ← Thin route handler
│   └── ...
├── errors/                        ← Error handling system
├── middleware/                    ← Express middleware
├── services/                      ← External integrations
└── ...
```

## Key Features

### 1. Type-Safe Controllers

```typescript
class AuthController extends BaseController {
  async register(req: Request, res: Response): Promise<void> {
    // Full type safety with strict TypeScript
  }
}
```

### 2. Built-in Helpers

```typescript
protected getUserId(req: Request): string;
protected isAdmin(req: Request): boolean;
protected hasPermission(req: Request, permission: string): boolean;
```

### 3. Automatic Error Handling

```typescript
async getById(req: Request, res: Response): Promise<void> {
  const resource = await this.prisma.resource.findUnique({ where: { id } });
  if (!resource) {
    throw new NotFoundError("Resource", id); // Auto-caught & formatted
  }
  res.json(resource);
}
```

### 4. Clean Route Files

```typescript
router.post(
  "/",
  asyncHandler((req, res) => controller.create(req, res)),
);
```

## Next Steps: Completing the Migration

To complete the migration, apply the same pattern to these remaining routes:

1. **StudiosController** → `routes/studios.ts`
2. **DancersController** → `routes/dancers.ts`
3. **PerformancesController** → `routes/performances.ts`
4. **JudgesController** → `routes/judges.ts`
5. **CategoriesController** → `routes/categories.ts`
6. **FormatsController** → `routes/formats.ts`
7. **AgeGroupsController** → `routes/age-groups.ts`
8. **ImagesController** → `routes/images.ts`
9. **InvitationsController** → `routes/invitations.ts`

Each follows the same pattern:

1. Create `src/controllers/{Resource}Controller.ts`
2. Extract methods from route handler
3. Make them async and return via `res` parameter
4. Use BaseController helpers for permissions/user info
5. Throw typed errors instead of status codes
6. Update route file to use controller
7. Export in `src/controllers/index.ts`

## Testing Migration

After migration, test that:

- All routes work as before
- Error responses have correct format:
  ```json
  {
    "error": "User-friendly message",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "timestamp": "2024-02-16T10:30:00.000Z"
  }
  ```
- Validation errors include field-level details
- Authorization errors return 403 with appropriate message
- Database errors are caught and formatted

## Performance Impact

✅ **No performance impact** - Controllers are just functions
✅ **Improved maintainability** - Cleaner code organization
✅ **Better testability** - Controllers can be unit tested
✅ **Type safety** - Full TypeScript support

## References

- [Controllers Architecture](./CONTROLLERS.md)
- [Error Handling System](./ERROR_HANDLING.md)
- [Base Controller Implementation](../apps/api/src/controllers/BaseController.ts)
- [Example: AuthController](../apps/api/src/controllers/AuthController.ts)
- [Example: EventsController](../apps/api/src/controllers/EventsController.ts)
