# Dance Competition Management System — Development Plan

Last audited: 2026-10-23

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
- Performance and user routers are not mounted in the API entry point.
- Frontend API modules exist for studios, dancers, and performances, but corresponding screens are absent and several URLs do not match backend routes.
- Invitations work at the route level but use awkward duplicated paths such as `/invitations/invitations`.
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

- `performancesRouter` and `usersRouter` are not mounted in `apps/api/src/index.ts`.
- Dancer routes are mounted at `/dancers`, while the frontend calls `/studios/:studioId/dancers`; current mounting produces different URLs.
- The frontend calls `/studios/:studioId/performances`, but the performance router is not mounted and contains two competing URL designs.
- The documented studio creation endpoint is `POST /events/:eventId/studios`; the current route requires `/:studioId/registration` while its controller creates a new studio and ignores that `studioId`.
- Frontend studio detail/update/delete paths use `/events/:eventId/studios/...`, while the active backend controller exposes `/studios/...` for those operations.
- Event detail links point to `/events/:id/register` and `/events/:id/studio`, but neither frontend route exists.
- Routes documented as public events are actually behind the global authentication middleware.

### P0 — Authorization and security

- `useRole()` compares requested role keys such as `representative` with the role display name such as `Studio Representative`; role-gated UI can fail.
- `RequireRole` separately uses fuzzy display-name matching. Frontend role checks need one key-based implementation.
- Image upload endpoints verify resource existence but not ownership or resource-specific permissions. Any authenticated user can currently target arbitrary event, user, dancer, or studio IDs.
- CORS is hardcoded to `*` even though validated CORS configuration exists.
- Rate-limit settings exist but no rate limiter is installed or used.
- Authentication middleware does not verify that the user still exists, is active, or is email-verified on each authenticated request.
- `DEV_AUTH` uses a synthetic user ID that can fail when handlers write audit/ownership fields requiring a real user.
- Invitation responses expose raw tokens and invitation code still reads `process.env.JWT_SECRET` directly instead of centralized config.

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

### P1 — Documentation drift

- Resolved during baseline recovery: root README describes React 19, actual directories, current maturity, prerequisites, setup/start commands, and validation scope.
- The web README is still the default Vite template.
- Registration, storage, environment, controller, and error guides include claims or endpoints that no longer match the code.
- Several markdown files contain mojibake characters and should be normalized to UTF-8.
- Historical documentation claims remain unverified outside the maintained validation reports. Current build, typecheck, web lint, three Node tests, and isolated migration/deployment/seed checks passed on 2026-10-23.

## 5. Architecture Decisions to Make First

Record each decision in a short ADR under `docs/adr/` before implementing dependent features.

### ADR-001: Studio identity and event registration

Recommended decision: make Studio global and reusable across events.

- Remove `eventId` from Studio.
- Keep the many-to-many relationship through StudioEventRegistration.
- Scope event-specific approval/edit permissions to StudioEventRegistration.
- Keep organization-level studio approval only if there is a real moderation requirement separate from event approval.
- Migrate existing data before deleting the field.

Alternative: if each event intentionally owns a separate studio record, remove StudioEventRegistration and simplify the model. Do not keep both concepts without explicit semantics.

### ADR-002: Canonical API shape

Recommended resource layout:

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

Recommended decision:

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

Progress (2026-10-23): all technical Phase 0 tasks pass; see [baseline validation](docs/BASELINE_VALIDATION.md) and [migration validation](docs/MIGRATION_VALIDATION.md). Existing work is preserved. Frozen installation, all-workspace build/typecheck, web lint, three API tests, Prisma validate/generate/format, isolated empty-database deployment/redeployment, full-record seed idempotency, compiled API health/login/profile and basic access-denial checks are verified. Setup is documented in README. The user authorized commits and the commit checkpoint is satisfied; Phase 0 is complete and Phase 1 is active. Next concrete action: decide and record ADR-001 (studio identity/event registration), ADR-002 (canonical API paths), and ADR-005 (shared contracts) before implementing the P0 route integration fixes. Existing studio approval defaults to `PENDING` and still requires operational review before a real upgrade; concurrent seeding and full endpoint authorization coverage are not claimed.

### Phase 1 — Stabilize API contracts and finish the backend refactor (active)

Goal: one coherent backend architecture and a frontend client that matches it.

- [x] User-requested prerequisite before Phase 1 implementation: update all external dependency declarations to verified latest stable releases, regenerate the lockfile/client, apply TypeScript 7 and lint compatibility changes, and validate the baseline. See [stable dependency refresh](docs/DEPENDENCY_UPDATES.md). Prisma 8 RC is deliberately excluded; TypeScript compiler/API aliases follow the official compatibility setup. Next concrete task remains ADR-001/002/005.

