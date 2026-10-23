/\*\*

- Quick Reference for Error Handling
-
- This file demonstrates common error handling patterns used in the API.
  \*/

/_ ============================================================================
PATTERN 1: Basic Route with Validation
============================================================================ _/

```typescript
export const exampleRouter = () => {
  const router = Router();

  // POST /users
  router.post(
    "/",
    asyncHandler(async (req, res) => {
      // Zod automatically throws ValidationError on parse failure
      const data = CreateUserSchema.parse(req.body);

      // Check for existing resource
      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existing) {
        throw new ConflictError("Email already registered");
      }

      // Create and respond
      const user = await prisma.user.create({ data });
      res.status(201).json(user);
    }),
  );

  return router;
};
```

/_ ============================================================================
PATTERN 2: Retrieving with Not Found Handling
============================================================================ _/

```typescript
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user) {
      throw new NotFoundError("User", req.params.id);
    }

    res.json(user);
  }),
);
```

/_ ============================================================================
PATTERN 3: Authorization Checks
============================================================================ _/

```typescript
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    // Check if authenticated
    if (!req.auth) {
      throw new UnauthorizedError("Authentication required");
    }

    // Check permissions
    if (!req.auth.isAdmin) {
      throw new ForbiddenError("Only admins can delete users");
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
```

/_ ============================================================================
PATTERN 4: Custom Validation with Details
============================================================================ _/

```typescript
router.post(
  "/bulk-import",
  asyncHandler(async (req, res) => {
    const { users } = BulkImportSchema.parse(req.body);

    const errors: Record<number, string> = {};
    const results = [];

    for (let i = 0; i < users.length; i++) {
      try {
        const user = await prisma.user.create({ data: users[i] });
        results.push(user);
      } catch (error) {
        errors[i] = "Failed to create user";
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError("Some records failed to import", { errors });
    }

    res.status(201).json({ imported: results.length, results });
  }),
);
```

/_ ============================================================================
PATTERN 5: Error Response Examples
============================================================================ _/

```typescript
When throw new ValidationError("Invalid input")
Response: 400 Bad Request
{
  "error": "Invalid input",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "timestamp": "2024-02-16T10:30:00.000Z"
}

When throw new NotFoundError("User", "123")
Response: 404 Not Found
{
  "error": "User with id \"123\" not found",
  "code": "NOT_FOUND",
  "statusCode": 404,
  "details": { "resource": "User", "id": "123" },
  "timestamp": "2024-02-16T10:30:00.000Z"
}

When throw new ForbiddenError("Insufficient permissions")
Response: 403 Forbidden
{
  "error": "Insufficient permissions",
  "code": "FORBIDDEN",
  "statusCode": 403,
  "timestamp": "2024-02-16T10:30:00.000Z"
}
```

/_ ============================================================================
DO's and DON'Ts
============================================================================ _/

```typescript
// ✅ DO: Use asyncHandler for all async route handlers
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
  }),
);

// ❌ DON'T: Forget asyncHandler (unhandled promise rejections)
router.get("/users", async (req, res) => {
  const users = await prisma.user.findMany(); // Error won't be caught!
  res.json(users);
});

// ✅ DO: Throw custom errors
if (!user) {
  throw new NotFoundError("User", id);
}

// ❌ DON'T: Use generic Error
if (!user) {
  throw new Error("User not found");
}

// ✅ DO: Include helpful details
throw new ConflictError("Email already registered", { email: data.email });

// ❌ DON'T: Throw ambiguous errors
throw new ConflictError("Conflict");

// ✅ DO: Validate input with Zod schemas
const data = CreateUserSchema.parse(req.body);

// ❌ DON'T: Manual error responses
if (!req.body.email) {
  return res.status(400).json({ error: "Email required" });
}
```
