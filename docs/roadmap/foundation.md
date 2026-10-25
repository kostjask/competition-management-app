# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 2A — Onboarding decisions, audit/privacy, and email foundations

Apply the [disposable-data policy](../TESTING.md#development-database-and-disposable-data)
to current development fixtures. Identity/token transition, audit/backfill and
preservation requirements do not require retaining disposable rows or adding
legacy machinery solely for them; domain correctness, synthetic negative tests
and protection of any retained/non-disposable data remain required.

Entry: Phase 1 contracts/localization foundations are stabilized. These are prerequisites for Phase 2B,
not later Phase 3 work. Each model change needs reviewed migrations, preservation
checks, and shared contracts before dependent runtime work.

- [ ] P2-UI-FOUNDATION: after UIUX-DOCS, introduce semantic tokens and minimal reusable Button/Field/Input/ErrorSummary/Alert/StatusBadge/loading/empty patterns in the existing Tailwind 4 setup. Preserve semantic feedback; demonstrate keyboard/focus, contrast, ET/EN/RU long text and phone/tablet/desktop states with synthetic fixtures and initial P9-BROWSER checks. No final brand assets/new UI library required; no dependency on later domain models. Foundation exit includes reviewed state fixtures; email UI/templates must distinguish accepted request from delivery failure.

- [x] P2-SCOPE-INTEGRITY (technical slice, 2026-10-25): ADR-008 chooses restrictive event deletion, SQL-only global-role and null-safe outstanding-invitation uniqueness, and atomic expired-invitation replacement with superseded history. New migration preserves all rows and refuses ambiguous duplicates. Typed Prisma predicates remain null-safe. Isolated PostgreSQL tests prove concurrent duplicate rejection, full-record upgrades/refusal rollback, restricted deletion and history preservation. Read-only aggregate preflight is provided; deployed-data review is explicitly P2-SCOPE-DEPLOY, not claimed by fixture tests. See [validation](../SCOPE_INTEGRITY_VALIDATION.md).
- [ ] P2-SCOPE-DEPLOY (operational gate before deployment/M1 or event deletion): run scripts/audit-scope-integrity.sql on the intended deployment, review global role/invitation provenance through authorized tooling, explicitly resolve duplicate groups, verify backup and migration parity, and coordinate stopped writers/migration/API rollout under ADR-008. Never infer lost scope, merge accounts or automatically delete rows. No deployed database is available to this implementation task; this gate remains open.
- [x] P2-IDENTITY-TOKENS (technical foundation, 2026-10-25): email and lifecycle slices below pass. ADR-009/010 define canonical identity/collision refusal and purpose-bound digests, expiry, consumed/revoked state, atomic rotation/consumption and legacy-link invalidation without merging users or changing ownership. Raw link secrets are absent from normal DTOs, persistence and email logs. Recovery/resend primitives are internal; public handlers, request eligibility, session policy and real email retain their P2-AUTH/SESSION/INVITE/EMAIL gates. Intended-deployment collision/scope audit remains operational work. No external milestone closes.
- [x] P2-IDENTITY-TOKENS-EMAIL (2026-10-25, first technical slice of the parent): ADR-009 defines ASCII-space trimming/lowercasing without provider alias folding. Shared inputs, aggregate deployment preflight, collision-refusing migration and SQL-only direct-write checks are implemented. Synthetic upgrades preserve every non-email field and refuse account/global/event invitation collisions atomically. HTTP case variants and duplicate-account preservation pass. See [evidence](../EMAIL_IDENTITY_VALIDATION.md). Actual deployment audit is still required; current disposable development data was not reset.
- [x] P2-IDENTITY-TOKENS-LIFECYCLE (2026-10-25): implemented verification/recovery AccountToken history, invitation digests/revocation, active/issuance-email binding, atomic rotation and consumption, safe password recovery primitives and plaintext-column removal/old-link invalidation. Verification and inactive-invite denial are wired into mounted handlers; email fake is silent and production rejects unavailable delivery. Wrong-purpose, expiry, replay, concurrent verification/recovery/rotation, rollback, inactive identity, direct uniqueness and secret-free logs pass. See [evidence](../IDENTITY_TOKEN_VALIDATION.md). Public recovery/resend/revoke and real delivery remain with their owning tasks.
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

### Database schema suitability review

- [x] P2-SCHEMA-AUDIT (2026-10-25): reviewed all 19 models and migrated PostgreSQL catalog, SQL-only objects, source contracts/relationships and representative synthetic plans. Added six ADR-010 token row CHECKs and full studio-index parity; direct SQL, valid upgrade preservation, atomic invalid-data refusal, existing HTTP/database workflows and workspace/Prisma checks pass. [Findings and evidence](../SCHEMA_SUITABILITY_AUDIT.md) prioritize current security work and route later identity/ownership/draft/date/scoring/index changes to their existing owners. Existing Compose metadata is behind the working tree; application rows were not migrated/reset. Next: P2-AUTH; Phase 2A and external milestone gates remain open.

Audit scope and acceptance retained below; current decisions/results are in the report.

Review Prisma models, actual PostgreSQL schema/migration parity (including
SQL-only objects), entity ownership and event/studio/user relationships,
normalization/redundancy, nullability/defaults, uniqueness, foreign keys/referential
actions, CHECK constraints, date/time and numeric types, soft deletion/audit/history,
and indexes for concrete queries. Assess fitness for onboarding, registration,
entries, staff, media and future scoring/results without inventing undecided
domain rules or implementing later workflows early. Use representative synthetic
data and query plans where index recommendations need evidence.

Produce a prioritized findings/decision record with source evidence, proposed
target model, reasons to change or retain each area, dependencies and migration/
reset strategy. Explain materially ambiguous domain/architecture options first;
record broad decisions in an ADR before dependent code. Coordinate findings with
P2 identity/onboarding/staff/audit/privacy work, P3-STUDIO-IDENTITY/NAMES,
PERFORMANCE-OWNER/CONSTRAINTS/HISTORY/CALENDAR-DATES/INDEXES/DATA-HYGIENE and
P6-SCORING-MODEL instead of duplicating tasks or bypassing their gates.

Implement necessary, justified current-foundation fixes in bounded slices with
aligned migrations, shared schemas/types, DTOs, controllers, clients and fixtures.
Place later-scope improvements in their owning phase with explicit acceptance
checks/dependencies. Exit: current review and decisions documented; required
in-scope fixes implemented (or explicitly blocked, leaving this task open);
fresh migration application/parity, applicable API/database/negative/concurrency
tests, Prisma format/validate/generate, typecheck/lint/build pass as applicable;
seed/setup and roadmap/checkpoint reflect the result. A documented no-change
conclusion is valid when supported by evidence. Do not mark planned fixes as done.

## Phase 2B — Authentication, authorization, and onboarding behavior

Entry: relevant Phase 2A foundations pass. Apply each task's narrower prerequisites
before its implementation; M1 uses the security foundation tasks listed in the checkpoint milestone table.

- [ ] P2-UI-SHELL: with P2-ROLES and I18N-UI/FORMATTING, implement responsive translated app/auth navigation, event/role context, skip link, page title/focus, explicit protected-event sign-in/denied/not-found states and S04 profile without inert Edit actions. Follow S01–S04; test roleless/event-scoped/multi-role direct navigation. Fixture work can proceed independently; live behavior waits for corresponding security contracts.
- [ ] P2-UI-AUTH: within P2-AUTH/SESSION/SIGNUP/INVITE, deliver S03/S17 semantic login, eligible signup, check-email/verification, password recovery and new/existing/wrong-account acceptance with truthful delivery states and safe event/language return. Follow F01/F06; no unsupported resend/reset behavior before backend gates. UI exit requires these delivered journeys to pass the cross-phase state/device/language/accessibility and user-flow/visual criteria.

- [ ] P2-AUTH: after P2-IDENTITY-TOKENS, verify active/existing/email-verified users at appropriate login/request boundaries; handle verification/resend, mistyped-email correction, password reset, safe recovery responses, expiry/used tokens, and seeded development identity. Never silently reactivate inactive invitees.
- [ ] P2-ROLES: unify frontend guards and gates on stable role keys, permission/event scopes, and explicit global/admin semantics. Add profile permission data if required; test bypass and parent/ownership invariants.
- [ ] P2-BOUNDARIES: secure each image upload by resource ownership/permissions; use configured CORS, security headers, validated production configuration, login throttling, and rate limits for auth/invite/upload routes. Use audit hooks from P2-AUDIT.
- [ ] P2-SESSION: decide JWT cookie versus localStorage threat model and implement the chosen session handling; validate internal return destinations through email tabs/devices and session expiry, preserving recoverable work without credentials in URLs.
- [ ] P2-SIGNUP: after P2-ONBOARDING-MODEL, P2-AUTH, P2-SESSION, and P2-PRIVACY, implement backend-enforced studio-focused signup with recoverable pending-user progress and translated UI. Test direct generic-signup bypass, duplicate email/retries, interrupted verification, and prohibition of public role self-selection. Approved representative privileges still require approval.
- [ ] P2-INVITE: after P2-STAFF-MODEL, P2-AUTH, and P2-AUDIT, validate allowed roles/event scope, remove production token exposure, implement resend/revoke/expiry/status, and authenticate existing-account acceptance without resetting credentials. New invited accounts use verified setup; wrong-account sessions can switch. Add acceptance page/recovery states, safe errors, and repeated/concurrent acceptance tests.
- [ ] P2-JUDGE-ACCEPT: after P2-INVITE and P2-STAFF-MODEL, atomically reconcile Judge/UserRole/invitation consumption for the same event, including existing assignments and rollback. A role alone or Judge CRUD alone is not staff readiness.
- [ ] P2-OFFBOARD: after P2-STAFF-MODEL and P2-AUDIT, remove accepted event access separately from pending-invite revocation; preserve Judge/Score history and test unauthorized/cross-event/concurrent removal.

### Audit correction slices and acceptance

H2 is technically corrected locally by P2-IDENTITY-TOKENS; other findings remain
open. [Correction mapping](../AUDIT_FOLLOWUP.md) owns the
finding-to-task evidence requirements; the checkboxes here own implementation
status. Parent task IDs and completed Phase 1 scope remain unchanged. These
security slices are explicit M1 requirements, not future UI or M4-only work.

- [ ] P2-INVITE-IDENTITY (C1/C2, security slice of P2-INVITE): after P2-IDENTITY-TOKENS, P2-AUTH and minimal P2-AUDIT support, apply the intended-account/role-scope policy from P2-STAFF-MODEL to the mounted acceptance endpoint. Existing accounts require authenticated intended identity; reject wrong/no account and inactive users without minting sessions, overwriting credentials, reactivation, access writes or consuming the invitation. Preserve new-account setup and atomic acceptance/replay/concurrency guarantees. Full resend/revoke/management and Judge reconciliation retain their existing P2-INVITE/JUDGE-ACCEPT gates; do not wait for those screens to close this defect.
- [ ] P2-ROLES-ADMIN-SCOPE (H1, backend slice of P2-ROLES): review and record global-admin/assignable staff scope policy with P2-STAFF-MODEL before dependent code. Event-scoped admin must not become a global bypass; reject unsupported assignment/invitation scopes and test admin-only operations outside the supplied scope. Review existing assignments through P2-SCOPE-DEPLOY before any migration/repair; preserve provenance and never infer global intent. Frontend stable-key/event guard corrections remain part of parent P2-ROLES (M1 finding).
- [ ] P2-BOUNDARIES-UPLOADS (C3/C4, immediate slice of P2-BOUNDARIES): after the applicable P2-PRIVACY policy and P2-AUDIT hooks, secure all four mounted image endpoints before external API exposure. Check ownership/permissions, stored scope and active parents before storage/write; verify allowed raster content, derive safe filenames/extensions and safe serving behavior. Reject HTML/SVG or mismatched/invalid content and prove public retrieval cannot serve active content via image uploads. Cover roleless/cross-user/event/studio/removed-member/archived-parent denial with unchanged records/files and genuine-image success/failure preservation. No P3-MUSIC-MODEL dependency; P8-MEDIA extends these protections to providers/music later.

Parent acceptance additions: P2-AUTH must reject existing tokens on the next
protected request after disabling an account, including admin operations, and
reject inactive verification/invitation sessions. P2-IDENTITY-TOKENS must cover
concurrent verification and secret-free logs. P2-EMAIL must prove unavailable/
failed delivery never silently reports sent; include safe retries and staging
delivery. P2-BOUNDARIES must prove configured CORS/throttling/security headers
operate, with an explicit trusted-proxy policy (H2/H3/H5).

P2-UI-SHELL must correct stable-key/event guards with P2-ROLES, provide translated
not-found recovery, stop advertising unsupported action destinations and remove
the inert profile Edit action (H4/M1/L1). P2-UI-AUTH and I18N-UI/QA must replace
English-only auth text, use semantic forms and correct menu/disclosure naming,
keyboard and focus behavior (M4). Full application/acceptance journeys remain
gated by their backend tasks; hiding links is containment, not journey completion.
Each correction needs permanent negative and permitted-path regressions; add
interactive/browser evidence with the delivered UI (M5).

- [ ] P2-BOUNDARIES-ERRORS: map oversized/unsupported request-parser failures into the shared 4xx error envelope with translated semantic reasons and negative HTTP tests; oversized JSON currently returns 500. See M3 in the repository audit.

Exit: role/event/ownership matrix and sensitive-route rate limits pass; signup
cannot grant unapproved privileges; pending applicants can recover their work;
staff scope, wrong/inactive accounts, expiry, concurrency, rollback, and removal
are tested. Audit events are durable. Email must pass P2-EMAIL before external use.
