# Email identity validation

Date: 2026-10-25. Task: P2-IDENTITY-TOKENS-EMAIL, under the still-open
P2-IDENTITY-TOKENS parent. Evidence is from the working tree, not a committed or
deployed revision. Decision and rollout/rollback limits: [ADR-009](adr/009-email-identity.md).

Shared EmailSchema trims U+0020 spaces and lowercases ASCII input before email
validation. ASCII validation precedes lowercasing so Unicode characters such as
the Kelvin sign cannot become accepted ASCII identities. Dots/plus tags remain
distinct. Registration/login/invitation handlers already parse these schemas;
no duplicate normalization in controllers or transport interfaces is needed.

Migration 20261025010000_email_identity locks writers, refuses canonical account
and outstanding-invitation collisions, updates email only and installs SQL-only
canonical checks. Existing unique indexes enforce canonical uniqueness. Expired
outstanding invitations require collision review; used/superseded history remains.
The aggregate-only preflight is scripts/audit-email-identity.sql. No automatic
merge, ownership change, deletion or reactivation is performed.

Validation commands completed:

- `pnpm.cmd build` and `pnpm.cmd typecheck`: passed across all workspaces.
- `pnpm.cmd lint`: passed (web; unchanged cached result).
- `pnpm.cmd test`: passed localization guard, 74 API tests and 8 frontend tests.
  Changed schema/API/web tasks ran fresh; unchanged dependency tasks used Turbo cache.
- `pnpm.cmd db:generate`, `pnpm.cmd db:validate` and
  `pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma`:
  passed with an explicit nonconnecting placeholder DATABASE_URL.
- `node --check scripts/check-email-upgrade.cjs`, `scripts/check-auth.cjs`,
  `scripts/check-invitations.cjs`: passed.
- `node --check scripts/check-docs.cjs`, `node scripts/check-docs.cjs` and
  `git diff --check`: passed; final changed files reviewed.
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1`:
  passed fresh/upgrade migrations, preservation, uniqueness and schema parity,
  including exact SQL-only canonical check constraints.
- `pnpm.cmd test:baseline`: passed isolated PostgreSQL migrations/redeployment,
  seed idempotency/refusal and all existing HTTP/database workflows. New fixtures
  prove full-record preservation except canonical email; atomic refusal and no
  installed checks after account/global/event collision failures; direct-write
  canonical checks; duplicate identity rejection; login with case/spaces; duplicate
  registration preserving the original account; invitation normalization/conflict.

Docker initially failed under the sandbox; approved execution succeeded. Fixtures
used random baseline databases and upgrade schemas with existing cleanup paths.
No application database reset/reseed, historical migration rewrite or deployment
audit was performed. Existing concurrent documentation edits were preserved.

Next: P2-IDENTITY-TOKENS-LIFECYCLE. Plaintext tokens, stub logging/delivery and
existing-account invitation authorization remain known open security work.
No parent task, finding, phase or external milestone is closed by this slice.
