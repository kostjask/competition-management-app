# Development history

> Historical evidence. Read only to investigate a past change. Current priority/status:
> [DEVELOPMENT_PLAN](../DEVELOPMENT_PLAN.md); runnable checks: [TESTING](TESTING.md).


## Evidence index

Read a report only for its recorded scope/date; it does not establish current
behavior, fresh checks or current priorities. Source and task owners take precedence
for present delivery. In particular, old “next task” statements are historical.

| Scope | Dated reports |
| --- | --- |
| 2026-10-23–24 baseline / dependencies / Phase 1 | [Baseline](BASELINE_VALIDATION.md), [change review](BASELINE_CHANGE_REVIEW.md), [migrations](MIGRATION_VALIDATION.md), [dependencies](DEPENDENCY_UPDATES.md); archived entries below |
| 2026-10-24–25 model / repository review | [Database](DATABASE_REVIEW.md), [schema suitability](SCHEMA_SUITABILITY_AUDIT.md), [repository audit](REPOSITORY_AUDIT.md) |
| 2026-10-25 scope / identity / recovery | [Scope](SCOPE_INTEGRITY_VALIDATION.md), [email](EMAIL_IDENTITY_VALIDATION.md), [tokens](IDENTITY_TOKEN_VALIDATION.md), [eligibility](AUTH_ELIGIBILITY_VALIDATION.md), [recovery](AUTH_RECOVERY_VALIDATION.md), [Phase 2A](PHASE_2A_VALIDATION.md) |
| 2026-11-01 security corrections | [Invitation identity](INVITATION_IDENTITY_VALIDATION.md), [admin scope](ADMIN_SCOPE_VALIDATION.md), [images](IMAGE_BOUNDARIES_VALIDATION.md) |
| 2026-11-05 auth / boundaries / shell | [Boundaries/roles](BOUNDARIES_ROLES_VALIDATION.md), [sessions/shell](SESSION_SHELL_VALIDATION.md), [onboarding/invitations](ONBOARDING_INVITATIONS_VALIDATION.md) |
| 2026-11-06 staff / preferences | [Acceptance/offboarding/preferences](STAFF_PREFERENCES_VALIDATION.md), [staff UI](STAFF_UI_VALIDATION.md) |
| 2026-11-09 M2 registration | [Registration lifecycle](REGISTRATION_LIFECYCLE_VALIDATION.md) |
| 2026-11-10 organizer / applicant M2 | [Event setup](EVENT_SETUP_VALIDATION.md), [review/application](APPLICATION_REVIEW_VALIDATION.md) |
| Documentation / planning | [Documentation audit and maintenance](DOCUMENTATION_AUDIT.md), [2026-11-06 plan revalidation](PLAN_REVALIDATION.md) |
| 2026-11-11 performance ownership / constraints | [Ownership, migration and organizer register](PERFORMANCE_OWNERSHIP_VALIDATION.md) |

## Archived progress through 2026-10-24

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


## P1-CATEGORIES checkpoint (2026-10-24)

Completed the category transport/controller slice. Routes compose one controller;
strict shared name inputs reject whitespace-only names, empty patches and spoofed
relationships. Explicit id/eventId/name DTOs are validated in backend serialization
and canonical web client helpers. No management screen, lifecycle policy, schema
migration or nomination-type cleanup is included.

All operations verify the event exists. Reads preserve admin/global/event
event.manage access; writes remain admin-only with standard 403 errors. Item
reads and writes constrain both category and event IDs; update/delete predicates
avoid a separate relationship-check/write race. Database P2002, P2003 and P2025
map to global conflict/not-found errors without exposing database details.
Deletion remains hard deletion for unused categories, relying on the existing
foreign key to retain active and archived performances rather than a racy count.

Three HTTP tests cover CRUD/explicit DTOs, strict input, missing events/items,
cross-event substitution, authentication, global/event reads, admin-only writes,
conflicts and concurrent disappearance. scripts/check-categories.cjs is wired
into the disposable PostgreSQL baseline for real name uniqueness/rename
preservation, concurrent creates, parent/scope checks, trimmed updates and
performance-restricted deletion including archived rows.

Validation passed: pnpm.cmd build; pnpm.cmd --filter api test (58/58 fresh);
pnpm.cmd test (58/58); pnpm.cmd typecheck; pnpm.cmd lint (web);
pnpm.cmd db:validate; pnpm.cmd db:generate; pnpm.cmd exec prisma format --check
--schema apps/api/prisma/schema.prisma; pnpm.cmd test:baseline (isolated migration
deploy/redeploy, seed preservation, all prior workflows and category checks).
Initial sandbox Docker access was denied; the approved escalated baseline passed
and cleaned up its disposable database. Unchanged Turbo inputs reused local cache.
No separate migration regression rerun: schema/migrations unchanged. JavaScript
syntax, documentation links/UTF-8, final diff and git diff --check were reviewed.
No browser coverage or hosted CI execution is claimed.

P1-CATEGORIES is complete; Phase 1 remains active. Next: P1-FORMATS controller,
shared contracts/client and event-parent/CRUD/validation/authorization/conflict
coverage. New participant/duration policy remains P3-ENTRIES. Localization
foundations, legacy types and setup screens remain in their owning tasks.


## Phase 1 completion checkpoint (2026-10-24)

Completed P1-FORMATS, P1-AGE-GROUPS, P1-INVITATION-CONTRACTS, P1-IMAGES,
P1-TYPES and P1-COVERAGE, together with I18N-CONTRACT/CORE/VALIDATION and the
Phase 1 portion of I18N-QA. Preserved the preceding category implementation.
No branch/commit/push or schema migration was created.

