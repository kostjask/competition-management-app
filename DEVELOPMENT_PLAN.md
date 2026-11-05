# Development checkpoint

Updated: 2026-11-05. This file owns current status, priority and milestone gates.
Read the selected task's roadmap file next; use [docs/README](docs/README.md) to
find its contracts/specifications. Historical reports are reference only.

## Next action

**Active work: Phase 2A local foundations and Phase 2B transport/role corrections implemented; external gates remain open.**
Next actionable development task: **P2-JUDGE-ACCEPT**, atomically reconciling
Judge/UserRole/invitation consumption for the same event, including rollback and
existing assignments. P2-SIGNUP, P2-INVITE and P2-UI-AUTH are implemented locally
under ADR-017; see [onboarding/invitation evidence](docs/ONBOARDING_INVITATIONS_VALIDATION.md).
P2-OFFBOARD follows separately for accepted access; neither an invitation nor a
UserRole alone establishes Judge readiness. Real mail, hosted deployment and
human language/assistive-technology release evidence remain open.
**P2-SESSION, Phase 2 I18N-FORMATTING and P2-UI-SHELL are technically complete
locally (2026-11-05)** under ADR-016; see [session/shell evidence](docs/SESSION_SHELL_VALIDATION.md).
P2-BOUNDARIES/ERRORS and P2-ROLES remain complete locally.
P2-BOUNDARIES-UPLOADS is technically complete locally under ADR-015.
P2-ROLES-ADMIN-SCOPE, P2-INVITE-IDENTITY and P2-AUTH are technically complete locally.
P2-SCOPE-DEPLOY and real staging mail remain open;
no hosting/domain/Resend account exists. The user requested staging preparation;
[STAGING](docs/STAGING.md) provides an isolated local rehearsal and hosted rollout
steps. Phase 2A and external milestones are not closed by local fixture results.

Audit correction order and all 15 finding owners: [correction plan](docs/AUDIT_FOLLOWUP.md).
With P2-AUTH, P2-INVITE-IDENTITY, P2-ROLES-ADMIN-SCOPE and the local foundations
complete, transport/abuse controls, parser errors and frontend role consistency
are also corrected locally. Upload ownership/content and private retrieval are implemented. Intended-deployment
assignment provenance remains P2-SCOPE-DEPLOY.
Independent fixes may proceed when their own prerequisites pass.

UI track: **P2-UI-FOUNDATION/SHELL and Phase 2 formatting are technically complete**.
Login, cookie recovery and explicit verification continuation are implemented;
signup/recovery/invitation journeys are implemented locally under ADR-017;
gated application/Judge/offboarding features cannot ship early. See [design system](docs/DESIGN_SYSTEM.md).

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
  active-studio-name-index parity exclusion. The current migrated fixture additionally includes durable audit, onboarding
  drafts, staff references/removal state, recipient locale and encrypted mail queue
  storage with SQL-only checks/triggers. Synthetic plans support
  retaining foundation indexes; reverse-key candidates remain P3-INDEXES.
  Development Compose metadata still reflects older migrations; local staging
  has the current 26-migration chain. No development application rows were
  migrated/reset. Verify the intended target and preflights before local rollout.
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
  UI migration, formatting, preference reconciliation and human/full-journey
  browser review remain.
- P2-SCOPE-INTEGRITY is technically complete: restrictive event foreign keys,
  null-safe role/invitation uniqueness and history-preserving expired replacement.
  **P2-SCOPE-DEPLOY remains open** before deployment/M1: audit intended global
  scope and duplicates on the actual deployment; local fixtures are insufficient.
- Auth/event screens and backend studio/dancer/performance CRUD exist. Role
  dashboards are placeholders; application, staff acceptance, music, scoring,
  live operation and results journeys are unfinished. No external milestone is complete.
- Public signup now requires studio intent and atomically retains an owner draft.
  Pending owners can recover/save/cancel using password proof without ordinary
  sessions or domain privileges; verified owners can use their session. Login requires active/verified accounts;
  protected requests reject missing/inactive/unverified subjects before roles,
  including existing admin JWTs. Verified roleless users retain permitted access.
  DEV_AUTH uses a real eligible development account and actual stored roles;
  startup refuses DEV_AUTH=true outside development. C2 is corrected locally.
  Global-admin bypass now requires null event scope and active assignment; removed
  assignments/global staff are ignored. All 20 admin-only operations have maintained
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
- Local staging rehearsal is running on 127.0.0.1:8080, with an independent empty
  database/upload volumes, 26 migrations and production fake mail. Container build,
  SPA/health and guest/mail-unavailable smoke checks pass. Generated staging secrets
  remain in ignored deploy/staging.env; development data was not migrated/reset.
  Hosted ingress, domain/provider setup, real mail and restore evidence remain open.

