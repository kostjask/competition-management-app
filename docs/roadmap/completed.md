# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 0 — Preserve and restore the development baseline (complete)

Goal: obtain a reproducible, buildable checkout without losing current work.

- [x] Review the current Git diff and split it into logical changes: migrations, controller refactor, route changes, shared schemas, and event UI. See [baseline change review](../BASELINE_CHANGE_REVIEW.md) for file groups, dependencies, and blockers; existing edits are preserved in logical commits.
- [x] Confirm the three untracked migrations are valid and ordered correctly. Repaired the unpublished status-resetting migration, added the missing `Event.maxPerformances` migration, and verified fresh SQL application, existing-data preservation, partial uniqueness, and schema parity. See [migration validation](../MIGRATION_VALIDATION.md).
- [x] Run `pnpm install --frozen-lockfile`; repair lockfile/workspace dependency consistency deliberately. Explicit build approvals and Turbo 2.11.10 restore compatibility with the preserved pnpm 12 lockfile.
- [x] Generate the Prisma client from the configured schema (`pnpm.cmd db:generate` passed). Standard `@prisma/client` imports and compiled API runtime are verified.
- [x] Add missing workspace scripts for `build`, `typecheck`, `lint`, and `test` where applicable. All workspaces have build/typecheck coverage; web lint and the initial Node API baseline ran at this checkpoint. Seed has its own strict typecheck; no placeholder scripts were added. Latest recorded validation is linked from the current checkpoint.
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

## Phase 1 — API contracts and automated baseline (complete: technical scope)

Entry: Phase 0 baseline preserved. Resource tasks must validate external input,
use explicit shared DTOs, canonical paths/client helpers, centralized errors, and
HTTP authorization/relationship tests. Keep non-trivial behavior in controllers;
record an explicit exception for any simple inline handler retained. Run the
relevant isolated database checks when changing transactional/data behavior.

