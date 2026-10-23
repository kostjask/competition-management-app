# Dance Competition Management System — Development Plan

Last audited: 2026-10-24

This document is the practical source of truth for continuing development. It summarizes the repository as it currently exists, records known inconsistencies, and orders future work so that unfinished refactors are stabilized before new product features are added.

## 1. Product Goal

Replace a manual dance-competition workflow with a role-based web application that supports:

- Event configuration and lifecycle management.
- Studio onboarding, approval, dancers, and performance registration.
- Judge and moderator onboarding.
- Live stage operation and judge scoring.
- Automatic totals, rankings, and published results.
- Estonian, English, and Russian user interfaces.
- Auditable changes and safe event-scoped access.

The intended user roles are:

| Role | Primary responsibilities |
| --- | --- |
| Administrator | Configure events, approve registrations, manage users and roles, publish results. |
| Studio representative | Manage studio details, dancers, music, and performance entries. |
| Judge | View assigned performances and submit scores. |
| Moderator | Control stage flow, monitor judge completion, and resolve operational issues. |

### User experience specification

[User journeys and UX requirements](docs/USER_JOURNEYS.md) defines intended account, application, approval, entry, invitation, and competition-day behavior, current gaps, and acceptance criteria. [Registration workflow](docs/REGISTRATION_API.md) separates account creation, event application, and final entry submission. These documents do not mark runtime features complete or override ADRs.

The first onboarding UX milestone is an account holder who can verify their email, apply to one event, and always find their status and next action. Implement it only after applicable Phase 1–4 prerequisites. Real email delivery is a release gate before external onboarding, despite provider work being grouped in Phase 8.

## 2. Current Technical Baseline

### Monorepo

- Package manager: pnpm workspaces.
- Build orchestration: Turborepo.
- Language: TypeScript 7.0.2 native compiler, with the TypeScript 6 API compatibility package for lint/tooling.
- Applications: `apps/api` and `apps/web`.
- Shared packages: `packages/schemas` and `packages/types`.
- Local database: PostgreSQL 16 through Docker Compose.

### Backend

- Express 5.
- Prisma 7 with PostgreSQL.
- Zod request validation.
- JWT authentication and database-driven roles/permissions.
- Local file-storage abstraction with image upload routes.
- Central error classes and error middleware.
- Controller migration started but not completed.

### Frontend

- React 19, React Router 7, Vite 8, Tailwind CSS 4.
- Context-based authentication and localization.
- Event list, event details, event create, and event edit screens are partly implemented.
- Admin, judge, moderator, and representative sections currently contain placeholder pages.

### Domain models already present

- Event, category, age group, format.
- Studio, representative, event registration, dancer.
- Performance and performance participant.
- User, role, permission, user role, invitation.
- Judge and score.

## 3. What Is Implemented Today

### Working or substantially implemented

- Database schema and migration history for the core entities.
- User registration, verification, login, and profile endpoints.
- Role and permission seeding.
- Event CRUD foundations.
- CRUD foundations for categories, age groups, formats, and judges.
- Studio approval, event-registration, dancer, and performance business rules in progress.
- Event-stage checks for registration data changes.
- Soft-delete fields for studios, dancers, and performances.
- API client wrapper with JWT injection and structured frontend errors.
- Event list/detail/form UI and three-language translation infrastructure.
- Local image storage and upload middleware.
- Environment validation and `.env.example` files.

### Partial or not integrated

- `StudiosController` and `PerformancesController` exist as uncommitted work, but the controller migration is incomplete.
- Performance routes contain both new controller-based handlers and old duplicate inline handlers.
- The performance router is not mounted in the API entry point; `routes/users.ts` is empty and has no router implementation.
- Frontend API modules exist for studios, dancers, and performances, but corresponding screens are absent and several URLs do not match backend routes.
- Auth and invitation routes now use `/api/v1` with explicit protected operations; duplicated invitation paths are removed. Invitation business/security and DTO cleanup remain.
- Email sending is a development stub.
- Storage provider configuration is documented, but the server always instantiates local storage.
- Event images are stored but event screens still render placeholders.

### Not implemented

- Admin event setup wizard.
- Functional representative dashboard.
- Functional judge scoring interface.
- Functional moderator stage controls.
- Scoring rubric/template configuration.
- Live competition stage and performance queue state.
- Score aggregation, validation, ranking, ties, awards, and result publication.
- Music upload and playback workflow.
- WebSocket or other real-time updates.
- Password reset and invitation resend/revoke flows.
- Audit log.
- Comprehensive application/API tests and CI (three API baseline tests plus isolated migration/deployment/seed smoke checks now exist).
- OpenAPI documentation.

## 4. Immediate Problems Found During Audit

These are stabilization blockers. Resolve them before adding major features.

### P0 — Repository and build health

- The unfinished backend refactor and baseline repairs are preserved in logical commits. Route integration and security work remain incomplete.
- Resolved (2026-10-23): frozen dependency installation, Turbo lockfile compatibility, workspace build/typecheck coverage (including the previously unnamed API), baseline tests, web lint, and whitespace checks now pass. See [baseline validation](docs/BASELINE_VALIDATION.md).
- Prisma deployment/redeployment and full-record seed idempotency pass in an isolated empty database; compiled API startup and basic authentication/authorization smoke checks pass.
- The user authorized commits, and the checkpoint is satisfied by the database, backend/build, frontend, and documentation commits. Phase 0 is complete; Phase 1 is active. No push was requested or performed.

### P0 — Route integration and contract mismatches

