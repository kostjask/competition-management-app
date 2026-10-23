# Error Handling Guide

This document describes the structured error handling system used in the API.

## Overview

The API uses a centralized error handling system with custom error classes that map to HTTP status codes. Errors automatically propagate to a global error handler middleware that formats responses consistently.

## Error Classes

### `AppError` (Base Class)
Base class for all application errors.

**Constructor:**
```typescript
new AppError(message, statusCode, code, details)
```

**Parameters:**
- `message` (required): Human-readable error message
- `statusCode` (default: 500): HTTP status code
- `code` (default: "INTERNAL_SERVER_ERROR"): Machine-readable error code
- `details` (optional): Additional error context

**Example:**
```typescript
throw new AppError("Custom error", 400, "CUSTOM_ERROR", {
  field: "example"
});
```

### `ValidationError` (400)
Input validation failed (Zod parsing errors, field validation, etc).

```typescript
throw new ValidationError("Invalid email format", {
  email: "not-an-email"
});
```

### `NotFoundError` (404)
Resource doesn't exist.

```typescript
throw new NotFoundError("User", "123");
// Message: "User with id "123" not found"

throw new NotFoundError("Event");
// Message: "Event not found"
```

### `UnauthorizedError` (401)
Authentication failed or missing.

```typescript
throw new UnauthorizedError("Invalid credentials");
throw new UnauthorizedError(); // Uses default message
```

### `ForbiddenError` (403)
User lacks permission for the resource.

```typescript
throw new ForbiddenError("You cannot delete this event");
throw new ForbiddenError(); // Uses default message: "Access denied"
```

### `ConflictError` (409)
Resource already exists or action conflicts.

```typescript
throw new ConflictError("Email already registered", {
  email: "user@example.com"
});
```

### `InternalServerError` (500)
Unexpected server error.

```typescript
throw new InternalServerError("Database connection failed");
```

## Async Error Handling

Use the `asyncHandler` wrapper to automatically catch errors in async route handlers:

```typescript
import { asyncHandler } from "../errors/handler";

router.post(
  "/users",
  asyncHandler(async (req, res) => {
    // Errors are automatically caught and passed to error middleware
    const user = await prisma.user.create({ ... });
    res.json(user);
  })
);
```

Without `asyncHandler`, you must manually catch errors:

```typescript
router.post("/users", async (req, res, next) => {
  try {
    const user = await prisma.user.create({ ... });
    res.json(user);
  } catch (error) {
    next(error); // Pass to error handler
  }
});
```

## Zod Validation Integration

Zod errors are automatically converted to `ValidationError`:

```typescript
import { CreateUserSchema } from "@dance/schemas";

router.post(
  "/users",
  asyncHandler(async (req, res) => {
    // If parsing fails, throws ValidationError with field details
    const data = CreateUserSchema.parse(req.body);

    // ... rest of handler
  })
);
```

**Example Response for Zod Error:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "details": {
    "fields": {
      "email": "Invalid email",
      "password": "String must contain at least 8 character(s)"
    }
  },
  "timestamp": "2024-02-16T10:30:00.000Z"
}
```

## Error Response Format

All errors follow this JSON response format:

```typescript
{
  "error": string;           // Human-readable message
  "code": string;            // Machine-readable error code
  "statusCode": number;      // HTTP status code
  "details"?: object;        // Optional additional context
  "timestamp": string;       // ISO 8601 formatted timestamp
}
```

**Example Responses:**

**ValidationError (400):**
```json
{
  "error": "Invalid credentials",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "timestamp": "2024-02-16T10:30:00.000Z"
}
```

**NotFoundError (404):**
```json
{
  "error": "User with id \"123\" not found",
  "code": "NOT_FOUND",
  "statusCode": 404,
  "details": {
    "resource": "User",
    "id": "123"
  },
  "timestamp": "2024-02-16T10:30:00.000Z"
}
```

**ConflictError (409):**
```json
{
  "error": "Email already registered",
  "code": "CONFLICT",
  "statusCode": 409,
  "details": {
    "email": "user@example.com"
  },
  "timestamp": "2024-02-16T10:30:00.000Z"
}
```

**UnauthorizedError (401):**
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED",
  "statusCode": 401,
  "timestamp": "2024-02-16T10:30:00.000Z"
}
```

## Usage Examples

### Example 1: Creating a Resource

```typescript
import { asyncHandler } from "../errors/handler";
import { ConflictError } from "../errors";
import { CreateEventSchema } from "@dance/schemas";

router.post(
  "/events",
  asyncHandler(async (req, res) => {
    const data = CreateEventSchema.parse(req.body); // Auto-validates, throws ValidationError

    const existing = await prisma.event.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new ConflictError("Event with this name already exists");
    }

    const event = await prisma.event.create({ data });
    res.status(201).json(event);
  })
);
```

### Example 2: Retrieving a Resource

```typescript
import { asyncHandler } from "../errors/handler";
import { NotFoundError } from "../errors";

router.get(
  "/events/:id",
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
    });

    if (!event) {
      throw new NotFoundError("Event", req.params.id);
    }

    res.json(event);
  })
);
```

### Example 3: Authorization Check

```typescript
import { asyncHandler } from "../errors/handler";
import { ForbiddenError } from "../errors";

router.delete(
  "/events/:id",
  asyncHandler(async (req, res) => {
    if (!req.auth?.isAdmin) {
      throw new ForbiddenError("Only admins can delete events");
    }

    await prisma.event.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
```

## Best Practices

1. **Always use specific error types** - Use the most appropriate error class for the situation
2. **Add context in details** - Include relevant data in the details field for debugging
3. **Use asyncHandler** - Wrap all async route handlers to ensure errors are caught
4. **Don't catch errors you can't handle** - Let them propagate to the error handler
5. **Meaningful messages** - Write clear, user-friendly error messages
6. **Log appropriately** - The error handler logs unexpected errors automatically

## Error Code Reference

| Class | Code | Status | Use Case |
|-------|------|--------|----------|
| ValidationError | VALIDATION_ERROR | 400 | Input validation failed |
| UnauthorizedError | UNAUTHORIZED | 401 | Auth required or failed |
| ForbiddenError | FORBIDDEN | 403 | Insufficient permissions |
| NotFoundError | NOT_FOUND | 404 | Resource doesn't exist |
| ConflictError | CONFLICT | 409 | Resource already exists |
| InternalServerError | INTERNAL_SERVER_ERROR | 500 | Unexpected server error |
