# Development checkpoint

Updated: 2026-10-25. This file owns current status, priority and milestone gates.
Read the selected task's roadmap file next; use [docs/README](docs/README.md) to
find its contracts/specifications. Historical reports are reference only.

## Next action

**Active work: Phase 2B security slices; Phase 2A foundations remain open.
Next: P2-AUTH** in [foundation tasks](docs/roadmap/foundation.md): enforce
existing/active/verified account eligibility at login and protected requests,
then deliver safe verification/resend/recovery under the documented token policy.
Its identity-token prerequisite and P2-SCHEMA-AUDIT are technically complete locally;
deployment collision/scope review, other foundation and auth/email/session gates remain open.

Audit correction order and all 15 finding owners: [correction plan](docs/AUDIT_FOLLOWUP.md).
After the required foundations, prioritize P2-AUTH, P2-INVITE-IDENTITY,
P2-ROLES-ADMIN-SCOPE and P2-BOUNDARIES-UPLOADS. These close currently reachable
security defects before external API exposure; invitation identity must not wait
for M4 administration, and image content/ownership must not wait for music work.
Independent fixes may proceed when their own prerequisites pass.

UI track: **P2-UI-FOUNDATION**, then P2-UI-SHELL with P2-ROLES. Fixture work can
proceed while security foundations are built; gated management features cannot
ship early. See [design system](docs/DESIGN_SYSTEM.md).

P2-SCHEMA-AUDIT is complete: [findings and validation](docs/SCHEMA_SUITABILITY_AUDIT.md).
Broader model changes retain their owning tasks and ADR gates. Current test data
may be reset/reseeded under the disposable-data policy; no reset was needed here.

## Current state

