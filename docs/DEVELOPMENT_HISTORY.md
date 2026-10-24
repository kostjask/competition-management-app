# Development history through 2026-10-24

Archived progress entries from the development plan. These are historical reports,
not current priorities or freshly rerun validation. Statements such as “next task,”
phase ownership, and unresolved gaps describe their recorded checkpoint and may
have been superseded. Use the [active plan](../DEVELOPMENT_PLAN.md) for current
status, milestone gates, and the next task. The roadmap reorganization changed no
runtime behavior or completion status.

Progress (2026-10-23): all technical Phase 0 tasks pass; see [baseline validation](BASELINE_VALIDATION.md) and [migration validation](MIGRATION_VALIDATION.md). Existing work is preserved. Frozen installation, all-workspace build/typecheck, web lint, three API tests, Prisma validate/generate/format, isolated empty-database deployment/redeployment, full-record seed idempotency, compiled API health/login/profile and basic access-denial checks are verified. Setup is documented in README. The user authorized commits and the commit checkpoint is satisfied; Phase 0 is complete and Phase 1 is active. ADR-001/002/005 are now accepted. Versioned composition/app construction is now implemented for previously active routers. Canonical studio registration is now implemented. Dancer route integration is now complete. Performance integration is now complete. Studio profile integration is now complete. Next concrete action: judge controller/shared DTOs and canonical client contracts with event-scope/authorization tests. Existing studio approval defaults to `PENDING` and still requires operational review before a real upgrade; concurrent seeding and full endpoint authorization coverage are not claimed.

Progress (2026-10-23, architecture decisions): ADR-001/002/005 are accepted and cross-checked against Prisma, controllers, route mounts, shared schemas, and web clients. This documentation-only task changes no runtime behavior or database model. Newly confirmed gaps: studio creation omits registration in both branches; the users route file is empty; invitation public-path predicates disagree with mounted paths. Multi-event roster/lock policy remains a Phase 3 migration prerequisite. Validation passed: `pnpm.cmd test` (Turbo cached API result), fresh `pnpm.cmd --filter api test` (7/7), `pnpm.cmd typecheck`, `pnpm.cmd lint`, `pnpm.cmd build` (Turbo cache used), `pnpm.cmd db:validate`, `pnpm.cmd db:generate`, Prisma `format --check`, local ADR-link checks, and `git diff --check`. No migration/integration database rerun was needed for documentation-only changes. Phase 1 remains active.

Progress (2026-10-24, versioned composition): `createApp(prisma)` constructs the application without starting a server or initializing a database/storage provider; startup remains in `index.ts`. `routes/api.ts` composes previously mounted routers once under `/api/v1`; authentication and handlers share the injected database client. Invitation list/create and auth profile attach authentication directly, while public auth/invitation operations use their concrete routes. Retired URLs return 404; health/static uploads remain at root. Web base URL/examples and the compiled smoke check follow the prefix. The original broad mount item is split so unfinished performance integration is not marked complete. No Prisma schema or migrations changed. Validation passed: fresh API tests (15/15, including 8 new HTTP tests), root test, all-workspace typecheck/build, web lint, Prisma validate/generate/format check, isolated database deployment/seed/compiled API smoke check, local documentation links, and `git diff --check`. The smoke check initially hit sandbox Docker access denial, then passed with approved Docker access and cleaned up its fixture. Existing web `.env` overrides need `/api/v1` and a Vite restart; remaining studio/dancer/performance client paths, upload ownership, auth hardening, invitation errors/tokens, and full operation-level authorization coverage are not claimed. That next task is now implemented; the following progress entry records its scope and next action. Phase 1 remains active.

Progress (2026-10-24, studio registration): canonical GET/POST collection and PATCH/DELETE item routes now use `StudioRegistrationsController`; duplicate legacy handlers were removed from events. Authenticated roleless applicants can create their own active membership and pending organization/event registration atomically. Admin creation preserves its ownership behavior (no representative membership) and pending defaults. List/cancel require active membership or admin; event/studio mismatch and soft deletion are checked. Admin-only approval requires organization approval and an existing registration, assigning event roles in the same transaction without unsafe compound-key casts. Cancellation checks pending status again in a conditional delete and retains the studio. Shared strict inputs and explicit registration/studio-summary DTOs align the frontend registration helpers; unrelated studio detail helpers remain deferred. Existing legacy studios without registrations are not silently backfilled, POST is not idempotent, and multi-event reuse remains blocked on Phase 3 migration. No database schema or migrations changed. Validation: build, typecheck, lint, fresh API tests (23/23), Prisma validate/generate/format check, and isolated migration/seed/compiled HTTP registration checks passed, including nested-write rollback, approval/role rollback, cross-event contradictions, active/deleted records, and repeat-approval role idempotency. Root `pnpm.cmd test`, local documentation links/UTF-8/new-file whitespace checks, and final `git diff --check` also passed. Broader auth/upload hardening, operation-wide concurrency coverage, and idempotent registration retries remain deferred. That dancer task is now implemented; the next progress entry records the completed slice and next action. Phase 1 remains active.

