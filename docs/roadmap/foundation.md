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

Entry: Phase 1 contracts/localization foundations are stabilized. Relevant local
technical foundations are prerequisites for their Phase 2B and later consumers;
unfinished operational/provider evidence is not a blanket block on local P3 work.
See the checkpoint's development/release distinction. Each model change needs
reviewed migrations, preservation checks and shared contracts before dependent
runtime work. P2-SCOPE-DEPLOY and real P2-EMAIL remain mandatory external gates.

- [x] P2-UI-FOUNDATION (technical scope, 2026-10-25): semantic Tailwind tokens and native Button/Field/Input/ErrorSummary/Alert/StatusBadge/loading/empty components are implemented. Development-only synthetic fixtures cover ET/EN/RU, validation focus/field links, accepted versus failed delivery, busy/disabled and empty states. Chromium checks cover 320/390/768/1440px, keyboard navigation, language-switch input preservation, overflow and computed colors; contrast regression and visual fixture review pass. Initial P9-BROWSER infrastructure/CI is included. Fluent-language, screen-reader and full journey release review remain I18N-QA/P9-BROWSER. See [foundation evidence](../PHASE_2A_VALIDATION.md).

- [x] P2-SCOPE-INTEGRITY (technical slice, 2026-10-25): ADR-008 chooses restrictive event deletion, SQL-only global-role and null-safe outstanding-invitation uniqueness, and atomic expired-invitation replacement with superseded history. New migration preserves all rows and refuses ambiguous duplicates. Typed Prisma predicates remain null-safe. Isolated PostgreSQL tests prove concurrent duplicate rejection, full-record upgrades/refusal rollback, restricted deletion and history preservation. Read-only aggregate preflight is provided; deployed-data review is explicitly P2-SCOPE-DEPLOY, not claimed by fixture tests. See [validation](../SCOPE_INTEGRITY_VALIDATION.md).
- [ ] P2-SCOPE-DEPLOY (operational gate before deployment/M1 or event deletion): run scripts/audit-scope-integrity.sql on the intended deployment, review global role/invitation provenance through authorized tooling, explicitly resolve duplicate groups, verify backup and migration parity, and coordinate stopped writers/migration/API rollout under ADR-008. Never infer lost scope, merge accounts or automatically delete rows. No intended hosted database is available. The new isolated local staging rehearsal does not establish hosted provenance/backup/rollout evidence; this gate remains open.
- [x] P2-IDENTITY-TOKENS (technical foundation, 2026-10-25): email and lifecycle slices below pass. ADR-009/010 define canonical identity/collision refusal and purpose-bound digests, expiry, consumed/revoked state, atomic rotation/consumption and legacy-link invalidation without merging users or changing ownership. Raw link secrets are absent from normal DTOs, persistence and email logs. Public recovery/resend and eligibility are now delivered under P2-AUTH; session and invitation management are now implemented locally; real staging email retains its EMAIL gate. Intended-deployment collision/scope audit remains operational work. No external milestone closes.
- [x] P2-IDENTITY-TOKENS-EMAIL (2026-10-25, first technical slice of the parent): ADR-009 defines ASCII-space trimming/lowercasing without provider alias folding. Shared inputs, aggregate deployment preflight, collision-refusing migration and SQL-only direct-write checks are implemented. Synthetic upgrades preserve every non-email field and refuse account/global/event invitation collisions atomically. HTTP case variants and duplicate-account preservation pass. See [evidence](../EMAIL_IDENTITY_VALIDATION.md). Actual deployment audit is still required; current disposable development data was not reset.
- [x] P2-IDENTITY-TOKENS-LIFECYCLE (2026-10-25): implemented verification/recovery AccountToken history, invitation digests/revocation, active/issuance-email binding, atomic rotation and consumption, safe password recovery primitives and plaintext-column removal/old-link invalidation. Verification and inactive-invite denial are wired into mounted handlers; email fake is silent and production rejects unavailable delivery. Wrong-purpose, expiry, replay, concurrent verification/recovery/rotation, rollback, inactive identity, direct uniqueness and secret-free logs pass. See [evidence](../IDENTITY_TOKEN_VALIDATION.md). Public recovery/resend is now delivered under P2-AUTH; invitation management is now implemented locally; real staging delivery remains P2-EMAIL.
- [x] P2-ONBOARDING-MODEL (2026-10-25): ADR-013 defines studio details, owner-only pending proof boundary, intended-event return, verification persistence, cancellation, revision/operation retry and 90-day review threshold. Shared strict contracts, restrictive owner/event storage and internal owner-keyed read/save/cancel services are implemented. PostgreSQL proves identical retry, conflict, verification preservation, cancellation and no roles/membership grant. Existing roleless accounts remain untouched. Public proof/context is now implemented under P2-SIGNUP; application completion remains P5-APPLICATION; no draft intent grants privilege.
- [x] P2-AUDIT (2026-10-25): ADR-012 implements immutable durable AuditLog with restrictive actor identity, allowlisted actions/metadata and transactional hooks for account/token, invitation/access and studio/registration approval changes. No tokens/passwords/contact/billing payloads enter audit metadata. PostgreSQL proves domain/audit rollback in both directions, actor FK/metadata denial and UPDATE/DELETE rejection. Later feature coverage grows with its owning task.
- [x] P2-PRIVACY (technical policy, 2026-10-25): [privacy policy](../PRIVACY.md) records minimization, authorized viewers, birth-date/photo/contact handling, retention review thresholds, deletion/export responsibilities and existing-account transition. No automatic domain cleanup/deactivation is enabled. ADR-014 separately defines encrypted transport-secret expiry. Organizational/jurisdiction review and real-data release approval remain operational gates.
- [x] P2-STAFF-MODEL (2026-10-25): ADR-013 defines invitation/assignment states, event staff versus explicit studio scope, atomic acceptance, pending revocation versus accepted removal/restoration and history. Composite Role/key and Studio/event FKs plus scope CHECKs protect bound invitations; historical unclassified rows cannot accept/rotate. New staff creation allows judge/moderator with required event only; controlled global admin is not invitational. Removed assignments, scoped admin and global judge/moderator cannot bypass middleware scope. Moderator stage.manage is separate from score.submit in migration/seed. Intended existing-account proof, Judge reconciliation and removal handlers now pass locally under Phase 2B; studio member creation remains P5. Deployment provenance still needs review.
- [ ] P2-EMAIL (local technical implementation complete; real staging delivery open): ADR-014 integrates Resend HTTPS with validated configuration, a silent fake and ET/EN/RU verification/resend, invitation, recovery and application-decision templates. Encrypted dispatch intent commits with domain mutation; background retries reuse provider idempotency IDs, cancel stale links and clear ciphertext on terminal outcomes and stop retries within 23 hours. Responses explicitly leave delivery unconfirmed. Fake/provider failure/rollback/concurrency/template tests pass locally. Recipient locale persistence/policy is ADR-013; UI preference reconciliation is now implemented under I18N-PREFERENCES. No hosting/domain/Resend account exists yet, so real inbox delivery cannot be claimed. [Staging preparation](../STAGING.md) records the remaining gate; no M2/M4 release before real delivery evidence.

