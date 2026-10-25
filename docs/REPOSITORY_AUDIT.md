# Repository implementation audit

Date: 2026-10-25 (Europe/Tallinn). Baseline: `dad2361` plus the existing working tree.
This is a source, contract, test and isolated-database audit, not a deployment or
browser acceptance audit. No implementation, schema, migration or test file was
edited. Audit documentation and checkpoint references are the only authored changes.

## Overall assessment

The repository has a coherent, passing technical baseline. Phase 1's completed
scope is substantially supported: canonical mounted routes, shared strict Zod
contracts, explicit DTOs, controller composition, validated frontend clients,
transactional registration and participant writes, scoped ownership checks for
studio/dancer/performance operations, and localization/error foundations.

It is not ready for external use. Critical authorization and upload defects are
reachable in mounted endpoints today. Most are explicitly deferred by the plan;
their presence does not invalidate the narrower contract work, but passing tests
must not be interpreted as security approval. No external milestone is marked
complete, which is consistent with the implementation.

Finding labels below distinguish verified behavior from conditional impact and
recommendations. Synthetic HTTP probes used the compiled real Express application
with injected database/storage fixtures, random ephemeral signing keys, disposable
temporary files and harmless content. They did not access real accounts or data.

## Git and intended scope

- At audit start: 36 modified tracked files, 51 untracked files when expanded with
  `git status --porcelain=v1 -uall`, zero staged files. No tracked deletions.
- Existing changes cover documentation restructuring, Prisma scope integrity,
  invitation replacement/history, one HTTP regression, migration verification and
  database test orchestration. All existing edits were preserved.
- Recent history reviewed: `dad2361` (Phase 1 contracts/localization), `9e0040d`
  (events/auth), `0c7fe5b` (judges/conflicts/CI), `a534a0a` (onboarding policy),
  `3e21dad` (performance/studio contracts), `5408ef8` (journeys/UX), and the next
  four commits shown by `git log -10 --oneline`. The latest six commits are dated
  2026-10-24; the working-tree scope/documentation changes are subsequent work.
- Uncommitted schema changes add `Invitation.supersededAt`, restrictive event
  foreign keys and SQL-only uniqueness. The controller atomically supersedes
  expired invitations before replacement and rejects superseded links.
- The active phase remains 2A. The recorded next task is P2-IDENTITY-TOKENS.
  P2-SCOPE-INTEGRITY is technically complete; P2-SCOPE-DEPLOY remains open.

## Completed functionality and consistency review

| Layer | Verified state |
| --- | --- |
| Prisma/migrations | Fresh migration history, existing-data upgrades, refusal of ambiguous duplicates, preservation, restrictive deletion and schema parity pass in isolated PostgreSQL. SQL-only global-role/outstanding-invitation indexes are covered by dedicated checks. |
| Shared contracts/types | Resource/auth/image/invitation DTOs and inputs are shared Zod contracts. Transport responses enter as `unknown` and are decoded. Strict workspace/seed typechecks pass. No executable `any` was found in the reviewed source search. |
| Backend composition | 56 method/path operations match the runtime coverage inventory. Protected operations reject unauthenticated requests; retired paths are tested. Empty `routes/users.ts` is intentionally unmounted, not a missing delivered feature. |
| Domain controllers | Studio registration/approval, studio profiles/members, dancer/performance CRUD and event setup CRUD exist. Negative parent/event/studio, conflict, archive and transaction tests cover the current technical policies. |
| Frontend clients | Canonical clients exist for the mounted resources and validate shared DTOs. Auth/profile and event list/detail/create/edit screens exist; role dashboards are placeholders. |
| Localization | Semantic errors, shared validation issues, locale selection, catalogue/plural checks and a hardcoded-string guard exist. Legacy UI translation exceptions remain explicitly tracked. |
| Documentation | Current security, API and storage guides generally describe the actual limitations. Documentation links/anchors/encoding checks pass. Target UI/journey documents are specifications, not delivered features. |

Not completed: restricted/verified onboarding, secure staff acceptance, working
application/entry UI, music, scheduling, scoring, competition operation, published
results, real email and nonlocal storage providers. These are open roadmap work,
not silently missing portions of a claimed released workflow.

## Critical

### C1. Invitation acceptance authenticates an existing account without its credentials

**Verified defect.** `InvitationsController.ts:64-83` looks up a user by invitation
email and signs a JWT for that user. For an existing password account, the supplied
password is hashed but never compared with the stored password. No authenticated
intended-account session is required by `routes/invitations.ts:10`.

