# Phase 0 migration validation

Validated on 2026-10-23 against PostgreSQL 16 in the repository's Docker Compose service.

The user confirmed that the three untracked February migrations are unpublished and disposable. The local `dance_comp` database has no `_prisma_migrations` table. No existing application tables were changed by this validation.

## Repairs and upgrade behavior

- `20260219173645_added_deleted_by_column` adds nullable actor fields without changing existing dancers or studios.
- `20260219175019_studio_approval_status_and_soft_delete_name_rule` defaults existing studios to `PENDING` and replaces global unconditional name uniqueness with global active-record uniqueness. Approval remains separate from event-registration status; no approval is inferred from historical registrations. Operational review of existing studio approvals is still required before a real upgrade.
- `20260221223825_add_user_deactivatedby` now renames `RegistrationStatus` to `EventRegistrationStatus` in place. All four labels, existing values, the `PENDING` default, column constraints, and registration metadata survive. It also adds nullable deletion/deactivation fields and `CANCELLED`. The original drop/recreate operation would have reset every registration to `PENDING`.
- `20261023190000_add_event_max_performances` adds the missing nullable integer column. Existing events retain `NULL` (no configured limit); no existing limit is invented.

The migration directories sort in dependency order. The SQL-only `Studio_name_active_unique` partial index is intentional; Prisma schema comparison must retain it. Resolved (2026-10-24): studio profile renames now check global active names and translate database uniqueness races to 409. No index or migration changed. Registration-creation conflict/error consolidation remains Phase 1 work; see [current API contracts](API.md#studio-profile-contract).

## Repeatable regression check

Start the existing PostgreSQL service, then run from the repository root:

```powershell
docker compose -f docker/docker-compose.yml up -d postgres
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1
```

The script requires installed Prisma dependencies and Docker access. It accepts `-Database` and `-DatabaseUser` for a different database/user in the same Compose PostgreSQL service. It uses no application environment credentials and does not reset the database. Three randomly named schemas hold the expected schema, a fresh migration chain, and an upgrade fixture; `finally` removes only these schemas and the temporary expected-DDL file. Each migration runs in its own transaction so newly added enum labels are usable by subsequent migrations.

Checks cover:

- Every migration applying in chronological order to an empty schema.
- Upgrading data inserted immediately before the three February migrations: all four registration statuses, review permissions, timestamps, entity relationships, soft-delete defaults, deactivation defaults, and participant links.
- The registration default still producing `PENDING`, writing `CANCELLED`, and nullable/writable `maxPerformances`.
- Rejecting duplicate active studio names, reusing an archived name, and rejecting a conflicting restore.
- Comparing resulting columns/defaults/nullability, enum labels, constraints/referential actions, and indexes with SQL generated from the current Prisma schema. The SQL-only partial studio-name index is checked through behavior separately.

## Results and remaining baseline work

The results below describe the initial migration-validation session. A subsequent P0 baseline recovery resolved installation, build, script, seed, Prisma runtime, and whitespace blockers: see [current baseline validation](BASELINE_VALIDATION.md). Prisma deployment bookkeeping and seed idempotency now pass in an isolated empty database. The client generator now uses the standard `@prisma/client` entry; API/shared package runtime resolution is verified. Historical populated-database upgrade risks below remain relevant.

- Migration regression check: passed, including cleanup.
- Prisma validate and client generation: passed. Supply `--config apps/api/prisma.config.ts` for migration diff; without a datasource config this Prisma version's engine exits without writing output.
- Prisma formatting: checked on a disposable schema copy to preserve existing schema edits.
- `pnpm.cmd --filter web lint`: passed.
- `pnpm.cmd install --frozen-lockfile`: failed with `ERR_PNPM_IGNORED_BUILDS` for Prisma engines, Prisma, bcrypt, and esbuild. `pnpm-workspace.yaml` has placeholder `allowBuilds` values; resolve dependency build policy deliberately next.
- `pnpm.cmd build`: failed in `packages/types/tsconfig.json` with TS5090 (non-relative paths without `baseUrl`). Turbo also cannot parse the lockfile's multiple YAML documents.
- `pnpm.cmd typecheck`: exits successfully but executes zero tasks; it is not a typecheck pass.
- `pnpm.cmd test`: fails because Turbo has no `test` task.
- `git diff --check`: reports the same 16 pre-existing whitespace errors in API routes and `stageChecks.ts`.

This task validates migration SQL, not Prisma deployment bookkeeping, seed idempotency, or a production rollback. The separate Phase 0 empty-database `prisma migrate deploy` and seed tasks remain open. Earlier published migrations contain populated-database upgrade hazards (required fields and uniqueness); the fixture deliberately starts at the last tracked migration and does not claim arbitrary historical database upgrades are safe.

Rollback of the new nullable column would discard any configured limits. Renaming the enum back preserves values but must be coordinated with application rollback. Do not automatically drop actor/deactivation fields or approval data during rollback. Take and verify a backup before a real upgrade; applied migrations must remain immutable.
