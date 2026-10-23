# Controllers Layer Architecture

This document describes the controllers layer architecture used in the backend API.

## Overview

The API follows a **Route → Controller → Service** architecture:

- **Routes**: Thin request/response handlers that validate middleware and delegate to controllers
- **Controllers**: Business logic orchestration, validation, and response formatting
- **Services**: Data access and external service integration (via Prisma)

## Architecture Diagram

```
HTTP Request
    ↓
Express Router (routes/)
    ↓
Middleware (auth, validation)
    ↓
Controller Method (controllers/)
    ↓
Business Logic
    ↓
Prisma Client (db/)
    ↓
Database
    ↓
HTTP Response
```

## Base Controller

All controllers extend `BaseController` which provides:

```typescript
abstract class BaseController {
  protected prisma: PrismaClient;

  // Helper methods
  protected getUserId(req: Request): string;
  protected isAdmin(req: Request): boolean;
  protected getUserPermissions(req: Request, eventId?: string): Set<string>;
  protected hasPermission(req: Request, permission: string): boolean;
}
```

### Usage

```typescript
class EventsController extends BaseController {
  async create(req: Request, res: Response): Promise<void> {
    // Check permissions
    if (!this.isAdmin(req)) {
      throw new ForbiddenError("Only admins can create events");
    }

    // Get user ID
    const userId = this.getUserId(req);

    // Access Prisma
    const event = await this.prisma.event.create({ data: {...} });

    res.status(201).json(event);
  }
}
```

## Creating New Controllers

### Step 1: Create Controller Class

```typescript
// src/controllers/MyResourceController.ts
import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma/client";
import { BaseController } from "./BaseController";
import { asyncHandler } from "../errors/handler";
import { ValidationError, NotFoundError } from "@errors";
import { MyResourceSchema } from "@dance/schemas";

export class MyResourceController extends BaseController {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Get all resources
   * GET /my-resources
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const resources = await this.prisma.myResource.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(resources);
  }

  /**
   * Get single resource
   * GET /my-resources/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const resource = await this.prisma.myResource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundError("MyResource", id);
    }

    res.json(resource);
  }

  /**
   * Create resource
   * POST /my-resources
   */
  async create(req: Request, res: Response): Promise<void> {
    const data = MyResourceSchema.parse(req.body);

    const resource = await this.prisma.myResource.create({
      data,
    });

    res.status(201).json(resource);
  }

  /**
   * Update resource
   * PATCH /my-resources/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = MyResourceSchema.partial().parse(req.body);

    const resource = await this.prisma.myResource.update({
      where: { id },
      data,
    });

    res.json(resource);
  }

  /**
   * Delete resource
   * DELETE /my-resources/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    await this.prisma.myResource.delete({
      where: { id },
    });

    res.status(204).send();
  }
}
```

### Step 2: Update Controllers Index

```typescript
// src/controllers/index.ts
export { MyResourceController } from "./MyResourceController";
```

### Step 3: Create/Update Route File

```typescript
// src/routes/my-resources.ts
import { Router } from "express";
import { PrismaClient } from "../../generated/prisma/client";
import { asyncHandler } from "../errors/handler";
import { MyResourceController } from "../controllers";

export const myResourcesRouter = (prisma: PrismaClient) => {
  const router = Router();
  const controller = new MyResourceController(prisma);

  router.get(
    "/",
    asyncHandler((req, res) => controller.getAll(req, res)),
  );
  router.get(
    "/:id",
    asyncHandler((req, res) => controller.getById(req, res)),
  );
  router.post(
    "/",
    asyncHandler((req, res) => controller.create(req, res)),
  );
  router.patch(
    "/:id",
    asyncHandler((req, res) => controller.update(req, res)),
  );
  router.delete(
    "/:id",
    asyncHandler((req, res) => controller.delete(req, res)),
  );

  return router;
};
```

### Step 4: Register Route in index.ts

```typescript
// src/index.ts
import { myResourcesRouter } from "./routes/my-resources";

// ... in app setup
app.use("/my-resources", myResourcesRouter(prisma));
```

## Best Practices

### 1. Validation in Controllers

Always validate input at the controller level:

```typescript
async create(req: Request, res: Response): Promise<void> {
  // Parse and validate using Zod schema
  const data = CreateUserSchema.parse(req.body); // Throws ValidationError

  // Proceed with validation
  const user = await this.prisma.user.create({ data });
  res.status(201).json(user);
}
```