Progress (2026-10-24, dancer integration): canonical studio-nested GET/POST collections and GET/PATCH/DELETE items use `DancersController`; legacy dancer handlers/mounts were replaced. Non-admins need event-derived or global `dancer.manage`, active ownership, organization approval, and the matching approved registration. Reads remain available during stage locks; writes follow existing stage/review rules. Admin bypass still requires active records and correct parent relationships. Strict shared inputs accept valid calendar-only birth dates, trim names, and reject spoofed/empty updates. Explicit DTOs and frontend runtime validation remove invented timestamps and private storage paths. New dates persist at UTC midnight; existing timestamps remain untouched and serialize their UTC day. Transactional writes and audited soft deletion retain rows/relations. No model/migration changes. Validation passed: build, typecheck, lint, fresh API tests/root test (30/30, including 7 new dancer HTTP tests), Prisma validate/generate/format check, and isolated migration/seed/compiled HTTP registration+dancer workflows. Database checks cover real event/global permission scope, cross-studio denial even for admins, inactive membership, approval/status gates, review/stage behavior, legacy time preservation, and audited archive visibility. Final local documentation links/anchor, UTF-8/new-file whitespace, and `git diff --check` passed. Full concurrent-update coverage, restore workflows, historical timezone corrections, upload authorization, and multi-event roster policy remain deferred. Next concrete task: canonical event-scoped performance routes, completing the controller and removing duplicate handlers with ownership/participant/event validation and matching shared/frontend contracts/tests. Phase 1 remains active.

Progress (2026-10-24, performance integration): canonical event-scoped collection/item CRUD now mounts once and delegates to the complete performance controller; duplicate inline handlers and GET body parsing are removed. Strict shared inputs and explicit runtime-validated DTOs align the frontend client and remove invented timestamps/legacy performance naming. Non-admins need event/global permission, active studio membership, organization approval, and matching approved event registration. Writes honor registration/review stage rules; reads remain available during stage locks. Every participant must identify the same active event-owned studio, including for admin parent checks; mixed/empty legacy participant sets are excluded from lists and return 409 on item access pending the Phase 3 audit. Writes validate resulting event configuration and active same-studio dancers transactionally; nested participant replacement rolls back on stage-order conflict. Audited soft deletion retains participants and scores. Existing archived stage orders remain reserved. No schema/migration changes. Validation passed: build, all-workspace typecheck, web lint, fresh API/root tests (35/35), Prisma validate/generate/format check, and isolated PostgreSQL migration/seed/compiled HTTP workflows including performance order-conflict rollback, score/participant preservation on archive, and contradictory legacy studio/event denial. Local documentation links, changed-file UTF-8/whitespace checks, and final `git diff --check` passed. Docker initially was stopped; after launching Docker Desktop and starting the repository Compose service, the isolated runner passed and cleaned up its disposable database. Restore/order reuse, full concurrency coverage, cross-event studio identity/history policy, age eligibility/format limits, and legacy data repair remain in their owning phases. Phase 1 remains active. Next concrete task: finish studio detail/update/delete shared DTOs, align canonical frontend helpers, and consolidate the existing studio controller/routes.

