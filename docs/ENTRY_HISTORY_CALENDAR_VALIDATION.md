# Entry history and calendar foundations

Local validation: 2026-11-11. Scope: P3-HISTORY foundations and
P3-CALENDAR-DATES with the organizer register's read-only history UI.
[ADR-023](adr/023-entry-history-and-calendar-dates.md) owns the decisions.

## Delivered behavior

- Migration 34 audits all legacy birth timestamps and refuses unsupported or
  non-midnight values before converting to native DATE. Calendar HTTP strings,
  leap days and existing identity/archive relationships are retained. Supported
  years are 0001–9999; neither API nor SQL accepts year zero/out-of-range dates.
- Age uses completed years on the event-local start date, with March 1 advancement
  for February 29 in non-leap years. Shared calculation covers midnight and DST
  boundaries. Submission eligibility enforcement belongs to P3-ENTRIES.
- Migration 35 captures retained active/archived performances as explicitly labelled
  baselines, without invented authors/original save times or submission status.
  Canonical creates/edits/archives append immutable snapshots plus privacy-minimal
  audit in one serializable transaction. PATCH/DELETE require expectedRevision;
  stale/concurrent writes fail without overwriting saved work.
- Authorized history reads freeze studio/participant/configuration/event values.
  Current source edits never rewrite them. The Cobalt register shows saved title,
  studio/configuration, counts, age reference and provenance, without rendering
  participant names/birth dates. URL selection, retry, session/reload and keyboard
  close-to-trigger recovery work in ET/EN/RU at five widths.

## Completed checks

- `pnpm.cmd test:focus web history-calendar.test.tsx`: 3 passed.
- `pnpm.cmd test:focus web i18n.test.tsx`: 7 passed after adapting validation
  fixtures to mandatory performance revision expectations.
- `pnpm.cmd test:focus api routes.test.cjs`: 76 passed; final rerun includes
  private revision-collision recovery rather than mislabelling it as stage order.
- `pnpm.cmd test:entry-foundations`: passed (23.62s; final UTC-capture rerun 29.30s,
  both including cleanup). Same
  random-database isolation/seed/auth smoke as the full baseline; no application
  environment file or application database is migrated/reset.
- `pnpm.cmd test:baseline`: final full gate passed (277.35s including cleanup).
  Native-date round trips in three session zones, source-edit snapshot stability,
  exact owner/event denials, stale/concurrent saves, immutable update/delete denial,
  audit rollback and archive retention all passed alongside existing suites.
  The first full attempt stopped on an old test that expected a retained 23:30
  timestamp; it was updated for DATE storage, then the failing/focused suites
  passed before the complete gate was repeated.
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1`:
  passed, including ambiguous legacy refusal/DDL rollback, timezone/leap-day
  preservation, active/archived baseline provenance and exact schema/SQL parity.
  The final rerun additionally proves capture timestamps remain UTC in a non-UTC
  database session after the final review's explicit UTC capture correction.
- `pnpm.cmd test`: passed, 120 API tests, 25 web tests, 3 tooling tests and the
  localization source guard. Final targeted route checks cover the subsequent
  narrow history-collision error classification. No unrelated behavior was changed.
- Final `pnpm.cmd build`, `pnpm.cmd typecheck`, `pnpm.cmd lint`,
  `pnpm.cmd db:generate`, `pnpm.cmd db:validate` and Prisma format check passed.
- `pnpm.cmd test:browser`: all 177 Chromium cases passed (9.1m). After the finish
  review's two UI fixes, the affected `performances.spec.ts` rerun passed all 18
  cases (1.5m); revised captures were visually inspected. No browser suites ran
  simultaneously. Captures/traces contain synthetic data and remain ignored.
- Hallmark static sweep: 0 FAIL, 0 REFLEX, 0 WARN across the three UI files.
  The URL render attempt could not run because optional puppeteer-core is absent;
  no library was added. Authenticated Playwright captures supplied rendered
  evidence to the fresh-context finish reviewer. Its history-specific error and
  fact-ledger loading findings were both fixed and scored resolved on recapture.
  App-scope judged gates retain token/focus/contrast/responsive rules; no imagery,
  marketing hero, invented metrics or material slots are applicable.
- `node scripts/check-docs.cjs`, syntax checks for the changed database runners
  and `git diff --check`: passed. Checkpoint/owning roadmaps retain incomplete
  parent tasks and distinguish current state from dated evidence.

## Boundaries and next action

No commit, push, deployment, application-database migration/reset or migration
history rewrite occurred. Docker access was elevated only for the repository's
isolated test fixtures, which clean up their random databases/schemas.

P3-CALENDAR-DATES is complete locally. P3-HISTORY's snapshot/revision design,
preservation storage and organizer UI foundation are complete; its parent remains
open for concurrent submission/receipt/correction consumer checks in P3-ENTRIES.
This resolves the pre-entry design gates without claiming nonexistent submission
actions. Next implement P3-ENTRIES's durable incomplete unscheduled drafts,
revision-pinned receipts/retries and scoped correction lifecycle. P4-ENTRY-CONFIG
and P5 entry editing follow their gates. Phase 3/M3, whole-UI/human language and
assistive approval, real delivery, target provenance and hosted release/rollback/
restore evidence remain open.