- [x] P1-BASELINE: dependency refresh, shared-package runtime/build repair, Prisma generation, and baseline checks. See [dependency refresh](../DEPENDENCY_UPDATES.md).
- [x] P1-ADRS: accepted ADR-001/002/005 and recorded ADR-006 direction; implementation remains separately tracked.
- [x] P1-COMPOSITION: versioned app factory/router composition, explicit auth boundaries, and mount tests; previously active resource routers are mounted once.
- [x] P1-REGISTRATION: canonical atomic studio/pending-registration/membership creation, approval/roles, pending cancellation, shared contracts, and workflow/rollback checks. Duplicate-name response mapping is complete under P1-CONFLICT.
- [x] P1-DANCERS: canonical studio nesting, calendar-date DTOs, ownership/approval/stage validation, transactional writes, and audited archive checks.
- [x] P1-PERFORMANCES: canonical event paths, complete controller, removal of duplicate/GET-body handlers, same-studio participants/configuration validation, transactional replacement, DTOs, and audited archive checks.
- [x] P1-STUDIOS: canonical profile/member/approval operations, strict nullable inputs/DTOs, member reads, scoped writes, global active-name conflicts, and archive checks.
- [x] P1-JUDGES: consolidated judge controller, strict shared DTOs and canonical frontend helpers; covered event existence/scope, parent substitution, active user relation, nullable profile updates, conflict/error responses, and CRUD. Event/user links are immutable; scored judges cannot be deleted. No schema migration or role/record acceptance implementation. See the judge checkpoint in development history.
- [x] P1-CONFLICT: studio-registration creation maps database duplicate active-name failures to global 409 responses under the existing SQL-only index. HTTP regression and PostgreSQL checks cover applicant/admin conflicts across events/locations, unchanged records/roles, competing creates with one complete winner, case sensitivity, and archived-name reuse/preservation. No migration. See the registration-conflict checkpoint in development history.
- [x] P1-CI: added independent GitHub Actions workspace and PostgreSQL jobs for frozen install, build, typecheck, current lint/tests, Prisma validation/formatting, and isolated migration/workflow suites. Read-only permissions, health readiness, bounded jobs, run-specific Compose scope and always cleanup; unavailable Docker fails visibly. Migration runner selects the platform pnpm executable. Local actionlint/Compose checks and command suites pass; first hosted run and required-check settings await publication. See [TESTING](../TESTING.md) and the CI checkpoint in development history.
- [x] P1-EVENTS: strict shared event inputs/DTOs and runtime-validated client; stored nullable details/limits, explicit UTC serialization, no private image path or invented updatedAt. Authenticated reads/admin-only writes, global errors, missing records, resulting partial-date validation and serializable conflict handling covered by HTTP/PostgreSQL tests. No migration; image mutations remain uploads. Later deadlines/lifecycle policy follow P3-REGISTRATION; setup UI remains Phase 4.
- [x] P1-AUTH-CONTRACTS: strict shared auth inputs and explicit registration/login/verification/profile DTOs; frontend validates before saving session tokens. Profiles explicitly serialize UTC creation time, role keys and null/event scopes without private fields or unrestricted relations. Shared global error schema/type, preserved client 403 messages, duplicate-registration race mapping and typed/validated compact JWT expiry. HTTP/config and PostgreSQL profile/login checks pass; no migration. Eligibility, token lifecycle, active/verified account enforcement and role guards remain Phase 2.
- [x] P1-CATEGORIES: consolidated controller, strict trimmed-name inputs/shared DTOs and runtime-validated canonical client helpers. All operations verify the event; reads require admin or global/event event.manage, writes remain admin-only. Item mutations constrain both IDs atomically. HTTP and isolated PostgreSQL checks cover CRUD, validation, scope/parent failures, duplicate and concurrent conflicts, missing items and performance-restricted deletion including archived records. No migration, lifecycle policy or management UI. See the category checkpoint in development history.
- [x] P1-FORMATS: controller/shared contracts and canonical client helpers implemented; strict PostgreSQL integer/name/range inputs, resulting partial-range validation in serializable transactions, event/scope checks, CRUD, conflict and active/archived performance-preservation tests. Duplicate labels remain permitted by the current schema. New participant/duration policy follows P3-ENTRIES.
- [x] P1-AGE-GROUPS: controller/shared contracts and canonical client helpers implemented; nullable maxAge with omitted-versus-cleared updates, strict integer/name/range inputs, resulting partial-range/concurrency validation, event/scope checks, CRUD and referenced-performance preservation. Duplicate labels remain permitted. Eligibility/overlap policy follows P3-ENTRIES.
- [x] P1-INVITATION-CONTRACTS: controller, strict shared serialized DTOs, canonical client and global errors implemented. Role/event existence and stored acceptance scope validated; typed serializable lookups replace unsafe nullable compound-key casts. DTOs omit raw tokens; acceptance/session and replay/rollback tests pass. Existing-account identity, role allowlists/mandatory staff scope, token history/digests and Judge reconciliation remain Phase 2.
- [x] P1-IMAGES: controller, path/output/error contracts, canonical multipart helpers and all four route/storage-fake tests implemented. DTOs omit storage paths; active studio/dancer checks and upload-before-update replacement preserve old files on upload/database failure. Complete provider/cleanup semantics remain P8-MEDIA; resource-specific authorization remains P2-BOUNDARIES and must pass before upload UI.
- [x] P1-TYPES: unused nomination schemas/interfaces removed; shared inferred resource DTOs are canonical. Removed nullable-scope, JWT identity and HTTP response casts; request transport returns unknown and decodes every response. No any or unsafe cast remains in migrated controller/route/error/client boundaries. Non-transport ID alias remains in packages/types.
- [x] P1-COVERAGE: 56 mounted method/path entries inventoried in docs/api-coverage.json with success/input/authentication/permission/parent/active/conflict evidence and explicit non-applicable or Phase 2 exceptions. Runtime router inventory and every protected operation authentication tests prevent drift. HTTP/PostgreSQL resource tests cover applicable current semantics; infrastructure health/static responses and deferred security gates are explicit exceptions, not full security/browser coverage.

Phase 1 exit evidence: 72 API tests, 8 frontend tests, source/coverage guards,
workspace and Prisma checks, and the complete isolated PostgreSQL baseline pass.
I18N-CONTRACT/CORE/VALIDATION and the I18N-QA foundation gate are implemented.
Hosted CI publication/settings and browser/fluent review remain explicit external
or later workflow evidence; no M1/M2 or external release is marked complete.

User management routes remain deferred until a concrete use case defines them;
do not mount or add an empty users controller to finish a checklist.

Exit: no duplicate/unreachable handlers; every in-scope operation is covered by
the resource contract matrix; frontend paths match backend paths; all error
responses use the global envelope; strict typecheck passes with any exception
documented; P1-CI runs the baseline and I18N-QA foundation checks. I18N-CONTRACT,
I18N-CORE and I18N-VALIDATION pass for migrated resources. Success DTOs and 204
responses are not errors; localized success notices use stable message descriptors.


## Completed documentation outcomes

- [x] UIUX-DOCS: current-frontend audit, S01–S17 screens, F01–F10 flows, design system and UX-D01–D10 register. Specifications only.
- [x] PLAN-REVIEW: stable task IDs, milestone dependency map, early audit/privacy/email/CI and release gates; historical checkpoints separated from current status.
