# Dance Competition Management System — Development Plan

Last audited: 2026-10-24

This document is the practical source of truth for continuing development. It summarizes the repository as it currently exists, records known inconsistencies, and orders future work so that unfinished refactors are stabilized before new product features are added.

## Current checkpoint and next action

Phases 0 and 1 are complete for their technical scope. Phase 2A is next; no
user-facing onboarding milestone or external release is complete. All mounted
business resources now have controller/shared DTO/client contracts, including
setup, invitations and uploads. ET/EN/RU feedback contracts, dictionary core and
shared validation are implemented; later UI/email/content translation and browser
release evidence remain separate. Current contracts are in [API.md](docs/API.md).

**Next task: P2-SCOPE-INTEGRITY**: fix event-removal scope broadening and enforce
null-safe role/invitation uniqueness with a reviewed new migration and isolated
PostgreSQL preservation/concurrency tests. Begin with the policy/data audit in
[DATABASE_REVIEW.md](docs/DATABASE_REVIEW.md); do not infer lost scope or merge data.
No deployed-data audit or scope migration has been performed in Phase 1.

Latest validation (2026-10-24): workspace build/typecheck/web lint; 72 API tests and
8 frontend localization/transport tests; source-text guard and 56-operation
coverage inventory; Prisma validate/generate/format checks; and the complete
isolated PostgreSQL baseline, including setup concurrent ranges and invitation
acceptance/rollback. No schema migration was added. Details are in
[development history](docs/DEVELOPMENT_HISTORY.md). Hosted CI execution and
required-check settings remain operator follow-up after publication.

Phase 1 exceptions are explicit: infrastructure health/static responses are not
business DTOs; image ownership/permissions and existing-account invitation safety
remain mandatory Phase 2 gates. Raw invitation tokens were removed from normal
DTOs, but token digests/lifecycle, email-stub logging and nullable-scope integrity
remain unfinished. Email is still a stub and public signup remains unrestricted.

Localization is not an end-to-end release claim: I18N-QA foundation checks run in
pnpm test/CI, while 95 reviewed existing literal UI strings remain I18N-UI work.
Browser/keyboard/mobile/screen-reader and fluent ET/EN/RU review are still required
for delivered journeys. See [localization contracts](docs/LOCALIZATION.md).

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

[ADR-006: account eligibility and staff onboarding](docs/adr/006-account-eligibility-and-staff-onboarding.md) records the accepted target: studio-focused self-service onboarding, invitation-only event judges/moderators, studio-bound additional representatives, controlled admin provisioning, and no spectator accounts. Generic public registration still exists; backend enforcement and transition work below are pending. Pending applicants remain legitimate users without approved representative privileges.

[User journeys and UX requirements](docs/USER_JOURNEYS.md) defines intended account, application, approval, entry, invitation, and competition-day behavior, current gaps, and acceptance criteria. [Registration workflow](docs/REGISTRATION_API.md) separates account creation, event application, and final entry submission. These documents do not mark runtime features complete or override ADRs.

The first onboarding milestone (M2) is a studio applicant who can verify their email, apply to one event, and always find their status and next action. It needs the registration-specific foundations and organizer/applicant screens below; it does not need scoring, schedule generation, or live-event schema. Real email moves to Phase 2A and is a release gate for M2.

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
- Mounted business resources use controllers; the deferred users router remains empty.

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
- Strict shared contracts/controllers/client helpers for categories, age groups, formats, judges, invitations and images.
- Studio approval, event-registration, dancer, and performance business rules in progress.
- Event-stage checks for registration data changes.
- Soft-delete fields for studios, dancers, and performances.
- API client wrapper with JWT injection and structured frontend errors.
- Event list/detail/form UI and three-language translation infrastructure.
- Local image storage and upload middleware.
- Environment validation and `.env.example` files.

### Partial or not integrated

- Mounted resource controller migration is complete; setup/onboarding UI remains unfinished.
- Resolved (2026-10-24): performance routes now compose one controller with no duplicate inline handlers.
- The performance router is mounted under canonical event paths; `routes/users.ts` remains empty and user management is deferred.
- Studio profile, registration, dancer, and performance clients match canonical routes/shared contracts; corresponding screens are absent. Setup contracts are aligned; management screens remain pending.
- Auth and invitation routes now use `/api/v1` with explicit protected operations; duplicated invitation paths are removed. Invitation DTO/controller cleanup is complete; business/security and token lifecycle remain Phase 2.
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
- Comprehensive application/UI coverage. Baseline CI workflow is implemented with independent workspace and PostgreSQL jobs; the first hosted run and branch-protection configuration are pending publication. The latest recorded API suite has 72 tests and 8 frontend localization/transport tests plus isolated PostgreSQL workflow checks; browser workflow coverage remains pending.
- OpenAPI documentation.

## 4. Immediate Problems Found During Audit

Open findings are assigned to stable task IDs in the delivery plan. Resolved entries remain only as concise context; detailed checkpoint reports are archived. Do not expose management workflows before their security gates pass.

### P0 — Repository and build health

- The unfinished backend refactor and baseline repairs are preserved in logical commits. Route integration and security work remain incomplete.
- Resolved (2026-10-23): frozen dependency installation, Turbo lockfile compatibility, workspace build/typecheck coverage (including the previously unnamed API), baseline tests, web lint, and whitespace checks now pass. See [baseline validation](docs/BASELINE_VALIDATION.md).
- Prisma deployment/redeployment and full-record seed idempotency pass in an isolated empty database; compiled API startup and basic authentication/authorization smoke checks pass.
- The user authorized commits, and the checkpoint is satisfied by the database, backend/build, frontend, and documentation commits. Phase 0 was complete and Phase 1 active at that checkpoint; Phase 1 technical scope is now complete. No push was requested or performed.

### P0 — Route integration and contract mismatches

- Resolved (2026-10-24): `performancesRouter` is mounted once in versioned composition. `routes/users.ts` remains empty; no user-management endpoint is claimed.
- Resolved (2026-10-24): dancer collection/item routes now use `/api/v1/studios/:studioId/dancers` and `/api/v1/studios/:studioId/dancers/:dancerId`. Controller checks derive event permissions from the studio, validate ownership/approval/stage and parent relationships, and use shared calendar-date DTOs.
- Resolved (2026-10-24): performance client and backend now use `/api/v1/events/:eventId/performances` collection/item paths with an optional validated studio list filter.
- Resolved (2026-10-24): studio registration now uses canonical `/api/v1/events/:eventId/studio-registrations` collection/item routes. Creation atomically saves studio, pending registration, and the non-admin applicant membership; approval/cancellation enforce event scope and ownership. Registration and studio profile clients now match canonical contracts; application screens remain separate work.
- Resolved (2026-10-24): studio profile/detail/update/archive, representative, and organization-approval clients now use canonical `/api/v1/studios/...` paths with shared runtime-validated contracts.
- Event detail links point to `/events/:id/register` and `/events/:id/studio`, but neither frontend route exists.
- Event reads intentionally remain authenticated per ADR-002. Versioned resource middleware replaces the former global authentication mount; public event DTO/publication policy is deferred.

### P0 — Authorization and security

