# Invitation identity validation

Date: 2026-11-01. Task: P2-INVITE-IDENTITY, C1/C2. Base revision: 76912d0;
evidence applies to this uncommitted working-tree change. No external milestone
or deployed-data review is completed by these local results.

## Delivered behavior

The mounted acceptance endpoint validates any supplied bearer session using the
normal current-account eligibility/revision middleware. Existing recipients must
be that authenticated identity, including when the caller is an admin or supplies
an arbitrary setup password. The serializable transaction locks and rechecks the
recipient ID, invitation email, active/verified state and session revision before
access writes. It never changes existing credentials, name, locale, verification
or session revision and never issues a replacement JWT. Passwordless existing
accounts follow the same rule. Unrelated sessions cannot set up a new recipient.

New recipients supply a trimmed name and valid registration password (including
the 72-byte UTF-8 bcrypt limit). Their verified setup and current-revision JWT
remain supported. Strict shared schemas distinguish new-account session responses
with accountCreated=true from tokenless existing-account responses with
accountCreated=false. The web helper retains the existing session on acceptance.
The exact request, response and error contract is in [invitations](api/invitations.md).

Existing staff scope policy is retained: bound event judge/moderator invitations,
matching role reference, no global/admin/unclassified acceptance, and no automatic
restoration of removed assignments. Access grant, consumption and USER-attributed
audit records commit together. Judge reconciliation remains P2-JUDGE-ACCEPT.

## Regression and persisted-state evidence

- The maintained HTTP regression was run against the original HEAD controller
  and invitation schema, temporarily transpiled into generated build outputs.
  It failed with **201 instead of 401** for unauthenticated existing-account
  acceptance. Generated outputs were restored in a finally block, and the same
  regression passed with the fix. Source files were not reverted or overwritten.
- HTTP tests cover wrong account/admin, absent/malformed/stale session, inactive
  and unverified identities, transactional eligibility changes, password-bearing
  and token-only requests, hashed/passwordless credential preservation, audit
  actor identity, missing setup data, bcrypt byte limits and unrelated sessions
  attempting new-account setup.
- The complete baseline creates a random dance_baseline_* database using only
  the checked-in Compose fixture. It checks full account/invitation/assignment
  snapshots and audit counts around denied requests, preserving unrelated event
  access. No application environment or application rows are used.
- Real PostgreSQL trigger failures at invitation consumption and audit insertion
  prove no partial access, consumption or success audit survives. Concurrent
  existing-account and new-account acceptances each have one successful winner;
  replay is rejected. Existing-account success returns no token/tokenType,
  preserves the entire user record and writes exactly one scoped assignment and
  each expected USER audit. New-account JWT works against the profile endpoint.

## Commands and results

All completed successfully unless explicitly described as the expected original
regression failure above:

| Command | Result |
| --- | --- |
| `docker compose -f docker/docker-compose.yml up -d postgres` | Fixture service running |
| `pnpm.cmd build` | All four workspace builds pass; unchanged types cache reused |
| `pnpm.cmd typecheck` | Workspace, seed and browser TypeScript pass |
| `pnpm.cmd lint` | Web ESLint passes (current repository lint scope) |
| `pnpm.cmd test` | Localization guard, 93 API and 9 frontend tests pass; unchanged builds cached |
| `pnpm.cmd --filter api test` | Fresh final API run: 93/93 pass |
| `pnpm.cmd db:generate` | Prisma Client generated |
| `pnpm.cmd db:validate` | Prisma schema valid |
| `pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma` | Formatting passes |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1` | Fresh/upgrade migrations, preservation, uniqueness and schema parity pass |
| `pnpm.cmd test:baseline` | Complete isolated PostgreSQL/HTTP baseline passes, including new identity/audit fixtures |
| `node --check scripts/check-docs.cjs` and `node scripts/check-docs.cjs` | Documentation syntax/links pass |
| `git diff --check` | Whitespace passes |

Prisma nonconnection checks used an explicit unused local placeholder URL. No
schema migration, legacy transition, database reset, new dependency or architecture
decision was needed; ADR-012/013 already define the policy. Fixture runners remove
their own databases/schemas; development application data remains untouched.

## Remaining work

No implementation blocker remains for this technical security slice. Invitation
resend/revoke/management and acceptance UI, Judge reconciliation, real staging
delivery, safe session/return handling and full browser/language/accessibility
journeys remain with their existing owners. This change has no acceptance screen;
the existing synthetic foundation browser fixtures do not prove that future flow.
No hosted rollout, real inbox delivery or scope-provenance review was performed.

Next task: P2-ROLES-ADMIN-SCOPE, completing backend assignment/scope inventory and
negative authorization evidence under ADR-013. P2-SCOPE-DEPLOY remains an external
operational gate; P2-BOUNDARIES-UPLOADS follows with its own prerequisites met.
