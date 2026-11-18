# Neposedõ studio and festival platform

One system for a new dance studio website, a replacement festival portal and
competition operations. The CMS and isolated public HTML consumers are delivered
locally alongside festival application, organizer/staff and entry foundations, while participant
UI, music, live judging/results and external release gates remain unfinished.
See [current checkpoint](DEVELOPMENT_PLAN.md).

**Agents:** read [AGENTS.md](AGENTS.md), the checkpoint, then only the selected
task's documents from the [documentation map](docs/README.md).

Current scope serves Neposedõ's two-teacher studio and one or two yearly festivals.
The developer and director administer both through one private workspace.

| Target experience | Purpose |
| --- | --- |
| neposedo.ee | New public studio website: about/teachers, groups/classes, timetable, joining, media and contact/social links |
| fest.neposedo.ee | Replace Wix: annual festival branding, ET/EN/RU rules, registration access, judges, results and archives |
| fest.neposedo.ee/app initially | Shared content administration and authorized competition workflows |

These are target addresses, not verified hosted routes. Studio content is created
from scratch; Instagram/Facebook remain social channels. A bounded CMS provides
draft/preview/publish and reusable edition setup. CRM, student records, attendance,
tuition billing and multiple organizers are outside current scope.
[Product scope](docs/PRODUCT_SCOPE.md) and [website roadmap](docs/roadmap/website.md)
own detail. Next: P9-WIX-TRANSITION, starting with the coordinated `/app` and
legacy identity-link integration before cohosting. Public launches need not wait for M3/M5.
Keep Wix live until replacement verification and authorized cutover.

The private browser workspace now uses `/app`; API routes stay `/api/v1`.
[Routing and local cohosting](docs/api/workspace-routing.md) covers indefinite
bounded legacy links and the opt-in loopback rehearsal. Separate
public HTML listeners require explicit local origins/ports and existing published
CMS content; see [public entry setup](docs/api/public-pages.md#isolated-entry-and-routing).
This does not deploy or configure the target addresses.

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
for seeded login. Web VITE_API_URL defaults to /api/v1, with a Vite loopback proxy;
explicit API origins remain supported. Restart
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

Open http://localhost:5173/app; API/database health is http://localhost:4000/health.
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
login. Auth, staff administration, organizer setup/review and role-independent
applicant/status/profile workflows are delivered locally. See
[setup validation](docs/EVENT_SETUP_VALIDATION.md) and
[application/review validation](docs/APPLICATION_REVIEW_VALIDATION.md).
Organizer entry ownership, saved history/calendar dates and incomplete drafts
are delivered locally under [draft validation](docs/ENTRY_DRAFT_VALIDATION.md).
Judge/moderator dashboards, representative entry/music/submission and live/results remain
unfinished. [Security](docs/SECURITY.md) lists current gaps;
[domain guide](docs/DOMAIN.md) distinguishes runtime from accepted targets.

Author: [Konstantin Skorohodov](https://github.com/kostjask)