- [ ] Decide and document ADR-001, ADR-002, and ADR-005.
- [ ] Add an `/api/v1` router and mount every resource router exactly once.
- [ ] Resolve the studio registration URL mismatch.
- [ ] Resolve dancer and performance mount paths.
- [ ] Remove duplicate performance handlers.
- [ ] Complete controllers for studios, dancers, performances, judges, categories, formats, age groups, invitations, images, and users—or explicitly decide that simple CRUD remains in routes.
- [ ] Ensure routes only compose middleware and controller calls.
- [ ] Standardize all validation with shared Zod schemas.
- [ ] Standardize all errors through the global error handler.
- [ ] Replace `any` and unsafe compound-key casts where possible (mixed Prisma imports were resolved during Phase 0).
- [ ] Add explicit API response DTO schemas for auth, events, studios, dancers, and performances.
- [ ] Align frontend API modules with canonical routes and DTOs.
- [ ] Remove legacy nomination/performance types or migrate them to current terms.
- [ ] Add request-level API integration tests for every mounted route.

Exit criteria:

- No duplicate or unreachable handlers.
- Frontend client paths match integration-tested backend paths.
- All responses use one error envelope.
- TypeScript strict mode passes without `any` in application code unless documented.

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
- [ ] Decide whether JWT remains in localStorage or moves to secure same-site cookies; document the threat model.

Exit criteria:

- Authorization matrix tests cover each role and event scope.
- A user cannot read or modify another event/studio through ID substitution.
- Security-sensitive routes have rate limits and consistent audit events.

### Phase 3 — Correct and harden the data model

Goal: support the full competition workflow without accumulating incompatible migrations.

- [ ] Implement the studio/event relationship decision and data migration.
- [ ] Add missing timestamps consistently (`createdAt`, `updatedAt`) to mutable entities.
- [ ] Add referential actions intentionally for every relationship.
- [ ] Decide restore behavior for soft-deleted records and enforce `deletedAt: null` in standard queries.
- [ ] Populate `deletedBy`/`deactivatedBy` consistently and model actor relations if useful.
- [ ] Add AuditLog with actor, action, entity type/id, event id, timestamp, and safe metadata.
- [ ] Add lifecycle transition validation and an explicit live stage.
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
- [ ] Build studio and event-registration approval queues.
- [ ] Add event lifecycle transition controls with warnings and prerequisites.
- [ ] Add schedule generation/editing and conflict reporting.
- [ ] Add admin preview of representative, judge, and moderator views.

Exit criteria:

- An admin can configure a new event from empty database state through “registration open.”
- Invalid lifecycle transitions and incomplete configurations are blocked with actionable errors.

### Phase 5 — Studio representative workflow

Goal: a representative can complete registration without staff intervention except approval.

- [ ] Add the missing event registration route and UI.
- [ ] Build studio profile create/edit and representative-management screens.
- [ ] Show studio and event-registration approval statuses separately if both concepts remain.
- [ ] Build dancer list, create, edit, archive, restore, and optional CSV import.
- [ ] Build performance create/edit/archive with category, age group, format, participants, duration, and title.
- [ ] Calculate age eligibility using the event's declared age-calculation date and policy.
- [ ] Enforce format participant count and maximum duration in shared validation and backend transactions.
- [ ] Add music upload, replacement, validation, and playback preview.
- [ ] Add registration summary, validation checklist, and final submission/lock action.
- [ ] Clearly display stage-based editing restrictions and admin-granted review exceptions.

Exit criteria:

- A representative can register a studio, dancers, performances, and music end-to-end.
- Invalid dancers, formats, durations, or cross-studio participants cannot be submitted.
- Review locking and permitted corrections are integration-tested.

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
- [ ] Define offline/reconnect behavior for unstable venue networks.
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
- [ ] Add email templates for verification, invitations, password reset, registration status, and schedule changes.
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
- [ ] Run accessibility, responsive-layout, and localization reviews.
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

## 8. Documentation Plan

- [x] Rewrite the root README as the short entry point: product, prerequisites, startup, scripts, architecture links, and current maturity.
- [ ] Replace the default web README with frontend-specific setup and conventions.
- [ ] Add `docs/ARCHITECTURE.md` with application boundaries and request/data flow.
- [ ] Add `docs/DOMAIN.md` with lifecycle, roles, registration, scoring, and ranking rules.
- [ ] Add `docs/API.md` or generated OpenAPI instructions.
- [ ] Add `docs/SECURITY.md` with authorization model and data-handling rules.
- [ ] Add `docs/TESTING.md` and `docs/DEPLOYMENT.md`.
- [ ] Add ADRs for the decisions listed in section 5.
- [ ] Mark implementation summaries as historical or delete them after their useful content is merged into maintained guides.
- [ ] Correct endpoint examples, ports, framework versions, file trees, and build/test claims.
- [ ] Normalize all markdown to UTF-8.

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
2. Start active Phase 1 by deciding and recording ADR-001/002/005 for route-contract stabilization.
3. Use those decisions to establish canonical API paths and shared contracts.
4. Mount/fix all routers and remove duplicate performance code.
5. Align frontend API clients with integration-tested routes.
6. Fix role checks to use `role.key` consistently.
7. Add the first API integration tests around auth, events, and studio registration.

Do not begin scoring or real-time work until this baseline is stable; those features depend on correct event scope, authorization, lifecycle, and API contracts.