- Database scope hazard: UserRole.eventId and Invitation.eventId use ON DELETE SET NULL in migrations; null role scope grants global permissions. If physical event removal is allowed by other references, scoped access could broaden. P2-SCOPE-INTEGRITY must fix/review referential actions before M1 and before any event-deletion operation; no current event-delete endpoint or observed exploitation is claimed.
- Ordinary nullable composite uniqueness does not prevent duplicate null-scoped UserRole/Invitation combinations. Audit deployed data and enforce a deliberate global/event uniqueness and invitation-history policy in P2-SCOPE-INTEGRITY.
- `useRole()` compares requested role keys such as `representative` with the role display name such as `Studio Representative`; role-gated UI can fail.
- `RequireRole` separately uses fuzzy display-name matching. Frontend role checks need one key-based implementation.
- Image upload endpoints verify resource existence but not ownership or resource-specific permissions. Any authenticated user can currently target arbitrary event, user, dancer, or studio IDs.
- CORS is hardcoded to `*` even though validated CORS configuration exists.
- Rate-limit settings exist but no rate limiter is installed or used.
- Authentication middleware does not verify that the user still exists, is active, or is email-verified on each authenticated request.
- `DEV_AUTH` uses a synthetic user ID that can fail when handlers write audit/ownership fields requiring a real user.
- Resolved (2026-10-24): invitation create/list DTOs omit raw tokens and signing uses centralized JWT configuration. Plaintext token persistence, stub logging, safe lifecycle and existing-account acceptance remain Phase 2 work.

### P0 — Backend refactor defects

- Resolved (2026-10-24): performance list validates params/query only; complete CRUD uses shared schemas and explicit DTOs.
- Resolved (2026-10-24): performance controller method coverage and accidental import are repaired.
- Resolved (2026-10-24): duplicate performance route logic is removed; routes only compose controller calls.
- Resolved (2026-10-24): mounted business routes, authentication/permission middleware and uploads use the global error envelope with semantic reasons and structured validation. Health remains a simple infrastructure status response.
- Resolved during baseline recovery: all API Prisma imports now use the standard generated `@prisma/client` entry, and error imports resolve at compiled runtime.
- Resolved (2026-10-24): migrated route/controller/error/client boundaries contain no any or unsafe response/nullable-scope casts. Invitation lookups use typed predicates and serializable transactions; database null-safe integrity remains P2-SCOPE-INTEGRITY.
- Soft deletes are inconsistent: some delete routes hard-delete, some return the deleted row, and `deletedBy` is not consistently written.

### P1 — Data-contract inconsistencies

- Resolved (2026-10-24): event DTOs and detail UI omit nonexistent `updatedAt`; shared contracts explicitly serialize stored dates and nullable fields.
- Resolved (2026-10-24): studio, dancer, and performance DTOs omit nonexistent timestamps; nullable fields and representative/registration timestamps follow the actual stored model.
- Resolved (2026-10-24): event mutations accept stored venue/location/description/limits with strict nullable contracts and resulting-date validation. DTOs expose `imageUrl`; image writes remain on upload routes. Broader setup UI is Phase 4.
- Resolved (2026-10-24): performance contracts use current Prisma field names and explicit participant DTOs; the unused duplicate `packages/types` performance interface is removed. Legacy nomination cleanup remains.
- Resolved (2026-10-24): unused legacy nomination schemas/types are removed; resource DTOs are canonical.
- Resolved (2026-10-24): resource clients infer shared DTOs and decode unknown transport output, including before storing sessions.
- Resolved during baseline recovery: web API fallback/example and root setup now consistently use port 4000. Historical endpoint guides still need reconciliation.

### P1 — Domain-model decisions required

- [Database review](docs/DATABASE_REVIEW.md) adds explicit performance ownership, incomplete unscheduled drafts, historical snapshots/revisions, studio display-name identity policy, native date/time and exact scoring precision decisions. These are proposed schema targets, not implemented migrations or reopened accepted ADRs.
- A Studio currently belongs directly to one Event and also has a StudioEventRegistration join model. This prevents a studio identity from cleanly registering for multiple events and duplicates event ownership.
- The documented lifecycle includes a live event, but `EventStage` has no explicit live/running stage.
- Score uses a free-form `criterion` string; there is no rubric, criterion weight, score range, judge assignment, score lock, or submission state.
- Performance scheduling only has a unique `orderOnStage`; there is no stage, session, scheduled time, queue state, pause/skip state, or conflict model.
- No audit-log entity exists despite auditability being a stated product requirement.
- Nullable event scope in compound user-role and invitation uniqueness relies on unsafe Prisma casts and needs database-level verification.

### P1 — Onboarding and workflow gaps

- Generic public registration currently creates roleless accounts without studio context. Replace it with backend-validated, resumable studio onboarding under ADR-006; do not merely hide the signup link or delete existing roleless accounts.
- Judge invitation acceptance assigns a role without an event Judge record; judge CRUD creates the record without the role. Staff invitation scope is optional. Mandatory event scope is P2-INVITE; atomic onboarding is P2-JUDGE-ACCEPT after its persistence/uniqueness prerequisites.
- Existing-account invitation acceptance requires name/password and returns a session without checking the existing password. Require intended-account authentication, prevent inactive-account reactivation, and distinguish pending-invite revocation from removing accepted access.
- Registration copy promises immediate login, while the intended journey requires email verification; login currently does not enforce verification. Align instructions and backend enforcement in P2-AUTH.
- Verification navigates to the homepage and loses the selected event. Safe return destinations and recoverable progress must survive authentication, email verification, and session expiry.
- New applicants have active studio membership but no representative role until event approval. Their application home must not require that role; API ownership checks still apply.
- Event details offer new registration during `DATA_REVIEW`, which the backend rejects. Apply actions must match backend stage rules.
- Invitation emails point to the missing `/accept-invitation` page. External onboarding is blocked until email delivery and recovery work.
- Durable drafts, submission/receipts, retry idempotency, concurrent editing, and correction requests need explicit state/permission decisions before dependent UI. They are not existing registration status meanings.

### P1 — Documentation drift

- Localization foundations implemented (2026-10-24): typed catalogue keys/parameters, supported-locale initialization, native Intl plurals, semantic feedback and shared structured validation. CI checks all three catalogues and rejects new literal JSX/accessible text against 95 reviewed legacy exceptions. Auth/navigation/profile/dashboard text, document language/formatting, email locale and browser/fluent-language review remain in their owning I18N tasks; no complete translation or journey claim.
- Resolved during baseline recovery: root README describes React 19, actual directories, current maturity, prerequisites, setup/start commands, and validation scope.
- The web README is still the default Vite template.
- Registration workflow documentation now distinguishes current contracts from planned UX. Storage, environment, controller, and error guides still include claims or endpoints that no longer match the code.
- Several markdown files contain mojibake characters and should be normalized to UTF-8.
- Historical claims are not current validation. Use the single checkpoint summary above and linked reports; do not copy old test counts or success claims into current status.

## 5. Architecture Decisions

ADR-001, ADR-002, and ADR-005 were accepted on 2026-10-23; their linked records govern Phase 1 stabilization and the later studio migration. ADR-006 adds accepted account eligibility/staff onboarding direction on 2026-10-24. Decisions describe target behavior, not completed runtime changes. Record ADR-003 and ADR-004 before implementing their dependent features.

### ADR-001: Studio identity and event registration

Accepted: [ADR-001: reusable studio identity and event registration](docs/adr/001-studio-identity-and-event-registration.md). Make Studio global and reusable across events; retain the existing organization approval gate separately from event approval.

- Remove `eventId` from Studio.
- Keep the many-to-many relationship through StudioEventRegistration.
- Scope event-specific approval/edit permissions to StudioEventRegistration.
- Preserve organization-level studio approval as the existing moderation gate; it never substitutes for event registration approval.
- Migrate existing data before deleting the field.

