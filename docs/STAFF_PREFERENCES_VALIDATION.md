# Staff acceptance, offboarding and account preference validation

Recorded: 2026-11-06. Scope: P2-JUDGE-ACCEPT, P2-OFFBOARD, I18N-PREFERENCES.
Local working-tree evidence; no commit, deployment, application-data reset or
external milestone completion. The initial working tree was clean.

## Delivered behavior and decisions

[ADR-018](adr/018-staff-acceptance-and-offboarding.md) defines atomic Judge/access/
consumption and retained event offboarding. Missing Judge records use the account
name; existing Judge IDs/profile/scores remain unchanged. Existing active role and
Judge combinations reconcile without duplicate records. Removed assignments cannot
be restored by acceptance. Moderator acceptance does not create Judge records.

Global-admin POST /events/:eventId/staff/:assignmentId/remove with strict {} body
marks only the stored event judge/moderator assignment removed. ACCESS_REMOVED
commits atomically. Retry is harmless; concurrent serialization conflicts return
409 for retry. No Judge, Score, user, accepted invitation or other assignment is
deleted. Current profile/permission resolution immediately excludes removed roles.
Pending invitation revocation is independent. Staff screens/restoration remain
P4-STAFF; Judge CRUD is not an assignment or removal mechanism.

ADR-013 account language precedence is implemented without new persistence:
explicit choice during the mounted app session, account preference, browser saved
choice/languages, et. POST /auth/preferences validates self-only nullable et/en/ru
and returns the saved value. Profile has translated save/clear, pending, failure/
retry and acknowledged success states. Account reads do not write browser storage;
selector clicks do. Logout restores browser fallback unless an explicit session
choice exists. Other tabs/devices see saved account values on their next profile
load, preserving mounted work. Arbitrary URL locale values are ignored. Mail
resolution remains deterministic; existing invitations retain frozen recipient
language and administrators never impose their UI language on recipients.

No schema migration or dependency change was needed. Existing SQL constraints and
audit allowlists already support these actions. Rollback is transactional; no
legacy rows are inferred/repaired and no applied history is changed.

## Maintained evidence

- routes.test.cjs verifies new-account Judge reconciliation, supported staff
  removal/idempotence/scope and strict eligible-caller preference writes. The
  existing new-account acceptance test was run against the original HEAD handler
  in compiled output only: it fails because Judge is undefined. Output was restored
  in finally; the current handler passes. No source/Git changes were discarded.
- check-staff-access.cjs runs real serializable transactions in the baseline's
  random migrated database. All existing Judge/role combinations, concurrent
  acceptance, ACCESS_RECONCILED/INVITATION_ACCEPTED failure rollback, same/other-event
  denial, ACCESS_REMOVED rollback, concurrent/idempotent removal, retained real
  Score/Judge history, moderator/other-event access and denied restoration pass.
- Existing invitation fixtures prove new-account one-winner creation, intended
  existing-account proof, stale/inactive/wrong identity, replay, rollback and
  credential/access preservation. The expected Judge count now requires one.
- The global-admin inventory/matrix covers 21 operations, including offboarding,
  denying scoped/removed/global-staff identities with unchanged domain/audit state.
- check-account-preferences.cjs proves strict validation, no target selectors,
  no authentication/inactive denial, concurrent recipient isolation, full account
  field preservation, profile persistence and explicit clear.
- account-preferences.spec.ts adds 16 Chromium cases: ET/EN/RU at
  320/390/768/1440px, keyboard save, language precedence, clear, request failure/
  retry/input preservation, pending disabled/success state, login/logout and a fresh
  tab's persisted preference. A native select's intrinsic width caused 320px
  overflow; min-width/width constraints fix it. A 320px RU screenshot was inspected.
  The first full run caught an accidentally expanded event fixture; it was corrected
  to the event contract. Final browser result is recorded below.

## Commands and results

- pnpm.cmd build: pass across four packages.
- pnpm.cmd typecheck: pass, including API seed and strict browser/test TypeScript.
- pnpm.cmd lint: pass; the initially reported hook dependency warning is fixed.
- pnpm.cmd test: 112 API and 16 web tests pass, including localization guard.
- pnpm.cmd db:generate / db:validate: pass.
- pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma: pass.
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1:
  pass, fresh/upgrade preservation and exact schema parity.
- pnpm.cmd test:baseline: pass, full isolated migrated PostgreSQL baseline,
  seed idempotency, existing workflows and the two new fixture scripts.
  Docker Desktop was started for these checks. The first baseline attempt failed
  on a test-only workspace module resolution error, corrected to the API's
  createRequire convention; the rerun passes and cleans up its own test database.
- pnpm.cmd test:browser: pass, all 83 Chromium cases in the final full run.
- node --check scripts/check-staff-access.cjs and
  node --check scripts/check-account-preferences.cjs: pass.
- node --check scripts/check-docs.cjs / node scripts/check-docs.cjs and
  git diff --check: pass; final diff reviewed.

Turbo reuses unchanged packages where reported; changed tasks execute. All data
and screenshots are synthetic; screenshot/trace output remains ignored. No real
mail, hosted ingress, screen-reader or fluent-language review is claimed.

## Remaining gates and next action

P2-SCOPE-DEPLOY and P2-EMAIL real staging delivery remain open without intended
hosted database/domain/provider infrastructure. Hosted CI/rollout/restore and human
ET/EN/RU/assistive review retain their release gates. No phase/milestone is closed.
Next local task: P4-STAFF, event invitation/assignment administration with separate
pending revoke and accepted-access removal controls, under its own extension gates.