P2-EMAIL depends on I18N-PREFERENCES recipient/invitation locale policy and
persistence decisions before integration; I18N-UI/FORMATTING complete the delivered
onboarding surfaces in Phase 2B without waiting for future entry/judging screens.

Exit: scope removal cannot broaden permissions; null-safe uniqueness and token
lifecycle/identity transition tests pass. Onboarding/invitation persistence and permission decisions are explicit;
minimal audit/model migrations preserve data; privacy requirements are recorded;
the email integration is tested and staging delivery evidence is recorded before
an external milestone. No dependency on future scoring or multi-event migration.

### Database schema suitability review

- [x] P2-SCHEMA-AUDIT (2026-10-25): reviewed all 19 models and migrated PostgreSQL catalog, SQL-only objects, source contracts/relationships and representative synthetic plans. Added six ADR-010 token row CHECKs and full studio-index parity; direct SQL, valid upgrade preservation, atomic invalid-data refusal, existing HTTP/database workflows and workspace/Prisma checks pass. [Findings and evidence](../SCHEMA_SUITABILITY_AUDIT.md) prioritize current security work and route later identity/ownership/draft/date/scoring/index changes to their existing owners. Existing Compose metadata is behind the working tree; application rows were not migrated/reset. Subsequent foundation work is recorded above; the checkpoint owns the next task. External milestone gates remain open.

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