- `performancesRouter` is not mounted in `apps/api/src/index.ts`. `routes/users.ts` is empty; no `usersRouter` implementation exists to mount.
- Resolved (2026-10-24): dancer collection/item routes now use `/api/v1/studios/:studioId/dancers` and `/api/v1/studios/:studioId/dancers/:dancerId`. Controller checks derive event permissions from the studio, validate ownership/approval/stage and parent relationships, and use shared calendar-date DTOs.
- The frontend calls `/studios/:studioId/performances`, but the performance router is not mounted and contains two competing URL designs.
- Resolved (2026-10-24): studio registration now uses canonical `/api/v1/events/:eventId/studio-registrations` collection/item routes. Creation atomically saves studio, pending registration, and the non-admin applicant membership; approval/cancellation enforce event scope and ownership. Registration client contracts match; remaining studio detail/edit paths are separate work.
- Frontend studio detail/update/delete paths use `/events/:eventId/studios/...`, while the active backend controller exposes `/studios/...` for those operations.
- Event detail links point to `/events/:id/register` and `/events/:id/studio`, but neither frontend route exists.
- Event reads intentionally remain authenticated per ADR-002. Versioned resource middleware replaces the former global authentication mount; public event DTO/publication policy is deferred.

### P0 — Authorization and security

- `useRole()` compares requested role keys such as `representative` with the role display name such as `Studio Representative`; role-gated UI can fail.
- `RequireRole` separately uses fuzzy display-name matching. Frontend role checks need one key-based implementation.
- Image upload endpoints verify resource existence but not ownership or resource-specific permissions. Any authenticated user can currently target arbitrary event, user, dancer, or studio IDs.
- CORS is hardcoded to `*` even though validated CORS configuration exists.
- Rate-limit settings exist but no rate limiter is installed or used.
- Authentication middleware does not verify that the user still exists, is active, or is email-verified on each authenticated request.
- `DEV_AUTH` uses a synthetic user ID that can fail when handlers write audit/ownership fields requiring a real user.
- Invitation responses still expose raw tokens. Resolved (2026-10-24): invitation signing now uses centralized JWT configuration.

### P0 — Backend refactor defects

- `PerformancesController.getPerformancesForStudio()` parses a create-performance request body on a GET request.
- The same controller contains an accidental `zod/locales` import and incomplete method coverage.
- Performance route logic is duplicated, making fixes likely to diverge.
- Error handling is inconsistent: some modules throw typed errors, while others return raw Zod errors, empty `sendStatus` responses, or local ad-hoc JSON.
- Resolved during baseline recovery: all API Prisma imports now use the standard generated `@prisma/client` entry, and error imports resolve at compiled runtime.
- Several handlers use `any` or unsafe casts despite the repository's strict type-safety goal.
- Soft deletes are inconsistent: some delete routes hard-delete, some return the deleted row, and `deletedBy` is not consistently written.

### P1 — Data-contract inconsistencies

- Frontend event types expect `updatedAt`, but the Event model has no `updatedAt` field.
- Frontend studio, dancer, and performance types expect timestamps that their Prisma models do not define.
- Event create/update schemas only accept name, dates, and stage, while the database and UI expect venue, location, description, limits, and image data.
- Shared `packages/types` performance fields (`nominationId`, `participantCount`, `durationSeconds`) do not match the Prisma Performance model (`categoryId`, participant relation, `durationSec`).
- Shared schemas contain both current and legacy naming (`nomination` versus category).
- API response types are duplicated manually in the frontend instead of being derived from shared contracts.
- Resolved during baseline recovery: web API fallback/example and root setup now consistently use port 4000. Historical endpoint guides still need reconciliation.

### P1 — Domain-model decisions required

- A Studio currently belongs directly to one Event and also has a StudioEventRegistration join model. This prevents a studio identity from cleanly registering for multiple events and duplicates event ownership.
- The documented lifecycle includes a live event, but `EventStage` has no explicit live/running stage.
- Score uses a free-form `criterion` string; there is no rubric, criterion weight, score range, judge assignment, score lock, or submission state.
- Performance scheduling only has a unique `orderOnStage`; there is no stage, session, scheduled time, queue state, pause/skip state, or conflict model.
- No audit-log entity exists despite auditability being a stated product requirement.
- Nullable event scope in compound user-role and invitation uniqueness relies on unsafe Prisma casts and needs database-level verification.

### P1 — Onboarding and workflow gaps

- Registration copy promises immediate login, while the intended journey requires email verification; login currently does not enforce verification. Align instructions and backend enforcement in Phase 2.
- Verification navigates to the homepage and loses the selected event. Safe return destinations and recoverable progress must survive authentication, email verification, and session expiry.
- New applicants have active studio membership but no representative role until event approval. Their application home must not require that role; API ownership checks still apply.
- Event details offer new registration during `DATA_REVIEW`, which the backend rejects. Apply actions must match backend stage rules.
- Invitation emails point to the missing `/accept-invitation` page. External onboarding is blocked until email delivery and recovery work.
- Durable drafts, submission/receipts, retry idempotency, concurrent editing, and correction requests need explicit state/permission decisions before dependent UI. They are not existing registration status meanings.

### P1 — Documentation drift

- Resolved during baseline recovery: root README describes React 19, actual directories, current maturity, prerequisites, setup/start commands, and validation scope.
- The web README is still the default Vite template.
- Registration workflow documentation now distinguishes current contracts from planned UX. Storage, environment, controller, and error guides still include claims or endpoints that no longer match the code.
- Several markdown files contain mojibake characters and should be normalized to UTF-8.
- Historical documentation claims remain unverified outside the maintained validation reports. Current build, typecheck, web lint, three Node tests, and isolated migration/deployment/seed checks passed on 2026-10-23.

## 5. Architecture Decisions

