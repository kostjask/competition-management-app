# Studio checkpoint implementation and validation

Updated: 2026-11-14. Scope: P3-ENTRIES core checkpoints, P3-HISTORY consumers and
their bounded organizer S12/configuration UI. This is local development evidence,
not whole M3 delivery, staging readiness or human visual/language approval.

## Outcome and decisions

The user confirmed studio-wide basic/final submission and any older age within
the configured percentage. Younger dancers are unrestricted in the supplied
Dance Express age preset; olderCount × 100 ≤ participantCount × percent prevents
rounding up. Invalid/future birth dates cannot be waived as category exceptions.
[ADR-025](adr/025-entry-submission-lifecycle.md), the completed
[questionnaire](ENTRY_POLICY_QUESTIONNAIRE.md) and
[source-image record](DANCE_EXPRESS_RULES.md) own the accepted policy and provenance.

Delivered: opt-in event settings, independent BASIC/FINAL windows, teacher/author
credits, category-specific nomination/count/duration limits, rule freeze after
registration, early/deadline locks, current-version acceptance, whole/field/entry
reopening and reasoned organizer eligibility exceptions. Representative roster
CRUD cannot bypass final locks. Withdrawals through current DELETE retain history
and invalidate current acceptance without unlocking other entries.

Receipts pin fresh immutable CHECKPOINT revisions and exact source snapshots.
Final receipts also retain the active studio roster; basic receipts omit that
unrelated full roster. Receipt content and checkpoint identity are SQL-protected;
SQL verifies receipt snapshots belong to that studio's immutable revisions.
Actor/route/body-bound UUID retries return the existing receipt without restoring
replaced grants or duplicating effects. Audit identifies exact checkpoint IDs and
receipt revisions, with no private free-text/personal payload in audit metadata.

The Cobalt organizer register adds URL-selected checkpoint review, one checkpoint
at a time, rule/deadline settings and an entry-details/participant editor. ET/EN/RU,
keyboard focus, field links, loading skeletons, empty/error/disabled/pending states,
locale/session recovery, immutable acknowledgements, explicit stale comparison
and same-operation uncertain retries are implemented. Exact deadline seconds and
DST-fold offset selection survive unchanged saves.

## Changed implementation surfaces

- [Shared entry contract](../packages/schemas/src/entry.schema.ts), performance
  snapshot/credit contracts and audit action/target schemas.
- [Prisma model](../apps/api/prisma/schema.prisma) and additive
  [migration 38](../apps/api/prisma/migrations/20261113010000_studio_entry_checkpoints/migration.sql).
  Previous migration files/history are not rewritten.
- [Workflow service](../apps/api/src/services/entryWorkflow.ts),
  [controller](../apps/api/src/controllers/EntryWorkflowController.ts), canonical
  router and existing performance/dancer/configuration/event mutation boundaries.
- [Client](../apps/web/src/api/entry-workflow.ts), organizer performance components,
  translations and scoped Cobalt styles. The existing shell is preserved.
- [Database suite](../scripts/check-entry-workflow.cjs), API coverage/admin-scope
  inventory, migration parity runner and performance browser suite.
- [API contract](api/entry-workflow.md), checkpoint/roadmaps, design adoption and
  reconciled current behavior documentation. Original user edits are preserved.

## Checks and results

Final result table is updated only after the corresponding command completes.

| Command/check | Recorded result |
| --- | --- |
| pnpm test | Passed final-source tooling (3 tests), localization, 121 API and 26 web tests |
| pnpm typecheck; pnpm build; pnpm lint | Passed final-source checks; a later CSS review-comment update has no runtime effect |
| pnpm db:generate; pnpm db:validate; Prisma format --check | Passed |
| pnpm test:entry-foundations | Passed repeatedly; final full baseline also passes audit target, replaced grants, immutable ownership, invalid birth-date denial and basic-roster omission |
| pnpm test:baseline | Final-source serial run passed full upgrade/seed/redeployment/HTTP/database suite in 191.65 seconds |
| scripts/test-migrations.ps1 | Passed final fresh/upgrade/refusal/data preservation and Prisma/SQL parity |
| pnpm test:browser | Passed all 226 then-existing Chromium cases; subsequent recovery/state additions are validated in the affected suite |
| pnpm test:focus browser performances.spec.ts | Final affected suite: all 63 Chromium cases passed in 3.8 minutes |
| Targeted loading/fold/stale/recovery checks | Passed |
| Hallmark static sweep | Final-source sweep: 0 FAIL / 0 REFLEX / 0 WARN across 8 files |
| Documentation checker; git diff --check | Passed final handoff checks: 131 Markdown files / 889 local links; no whitespace errors |