**Why it matters:** possession of an invitation becomes login authority for the
existing account and all its existing privileges, beyond the invited role. The
same path issues sessions for inactive password accounts; passwordless inactive
accounts are explicitly reactivated at line 77.

**Evidence:** an unauthenticated synthetic acceptance with an arbitrary password
returned 201 and a JWT whose subject matched the existing inactive account.

**Correction:** require intended-account authentication for existing users, reject
inactive users, and separate new-account setup from role acceptance. Consume the
invitation and assign access atomically only after identity checks.

**Dependencies/risks:** P2-IDENTITY-TOKENS, STAFF-MODEL, AUTH and AUDIT. Preserve
credentials, account IDs and existing ownership; do not auto-reactivate or merge.
**Plan:** explicitly represented by P2-INVITE/AUTH; this exact session-minting impact
should be a mandatory negative regression.

### C2. Disabling an account does not revoke request access

**Verified defect.** `middleware/auth.ts:54-96` verifies a JWT and loads roles but
never loads the user's existence, active state or verification status. Login's
active check (`AuthController.ts:83-90`) therefore does not protect existing tokens.
Verification also issues a session without selecting/checking active state
(`AuthController.ts:66-75`).

**Why it matters:** a disabled administrator retains administrative access through
an unexpired token while role assignments remain. A roleless valid identity also
continues to reach endpoints that require only authentication.

**Evidence:** an inactive fixture identity with a valid token received 200 from
the global event collection and 201 from admin-only global event creation. Source
confirms the missing account lookup.

**Correction:** enforce existing/active-user checks at the request boundary and
appropriate verified-account policy per operation; reject inactive verification.
Test disabling a user after token issuance, missing users and inactive invitees.

**Dependencies/risks:** define P2-AUTH/SESSION eligibility and safe reauthentication;
preserve legitimate roleless onboarding access. **Plan:** explicitly P2-AUTH/SESSION.

### C3. Any authenticated user can replace another resource's image

**Verified defect.** `routes/api.ts:38` applies authentication only.
`routes/images.ts:8-11` then accepts event/user/dancer/studio uploads without a
permission guard. `ImagesController.ts:12-68` checks existence/selected archive
state and performs the update, but never checks actor ownership or event scope.

**Why it matters:** even unrestricted public signup can lead to unauthorized image
replacement, including unrelated event images, user portraits and studio/dancer
media. Existing files are deleted after replacement.

**Evidence:** a synthetic roleless caller uploaded to another event and received
200; the injected database recorded the foreign target update.

**Correction:** authorize resource ownership/event permissions and active parents
before multipart processing/storage mutation. Cover self/other user, cross-event,
cross-studio, inactive membership, archived parent and stage restrictions.

**Dependencies/risks:** P2-AUDIT/PRIVACY and explicit resource policy. Absence of an
upload UI does not protect mounted APIs. **Plan:** explicitly P2-BOUNDARIES.

### C4. Image upload can publish HTML as executable web content

**Verified unsafe content path; browser exploit impact is conditional.**
`middleware/file-upload.ts:23-27` preserves the original extension; lines 40-50
trust the client MIME declaration. `app.ts:14` serves stored files publicly.
No image decoding or content verification occurs.

**Evidence:** harmless HTML bytes submitted as MIME `image/png`, filename
`audit.html`, were accepted with 200. A subsequent unauthenticated GET returned
200 and `Content-Type: text/html; charset=utf-8`. This used temporary storage only.

**Why it matters:** an attacker can publish active content on the upload/API
origin. Same-origin deployment can increase the impact to authenticated script
access; token theft from a separate frontend origin was not demonstrated or claimed.

**Correction:** verify/decode allowed raster content, derive safe extensions from
verified content and use isolated media serving with appropriate headers. Reject
HTML/SVG/polyglot and extension/MIME/content mismatch cases before storage.

**Dependencies/risks:** do the immediate boundary fix with P2-BOUNDARIES; broader
media processing belongs to P8-MEDIA. Existing uploads need reviewed handling.
**Plan:** MIME verification/safe filenames are in P8-MEDIA; the demonstrated public
HTML path should be promoted into the pre-exposure security acceptance checks.

## High

### H1. An event-scoped admin assignment becomes a global bypass