The event-owned-studio alternative was rejected in ADR-001. Reopen that decision only through a new or superseding ADR; it is not an outstanding product choice.

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
- Define exactly which actions are allowed in each stage. Deliver application/review transitions in P3-REGISTRATION; add live-operation transitions in P6-LIVE-MODEL.
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

## 6. Delivery plan and milestone gates

Task IDs are stable: preserve them when moving or refining tasks. Checkboxes mean
the stated technical slice is complete, not that the entire user workflow exists.
Each task includes its dependency or uses the phase entry gate. Split newly broad
tasks before execution, keeping the parent ID as the traceable outcome.

### Milestones

| Milestone | Required outcome and gate | Prerequisites |
| --- | --- | --- |
| M1 Stable foundation | Integrated resource contracts, critical auth/upload fixes, automated baseline CI, and minimum audit/privacy foundations. | Phase 1 and P2-SCOPE-INTEGRITY, P2-IDENTITY-TOKENS, P2-AUDIT, P2-PRIVACY, P2-AUTH, P2-ROLES, P2-BOUNDARIES, P2-SESSION. |
| M2 Studio application | Applicant signs up, verifies via real email, applies, tracks both approvals, receives a decision, and resumes safely. Organizer can configure registration and review applications. | M1; P2-ONBOARDING-MODEL, P2-SIGNUP, P2-EMAIL, P3-REGISTRATION, P4-CORE, P4-REVIEW, P5-APPLICATION. No scoring/live model prerequisite. |
| M3 Competition entries | Approved representative saves dancers/performances/music, submits validated entries, and handles scoped corrections. | M2; P3-PERFORMANCE-OWNER, P3-CONSTRAINTS, P3-HISTORY, P3-CALENDAR-DATES, P3-ENTRIES; P4-ENTRY-CONFIG; P5-ENTRIES, P5-MUSIC, P5-SUBMISSION, P8-MEDIA. |
| M4 Staff readiness | Admin invites event judges/moderators; intended users accept; assignments/access removal are consistent and preserve history. | M1; P2-STAFF-MODEL, P2-INVITE, P2-JUDGE-ACCEPT, P2-OFFBOARD, P2-EMAIL, P4-STAFF. Can proceed after its prerequisites independently of M3. |
| M5 Competition operation and results | Schedule, queue, scoring, recovery, and publication pass a rehearsal with manual fallback. | M3, M4; Phases 6–7 and applicable Phase 9 operational gates. |

Every external milestone also requires the applicable P9-BROWSER journey checks,
P9-OBSERVABILITY, P9-DEPLOY staging evidence, and P9-RECOVERY data-use safeguards.
These tasks begin with the first released scope and expand incrementally; they
do not wait for a final Phase 9 pass or unrelated future journeys.

Localization gates: M1 requires I18N-CONTRACT, I18N-CORE and I18N-VALIDATION.
M2/M4 additionally require I18N-UI, I18N-FORMATTING, I18N-PREFERENCES and I18N-QA
for their delivered screens, errors, emails and return paths. I18N-CONTENT must
define content/fallback policy before organizer configuration/publication; implement
only the content types needed by the milestone. M3/M5 extend the same gates to
entries, judging/results and exports. Future screen/content coverage does not hold
an earlier milestone open; no language gate can be satisfied by labels alone.

Phase numbers retain their existing topic references. Phase 2A explicitly brings
its required decisions/migrations forward; Phase 2B never waits for Phase 3 audit
or onboarding persistence. Phase 3 now concerns registration/entry foundations;
scoring/live schema and schedule generation move to Phase 6. P4-ENTRY-CONFIG and
P4-STAFF do not block core application setup. Phase 8 media work runs before M3,
not after results. Phase 9 expands earlier quality/release work rather than starting it.

Default execution follows the active phase and the current next task. A scoped
milestone may proceed when all its listed prerequisites pass, without waiting for
unrelated deferred tasks. This is the explicit dependency rule for roadmap gates;
do not start unrelated later work just because it is available. No milestone or
phase is marked complete by this documentation reorganization.

### Localization workstream — cross-cutting ET/EN/RU delivery

The Phase 1 foundation tasks below are complete; the cross-phase tasks retain
their own release gates. Phase labels below
assign ownership without delaying foundational work until Phase 9. Keep logs and
internal diagnostics separate from user-visible prose; do not translate API paths,
authorization keys, enum values, IDs or personal/studio names. Reuse the current
translation system where practical; add a library only for a demonstrated need.

- [x] I18N-CONTRACT (Phase 1): extend shared error/success contracts with stable semantic reason/message identifiers, safe typed interpolation parameters, and structured field issues while retaining HTTP status and generic error codes. Preserve these in ApiError and render through one localized presenter; do not match English sentences or infer every domain reason from status alone. Cover auth, global/local route errors, uploads, network failures, non-JSON responses and success notices. Pair backend/client/schema changes so strict DTO validation remains compatible. Acceptance: the same business error renders in ET/EN/RU, unknown/legacy reasons produce a localized safe fallback, raw technical/PII messages are not shown, and changing language updates an already-visible error without a refetch.
- [x] I18N-CORE (Phase 1): infer valid catalogue keys/types from the actual dictionary, enforce all three nonempty locale values, validate saved locale at initialization and define one supported-locale/default/fallback policy. Add typed interpolation and plural handling for ET/EN/RU without sentence concatenation; keep structured message descriptors in UI state and translate at render time. Missing/malformed keys must have safe production behavior and visible development/test diagnostics, not undefined output or raw key leakage. Acceptance: invalid storage, missing keys/locales, parameter mismatches, zero/one/multiple/Russian plural cases, and live locale switching are covered; the selector uses descriptive language names and accessible selected-state labels.
- [x] I18N-VALIDATION (Phase 1; after I18N-CONTRACT, using I18N-CORE): preserve field paths, stable rule identifiers, safe bounds/parameters and custom domain-rule reasons instead of only Zod message strings. Present client-side and server-side issues through the same mapping, with linked field errors and a localized summary. Cover required/type/length/range/date/cross-field/duplicate/root/nested issues and unknown-rule fallback without including raw input. Do not rely solely on bundled Zod locales: current schema messages override locale maps, and the installed locale exports do not include Estonian. Do not mutate process-wide Zod locale per server request. Acceptance: equivalent local/API validation produces equivalent ET/EN/RU feedback and existing errors retranslate when language changes, including custom refinements.
- [ ] I18N-UI (initial auth/navigation in Phase 2; extend with Phases 4–7; after I18N-CORE/CONTRACT/VALIDATION): replace user-visible hardcoded text in login/register/verify/profile, AuthNav/layouts, guards, home and visible placeholder dashboards. Include titles, buttons, placeholders, password controls, confirmations, loading/empty/error/success/disabled states and accessibility text. Translate known role/status display labels by stable keys rather than database English names; keep unknown dynamic-role fallback explicit and do not change authorization behavior. Acceptance: each delivered workflow in ET/RU has no unintended English application text, and language switching preserves entered values, pending work, focus and accessible error/status presentation. Future screens must meet the same gate when delivered.
- [ ] I18N-FORMATTING (Phase 2 and each feature UI; after I18N-CORE): synchronize document.documentElement.lang and page titles with locale, translate spinner/selector/control accessible names, and centralize Intl-based dates, numbers, durations and future currency formatting. Replace ProfilePage's unlocalized date-fns formatting. Keep locale separate from event timezone, UTC API instants and calendar birth dates under P3-CALENDAR-DATES; use full message interpolation/plurals for joined dates, limits and counts. Acceptance: ET/EN/RU language metadata, date/number/count boundaries, language switching and long mobile text pass; changing language never shifts a birth date or silently changes event timezone.
- [ ] I18N-PREFERENCES (Phase 2A design/persistence before P2-EMAIL and Phase 2B behavior; after I18N-CORE): define precedence for explicit choice, account preference, browser storage, supported browser languages and default; reconcile preferences safely on login/logout. Add validated shared account preference and migration only if required by the chosen cross-device/email policy. Define recipient/invitation locale for users without accounts, safe link locale handling, and backend-rendered email locale propagation. Do not infer recipient language from the administrator's current UI or change global server locale between requests. Acceptance: tabs/verification/invitations/session recovery preserve or explicitly fall back on language; background email uses a deterministic recipient locale; unsupported values and concurrent recipients cannot leak language between requests. Stable error identifiers remain locale-independent even if diagnostic/fallback prose is localized.
- [ ] I18N-CONTENT (Phase 3 policy before Phase 4 organizer content, extend to Phases 6–7): distinguish interface strings from organizer-authored event descriptions, category/age/format labels, rubric criteria and announcements. Decide which need authored translations, required languages, editing/preview and missing-content fallback. Record broad model decisions before migrations and preserve existing content. Do not automatically translate names/titles or treat display text as identity. Acceptance: configured content renders under its declared policy without blank/raw enum labels, unavailable translations have an understandable fallback, and publication/export preserves rule identity and privacy. Only milestone-relevant content implementation is a release prerequisite.
- [ ] I18N-QA (Phase 1 foundation implemented; remains open for workflow/browser/human release evidence; expands with P9-BROWSER at each milestone): automate catalogue completeness/key/parameter/plural checks and a reviewed detector for hardcoded JSX/attributes, excluding internal diagnostics and intentional user content. Add component/API/browser coverage for all three locales: language switching while errors are visible, client/server validation, login/verification, pending approvals, upload/network/session failures, unknown errors, emails and later exports/results. Include screen-reader language/announcements, keyboard/mobile layouts and long translations; arrange fluent ET/EN/RU review of terminology and grammar. Acceptance: CI fails for missing/invalid translations, relevant workflow/browser/email fixtures pass in each locale, and human review evidence exists for the released scope. Static scans alone do not prove complete translation coverage.