The first new migration run failed on an unquoted SQL identifier; the corrected
migration passed. The first complete baseline caught incorrect JSON operator
precedence in the deadline-only rule-freeze check; its focused regression and
full retry passed. Concurrent validation load caused an earlier migration timeout
and development API-health startup failures, including the first final-source
rerun; the checkpoint child suite passed in that run. Serial retry is recorded
in the table above. A
browser fixture construction error was corrected; its lost-response regression
passed. Duplicate React keys, missing explicit stale recovery and the fold-offset
selection issue were corrected and covered. These earlier failed commands are
not reported as passing.

Hallmark's own render tier could not run because puppeteer-core is unavailable.
Authenticated Playwright captures were visually inspected on phone/desktop in
EN and phone RU, including final EN 1440px and RU 320px captures; ET/EN/RU reflow
and keyboard cases passed across 320–1920px.
The in-thread finish review simplified checkpoint density, corrected plural
counts/duplicate labels and preserved clear review/lock/receipt hierarchy.
There are no image/material slots. This is not fluent-language or screen-reader
certification, nor human approval of the whole application redesign.

## Development database handoff: completed 2026-11-14

Verified target: **localhost:5432/dance_comp, public schema**, backed by the
repository Compose PostgreSQL service. It is the user-confirmed disposable
development database, not a production target. Before reset, its last common
canonical migration was 20261109000000_registration_lifecycle and it retained the
removed parallel-branch 20261112000000_organizer_setup_review migration, with eight
canonical migrations pending.

After fresh explicit user consent, the completed commands were:

```text
pnpm.cmd --filter api exec prisma migrate reset --force --config prisma.config.ts
pnpm.cmd seed
pnpm.cmd --filter api exec prisma migrate status --config prisma.config.ts
```

The reset permanently replaced the disposable test data and rebuilt canonical
migration history. Prisma initially blocked reset pending fresh consent. The user
then explicitly requested reset/reseed of this verified local database; that exact
message was supplied through Prisma's process-only consent mechanism. No guard
was bypassed and no production target, upload or source file was reset.

Results: reset and seed exited successfully; migrate status reports the schema
up to date. Read-only verification matched all 38 completed migration records
exactly to source, with no obsolete or failed/rolled-back migration. Seed counts:
3 users, 4 roles, 1 event and 1 studio. New entry configuration/checkpoint/receipt
tables are queryable and initially empty; teacher/author columns are queryable.
A temporary built API passed health, seeded administrator login/profile and
authenticated entry-configuration reads, using a process-only fake mail provider.
The temporary server was closed. No external mail or environment-file change was
needed. This clears the local application database handoff blocker.

## Remaining work and integration

P3-ENTRIES remains open for a dedicated reversible withdrawal/resubmission model
and recovery UI; current archival has no restore endpoint. Initial per-event-day
performance estimates, complete nomination option creation/reusable presets,
representative roster/entry screens and real music upload/confirmation/acceptance/
reminders remain with their owning tasks. No payment, award, scoring or public
results implementation is included. Human ET/EN/RU/assistive, real-mail, hosted
CI/rollout/restore and external milestone gates remain open.

Origin/main was fetched and is contained in the current branch (HEAD has four
additional commits). The upstream branch matches HEAD, and the only open PR is
this branch's existing PR #3 targeting main. No target integration was needed;
no commit, push, branch/history mutation or deployment was performed. The next
action is the remaining P3-ENTRIES reversible withdrawal/resubmission slice.
