# Backend controller conventions

Current request flow: versioned router → auth/permission middleware → controller
→ Prisma/provider → explicit shared DTO. Controllers currently call Prisma
directly; a mandatory service/repository layer does not exist.

- [app.ts](../apps/api/src/app.ts): app factory, middleware, /health, /uploads,
  /api/v1, global 404/error handler. No listener or dependency construction.
- [index.ts](../apps/api/src/index.ts): database/storage setup, signals/listener.
- [routes/api.ts](../apps/api/src/routes/api.ts): single resource composition point.
- [BaseController](../apps/api/src/controllers/BaseController.ts): injected
  Prisma, getUserId, isAdmin, getUserPermissions/hasPermission with event scope.
  Inspect helper semantics; they do not establish membership/approval by themselves.

## Changing an operation

1. Check its [API contract](API.md), shared schema and actual controller/router.
2. Parse params/query/body with shared strict schemas; reject unknown mutation
   fields. Derive relationships/scope from stored records and authenticated identity.
3. Check permissions, ownership, approval, stage and active parent/child invariants.
   Admin bypass is operation-specific; it never legitimizes a mismatched parent.
4. Use a transaction for dependent writes and race-sensitive invariants. Map
   selected fields to a DTO and validate serialized output. No raw Prisma response.
5. Throw centralized errors; wrap controller calls with asyncHandler as existing
   routes do. See [error contracts](ERROR_HANDLING.md).
6. Update paired client/schema/coverage and focused HTTP tests. Database behavior
   also needs isolated PostgreSQL preservation/concurrency checks. See [TESTING](TESTING.md).

Use @prisma/client imports and runtime-resolvable relative error imports.
Do not copy removed generated/prisma or @errors paths, invented model fields,
GET-body parsing, unsafe mock casts, or unversioned router mounts.

## Source examples

Read working code rather than maintaining duplicate pseudo-implementations:

| Need | Example |
| --- | --- |
| Strict CRUD / scoped parents / nullable fields | [JudgesController](../apps/api/src/controllers/JudgesController.ts) |
| Atomic application/approval | [StudioRegistrationsController](../apps/api/src/controllers/StudioRegistrationsController.ts) |
| Participant replacement / rollback / archive | [PerformancesController](../apps/api/src/controllers/PerformancesController.ts) |
| Canonical route delegation | [judges router](../apps/api/src/routes/judges.ts) |

Mounted business controller migration is complete for Phase 1. Empty users router
and future scores are not implemented resources; health/static are infrastructure
exceptions. Pending security/domain tasks remain in the [checkpoint](../DEVELOPMENT_PLAN.md).
