# Administrator scope validation

Date: 2026-11-01. Task: P2-ROLES-ADMIN-SCOPE (H1 backend technical slice).
Base revision: 76912d0 plus the preserved, uncommitted P2-INVITE-IDENTITY changes.
This report describes the current working tree; no commit or deployment was made.

## Policy and implementation review

ADR-013 already corrected the request-time bypass: only a nonremoved null-event
assignment with exact role key admin grants it. Scoped admins grant no permissions,
including within their assigned event. Removed assignments and global judge/
moderator records are ignored. No further bypass defect was found in the mounted
controller inventory. [Role architecture](../ROLE_ARCHITECTURE.md) now records all
assignment writers, supported scope and inherited custom/representative behavior.

This slice corrects a remaining writer mismatch: the development seed now creates
the judge assignment only after creating its event and binds it to that event.
Existing assignments, credentials, removal state and provenance are preserved;
no historical global judge is reassigned, restored or deleted. Invitation creation
also calls the existing staff-policy guard before mutation, sharing the same
supported event-staff rules as inspection/acceptance. Shared creation contracts
already reject admin/global/unknown/studio roles; no transport shape changed here.

No schema migration, new database constraint, reset, repair or new dependency is
needed. Database history remains permissive enough to retain unclassified legacy
assignments. The read-only aggregate preflight adds counts of active scoped admins,
active global staff and removed admins. It emits no account IDs, email or tokens.
The JSON removedAt lookup retains preflight compatibility with older schemas.

## Privileged operation inventory

All 18 global-admin-only operations have globalAdmin evidence in
[api-coverage.json](api-coverage.json):

| Resource | Operations |
| --- | --- |
| Events | POST collection, PATCH event |
| Invitations | GET collection, POST collection |
| Approvals | PATCH studio approval, PATCH event studio registration |
| Judges, categories, formats, age groups | POST collection, PATCH item, DELETE item for each resource |

Other authenticated resources retain their own ownership/permission/stage rules.
Image authorization remains P2-BOUNDARIES-UPLOADS and is not claimed fixed here.
Profile roles are active stored assignments, including historical unsupported
scopes; they are not an effective authorization grant. Frontend guard consolidation
remains P2-ROLES/UI-SHELL.

## Maintained evidence

HTTP unit tests run every inventory operation for own/other event URLs against
roleless, scoped admin, removed global admin, global judge/moderator, similarly
named custom role and mixed assignments. They verify 403 responses and stable-key
resolution, preserve supported event permission reads and exclude global staff.

The isolated PostgreSQL baseline repeats the inventory with real assignments and
compares complete user/access/invitation/event/studio/registration/judge/config/
audit records around each denied matrix. Active global admin can create and
update across events; removing its assignment denies the same JWT immediately.
Unsupported invitation bodies and historical links cannot grant access, mutate
credentials, consume/rotate links or add success audit/queued mail. The exact
preflight SELECT runs on synthetic historical assignments and returns the expected
aggregate categories while leaving all records unchanged.

The bypass regressions already passed before this slice because P2-STAFF-MODEL
delivered that predicate. This task completes the writer/inventory/evidence scope;
it does not claim a newly reproduced runtime escalation. Fresh seed assertions
now require zero global judges and one demo-event judge; existing full-record
seed idempotency and production refusal checks remain in the baseline.

## Validation and limits

Run from the repository root. Completed commands/results:

| Command | Result |
| --- | --- |
| `node --test --test-name-pattern="scoped admin cannot\|role resolution preserves" apps/api/tests/routes.test.cjs` | Both focused regressions pass |
| `docker compose -f docker/docker-compose.yml up -d postgres` | Fixture running after approved Docker access |
| `pnpm.cmd build` | Pass; API compiled freshly, unchanged workspace outputs cached |
| `pnpm.cmd typecheck` | Pass, including seed and browser TypeScript; unchanged packages cached |
| `pnpm.cmd lint` | Pass from existing web lint cache |
| `pnpm.cmd test` | Localization guard and 95 fresh API tests pass; 9 unchanged frontend tests cached |
| `pnpm.cmd db:generate`, `pnpm.cmd db:validate` | Generated and valid, using an unused local placeholder URL |
| `pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma` | Pass |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1` | Fresh/upgrade preservation and parity pass |
| `pnpm.cmd test:baseline` | Complete PostgreSQL/HTTP suite passes, including scope matrix, seed checks and preflight |
| `node --check scripts/check-admin-scope.cjs` | Pass |
| `node --check scripts/check-docs.cjs`, `node scripts/check-docs.cjs` | Documentation syntax/links pass |
| `git diff --check` | Pass |

Initial sandboxed Docker access was denied by the OS; rerunning with approved
Docker access resolved it. No database blocker remains. Turbo may reuse unchanged
packages; no UI implementation
or browser journey changed in this slice. PostgreSQL runners use only the checked-in
Compose fixture with random dance_baseline_* databases and migration-test schemas,
and remove their own fixtures. They do not read application environment files or
modify the development application database.

No intended hosted deployment/database is available. Global-assignment provenance,
authorized repair, backup and coordinated rollout remain P2-SCOPE-DEPLOY; local
fixture evidence does not satisfy H1's deployment gate. No real staging mail,
hosted CI or human/browser review is claimed. Controlled production admin
provisioning needs a reviewed operational procedure before hosted use.

Next actionable task: P2-BOUNDARIES-UPLOADS, securing the four image endpoints by
ownership/permission, active parent scope, verified raster content and safe serving.