ADR-001, ADR-002, and ADR-005 were accepted on 2026-10-23; their linked records govern Phase 1 stabilization and the later studio migration. They describe target behavior, not completed runtime changes. Record ADR-003 and ADR-004 before implementing their dependent features.

### ADR-001: Studio identity and event registration

Accepted: [ADR-001: reusable studio identity and event registration](docs/adr/001-studio-identity-and-event-registration.md). Make Studio global and reusable across events; retain the existing organization approval gate separately from event approval.

- Remove `eventId` from Studio.
- Keep the many-to-many relationship through StudioEventRegistration.
- Scope event-specific approval/edit permissions to StudioEventRegistration.
- Preserve organization-level studio approval as the existing moderation gate; it never substitutes for event registration approval.
- Migrate existing data before deleting the field.

Alternative: if each event intentionally owns a separate studio record, remove StudioEventRegistration and simplify the model. Do not keep both concepts without explicit semantics.

### ADR-002: Canonical API shape

Accepted: [ADR-002: canonical API paths](docs/adr/002-canonical-api-paths.md). The complete path/method inventory, authentication boundaries, and staged rollout are in the ADR. Target resource layout:

```text
/api/v1/auth/*
/api/v1/events
/api/v1/events/:eventId
/api/v1/events/:eventId/categories
/api/v1/events/:eventId/age-groups
/api/v1/events/:eventId/formats
/api/v1/events/:eventId/studio-registrations
/api/v1/studios/:studioId
/api/v1/studios/:studioId/dancers
/api/v1/events/:eventId/performances
/api/v1/events/:eventId/judges
/api/v1/events/:eventId/scores
```

- Pick nested routes where the parent scope is required for authorization.
- Use one canonical endpoint per operation.
- Mount all routers explicitly in one route-composition module.
- Generate OpenAPI from the same schemas or test the route contract directly.

### ADR-003: Event lifecycle

Recommended lifecycle:

```text
DRAFT -> PRE_REGISTRATION -> REGISTRATION_OPEN -> DATA_REVIEW
      -> SCHEDULED -> LIVE -> FINALIZED -> ENDED
```

- Allow `CANCELLED` from any pre-ended state.
- Define transition rules instead of allowing arbitrary enum updates.
- Define exactly which actions are allowed in each stage.
- Decide whether results can be corrected after finalization and how corrections are audited.

### ADR-004: Scoring model

At minimum define:

- ScoringTemplate per event or category.
- ScoringCriterion with label, order, minimum, maximum, step, and weight.
- JudgeAssignment to event/category/performance scope.
- ScoreSheet or ScoreSubmission with draft/submitted/locked states.
- Individual criterion values and optional comments.
- Aggregation rule, dropped scores, tie-breaking, penalties, disqualification, and rounding.
- Result publication state separate from score entry.

### ADR-005: Shared contracts

Accepted: [ADR-005: shared API contracts](docs/adr/005-shared-api-contracts.md).

- Keep Zod schemas in `packages/schemas` as request/response contract definitions.
- Infer TypeScript types from Zod rather than manually duplicating shapes.
- Keep domain-independent helpers in `packages/types` only if they cannot be inferred.
- Define serialized API DTOs explicitly; do not expose Prisma records accidentally.
- Standardize ISO date strings at the HTTP boundary.

## 6. Delivery Plan

### Phase 0 — Preserve and restore the development baseline (complete)

Goal: obtain a reproducible, buildable checkout without losing current work.

- [x] Review the current Git diff and split it into logical changes: migrations, controller refactor, route changes, shared schemas, and event UI. See [baseline change review](docs/BASELINE_CHANGE_REVIEW.md) for file groups, dependencies, and blockers; existing edits are preserved in logical commits.
- [x] Confirm the three untracked migrations are valid and ordered correctly. Repaired the unpublished status-resetting migration, added the missing `Event.maxPerformances` migration, and verified fresh SQL application, existing-data preservation, partial uniqueness, and schema parity. See [migration validation](docs/MIGRATION_VALIDATION.md).
- [x] Run `pnpm install --frozen-lockfile`; repair lockfile/workspace dependency consistency deliberately. Explicit build approvals and Turbo 2.11.10 restore compatibility with the preserved pnpm 12 lockfile.
- [x] Generate the Prisma client from the configured schema (`pnpm.cmd db:generate` passed). Standard `@prisma/client` imports and compiled API runtime are verified.
- [x] Add missing workspace scripts for `build`, `typecheck`, `lint`, and `test` where applicable. All workspaces build/typecheck; web lint and three Node API tests run. Seed has its own strict typecheck; no placeholder scripts were added.
- [x] Make root Turbo tasks match actual package scripts.
- [x] Run formatting or remove current whitespace errors. Prisma formatted; `git diff --check` passes.
- [x] Verify Docker PostgreSQL startup and migration application from an empty database. Isolated Prisma deploy/redeploy verifies migration bookkeeping and compiled API startup.
- [x] Verify seed idempotency. Transactional demonstration seed preserves full records, edited approvals/locks/configuration and credentials on rerun; production mode is rejected.
- [x] Capture exact local startup commands in the root README.
- [x] Commit validated work in reviewable units before broad refactoring. Explicitly authorized by the user; database `81257a6`, backend/build `d2d8256`, frontend `18e2089`, and the accompanying documentation commit.

Exit criteria:

- Fresh clone setup is documented and reproducible.
- `pnpm build`, `pnpm typecheck`, and `pnpm --filter web lint` complete successfully.
- Prisma validation, migration, generation, and seed commands work.
- Current work is committed in reviewable units before broad refactoring.