Latest **recorded** runtime validation (2026-11-05): P2-SIGNUP/INVITE/UI-AUTH
under ADR-017. Migration 29 expands only audit actions. Studio intent, owner-only
password/session proof, retained drafts/cancellation, invitation status/CAS
resend/revoke, acceptance/account switching and neutral recovery UI are aligned.
Workspace build/typecheck/lint, 110 API + 16 frontend tests, 67 Chromium cases,
localization guard, Prisma generate/validate/format, fresh/upgrade migration parity
and the complete isolated PostgreSQL baseline pass. The original generic-signup
regression fails before the fix; pending-save controls preserve newer work.
Documentation/UTF-8/local links and git diff whitespace checks pass. No application
data reset or deployed rollout occurred. Verification evidence and precise
remaining release gates are maintained in [the validation record](docs/ONBOARDING_INVITATIONS_VALIDATION.md).

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
real mail and full auth journeys remain open. See [evidence](docs/SESSION_SHELL_VALIDATION.md).

Previous boundary/role validation (2026-11-05): P2-BOUNDARIES,
P2-BOUNDARIES-ERRORS and P2-ROLES workspace build/typecheck/lint, localization
guard, 105 API + 13 frontend tests, Prisma generate/validate/format, migration
fresh/upgrade parity and complete isolated PostgreSQL baseline pass. Browser
coverage includes ET/EN/RU roles at 320/390/768/1440px, direct/wrong-event/scoped
admin/roleless/expired access, permission gates and keyboard denial recovery.
Original-handler boundary and gate probes fail before the fixes. No schema
migration or application-data reset was needed; test-only database/schemas were
created and removed. See [evidence and limits](docs/BOUNDARIES_ROLES_VALIDATION.md).
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
Sharp is the new raster decoder dependency. See [image evidence](docs/IMAGE_BOUNDARIES_VALIDATION.md)
and [ADR-015](docs/adr/015-image-boundaries.md). The staging rehearsal remains on
its previously recorded code/schema; actual rollout/provider/cleanup gates remain.
Previous P2-ROLES-ADMIN-SCOPE validation (2026-11-01): workspace
build/typecheck/lint, 95 API tests, localization guard, Prisma generate/validate/
format, migration parity and complete isolated PostgreSQL baseline pass. Nine
unchanged frontend tests were reused from the local cache. The 18-operation scope
matrix proves scoped/removed/global-staff denial with unchanged records, active
global-admin success, immediate removal denial and aggregate preflight behavior.
See [scope evidence](docs/ADMIN_SCOPE_VALIDATION.md). No schema migration or
application-data reset was needed; actual deployment provenance remains open.
Previous P2-INVITE-IDENTITY validation (2026-11-01): workspace
build/typecheck/lint, 93 API + 9 frontend tests, localization guard, Prisma
generation/validation/format, fresh/upgrade migration parity and complete isolated
PostgreSQL baseline pass. Regressions cover intended/wrong/no/stale/ineligible
identity, preserved credentials/unrelated access, audit attribution, rollback and
concurrent acceptance. No schema migration or application-data reset was needed.
See [invitation evidence](docs/INVITATION_IDENTITY_VALIDATION.md).
Previous Phase 2A validation (2026-10-25): workspace build,
typecheck, web lint, 92 API + 9 frontend tests, localization guard, Prisma checks,
fresh/upgrade migration parity (including SQL-only checks/functions/triggers), and
the complete isolated PostgreSQL baseline pass. New fixtures prove immutable and
transactional audit, recoverable onboarding, role/studio scope constraints,
removed/scoped-admin denial and encrypted email rollback/retry/stale-link expiry.
Twelve Chromium fixture cases cover three languages at four widths, keyboard,
focus and overflow, with measured contrast and visual review. See
[foundation evidence](docs/PHASE_2A_VALIDATION.md). Previous recovery/session and
eligibility evidence remain in [recovery](docs/AUTH_RECOVERY_VALIDATION.md) and
[eligibility](docs/AUTH_ELIGIBILITY_VALIDATION.md); earlier schema/token/scope
reports retain their dated findings. Operational deployment/real delivery and
full journey/human review evidence remain open.
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
request eligibility was subsequently corrected under P2-AUTH-ELIGIBILITY.
Public auth recovery and intended-account invitation acceptance are now delivered
technically. Image ownership/content/private retrieval is now delivered under
P2-BOUNDARIES-UPLOADS. Full signup/recovery/invitation UI, provider and actual deployment work remain before external exposure.