Progress (2026-10-24, studio profiles): studio collection/detail/profile PATCH/archive, organization approval, and representative PATCH now use explicit shared DTOs and strict inputs with canonical runtime-validated frontend helpers. Active owners can read pending profiles without roles; profile writes require stored-event or global studio.manage plus ownership. Admin bypass retains active studio/member and parent checks. Owner profile/representative/archive writes follow PRE_REGISTRATION/REGISTRATION_OPEN; dancer/performance review overrides do not unlock profiles. Existing organization-profile edits remain independent of approval gates; roleless profile editing remains gated on later onboarding permission policy. Nullable fields support explicit clearing, including SQL NULL for invoice details. Representative edits remain self-only for non-admins and never change login identity. Approval remains admin-only and does not modify event registration/roles. Archive returns 204 with actor/timestamp and preserves relations. The PostgreSQL test exposed the old location-dependent name precheck's mismatch with the SQL-only global active-name index; rename prechecks and P2002 conflict mapping now match it, including competing renames. No Prisma model/index/migration changes. Validation passed: fresh API tests (41/41), build, all-workspace typecheck, web lint, Prisma validate/generate/format check, and isolated deployment/seed/compiled HTTP workflows including studio read/write scopes, null persistence, uniqueness, representative self/parent checks, approval isolation, stages, and archive preservation. Root `pnpm.cmd test` also passed (41/41), as did final all-workspace typecheck/lint, maintained-document local links, changed-file UTF-8/whitespace checks, and `git diff --check`. Registration-creation duplicate-name error mapping, restore, full concurrent editing, cross-event identity/history/lock policy, and broader security hardening remain deferred. Phase 1 remains active. Next concrete task: consolidate judge routes into a controller with shared request/response DTOs, canonical client paths, and event-scope/authorization tests.

Documentation progress (2026-10-24, user journeys): added the UX specification, replaced obsolete registration/invitation examples with current API boundaries, and mapped follow-up work to Phases 2–9. No runtime behavior, approval semantics, schema, or phase completion changed. Public discovery, submission/correction state, cross-event reuse, and production email remain gated above. Documentation checks cover local links, UTF-8, and whitespace; runtime validation is not implied. The performance task is now implemented; studio profile integration is now complete; next concrete task is Phase 1 judge controller/shared DTOs and canonical client contracts with event-scope/authorization tests.

Documentation progress (2026-10-24, account eligibility): accepted ADR-006 and replaced generic-signup/automatic-role guidance in registration, journey, and role documentation. Added backend signup eligibility, pending-account recovery, scoped staff invitations, atomic Judge/UserRole acceptance, additional-representative invitation, and history-preserving offboarding tasks in the owning phases. These are target requirements only; current unrestricted signup remains unchanged. Phase 1 is still active. Next concrete task remains judge controller/shared DTO and canonical client consolidation with event-scope/authorization tests; atomic staff onboarding remains separate Phase 2 work. Documentation validation uses UTF-8, local links, and whitespace checks; no runtime validation is claimed for this documentation-only change.

## 2026-10-24 - P1-JUDGES contract checkpoint

Implemented judge CRUD in JudgesController with route-only composition, explicit
selected/serialized shared DTOs, strict trimmed request schemas, nullable profile
clearing, and canonical response-validated web helpers. Existing scoped/global
event.manage reads and admin-only writes remain. Every operation checks the event;
item predicates retain event scope. Create validates an active existing user;
PATCH cannot reassign event/user. Existing unique/FK conflicts use global 409
errors, missing items use 404. Unscored deletion remains hard deletion; scored
judges are protected by the existing restrictive FK, correcting the old route's
inaccurate cascade/soft-delete comment. No model, migration, dependency, screen,
role assignment/removal, or atomic invitation-acceptance changes.

Fresh validation completed successfully:

- Targeted: node --test --test-name-pattern=judge apps/api/tests/routes.test.cjs (3 tests).
- pnpm.cmd test (44 API tests); pnpm.cmd build; pnpm.cmd typecheck.
- pnpm.cmd lint (the configured lint scope is web only).
- pnpm.cmd db:validate; pnpm.cmd db:generate.
- pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma.
- pnpm.cmd test:baseline: disposable PostgreSQL deployment/redeployment, full seed
  idempotency, built-server auth checks, and all registration/dancer/performance/
  studio/judge workflows passed; runner cleanup completed. Judge checks cover real
  uniqueness and FK behavior, scoped reads/admin writes, cross-event items,
  nullable persistence, inactive/missing users, unchanged roles and score retention.
  Docker required sandbox escalation; the approved run succeeded.

The initial build caught exact optional property typing in Prisma writes; explicit
field mapping fixed it. The first full suite caught a missing fixture binding in
the updated dispatch test; corrected before the successful run. No remaining
validation failures. Final whitespace/UTF-8/local-link/diff checks are part of the
handoff. Existing uncommitted documentation changes were retained. Phase 1 stays
active; next task is P1-CONFLICT, then P1-CI. Staff acceptance/offboarding and UI
remain gated by their existing later tasks.

## 2026-10-24 - P1-CONFLICT registration checkpoint

