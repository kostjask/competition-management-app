# Identity token lifecycle validation

Date: 2026-10-25. Task: P2-IDENTITY-TOKENS-LIFECYCLE / H2, completing the technical
P2-IDENTITY-TOKENS parent after the email slice. Evidence refers to the working
tree, not a committed or deployed revision. Decision: [ADR-010](adr/010-identity-token-lifecycle.md).

## Delivered behavior

Verification and recovery use AccountToken records bound to an immutable account
and issuance email, with purpose-prefixed SHA-256 digests, 24-hour/one-hour expiry,
consumedAt/revokedAt history and one outstanding token per purpose. Internal
rotation locks the account, revokes earlier tokens and creates one replacement.
Consumption claims a live token in the same serializable transaction as account
verification/password change. Inactive, changed-email and wrong-eligibility users
cannot consume links. Recovery changes only the password of an active verified
account, revokes other outstanding account tokens and issues no session or access.

Invitations store purpose-bound digests, retaining expiry/used/superseded history
and adding revocation state. Acceptance conditionally matches digest, expiry and
pending state in its access transaction. Internal rotation invalidates old links;
revocation supersedes the row to release its outstanding slot. Inactive invitees
are rejected without activation, token consumption or credential/access changes.

New migration 20261025020000_identity_tokens removes plaintext columns and
invalidates legacy links. Accounts, credentials, IDs, ownership, assignments and
invitation recipient/scope/history remain intact. No plaintext fallback/backfill
or migration-history rewrite is used. Only outstanding legacy invitations gain
revoked/superseded timestamps. The application database was not reset or migrated;
all runtime database validation used disposable isolated fixtures.

The development email fake is silent and production delivery throws unavailable.
No raw link secret is returned by normal DTOs or stored/logged by these flows.
The email logging regression was observed failing against the previous stub and
passing after the fix. It uses synthetic delivery arguments only.

## Commands and results

- `pnpm.cmd db:generate`, `pnpm.cmd db:validate` and
  `pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma`:
  passed with an explicit nonconnecting placeholder DATABASE_URL. Prisma format
  was applied to the modified schema first.
- `pnpm.cmd typecheck`, `pnpm.cmd lint`, `pnpm.cmd build`, `pnpm.cmd test`:
  passed. API work ran fresh; unchanged workspace tasks used Turbo cache.
  Localization guard passed; 76 API tests and 8 frontend tests passed (frontend cached).
- Final focused `pnpm.cmd --filter api build`, `pnpm.cmd --filter api typecheck`
  and `pnpm.cmd --filter api test`: passed after the final controller cleanup.
  After making eligibility feedback generic, rebuilt API and ran
  `node --test --test-name-pattern='auth verification' apps/api/tests/routes.test.cjs`:
  passed (one selected verification test).
- `node --check scripts/check-identity-tokens.cjs` and
  `node --check scripts/check-token-upgrade.cjs`: passed.
- `node --check scripts/check-docs.cjs`, `node scripts/check-docs.cjs` and
  `git diff --check`: passed. Final source/migration/documentation diff reviewed.
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1`:
  passed fresh/upgrade migrations and parity, including SQL-only canonical email
  checks and the outstanding-account-token index.
- `pnpm.cmd test:baseline`: passed, then passed again after extending negative
  cases. Real PostgreSQL fixtures verify registration's nested token creation,
  wrong-purpose/expired/revoked/replayed tokens, issuance email binding, inactive
  verification/invitation/recovery, concurrent verification/recovery, concurrent
  rotation and direct outstanding-token uniqueness. Verification and recovery
  database triggers prove rollback after claim preserves tokens and accounts.
  Invitation tests prove secret rotation, revoke, expiry, concurrency and access
  rollback. Upgrade fixtures prove plaintext removal and legacy invalidation
  while preserving accounts, assignments and invitation history. All existing
  seed/redeployment and domain HTTP/database workflows also passed.

## Remaining gates and next work

Public recovery/resend/email-correction endpoints and their generic response,
rate-limit and UI contracts remain P2-AUTH. Internal issuance results must go only
to a delivery adapter, never an HTTP response. Public invitation management remains
P2-INVITE and must authorize IDs before calling the internal helpers.

H2 is technically corrected locally. C1 remains open for active existing invitees:
intended-account authentication is still absent. C2 remains open at protected
request boundaries; login still accepts unverified accounts. H3 is contained by
production failure, not closed: delivery may fail after account/invitation writes,
and safe retries, real providers/templates and staging evidence remain P2-EMAIL.
Existing JWT invalidation after recovery remains P2-SESSION. No external milestone,
human/browser review, hosted CI run or deployment audit is claimed.

Next recorded task: P2-SCHEMA-AUDIT. Review the current schema and pending
migrations, including these SQL-only indexes, before further broad model redesign.
