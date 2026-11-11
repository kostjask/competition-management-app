# Performance ownership and constraint validation

Date: 2026-11-11. Scope: P3-PERFORMANCE-OWNER and P3-CONSTRAINTS, with the
read-only organizer ownership register. Local technical evidence only; no M3
entry editing/submission, whole-UI approval or external release is claimed.

## Delivered behavior

- [ADR-022](adr/022-performance-ownership-and-constraints.md) and migration 33
  store immutable performance studio/registration ownership. Compound keys enforce
  studio/registration/configuration event consistency and participant studio
  membership independently of HTTP validation. Restrictive actions preserve owners,
  participant identity and scores. Empty participant sets retain an explicit owner.
- Legacy preflight audits all retained performances under write-blocking table
  locks. It backfills only nonempty single-studio sets with a matching event and
  registration, or atomically refuses the migration. Empty/mixed/missing/cross-event
  owners require reviewed repair. No prior migration was edited.
- Row CHECKs enforce event date ordering/positive optional limits, nonnegative
  ordered age bounds, positive ordered format counts/duration, and positive
  performance duration/order. Calendar age eligibility, overlap, drafts and
  submission snapshots remain their owning tasks.
- [Canonical API/DTO/client](api/performances.md) reads explicit owners; writes
  validate current active ownership/approval/stage and selections in serializable
  transactions. The server derives registration identity. Ownership cannot be
  transferred through PATCH or direct SQL. Conflicting writes return 409.
- Global admins open `/admin/events/:eventId/performances` from event details.
  The Cobalt register shows titles, studio applications and participant counts;
  URL studio filters, labelled phone rows, loading/empty/error/retry and session
  recovery work in ET/EN/RU. No dancer personal details, invented music/submission
  status or premature entry editor are displayed.

## Database target and migration evidence

Verified repository Compose `dance-postgres`, PostgreSQL 16, localhost port 5432.
The baseline used its own random `dance_baseline_*` database; migration checks used
random schemas in the repository fixture. Each runner cleaned up only its own
targets. No application database migration, reset/reseed, remote action, commit,
push or deployment occurred. Old migration history remains unchanged.

`pnpm.cmd test:baseline` passed all HTTP/PostgreSQL suites (234.96s), including:
explicit empty ownership, denied parent/studio/approval/inactive/stage cases,
direct SQL row/key/owner violations, unchanged rejected records, concurrent create
conflicts, nested participant rollback and archived participant/score preservation.
Fresh migration deploy/redeploy, full-record seed idempotency and previous
foundation/onboarding/staff/application/image checks passed too.

`powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1`
passed fresh/upgrade/schema parity. Upgrade fixtures preserve performance IDs,
participants, score values and registration decisions. Seven whole-migration
subtransaction probes prove refusal and DDL/data rollback for empty/missing/mixed/
cross-event owners, foreign configuration and invalid age/event bounds.

The first baseline exposed Prisma rejecting a duplicate studio key in nested
participant creation. The corrected nested write inherits that key from its
parent; focused API and the full baseline then passed. The first unprivileged
Docker attempt was sandbox-denied; escalation allowed the isolated checks.

## UI and workspace validation

- Focused canonical API routes: 74 tests passed before the additional
  missing-registration regression (included in the final full API suite). Coverage inventory: 2 tests passed after
  redirecting renamed inactive-record evidence to the actual database suite.
- Focused Chromium: 17 cases passed, covering ET/EN/RU at 320/390/768/1440/1920px,
  keyboard focus, literal title rendering, empty/filtered lists, URL reload,
  loading/error/retry without stale rows, role/API denial and session recovery.
- Hallmark static sweep: 0 FAIL, 0 REFLEX, 0 WARN over both new UI files.
  The requested render attempt reports missing `puppeteer-core`; no dependency
  was added. Authenticated Playwright screenshots supply rendered evidence instead.
  Fresh-context finish review inspected desktop/wide/phone captures, accepted the
  ruled ownership register, and requested ledger-shaped loading placeholders.
  Those placeholders were implemented; the full suite captured and passed the
  revised loading state, and the capture was visually inspected.
  No external imagery/material slots are needed.
- Prisma generation, validation and format check passed. Final `pnpm.cmd build`,
  `pnpm.cmd typecheck`, `pnpm.cmd lint` and `pnpm.cmd test` passed: 119 API tests,
  22 web tests, 3 tooling tests and the i18n source guard.
- Documentation checks passed; checkpoint/owning-roadmap reconciliation and final
  diff review preserve the two-task scope and keep the broader M3/UI/release gates open.
- First full browser run: 175/176 passed, including all 17 register cases. An
  existing English staff-removal focus assertion failed; the exact case passed
  independently (1/1) without code changes. The standalone final
  `pnpm.cmd test:browser` rerun passed all 176 cases (8.5m), including the staff
  assertion and all register captures. No staff behavior or test was changed.

Initial browser failures were fixture errors (invalid next actor and confusing
the UI `studio` filter with HTTP `studioId`), corrected using the shared schema.
No product behavior or gate was weakened to accommodate them.

## Remaining work

Next: P3-HISTORY defines submitted participant/studio/configuration snapshots,
revision conflicts and correction provenance. P3-CALENDAR-DATES also precedes
P3-ENTRIES, P4-ENTRY-CONFIG and entry editing. Shared-shell redesign, fluent
language/assistive/human visual review, real mail, intended-target provenance and
hosted release/rollback/restore gates remain open. Rollback/retained-target repair
requires coordinated reviewed migrations, never reconstructed ownership guesses.
