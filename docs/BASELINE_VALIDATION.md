# P0 repository and build baseline

Validated on 2026-10-23 with Node 24.22.1, pnpm 12.15.0, Turbo 2.11.10, and the Compose PostgreSQL 16 service.

A subsequent [stable dependency refresh](DEPENDENCY_UPDATES.md) updated the toolchain and runtime packages, including TypeScript 7, Vite 8, ESLint 10, and Prisma 7.10.1. The original baseline results below are retained as history; the dependency report records the current seven-test validation.

## Changes

- Migrated removed pnpm build-policy settings to explicit `allowBuilds` decisions for the same four required packages. Frozen installation now succeeds. See [pnpm's build settings](https://github.com/pnpm/pnpm.io/blob/main/docs/settings/build.md).
- Updated Turbo from 2.8.6 to 2.11.10 so the existing multi-document pnpm lockfile is understood. Both pnpm metadata and the project dependency graph are preserved. See [pnpm lockfile format](https://github.com/pnpm/pnpm/blob/main/pnpm/docs/lockfile.md) and [Turbo's upstream fix](https://github.com/vercel/turborepo/pull/12616). No dependency was downgraded.
- Named the API workspace so Turbo includes it. Build and typecheck now run across all four packages; the API seed is also typechecked. Lint runs the existing web ESLint configuration. Test runs three real API baseline tests with Node's built-in runner; packages without test infrastructure have no placeholder test scripts.
- Removed shared source-path aliases from the base TypeScript config, which were invalid without `baseUrl` and bypassed package boundaries. Shared schemas emit ESM JavaScript and declarations; the NodeNext API compiles to CommonJS and consumes the package exports on Node 24. The web bundler's existing source aliases remain intact.
- Standardized the client generator and every API import on `@prisma/client`. The client is generated into ignored dependencies. Replaced the TypeScript-only `@errors` alias with runtime-resolvable relative imports. The compiled API starts with plain Node.
- Fixed root/API seed and Prisma task paths. Removed seed token/password logging, made the seed transactional and repeatable, reused existing age groups/formats/studio, and preserved existing credentials and workflow state. The demonstration seed refuses production mode. It is intended for sequential local execution; historical duplicates are not removed.
- Corrected API URL defaults/examples to port 4000, aligned the API database example with Compose, removed the obsolete Compose version field, and documented setup in the root README.
- Removed existing trailing whitespace in the affected API files. New TypeScript build metadata goes under ignored output; the previously tracked build-info file is preserved.

## Completed checks

| Command | Result |
| --- | --- |
| `pnpm.cmd install --frozen-lockfile` | Passed; no lockfile compatibility warnings |
| `pnpm.cmd build` | Passed, all four workspaces including API |
| `pnpm.cmd typecheck` | Passed, all four workspaces plus seed |
| `pnpm.cmd lint` | Passed, existing web lint |
| `pnpm.cmd test` | Passed, three API baseline tests |
| `pnpm.cmd db:validate` | Passed |
| `pnpm.cmd db:generate` | Passed, standard client entry |
| `pnpm.cmd exec prisma format --schema apps/api/prisma/schema.prisma` | Passed |
| `docker compose -f docker/docker-compose.yml up -d postgres` | Passed |
| `pnpm.cmd test:baseline` | Passed; empty-database deploy/redeploy, seed twice, production-seed rejection, built API health/login/profile, unauthenticated access and judge mutation denial |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1` | Passed; migration SQL, existing statuses, defaults, relationships, partial uniqueness, schema parity |
| `git diff --check` | Passed |

The database test creates a UUID-named `dance_baseline_*` database through the local Compose fixture. It verifies every migration has a finished Prisma migration record. It then modifies approval, registration-lock/review settings, and age limits before rerunning the seed, comparing full records (including unchanged hashes/IDs/timestamps) rather than only row counts. The test stops its own compiled API process, disconnects its client, and drops only the database it created. Application database contents and environment files are untouched. The SQL migration suite separately cleans up its UUID-named schemas.

## Remaining P0 work and phase gate

This restores the technical Phase 0 baseline, not all P0 findings. Canonical route composition, the studio/dancer/performance URL mismatches, duplicate performance handlers, the GET body bug, incomplete controllers, resource authorization, role-key checks, CORS/rate limits, development identity, and invitation token handling remain in the plan's subsequent phases. Baseline smoke checks are not a full authorization matrix or browser E2E suite. No new lint framework was added for API/shared packages.

The user explicitly authorized commits. Phase 0 is complete, including its commit checkpoint: database `81257a6`, backend/build `d2d8256`, frontend `18e2089`, and the accompanying documentation commit. No branch or push was created. Next: decide and record ADR-001/002/005 before implementing route-contract stabilization in active Phase 1. The root README contains the supported setup/start commands.
