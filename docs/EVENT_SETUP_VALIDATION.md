# P4-CORE event setup validation

Local implementation, 2026-11-10. Covers S05/F05 organizer setup plus S01/S02
owning event list/detail scope. Review queues, application forms and external M2
release remain open. No commit, push or deployment was performed.

## Delivered behavior

- Organizer dashboard prioritizes incomplete setup. Event create/setup editors
  cover venue/location, business contact, timezone, deadline/no-cutoff, limits,
  optional authenticated image upload and multilingual description editing.
- Shared contracts and migration 31 add contact, explicit description source/
  translations, positive revision and privately bound creation retry metadata.
  Existing prose retains its exact text with unknown language until classified.
- Backend requires active global admin writes, validates all input and resulting
  dates, enforces actionable opening prerequisites and ADR-003 forward transitions,
  and atomically audits changes. No scoring or automatic capacity gate is added.
- Revisioned saves and UUID-bound creation retries prevent stale overwrites and
  duplicate creation after uncertain responses. UI input survives errors, locale
  and session recovery. Reconciliation compares the server copy before explicit
  replacement/rebase; no silent mutation replay occurs.
- Event-zone wall time rejects DST gaps and requires offset selection at folds.
  Descriptions preview ET/EN/RU resolution, label fallback and render plain text
  with actual lang. Event discovery remains authenticated; P5 owns apply/resume.
- Hallmark Cobalt establishes the bounded app-screen direction in [DESIGN](../DESIGN.md).
  Readiness/lifecycle rail, ruled event index and fact-sheet composition replace
  the selected placeholder screens. Other workflow/shell redesign remains P9.

## Checks

| Command | Result |
| --- | --- |
| pnpm.cmd db:generate | Passed, Prisma Client 7.10.1 |
| pnpm.cmd db:validate | Passed |
| pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma | Passed |
| pnpm.cmd build | Passed, four workspace packages |
| pnpm.cmd typecheck | Passed, including seed and browser tests |
| pnpm.cmd lint | Passed |
| pnpm.cmd test | Passed: 116 API and 19 web tests, catalogue/source checks |
| pnpm.cmd test:baseline | Passed, isolated random migrated database, seed idempotency and complete HTTP/database suites including check-event-setup.cjs |
| powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1 | Passed fresh/upgrade/schema parity; includes retained event-prose/no-inferred-language regression |
| pnpm.cmd test:browser | Final run result recorded below |
| Hallmark sloplint on event pages, tokens/foundations and dashboard with --scope app --genre modern-minimal --render | Static sweep clean: 0 FAIL/REFLEX/WARN; authenticated rendering is verified by Playwright screenshots, not the static render tier |
| node --check scripts/check-docs.cjs; node scripts/check-docs.cjs; git diff --check | Final results recorded below |

Database tests prove missing readiness fields leave records/audit unchanged;
unknown/invalid fields, missing revisions, guests/staff/scoped admins and stale
writes are denied; source-language classification and nullable contact/content
persistence work; matching retries do not audit/write again; concurrent creation/
updates have one winner; other events stay unchanged; failing audit rolls back
content/contact/stage/revision/creation; direct SQL rejects invalid content and
revision shapes. Existing registration/access/history suites still pass.

Twenty-two new Chromium cases cover all three locales at 320/390/768/1440px,
setup/save/open/close/cancel, keyboard dialog wrap/Escape/restore, linked errors,
DST gap/fold offset selection, language fallback/plain-text escaping, retained
legacy prose, stale/unknown responses, failed readback, session/language recovery,
disabled pending mutations, private image recovery and direct URL/guest denials.
Computed text/button/rail pairs meet 4.5:1 and necessary field borders meet 3:1.
Screenshots use synthetic data only and are ignored under test-results; final
phone/tablet/desktop compositions are inspected separately from automated checks.

Checks found and fixed native dialog focus-restoration timing, explicit Tab wrap,
and disabled/enable color treatment that briefly reduced button contrast. A
synthetic image fixture was corrected to use the client's required WebP response.
No baseline was weakened to accept these failures.

## Database and rollout

The application connection was checked without credentials: localhost:5432,
dance_comp/public, mapped to this repository's running dance-postgres Compose
service. The additive migration was applied there with
pnpm.cmd --filter api exec prisma migrate deploy --config prisma.config.ts;
all 31 migrations are applied. No reset, reseed, description rewrite or applied
history edit occurred. Docker inspection initially hit sandbox access denial;
the authorized escalated read succeeded. Isolated baseline/migration suites use
their own random database/schemas and clean up only those test resources.

Restart any previously running API so it loads the rebuilt contracts/code. New
clients require coordinated API rollout; older writers do not enforce revisions
or preserve authored translation semantics. [ADR-020](adr/020-organizer-event-setup.md)
records retention and rollback implications. No hosted target is migrated.

## Remaining gates and next work

Human visual approval, fluent ET/EN/RU and assistive/screen-reader review remain
open, along with real inbox, intended-target scope provenance, hosted CI,
ingress/limits, deploy/restore/observability and the rest of P9-UI-REDESIGN. Automated
Chromium and fake-backed database evidence do not close these external gates.

Next: P4-REVIEW with S06/P4-UI-CORE review scope: independent organization/event
queues and detail, safe decisions/reasons/next actor and transactional notification
intent with truthful delivery/recovery. Then P5-APPLICATION with its applicant UI.