Progress (2026-10-23): all technical Phase 0 tasks pass; see [baseline validation](docs/BASELINE_VALIDATION.md) and [migration validation](docs/MIGRATION_VALIDATION.md). Existing work is preserved. Frozen installation, all-workspace build/typecheck, web lint, three API tests, Prisma validate/generate/format, isolated empty-database deployment/redeployment, full-record seed idempotency, compiled API health/login/profile and basic access-denial checks are verified. Setup is documented in README. The user authorized commits and the commit checkpoint is satisfied; Phase 0 is complete and Phase 1 is active. ADR-001/002/005 are now accepted. Versioned composition/app construction is now implemented for previously active routers. Canonical studio registration is now implemented. Dancer route integration is now complete. Next concrete action: canonical event-scoped performance routes with controller/duplicate/authorization repairs and matching contracts/tests. Existing studio approval defaults to `PENDING` and still requires operational review before a real upgrade; concurrent seeding and full endpoint authorization coverage are not claimed.

### Phase 1 — Stabilize API contracts and finish the backend refactor (active)

Goal: one coherent backend architecture and a frontend client that matches it.

- [x] User-requested prerequisite before Phase 1 implementation: update all external dependency declarations to verified latest stable releases, regenerate the lockfile/client, apply TypeScript 7 and lint compatibility changes, and validate the baseline. See [stable dependency refresh](docs/DEPENDENCY_UPDATES.md). Prisma 8 RC is deliberately excluded; TypeScript compiler/API aliases follow the official compatibility setup. ADR prerequisites, versioned composition, and canonical studio registration are now complete; dancer routes are complete; next is performance route integration.

- [x] Decide and document ADR-001, ADR-002, and ADR-005. Accepted reusable studio identities with separate organization/event approval, one versioned API layout, and shared Zod transport contracts with explicit DTO serialization. Runtime/schema migration remains in the tasks below.
- [x] Add an `/api/v1` composition module and testable app factory, mount each previously active router exactly once, and attach explicit auth/invitation public/protected boundaries. Update the web base URL, examples, and compiled-server smoke check. Eight new HTTP tests verify mounts and access boundaries; [current API status](docs/API.md) lists remaining resource-specific repairs.
- [ ] Finish resource integration under ADR-002 after the following registration/dancer/performance repairs; mount the performance router only after its duplicate/controller/authorization defects are resolved. `users.ts` is empty: user management remains explicitly deferred.
- [x] Resolve studio registration URLs and atomically create studio/pending registration/applicable membership. Dedicated controller, strict shared input and serialized response schemas, runtime-validated frontend registration helpers, admin approval with transactional role assignment, and pending-only cancellation are implemented. Eight new HTTP tests plus isolated PostgreSQL workflow/rollback checks pass. Existing-studio reuse and legacy backfill remain Phase 3 work.
- [x] Resolve dancer mount paths under `/api/v1/studios/:studioId/dancers`, including detail GET and studio-scoped item writes; shared schemas, client validation, event/global permissions, ownership/approval/stage checks, global errors, and audited soft deletion are implemented and tested.
- [ ] Resolve canonical event-scoped performance mount paths with controller/duplicate/authorization repairs and matching frontend contracts/tests.
- [ ] Remove duplicate performance handlers.
- [ ] Complete controllers for studios, performances, judges, categories, formats, age groups, invitations, images, and users—or explicitly decide that simple CRUD remains in routes.
- [ ] Ensure routes only compose middleware and controller calls.
- [ ] Standardize all validation with shared Zod schemas.
- [ ] Standardize all errors through the global error handler.
- [ ] Replace `any` and unsafe compound-key casts where possible (mixed Prisma imports were resolved during Phase 0).
- [ ] Add explicit API response DTO schemas for auth, events, studios, dancers, and performances. Registration/studio-summary and dancer DTOs are complete; full studio detail and the other resource DTOs remain.
- [ ] Align frontend API modules with canonical routes and DTOs. Registration and dancer helpers now use shared inferred contracts and runtime response validation; studio-detail/performance helpers remain.
- [ ] Remove legacy nomination/performance types or migrate them to current terms.
- [ ] Add request-level API integration tests for every mounted route. Canonical studio registration and dancers have HTTP and isolated PostgreSQL workflow coverage (including registration rollback and dancer audit/archive checks); broader operation-level coverage remains.

Exit criteria:

- No duplicate or unreachable handlers.
- Frontend client paths match integration-tested backend paths.
- All responses use one error envelope.
- TypeScript strict mode passes without `any` in application code unless documented.

Progress (2026-10-23, architecture decisions): ADR-001/002/005 are accepted and cross-checked against Prisma, controllers, route mounts, shared schemas, and web clients. This documentation-only task changes no runtime behavior or database model. Newly confirmed gaps: studio creation omits registration in both branches; the users route file is empty; invitation public-path predicates disagree with mounted paths. Multi-event roster/lock policy remains a Phase 3 migration prerequisite. Validation passed: `pnpm.cmd test` (Turbo cached API result), fresh `pnpm.cmd --filter api test` (7/7), `pnpm.cmd typecheck`, `pnpm.cmd lint`, `pnpm.cmd build` (Turbo cache used), `pnpm.cmd db:validate`, `pnpm.cmd db:generate`, Prisma `format --check`, local ADR-link checks, and `git diff --check`. No migration/integration database rerun was needed for documentation-only changes. Phase 1 remains active.