**Verified behavior; exposure depends on stored assignments.**
`middleware/auth.ts:80-83` sets `isAdmin` for any `admin` role, ignoring `eventId`.
`CreateInvitationSchema` (`packages/schemas/src/invitation.schema.ts:15-19`) permits
any syntactically valid role and optional event. Creation checks role existence,
not a staff-role allowlist (`InvitationsController.ts:35-41`).

**Why it matters/evidence:** the probe's admin assignment was restricted to
`only-event`, yet it authorized admin-only creation of a new event (201), with
both active and inactive account fixtures. This is a privilege-broadening risk wherever operators or
legacy data create an event-scoped admin assignment; no deployed occurrence was
verified. Admin-only invitation creation does not make arbitrary scope semantics safe.

**Correction:** define admin as explicitly global and reject event-scoped admin
assignments/invitations, or implement scoped administration consistently. Enforce
allowed staff roles and mandatory staff event scope at backend boundaries.

**Dependencies/risks:** audit provenance before repairing assignments; never infer
scope or delete access automatically. **Plan:** P2-ROLES, STAFF-MODEL/INVITE and
SCOPE-DEPLOY cover the policy, but should explicitly name scoped-admin escalation.

### H2. Verification secrets have no expiry or atomic one-time consumption

**Verified implementation gap; replay concurrency is a source-derived risk.**
`schema.prisma:218-224` stores a raw verification token without expiry/consumption
metadata. `AuthController.ts:66-75` reads the token then updates by user ID, with
no token condition in the update. Invitations also store raw tokens
(`schema.prisma:278-288`), although their expiry and serializable consumption exist.
`utils/email.ts:39-40,76-77` logs raw tokens/links outside production.

**Why it matters:** verification links remain useful indefinitely until consumed;
two requests that both read before the update can both issue sessions. Database
and log access reveals bearer credentials. No concurrent verification exploit
against PostgreSQL was run in this audit.

**Correction:** purpose-bound digests, expiry, atomic conditional consumption,
rotation/revoke/resend rules and secret-free logging. Test concurrent use and
wrong-purpose/replayed/expired links. Apply one reviewed account/invitation email
canonicalization policy; `common.schema.ts:6` currently performs exact email validation.

**Dependencies/risks:** audited collision/legacy-link transition; no account merges
or ownership changes. **Plan:** explicitly P2-IDENTITY-TOKENS, the next task.

### H3. Production email silently succeeds without sending

**Verified defect in any attempted external onboarding flow.** Both functions in
`utils/email.ts:29-60,65-102` only log outside production and otherwise reach the
end with provider code commented out. Registration/invitation controllers await
them and return success (`AuthController.ts:60-63`, `InvitationsController.ts:54-55`).
The signup UI claims a verification link was sent (`RegisterPage.tsx:78-84`).

**Why it matters:** production verification/invitations cannot complete through
email, while the caller receives false delivery acknowledgement.

**Correction:** integrate a configured provider and truthful accepted/delivery
states, or fail clearly when delivery is unavailable. Add provider fakes and
failure/retry/idempotency tests before external onboarding.

**Dependencies/risks:** P2-EMAIL and token lifecycle; do not orphan new accounts or
create duplicate invitations on retries. **Plan:** explicitly P2-EMAIL and UI/provider tasks.

### H4. Visible application actions and invitation URLs have no frontend destination

**Verified route mismatch.** `EventInfo.tsx:172,188` links to
`/events/:id/register` and `/events/:id/studio`. Email constructs
`/accept-invitation?token=...` (`utils/email.ts:77`). None is registered in
`routes/index.tsx:33-178`. The inner app route set has no catch-all not-found page.

**Why it matters:** advertised actions do not render the intended workflow; API
helpers and backend functionality alone cannot complete application or staff
onboarding. Unknown URLs can leave the app shell without useful page content.

**Correction:** implement the gated application/acceptance screens and explicit
not-found handling; until then remove/disable unfinished actions with translated
explanations. Add navigation tests covering every visible destination.

**Dependencies/risks:** P2 security/onboarding gates precede live acceptance or
application UI. **Plan:** P2-UI-SHELL/UI-AUTH/INVITE, P5-APPLICATION and P4 UI work
represent the missing workflows; do not mark those complete from backend CRUD.

### H5. Configured request security controls are not enforced

**Verified configuration/runtime mismatch; no abuse-load test performed.**
`config/env.ts:183-189` exposes CORS/rate-limit settings, but `app.ts:12` hardcodes
`origin: "*"`; mounted auth/invitation/upload routes have no rate limiter.