Registration creation now maps Prisma P2002 failures after transaction rollback
to the existing ConflictError envelope (409, CONFLICT, Studio with this name
already exists), matching profile-update behavior. The database's existing
SQL-only global active-name index remains authoritative; no precheck, migration,
case-folding, location/event exception, or name-based identity merging was added.
Other errors keep their existing handling. HTTP checks cover applicant/admin
responses and omission of private database details. PostgreSQL checks verify
trimmed duplicate names across events/locations, unchanged full records and roles
after conflicts, two competing creates yielding one 201 and one 409 with exactly
one studio/membership/registration, archived-name reuse retaining history, and
case-sensitive names.

The new targeted regression failed before the fix (500 instead of 409), then
passed after the API rebuild. Validation completed successfully:

- node --test --test-name-pattern='registration creation maps' apps/api/tests/routes.test.cjs (1 test).
- pnpm.cmd test (45 tests), pnpm.cmd typecheck, pnpm.cmd lint (configured web scope), pnpm.cmd build.
  Turbo reused unchanged package outputs/checks; the changed API built, typechecked and tested.
- pnpm.cmd db:validate; pnpm.cmd db:generate; pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma.
- pnpm.cmd test:baseline passed all isolated PostgreSQL deployment/redeployment,
  seed-idempotency and compiled HTTP registration/dancer/performance/studio/judge
  workflows, including the new conflict/race/preservation checks. The approved
  Docker run cleaned up its disposable database. No schema change required a
  new migration.

Changed files: StudioRegistrationsController.ts, routes.test.cjs,
check-studio-registrations.cjs, API.md, DEVELOPMENT_PLAN.md, and this history.
Prior uncommitted work was preserved. Full onboarding/security and multi-event
studio identity remain in their owning tasks. Phase 1 remains active; next task
is P1-CI. Final local-link/UTF-8 and whitespace/diff review accompany this handoff.

## 2026-10-24 - P1-CI baseline automation checkpoint

Added .github/workflows/ci.yml for push, pull_request and workflow_dispatch with
independent workspace and PostgreSQL jobs on Ubuntu, Node 24 and package-pinned
pnpm. Both install frozen dependencies and generate Prisma. Workspace validation
runs Prisma validate/format check, build/typecheck/current web lint/API tests and
commit whitespace checks. The database job builds, waits for PostgreSQL health,
runs the existing PowerShell migration suite and baseline HTTP/database suite,
and always tears down its run-specific Compose project/volumes. Both jobs have
15-minute timeouts, read-only repository permissions, disabled persisted checkout
credentials, and no optional/continue-on-error database path or secret artifacts.
The CI Compose overlay only changes restart/readiness behavior. The migration
script now selects pnpm.cmd on Windows and pnpm on other platforms. README links
the new docs/TESTING.md, including scope and operational limits.

Local validation passed:

- pnpm.cmd install --frozen-lockfile (required approved access to existing pnpm store).
- actionlint 1.7.12: .github/workflows/ci.yml (official binary in ignored node_modules).
- docker compose -f docker/docker-compose.yml -f docker/docker-compose.ci.yml config --quiet.
- pnpm.cmd db:generate, db:validate, and Prisma format --check.
- pnpm.cmd build, typecheck, lint and test (unchanged Turbo results reused).
- pnpm.cmd --filter api test: fresh 45/45 API tests passed.
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1:
  fresh/upgrade/schema-parity/status/default/uniqueness checks passed and schemas cleaned.
- pnpm.cmd test:baseline: all deployment, seed preservation and compiled HTTP
  resource workflows passed; disposable database/server cleaned.
- Missing Docker context: baseline returned nonzero, confirming unavailable
  database infrastructure cannot silently pass.

No application behavior, dependency or schema change. Existing uncommitted work
was retained. Hosted GitHub Actions and Linux pwsh execution have not been run
from this Windows workspace; first hosted-run evidence and repository required-
check settings remain explicit operator follow-up after publication. No commit,
push, remote or branch-protection changes were made. Phase 1 remains active;
next implementation task is P1-EVENTS. Final UTF-8/local-link/whitespace and diff
review accompany the handoff.

## P1-EVENTS checkpoint (2026-10-24)