Progress (2026-10-24, versioned composition): `createApp(prisma)` constructs the application without starting a server or initializing a database/storage provider; startup remains in `index.ts`. `routes/api.ts` composes previously mounted routers once under `/api/v1`; authentication and handlers share the injected database client. Invitation list/create and auth profile attach authentication directly, while public auth/invitation operations use their concrete routes. Retired URLs return 404; health/static uploads remain at root. Web base URL/examples and the compiled smoke check follow the prefix. The original broad mount item is split so unfinished performance integration is not marked complete. No Prisma schema or migrations changed. Validation passed: fresh API tests (15/15, including 8 new HTTP tests), root test, all-workspace typecheck/build, web lint, Prisma validate/generate/format check, isolated database deployment/seed/compiled API smoke check, local documentation links, and `git diff --check`. The smoke check initially hit sandbox Docker access denial, then passed with approved Docker access and cleaned up its fixture. Existing web `.env` overrides need `/api/v1` and a Vite restart; remaining studio/dancer/performance client paths, upload ownership, auth hardening, invitation errors/tokens, and full operation-level authorization coverage are not claimed. That next task is now implemented; the following progress entry records its scope and next action. Phase 1 remains active.

Progress (2026-10-24, studio registration): canonical GET/POST collection and PATCH/DELETE item routes now use `StudioRegistrationsController`; duplicate legacy handlers were removed from events. Authenticated roleless applicants can create their own active membership and pending organization/event registration atomically. Admin creation preserves its ownership behavior (no representative membership) and pending defaults. List/cancel require active membership or admin; event/studio mismatch and soft deletion are checked. Admin-only approval requires organization approval and an existing registration, assigning event roles in the same transaction without unsafe compound-key casts. Cancellation checks pending status again in a conditional delete and retains the studio. Shared strict inputs and explicit registration/studio-summary DTOs align the frontend registration helpers; unrelated studio detail helpers remain deferred. Existing legacy studios without registrations are not silently backfilled, POST is not idempotent, and multi-event reuse remains blocked on Phase 3 migration. No database schema or migrations changed. Validation: build, typecheck, lint, fresh API tests (23/23), Prisma validate/generate/format check, and isolated migration/seed/compiled HTTP registration checks passed, including nested-write rollback, approval/role rollback, cross-event contradictions, active/deleted records, and repeat-approval role idempotency. Root `pnpm.cmd test`, local documentation links/UTF-8/new-file whitespace checks, and final `git diff --check` also passed. Broader auth/upload hardening, operation-wide concurrency coverage, and idempotent registration retries remain deferred. That dancer task is now implemented; the next progress entry records the completed slice and next action. Phase 1 remains active.

Progress (2026-10-24, dancer integration): canonical studio-nested GET/POST collections and GET/PATCH/DELETE items use `DancersController`; legacy dancer handlers/mounts were replaced. Non-admins need event-derived or global `dancer.manage`, active ownership, organization approval, and the matching approved registration. Reads remain available during stage locks; writes follow existing stage/review rules. Admin bypass still requires active records and correct parent relationships. Strict shared inputs accept valid calendar-only birth dates, trim names, and reject spoofed/empty updates. Explicit DTOs and frontend runtime validation remove invented timestamps and private storage paths. New dates persist at UTC midnight; existing timestamps remain untouched and serialize their UTC day. Transactional writes and audited soft deletion retain rows/relations. No model/migration changes. Validation passed: build, typecheck, lint, fresh API tests/root test (30/30, including 7 new dancer HTTP tests), Prisma validate/generate/format check, and isolated migration/seed/compiled HTTP registration+dancer workflows. Database checks cover real event/global permission scope, cross-studio denial even for admins, inactive membership, approval/status gates, review/stage behavior, legacy time preservation, and audited archive visibility. Final local documentation links/anchor, UTF-8/new-file whitespace, and `git diff --check` passed. Full concurrent-update coverage, restore workflows, historical timezone corrections, upload authorization, and multi-event roster policy remain deferred. Next concrete task: canonical event-scoped performance routes, completing the controller and removing duplicate handlers with ownership/participant/event validation and matching shared/frontend contracts/tests. Phase 1 remains active.

### Phase 2 — Authentication, authorization, and security foundation

Goal: trustworthy event-scoped access before exposing management features.

- [ ] Use role keys, not display names, everywhere in frontend and backend checks.
- [ ] Return permissions and event scopes in the profile DTO if the UI needs permission-aware controls.
- [ ] Unify `RoleGate` and route guard behavior around one authorization helper.
- [ ] Define global versus event-scoped role semantics and test admin bypass explicitly.
- [ ] Verify active user and email-verification status in authentication middleware.
- [ ] Replace synthetic development auth with a seeded development user or a safe request-scoped fixture.
- [ ] Protect all upload routes with resource-specific permission and ownership checks.
- [ ] Use configured CORS origins and reject unsafe production configuration.
- [ ] Add security headers and rate limiting, especially for login, registration, verification, invitation, and upload routes.
- [ ] Add login throttling and generic credential errors.
- [ ] Stop returning invitation tokens outside development/test.
- [ ] Add password reset, invitation resend/revoke, and token-expiry tests.
- [ ] Add verification resend and a defined mistyped-email correction flow with throttling, safe account-recovery responses, invalid/used-link handling, and aligned ET/EN/RU account instructions.
- [ ] Define and implement validated internal return destinations through sign-in, registration, verification, and session expiry, including email tab/device fallback; never expose credentials in redirect URLs.
- [ ] Harden invitation acceptance for new/existing accounts and wrong-account sessions; prevent credential resets or role duplication on repeated acceptance. Add `/accept-invitation` UI with expiry/revoke/resend recovery after backend checks.
- [ ] Decide whether JWT remains in localStorage or moves to secure same-site cookies; document the threat model.

Exit criteria:

- Authorization matrix tests cover each role and event scope.
- A user cannot read or modify another event/studio through ID substitution.
- Security-sensitive routes have rate limits and consistent audit events.

### Phase 3 — Correct and harden the data model

Goal: support the full competition workflow without accumulating incompatible migrations.

- [ ] Implement ADR-001 with preservation/backfill tests and a new migration. Before enabling multi-event reuse, define global studio/dancer edit behavior across event locks and historical performances; audit contradictory registrations/participant relationships before removing `Studio.eventId`.
- [ ] Add missing timestamps consistently (`createdAt`, `updatedAt`) to mutable entities.
- [ ] Audit the intended timezone/calendar interpretation of legacy dancer birth timestamps before any data conversion; current dancer DTOs expose their UTC calendar day and do not rewrite stored values.
- [ ] Add referential actions intentionally for every relationship.
- [ ] Decide restore behavior for soft-deleted records and enforce `deletedAt: null` in standard queries.
- [ ] Populate `deletedBy`/`deactivatedBy` consistently and model actor relations if useful.
- [ ] Add AuditLog with actor, action, entity type/id, event id, timestamp, and safe metadata.
- [ ] Add lifecycle transition validation and an explicit live stage.
- [ ] Define draft/final-submission/receipt and correction state in the lifecycle specification before Phase 5: server-backed persistence, retry idempotency (including application creation), concurrent edits, lock/reopen scope and expiry, withdrawal/resubmission, and historical snapshots. Keep these separate from organization/event approval statuses.
- [ ] Define event timezone, age-calculation policy, registration/entry/music deadlines, and required music rules for Phase 4 configuration and Phase 5 validation.
- [ ] Design scoring, judge assignment, schedule/session/stage, penalty, and publication entities.
- [ ] Design music-file metadata and upload ownership; do not store large media in PostgreSQL.
- [ ] Add indexes for event-scoped lists, active soft-delete filters, participant lookups, stage order, and score aggregation.
- [ ] Verify nullable unique constraints for UserRole and Invitation directly in PostgreSQL.
- [ ] Add database-level constraints for date ranges, score ranges where practical, and valid participant/duration limits.

Exit criteria:

- Migrations apply cleanly from zero and against a representative existing dataset.
- Core invariants are enforced by database constraints plus application validation.
- The schema supports the agreed scoring and live-operation workflows.

### Phase 4 — Admin event setup

Goal: administrators can prepare a complete event without direct database access.

- [ ] Replace the placeholder admin dashboard with event status and action queues.
- [ ] Expand event create/edit to venue, country, city, description, limits, image, timezone, and registration deadlines.
- [ ] Build category, age-group, format, and scoring-template CRUD screens.
- [ ] Validate overlapping age groups and format participant/duration limits.
- [ ] Build judge/moderator invitation and assignment screens.
- [ ] Build studio and event-registration approval queues with separate organization/event decisions, next-action ownership, safe reasons/contact details, and correction-request scope/deadlines under the Phase 3 specification.
- [ ] Prioritize pending reviews, corrections, incomplete entries, and missing music on the event dashboard; add an actionable setup checklist before opening registration.
- [ ] Add event lifecycle transition controls with warnings and prerequisites.
- [ ] Add schedule generation/editing and conflict reporting.
- [ ] Add admin preview of representative, judge, and moderator views.

Exit criteria:

- An admin can configure a new event from empty database state through “registration open.”
- Invalid lifecycle transitions and incomplete configurations are blocked with actionable errors.

### Phase 5 — Studio representative workflow

Goal: a representative can complete registration without staff intervention except approval.

- [ ] Add missing `/events/:id/register` and `/events/:id/studio` routes and UI using canonical contracts; registration availability must match backend stage rules.
- [ ] Build “My applications” for authenticated users without requiring a representative role; show only authorized memberships, separate approval statuses, next actions, pending cancellation, and organizer contact.
- [ ] Preserve selected event/studio and use distinct account/application/entry labels throughout onboarding; prefill profile contact data and postpone optional details.
- [ ] Build a resumable entry checklist with server-backed draft/save/error states and session/network recovery under the Phase 3 specification. Reconcile uncertain creation outcomes instead of blindly repeating non-idempotent POSTs.
- [ ] Support selecting an existing owned studio and roster only after ADR-001 migration and cross-event lock/history rules; never auto-merge by name.
- [ ] Build studio profile create/edit and representative-management screens.
- [ ] Show studio and event-registration approval statuses separately as required by ADR-001; distinguish approval from submission and editing locks.
- [ ] Build dancer list, create, edit, archive, restore, and optional CSV import.
- [ ] Build performance create/edit/archive with category, age group, format, participants, duration, and title.
- [ ] Calculate age eligibility using the event's declared age-calculation date and policy.
- [ ] Enforce format participant count and maximum duration in shared validation and backend transactions.
- [ ] Add music upload, replacement, validation, and playback preview with upfront limits, progress/retry states, and preservation of the previous file on replacement failure.
- [ ] Add registration summary, field-linked validation checklist, explicit final submission/lock confirmation, idempotent receipt, and scoped correction/resubmission flow under the Phase 3 specification.
- [ ] Clearly display stage-based editing restrictions and admin-granted review exceptions.

Exit criteria:

- A representative can register a studio, dancers, performances, and music end-to-end.
- Invalid dancers, formats, durations, or cross-studio participants cannot be submitted.
- Review locking and permitted corrections are integration-tested.
- A roleless applicant can find their application status and next action; saved progress survives returning later, and network/session/stage changes never falsely report successful saves.
- Journey acceptance criteria in `docs/USER_JOURNEYS.md` pass for the delivered scope in ET/EN/RU with keyboard and mobile use.