- [x] P2-UI-SHELL (local technical scope, 2026-11-05): translated responsive app/auth navigation and supported role links use P2-ROLES; selected-event context, skip/main landmark, locale metadata/titles/route focus, explicit protected-event sign-in/denied/missing states and read-only S04 profile are implemented. Account disclosure supports Escape/focus restoration; unsupported application/studio links and inert profile Edit are removed with truthful unavailable states. Roleless/scoped/multi-role direct URLs, ET/EN/RU at four widths, keyboard/reflow and screenshot spot review pass. Full auth/application/staff journeys, fluent-language and screen-reader review retain their gates. See [evidence](../SESSION_SHELL_VALIDATION.md).
- [x] P2-UI-AUTH (local technical scope, 2026-11-05): semantic translated signup/check-email, owner draft recovery/save/reload/cancel, resend/correction/password recovery/reset, new/existing/wrong-account invitation acceptance and global-admin invitation controls are implemented with truthful unconfirmed delivery and safe explicit continuation. ET/EN/RU, four-width signup recovery, language/input preservation and mobile invitation states are covered alongside existing shell/session checks. Fluent-language/screen-reader and hosted real-mail release review remain open; application and staff readiness are not implied. See [evidence](../ONBOARDING_INVITATIONS_VALIDATION.md).

- [x] P2-AUTH (technical backend scope, 2026-10-25): eligibility and public recovery slices pass. Active/existing/verified login/request checks, seeded development identity, verification/resend, password-proven pending email correction, atomic reset/replay/expiry handling and credential-version session revocation are implemented under ADR-006/010/011. No inactive account is reactivated or pending role granted. See [recovery evidence](../AUTH_RECOVERY_VALIDATION.md). Real staging delivery, auth UI and broader session/abuse controls remain their existing gates; minimal audit is implemented and later features extend it; no external milestone closes.
- [x] P2-AUTH-ELIGIBILITY (2026-10-25, security slice of P2-AUTH/C2): login requires correct credentials and active/verified identity; protected requests check existing/active/verified users before roles/admin bypass. Verified roleless access remains independent of permissions. DEV_AUTH resolves a real configured development account and actual roles, with production/test startup refusal and persisted actor-FK evidence. All protected inventory operations deny ineligible subjects; PostgreSQL proves stale-token/admin/missing/inactive/unverified denial, unchanged records and eligible pending verification. See [evidence](../AUTH_ELIGIBILITY_VALIDATION.md). C2 is technically corrected locally; public recovery is delivered below, while UI/provider and other release gates remain open.
- [x] P2-AUTH-RECOVERY (2026-10-25): four canonical public operations, strict shared contracts/client helpers, neutral delivery-unconfirmed 202 acknowledgements, global-unavailable 503, password-proven pending correction and atomic one-hour reset. Failed sends preserve previous links/email; collision/expiry/replay/inactive/wrong-purpose/concurrency and database rollback pass. SessionVersion migration/JWT matching revokes older sessions after reset/correction; legacy JWTs require sign-in. Process-local configured recovery limits return translated 429/Retry-After with proxy trust false. ET/EN/RU semantics and [evidence](../AUTH_RECOVERY_VALIDATION.md) are recorded; real staging delivery, auth UI and remaining SESSION/BOUNDARIES controls stay open.
- [x] P2-ROLES (technical scope, 2026-11-05): useRole, RequireRole and RoleGate share exact-key/supported global/event policy. Profile exposes backend-resolved permission scopes; all gate conditions combine without auth bypass. Unsupported scoped admins/global staff do not grant access, display names never authorize and event permissions require matching/global scope. Translated denied-route focus/home recovery, unit and direct-navigation browser cases cover renamed/similar keys, roleless/multi-role, wrong event, admin and expiry. Existing PostgreSQL ownership/parent/18-operation admin matrices pass; removed assignments disappear on the next profile request. The navigation/context/profile shell is now implemented under P2-UI-SHELL; full workflow gates remain. See [evidence](../BOUNDARIES_ROLES_VALIDATION.md).
- [x] P2-BOUNDARIES (local technical scope, 2026-11-05): ownership/content/private image handling and transactional audit remain delivered under UPLOADS/ADR-015. Configured exact-origin CORS/preflight, restrictive API headers, production origin/secret/storage validation and separate bounded socket-IP limits for login, signup/verification, recovery, invitations and uploads are wired before expensive parsing/authentication. HTTP negative/allowed cases, spoofed-forwarded denial, expiry and Retry-After pass. Proxy trust stays false; hosting/shared-instance throttling and rollout evidence remain operational gates. See [evidence](../BOUNDARIES_ROLES_VALIDATION.md).
- [x] P2-SESSION (local technical scope, 2026-11-05): ADR-016 chooses host-only HttpOnly/SameSite=Lax one-hour browser JWT cookies (Secure in production), exact-Origin/CSRF proof and explicit native bearer isolation. Browser storage tokens are removed; cookie responses contain no JWT. Audited POST /auth/logout atomically revokes all account sessions while preserving other accounts/domain data. Shared safe route returns, explicit verification/Continue, profile bootstrap, inert recovery preserving mounted work and nonsecret cross-tab reconciliation are implemented. HTTP/PostgreSQL expiry/eligibility/CSRF/wrong-transport, rollback/concurrency/removal and browser return/recovery/locale cases pass. Migration 28 only expands the audit allowlist. HTTPS/real mail/hosted rollout and full auth journeys remain external gates. See [evidence](../SESSION_SHELL_VALIDATION.md).

