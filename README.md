# Dance Competition Management System

TypeScript monorepo for event administration, studio registration, judging and
results. API contracts/localization foundations exist; security hardening and
complete user journeys remain unfinished. See [current checkpoint](DEVELOPMENT_PLAN.md).

**Agents:** read [AGENTS.md](AGENTS.md), the checkpoint, then only the selected
task's documents from the [documentation map](docs/README.md).

## Local setup

Requires Node 24.x, pnpm 12.15.0 (package.json), Docker Compose and free ports
5432 (PostgreSQL), 4000 (API), 5173 (web). Run from the repository root. PowerShell
uses pnpm.cmd; other shells can use pnpm.

```powershell
pnpm.cmd install --frozen-lockfile
if (!(Test-Path apps/api/.env)) { Copy-Item apps/api/.env.example apps/api/.env }
if (!(Test-Path apps/web/.env)) { Copy-Item apps/web/.env.example apps/web/.env }
```

Set a newly generated JWT_SECRET (at least 32 characters) in apps/api/.env.
The example DATABASE_URL matches the local Compose fixture. Keep DEV_AUTH=false
for seeded login. Web VITE_API_URL must be http://localhost:4000/api/v1; restart
Vite after changes. [Environment reference](docs/ENVIRONMENT_CONFIGURATION.md).

```powershell
docker compose -f docker/docker-compose.yml up -d postgres
pnpm.cmd db:generate
pnpm.cmd db:validate
pnpm.cmd db:migrate
pnpm.cmd seed
pnpm.cmd build
pnpm.cmd dev
```

Open http://localhost:5173; API/database health is http://localhost:4000/health.
The dev command starts both apps. Rebuild @dance/schemas and restart the API
watcher after shared-contract changes; the API consumes emitted JavaScript.
Compiled API: pnpm.cmd --filter api start. Scoped API commands read apps/api/.env;
explicit shell variables take precedence. Prisma config is apps/api/prisma.config.ts.

[Seed fixtures](apps/api/prisma/seed.ts) preserve existing credentials, approvals
and configuration on rerun; seed runs transactionally and refuses production.
Run it sequentially. Do not use demonstration accounts for external operations.

## Commands and structure

| Purpose | Root command / location |
| --- | --- |
| Validation commands / scope | [TESTING](docs/TESTING.md#workspace-checks) |
| Database deploy / generation / validation | pnpm db:migrate / db:generate / db:validate |
| Isolated database workflows | [TESTING](docs/TESTING.md#postgresql-checks) |
| Backend | apps/api — Express 5, Prisma 7, PostgreSQL, JWT |
| Frontend | apps/web — React 19, Vite 8, Tailwind 4, React Router 7 |
| Contracts / remaining shared types | packages/schemas / packages/types |

Build/typecheck cover all four packages; lint covers web. TypeScript 7 supplies
the compiler; the TypeScript 6 alias supplies the tooling API. Manifests/lockfile
own exact versions. [Architecture](docs/ARCHITECTURE.md) · [API](docs/API.md) ·
[Frontend](apps/web/README.md) · [Testing/CI](docs/TESTING.md).

## Current limits

Email defaults to a silent development fake; Resend dispatch/queue is implemented
locally but real inbox/hosted release evidence remains open. Storage is local with
private authenticated images. Signup requires studio intent; event reads require
login. Auth, staff administration and organizer setup/review are implemented with
local isolated validation and a verified reset/reseed/authenticated development
runtime handoff; [organizer validation](docs/ORGANIZER_VALIDATION.md) records the
checks. Role-independent applicant/status/profile and event apply/resume UI are
delivered locally; [application validation](docs/APPLICATION_VALIDATION.md) records
their scope. Judge/moderator dashboards, entry/music and live/results remain
unfinished. [Security](docs/SECURITY.md) lists current gaps;
[domain guide](docs/DOMAIN.md) distinguishes runtime from accepted targets.

Author: [Konstantin Skorohodov](https://github.com/kostjask)
