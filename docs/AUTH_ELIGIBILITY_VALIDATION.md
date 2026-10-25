# Account eligibility validation

Date: 2026-10-25. Task: P2-AUTH-ELIGIBILITY / C2, a security slice of the still-open
P2-AUTH parent. Source base: e1ba9db plus the working tree; no commit or deployment
is implied. Policy is recorded in [ADR-006](adr/006-account-eligibility-and-staff-onboarding.md).

## Behavior and decisions

Login verifies credentials before reporting account eligibility. Wrong credentials
or a missing/passwordless user return 401 invalidCredentials. Correct credentials
for a disabled account return 403 accountDisabled; an unverified account returns
403 emailVerificationRequired. The new shared semantic reason has ET/EN/RU feedback.
No failed login writes user state or issues a session.

Every protected request resolves an existing active, verified account before role
loading or administrative bypass. A valid JWT for an ineligible subject returns
401 authenticationRequired, allowing existing clients to clear stale sessions.
This includes previously issued tokens after account removal, disabling or
unverifying. Verified roleless accounts still authenticate; resource permission,
event scope, ownership and membership gates are independent. Public verification
remains available to eligible pending users and grants no roles.

DEV_AUTH now skips bearer entry only in development. DEV_AUTH_EMAIL is canonical
and defaults to the explicit seed's admin@test.com. A real eligible user supplies
the actor ID and database roles; there is no synthetic dev-admin identity or
hard-coded permission set. Missing/disabled/unverified seed identity fails closed.
Startup rejects DEV_AUTH=true in test or production. No seed record, role,
credential, verification flag or active flag is provisioned/repaired automatically.

No database schema/migration or transport DTO shape changed. Shared schemas add
one error reason; existing API helpers already decode the shared error envelope.
The profile contract now fails missing/ineligible sessions at 401 rather than
letting a missing user reach the profile controller's 404. Public signup eligibility
and recovery handlers retain their existing roadmap gates.

## Regression evidence

The new missing/inactive/unverified middleware regression was observed failing
before the fix (missing subject received 200), then passing after it. It covers
every protected operation in api-coverage.json and verifies no role lookup or
protected write for an ineligible account. Auth route tests additionally cover
unverified login, inactive verification without consumption, missing/inactive/
unverified profile denial, and permitted profile/session behavior.

Development-auth subprocess tests cover configured email canonicalization,
missing/ineligible accounts, verified roleless users, event-scoped moderator
permissions and real global admin roles, plus startup rejection outside development.
Unit fixtures keep account-eligibility lookup separate from target-resource user
lookups; real database cases independently exercise the actual Prisma predicate.

The initial PostgreSQL baseline run stopped at an outdated registration fixture:
a signed token for a nonexistent user formerly reached a foreign-key conflict,
but now correctly stops at 401. The fixture now asserts early denial and uses
a real database trigger under a valid account to retain nested-write rollback
coverage. No production behavior was weakened to satisfy the old expectation.

## Commands and status

- `pnpm.cmd --filter @dance/schemas build`, `pnpm.cmd --filter api build`,
  `pnpm.cmd --filter api test`: passed after the initial implementation (79 API tests).
- `pnpm.cmd build`, `pnpm.cmd typecheck`, `pnpm.cmd lint`, `pnpm.cmd test`: passed
  across workspaces, including localization guard, 79 API tests and eight frontend
  tests. Changed schema/API/web tasks ran fresh; unchanged type outputs used cache.
- `node --test --test-name-pattern='auth verification|auth profile|coverage inventory' apps/api/tests/routes.test.cjs apps/api/tests/coverage.test.cjs`:
  passed four selected tests after expanding route denial cases and updating the
  coverage inventory's stale Phase 2 exceptions.
- `pnpm.cmd db:generate`, `pnpm.cmd db:validate` and Prisma format check: passed
  with a nonconnecting placeholder DATABASE_URL. No application .env file was edited.
- `node --check scripts/check-auth-eligibility.cjs`, `scripts/check-dev-auth.cjs`
  and `scripts/check-studio-registrations.cjs`: passed.
- `pnpm.cmd test:baseline`: first run failed at the outdated fixture above;
  rerun passed all prior migration/upgrade/seed/domain/identity tests plus the new
  eligibility and persisted-development-actor cases. Stale admin tokens fail on
  reads, writes and uploads; rejected operations preserve account, credential,
  role, token and resource records. Verified roleless pending users can verify
  publicly and use their permitted resources without gaining roles.
- `node --check scripts/check-docs.cjs`, `node scripts/check-docs.cjs` and
  `git diff --check`: passed; final diff reviewed.

The runner uses only its random disposable database. The development API fixture
starts a second process against that database, verifies a persisted seed actor
foreign key, temporarily changes eligibility flags and restores complete seed
state before cleanup. It never prints tokens, credentials or application rows.
No application database reset, migration or deployment is performed by this slice.

## Remaining work

P2-AUTH remains open for P2-AUTH-RECOVERY: public resend, mistyped-email correction,
password reset, safe acknowledgements, failure/retry behavior and their negative
and concurrency tests. P2-EMAIL still owns real delivery; P2-SESSION owns JWT
invalidation after password recovery, storage and safe return handling. C1's
intended-account invitation authentication and H1's scoped-admin semantics remain
open. C2 is technically corrected locally; no browser/human language review,
hosted CI or external milestone is claimed. Next recorded task: P2-AUTH-RECOVERY.