ADR-011 supplies credential-reset JWT revision invalidation; ADR-016 now supplies
explicit browser/native transport, audited logout, recovery and safe return handling. P2-BOUNDARIES now provides separate
process-local limits for all mounted sensitive route groups; shared/ingress limits
remain deployment work. ADR-014 now supplies durable encrypted dispatch/provider idempotency and bounded
retry across send/commit failure. Real inbox delivery and complete email-link UI
still require staging/workflow evidence; a silent fake does not prove them.

- [x] P2-SIGNUP (local technical scope, 2026-11-05): ADR-017 requires studio intent and atomically creates account/draft/token/audit/delivery intent without roles or studio privileges. Owner-only password proof recovers pending progress without ordinary access; eligible session proof, operation/revision retries, stale edits, verified continuation and retained cancellation are implemented with ET/EN/RU UI. Direct bypass, duplicates, rollback, concurrency and isolation are covered. Applications/approval remain P5; real mail and human release review remain open. See [evidence](../ONBOARDING_INVITATIONS_VALIDATION.md).
- [x] P2-INVITE (local technical scope, 2026-11-05): event-bound judge/moderator create/list/status and displayed-expiry CAS resend/revoke are global-admin-only. Rotation, transactional audit/delivery, terminal history, expiry replacement and credential-preserving intended-account acceptance are implemented. Translated new/existing/wrong-account UI signs in/switches in place and requires explicit acceptance, stripping link secrets. Scope denial, rollback, replay and concurrency are covered. Judge reconciliation and offboarding now pass locally under their separate tasks; real staging mail remains open. See [evidence](../ONBOARDING_INVITATIONS_VALIDATION.md).
- [x] P2-JUDGE-ACCEPT (local technical scope, 2026-11-06): ADR-018 reconciles missing Judge/UserRole and invitation consumption/audit in one serializable transaction. Existing Judge identity/profile/scores and active assignments are preserved; removed access cannot be restored by acceptance. New/existing-account, all existing assignment combinations, concurrency, scope/identity denial and bidirectional audit rollback pass. A role alone or Judge CRUD alone is not readiness. See [evidence](../STAFF_PREFERENCES_VALIDATION.md). Staff UI and external gates remain.
- [x] P2-OFFBOARD (local technical scope, 2026-11-06): global-admin-only POST /events/:eventId/staff/:assignmentId/remove marks a stored event judge/moderator assignment removed and appends ACCESS_REMOVED atomically. Strict input, unauthorized/scoped-admin/cross-event denial, idempotent/concurrent removal, rollback, immediate profile permission removal, retained Judge/Score history and other-access preservation pass. Pending revocation stays separate; restoration/staff UI remain P4-STAFF. See [evidence](../STAFF_PREFERENCES_VALIDATION.md).

### Audit correction slices and acceptance

C1/C2/C3/C4/H2 are technically corrected locally by P2-INVITE-IDENTITY,
P2-AUTH-ELIGIBILITY, P2-BOUNDARIES-UPLOADS and P2-IDENTITY-TOKENS; other findings
retain their owning technical/operational scope.
[Correction mapping](../AUDIT_FOLLOWUP.md) owns the
finding-to-task evidence requirements; the checkboxes here own implementation
status. Parent task IDs and completed Phase 1 scope remain unchanged. These
security slices are explicit M1 requirements, not future UI or M4-only work.

