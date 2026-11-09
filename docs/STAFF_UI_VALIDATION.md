# Event staff administration validation

Recorded: 2026-11-06. Local working tree, no deployment or external milestone.
Scope: P4-STAFF-READ, P4-STAFF-UI and P9-BROWSER-STAFF, the three bounded
execution tasks recorded under P4-STAFF before implementation. Existing uncommitted
P2-JUDGE-ACCEPT/OFFBOARD/I18N-PREFERENCES work was preserved. Later registration
runtime work remains behind M1; these staff extensions use their documented gates.

## Behavior and implementation

GET /events/:eventId/staff is global-admin-only and uses shared strict Zod DTOs.
A repeatable-read transaction scopes event, bound judge/moderator invitations and
all active/removed staff assignments to one event. It emits only event identity,
minimal user identity/contact, supported role, UTC removal time and derived access
status. Removed access wins, then inactive/unverified account, missing same-event
Judge, active access. No credentials, digests, account flags, session revisions,
score values, global staff or studio memberships are exposed. Unsupported historical
invitations remain stored and are excluded rather than repaired. The common
invitation serializer preserves canonical list/overview output.

/admin/events/:eventId/staff fixes the event for invite creation and exposes
resend/revoke separately from accepted-access removal. It links from event details
and existing global invitation management. Removed assignments and terminal invite
history remain visible; accepted invitation without assignment asks for admin
review, and active access never claims scoring readiness. Restoration is unavailable.
The safe return allowlist and translated route title include this actual route.

Native revoke/remove confirmation names event and recipient/person/role, focuses
Cancel, wraps Tab in both directions, supports Escape before mutation, keeps pending
operations modal and restores trigger or refresh focus. Failed mutation focuses the
error summary after closing. Local email/role/recipient-language values survive
locale changes, errors and session recovery. A synchronous pending guard prevents
repeated mutation dispatch. Stale/uncertain state blocks writes until explicit
readback; lost responses never automatically repeat create/remove. Acknowledged
success remains visible if subsequent readback fails. Initial failed reads never
look like empty success. Read revision guards reject stale initial/refresh responses.

No schema migration or new dependency was required. Existing serializable
acceptance/offboarding transactions, audit allowlists, retained Judge/Score IDs and
scope constraints remain unchanged. [ADR-018](adr/018-staff-acceptance-and-offboarding.md)
and [contracts](api/invitations.md#event-staff-overview) record these boundaries.

## Maintained checks

- routes.test.cjs checks guest/event-staff/missing-event denial, path scoping,
  relation/select restrictions, all access statuses and secret-free serialization.
  Existing inventory protection/eligibility checks include the new operation.
- The isolated baseline extends check-staff-access.cjs with actual PostgreSQL
  read DTO allowlists, wrong-event exclusion, accepted/removed history,
  unavailable-account/missing-Judge states and no repair. Existing acceptance,
  concurrent/idempotent removal and real Score preservation/rollback checks pass.
  The complete global-admin matrix now covers 22 operations, including this read.
- staff.spec.ts adds 25 S17/F06 Chromium cases: ET/EN/RU at four widths, mobile
  lists/desktop table, focus and safe cancellation, native modal Tab/Escape/restore,
  locale/input preservation, three-locale invite/resend/revoke/intended acceptance
  in another tab and removal, uncertain removal, stale invitation CAS/reload,
  retained receipt after failed readback, pending disabled controls, failed initial
  load, missing accepted assignment, session recovery and guest/scoped-admin/
  roleless/missing direct URLs. Existing suites retain all auth/shell regressions.
- Initial browser cases caught keyboard focus leaving the confirmation controls;
  explicit Tab wrapping fixes the regression. A field-allowlist assertion initially
  compared a sorted value to an unsorted expected list; corrected assertion passes.
  The test translation helper uses a typed non-parameter key subset. No authorization
  or localization baseline was relaxed to pass tests.

## Commands and results

- pnpm.cmd build: pass across all four packages.
- pnpm.cmd typecheck: pass, including API seed and browser/test strict TypeScript.
- pnpm.cmd lint: pass after replacing a cascading initial-effect setter with
  cancellable asynchronous load callbacks. No suppression was added.
- pnpm.cmd test: 113 API and 16 web tests pass, including localization guard.
- pnpm.cmd db:generate / db:validate: pass.
- pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma: pass.
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1:
  pass, fresh/upgrade/default/status/index preservation and exact parity.
- pnpm.cmd test:baseline: pass; complete isolated PostgreSQL fixture and cleanup.
  Sandbox Docker access was unavailable; the authorized elevated runner uses only
  its random test database and the checked-in disposable Compose fixture.
- pnpm.cmd test:browser: pass, all 108 Chromium cases in the final full run.
- node --check scripts/check-staff-access.cjs / scripts/check-docs.cjs,
  node scripts/check-docs.cjs and git diff --check: pass; final diff reviewed.

Turbo reuses unchanged tasks where reported; changed tasks execute. Test data and
screenshots are synthetic and generated artifacts remain ignored. RU 320px and EN 1440px staff screenshots were visually reviewed; content reflows,
controls remain readable and no horizontal page overflow occurs. No real mail,
hosted rollout, screen-reader or fluent-language review is claimed. No application
database was reset/migrated and no commit/branch/history change was made.

## Remaining gates and next task

The three execution tasks and P4-STAFF are local technical scope. P4-UI-EXTENSIONS
still retains category/entry configuration, while P9-BROWSER/QA retain later
journeys and human release evidence. M1 scope provenance, real P2-EMAIL inbox,
hosted ingress/deployment/restore/CI and human ET/EN/RU/assistive review stay open.
No M1/M4 or whole phase is closed by mocked browser or isolated database checks.
Next actionable local task: I18N-CONTENT policy, before organizer-authored content
models/editors. P3 registration runtime remains gated by M1 and its model decisions.