**Why it matters:** configuration gives no effective restriction, and public
password hashing plus memory uploads lack application throttling. Wildcard CORS
alone is not evidence of an authentication bypass; abuse impact depends on hosting
controls that were not inspected.

**Correction:** apply centralized production configuration, route-appropriate
throttling and security headers; validate behavior with denied origins and bounded
auth/upload requests. **Dependencies/risks:** proxy/trusted-IP policy, operational
limits and safe audit hooks. **Plan:** explicitly P2-BOUNDARIES/AUDIT.

## Medium

### M1. Frontend role guards compare display names using incompatible rules

**Verified contract defect.** `auth/useRole.ts:17-28` compares exact `role.name`
to values such as the documented lowercase `representative`; seed roles use
display names such as `Studio Representative`. `RequireRole.tsx:7-27` separately
uses lowercased display-name substring matching. Neither checks stable keys and
the route guard does not enforce an event context.

**Why it matters:** valid roles can lose UI controls, while similarly named roles
can enter placeholder sections. Backend authorization still controls actual data;
this is not demonstrated backend privilege escalation.

**Correction:** use shared stable role keys and explicit global/event/admin
semantics consistently in hooks, gates, navigation and routes. Test seeded,
renamed, roleless, multi-role and wrong-event profiles.

**Dependencies/risks:** profile permission contract if needed; preserve explicit
admin semantics. **Plan:** explicitly P2-ROLES/UI-SHELL.

### M2. Cancellation leaves no supported same-studio reapplication path

**Verified source-level workflow gap.** `StudioRegistrationsController.ts:58-74`
always creates a new Studio and registration. Cancellation at lines 166-177 deletes
only the registration, leaving the active studio/name. The global active-name
unique index prevents a subsequent create using that name. The strict creation
contract offers no existing-studio ID, and no other registration-create operation
reuses it.

**Why it matters:** a user who cancels can be blocked from applying again under
the same studio name. No end-to-end cancel/reapply test currently establishes a
supported recovery flow; existing cancellation tests only prove cancellation.

**Correction:** define cancellation/resubmission behavior and reuse the authorized
studio identity through a canonical transactional operation. Preserve members and
history; do not work around this by deleting studios or weakening uniqueness.

**Dependencies/risks:** lifecycle/identity policy, ADR-001/003 and name review.
**Plan:** P3-REGISTRATION and P5-APPLICATION cover recovery; P3-STUDIO-IDENTITY/NAMES
govern broader changes. Add this exact case to acceptance criteria.

### M3. Oversized JSON is misreported as an internal server error

**Verified defect.** `app.ts:13` uses Express JSON limits;
`errors/handler.ts:28-29` only recognizes a 400 SyntaxError before falling back to
500. A synthetic 110 KB login JSON body returned `500 INTERNAL_SERVER_ERROR`,
although the parser rejected the payload before controller execution.

**Why it matters:** callers get misleading retry/server-failure feedback and
expected client errors pollute server-error signals.

**Correction:** explicitly map supported parser size/encoding errors into the
global envelope with appropriate 4xx status and stable semantic reasons. Test
malformed, oversized and unsupported-encoding bodies without echoing input.

**Dependencies/risks:** shared error schema/catalogue compatibility. **Plan:**
not explicitly represented before this audit; now recorded as P2-BOUNDARIES-ERRORS
and the Phase 1 global-envelope acceptance exception until corrected.

### M4. Delivered auth/navigation UI has translation and accessibility gaps

**Verified source gaps; full accessibility conformance was not tested.**
`RegisterPage.tsx:78-99,111-120` and `VerifyEmailPage.tsx:65-79,98-110,137-156`
contain English-only workflow text. `layouts/AppLayout.tsx:15-16` hardcodes Home/
Events. `AuthNav.tsx:92-105` labels an initials-only button as a menu trigger and
renders `role="menu"`, but the component only implements outside-mousedown
closing (`lines 11-27`), with no Escape, menu keyboard or focus-restoration logic.
Signup uses click/key handlers instead of a semantic form
(`RegisterPage.tsx:22-48,124-185`).

**Why it matters:** switching locale leaves key flows untranslated, and menu/form
interaction lacks the expected keyboard/focus behavior. Existing semantic feedback
is useful but does not complete process accessibility.

**Correction:** translate delivered text, adopt semantic forms/shared fields,
provide an explicit menu name and either implement complete menu behavior or use
ordinary disclosure/navigation semantics. Verify keyboard and screen-reader flows.