Implementation order: define I18N-CONTRACT and I18N-CORE first, then
I18N-VALIDATION; start I18N-QA checks with those changes. Complete preference design
before P2-EMAIL templates/provider integration. Migrate existing UI and formatting
against the shared presenter; add later domain-content support with its owning
feature. No new architecture or database preference field is considered implemented
by adding these tasks, and completed Phase 1 transport slices remain completed.

### Phase 0 — Preserve and restore the development baseline (complete)

Goal: obtain a reproducible, buildable checkout without losing current work.

- [x] Review the current Git diff and split it into logical changes: migrations, controller refactor, route changes, shared schemas, and event UI. See [baseline change review](docs/BASELINE_CHANGE_REVIEW.md) for file groups, dependencies, and blockers; existing edits are preserved in logical commits.
- [x] Confirm the three untracked migrations are valid and ordered correctly. Repaired the unpublished status-resetting migration, added the missing `Event.maxPerformances` migration, and verified fresh SQL application, existing-data preservation, partial uniqueness, and schema parity. See [migration validation](docs/MIGRATION_VALIDATION.md).
- [x] Run `pnpm install --frozen-lockfile`; repair lockfile/workspace dependency consistency deliberately. Explicit build approvals and Turbo 2.11.10 restore compatibility with the preserved pnpm 12 lockfile.
- [x] Generate the Prisma client from the configured schema (`pnpm.cmd db:generate` passed). Standard `@prisma/client` imports and compiled API runtime are verified.
- [x] Add missing workspace scripts for `build`, `typecheck`, `lint`, and `test` where applicable. All workspaces have build/typecheck coverage; web lint and the initial Node API baseline ran at this checkpoint. Seed has its own strict typecheck; no placeholder scripts were added. Current recorded coverage is summarized above.
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

### Phase 1 — API contracts and automated baseline (complete: technical scope)

Entry: Phase 0 baseline preserved. Resource tasks must validate external input,
use explicit shared DTOs, canonical paths/client helpers, centralized errors, and
HTTP authorization/relationship tests. Keep non-trivial behavior in controllers;
record an explicit exception for any simple inline handler retained. Run the
relevant isolated database checks when changing transactional/data behavior.

- [x] P1-BASELINE: dependency refresh, shared-package runtime/build repair, Prisma generation, and baseline checks. See [dependency refresh](docs/DEPENDENCY_UPDATES.md).
- [x] P1-ADRS: accepted ADR-001/002/005 and recorded ADR-006 direction; implementation remains separately tracked.
- [x] P1-COMPOSITION: versioned app factory/router composition, explicit auth boundaries, and mount tests; previously active resource routers are mounted once.
- [x] P1-REGISTRATION: canonical atomic studio/pending-registration/membership creation, approval/roles, pending cancellation, shared contracts, and workflow/rollback checks. Duplicate-name response mapping is complete under P1-CONFLICT.
- [x] P1-DANCERS: canonical studio nesting, calendar-date DTOs, ownership/approval/stage validation, transactional writes, and audited archive checks.
- [x] P1-PERFORMANCES: canonical event paths, complete controller, removal of duplicate/GET-body handlers, same-studio participants/configuration validation, transactional replacement, DTOs, and audited archive checks.
- [x] P1-STUDIOS: canonical profile/member/approval operations, strict nullable inputs/DTOs, member reads, scoped writes, global active-name conflicts, and archive checks.
- [x] P1-JUDGES: consolidated judge controller, strict shared DTOs and canonical frontend helpers; covered event existence/scope, parent substitution, active user relation, nullable profile updates, conflict/error responses, and CRUD. Event/user links are immutable; scored judges cannot be deleted. No schema migration or role/record acceptance implementation. See the judge checkpoint in development history.
- [x] P1-CONFLICT: studio-registration creation maps database duplicate active-name failures to global 409 responses under the existing SQL-only index. HTTP regression and PostgreSQL checks cover applicant/admin conflicts across events/locations, unchanged records/roles, competing creates with one complete winner, case sensitivity, and archived-name reuse/preservation. No migration. See the registration-conflict checkpoint in development history.
- [x] P1-CI: added independent GitHub Actions workspace and PostgreSQL jobs for frozen install, build, typecheck, current lint/tests, Prisma validation/formatting, and isolated migration/workflow suites. Read-only permissions, health readiness, bounded jobs, run-specific Compose scope and always cleanup; unavailable Docker fails visibly. Migration runner selects the platform pnpm executable. Local actionlint/Compose checks and command suites pass; first hosted run and required-check settings await publication. See docs/TESTING.md and the CI checkpoint in development history.
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

### Phase 2A — Onboarding decisions, audit/privacy, and email foundations

Entry: Phase 1 contracts/localization foundations are stabilized. These are prerequisites for Phase 2B,
not later Phase 3 work. Each model change needs reviewed migrations, preservation
checks, and shared contracts before dependent runtime work.

