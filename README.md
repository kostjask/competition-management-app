# Dance Competition Management System

A TypeScript monorepo for dance competition administration, studio registration, judging, and results. The project is in baseline stabilization. Authentication, event screens, and parts of registration CRUD exist; route integration, authorization hardening, live judging, music, and results are still unfinished. See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for current priorities and known blockers.

## Product workflows and documentation

- [User journeys and UX requirements](docs/USER_JOURNEYS.md): intended onboarding, applications, approvals, entry submission, and recovery, with current gaps and acceptance criteria.
- [Registration and invitation workflow](docs/REGISTRATION_API.md): implemented boundaries and current API references.
- [Current API integration status](docs/API.md): working endpoints and remaining integration work.

Planned journeys are not implemented features. The development plan controls prerequisites and delivery order.

## Prerequisites

- Node.js 24.x (validated with 24.22.1).
- pnpm 12.15.0, matching package.json.
- Docker with Compose and access to its daemon.
- PostgreSQL port 5432, API port 4000, and web port 5173 available locally.

Build and typecheck use TypeScript 7 through the @typescript/native alias; ESLint uses the TypeScript 6 API compatibility alias. See [stable dependency refresh](docs/DEPENDENCY_UPDATES.md) for versions and migration details.

The workspace explicitly permits install scripts for Prisma, its engines, bcrypt, and esbuild. The lockfile has pnpm's environment and project YAML documents; Turbo 2.11.10 supports this format.

## Local setup

Run from the repository root. On Windows PowerShell, use pnpm.cmd if execution policy blocks pnpm.ps1. Other shells can use pnpm.

```powershell
pnpm.cmd install --frozen-lockfile
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

Copy environment examples only when the destination does not exist. Set a newly generated JWT_SECRET in apps/api/.env (at least 32 characters). The example DATABASE_URL matches the checked-in local Compose service; it is for local development. The web example points to http://localhost:4000/api/v1. Leave DEV_AUTH=false for the seeded login workflow.

```powershell
docker compose -f docker/docker-compose.yml up -d postgres
pnpm.cmd db:generate
pnpm.cmd db:validate
pnpm.cmd db:migrate
pnpm.cmd seed
pnpm.cmd build
pnpm.cmd dev
```

Open http://localhost:5173. API database health is available at http://localhost:4000/health. Business routes use `/api/v1`; existing web `.env` files must set `VITE_API_URL=http://localhost:4000/api/v1` and restart Vite. See [API integration status](docs/API.md) for authentication boundaries and remaining resource-path repairs. Development fixture accounts are defined in [seed.ts](apps/api/prisma/seed.ts); rerunning the seed preserves existing credentials, configuration, approvals, and registration state. The demonstration seed refuses production mode and runs its changes in one transaction. Concurrent seeding is not supported.

The root dev command starts the API watcher and Vite. After changing shared contracts, rebuild @dance/schemas and restart the API watcher. Both dev and compiled API execution consume that package's emitted JavaScript. Client generation uses the standard @prisma/client entry; generated client files remain in ignored node_modules.

To run the compiled API separately after building:

```powershell
pnpm.cmd --filter api start
```

Commands scoped to api run from apps/api, where dotenv reads its .env. An explicitly set shell environment variable takes precedence. Prisma configuration lives at apps/api/prisma.config.ts.

## Validation

```powershell
pnpm.cmd build
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd test:baseline
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1
git diff --check
```

Build and typecheck cover all four workspace packages, including the API and its seed. Lint currently covers the web package; Seven API/runtime/upload tests use Node's built-in test runner. No placeholder success scripts are added for packages without test/lint infrastructure. Prisma validation/generation commands are available through db:validate and db:generate. The migration schema is formatted with pnpm.cmd exec prisma format --schema apps/api/prisma/schema.prisma.

The baseline check requires Docker and creates a uniquely named temporary database using only the Compose fixture connection. It verifies empty-database Prisma deployment, repeat deployment, complete-record seed idempotency, compiled API startup, health/login/profile, and basic authorization failures. It stops its own API process and removes only its own database. The separate migration regression check exercises existing registration statuses, partial studio-name uniqueness, and schema parity in isolated schemas. See [migration validation](docs/MIGRATION_VALIDATION.md) and [baseline validation](docs/BASELINE_VALIDATION.md).

## Structure

- apps/api: Express 5, Prisma 7, PostgreSQL, JWT, controllers and routes.
- apps/web: React 19, Vite 8, Tailwind CSS 4, React Router 7, Estonian/English/Russian localization.
- packages/schemas: shared Zod contracts, built as an ESM package with JavaScript and declarations.
- packages/types: shared TypeScript declarations.
- docker/docker-compose.yml: PostgreSQL 16 with a persistent local volume.
- docs: architecture/refactor notes, validation reports, and API workflow documentation. Older guides may contain historical claims; the plan records unresolved drift.

## Current limits

Baseline checks do not establish complete endpoint or authorization coverage. Duplicate/unmounted performance handlers, route/client mismatches, upload authorization, development auth identity, and other P0 security findings remain in the plan. Email is a development stub, role dashboards are placeholders, and storage currently uses local files. Avoid treating the application as production ready.

## Author

[Konstantin Skorohodov](https://github.com/kostjask)
