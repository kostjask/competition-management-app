# P2-SCOPE-INTEGRITY validation

> Historical evidence. Read only to investigate a past change. Current priority/status:
> [DEVELOPMENT_PLAN](../DEVELOPMENT_PLAN.md); runnable checks: [TESTING](TESTING.md).


Validated 2026-10-25 against the repository PostgreSQL 16 Compose fixture.
Policy and rollout: [ADR-008](adr/008-event-scope-integrity.md).

Implemented files: Prisma schema and new 20261025000000_scope_integrity migration;
InvitationsController and route regression tests; read-only audit-scope-integrity.sql;
check-scope-integrity.cjs and check-scope-upgrade.cjs wired into test-baseline.cjs;
test-migrations.ps1 parity/transaction handling; API, database review, testing,
migration-validation documentation and DEVELOPMENT_PLAN.md.

Checks completed successfully:

- pnpm.cmd db:generate and pnpm.cmd db:validate.
- pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma.
- pnpm.cmd build, pnpm.cmd typecheck, pnpm.cmd lint (web scope).
- pnpm.cmd test: 73 API tests, 8 frontend tests and localization source guard.
  Regression coverage rejects superseded links at inspect/accept before account
  handling, including links with future expiry.
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1:
  fresh/existing-data upgrades, Prisma column/FK parity and exact SQL-only scope
  index definitions. Random schemas and temporary DDL were cleaned up.
- pnpm.cmd test:baseline: complete existing HTTP/database suite, isolated migration
  deployment/redeployment, seed preservation, plus full-field role/invitation
  upgrade preservation, duplicate migration refusal/atomic rollback, simultaneous
  global/event role and invitation writes, deletion blocked by roles/invitations
  and retained history, and simultaneous expired-invitation replacement preserving
  the old records. Random databases/schemas were cleaned up.
- Targeted isolated upgrade rerun: the read-only aggregate preflight reports
  expected duplicate counts before migration and works unchanged after migration.
- git diff --check and final diff review.

The first baseline attempt passed upgrade checks but timed out waiting for API
health while workspace checks ran concurrently. A standalone rerun passed in
full; a separate temporary read-only API health diagnostic also returned 200.
The readiness timeout was not reproduced; no unrelated timeout policy changed.

No application database, deployed user records or existing environment files were
modified. Local fixtures cannot establish the intended provenance of real global
access. P2-SCOPE-DEPLOY remains open: authorized deployment audit, duplicate repair
review, backup and coordinated rollout are mandatory before deployment/M1. Email
normalization, digest-only token lifecycle, staff scope/eligibility and safe
existing-account acceptance remain separate unchecked Phase 2 tasks. Next concrete
task: P2-IDENTITY-TOKENS. No external onboarding milestone is complete.