Formats/age groups have strict shared DTOs/controller/client helpers and event/
permission checks. Partial range validation runs in serializable transactions,
including explicit maxAge null clearing. Database tests retain active/archived
performances and valid concurrent ranges. Their existing schema permits duplicate
labels; no new uniqueness, overlap or participant/eligibility policy was imposed.

Invitations now have explicit UTC DTOs, role/event checks, global errors, typed
nullable-scope predicates and transactional acceptance/rollback/replay tests.
Raw tokens are removed from normal create/list DTOs. Existing-account identity,
role eligibility, mandatory staff scope, plaintext token persistence/history,
email delivery/logging and atomic Judge assignment remain Phase 2 gates.

Uploads now use one controller, shared path/output contracts, global multipart
errors and runtime-validated FormData clients. Private storage paths are omitted;
archived dancer/studio records are unavailable. New files precede database update
and old-file removal, with attempted cleanup on database failure. Resource-specific
permissions remain P2-BOUNDARIES; full provider/cleanup behavior remains P8-MEDIA.
Unused nomination schemas/interfaces and migrated-boundary any/unsafe casts are
removed. Known database races fall back to standard conflict/not-found errors.

Localized transport adds semantic reasons, safe numeric parameters and structured
path/rule issues. Shared validation avoids raw input/prose in issues and labels
custom date/range/duplicate/empty-patch rules. The client retains descriptors in
state and renders safe ET/EN/RU feedback without refetching on language changes.
Unknown/legacy/technical errors have localized fallbacks. Native Intl plurals,
typed keys/parameters, saved-locale validation and accessible native language
selection are covered. ADR-007 and LOCALIZATION.md document policy and limits.

The source detector records 95 existing reviewed literal UI exceptions under
I18N-UI and fails for new ones; it does not declare those screens translated.
The 56-operation inventory records applicable test evidence and explicit Phase 2
or non-applicable cases. Runtime inventory and all-protected-operation auth tests
prevent method/path drift. Health/static responses remain infrastructure exceptions.

Validation passed: pnpm.cmd build; pnpm.cmd test (72 API tests and 8 frontend tests,
plus the source guard); pnpm.cmd typecheck; pnpm.cmd lint (web); pnpm.cmd db:validate;
pnpm.cmd db:generate; pnpm.cmd exec prisma format --check --schema
apps/api/prisma/schema.prisma; and pnpm.cmd test:baseline with approved Docker access
(all prior workflows, setup concurrent ranges and invitation transactions).
The baseline deploys/redeploys migrations and checks seed preservation in its own
disposable database, which is cleaned up. No separate migration regression rerun
was needed because schema/migrations are unchanged. Unchanged Turbo inputs reused
local cache. JavaScript syntax, local document links/UTF-8, final diff and
whitespace were reviewed separately. Earlier failing test assumptions were fixed:
foreign-key rollback now returns 409, and setup labels remain non-unique.

Phase 1 technical exit criteria are satisfied. No external milestone is complete:
hosted CI execution/settings, interactive browser/keyboard/mobile/screen-reader
checks and fluent-language review are not claimed. I18N-QA remains open across
future workflows. Next concrete task is P2-SCOPE-INTEGRITY: review scope-removal/
null-safe uniqueness policy and existing data, then implement a new preserving
migration with PostgreSQL scope/concurrency checks. No Phase 2 schema work was
performed at this checkpoint.

## Checkpoint narrative archived 2026-11-10