**Dependencies/risks:** P2-UI-FOUNDATION/SHELL/AUTH and locale-preserving state.
**Plan:** explicitly I18N-UI/QA, P2 UI tasks and P9-BROWSER.

### M5. Security and interactive workflow coverage remains incomplete

**Verified coverage limitation, not a claim that existing tests fail.**
`apps/api/tests/routes.test.cjs:1277-1310` covers superseded links/image contracts,
but permits current deferred identity/upload behavior; the audit probes above are
not permanent regressions. `apps/web/package.json:12` and web test sources use
Node/static component/transport checks, with no browser journey runner.
`docs/TESTING.md` correctly discloses these limits.

**Why it matters:** all current checks pass despite C1-C4, dead navigation and
inconsistent role guards. The inventory proves mounting/authentication coverage,
not complete permission, identity, abuse or interactive-state coverage.

**Correction:** add denied regressions with each security fix, then browser tests
for signin/verification, direct navigation, cancellation recovery and staff
acceptance. Include loading, server/network error, empty, success, focus and
session-expiry behavior in all supported locales.

**Dependencies/risks:** real browser/provider fixtures and security contracts;
avoid encoding current vulnerabilities as accepted behavior. **Plan:** P2 security
tasks, P9-BROWSER/UI-REGRESSION and I18N-QA already own this work.

## Low

### L1. Profile advertises an Edit action with no behavior

**Verified defect.** `auth/ProfilePage.tsx:27-33` renders an enabled Edit button
whose handler is only a comment. `AuthNav.tsx:134` labels navigation to the read-only
profile as Edit Profile.

**Why it matters:** the UI promises an unsupported action.
**Correction:** remove the inert action and label the destination truthfully, or
implement the authorized edit contract when scoped. **Dependencies/risks:** do not
invent account-edit/reset semantics to make a placeholder button work.
**Plan:** explicitly P2-UI-SHELL's S04 requirement.

## Migration/data risks and architectural recommendations

These are open gates/recommendations, not newly demonstrated migration failures:

- Run the deployment preflight and authorized provenance review in
  `scripts/audit-scope-integrity.sql`/ADR-008. Fixture parity cannot establish that
  actual null scopes were intentional. P2-SCOPE-DEPLOY remains open.
- The new migration deliberately blocks ambiguous duplicates and holds write
  locks. Stop writers, back up, apply migration before the matching API and retain
  SQL-only indexes during recovery. Old writers are not a compatible rolling
  replacement path. Local upgrade/refusal/preservation tests passed.
- Performance ownership is still derived from participants; database relations
  do not enforce all same-event category/format/age-group or judge/score invariants.
  Reviewed controllers validate current performance selection, but future direct
  writers need P3-PERFORMANCE-OWNER/CONSTRAINTS and P6-SCORING-MODEL.
- Historical entries reference mutable dancer/configuration records. Snapshot/
  versioning, optimistic conflict semantics, calendar-date migration and exact
  scoring policy remain P3-HISTORY/CALENDAR-DATES and competition-model decisions.
  Do not extrapolate the current CRUD contract into completed results integrity.
- Search found a double assertion in `apps/api/src/db/prisma.ts:12` and a DOM
  target assertion in `apps/web/src/auth/AuthNav.tsx:15`; these are outside migrated
  transport contracts. No incorrect runtime type was demonstrated. Prefer typed
  global augmentation and target narrowing when those files are next touched.

## Validation commands and exact results

All commands were run from the repository root unless stated. No application
environment file was printed or changed. Installed dependencies were used; a
frozen reinstall was not performed.

