# Exact scoring model and organizer setup validation

2026-11-21. Scope: P6-SCORING-MODEL and P6-TEMPLATES, with organizer rubric,
category and panel setup. [ADR-004](adr/004-exact-scoring.md) records the accepted
policy; [the scoring contract](api/scoring.md) owns behavior/payloads. The roadmap
and checkpoint own completion. Both selected tasks are complete locally; the
cross-phase live/judge/venue/publication release gates below remain open.

## Delivered implementation

The model adds immutable rubric versions, exact integer criterion values,
event-bound category/panel relations, per-performance assignments, draft and
submission-lock sheets, reasoned paused-queue corrections/deductions/disqualification,
immutable private command receipts and reproducible calculation inputs/results.
Legacy Float scores remain unchanged and outside the new calculation policy.
`normalized-v1` uses rational intermediates, no dropped scores, one final half-up
round to three decimals and shared competition ranks for equal totals.

LIVE entry rechecks current source eligibility and queue conflicts as well as
rubric/panel readiness. START freezes the rubric/panel and initial sheet versions; ordinary ADVANCE needs
all assigned sheets submitted/locked. A reasoned admin override retains missing
sheets and cannot make finalization complete. Reopened missing sheets can be
completed while paused. No operation submits a peer's sheet or publishes results.
Judge-write receipts remain own-sheet-only even for a simultaneous administrator
or moderator; later removal of that additional role cannot expose peer data.

The organizer workbench supplies immutable version inspection/copy, ET/EN/RU
criterion labels/instructions, exact range/step/weight editing and native ordering,
category mapping and session panels. Source-bound preview and explicit confirmation
precede configuration saves. Inactive judges remain visible/removable from future
panels without rewriting started assignments. Local work and exact uncertain
requests survive network/session errors and canceled navigation; comparison is
explicit, and equal scoring revisions do not hide queue/permission changes.

## Implementation and evidence map

| Boundary | Maintained source / tests |
| --- | --- |
| Policy and transport | [ADR-004](adr/004-exact-scoring.md), [schemas](../packages/schemas/src/scoring.schema.ts), [API contract](api/scoring.md) |
| Storage and retention | [Prisma](../apps/api/prisma/schema.prisma), [migration 47](../apps/api/prisma/migrations/20261121010000_exact_scoring/migration.sql) |
| Authorization, exact writes and calculation | [service](../apps/api/src/services/scoring.ts), [math](../apps/api/src/services/scoringMath.ts), [controller](../apps/api/src/controllers/ScoringController.ts), [schedule integration](../apps/api/src/services/schedule.ts) |
| Organizer UI/client/locale | [workbench](../apps/web/src/pages/scoring/ScoringPage.tsx), [styles](../apps/web/src/pages/scoring/scoring.css), [client](../apps/web/src/api/scoring.ts), [translations](../apps/web/src/i18n/scoringTranslations.ts) |
| Behavioral evidence | [exact-math/contracts](../apps/api/tests/scoring.test.cjs), [HTTP/PostgreSQL](../scripts/check-scoring.cjs), [browser](../tests/browser/scoring.spec.ts), [scope matrix](../scripts/check-admin-scope.cjs), [migration parity](../scripts/test-migrations.ps1) |

## Completed checks and limits

