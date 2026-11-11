# Incomplete entry draft validation

Dates: 2026-11-11–12. Scope: P3-ENTRIES-DRAFT, a bounded prerequisite of P3-ENTRIES,
with its organizer creation/completeness UI. Parents P3-ENTRIES/P3-HISTORY and
all external milestone/human approval gates remain open.

## Outcome and decisions

[ADR-024](adr/024-incomplete-entry-drafts.md) chooses nullable fields on the
existing Performance identity. Migration 36 adds nullable title/duration/order/
configuration and optional UUID creation metadata; it replaces the snapshot
capture function with null-aware left joins and policyVersion 2. Version 1
snapshots and all retained owner/participant/score relationships remain unchanged.
Applied history was not rewritten. Downgrade requires coordinated forward repair;
inventing values or dropping drafts is not an acceptable rollback.

The shared strict contracts and canonical CRUD accept incomplete unscheduled
saves, explicit clearing and completion without identity transfer. Supplied IDs
still require exact event/studio relationships and active dancers; expected
revisions, stage/approval/membership rules and transactional audit still apply.
Optional creation operation IDs bind normalized requests to the actor/event.
Matching retries return one current active entry, including after write-window
closure; current read access is still required. New operations require write
access. Changed reuse, stale writes and archived-operation reuse conflict.

The Cobalt organizer register creates owner/title drafts, lists missing fields
separately from stage-order availability and renders nullable saved history.
Success requires a decoded server acknowledgement. Uncertain requests retain
their exact body/operation through filters and session recovery; later denial
does not imply the original request failed. An in-flight completion obeys the
current studio filter. ET/EN/RU and native keyboard controls use the scoped system.
No participant personal details or invented eligibility/music/submission status
are added to the register. Representative full editing remains P5-ENTRIES.

## Verification record

- Regression reproduced before implementation: owner-only draft rejected because
  complete fields and stage order were required. The focused draft contract test
  then passed.
- `pnpm.cmd test:focus api routes.test.cjs`: 77 passed, including nullable draft
  writes, clearing, strict relationships, stale writes and denied access.
- `pnpm.cmd test:entry-foundations`: passed, including final post-review rerun.
  HTTP/PostgreSQL checks cover multiple null stage orders, nullable snapshots,
  complete/clear revisions, immutable earlier snapshots, exact retry recovery,
  actor/event binding, concurrent deduplication, stage closure/current membership
  and archived-operation refusal. Existing audit-failure/nested-write rollback,
  direct SQL bounds, ownership and archive/score preservation checks also pass.
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1`:
  passed fresh install, retained/archived upgrade and SQL-only/schema parity.
- `pnpm.cmd test:baseline`: passed the complete isolated migration/seed/HTTP/
  PostgreSQL/authorization suite on rerun, including development-auth startup,
  recovery, foundation and private image checks; total 151.72 seconds.
- `pnpm.cmd build`, `pnpm.cmd lint`, `pnpm.cmd typecheck`: passed, including
  final affected-source rerun. `pnpm.cmd test`: passed (3 tooling, 26 web and
  121 API tests); no skipped test success was substituted.
- `pnpm.cmd db:generate`, `pnpm.cmd db:validate` and
  `pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma`:
  passed using a nonconnecting placeholder for non-database commands.
- `pnpm.cmd test:browser`: 188 passed. The final expanded
  `pnpm.cmd test:focus browser performances.spec.ts`: 37 passed. After the history
  label review fix, `pnpm.cmd exec playwright test tests/browser/performances.spec.ts
  -g 'incomplete draft keyboard|mixed saved configuration'`: 16 passed, including
  ET/EN/RU at 320/375/768/1440/1920px and mixed/null saved configuration.
- Hallmark static sweep of the performance component folder with `--scope app
  --genre modern-minimal --render --url http://127.0.0.1:4177/admin/events/e/performances`:
  0 FAIL, 0 REFLEX, 0 WARN. Its render tier did not run because puppeteer-core is
  unavailable. Actual rendered verification uses Playwright synthetic captures.

The independent Hallmark finish review requested the 375px/1440px captures, then
found one Finish issue: missing labels on nullable history configuration. The
fix labels category/age group/format individually; the final targeted browser
run and inspected mixed-history recapture resolve it. No open Floor/Reflex finding
or material slot remains. Human approval remains separate. Final build,
typecheck, lint, documentation checks and `git diff --check` passed.

## Environment and limits

Database runners use only the repository Compose PostgreSQL fixture, creating
their own random database/schemas and cleaning them up in finally. The first
sandboxed attempt failed on Docker named-pipe/config access; elevated execution
of the same authorized isolated tests succeeded. The application database was
not migrated/reset/reseeded, and no application credentials were printed.

The first full baseline ran for 548.46 seconds under concurrent validation load,
passed the draft and earlier suites, then failed the separate development-auth
API health timeout. After other heavy checks ended, the unmodified full runner
passed in 151.72 seconds, including that startup check in 2.79 seconds. No unrelated
timeout or application-auth behavior was changed to hide the initial failure.

Human visual/fluent-language/assistive approval, hosted CI/staging/provider and
release evidence remain external gates. No commit, push or deployment occurred.

Next: record the remaining P3-ENTRIES submission unit, eligibility aggregation,
deadline/music policy and correction/lock/withdrawal matrix; implement pinned
receipts and scoped correction consumers with their organizer UI. Configuration,
representative full editors and media retain their existing downstream owners.