| Command | Result |
| --- | --- |
| `git status --short`; `git status --porcelain=v1 -uall`; `git diff --stat`; `git diff --cached --stat`; relevant diffs; recent `git log` | Completed. Existing dirty work inspected; no staged changes. |
| `pnpm.cmd db:generate` | Exit 0. Prisma Client 7.10.1 generated. |
| `pnpm.cmd db:validate` | Exit 0. Prisma schema valid. |
| `pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma` | Exit 0. All files formatted; check mode did not rewrite the schema. |
| `pnpm.cmd build` | Exit 0. 4/4 tasks successful, 3 cached; web production Vite build executed. |
| `pnpm.cmd typecheck` | Exit 0. 6/6 Turbo tasks successful, 4 cached; API/seed and web typechecks executed. |
| `pnpm.cmd lint` | Exit 0. Web ESLint executed; 1/1 task successful. API/shared packages have no lint task. |
| `pnpm.cmd test` | Exit 0. I18N source guard passed; 6/6 Turbo tasks successful, 5 cached. API cached result: 73 passed, 0 failed/skipped; frontend fresh result: 8 passed, 0 failed/skipped. |
| `pnpm.cmd --filter api test` | Exit 0, fresh direct execution: 73 tests passed, 0 failed/cancelled/skipped/todo. Includes route, scope, contracts, upload, supersession and configuration tests. |
| `pnpm.cmd test:baseline` | Exit 0. Isolated fresh deploy/redeploy, seed idempotency, production-seed refusal, HTTP/database resource workflows, scope uniqueness/replacement/concurrency, preservation and auth/profile smoke checks passed. |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1` | Exit 0. Fresh history, existing-data upgrade, status/default preservation, partial uniqueness and schema parity passed. |
| `node scripts/check-docs.cjs` | Exit 0 before audit docs: 81 Markdown files, 399 local links. Final audit-doc check: exit 0, 82 Markdown files, 402 local links; UTF-8, anchors, fences and whitespace passed. |
| `git -c core.safecrlf=false diff --check` | Exit 0 before and after audit documentation. |
| Synthetic security probes, executed via PowerShell here-string into `node` in `apps/api` | Exit 0. Existing inactive-account invitation: 201/session issued. Inactive/event-scoped-admin event read: 200. Admin-only global event creation with event-scoped admin: 201 for both active and inactive account fixtures. Foreign event HTML upload: 200. Unauthenticated HTML retrieval: 200/text/html. Roleless foreign event image mutation: 200. Oversized JSON: 500/INTERNAL_SERVER_ERROR. |

Expected diagnostic logs appeared for intentionally failing storage/error cases;
test assertions still passed. Initial unprivileged Docker inspection failed with
Docker config/engine access denied (environment permissions). The isolated database
suites then ran successfully with approved elevated execution. No database result
is inferred from that initial failed inspection.

## Not verified

- No intended deployment database, real null-scope provenance, production backup/
  restore, production data migration, deployment topology or proxy controls were audited.
- No real email delivery, object storage, private media access or operational
  provider configuration was verified; these providers are unfinished.
- No interactive browser/mobile/screen-reader/fluent-language review or screenshots
  were produced. Static source findings do not establish full WCAG conformance or
  demonstrate a browser exploit.
- No hosted GitHub Actions run or required-check settings were inspected. Local
  successful commands do not prove hosted publication or branch protection.
- No dependency vulnerability service scan was run; no claim about advisory status
  or production supply-chain safety is made.
- Race risks called out from source were not all independently stress-tested.
  Existing PostgreSQL concurrency suites passed their defined cases.

## Correction order and next task

Planning follow-up (2026-10-25): [correction map](AUDIT_FOLLOWUP.md) assigns all 15
findings to owning tasks, dependencies, release gates and acceptance evidence.
M1 explicitly includes invitation identity, scoped-admin and image authorization/
content correction slices. All findings remain unresolved; this follow-up changed
documentation only. Original audit observations/results remain historical
evidence, not proof of a fix.

1. Keep external exposure blocked by M1 gates. Add negative regressions and close
   invitation identity, inactive-account access and upload authorization/content
   publication defects (C1-C4), respecting foundation prerequisites.
2. Finish email/token/role/scope/security foundations, including H1-H3/H5, safe
   delivery acknowledgement and durable audit/privacy policy.
3. Complete P2-SCOPE-DEPLOY against the actual target before migration/deployment;
   treat this as an operational prerequisite, not a code-test failure.
4. Unify UI guards/navigation, then implement gated onboarding/application journeys,
   cancellation recovery and browser/accessibility/localization checks.
5. Correct parser status mapping and inert UI. Complete model/history/constraint
   gates before entry/music/scoring work; preserve existing tested behavior.

**Next concrete development task remains P2-IDENTITY-TOKENS:** decide the canonical
email/collision and existing-link transition policy; run a non-merging identity
audit; implement purpose-bound token digests, expiry and atomic consume/rotation
with preservation and replay/concurrency tests. Couple subsequent AUTH/INVITE fixes
to the critical negative cases above. The UI foundation fixture track can continue
independently; gated workflows must not ship ahead of backend security.

No implementation fixes were made, no phase was closed, and no commit/push or
branch/history change was performed.
