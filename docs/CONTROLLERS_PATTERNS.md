# Controller Implementation Patterns

Example implementation patterns for creating new controllers. Use these patterns when migrating remaining routes to the controllers layer.

## Example 1: Simple CRUD Controller

**File:** `src/controllers/StudiosController.ts`

```typescript
import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma/client";
import {
  UpdateStudioBodySchema,
  UpdateRepresentativeBodySchema,
  CreateDancerBodySchema,
  ParamsWithStudioIdSchema,
} from "@dance/schemas";
import { ForbiddenError, NotFoundError } from "@errors";
import { BaseController } from "./BaseController";

export class StudiosController extends BaseController {
  /**
   * Get current user's studios
   * GET /studios
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);

    const studios = await this.prisma.studio.findMany({
      where: {
        representatives: { some: { userId, active: true } },
        deletedAt: null,
      },
      include: { representatives: true, registrations: true },
      orderBy: { name: "asc" },
    });

    res.json(studios);
  }

  /**
   * Get studio by ID
   * GET /studios/:studioId
   */
  async getById(req: Request, res: Response): Promise<void> {
    const params = ParamsWithStudioIdSchema.parse(req.params);
    const userId = this.getUserId(req);

    const studio = await this.prisma.studio.findFirst({
      where: {
        id: params.studioId,
        deletedAt: null,
        representatives: { some: { userId, active: true } },
      },
      include: { representatives: true, registrations: true },
    });

    if (!studio) {
      throw new NotFoundError("Studio", params.studioId);
    }

    res.json(studio);
  }

  /**
   * Update studio details
   * PATCH /studios/:studioId
   */
  async update(req: Request, res: Response): Promise<void> {
    const params = ParamsWithStudioIdSchema.parse(req.params);
    const body = UpdateStudioBodySchema.parse(req.body);
    const userId = this.getUserId(req);

    // Verify access
    const studio = await this.prisma.studio.findFirst({
      where: {
        id: params.studioId,
        representatives: { some: { userId, active: true } },
      },
    });

    if (!studio) {
      throw new ForbiddenError("Access denied");
    }

    const updated = await this.prisma.studio.update({
      where: { id: params.studioId },
      data: {
        name: body.name,
        country: body.country,
        city: body.city,
        directorName: body.directorName,
        directorPhone: body.directorPhone,
      },
      include: { representatives: true, registrations: true },
    });

    res.json(updated);
  }

  /**
   * Add representative to studio
   * POST /studios/:studioId/representatives
   */
  async addRepresentative(req: Request, res: Response): Promise<void> {
    const params = ParamsWithStudioIdSchema.parse(req.params);
    const body = UpdateRepresentativeBodySchema.parse(req.body);
    const userId = this.getUserId(req);

    // Verify owner access
    const studio = await this.prisma.studio.findFirst({
      where: {
        id: params.studioId,
        representatives: { some: { userId, active: true } },
      },
    });

    if (!studio) {
      throw new ForbiddenError("Access denied");
    }

    const representative = await this.prisma.studioRepresentative.create({
      data: {
        studioId: params.studioId,
        userId: body.userId,
        name: body.name,
        email: body.email,
        active: true,
      },
    });

    res.status(201).json(representative);
  }
}
```

## Example 2: Controller with Complex Authorization

**File:** `src/controllers/PerformancesController.ts`

```typescript
export class PerformancesController extends BaseController {
  /**
   * Get all performances for a studio
   * GET /studios/:studioId/performances
   */
  async getPerformances(req: Request, res: Response): Promise<void> {
    const params = ParamsWithStudioAndPerformanceIdSchema.parse(req.params);
    const userId = this.getUserId(req);

    // Check access: user must be studio representative
    const studio = await this.prisma.studio.findFirst({
      where: {
        id: params.studioId,
        representatives: { some: { userId, active: true } },
        deletedAt: null,
      },
    });

    if (!studio) {
      throw new ForbiddenError("You don't have access to this studio");
    }

    const performances = await this.prisma.performance.findMany({
      where: { studioId: params.studioId },
      include: {
        dancers: true,
        danceCategory: true,
        danceFormat: true,
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(performances);
  }

  /**
   * Create performance
   * POST /studios/:studioId/performances
   */
  async create(req: Request, res: Response): Promise<void> {
    const params = ParamsWithStudioIdSchema.parse(req.params);
    const body = CreatePerformanceBodySchema.parse(req.body);
    const userId = this.getUserId(req);

    // Permission check
    if (!this.hasPermission(req, "performance.manage")) {
      throw new ForbiddenError(
        "You don't have permission to create performances",
      );
    }

    // Access check
    const studio = await this.prisma.studio.findFirst({
      where: {
        id: params.studioId,
        representatives: { some: { userId, active: true } },
      },
    });

    if (!studio) {
      throw new ForbiddenError("Access denied to this studio");
    }

    const performance = await this.prisma.performance.create({
      data: {
        studioId: params.studioId,
        danceCategories: body.danceCategories,
        danceFormatId: body.danceFormatId,
        ageGroupId: body.ageGroupId,
        durationMinutes: body.durationMinutes,
        title: body.title,
        description: body.description,
      },
      include: {
        dancers: true,
        danceCategory: true,
        danceFormat: true,
      },
    });

    res.status(201).json(performance);
  }
}
```