### 2. Permission Checks

```typescript
async delete(req: Request, res: Response): Promise<void> {
  if (!this.isAdmin(req)) {
    throw new ForbiddenError("Only admins can delete");
  }

  // ... rest of logic
}
```

### 3. Error Handling

Always throw specific error types:

```typescript
async getById(req: Request, res: Response): Promise<void> {
  const user = await this.prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    throw new NotFoundError("User", req.params.id); // Not sendStatus(404)
  }

  res.json(user);
}
```

### 4. Status Codes

Use appropriate HTTP status codes:

```typescript
// 201 Created
res.status(201).json(resource);

// 204 No Content
res.status(204).send();

// 400 Bad Request (automatic via ValidationError)
// 401 Unauthorized (automatic via UnauthorizedError)
// 403 Forbidden (automatic via ForbiddenError)
// 404 Not Found (automatic via NotFoundError)
// 409 Conflict (automatic via ConflictError)
```

### 5. Async/Await Pattern

All controller methods should be async and wrapped with `asyncHandler`:

```typescript
// ✅ Correct
router.post(
  "/",
  asyncHandler((req, res) => controller.create(req, res)),
);

// ❌ Avoid
router.post("/", (req, res) => {
  try {
    controller.create(req, res);
  } catch (err) {
    // Manual error handling
  }
});
```

## Controller Examples

### AuthController

Located at `src/controllers/AuthController.ts`

Methods:

- `register(req, res)` - POST /auth/register
- `login(req, res)` - POST /auth/login
- `verifyEmail(req, res)` - POST /auth/verify-email
- `getProfile(req, res)` - GET /auth/profile (requires auth)

### EventsController

Located at `src/controllers/EventsController.ts`

Methods:

- `getAll(req, res)` - GET /events
- `getById(req, res)` - GET /events/:id
- `create(req, res)` - POST /events (admin only)
- `update(req, res)` - PATCH /events/:id (admin only)
- `registerStudio(req, res)` - POST /events/:eventId/studios
- `listStudios(req, res)` - GET /events/:eventId/studios
- `updateRegistration(req, res)` - PATCH /events/:eventId/studios/:studioId/registration
- `cancelRegistration(req, res)` - DELETE /events/:eventId/studios/:studioId/registration

## Testing Controllers

Controllers are easily testable due to separation of concerns:

```typescript
import { AuthController } from "../src/controllers";
import { PrismaClient } from "../generated/prisma/client";

describe("AuthController", () => {
  let controller: AuthController;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    } as any;

    controller = new AuthController(mockPrisma);
  });

  it("should register a new user", async () => {
    const mockReq = {
      body: { email: "test@example.com", password: "secure123" },
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "123",
      email: "test@example.com",
    });

    await controller.register(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalled();
  });
});
```

## Migration Checklist

When converting routes to use controllers:

- [ ] Create controller class extending `BaseController`
- [ ] Move handler logic from route to controller method
- [ ] Replace error handling with proper error types
- [ ] Use error wrapper middleware in controller
- [ ] Update route file to instantiate and delegate to controller
- [ ] Wrap route handlers with `asyncHandler`
- [ ] Remove old error handling code from routes
- [ ] Update controllers/index.ts with new export
- [ ] Test all endpoints
- [ ] Update API documentation

## File Organization

```
src/
├── controllers/               # Business logic orchestration
│   ├── BaseController.ts     # Base class
│   ├── AuthController.ts
│   ├── EventsController.ts
│   ├── StudiosController.ts
│   └── index.ts              # Centralized exports
├── routes/                   # Thin request handlers
│   ├── auth.ts
│   ├── events.ts
│   └── ...
├── services/                 # External service integrations
│   └── storage.ts
├── middleware/               # Express middleware
├── errors/                   # Error classes and handlers
├── utils/                    # Utility functions
├── db/                       # Database setup
└── types/                    # TypeScript types
```

## Key Advantages

✅ **Separation of Concerns** - Routes handle HTTP, controllers handle business logic

✅ **Testability** - Controllers can be tested independently of Express

✅ **Reusability** - Controller logic can be called from multiple routes

✅ **Maintainability** - Business logic is centralized and organized

✅ **Type Safety** - Full TypeScript support with strict mode

✅ **Error Handling** - Consistent error responses with proper HTTP status codes

✅ **Scalability** - Easy to add new endpoints following the pattern
