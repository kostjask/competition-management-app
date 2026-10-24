# Validation and continuous integration

Run commands from the repository root with Node 24 and the pnpm version pinned
in package.json. On Windows PowerShell, use pnpm.cmd in place of pnpm.

## Workspace checks

```text
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:validate
pnpm exec prisma format --check --schema apps/api/prisma/schema.prisma
pnpm build
pnpm typecheck
pnpm lint
pnpm test
git diff --check
```

Prisma configuration needs DATABASE_URL even for checks that do not connect.
For those checks, an explicit placeholder such as
postgresql://unused:unused@127.0.0.1:1/unused is sufficient. Do not replace an
existing application environment file. Build/typecheck cover the four workspace
packages and the API seed. Lint currently covers web only. The API uses Node's
built-in test runner against the compiled application; pnpm test builds its
dependencies first. There is no browser test infrastructure yet.

Turbo may reuse unchanged local results. To run fresh HTTP tests after building,
use pnpm --filter api test. In CI each job begins with a fresh checkout and
installation; the workflow does not restore build outputs or a Turbo cache.

## PostgreSQL checks

Start the repository's local PostgreSQL 16 service and build before testing:

```text
docker compose -f docker/docker-compose.yml up -d postgres
pnpm db:generate
pnpm build
pnpm test:baseline
```

Run the separate migration regression suite from PowerShell:

```powershell
./scripts/test-migrations.ps1
```

Windows PowerShell can also use
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1.
PowerShell 7 (pwsh) runs the same script on Linux. The script selects pnpm.cmd on
Windows and pnpm elsewhere.

The baseline runner uses only the checked-in Compose fixture, creates a random
dance_baseline_* database, deploys/redeploys migrations, checks full-record seed
idempotency and production-seed refusal, and starts its own compiled API on a
temporary port. It runs registration, dancer, performance, studio and judge
HTTP/database workflows, event DTO/persistence and concurrent partial-date
checks, and auth/profile DTOs with real global/event roles. It stops its server
and drops its own database in a
finally block. The migration suite creates random schemas in dance_comp, checks
fresh and existing-data upgrades, status/default/data preservation, the partial
active-studio-name index and schema parity, and removes its schemas/temp SQL.
These commands fail if Docker/PostgreSQL is unavailable; there is no skip-success
path. They do not reset the application database or use its credentials.

## GitHub Actions

[CI workflow](../.github/workflows/ci.yml) runs for pushes, pull requests and
manual workflow dispatch. It has read-only repository permissions, disables
persisted checkout credentials, and cancels superseded runs for the same ref.
It uses Node 24 and the repository-pinned pnpm version through the official
[setup-node](https://github.com/actions/setup-node) and
[pnpm action](https://github.com/pnpm/action-setup).

The two independent jobs are:

- **Workspace checks:** frozen installation, Prisma generation/validation/format
  check, build, typecheck, current lint, existing tests and whitespace checking of
  the triggering commit (or PR merge against its first parent).
- **PostgreSQL migrations and workflows:** frozen installation, generation/build,
  PostgreSQL readiness, migration regression checks through pwsh, and the baseline
  HTTP/database suite. Missing database infrastructure or any failed command fails
  the job; no job or check uses continue-on-error.

The database job combines the regular Compose file with
[the CI override](../docker/docker-compose.ci.yml), which adds a bounded health
check and disables restarts. A unique COMPOSE_PROJECT_NAME scopes the run's
volume/network; calls inside both scripts inherit it. All data/credentials are
disposable fixtures. The runner scripts clean up their own fixtures; an always
step also tears down the CI project and its volumes after failure or cancellation.
That volume-removing step is intended only for disposable hosted CI runners,
not the developer's persistent Compose project. A hard runner termination can
prevent finally/always cleanup; GitHub-hosted runner disposal is the final boundary.

Both jobs have 15-minute timeouts. No application secrets, environment files,
database dumps, request tokens or private records are uploaded as artifacts.
Configure both named jobs as required checks in branch protection if merge gating
is desired; workflow creation does not change repository settings.

Local workflow validation uses the official
[actionlint](https://github.com/rhysd/actionlint) release, plus docker compose
config --quiet for the merged files. A passing local check is not evidence of a
hosted run. The initial hosted run and branch-protection configuration remain
operator follow-up after the workflow is published.