Implemented strict shared event inputs and explicit response DTOs across the API
and web client. Stored venue/location/description/limits now survive mutations;
optional fields support null clearing, omitted fields remain unchanged, dates
require explicit ISO timezones and serialize as UTC. Private image paths and
nonexistent updatedAt are excluded; imageUrl is read-only on these endpoints.
Event creation UI sends strings and detail UI omits the invented update timestamp.
Reads remain authenticated for all accounts; writes remain admin-only with global
error envelopes. PATCH validates the resulting stored date pair in a serializable
transaction, mapping serialization conflicts to 409 and missing records to 404.

Added four HTTP tests and an isolated PostgreSQL event suite covering DTOs,
strict/null/omission behavior, read/write access, date-order regressions, unchanged
records after rejected writes, and competing partial-date edits. The baseline
runner includes this suite. No Prisma schema or migration changed. Setup fields
in forms, capacity enforcement, deadlines, lifecycle transitions, upload security,
and browser coverage remain in their existing later tasks. Existing uncommitted
database-review documentation was preserved.

Validation passed: pnpm.cmd build; pnpm.cmd --filter api test (49/49 fresh);
pnpm.cmd test (49/49 fresh API execution with cached dependency builds);
pnpm.cmd typecheck; pnpm.cmd lint (web only); pnpm.cmd db:validate;
pnpm.cmd db:generate; pnpm.cmd exec prisma format --check --schema
apps/api/prisma/schema.prisma; pnpm.cmd test:baseline (disposable PostgreSQL
migrate/redeploy, seed preservation and all existing plus event workflows).
The first baseline attempt could not access Docker inside the sandbox; rerunning
with approved Docker access passed and cleaned up its fixture. No separate
migration regression rerun was needed because no schema/migration changed.
Build/typecheck/lint used Turbo caches for unchanged inputs. JavaScript syntax
and git diff --check passed; final diff reviewed. Hosted CI remains unverified.

P1-EVENTS is complete; Phase 1 remains active. Next concrete task:
P1-AUTH-CONTRACTS, shared explicit auth/profile DTOs, runtime-validated frontend
responses and consistent errors; authentication security changes remain P2-AUTH.

## P1-AUTH-CONTRACTS checkpoint (2026-10-24)

Added strict shared registration/login/verification bodies and explicit success
DTOs plus the standard error-envelope schema/type. AuthController selects and
maps allowed fields, serializes profile createdAt as UTC, and includes stable
role keys with null/global or event scope. It no longer returns unrestricted
UserRole/Role records. Registration uniqueness races return the existing 409
conflict rather than an unexpected database error. Registration names are trimmed.
Frontend helpers infer shared types and validate the complete response before
storing tokens; client 403 errors retain server messages/details. Existing type
imports from api/client remain compatible through shared re-exports.

Removed auth JWT-signing any casts by validating JWT_EXPIRY centrally as a
positive compact duration with lowercase ms/s/m/h/d/w/y. The default remains 7d;
unitless, spaced or long-form values now fail startup and must use compact syntax.
Environment documentation/example were updated. No schema/migration changed.

Five HTTP tests cover registration hashing/duplicates, strict validation,
login/verification session shapes and failures, caller-only profiles and private
field exclusion. A config regression covers signing valid expiry values and
rejecting invalid ones at startup. Verification email is mocked in HTTP tests,
so generated verification secrets are not logged. The PostgreSQL baseline adds
scripts/check-auth.cjs for real roleless/global/event profile scopes, UTC dates,
caller isolation, bearer DTOs and disabled-login errors.

Validation passed: pnpm.cmd build; pnpm.cmd --filter api test (55/55 fresh);
pnpm.cmd test (55/55); pnpm.cmd typecheck; pnpm.cmd lint (web);
pnpm.cmd db:validate; pnpm.cmd db:generate; pnpm.cmd exec prisma format --check
--schema apps/api/prisma/schema.prisma; pnpm.cmd test:baseline with approved
Docker access (isolated migrate/redeploy, seed preservation and all workflows,
including auth/profile). Unchanged Turbo inputs reused local caches. JavaScript
syntax, UTF-8/document links, final diff and git diff --check were reviewed.
No separate migration regression rerun: persistence schema/migrations unchanged.
No browser runtime coverage is claimed; hosted CI remains unverified.

P1-AUTH-CONTRACTS is complete; Phase 1 remains active. Next concrete task:
P1-CATEGORIES, controller/shared contracts and client helpers with parent/event,
validation, authorization and conflict coverage. Signup remains unrestricted;
active/email-verified request enforcement, verification expiry/atomic consumption,
secure email delivery, email identity policy, session recovery, and role-guard
unification remain in Phase 2. DTO completion does not close those security gates.