- [ ] P2-SCOPE-INTEGRITY: high priority before M1 or any event-deletion operation. Replace/restrict event foreign-key behavior that can turn UserRole/Invitation event scope null/global; choose archive/restrict or explicit history-preserving removal semantics. Audit existing null scopes/duplicates without guessing lost ownership. Enforce null-safe global/event uniqueness with suitable constraints/indexes and Prisma query handling; invitation resend/history must remain valid. PostgreSQL tests must prove no scope broadening, concurrent duplicate rejection, and preservation of legitimate assignments. New migration only.
- [ ] P2-IDENTITY-TOKENS: before P2-AUTH/INVITE/SIGNUP, define one email canonicalization/collision policy across accounts and invitations; audit before migration, never auto-merge users or change ownership. Add purpose-bound verification/recovery/invitation token digests, expiry, consumed/revoked state and atomic rotation/resend semantics. Define transition of existing links; keep raw secrets out of normal DTOs, logs and audits. Test case variants, collision handling, expiry, wrong-purpose/replay/concurrent consumption, and safe account recovery.
- [ ] P2-ONBOARDING-MODEL: specify studio-focused account/onboarding context, verification/draft persistence, required details, intended-event return handling, pending-user read/edit/cancel scope, retry/idempotency, and retention. Preserve existing roleless accounts; reject an intent flag as proof of privilege. Implement the minimal required storage/contracts before P2-SIGNUP; apply P2-IDENTITY-TOKENS account/token contracts.
- [ ] P2-AUDIT: define safe audit metadata and implement minimal durable AuditLog/actor support for account, invitation, access, and approval changes. Preserve domain data and exclude tokens, passwords, private contact/billing payloads. Include transaction/rollback tests; later audit coverage grows with each feature.
- [ ] P2-PRIVACY: document data minimization, authorized viewers, birth-date/photo/contact handling, retention/deletion/export responsibilities, and existing-account transition policy before new dancer/media workflows. Do not automatically delete/deactivate roleless users. No cleanup until its policy is reviewed.
- [ ] P2-STAFF-MODEL: after P2-SCOPE-INTEGRITY and P2-IDENTITY-TOKENS, define invitation/assignment states, mandatory judge/moderator event scope, atomic acceptance, revocation versus accepted-access removal, and history preservation. Add explicit studio-bound invitation scope before P5-MEMBERS; define assignable role references/validation rather than trusting arbitrary role-key text. Define moderator stage permissions separately from score submission; organizer-level management needs an explicit least-privilege decision. Implement required fields/constraints before dependent invitation handlers; use the verified null-safe uniqueness policy without unsafe casts.
- [ ] P2-EMAIL: introduce an email provider/fake interface, select and integrate a real provider through validated configuration, and add ET/EN/RU verification/resend, invitation, recovery, and application-decision templates. Define delivery failure/retry semantics, token safety, and no false “sent” confirmation. Fake delivery tests run in CI; verify real delivery in staging before M2/M4 release. Broader media/provider hardening remains Phase 8.

P2-EMAIL depends on I18N-PREFERENCES recipient/invitation locale policy and
persistence decisions before integration; I18N-UI/FORMATTING complete the delivered
onboarding surfaces in Phase 2B without waiting for future entry/judging screens.

Exit: scope removal cannot broaden permissions; null-safe uniqueness and token
lifecycle/identity transition tests pass. Onboarding/invitation persistence and permission decisions are explicit;
minimal audit/model migrations preserve data; privacy requirements are recorded;
the email integration is tested and staging delivery evidence is recorded before
an external milestone. No dependency on future scoring or multi-event migration.

### Phase 2B — Authentication, authorization, and onboarding behavior

Entry: relevant Phase 2A foundations pass. Apply each task's narrower prerequisites
before its implementation; M1 uses only the security foundation tasks listed above.

- [ ] P2-AUTH: after P2-IDENTITY-TOKENS, verify active/existing/email-verified users at appropriate login/request boundaries; handle verification/resend, mistyped-email correction, password reset, safe recovery responses, expiry/used tokens, and seeded development identity. Never silently reactivate inactive invitees.
- [ ] P2-ROLES: unify frontend guards and gates on stable role keys, permission/event scopes, and explicit global/admin semantics. Add profile permission data if required; test bypass and parent/ownership invariants.
- [ ] P2-BOUNDARIES: secure each image upload by resource ownership/permissions; use configured CORS, security headers, validated production configuration, login throttling, and rate limits for auth/invite/upload routes. Use audit hooks from P2-AUDIT.
- [ ] P2-SESSION: decide JWT cookie versus localStorage threat model and implement the chosen session handling; validate internal return destinations through email tabs/devices and session expiry, preserving recoverable work without credentials in URLs.
- [ ] P2-SIGNUP: after P2-ONBOARDING-MODEL, P2-AUTH, P2-SESSION, and P2-PRIVACY, implement backend-enforced studio-focused signup with recoverable pending-user progress and translated UI. Test direct generic-signup bypass, duplicate email/retries, interrupted verification, and prohibition of public role self-selection. Approved representative privileges still require approval.
- [ ] P2-INVITE: after P2-STAFF-MODEL, P2-AUTH, and P2-AUDIT, validate allowed roles/event scope, remove production token exposure, implement resend/revoke/expiry/status, and authenticate existing-account acceptance without resetting credentials. New invited accounts use verified setup; wrong-account sessions can switch. Add acceptance page/recovery states, safe errors, and repeated/concurrent acceptance tests.
- [ ] P2-JUDGE-ACCEPT: after P2-INVITE and P2-STAFF-MODEL, atomically reconcile Judge/UserRole/invitation consumption for the same event, including existing assignments and rollback. A role alone or Judge CRUD alone is not staff readiness.
- [ ] P2-OFFBOARD: after P2-STAFF-MODEL and P2-AUDIT, remove accepted event access separately from pending-invite revocation; preserve Judge/Score history and test unauthorized/cross-event/concurrent removal.

Exit: role/event/ownership matrix and sensitive-route rate limits pass; signup
cannot grant unapproved privileges; pending applicants can recover their work;
staff scope, wrong/inactive accounts, expiry, concurrency, rollback, and removal
are tested. Audit events are durable. Email must pass P2-EMAIL before external use.

### Phase 3 — Registration and entry data foundations

Entry: M1 and applicable Phase 2 model decisions. This phase does not require
scoring/live-operation schema. P3-ENTRIES is an M3 prerequisite, not an M2 gate.