## Example 3: Controller with Transaction Management

```typescript
export class JudgesController extends BaseController {
  /**
   * Assign judges to performance
   * POST /events/:eventId/judges
   */
  async assignJudges(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) {
      throw new ForbiddenError("Only admins can assign judges");
    }

    const eventId = this.getEventIdFromParams(req);
    const body = CreateJudgeBodySchema.parse(req.body);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create judge record
      const judge = await tx.judge.create({
        data: {
          eventId,
          name: body.name,
          email: body.email,
          specialization: body.specialization,
        },
      });

      // Assign to categories
      if (body.categoryIds && body.categoryIds.length > 0) {
        await tx.judgeCategory.create({
          data: {
            judgeId: judge.id,
            categoryIds: body.categoryIds,
          },
        });
      }

      return judge;
    });

    res.status(201).json(result);
  }

  private getEventIdFromParams(req: Request): string {
    return req.params.eventId || req.params.id;
  }
}
```

## Example 4: Controller with Custom Query Logic

```typescript
export class DancersController extends BaseController {
  /**
   * Get dancers for studio
   * GET /studios/:studioId/dancers
   */
  async getDancers(req: Request, res: Response): Promise<void> {
    const params = ParamsWithStudioIdSchema.parse(req.params);
    const userId = this.getUserId(req);

    // Verify studio access
    const studio = await this.prisma.studio.findFirst({
      where: {
        id: params.studioId,
        representatives: { some: { userId, active: true } },
        deletedAt: null,
      },
    });

    if (!studio) {
      throw new NotFoundError("Studio", params.studioId);
    }

    // Get dancers with performances
    const dancers = await this.prisma.dancer.findMany({
      where: { studioId: params.studioId },
      include: {
        performances: {
          include: {
            danceCategory: true,
            danceFormat: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    res.json(dancers);
  }

  /**
   * Create dancer
   * POST /studios/:studioId/dancers
   */
  async create(req: Request, res: Response): Promise<void> {
    const params = ParamsWithStudioIdSchema.parse(req.params);
    const body = CreateDancerBodySchema.parse(req.body);
    const userId = this.getUserId(req);

    // Access check
    const studio = await this.prisma.studio.findFirst({
      where: {
        id: params.studioId,
        representatives: { some: { userId, active: true } },
      },
    });

    if (!studio) {
      throw new ForbiddenError("You don't have access to this studio");
    }

    const dancer = await this.prisma.dancer.create({
      data: {
        studioId: params.studioId,
        firstName: body.firstName,
        lastName: body.lastName,
        dateOfBirth: body.dateOfBirth,
        gender: body.gender,
      },
      include: {
        performances: true,
      },
    });

    res.status(201).json(dancer);
  }
}
```

## Example 5: Controller Method Naming Conventions

### Common method naming patterns:

**GET methods:**

- `getAll(req, res)` → GET `/resource`
- `getById(req, res)` → GET `/resource/:id`
- `search(req, res)` → GET `/resource?q=...`
- `getCount(req, res)` → GET `/resource/count`

**POST methods:**

- `create(req, res)` → POST `/resource`
- `import(req, res)` → POST `/resource/import`

**PATCH methods:**

- `update(req, res)` → PATCH `/resource/:id`

**DELETE methods:**

- `delete(req, res)` → DELETE `/resource/:id`
- `deleteMany(req, res)` → DELETE `/resource` (with filters)

**Custom action methods:**

- `approve(req, res)` → POST `/resource/:id/approve`
- `reject(req, res)` → POST `/resource/:id/reject`
- `publish(req, res)` → POST `/resource/:id/publish`

## Migration Checklist

For each remaining route file, follow these steps:

### 1. CREATE CONTROLLER

- Create `src/controllers/{Resource}Controller.ts`
- Extend `BaseController`
- Add JSDoc comments for each method
- Include `req` and `res` parameters
- Throw typed errors (not `sendStatus`/`json`)

### 2. EXTRACT METHODS

- Copy handler logic from route file
- Convert to async methods
- Update expressions to throw errors instead of return responses
- Use TypeScript types for parameters

### 3. PERMISSIONS & ACCESS

- Use `this.isAdmin(req)` for role checks
- Use `this.hasPermission(req, "permission.name")` for fine-grained permissions
- Add early throws for access violations

### 4. UPDATE ROUTE FILE

- Import controller and `asyncHandler`
- Instantiate controller: `new {Resource}Controller(prisma)`
- Replace handlers with: `asyncHandler((req, res) => controller.method(req, res))`
- Remove old error handling code

### 5. EXPORT CONTROLLER

- Add export to `src/controllers/index.ts`
- Update `docs/CONTROLLERS.md` with new controller

### 6. TEST

- Test all endpoints with same behavior
- Verify error responses format
- Check permission enforcement
- Validate status codes

### 7. COMMIT

- Message: `refactor: migrate {Resource} route to controller pattern`
- Include both route and controller changes