- [x] P2-INVITE-IDENTITY (C1/C2, technical security slice of P2-INVITE, 2026-11-01): mounted acceptance requires the intended active/verified existing-account session, with transactional identity/revision locking. Wrong/no/invalid/stale/ineligible sessions cannot consume links, alter credentials, reactivate identities or grant access. Existing-account success issues no JWT; new-account verified setup retains its session response. Strict shared request/response contracts and client handling are aligned. Scoped access/consumption and USER-attributed audit commit atomically; HTTP/PostgreSQL denial, full-record preservation, bidirectional rollback, replay and concurrency pass. See [evidence](../INVITATION_IDENTITY_VALIDATION.md). No schema migration/reset was needed. Resend/revoke/management and acceptance UI are now implemented locally under P2-INVITE/UI-AUTH; Judge reconciliation now passes locally under P2-JUDGE-ACCEPT; no external milestone closes.
- [x] P2-ROLES-ADMIN-SCOPE (H1, technical backend slice of P2-ROLES, 2026-11-01): ADR-013 policy and all assignment writers are reviewed in [role architecture](../../ROLE_ARCHITECTURE.md). Only active global admin bypasses; scoped admins grant no authority, removed/global staff are ignored and custom event permissions do not grant admin-only writes. The seed now creates an event-bound judge without repairing historical rows; invitation creation uses the same staff scope guard as acceptance. The original 18 admin-only operations (now 20 after P2-INVITE) have own/other-event HTTP/PostgreSQL denial matrices, preserved-record snapshots, active-global success and immediate-removal checks. Unsupported invitation creation/links/rotation and aggregate preflight pass. See [evidence](../ADMIN_SCOPE_VALIDATION.md). No migration/reset or provenance inference occurred. H1's actual deployment provenance/repair remains P2-SCOPE-DEPLOY; frontend role consistency is now delivered; the shell is now implemented under P2-UI-SHELL. No M1 or external milestone closes.
- [x] P2-BOUNDARIES-UPLOADS (C3/C4, technical slice of P2-BOUNDARIES, 2026-11-01): ADR-015 enforces stored ownership/permissions, active parents, resource approval/stage rules and refreshed transactional identity/access on all four routes. Sharp validates matching JPEG/PNG/WebP and re-encodes bounded metadata-free WebP with UUID filenames. Public static serving is removed; retrieval needs eligible identity, live canonical reference and resource read access with safe headers/no-store. IMAGE_REPLACED audit and reference commit atomically; forward allowlist migration preserves history. HTTP/raster/client/PostgreSQL checks cover denied roleless/cross-user/event/studio/removed-member/archived subjects, genuine images, malformed/active/mismatched/animated/pixel-bomb input, private retrieval, rollback, concurrent replacement and unreachable orphans. Original-handler C3/C4 regressions fail before and pass after. See [evidence](../IMAGE_BOUNDARIES_VALIDATION.md). No application data reset or legacy file cleanup occurred. Durable provider cleanup/retry/music remain P8-MEDIA; image UI/full browser journeys and actual staging rollout remain gated. Parent P2-BOUNDARIES transport/abuse controls are now complete locally (2026-11-05); hosted rollout/session gates remain and no M1 or external milestone closes.

Parent acceptance additions: P2-AUTH must reject existing tokens on the next
protected request after disabling an account, including admin operations, and
reject inactive verification/invitation sessions. P2-IDENTITY-TOKENS must cover
concurrent verification and secret-free logs. P2-EMAIL must prove unavailable/
failed delivery never silently reports sent; include safe retries and staging
delivery. P2-BOUNDARIES now proves configured CORS/throttling/security headers
with proxy trust false; ingress/shared-instance policy remains deployment work.
See [boundary and role evidence](../BOUNDARIES_ROLES_VALIDATION.md).

P2-ROLES now supplies stable-key/event/permission gates and translated role-route
denial recovery. P2-UI-SHELL now delivers navigation/context, translated missing
route recovery and read-only profile; unsupported application/studio actions are
truthfully unavailable. Full destination workflows retain their owning tasks (H4/M1/L1). P2-UI-AUTH now supplies translated semantic forms and shell/disclosure behavior locally.
I18N-QA retains human language/assistive review (M4). Full application/acceptance journeys remain
gated by their backend tasks; hiding links is containment, not journey completion.
Each correction needs permanent negative and permitted-path regressions; add
interactive/browser evidence with the delivered UI (M5).

- [x] P2-BOUNDARIES-ERRORS (2026-11-05): JSON over 100 KiB returns 413 requestTooLarge, malformed/aborted/invalid-length parser input returns 400 invalidInput, and unsupported charset/content encoding returns 415 unsupportedEncoding. Compressed JSON is explicitly refused. Shared reasons and ET/EN/RU feedback are aligned; HTTP cases prove private envelopes and no handler mutation. Unknown errors still produce private 500 responses. Original parser regression fails before the fix. See [evidence](../BOUNDARIES_ROLES_VALIDATION.md).

Exit: role/event/ownership matrix and sensitive-route rate limits pass; signup
cannot grant unapproved privileges; pending applicants can recover their work;
staff scope, wrong/inactive accounts, expiry, concurrency, rollback, and removal
are tested. Audit events are durable. Email must pass P2-EMAIL before external use.