- [ ] P3-REGISTRATION: record the application/review portion of ADR-003 before dependent behavior. Define permitted transitions, event timezone and registration deadline, cancellation/rejection/resubmission, pending correction scope, and separate organization/event approval. Add only required fields, constraints, and transition tests for registration opening/review/closure. Full live transitions are P6-LIVE-MODEL.
- [ ] P3-STUDIO-IDENTITY: implement ADR-001 with data audit/backfill/preservation tests and a new migration; define shared studio/roster edit rules across event locks and historical entries before removing Studio.eventId. Never infer approval or auto-merge by name; flag contradictory participant/registration relationships. Multi-event reuse must not ship before this gate.
- [ ] P3-STUDIO-NAMES: decide/document display-name identity and duplicate-review policy before altering the global active-name index. Recommended target permits unrelated studios to share display names and uses stable IDs for identity; never auto-merge or add unique dancer name/birth-date identity keys. Audit existing records, search/disambiguation, rename/restore conflicts, canonical contracts, and index preservation/removal tests. Current case-sensitive global uniqueness remains until an explicit new migration; do not weaken it opportunistically in P1.
- [ ] P3-PERFORMANCE-OWNER: before draft/entry UI and M3, record explicit studio/event-registration ownership design, including event-consistent keys and active ownership validation. Audit/backfill existing performances only when ownership is unambiguous; preserve IDs, participants and scores. Resolve empty/mixed legacy participant sets through reviewed repair, not first-participant inference. Migrate controllers/DTOs atomically with canonical contracts and negative ownership tests; single-studio entries remain the current target.
- [ ] P3-CONSTRAINTS: before M3 entry enforcement, audit existing ranges and cross-event contradictions; add agreed row CHECK constraints for date ordering, positive limits/durations/counts and min/max bounds, and compound unique/FK protection for event-owned category/age-group/format relations where practical. Define remaining participant membership/active checks transactionally; ordinary row CHECKs must not query other tables. Cover direct SQL/API violations, rollback, concurrency, and preservation; score/judge event constraints extend in P6-SCORING-MODEL.
- [ ] P3-HISTORY: before P5-ENTRIES/SUBMISSION, specify submitted participant/studio/configuration snapshots or versioned records, audit provenance, and optimistic revision/conflict semantics. Later profile/dancer/configuration edits must not silently rewrite submitted/historical entries; define correction versioning and privacy-minimal retention. Test stale writes/concurrent submits, unchanged historical display, and explicit correction/audit outcomes with preservation migrations.
- [ ] P3-CALENDAR-DATES: audit legacy timestamp interpretation before conversion; choose native PostgreSQL date for dancer birth dates with documented mapping/backfill and leap-day/timezone tests. Define event/deadline instant storage, IANA event timezone, DST behavior and age-calculation date policy with P3-REGISTRATION/ENTRIES. Never blindly truncate or reinterpret existing timestamps. Complete before M3 eligibility; M2 event time/deadline semantics must already be explicit in P3-REGISTRATION.
- [ ] P3-INDEXES: review actual event registration/approval queues, studio rosters, memberships by user, judges by event, participants by dancer and active-record queries using representative EXPLAIN plans. Add only useful missing FK/filter/order indexes, respecting existing composite-index prefixes and SQL-only objects. Verify migration parity and performance; FK declarations do not index their referencing columns automatically.
- [ ] P3-DATA-HYGIENE: add needed mutable-entity timestamps, intentional referential actions/indexes, consistent active filters and deletedBy/deactivatedBy actor fields. Define restore policy. Audit legacy birth-date timezone interpretation before converting values; current UTC calendar serialization does not rewrite stored dates. Retain historical data under P2-PRIVACY.
- [ ] P3-ENTRIES: after P3-PERFORMANCE-OWNER and the P3-HISTORY/CONSTRAINTS/CALENDAR-DATES designs, implement durable incomplete drafts without stage order, explicit submission/receipt state, idempotent retries, revision conflicts, correction scope/deadline, locks and withdrawal/resubmission. Record nullable transitional fields versus dedicated draft representation before code; validation becomes strict at submit, not every draft save. Keep submission separate from approval. Define age policy, format count/duration, entry/music deadlines and required music rules with backend tests; do not require Phase 6 schedule generation to save/submit an unscheduled entry.
- [ ] P3-MUSIC-MODEL: before P5-MUSIC, define file metadata, upload ownership, replacement lifecycle, and private access; store media outside PostgreSQL. Apply P2-PRIVACY and P8-MEDIA requirements.

Exit for M2 subset: P3-REGISTRATION and relevant migration invariants pass on empty
and representative databases. P3-STUDIO-IDENTITY must pass before multi-event reuse;
a single-event application does not require reuse. Exit for the full phase/M3:
entry/roster/music invariants and preservation tests pass. Scoring/scheduling remain
separate Phase 6 dependencies and cannot block registration-only delivery.

### Phase 4 — Organizer setup and review

Core entry: M1, application-specific Phase 2 behavior, and P3-REGISTRATION.
Entry/staff extensions use their own gates and do not block M2.

- [ ] P4-CORE: implement event details (venue/location/description/image/limits/timezone/registration deadline), organizer contact, registration lifecycle prerequisites, and actionable setup checklist. Create/approve an event without direct database access. Scoring configuration is not required just to accept studio applications.
- [ ] P4-REVIEW: separate organization verification/event acceptance queues, show who acts next, and provide safe reasons/contact and decision notifications using P2-EMAIL/AUDIT. Pending corrections follow P3-REGISTRATION. Test approval isolation, event ownership, denied decisions, and transitions.
- [ ] P4-ENTRY-CONFIG: after P3-ENTRIES, build category/age-group/format configuration and entry/music deadlines, validate overlap/count/duration policies, and show incomplete entries/missing music. Scoring templates and schedule generation move to Phase 6.
- [ ] P4-STAFF: after P2-INVITE/JUDGE-ACCEPT/OFFBOARD, build scoped invitation/assignment admin screens with invited/accepted/expired/revoked status, resend/revoke and distinct remove-access controls. Test missing assignment and history preservation. This is the M4 UI gate, not a prerequisite for M2.

M2 core exit: organizer can open registration and approve/reject the correct
studio/event through UI; invalid transitions/configuration are actionable and
blocked on the backend. Extensions close only when their respective tests pass.

### Phase 5 — Studio application and competition entries

- [ ] P5-APPLICATION: after P2-SIGNUP, P3-REGISTRATION, P4-CORE/REVIEW, build canonical event application/studio pages, studio profile onboarding, and “My applications” accessible without a representative role. Preserve selected event/studio/language, prefill contact data, postpone optional fields, show both approvals and next action/contact, and support pending cancellation/corrections under explicit policy. Align stage availability and reconcile uncertain creation before retry. M2 is complete only after end-to-end account verification, application, admin decision, and returning-applicant recovery pass with real email, ET/EN/RU, keyboard, and mobile use.
- [ ] P5-ENTRIES: after M2, P3-ENTRIES, and P4-ENTRY-CONFIG, build dancer list/create/edit/archive and performance create/edit/archive with participants/title/category/age/format/duration. Validate age date, participant count/duration, active ownership, and event configuration again on backend. Include resumable drafts, actual save/error states, network/session/stage-change recovery, and concurrent-edit conflict handling.
- [ ] P5-REUSE: after P3-STUDIO-IDENTITY, allow selecting an existing owned studio/roster for another event, preserving locks and history. No name-based auto-merge. This is not an M2 prerequisite.
- [ ] P5-MUSIC: after P3-MUSIC-MODEL and P8-MEDIA, implement upload/replacement/progress/retry/preview with upfront limits and preservation of the old file after failed replacement.
- [ ] P5-SUBMISSION: after P5-ENTRIES/MUSIC, implement field-linked validation summary, warnings versus blockers, explicit lock confirmation, server receipt, retry-safe submission, and scoped corrections/resubmission with audit and deadline/lock explanations.
- [ ] P5-MEMBERS: after explicit inviter/membership/event-role policy and required schema, add authorized studio-bound additional-representative invitations; test exact-studio authority, acceptance and removal. Contact email/role alone cannot grant ownership. Not an M2 prerequisite.

M3 exit: approved representatives complete roster, performances, required music,
submission and corrections end-to-end; invalid/cross-studio participants cannot
submit; saved progress, repeated actions, locks, and concurrency are tested.
P5-REUSE/MEMBERS are separately gated extensions, not hidden M2 requirements.

### Phase 6 — Scheduling, live operations, and judging

Entry: M3/M4 for the user workflow; complete model/specification tasks before
their own dependent screens. Do not require these models for M2 registration.

