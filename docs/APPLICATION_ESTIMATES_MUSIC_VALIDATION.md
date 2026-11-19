# Application estimates and private music model validation

Local evidence, 2026-11-18, based on clean main `cdaaee2`. This report owns the
P5-APPLICATION-ESTIMATES/S06/S08 and P3-MUSIC-MODEL slice. It is not release,
deployment or human visual/language/assistive approval.

## Scope and decisions

- [ADR-027](adr/027-application-estimates.md): complete inclusive event-local
  day/count snapshots, explicit zero, unrecorded legacy applications, revisioned
  owner adjustment and reasoned organizer correction, immutable history/retries.
  Planning never changes independent approvals, entry rows or decision mail.
- [ADR-028](adr/028-private-music-model.md): registration-owned preparation before
  a complete entry, exact performance/current-version relationships, immutable
  validated metadata and command history, independent confirmation/acceptance.
  Transport, configured limits, storage and private delivery remain P8-MEDIA;
  S11/organizer music controls remain P5-MUSIC. No media endpoint was mounted.
- Migrations 43/44 are additive. No applied/published history was rewritten.
  Only runner-created disposable Compose databases were migrated; application
  credentials/data, hosted services, DNS, cookies and Wix were not changed.
- Fetched origin before implementation: HEAD and origin/main matched, all remote
  branches were merged, and `gh pr list --state open` returned no PRs. No branch,
  commit, push or working-tree integration was required or performed.

## Maintained regression coverage

[Estimate HTTP/PostgreSQL checks](../scripts/check-application-estimates.cjs)
cover atomic initial creation and exact-day refusal, zero, scope/active membership,
strict input, stale event/application revisions, immutable actor/body-bound retry,
organizer reason/window rules, deadline denial, changed event dates, concurrency,
safe DTOs, unchanged approval/mail state, audit rollback and retained history.
[Music model checks](../scripts/check-music-model.cjs) cover exact application/
performance ownership, one track per performance, foreign current-version refusal,
metadata constraints, immutable ownership/version/operation history and unchanged
current metadata after failed changes. They establish model constraints, not real
file parsing/storage or private byte delivery.

Shared-contract tests cover DST transitions, leap days, timezone midnight, absent
versus zero, duplicate/negative/fractional counts, private-field exclusion and
separate music transitions. The API operation inventory includes the canonical
estimate PATCH; route authentication and current active account guards apply.

[Browser suite](../tests/browser/applications.spec.ts) extends application/review
checks with ET/EN/RU at 320/390/768/1440px: all actual days, field-linked error
focus, keyboard submit, zero/save/readback, reasoned review/history, unchanged
approvals, locked owner controls and no horizontal overflow. Separate cases cover
same-operation lost response/session restoration and stale comparison/replacement.
Synthetic signup/application checks now supply initial counts.

## Commands and results

- `pnpm.cmd test:focus api routes.test.cjs`: 77 passed.
- `pnpm.cmd test:focus web application-estimates.test.tsx` and
  `pnpm.cmd test:focus web music-model.test.tsx`: two tests each passed.
- `pnpm.cmd test:registration`: passed, including both new database suites
  (27.61s including fixture cleanup).
- `pnpm.cmd test:baseline`: full database/API/seed/upgrade/rollback baseline
  passed against all 44 migrations (429.24s including cleanup, while other checks
  were running; this is not a performance comparison).
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1`:
  fresh/upgrade preservation and exact catalog parity passed.
- `pnpm.cmd build`, `pnpm.cmd test`, `pnpm.cmd lint`, `pnpm.cmd typecheck`:
  passed. Full workspace tests include 32 web and 133 API tests plus the existing
  tooling/localization/public-site checks; unchanged Turbo tasks can use cache.
- `pnpm.cmd db:generate`, `pnpm.cmd db:validate`, and
  `pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma`:
  passed with a nonconnecting placeholder URL.
- `pnpm.cmd test:browser`: all 353 Chromium cases passed (17.7m).
  After the navigation spacing fix and added initial changed-day recovery,
  `pnpm.cmd test:focus browser applications.spec.ts` passed all 46 final affected
  cases (2.8m). The new recovery case also passed separately before that full
  affected-suite run. No 354-case full browser run is claimed.
- Hallmark `sloplint.mjs` on ten feature/foundation files with `--scope app
  --genre modern-minimal --render --url http://127.0.0.1:4198`: rendered successfully,
  0 FAIL, 0 open REFLEX, 0 WARN, two reviewed waivers. Five render-tier screenshots
  cover desktop folds and full desktop/375px pages. The URL serves a script-free
  snapshot of the actual authenticated React workbench and its CSS, not a mock UI.