Recorded through 2026-11-09; copied from the checkpoint during documentation
maintenance. Delivery claims and command results below were not rerun for this
move. Operational process state (including the 2026-11-09 API startup) is a dated
observation, not a guarantee that a service is running now. Historical next actions
are superseded by the [current queue](../DEVELOPMENT_PLAN.md#implementation-order).

### Next action

**Active implementation: M2 organizer setup/review, then applicant UI.**
Next task: **P4-CORE with P4-UI-CORE's setup scope**. The next three queued tasks
are P4-CORE, P4-REVIEW, then P5-APPLICATION, each with its owning UI scope.
**P3-REGISTRATION, P3-REGISTRATION-REAPPLY and I18N-CONTENT's M2 policy/contracts
are technically complete locally (2026-11-09).** ADR-003/019, migration 30,
independent decisions, derived access, deadline/timezone, correction revisions,
retained same-studio cancel/reapply and explicit content fallback contracts pass.
[Registration validation](REGISTRATION_LIFECYCLE_VALIDATION.md) records commands
and limits. P3-UX-CONTRACTS and I18N-CONTENT remain open for their later scopes.
Application/review screens, notification intent and authored-content storage/editors
remain P4/P5. See [implementation order](../DEVELOPMENT_PLAN.md#implementation-order).
Relevant Phase 2 technical foundations pass locally. Missing hosted scope/mail
evidence blocks external release, not isolated P3 implementation; actual model,
authorization, integrity and validation prerequisites still apply.
Plan revalidation is documentation-only: [findings and rationale](PLAN_REVALIDATION.md).
**P4-STAFF and its three bounded execution tasks are technically complete locally:**
P4-STAFF-READ, P4-STAFF-UI and P9-BROWSER-STAFF. The event staff overview, scoped
management UI, separate confirmed revoke/remove and recovery checks extend S17/F06.
See [staff UI evidence](STAFF_UI_VALIDATION.md) for final command results.
Local technical delivery does not bypass M1 or real-mail/human release gates.
**P2-JUDGE-ACCEPT, P2-OFFBOARD and I18N-PREFERENCES are technically complete
locally (2026-11-06)**; see [staff/preference evidence](STAFF_PREFERENCES_VALIDATION.md).
Judge/access/consumption reconcile atomically; removal retains Judge/Score history;
profile now explicitly saves account/email language with ADR-013 precedence.
P2-SIGNUP/INVITE/UI-AUTH remain delivered under ADR-017. Real mail, hosted scope
provenance/deployment and human language/assistive review remain open.
**P2-SESSION, Phase 2 I18N-FORMATTING and P2-UI-SHELL are technically complete
locally (2026-11-05)** under ADR-016; see [session/shell evidence](SESSION_SHELL_VALIDATION.md).
P2-BOUNDARIES/ERRORS and P2-ROLES remain complete locally.
P2-BOUNDARIES-UPLOADS is technically complete locally under ADR-015.
P2-ROLES-ADMIN-SCOPE, P2-INVITE-IDENTITY and P2-AUTH are technically complete locally.
P2-SCOPE-DEPLOY and real staging mail remain open;
no hosting/domain/Resend account exists. The user requested staging preparation;
[STAGING](STAGING.md) provides an isolated local rehearsal and hosted rollout
steps. Phase 2A and external milestones are not closed by local fixture results.

Audit correction order and all 15 finding owners: [correction plan](AUDIT_FOLLOWUP.md).
With P2-AUTH, P2-INVITE-IDENTITY, P2-ROLES-ADMIN-SCOPE and the local foundations
complete, transport/abuse controls, parser errors and frontend role consistency
are also corrected locally. Upload ownership/content and private retrieval are implemented. Intended-deployment
assignment provenance remains P2-SCOPE-DEPLOY.
Independent fixes may proceed when their own prerequisites pass.

UI track: **P2-UI-FOUNDATION/SHELL and Phase 2 formatting are technically complete**.
Login, cookie recovery and explicit verification continuation are implemented;
signup/recovery/invitation journeys are implemented locally under ADR-017;
staff acceptance/offboarding backend and account language preferences are implemented;
event staff administration UI is implemented locally under P4-STAFF. Gated application and release features cannot ship early. See [design system](DESIGN_SYSTEM.md).

P2-SCHEMA-AUDIT is complete: [findings and validation](SCHEMA_SUITABILITY_AUDIT.md).
Broader model changes retain their owning tasks and ADR gates. Current test data
may be reset/reseeded under the disposable-data policy; no reset was needed here.

### Current state

- User-confirmed database baseline (2026-10-25): the current development database
  contains only disposable test data. Schema/model improvements may reset/reseed
  it and replace fixtures; do not add legacy compatibility solely to retain test
  rows. Follow the target-verification/migration rules in
  [AGENTS](../AGENTS.md#development-database-policy) and
  [TESTING](TESTING.md#development-database-and-disposable-data).
  Preservation requirements below concern domain behavior and retained/real data;
  they do not require keeping current fixtures. No database was reset by this
  policy update; active task priority and implementation status are unchanged.

- Phases 0 and 1 are complete for their technical scope. Mounted business
  resources have controllers, shared DTOs, canonical paths and validated clients.
- Schema review adds token digest/lifetime/state CHECKs and closes the
  active-studio-name-index parity exclusion. The current migrated fixture additionally includes durable audit, onboarding
  drafts, staff references/removal state, recipient locale and encrypted mail queue
  storage with SQL-only checks/triggers. Synthetic plans support
  retaining foundation indexes; reverse-key candidates remain P3-INDEXES.
  The repository contains 30 migration directories. On 2026-11-09, the user-requested
  backend startup verified the local development target (localhost:5432/dance_comp,
  repository Compose PostgreSQL) and successfully applied its 12 pending migrations;
  all 30 are now applied there, without a reset or reseed. The development API runs
  on port 4000 with authentication enabled and a process-only EMAIL_PROVIDER=fake
  override for the legacy local mail setting; GET /health returns 200/status ok.
  This operational startup advances no roadmap task or external release gate.
  The last staging rehearsal recorded 26 migrations; staging/hosted targets remain
  unverified. Verify target and preflights before another environment's rollout.
- Email identity now uses shared ASCII-space trimming/lowercasing for accounts
  and invitations, with collision-refusing migration and direct-write checks.
  IDs, ownership and all non-email fields are preserved; no identities are merged.
  Intended-deployment preflight remains open.
- Purpose-bound verification/recovery/invitation digests, expiry, atomic
  rotation/consumption and legacy-link invalidation are implemented. Verification
  and invitations reject inactive identities; recovery helpers do not mint sessions.
  Public recovery/resend/correction/reset now use these primitives. Invitation
  create/list/status/resend/revoke and explicit acceptance UI are implemented locally. ADR-011 adds sessionVersion and strict JWT revision
  matching; reset/correction revoke older sessions and legacy JWTs require sign-in.
  Uniform 202 request acknowledgements explicitly leave delivery unconfirmed.
  Injected synchronous failures roll back email/token changes. Real Resend dispatch
  now uses a transactional encrypted queue and bounded idempotent retries; real
  staging inbox delivery remains gated; delivered email-link UI is locally validated.
- ET/EN/RU semantic feedback, shared validation and dictionary foundations exist.
  Recipient locale policy/storage and basic component/browser fixtures now pass.
  Delivered auth/shell formatting and preference reconciliation now pass locally;
  later UI migration and human/full-journey release review remain.
- P2-SCOPE-INTEGRITY is technically complete: restrictive event foreign keys,
  null-safe role/invitation uniqueness and history-preserving expired replacement.
  **P2-SCOPE-DEPLOY remains open** before deployment/M1: audit intended global
  scope and duplicates on the actual deployment; local fixtures are insufficient.
- Auth/event screens and backend studio/dancer/performance CRUD exist. Role
  dashboards are placeholders; event staff acceptance/removal/management is implemented
  locally. Application, music, scoring,
  live operation and results journeys are unfinished. No external milestone is complete.
- Public signup now requires studio intent and atomically retains an owner draft.
  Pending owners can recover/save/cancel using password proof without ordinary
  sessions or domain privileges; verified owners can use their session. Login requires active/verified accounts;
  protected requests reject missing/inactive/unverified subjects before roles,
  including existing admin JWTs. Verified roleless users retain permitted access.
  DEV_AUTH uses a real eligible development account and actual stored roles;
  startup refuses DEV_AUTH=true outside development. C2 is corrected locally.
  Global-admin bypass now requires null event scope and active assignment; removed
  assignments/global staff are ignored. All 22 admin-only operations have maintained
  own/other-event HTTP/PostgreSQL denial coverage. Assignment writers are inventoried;
  the judge seed now creates event-scoped access and preserves historical rows.
  Aggregate deployment preflight flags unsupported active scopes without repair.
  Intended-account invitation proof is now
  enforced with transactional revision/eligibility checks, credential preservation
  and USER audit attribution; existing accounts receive no replacement session.
  New-account setup remains available. All four image uploads now enforce stored
  ownership/scope, active parents and existing resource stage/approval gates,
  fully decode/re-encode matching JPEG/PNG/WebP, and commit reference/audit atomically.
  Image retrieval requires authentication, current reference and read access;
  public static serving is removed. Frontend guards now share exact-key/event
  scope checks and resolved profile permissions; forbidden role URLs have
  translated focused recovery. Configured CORS, API security headers, production
  configuration and per-category sensitive-route limits are enforced. JSON parser
  size/encoding failures use private translated 4xx envelopes. Session storage,
  translated shell/navigation/profile and browser session recovery are now implemented.
  Delivered signup/recovery/invitation UI is translated; hosted ingress/shared
  limits, real mail and human release review remain open.
  The email fake is silent; production rejects unavailable delivery;
  storage is always local. Event reads require authentication.
- Baseline CI exists; first hosted-run evidence and required-check settings need
  operator follow-up. Technical completion does not imply workflow/release readiness.
- Last recorded local staging rehearsal used 127.0.0.1:8080 with independent empty
  database/upload volumes, 26 migrations and production fake mail. Container build,
  SPA/health and guest/mail-unavailable smoke checks pass. Generated staging secrets
  remain in ignored deploy/staging.env; development data was not migrated/reset.
  Hosted ingress, domain/provider setup, real mail and restore evidence remain open.

Latest planning review (2026-11-06): development/release gates separated; P3/M2
is the active implementation path. Existing completed work and release blockers
are retained. Source inspection and documentation checks support this adjustment;
no runtime checks, application changes, database operations or rollout were
performed for the planning review. See [plan revalidation](PLAN_REVALIDATION.md).

Latest **recorded** runtime validation (2026-11-09): P3-REGISTRATION,
P3-REGISTRATION-REAPPLY and I18N-CONTENT M2 policy/contracts. Workspace build,
typecheck/lint, localization guard, 116 API + 17 web tests, all 108 Chromium cases,
Prisma generate/validate/format, fresh/upgrade migration parity and complete isolated
PostgreSQL baseline pass. Migration 30 retains IDs, memberships, historical statuses
and audit; SQL checks guard revisions, retry bindings, deadlines and reason values.
Tests prove both approval orders, retained/reconciled access, correction/stale-review
conflicts, cancellation/reapplication/creation races, lost-response retries, scope and
deadline/admin denials, and multi-operation audit rollback. Development/application
data was not migrated/reset; no release or phase is closed. Evidence and next steps:
[registration validation](REGISTRATION_LIFECYCLE_VALIDATION.md).

Previous **recorded** runtime validation (2026-11-06): P4-STAFF-READ,
P4-STAFF-UI and P9-BROWSER-STAFF extend S17/F06 with consistent scoped read DTOs,
confirmed distinct revoke/remove controls, retained history and explicit stale/
uncertain/session recovery. Workspace build/typecheck/lint, 113 API + 16 web tests,
Prisma checks, fresh/upgrade migration parity and complete isolated PostgreSQL
baseline pass; 22-operation admin denial and field allowlists are verified.
All 108 browser cases pass, including 25 staff cases; final results
and screenshot review are in [staff UI evidence](STAFF_UI_VALIDATION.md).
No schema migration, application-data reset, commit or release closure occurred.

Previous **recorded** runtime validation (2026-11-06): P2-JUDGE-ACCEPT,
P2-OFFBOARD and I18N-PREFERENCES under ADR-018/013. Workspace build/typecheck/lint,
112 API + 16 web tests, 83 Chromium cases, Prisma generate/validate/format, isolated PostgreSQL
baseline and fresh/upgrade migration parity pass. Judge/access/consumption and
removal/audit rollback, existing assignment reconciliation, retained Score history,
21-operation global-admin denial matrix and recipient preference isolation pass.
The original Judge handler fails the maintained reconciliation regression.
Browser account-language cases cover ET/EN/RU at four widths, retry, disabled,
keyboard, session precedence and cross-tab persistence. Full results are in [evidence](STAFF_PREFERENCES_VALIDATION.md).
No schema migration, application-data reset, deployed rollout or release closure.

Previous **recorded** runtime validation (2026-11-05): P2-SIGNUP/INVITE/UI-AUTH
under ADR-017. Migration 29 expands only audit actions. Studio intent, owner-only
password/session proof, retained drafts/cancellation, invitation status/CAS
resend/revoke, acceptance/account switching and neutral recovery UI are aligned.
Workspace build/typecheck/lint, 110 API + 16 frontend tests, 67 Chromium cases,
localization guard, Prisma generate/validate/format, fresh/upgrade migration parity
and the complete isolated PostgreSQL baseline pass. The original generic-signup
regression fails before the fix; pending-save controls preserve newer work.
Documentation/UTF-8/local links and git diff whitespace checks pass. No application
data reset or deployed rollout occurred. Verification evidence and precise
remaining release gates are maintained in [the validation record](ONBOARDING_INVITATIONS_VALIDATION.md).

Previous **recorded** runtime validation (2026-11-05): P2-SESSION, Phase 2
I18N-FORMATTING and P2-UI-SHELL workspace build/typecheck/lint/localization guard,
108 API + 16 frontend tests, 46 Chromium cases, Prisma checks, fresh/upgrade
migration parity and complete isolated PostgreSQL baseline pass. ADR-016 chooses
HttpOnly browser JWT cookies with exact-origin/CSRF checks and separate native
bearer transport; one-hour browser expiry and audited all-account-session logout
use the existing revision. Migration 28 expands only the audit action allowlist;
no application-data reset or deployed rollout occurred. Tests cover transport
isolation, audit rollback/concurrent revocation, preserved mounted work, cross-tab
logout/verification, safe returns, role/event navigation, profile/formatting,
ET/EN/RU and four widths. Fluent-language/screen-reader review, hosted ingress,
real mail and full auth journeys remain open. See [evidence](SESSION_SHELL_VALIDATION.md).

Previous boundary/role validation (2026-11-05): P2-BOUNDARIES,
P2-BOUNDARIES-ERRORS and P2-ROLES workspace build/typecheck/lint, localization
guard, 105 API + 13 frontend tests, Prisma generate/validate/format, migration
fresh/upgrade parity and complete isolated PostgreSQL baseline pass. Browser
coverage includes ET/EN/RU roles at 320/390/768/1440px, direct/wrong-event/scoped
admin/roleless/expired access, permission gates and keyboard denial recovery.
Original-handler boundary and gate probes fail before the fixes. No schema
migration or application-data reset was needed; test-only database/schemas were
created and removed. See [evidence and limits](BOUNDARIES_ROLES_VALIDATION.md).
Hosted ingress, real mail, screen-reader/fluent review and the full UI shell remain
open; no phase or external milestone is closed.

Previous P2-BOUNDARIES-UPLOADS runtime validation (2026-11-01): P2-BOUNDARIES-UPLOADS workspace
build/typecheck/lint, localization guard, 99 API + 10 frontend tests, Prisma checks,
fresh/upgrade migrations with historical audit preservation/parity and complete
isolated PostgreSQL/image baseline pass. Negative ownership/content regressions
fail against the original handler and pass with the fix. Private retrieval,
metadata/content bounds, transactional audit rollback, refreshed authorization,
concurrent replacement and unreachable-orphan behavior pass. Migration 27 expands
audit allowlists only; no application data/reset/legacy file cleanup was performed.
Sharp is the new raster decoder dependency. See [image evidence](IMAGE_BOUNDARIES_VALIDATION.md)
and [ADR-015](adr/015-image-boundaries.md). The staging rehearsal remains on
its previously recorded code/schema; actual rollout/provider/cleanup gates remain.
Previous P2-ROLES-ADMIN-SCOPE validation (2026-11-01): workspace
build/typecheck/lint, 95 API tests, localization guard, Prisma generate/validate/
format, migration parity and complete isolated PostgreSQL baseline pass. Nine
unchanged frontend tests were reused from the local cache. The 18-operation scope
matrix proves scoped/removed/global-staff denial with unchanged records, active
global-admin success, immediate removal denial and aggregate preflight behavior.
See [scope evidence](ADMIN_SCOPE_VALIDATION.md). No schema migration or
application-data reset was needed; actual deployment provenance remains open.
Previous P2-INVITE-IDENTITY validation (2026-11-01): workspace
build/typecheck/lint, 93 API + 9 frontend tests, localization guard, Prisma
generation/validation/format, fresh/upgrade migration parity and complete isolated
PostgreSQL baseline pass. Regressions cover intended/wrong/no/stale/ineligible
identity, preserved credentials/unrelated access, audit attribution, rollback and
concurrent acceptance. No schema migration or application-data reset was needed.
See [invitation evidence](INVITATION_IDENTITY_VALIDATION.md).
Previous Phase 2A validation (2026-10-25): workspace build,
typecheck, web lint, 92 API + 9 frontend tests, localization guard, Prisma checks,
fresh/upgrade migration parity (including SQL-only checks/functions/triggers), and
the complete isolated PostgreSQL baseline pass. New fixtures prove immutable and
transactional audit, recoverable onboarding, role/studio scope constraints,
removed/scoped-admin denial and encrypted email rollback/retry/stale-link expiry.
Twelve Chromium fixture cases cover three languages at four widths, keyboard,
focus and overflow, with measured contrast and visual review. See
[foundation evidence](PHASE_2A_VALIDATION.md). Previous recovery/session and
eligibility evidence remain in [recovery](AUTH_RECOVERY_VALIDATION.md) and
[eligibility](AUTH_ELIGIBILITY_VALIDATION.md); earlier schema/token/scope
reports retain their dated findings. Operational deployment/real delivery and
full journey/human review evidence remain open.
The [implementation audit](REPOSITORY_AUDIT.md) reran workspace/Prisma/database
checks and additional security probes; it records cache use and verification limits.
The subsequent correction-planning update changed documentation only and did not
rerun runtime checks or fix any finding.

Documentation audit (DOCS-AUDIT): shortened entry points, split task/reference
files, reconciled stale guides and retained incoming scope/UI work. Findings,
preservation checks and reading-cost measurements: [audit](DOCUMENTATION_AUDIT.md).
Runtime priorities and completion states are unchanged.

Repository implementation audit (2026-10-25): [findings and fresh validation](REPOSITORY_AUDIT.md).
Workspace, Prisma and isolated PostgreSQL checks pass; reachable invitation,
inactive-account and upload security defects remain M1 blockers. No implementation
was changed by this audit. Subsequent identity/token work is recorded above;
request eligibility was subsequently corrected under P2-AUTH-ELIGIBILITY.
Public auth recovery and intended-account invitation acceptance are now delivered
technically. Image ownership/content/private retrieval is now delivered under
P2-BOUNDARIES-UPLOADS. Signup/recovery/invitation and staff UI are delivered locally;
real provider delivery, intended-target deployment and human release work remain
before external exposure.

## UI source audit archived 2026-11-10

Original 2026-10-25 audit with later partial annotations, retained as dated
evidence. It contains superseded implementation claims; use current routes and
contracts for behavior. Screen/flow targets and UX-D decisions stay in UI_UX.

### Audit of the current experience

Static source audit; no browser usability or assistive-technology test was run.
Sources: [routes](../apps/web/src/routes/index.tsx), layouts, all current pages,
auth guards/context, API modules, i18n and feedback components; backend router,
controllers, shared schemas, Prisma model and the related maintained guides.

| Finding / mismatch | Evidence and intended resolution | Owner |
| --- | --- | --- |
| Studio signup and owner-proven recovery implemented locally | ADR-017 enforces intent, atomic owner draft and password/session proof without domain privileges. Applications remain gated. | P2-SIGNUP complete locally; P5-APPLICATION |
| Verification instructions exceed runtime enforcement | RegisterPage asks users to check email; login still permits unverified accounts and delivery is a stub. | P2-AUTH/EMAIL |
| Event screens look public but data is protected | `/events` and detail lack route auth guards; API reads require auth per ADR-002. Explicit sign-in state now; public release only after DTO/publication decision. | P2-UI-SHELL; UX-D02 |
| Dead application links and incorrect stage availability | EventInfo links `/events/:id/register` and `/events/:id/studio`; neither route exists. It offers application in DATA_REVIEW; backend only allows new non-admin applications in PRE_REGISTRATION/REGISTRATION_OPEN. | P5-APPLICATION |
| Guards disagree about roles and omit consistent event scope | useRole uses exact display names; RequireRole uses fuzzy display names. Backend profile already exposes keys/scopes. Denied guards redirect home without explanation. | P2-ROLES |
| Interrupted authentication loses task | Login restores pathname only; token-bearing 401 hard redirects; verification sends users home after a timer and is guest-gated. Signed-in/wrong-account email links need deliberate recovery. | P2-SESSION/AUTH |
| Invitation/recovery screens and pending management implemented locally | `/auth/accept-invitation` and `/auth/reset-password` match mail contracts; global-admin create/resend/revoke/status is available. Judge record and role remain separate. | P2-INVITE/UI-AUTH complete locally; P2-JUDGE-ACCEPT |
| Dashboards and profile controls overpromise | Four role pages are text placeholders; profile Edit has no handler and account menu says Edit Profile. Remove misleading actions or deliver a supported contract. | P2-UI-SHELL; feature phases |
| Event form omits stored setup details and controlled transitions | EventForm collects name/dates/stage; edit initializes only those. Venue/limits/image/timezone/deadlines/checklist need feature work; raw stage selector is not a transition workflow. | P3-REGISTRATION/P4-CORE |
| Draft, music, live and results promises exceed persistence | Performance create needs complete fields and stage order; Score has free-form criterion/Float, no sheet locks. No music/live/results endpoints or screens. Keep these as gated targets. | Phases 3, 5–7 |
| Localization foundation is stronger than visible UI | Semantic feedback and three catalogues exist; auth/layout/profile/dashboard literals and profile date-fns formatting remain. Existing date formatter uses browser timezone; event timezone is absent. | I18N-UI/FORMATTING |
| Accessibility and visual patterns are inconsistent | Login/register use click handlers rather than semantic form submit; AuthNav declares menu roles without complete menu keyboard handling; AuthLayout removes focus outline; spinner has English label. No shared tokens, skip link or complete focus contract. | P2-UI-FOUNDATION/SHELL |

P2-SCOPE-INTEGRITY is technically complete under ADR-008; P2-SCOPE-DEPLOY remains
open. This static UI audit does not claim deployed-data, staff-onboarding or
browser/assistive-technology validation.


## Audit correction narrative archived 2026-11-10

Former correction-map introduction/order, last updated 2026-11-05. Task statuses,
operation counts and “next” actions below are historical; use the checkpoint and
roadmaps. Finding IDs and acceptance requirements remain in AUDIT_FOLLOWUP.

Updated: 2026-11-05. Source evidence: [repository audit](REPOSITORY_AUDIT.md).
Priority and milestone gates: [checkpoint](../DEVELOPMENT_PLAN.md).
Implementation checkboxes live in the owning roadmap; this table maps findings
to those tasks and their acceptance evidence. C1/C2/C3/C4/H2 are technically corrected
locally by P2-INVITE-IDENTITY, P2-AUTH-ELIGIBILITY, P2-BOUNDARIES-UPLOADS and
P2-IDENTITY-TOKENS. H5/M1/M3 are now technically corrected locally under
P2-BOUNDARIES/ERRORS and P2-ROLES; the other 7 findings retain open scope.
See [boundary and role evidence](BOUNDARIES_ROLES_VALIDATION.md). Current evidence:
[image boundaries](IMAGE_BOUNDARIES_VALIDATION.md), [invitation identity](INVITATION_IDENTITY_VALIDATION.md), [identity lifecycle](IDENTITY_TOKEN_VALIDATION.md)
and [account eligibility](AUTH_ELIGIBILITY_VALIDATION.md). Historical audit probes remain
dated evidence, not a description of the subsequently corrected token/account behavior.

### Order and release gates

1. P2-IDENTITY-TOKENS is locally complete: canonical identity/collision refusal,
   legacy invalidation, digests, expiry and atomic consume/rotation. The
   schema audit, account eligibility and public recovery are also technically
   complete. Minimal AUDIT/PRIVACY/staff-policy foundations are now implemented
   under ADR-012/013. Resend/queue/UI fixture foundations pass locally; real delivery
   and hosted deployment remain open. P2-INVITE-IDENTITY is now locally complete;
   P2-ROLES-ADMIN-SCOPE is now technically complete, including the writer and
   18-operation negative inventory. P2-BOUNDARIES-UPLOADS is technically complete;
   P2-BOUNDARIES transport/abuse controls, parser errors and frontend role
   consistency are also complete locally. P2-SESSION, shell and Phase 2 formatting
   are now technically complete under ADR-016. P2-SIGNUP/INVITE/UI-AUTH are locally
   implemented under ADR-017; next is P2-JUDGE-ACCEPT. Independent fixes
   retain their own prerequisites. H1's actual deployment provenance remains open
   under P2-SCOPE-DEPLOY; see [scope evidence](ADMIN_SCOPE_VALIDATION.md). See
   [foundation evidence](PHASE_2A_VALIDATION.md).
2. Close critical request/identity/upload boundaries and scoped-admin escalation
   through P2-AUTH, INVITE-IDENTITY, ROLES-ADMIN-SCOPE and BOUNDARIES-UPLOADS. Run
   independent upload work as soon as its own prerequisites pass; it need not wait
   for the entire staff invitation model, UI, music or scoring roadmap.
3. Local M1 session controls are implemented. Complete the actual deployment
   scope preflight and hosted operational gates. Full invitation management remains an M4 task;
   the mounted acceptance identity defect is corrected locally with M1 evidence.
4. Deliver truthful email and auth/navigation UI, then gated application/staff
   journeys, including same-studio cancellation/reapplication. Add browser,
   accessibility and ET/EN/RU evidence alongside each delivered flow.

Local session/shell/formatting evidence is now in
[session/shell validation](SESSION_SHELL_VALIDATION.md). L1 inert editing is corrected;
H4/M4/M5 have delivered-scope navigation/browser improvements but retain full
workflow and human-review gates. No external exposure of the current API is approved by passing DTO/unit tests or
by hiding upload/acceptance UI. M1 includes the security subtasks below; M2/M4
also retain their existing provider, workflow, localization and operations gates.
Do not reopen completed Phase 1 contract slices or mark a milestone complete just
because this correction plan exists.

## Test coverage descriptions archived 2026-11-10

Former TESTING descriptions, with counts/status from different earlier slices.
These are historical descriptions, not newly executed commands. TESTING retains
current commands, fixture isolation and links to the maintained tests/inventory.

The baseline runner uses only the checked-in Compose fixture, creates a random
dance_baseline_* database, deploys/redeploys migrations, checks full-record seed
idempotency and production-seed refusal, and starts its own compiled API on a
temporary port. It runs registration, dancer, performance, studio, judge, category,
format/age-group and invitation
HTTP/database workflows, event DTO/persistence and concurrent partial-date
checks, and auth/profile DTOs with real global/event roles and resolved permission
scopes (including immediate removal). The fixture explicitly raises login/general
limits to 500/2000 per window because it repeats hostile operations from one IP;
maintained boundaries.test.cjs independently tests low configured limits. Category checks include
strict CRUD, scoped reads/admin writes, cross-event parents, name conflicts and
competing creates, plus deletion preserving active/archived performances. Setup
checks preserve duplicate labels, nullable ages and valid concurrent partial ranges.
Invitation checks cover scoped new-account setup and intended existing-account
authentication, unsupported global/unclassified denial, wrong/no/stale/inactive/
unverified session denial, full-field credential/access/invitation preservation,
USER audit attribution, concurrent acceptance and consumption/audit failure rollback.
Existing-account success issues no new JWT. See
[invitation identity evidence](INVITATION_IDENTITY_VALIDATION.md).
Scope-integrity checks additionally race direct global/event role and invitation
writes, restrict deletion with assignments or invitation history, and replace
expired links concurrently without losing old records. The baseline's isolated
upgrade schemas verify full-field role/invitation preservation and atomic refusal
of ambiguous legacy duplicates. Migration parity compares both scope SQL-only
indexes exactly as well as Prisma-derived columns and foreign keys.
Email-identity fixtures also verify canonical email upgrades, full-field preservation,
account/global/event invitation collision refusal and direct-write checks under
ADR-009. Migration parity includes the SQL-only canonical email CHECK constraints;
HTTP workflows exercise case/space variants and duplicate-account preservation.
Token fixtures cover legacy plaintext removal/link invalidation, account/access/
invitation-history preservation, purpose/expiry/replay/rotation/revocation,
concurrent verification/recovery, inactive/changed-email denial and real database
failure rollback after token claim. Recovery primitives run against the disposable
database; they are not public endpoints. The SQL-only outstanding-account-token
unique index is included in migration parity. Secret-free development and failed
production email stubs have unit regressions.
Schema-audit fixtures additionally validate six token storage CHECKs, refusal of
each invalid preexisting state with all checks rolled back, full-record valid
upgrade preservation and direct SQL rejection. Expired account-token fixtures
retain a positive historical issuance/expiry interval. Exact parity now includes
the SQL-only active-studio-name index without excluding it from signatures.

### Phase 1 coverage and localization gate

pnpm test first runs pnpm test:i18n, a TypeScript AST source guard against new
hardcoded JSX text/accessible attributes. Existing reviewed exceptions are in
[i18n-hardcoded-baseline.json](i18n-hardcoded-baseline.json); they remain I18N-UI
work. The detector itself has a regression test. Do not regenerate this baseline
to hide new strings; translate them or document a specific intentional-content
exception. Catalogue completeness, placeholder and native plural checks run for
ET/EN/RU in the web test task. Typecheck also exercises invalid key/argument cases.

The current suite has 99 API tests and 10 frontend tests. Frontend checks include
all-locale component renders of the same stored error, field links, selector
semantics, network/non-JSON/multipart/204 handling, response-schema failures and
safe legacy/future fallback. Shared validation preserves root/nested rules and
bounds without input values. These are static component/transport checks, not
interactive browser, keyboard/mobile/screen-reader or fluent-language review.
Those remain per-workflow release checks under I18N-QA and P9-BROWSER.

[api-coverage.json](api-coverage.json) inventories 60 mounted method/path operations
and their test evidence/non-applicable or Phase 2 exceptions. Tests compare runtime
router registration to the inventory and reject unauthenticated access to every
protected operation. /health is an infrastructure exception; protected GET
/uploads/:resource/:filename is tested separately in the image baseline.
The coverage inventory does not imply complete authorization hardening:
frontend role guards and remaining transport/abuse controls are still Phase 2 gates.
Intended-account invitation proof is implemented under P2-INVITE-IDENTITY;
management, acceptance UI and Judge reconciliation remain separate gates.
The globalAdmin evidence field marks all 18 mounted admin-only operations.
Maintained HTTP tests deny own/other-event scoped admins, removed admins,
unsupported global staff and similarly named roles. check-admin-scope.cjs repeats
the inventory matrix against PostgreSQL, compares full domain/audit snapshots,
checks immediate removal using the same JWT and tests unsupported invitation
creation/inspection/acceptance/rotation. The exact aggregate scope preflight runs
against synthetic historical rows without exposing account details. Fresh seed
checks require an event-bound judge and no newly created global judge; seed
idempotency and all existing migration/HTTP fixtures remain required. See
[admin scope evidence](ADMIN_SCOPE_VALIDATION.md). Actual deployment provenance
remains P2-SCOPE-DEPLOY; fixture counts cannot close that gate.
Image checks additionally run check-image-boundaries.cjs in an isolated child with
real PostgreSQL, a temporary local storage root and synthetic raster images.
They verify ownership/event/member/approval/stage denial before storage, archived
parents, genuine uploads and private retrieval headers, no static fallback, live
reference checks, IMAGE_REPLACED audit rollback, fresh authorization after storage,
concurrent replacement and cleanup-failure orphan denial. The child deletes only
its verified temporary root. Raster unit tests cover PNG/JPEG/WebP decoding,
metadata stripping, MIME/extension/content mismatch, malformed/animated input and
pixel/output bounds. Client tests restrict bearer downloads to canonical API-origin
images with no redirects or credential query parameters. Migration parity includes
expanded audit allowlists and preserves a historical audit row. See
[image evidence](IMAGE_BOUNDARIES_VALIDATION.md). No image UI/browser flow is claimed.
Account eligibility is tested across every protected inventory operation with
missing/inactive/unverified subjects, before role resolution. PostgreSQL checks
also retain issued JWTs while disabling, removing or unverifying their account,
cover verified roleless/admin paths and prove denied operations preserve records.
The development-mode API fixture resolves a persisted seed actor, exercises an
invitation creator foreign key and rejects disabled/unverified seed identity.
Configuration tests refuse DEV_AUTH outside development. Missing-identity
registration now fails at 401; a database trigger under a valid identity preserves
the original nested-write rollback coverage.
Public recovery adds strict-body/neutral-acknowledgement, password proof,
delivery availability/failure, session revision and shared-throttle HTTP tests.
The baseline also runs check-auth-recovery.cjs in an isolated child with an injected
mail fake: real PostgreSQL checks email collisions, identity/membership preservation,
failed-send rollback, reset/rotation races, expiry/replay/wrong-purpose/inactive
denial, database rollback and old-session rejection. Raw synthetic delivery secrets
stay inside that test child. Migration upgrades verify default-zero revisions and
negative-version rejection; SQL-only check parity includes sessionVersion.