### Phase 6 — Live competition operations and judging

Goal: run a competition safely under time pressure.

- [ ] Implement ADR-003 and ADR-004.
- [ ] Build moderator performance queue with ready/on-stage/completed/skipped/withdrawn states.
- [ ] Add stage/session filtering and conflict warnings.
- [ ] Build a touch-friendly judge screen showing current performance, rubric, score ranges, autosave status, and submission lock.
- [ ] Prevent judges from scoring unassigned performances or viewing prohibited peer scores.
- [ ] Add draft autosave and explicit final submission.
- [ ] Show moderator judge-completion status without exposing scores prematurely.
- [ ] Add controlled reopen/correction flow with audit records.
- [ ] Add real-time updates using WebSocket or Server-Sent Events only after transactional HTTP workflows are reliable.
- [ ] Define offline/reconnect behavior for unstable venue networks: distinguish local drafts from server-acknowledged saves/submissions, reconcile pending work, and prevent duplicate score/stage actions. Do not promise offline support before its policy exists.
- [ ] Add operational health indicators and a manual fallback/export procedure.

Exit criteria:

- A moderator can advance the queue and every assigned judge receives the correct current performance.
- Score submissions are idempotent, validated, recoverable after reconnect, and auditable.
- Concurrent updates are tested.

### Phase 7 — Results, rankings, and publication

Goal: produce trustworthy results immediately after scoring.

- [ ] Implement weighted totals, penalties, dropped scores, rounding, and tie-break rules from the approved scoring specification.
- [ ] Version calculation rules per event so historical results remain reproducible.
- [ ] Add provisional results for admins and finalized results for public viewing.
- [ ] Add ranking by category, age group, and format.
- [ ] Add disqualification/withdrawal handling.
- [ ] Add result correction workflow with reason and audit trail.
- [ ] Export result sheets and protocols to CSV/PDF.
- [ ] Add public event results pages with publication controls.

Exit criteria:

- Golden test fixtures prove ranking calculations and tie cases.
- Published results can always be reproduced from stored submissions and rule versions.

### Phase 8 — External services and media hardening

Goal: move development-only integrations to production-ready providers.

- [ ] Introduce an EmailProvider interface and implement the chosen provider.
- [ ] Add ET/EN/RU email templates for verification/resend, invitations, password reset, registration decisions/corrections, and schedule changes, preserving the intended event/next action without exposing private data.
- [ ] Define delivery failure/retry behavior and verify real verification/invitation/recovery delivery before external onboarding; in-app application status remains available independently of email.
- [ ] Select local versus object storage through validated configuration.
- [ ] Implement S3-compatible private storage with signed URLs for music and appropriate public/private policy for images.
- [ ] Validate MIME type from content, not only the client header; add size limits and safe filenames.
- [ ] Make file/database replacement transactional or compensating so failures do not orphan files or erase working references.
- [ ] Add background cleanup for orphaned files and expired tokens.
- [ ] Add upload and email integration tests using local fakes.

Exit criteria:

- Production configuration fails fast when provider-specific variables are missing.
- Media access follows resource permissions and failed updates do not lose the previous file.

### Phase 9 — Quality, observability, and deployment

Goal: make releases repeatable and operations diagnosable.

- [ ] Add Vitest unit tests for domain rules and controller/service tests.
- [ ] Add API integration tests against an isolated PostgreSQL database.
- [ ] Add React Testing Library tests for critical forms and role gates.
- [ ] Add Playwright end-to-end tests for admin setup, representative registration, judging, and result publication.
- [ ] Add CI for install, format check, lint, typecheck, Prisma validation, migration test, unit/integration tests, and production builds.
- [ ] Add structured logging with request/correlation IDs and secret/PII redaction.
- [ ] Add health, readiness, and database/storage dependency checks.
- [ ] Add error monitoring and basic metrics.
- [ ] Create production Dockerfiles and a deployment architecture.
- [ ] Add database backup, restore, retention, and disaster-recovery procedures.
- [ ] Review GDPR/privacy requirements for birth dates, photos, contact details, and retention.
- [ ] Run accessibility, responsive-layout, and localization reviews against journey criteria: semantic forms, field-linked errors, announced save/status changes, visible focus, keyboard-only completion, mobile/tablet layouts, and ET/EN/RU including authentication and emails.
- [ ] Define release checklist, migration rollback strategy, and operational runbook.

Exit criteria:

- CI blocks broken contracts, migrations, type errors, and critical E2E regressions.
- A documented deployment and rollback can be rehearsed in staging.

## 7. Recommended Test Strategy

### Unit tests

- Event lifecycle transitions.
- Stage-based editing permissions.
- Age calculation and age-group eligibility.
- Format participant and duration validation.
- Score range, weighting, rounding, dropped-score, and tie-break rules.
- Permission aggregation across global and event-scoped roles.

### API integration tests

- Auth registration, verification, login, deactivation, and password reset.
- Role/permission matrix for every mutating endpoint.
- Studio registration and approval workflow.
- Cross-event and cross-studio ID substitution attempts.
- Dancer and performance transactions.
- Invitation lifecycle.
- Score draft, submit, lock, reopen, and concurrent update behavior.
- Soft delete and restore behavior.
- Upload authorization and failure compensation.

### End-to-end tests

1. Admin creates and configures an event.
2. Representative registers a studio and is approved.
3. Representative adds dancers, performances, and music, then submits registration.
4. Admin reviews data, schedules performances, and opens the live stage.
5. Moderator advances the queue.
6. Judges submit complete score sheets.
7. Admin reviews, finalizes, and publishes rankings.