- [ ] P6-LIVE-MODEL: extend ADR-003 with SCHEDULED/LIVE/FINALIZED/ENDED/CANCELLED transitions, stage/session/queue states, authorized advance/pause/skip/withdraw/reopen actions, and safe lifecycle migration. Separate schedule-entry/stage/session ordering from performance identity/draft submission; define moving/swapping/withdrawing and archived-slot reuse with transactional uniqueness/concurrency checks. Preserve existing orders/history, allow unscheduled entries from P3-ENTRIES, and add schedule indexes/conflict/transition tests.
- [ ] P6-SCORING-MODEL: accept ADR-004 and implement rubric/templates/criteria, ranges/steps/weights, judge assignments, draft/submitted/locked score sheets, penalties/disqualification, rounding/dropped scores/ties, versioned calculation and publication/correction semantics. Choose scaled integers or explicit Decimal precision instead of unspecified Float semantics; define finite/range/step checks, exact tie/rounding rules and preservation/conversion of existing scores. Enforce same-event judge/performance and criterion-template consistency where practical via database keys plus backend validation. Extend P3-CONSTRAINTS/HISTORY without rewriting historical scores silently. This precedes scoring-template UI.
- [ ] P6-SCHEDULE: after P6-LIVE-MODEL, build generation/editing with stage/session filters and dancer conflict reporting; validate manual adjustments. Scheduling is no longer part of core Phase 4 registration setup.
- [ ] P6-TEMPLATES: after P6-SCORING-MODEL, build scoring-template/criterion configuration and prerequisite checks before opening live judging, not before accepting studio applications.
- [ ] P6-JUDGE: after P6-SCORING-MODEL/TEMPLATES and P4-STAFF, build touch-friendly assigned-current-performance rubric, explicit ranges, draft autosave and server-confirmed final lock; block unassigned scoring and prohibited peer-score visibility.
- [ ] P6-MODERATOR: after P6-LIVE-MODEL, P6-SCORING-MODEL, and P4-STAFF, build current/next queue and judge completion without premature scores; permission-checked state transitions, controlled reopen/corrections, and audited action confirmation.
- [ ] P6-RECOVERY: define reconnect/offline policy with P6-LIVE-MODEL/SCORING-MODEL before dependent UI promises, then verify it against P6-JUDGE/MODERATOR. Distinguish local drafts from acknowledged server state, reconcile idempotently, and provide operational health/manual fallback/export. Add real-time delivery only after reliable transactional HTTP workflows; test concurrent/repeated score and stage actions.

Exit: a moderator advances the correct queue, assigned judges receive the correct
performance, acknowledged scores survive reconnect, submissions/actions cannot
duplicate, and a rehearsal proves recovery/manual fallback. Admin view previews
remain optional deferred scope, not a live-operation release gate.

### Phase 7 — Results and publication

Entry: P6-SCORING-MODEL and validated submitted score sheets. Public release needs
an explicit ADR-002 public DTO/publication decision; spectators need no account.

- [ ] P7-CALCULATE: implement versioned totals, weights, penalties, dropped scores, rounding, rankings by category/age/format, withdrawal/disqualification, and tie rules. Golden fixtures reproduce historical and edge cases.
- [ ] P7-PUBLISH: separate admin provisional/finalized/public states; public result pages expose only approved DTOs. Audit corrections with reasons/version/time; block unpublished results for unauthorized users.
- [ ] P7-EXPORT: CSV/PDF result/protocol exports and reproducibility checks, applying privacy rules and correct ET/EN/RU labels.

Exit: calculations match golden fixtures and published results can be reproduced;
publication/access/correction tests pass. Complete M5 only with the Phase 6 rehearsal
and applicable Phase 9 deployment/backup/operational gates.

### Phase 8 — Media and provider hardening (before dependent milestones)

Core email provider/delivery is P2-EMAIL, not deferred here. Media must be ready
before M3 music upload, independently of Phase 6–7 progress.

- [ ] P8-MEDIA: after P2-PRIVACY and P3-MUSIC-MODEL, choose configured local/object storage with appropriate production/private access and signed URLs; verify MIME from content, limits/safe filenames, permissions, compensating replacement, and orphan cleanup using fakes/integration tests. Failure must retain the previous file and not leak private media. Validate provider-specific configuration at startup.
- [ ] P8-DELIVERY-HARDENING: expand email scheduling/retries/monitoring and schedule/correction templates as those features arrive; clean up expired tokens/files under retention policy. Existing P2-EMAIL behavior must remain functional throughout.

Exit: media replacement/private access and cleanup tests pass before P5-MUSIC;
production provider configuration fails safely. Delivery enhancements never defer
the basic verification/invitation/recovery email required by M2/M4.

### Phase 9 — Expanded quality and production operations

Baseline CI is P1-CI. Tests, localization/accessibility and privacy apply when each
feature is built, not first in Phase 9. Existing Node/API/PostgreSQL tests remain;
introduce new test libraries only for a concrete need.

- [ ] P9-BROWSER: add frontend form/guard and browser end-to-end infrastructure with the first delivered UI; gate M2 on signup/verify/apply/approve/status, M3 on entries/corrections, M4 on staff acceptance/removal, and M5 on judging/results. Expand CI alongside each journey.
- [ ] P9-OBSERVABILITY: structured safe logging/correlation IDs, error monitoring, metrics, and health/readiness for database/storage/email as applicable. Redact tokens/contact/birth/billing data under P2-PRIVACY before external operation.
- [ ] P9-DEPLOY: production configuration, containers/deployment architecture, staging release/migration checklist, and rollback rehearsal before the first external deployment; do not wait for scoring/results.
- [ ] P9-RECOVERY: backups, restore rehearsal, retention and incident/runbook procedures before production data use; expand manual competition fallback before M5. Review privacy/accessibility/localization against actual implemented journeys at each release.

Exit: automated checks gate the released scope, staging deployment/rollback and
restore are rehearsed, observability/runbooks cover external operations, and
keyboard/mobile/ET/EN/RU/privacy requirements pass for each released milestone.

### Deferred optional scope

CSV dancer import, copying previous performances, admin view previews, and broad
dynamic user/role administration are outside M2/M3 core delivery. Restore UI is
separately gated by P3-DATA-HYGIENE restore policy and authorization tests. Keep
these visible as backlog; do not implement them opportunistically or use them to
hold the first usable registration journey open.

## 7. Recommended Test Strategy

### Unit tests

- Event lifecycle transitions.
- Stage-based editing permissions.
- Age calculation and age-group eligibility.
- Format participant and duration validation.
- Score range, weighting, rounding, dropped-score, and tie-break rules.
- Permission aggregation across global and event-scoped roles.
- I18N-CORE catalogue keys/completeness/fallbacks, typed parameters/plural categories, supported-locale persistence, locale-aware formatting and render-time error switching.

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
- I18N-CONTRACT/VALIDATION parity for domain/network/upload errors and structured field issues; deterministic recipient email locale and concurrent-request isolation. Do not snapshot English prose as the only API behavior assertion.

### End-to-end tests

1. Admin creates and configures an event.
2. Representative registers a studio and is approved.
3. Representative adds dancers, performances, and music, then submits registration.
4. Admin reviews data, schedules performances, and opens the live stage.
5. Moderator advances the queue.
6. Judges submit complete score sheets.
7. Admin reviews, finalizes, and publishes rankings.

Journey regression scenarios: roleless application tracking; safe return after email verification; expired/used invitation and wrong-account acceptance; uncertain create/submit responses; saved progress after session expiry; stage/deadline changes during editing; concurrent changes; correction scope/expiry; keyboard-only and ET/EN/RU completion. Add checks with the owning feature phases rather than postponing all verification to Phase 9.