- Source Markdown UTF-8/fence/whitespace/link/anchor checks passed using the
  unchanged documentation checker with ignored local `.hallmark` scratch excluded.
  The unfiltered `node scripts/check-docs.cjs` finds a pre-existing broken relative
  link in ignored `.hallmark/pr-body.md`; that unrelated scratch is preserved.
  `node --check scripts/check-docs.cjs` and `git diff --check` passed.

## Validation corrections and limits

Initial strict checks caught optional-property typing, a shadowed form submit
handler and mixed React/helper exports; these were corrected and the affected
checks rerun. An intermediate browser run passed 43/45 cases; the two failures
occurred during the helper refactor's Vite hot reload. Both passed the focused
stable-source rerun before the full browser gate.

A later focused database attempt timed out at the API startup health check while
other validation was running. The unchanged disposable runner passed on rerun
(94.44s), including the regression linking initial day errors to `estimates`.
The startup failure is not recorded as a passing command or a domain failure.

The Cobalt design uses existing tokenized controls and no artwork/material slots.
The independent Hallmark finish review found one actionable issue: roster/entry
links relied on another route's CSS and ran together. Local flex spacing and 44px
link targets resolved it; the same phone capture was rerendered and scored
resolved. The real organizer address intentionally wraps at 320px (49b); the
outer document's margin measurement has no visible clipping/bounded-panel crowding
(72). Both Reflex exceptions are recorded in the feature CSS after review.
No Floor waiver is used. Temporary Puppeteer tooling lives outside the repository;
no project library or lockfile changed. An initial sandbox browser startup timed
out; the authorized unsandboxed render completed and generated the reviewed shots.

Initial applications now refresh current event days and owned records after a
definitive conflict without losing studio/contact/count input. This also reconciles
an already-owned application before another creation attempt. Existing uncertain
network/session outcomes still retain the original operation for explicit retry.
Browser fixtures keep decision notices independent from estimate revisions, matching
the real API's no-decision-mail behavior.

## Implementation map

- Shared contracts: [estimates](../packages/schemas/src/application-estimates.schema.ts),
  [music](../packages/schemas/src/music.schema.ts), and the extended registration/review schema.
- Storage: [Prisma](../apps/api/prisma/schema.prisma), additive migrations 43/44,
  and the migration parity inventory.
- API: [registration controller](../apps/api/src/controllers/StudioRegistrationsController.ts),
  [estimate service](../apps/api/src/services/applicationEstimates.ts), review projection,
  canonical route, client helper and operation inventory.
- UI: [initial application](../apps/web/src/pages/applications/ApplyForm.tsx),
  [shared estimate editor](../apps/web/src/pages/applications/EstimatesEditor.tsx),
  calendar-day fields, comparison, scoped CSS and ET/EN/RU catalogue.
- Regression tests: shared web contracts, maintained PostgreSQL scripts, existing
  route guards and the expanded application browser suite.

Real media/provider behavior, configured limits, music deadlines/exception policy,
orphan cleanup/retention, hosted delivery and human language/assistive/visual
acceptance remain future gates. No M1–M5 or public release gate is closed.
Next concrete implementation: **P8-MEDIA**, then P5-MUSIC/S11 and P5-SUBMISSION/S12
in the checkpoint's dependency order.