| Command | Result |
| --- | --- |
| `pnpm test:focus api scoring.test.cjs` | Three exact arithmetic/rubric/transport tests pass, including rounding boundary, weights/ranges/steps, zero/missing, ties and safe workspace return paths |
| `pnpm test:focus api routes.test.cjs` | 77 route/auth/contract tests pass; 27 global-admin competition operations are inventoried |
| `pnpm test:entry-foundations` | Full affected baseline passed in 70.45s before final provenance/receipt refinements; subsequent isolated scoring and scope checks passed, followed by the final full baseline below |
| `pnpm test:baseline` | Final full disposable baseline passed in 195.92s after the LIVE-entry eligibility regression, including all 47 migrations, upgrade checks, seed preservation/refusal, redeployment and API/domain suites |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1` | Fresh/upgrade/catalog parity passes with migration 47 and retained legacy scores; final locked-value guard included |
| `pnpm db:generate`, `pnpm db:validate`, Prisma `format --check` | Passed; validation used a nonconnecting placeholder URL, not application credentials |
| `pnpm test` | Final full workspace pass: 3 tooling, 8 public-site, 34 web and 143 API tests, plus localization checks |
| `pnpm typecheck`, `pnpm lint`, `pnpm build` | Passed; final typecheck also covers the native-state visual-export helper |
| `pnpm test:focus browser scoring.spec.ts` | Final affected run passes 23 cases in 1.8m: ET/EN/RU at 320/390/768/1440/1920px, invalid drafts/order/focus, uncertain UUID replay, session/navigation recovery, inactive panel repair, version copy and equal-revision queue-state changes |
| `pnpm test:browser` | Clean full run: 440/440 passed in 18.7m |
| Desktop render capture after full browser gate | One case passed in 12.3s after preserving native checkbox/select/textarea state in the synthetic DOM export; no application behavior changed |
| Hallmark static and render | Final confirmation: 0 FAIL, 0 REFLEX, 0 WARN for scoped source plus faithful synthetic rendered DOM at 1280/1440/1920 and phone size |

All database work used runner-created random `dance_baseline_*` or
`dance_migrations_*` databases in the checked-in Compose fixture, with finally
cleanup. Docker Desktop/that fixture were started for tests. The application
database was not inspected, migrated, reset or reseeded. Migration 47 is new,
uncommitted/unpublished work; no applied migration used outside these disposable
fixtures was rewritten.

The first full API run reached the final scope matrix and failed its historical
26-operation assertion after scoring preview added the 27th operation. Both unit
and real HTTP matrices were updated and rerun before the successful full baseline.
The first full browser run passed 418 and failed 19 scoring cases because shared
contracts changed while Vite's dependency bundle was already loaded. The browser
setup now forces fresh dependency optimization on startup; the complete affected
suite passes on the fresh bundle. The subsequent clean full run passed all 440.
No test timeout or assertion was relaxed.

Hallmark uses the established Cobalt tokens, local font stack, semantic controls
and restrained ruled ledger. Automated Chromium captures contain synthetic
records only. Its render tier uses an isolated ignored Puppeteer tooling directory;
no project dependency/lockfile was added or changed. Visual review runs in-thread
under the Codex harness; human/fluent-language/assistive approval remains separate.
No images or material slots are needed.

The canonical documentation checker retains the pre-existing ignored
`.hallmark/pr-body.md` relative-link failure. Its syntax check and final diff
whitespace check pass. Running the same checker in memory with only ignored
Hallmark scratch excluded validates all 162 Markdown files and 1,332 local links; no checker or
scratch-file link was changed. This is a check limitation, not a scoring failure.

Final Git freshness: fetched origin/main 6515dfd and current HEAD f06194f have
identical trees and patch-equivalent schedule history; the authenticated open-PR
inventory is empty. No overlapping migration/contract work requires integration.
All new scoring work remains uncommitted in the current working tree.

## Remaining ownership and release gates

S14 moderator and S15 judge screens, autosave/reconnect/venue/manual fallback
rehearsal remain P6-MODERATOR/JUDGE/RECOVERY. Event setup deliberately keeps live
start/finalization controls disabled until those owning UI workflows arrive,
although the backend now enforces real readiness/completeness. Changing a future
panel does not replace judges on started sheets; unavailable original judges leave
their incomplete sheets visible. An advance override cannot erase that blocker.

P7 retains grouped result review, finalized/public revisions, corrections and
exports. Private calculation snapshots are not public results. Hosted/venue/human
release gates and M5 remain open. No deployment, DNS/cookie change, commit, branch
mutation or push occurred. Next concrete task: P6-JUDGE/S15, beginning with its
P6-RECOVERY reconnect policy before making autosave/offline promises.