Journey regression scenarios: roleless application tracking; safe return after email verification; expired/used invitation and wrong-account acceptance; uncertain create/submit responses; saved progress after session expiry; stage/deadline changes during editing; concurrent changes; correction scope/expiry; keyboard-only and ET/EN/RU completion. Add checks with the owning feature phases rather than postponing all verification to Phase 9.

## 8. Documentation Plan

- [x] Rewrite the root README as the short entry point: product, prerequisites, startup, scripts, architecture links, and current maturity.
- [x] Add [user journeys and UX requirements](docs/USER_JOURNEYS.md) with implementation gaps, target steps, approval explanations, recovery/notification behavior, acceptance criteria, and decision/dependency gates. Rewrite the registration guide around current contracts and link maintained guides from README/API.
- [ ] Replace the default web README with frontend-specific setup and conventions.
- [ ] Add `docs/ARCHITECTURE.md` with application boundaries and request/data flow.
- [ ] Add `docs/DOMAIN.md` with lifecycle, roles, registration, scoring, and ranking rules.
- [x] Add `docs/API.md` with current versioned integration status, authentication boundaries, remaining path repairs, and validation scope.
- [ ] Expand the maintained API reference as resources migrate; add generated OpenAPI instructions later.
- [ ] Add `docs/SECURITY.md` with authorization model and data-handling rules.
- [ ] Add `docs/TESTING.md` and `docs/DEPLOYMENT.md`.
- [x] Add ADR-001, ADR-002, and ADR-005 for studio identity, canonical paths, and shared contracts.
- [ ] Add ADR-003 and ADR-004 for lifecycle and scoring before their dependent implementation.
- [ ] Mark implementation summaries as historical or delete them after their useful content is merged into maintained guides.
- [ ] Correct endpoint examples, ports, framework versions, file trees, and build/test claims.
- [ ] Normalize all markdown to UTF-8.

Documentation progress (2026-10-24, user journeys): added the UX specification, replaced obsolete registration/invitation examples with current API boundaries, and mapped follow-up work to Phases 2–9. No runtime behavior, approval semantics, schema, or phase completion changed. Public discovery, submission/correction state, cross-event reuse, and production email remain gated above. Documentation checks cover local links, UTF-8, and whitespace; runtime validation is not implied. Next concrete implementation task remains Phase 1 canonical event-scoped performance integration with authorization, shared contracts, and tests.

## 9. Suggested Issue/Epic Breakdown

| Epic | Scope | Depends on |
| --- | --- | --- |
| E0 Baseline recovery | Dependencies, scripts, builds, migrations, current diff | None |
| E1 API contract stabilization | Routes, controllers, schemas, DTOs, error format | E0, ADR-002, ADR-005 |
| E2 Authorization hardening | Role keys, permissions, uploads, security middleware | E1 |
| E3 Domain schema v2 | Studio scope, lifecycle, scoring, audit, scheduling | E0, ADR-001/003/004 |
| E4 Admin setup | Event configuration and approvals | E1, E2, E3 |
| E5 Representative registration | Studio, dancers, performances, music | E1, E2, E3, E4 |
| E6 Live operations | Queue, moderator, judge scoring, real-time sync | E2, E3, E4, E5 |
| E7 Results | Aggregation, rankings, publication, exports | E3, E6 |
| E8 Production readiness | Providers, tests, CI, observability, deployment | Starts after E1; completes after E7 |

## 10. Definition of Done for Every Feature

A feature is complete only when:

- Domain behavior and authorization rules are explicit.
- Database migration and rollback implications are reviewed.
- Request and response schemas are shared and type-safe.
- Backend validation does not trust frontend validation.
- API errors use the standard envelope.
- Unit/integration tests cover success, validation failure, authorization failure, and important conflicts.
- Frontend includes loading, empty, error, success, and disabled states.
- UI is keyboard accessible, responsive, and translated in ET/EN/RU.
- Audit logging is added for sensitive changes.
- Relevant documentation is updated.
- Build, typecheck, lint, tests, and migration checks pass.

## 11. Resume Checklist

Use this at the start of a future development session.

1. Read this file and the newest ADRs.
2. Run `git status --short` and preserve unrelated/uncommitted work.
3. Pull only after understanding local divergence.
4. Start PostgreSQL with `docker compose -f docker/docker-compose.yml up -d`.
5. Run `pnpm install --frozen-lockfile` when dependencies may have changed.
6. Run Prisma generate, migration status, and seed as appropriate.
7. Run baseline checks: build, typecheck, lint, and tests.
8. Select the first unchecked task from the active phase; avoid starting work from a later phase unless dependencies are complete.
9. Implement one vertical slice with tests and documentation.
10. Update this plan: check completed tasks, add discovered blockers, and record the next concrete action.

## 12. Recommended Next Session

Start with Phase 0 and Phase 1, in this order:

1. Phase 0 is complete, including the user-authorized commit checkpoint. Preserve the committed baseline.
2. Read accepted ADR-001/002/005 and `docs/API.md`. Versioned composition and canonical registration are implemented. Dancer routing and contracts are implemented. Next concrete task: canonical event-scoped performance integration, controller/duplicate/authorization repairs, and matching shared/frontend contracts/tests.
3. Apply ADR-002 canonical paths and ADR-005 shared contracts incrementally with matching frontend/environment/example changes.
4. Mount/fix all routers and remove duplicate performance code.
5. Align frontend API clients with integration-tested routes.
6. Fix role checks to use `role.key` consistently.
7. Expand operation-level API integration coverage beyond the existing auth/event smoke and studio-registration workflow/rollback checks.

Do not begin scoring or real-time work until this baseline is stable; those features depend on correct event scope, authorization, lifecycle, and API contracts.
