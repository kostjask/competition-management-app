# Phase 0 baseline change review

> Historical evidence. Read only to investigate a past change. Current priority/status:
> [DEVELOPMENT_PLAN](../DEVELOPMENT_PLAN.md); runnable checks: [TESTING](TESTING.md).


Reviewed: 2026-10-23

Base commit: `7dfc5935a365b4de0ff1a28795cca92e2f9bb56b`

This completes the first Phase 0 task: review the existing working tree and split its work into logical review units. The initial inventory contains 23 changed tracked files (including one deletion) and 17 untracked files. The index is empty. These were the proposed commit boundaries at the initial review; the follow-up below records the resulting user-authorized commits. Completing this review does not satisfy the phase's separate requirement to commit validated work in reviewable units.

## Logical change units

Each initial changed path belongs to one unit below. Paths are relative to the repository root. Review and validate prerequisites before committing dependent units. Some existing files combine concerns; the notes identify boundaries that need particular care when preparing commits.

### 1. Database schema and migrations

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260219173645_added_deleted_by_column/migration.sql` (untracked)
- `apps/api/prisma/migrations/20260219175019_studio_approval_status_and_soft_delete_name_rule/migration.sql` (untracked)
- `apps/api/prisma/migrations/20260221223825_add_user_deactivatedby/migration.sql` (untracked)

Adds deletion/deactivation actors, studio approval, performance soft deletion, a renamed registration enum, and the cancelled event stage. Removes unconditional studio-name uniqueness in favor of an active-record partial unique index. The schema also adds `Event.maxPerformances` and changes the client generator.

The migrations sort chronologically and reference objects created by earlier migrations, but they are **not yet validated for application or data preservation**:

- The last migration drops and recreates `StudioEventRegistration.status`, resetting existing approved, rejected, and locked registrations to `PENDING`. Preserve existing values during the enum change before applying it to an existing database.
- No migration adds `Event.maxPerformances`. An empty database built from migration history would therefore differ from the current schema.
- Existing studios receive `approvalStatus = PENDING`; review how previously approved studios should be treated before an upgrade.
- The partial unique index enforces active studio names globally. The controller's availability check optionally filters by country/city, so that precheck can allow a name the database rejects.
- The generator change belongs with the client import/runtime resolution decision in unit 2. Validate generation and imports together before calling either unit buildable.

Next verification: compare the complete migration result with the schema, exercise an existing-registration fixture, then apply migrations to an isolated empty PostgreSQL database. The Phase 0 migration-validation checkbox remains open.

### 2. API client imports and runtime configuration

- `apps/api/tsconfig.json`
- `apps/api/src/controllers/AuthController.ts`
- `apps/api/src/auth/requirePermission.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/utils/stageChecks.ts`

Removes unused imports, introduces `@errors`, changes some Prisma imports to `@prisma/client`, and explicitly disallows edits in ended/cancelled stages. Depends on the generated-client decision in unit 1.

The current tree mixes `@prisma/client` with `../../generated/prisma/client`. The schema now uses `prisma-client-js` with a custom output, while `db/prisma.ts` and `BaseController.ts` still import the old generated `client` entry. The TypeScript paths mapping alone does not establish that generated files or runtime aliases resolve. The API start script invokes Node directly. Generation, compilation, and runtime startup must all be checked after dependencies are restored. Preserve the import and configuration changes as one coordinated repair rather than accepting individual import edits as verified fixes.

### 3. Shared request and domain schemas

- `packages/schemas/src/event.schema.ts`
- `packages/schemas/src/nomination.schema.ts`
- `packages/schemas/src/performance.schema.ts`
- `packages/schemas/src/studio.schema.ts`

Adds cancellation, explicit event/studio/performance parameter schemas, and studio approval validation; removes an unused nomination import. This unit supplies contracts used by units 4-6 and depends on unit 1 for enum compatibility.

`EventIdParamsSchema` changes `id` to `eventId`; keep that change with its controller/route consumers. `PerformanceSchema` changes `id` to `performanceId` while retaining legacy `nominationId`, `participantCount`, and `durationSeconds`. This is not a completed response-contract migration. Verify consumers and serialized responses before adopting it as the canonical DTO.

### 4. Backend controller extraction and business rules

- `apps/api/src/controllers/EventsController.ts`
- `apps/api/src/controllers/StudiosController.ts` (untracked)
- `apps/api/src/controllers/PerformancesController.ts` (untracked)
- `apps/api/src/controllers/index.ts`

Extracts studio logic and starts performance extraction, separates studio approval from registration approval, and adopts the new parameter schemas. Depends on units 1-3; publish the exports together with their implementation files.

Outstanding defects identified during review:

- `PerformancesController.getPerformancesForStudio()` validates a create body on GET and queries by studio participants without filtering the requested event or soft-deleted performances.
- Performance creation checks configuration IDs against the requested event but does not assert that the studio's owning event matches it. Its stage check uses the studio's event and omits the available review-edit override.
- The performance controller has an accidental unused `zod/locales` import and only create/list methods; update/delete remain inline in routes.
- Studio creation in `EventsController` no longer creates an event-registration row, while registration updates use `update`, not `upsert`. Approval and registration creation need one explicit workflow.
- Studio deletion writes `deletedBy`, but permits a representative without a stage check. Its route comment still says admin-only. Admin studio detail includes deleted dancers.
- Controller files introduce `@errors` imports and depend on unit 2's unresolved runtime alias behavior.

These findings are recorded for stabilization; this review does not complete the Phase 1 controller migration or the authorization work.

### 5. Resource route extraction and integration

- `apps/api/src/routes/events.ts`
- `apps/api/src/routes/studios.ts`
- `apps/api/src/routes/dancers.ts`
- `apps/api/src/routes/performances.ts`
- `apps/api/src/routes/users.ts` (untracked, zero bytes)

Moves studio handlers to a controller and dancer/performance handlers to their respective routers. Depends on units 3-4. Keep handler removal and replacement mounts in the same eventual change to avoid losing endpoints.

Current integration blockers:

- `src/index.ts` mounts neither performances nor users. The users file is an empty placeholder, not an implemented router.
- Dancer create/list paths become `/dancers/:studioId/dancers` under the existing mount, while the web client calls `/studios/:studioId/dancers`.
- Performance routes retain two competing path families and duplicate inline update/delete logic, alongside controller create/list handlers. Removing the old studio handlers has already made previously mounted performance operations unreachable.
- Studio creation is routed as `POST /events/:eventId/studios/:studioId/registration`, but its controller creates a studio and ignores the supplied studio ID. The web client still calls `POST /events/:eventId/studios`.
- Studio detail/update/delete live at `/studios/:studioId`; the web client uses event-nested URLs.
- Studio approval declares an `eventId` permission parameter absent from its path. The controller requires admin, but the middleware declaration still misrepresents the scope.

Route integration remains Phase 1 work after the Phase 0 baseline is restored. Do not mount the unfinished performance router as a shortcut to satisfying baseline checks.

### 6. Event UI and frontend cleanup

- `apps/web/src/api/examples.ts` (deleted)
- `apps/web/src/i18n/translations.ts`
- `apps/web/src/pages/Home.tsx`
- `apps/web/src/pages/events/EventForm.tsx`
- `apps/web/src/pages/events/EventInfo.tsx`
- `apps/web/src/pages/events/EventsCreate.tsx`
- `apps/web/src/pages/events/EventsList.tsx`
- `apps/web/src/features/events/hooks/useDateFormatter.ts` (untracked)
- `apps/web/src/features/events/hooks/useStageBadges.ts` (untracked)

Extracts shared date/badge hooks, adds cancelled-stage text in all three languages, corrects a translation import, removes a palindrome debug snippet, and deletes API examples. Depends on unit 3's cancelled-stage union. Include both untracked hook files with their consumers.

The list now defaults to long date formatting, where it previously used medium formatting. The details page retains a commented copy of the old formatter. Event registration/studio links still lack frontend routes. Verify the build/lint baseline before evaluating UI behavior; this extraction does not implement the representative workflow. The unrelated Home cleanup and examples deletion can be separate cleanup commits if desired.

### 7. Development and architecture documentation

- `DEVELOPMENT_PLAN.md` (untracked)
- `docs/CONTROLLERS.md` (untracked)
- `docs/CONTROLLERS_MIGRATION.md` (untracked)
- `docs/CONTROLLERS_PATTERNS.md` (untracked)
- `docs/ENVIRONMENT_CONFIGURATION.md` (untracked)
- `docs/ENV_IMPROVEMENTS_SUMMARY.md` (untracked)
- `docs/ERROR_HANDLING.md` (untracked)
- `docs/ERROR_HANDLING_EXAMPLES.md` (untracked)
- `docs/SETUP_GUIDE.md` (untracked)

Preserves the plan and refactor/setup notes. Controller, configuration, and error guides are useful context, but examples and completion claims need reconciliation with validated behavior in units 1-6. In particular, `ENV_IMPROVEMENTS_SUMMARY.md` claims successful compilation and tests without current verification; configuration documentation describes providers and CORS behavior that the entry point does not activate. Treat those claims as historical until reproduced. Fresh-clone setup documentation remains a separate Phase 0 task.

## Validation and preservation

- Reviewed tracked diffs, untracked implementations and migration SQL, documentation claims, route composition, and relevant callers/configuration.
- Initial inventory: 40 changed paths, assigned once each above. No pre-existing staged changes.
- `git diff --check` reports 16 pre-existing trailing-whitespace errors across dancer, performance, studio routes and `stageChecks.ts`. New untracked files are outside that command's normal coverage; whitespace cleanup remains unchecked.
- SHA-256 comparisons of the initial files and deletion-state checks verify preservation after this documentation update; only `DEVELOPMENT_PLAN.md` is intentionally updated. The Git index and HEAD remain unchanged.
- No application behavior changed in this task. Build, lint, Prisma generation, migration execution, and seed idempotency are not validated by this review and remain open Phase 0 work.

## Next action and phase gate

The original review findings above are retained as the initial snapshot. Follow-up on 2026-10-23: the user confirmed the three untracked migrations are unpublished and disposable. The status migration now renames its enum without dropping data, and a new migration covers `maxPerformances`. Fresh/upgrade PostgreSQL regression checks and schema parity pass; see [migration validation](MIGRATION_VALIDATION.md). Subsequent baseline recovery resolved dependency installation, build/typecheck, Prisma runtime/imports, script coverage, whitespace, empty-database Prisma deployment and seed idempotency; see [baseline validation](BASELINE_VALIDATION.md) for exact scope. Setup/startup is documented in README. The user subsequently authorized commits: database `81257a6`, backend/build `d2d8256`, frontend `18e2089`, and the accompanying documentation commit. The commit checkpoint is satisfied and Phase 0 is complete. Phase 1 starts with ADR-001/002/005; unresolved route/security findings remain open. No branch or push was created.