Run the delivered journey matrix in ET/EN/RU with invalid data, unknown errors,
already-visible errors during language switching, locale persistence, email link
return, document language, plural counts and long responsive text. I18N-QA records
static-scan exclusions and fluent-language review; developer logs may remain English.

## 8. Documentation Plan

- [x] Rewrite the root README as the short entry point: product, prerequisites, startup, scripts, architecture links, and current maturity.
- [x] Add [user journeys and UX requirements](docs/USER_JOURNEYS.md) with implementation gaps, target steps, approval explanations, recovery/notification behavior, acceptance criteria, and decision/dependency gates. Rewrite the registration guide around current contracts and link maintained guides from README/API.
- [ ] Replace the default web README with frontend-specific setup and conventions.
- [ ] Add `docs/ARCHITECTURE.md` with application boundaries and request/data flow.
- [ ] Add `docs/DOMAIN.md` with lifecycle, roles, registration, scoring, and ranking rules.
- [x] Add `docs/API.md` with current versioned integration status, authentication boundaries, remaining path repairs, and validation scope.
- [ ] Expand the maintained API reference as resources migrate; add generated OpenAPI instructions later.
- [ ] Add `docs/SECURITY.md` with authorization model and data-handling rules.
- [x] Add `docs/TESTING.md` for existing checks, CI, isolated fixtures, cleanup and validation limits.
- [ ] Add `docs/DEPLOYMENT.md`.
- [x] Add ADR-001, ADR-002, and ADR-005 for studio identity, canonical paths, and shared contracts.
- [x] Add ADR-006 for studio-focused signup and invitation-only staff onboarding; align journey, registration, API, root, and role guides. Runtime signup restrictions, atomic judge assignment, and invitation UI/security remain unchecked in their owning phases.
- [x] DB-REVIEW: record [database integrity and UX findings](docs/DATABASE_REVIEW.md), map them to prioritized tasks, and align identity/onboarding/journey guidance. Documentation only; no schema migration, deployed-data audit, index change, token conversion, or constraint fix is claimed.
- [ ] Add ADR-003 and ADR-004 for lifecycle and scoring before their dependent implementation.
- [ ] Mark implementation summaries as historical or delete them after their useful content is merged into maintained guides.
- [ ] Correct endpoint examples, ports, framework versions, file trees, and build/test claims.
- [ ] Normalize all markdown to UTF-8.
- [x] Document Phase 1 I18N-CONTRACT/VALIDATION, locale fallback and dictionary conventions in docs/LOCALIZATION.md and ADR-007. Account/email preferences, organizer-content policy and workflow/browser/fluent-language evidence remain their explicitly unchecked cross-phase tasks.

## 9. Dependency and issue tracking

Use stable task IDs in issues/PRs. The milestone table in section 6 is the single
delivery dependency map; do not maintain a second conflicting epic graph here.
Task-specific dependencies refine that map. For any new dependency, check for a
cycle and move the prerequisite into the same foundation stage or earlier.

Each issue must state: task ID, outcome, concrete prerequisites, in/out of scope,
acceptance checks, migration/data-preservation impact, and validation evidence.
Resource contract tasks use the Phase 1 contract/test matrix; user workflow tasks
use the journey criteria. No whole-app rewrite is implied by a controller task.

- [x] PLAN-REVIEW: reorganize milestones, assign task IDs, move audit/onboarding model and email prerequisites forward, move scoring/scheduling out of registration gates, add early CI/privacy/release gates, archive checkpoint narratives, and distinguish technical versus workflow completion. Documentation only; implementation statuses remain unchanged.

## 10. Completion criteria

### Technical slice complete

- Its task scope and authorization/domain behavior are explicit; checkbox refers only to that scope.
- Required schema/migration/rollback implications and data preservation are reviewed.
- Shared input/output contracts, serialized dates, canonical paths, backend validation, and standard error responses agree with clients.
- Relevant success, invalid input, permission, relationship, inactive-record, rollback, and conflict checks pass; exceptions are documented.
- Applicable build/typecheck/lint/tests/Prisma/migration checks actually completed; report exact blockers without claiming success.
- Documentation/current checkpoint are updated and the final diff/whitespace are reviewed. Record code tests separately from documentation checks.

A completed API slice can coexist with pending UI, provider, or durable audit
work when those were explicitly outside its scope. It does not authorize external
release or imply the full user journey is complete. Preserve existing checked
backend tasks; do not retroactively claim missing UI or AuditLog implementation.

### User workflow complete / releasable

- All technical slices and milestone prerequisites pass, including required security/audit/privacy and real email/media providers.
- Users complete the journey through UI with loading/empty/error/success/disabled states, safe retries, session/network recovery, and actionable next steps.
- ET/EN/RU, semantic forms, keyboard focus/navigation, accessible error/status announcements, and phone/tablet layouts pass for the delivered scope.
- Applicable I18N tasks pass for the released scope: translated API/local validation/success feedback, safe unknown-error fallback, live error retranslation, correct document language/formatting, deterministic email language and fluent-language review. No future UI/content coverage is implied by a technical contract checkbox.
- Sensitive changes emit durable audit records; backend authorization and cross-event/studio failures are tested.
- Browser end-to-end acceptance and applicable staging delivery/deploy/restore/recovery gates pass, with evidence tied to the validated revision.
- Optional/deferred features and known limitations are explicit. No phase or milestone is closed while its required outcome remains unfinished.

## 11. Resume checklist

1. Read the current checkpoint/next action and relevant ADRs; history is reference only.
2. Inspect git status/diff and preserve existing work. Do not pull, commit, push, or change branches without the required session authorization.
3. Identify the highest-priority actionable task in the active phase using the task ID and explicit prerequisites. Keep unrelated later work deferred; use the milestone dependency rule, not a blanket assumption that every phase must finish before any later prerequisite.
4. Start the repository PostgreSQL service only when needed; use isolated fixtures for database validation. Install frozen dependencies only when required; never overwrite existing environment files or expose their values.
5. Inspect implementation and run narrow relevant checks, then applicable broader validation after changes. Historical passing commands are not a fresh run.
6. Implement one scoped slice, update its evidence/contracts/docs, and review the final diff. Update the single checkpoint/next action and archive significant historical validation separately; do not repeat current priorities throughout the document.

## 12. Validation and history references

- [Current API contracts and coverage](docs/API.md).
- [Baseline validation](docs/BASELINE_VALIDATION.md) and [migration validation](docs/MIGRATION_VALIDATION.md).
- [Archived development checkpoints](docs/DEVELOPMENT_HISTORY.md); their old next-task/phase statements are historical.
- [User journey acceptance criteria](docs/USER_JOURNEYS.md).

Plan revision (2026-10-24): dependency/structure changes are documented under
PLAN-REVIEW. This revision changes no runtime code or schema and does not rerun
past application checks. Documentation validation covers links, task references,
UTF-8, whitespace, and the final diff; report results in the handoff.

Database review follow-up (2026-10-24), DB-REVIEW: new scope/identity prerequisites
and ownership/draft/history/date/constraint/index tasks are documented in the
owning phases. Scoring precision and schedule-slot policy remain later model
decisions. Current API/index/schema behavior and existing completed slices are
unchanged; no live-data audit or database validation was performed for this update.

Localization planning follow-up (2026-10-24): added eight unchecked I18N tasks,
Phase 1 foundation requirements, recipient-locale dependencies and per-milestone
acceptance/CI/human-review gates from the static localization audit. No application
strings, transport contracts, preference fields or runtime behavior were changed;
past application validation counts above are preserved rather than claimed rerun.