- User-confirmed database baseline (2026-10-25): the current development database
  contains only disposable test data. Schema/model improvements may reset/reseed
  it and replace fixtures; do not add legacy compatibility solely to retain test
  rows. Follow the target-verification/migration rules in
  [AGENTS](AGENTS.md#development-database-policy) and
  [TESTING](docs/TESTING.md#development-database-and-disposable-data).
  Preservation requirements below concern domain behavior and retained/real data;
  they do not require keeping current fixtures. No database was reset by this
  policy update; active task priority and implementation status are unchanged.

- Phases 0 and 1 are complete for their technical scope. Mounted business
  resources have controllers, shared DTOs, canonical paths and validated clients.
- Schema review adds token digest/lifetime/state CHECKs and closes the
  active-studio-name-index parity exclusion. The migrated target has 19 business
  tables, 27 restrictive foreign keys and eight CHECKs. Synthetic plans support
  retaining foundation indexes; reverse-key candidates remain P3-INDEXES.
  Compose metadata still reflects older migrations; no application rows were
  migrated/reset. Verify the intended target and preflights before local rollout.
- Email identity now uses shared ASCII-space trimming/lowercasing for accounts
  and invitations, with collision-refusing migration and direct-write checks.
  IDs, ownership and all non-email fields are preserved; no identities are merged.
  Intended-deployment preflight remains open.
- Purpose-bound verification/recovery/invitation digests, expiry, atomic
  rotation/consumption and legacy-link invalidation are implemented. Verification
  and invitations reject inactive identities; recovery helpers do not mint sessions.
  Public recovery/resend and invitation management still need their owning tasks.
- ET/EN/RU semantic feedback, shared validation and dictionary foundations exist.
  UI migration, formatting, email preferences and human/browser review remain.
- P2-SCOPE-INTEGRITY is technically complete: restrictive event foreign keys,
  null-safe role/invitation uniqueness and history-preserving expired replacement.
  **P2-SCOPE-DEPLOY remains open** before deployment/M1: audit intended global
  scope and duplicates on the actual deployment; local fixtures are insufficient.
- Auth/event screens and backend studio/dancer/performance CRUD exist. Role
  dashboards are placeholders; application, staff acceptance, music, scoring,
  live operation and results journeys are unfinished. No external milestone is complete.
- Public signup remains unrestricted; login accepts unverified accounts. Upload
  ownership, active-user request checks, role guards and CORS/rate limits remain
  security work. The email fake is silent; production rejects unavailable delivery;
  storage is always local. Event reads require authentication.
- Baseline CI exists; first hosted-run evidence and required-check settings need
  operator follow-up. Technical completion does not imply workflow/release readiness.

Latest **recorded** runtime validation (2026-10-25): schema audit/foundation fixes passed
build/typecheck/web lint, 76 API + 8 frontend tests and localization guard,
Prisma checks, full SQL-only migration parity and isolated PostgreSQL workflows,
including six token CHECKs, invalid-data upgrade refusal and preservation.
Synthetic catalog/query plans were collected separately. See
[schema evidence](docs/SCHEMA_SUITABILITY_AUDIT.md),
[lifecycle evidence](docs/IDENTITY_TOKEN_VALIDATION.md) and earlier
[email evidence](docs/EMAIL_IDENTITY_VALIDATION.md). Earlier scope validation's
baseline readiness timeout did not recur here; [scope evidence](docs/SCOPE_INTEGRITY_VALIDATION.md)
retains that historical result.
The [implementation audit](docs/REPOSITORY_AUDIT.md) reran workspace/Prisma/database
checks and additional security probes; it records cache use and verification limits.
The subsequent correction-planning update changed documentation only and did not
rerun runtime checks or fix any finding.

## Task map

Checkboxes and detailed prerequisites live once, in the linked files. Stable task
IDs remain valid; phase numbers group topics rather than imposing an unrelated
all-phases-before-next-phase dependency.

| Scope | Task file |
| --- | --- |
| Phase 0–1 completed technical slices | [Completed](docs/roadmap/completed.md) |
| Phase 2A foundations / 2B auth and onboarding | [Foundation](docs/roadmap/foundation.md) |
| Phase 3 registration / entry data | [Registration](docs/roadmap/registration.md) |
| Phase 4 organizer setup / review | [Organizer](docs/roadmap/organizer.md) |
| Phase 5 applicant / representative UI | [Studio](docs/roadmap/studio.md) |
| Phase 6–7 scheduling / judging / results | [Competition](docs/roadmap/competition.md) |
| Phase 8–9 providers / quality / operations; optional backlog | [Operations](docs/roadmap/operations.md) |
| Cross-phase I18N tasks | [Localization](docs/roadmap/localization.md) |
| Documentation tasks | [Documentation](docs/roadmap/documentation.md) |

Choose the highest-priority actionable task in the active phase when no task was
requested. Respect its prerequisites. A milestone may proceed when its listed
gates pass without waiting for unrelated deferred work. Split broad tasks before
execution; preserve their parent IDs. Issues/PRs state outcome, prerequisites,
scope, acceptance checks, migration/preservation impact and evidence.

## Milestone gates

| Milestone | Outcome | Required work |
| --- | --- | --- |
| M1 | Stable technical/security foundation | Phase 1; P2-SCOPE-INTEGRITY, SCOPE-DEPLOY, IDENTITY-TOKENS, AUDIT, PRIVACY, AUTH, ROLES (including ROLES-ADMIN-SCOPE), BOUNDARIES (including BOUNDARIES-UPLOADS/ERRORS), SESSION and INVITE-IDENTITY (all P2). |
| M2 | Verified applicant applies to one event, tracks both approvals and resumes; organizer configures/reviews | M1; P2-ONBOARDING-MODEL/SIGNUP/EMAIL; P3-REGISTRATION (including REGISTRATION-REAPPLY); P4-CORE/REVIEW; P5-APPLICATION. No scoring/schedule/reuse prerequisite. |
| M3 | Approved representative saves entries/music, submits and handles corrections | M2; P3-PERFORMANCE-OWNER/CONSTRAINTS/HISTORY/CALENDAR-DATES/ENTRIES; P4-ENTRY-CONFIG; P5-ENTRIES/MUSIC/SUBMISSION; P8-MEDIA. |
| M4 | Intended staff accepts scoped invitation; assignment/removal preserves history | M1; P2-STAFF-MODEL/INVITE/JUDGE-ACCEPT/OFFBOARD/EMAIL; P4-STAFF. Independent of M3 after its own gates. |
| M5 | Rehearsed competition operation, recovery and reproducible published results | M3 + M4; Phases 6–7; applicable Phase 9 operations. |

Every external milestone also needs its delivered P9-BROWSER/OBSERVABILITY/DEPLOY/
RECOVERY scope. Begin these with the first release, not after results development.
P8-MEDIA precedes M3 music; P2-EMAIL precedes external M2/M4.

M1 requires I18N-CONTRACT/CORE/VALIDATION. M2/M4 also require delivered-scope
I18N-UI/FORMATTING/PREFERENCES/QA. Decide I18N-CONTENT policy before relevant
organizer content. M3/M5 extend these gates to entries, scoring, exports and results.
Future screens do not hold an earlier milestone open.

## Completion rules

**Technical slice:** explicit scope; reviewed schema/migration/preservation and
rollback implications; aligned shared contracts/DTOs/client paths; backend
authorization, relationship, inactive-record, invalid-input and conflict checks;
applicable commands actually pass; docs/plan/evidence and final diff updated.
Exceptions must be explicit. Existing completed backend slices stay completed
when separately scoped UI/provider/audit work is pending.

**Releasable workflow:** all milestone prerequisites plus usable UI, truthful
server acknowledgement, safe retries and network/session/stage/conflict recovery;
ET/EN/RU including errors/emails, locale metadata/formatting and fluent review;
keyboard/focus/screen-reader and phone/tablet/desktop checks; durable sensitive
audit events and negative scope tests; browser and staging/deploy/restore evidence
tied to revision. No phase/milestone closes with required work unfinished.

For UI work, read only the relevant S01–S17 screen, F01–F10 flow and UX-D decision
in [UI_UX](docs/UI_UX.md), [USER_FLOWS](docs/USER_FLOWS.md) and
[DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md). They define target behavior, not delivered
features. [TESTING](docs/TESTING.md) owns commands and evidence requirements.

Documentation audit (DOCS-AUDIT): shortened entry points, split task/reference
files, reconciled stale guides and retained incoming scope/UI work. Findings,
preservation checks and reading-cost measurements: [audit](docs/DOCUMENTATION_AUDIT.md).
Runtime priorities and completion states are unchanged.

Repository implementation audit (2026-10-25): [findings and fresh validation](docs/REPOSITORY_AUDIT.md).
Workspace, Prisma and isolated PostgreSQL checks pass; reachable invitation,
inactive-account and upload security defects remain M1 blockers. No implementation
was changed by this audit. Subsequent identity/token work is recorded above;
critical request, intended-account and upload defects remain for
P2-AUTH/INVITE/BOUNDARIES before external exposure.
