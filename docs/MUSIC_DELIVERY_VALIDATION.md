# Private music delivery validation

Date: 2026-11-19. Scope: P8-MEDIA and P5-MUSIC with S11, organizer music
configuration/acceptance/correction and P8-UI-PROVIDERS' music acceptance slice.
Owning contracts: [music](api/music.md), [ADR-028](adr/028-private-music-model.md),
[ADR-029](adr/029-private-music-delivery.md). No M3 or external release is claimed.

## Integration and implementation

Started with a clean `main` at `846fc7f`, tracking `origin/main`. Fetch confirmed
zero divergence, no unmerged local/remote branches and no open PRs. No merge,
branch/history mutation, commit, push or deployment was performed. The previous
checkpoint's `cdaaee2` integration statement was stale after merged PR #9; current
implementation includes both estimates and the music metadata prerequisite.

Migration 45 adds revisioned event music policy, correction windows, durable
staging and the extended immutable audit allowlist. Prior migrations remain
unchanged. Bytes stay outside PostgreSQL, under an explicit private local volume;
there are no new dependencies, object-store credentials or public media routes.
API and loopback-workspace entries validate provider startup and run cleanup.
No application environment file was inspected or edited, and no application
database was migrated or reset.
Only runner-created random Compose PostgreSQL databases and verified fixture
storage roots are created/removed. Docker Desktop was started for those checks.

The backend checks exact active application/studio/performance relationships,
current eligibility/session/global-admin assignment, policy and music window at
commit, including after multipart staging. Receipts bind actor/body/content hash;
executed uploads reconcile after policy changes. New commands pin revisions and
current versions. Content-derived MP3/PCM WAV metadata, range delivery, no-store,
retained previous versions and retire-before-delete staging recovery are covered.
Accepted music does not approve the application or entry. Prepared tracks do not
grant roster/configuration permissions.

## Checks

Completed during implementation:

- Focused parser tests: 2 passed; strict WAV chunks/sample metadata, MP3 frames/
  variable rates, truncation, active content and oversized tags.
- Private provider startup test: relative/public paths refused; explicit private
  volume write/delete probe passed without retained-file deletion.
- Commit-time authority unit regression: revoked session/eligibility and removed
  global-admin provenance fail closed.
- `pnpm test:registration`: passed with actual multipart/private byte ranges,
  PENDING roleless preparation, foreign event/studio/entity denials, exact retry,
  changed actor/body, concurrent replacement, failed/invalid replacement,
  confirmation/acceptance/reopening, independent deadlines, immutable audit
  rollback and cleanup with live/retained objects and failed external deletion.
  A request streamed across account deactivation returns 401 and preserves the
  current version. Configuration and policy changes retain conflict semantics.
- Safe-return/cohost checks cover S11 and bounded performance/track selections;
  the workspace CSP permits only same-origin private audio. No DNS, ingress,
  cookie scope or public-content access was changed.
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1`:
  fresh history, existing-data upgrade and exact catalog parity passed with all
  45 migrations.
- `pnpm test:focus browser music.spec.ts`: 20 Chromium checks passed, including
  ET/EN/RU at 320/390/768/1440/1920px, current-file persistence, native WAV playback,
  no autoplay, failed replacement, same-operation recovery, immediate cancellation,
  session restoration, organizer configuration and separate acceptance/correction.
- `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm lint`: passed on the final
  implementation. The final API unit run passed all 137 cases; root tooling/
  localization, public-site and web suites passed. Unchanged Turbo tasks may use
  local cache; affected builds/tests executed after their source changes.
- `pnpm test:baseline`: passed, including music, all existing API/domain suites,
  fresh deployment, seed preservation/idempotency, migration redeployment and
  fixture cleanup (199.88 seconds on the final broad run). A later byte-exact
  signature parser regression failed before its fix and passed after rebuilding;
  the full 137-case API unit suite then passed with that fix.
- `pnpm test:browser`: 373 passed and one interrupted case failed during the
  shared return-path update's Vite restart (19.6 minutes). With source stable,
  `pnpm exec playwright test --last-failed` passed that exact case. All 374 cases
  therefore passed across the full run and targeted rerun; this is not a claim
  that the initial full invocation exited successfully.
- `pnpm test:focus api email-foundation.test.cjs` and
  `pnpm test:focus api workspace-links.test.cjs`: 4 passed each. The first reruns
  a subprocess timeout from the earlier loaded run; the second verifies music
  return paths, hostile query rejection, cohost routing and same-origin media CSP.
- `pnpm db:generate`, `pnpm db:validate` and
  `pnpm exec prisma format --check --schema apps/api/prisma/schema.prisma`: passed
  with a nonconnecting placeholder database URL for configuration-only checks.
- Final `git diff --check`: passed. Final fetch again matched HEAD/origin/main,
  with no unmerged local/remote branch or open PR overlap.
- `node scripts/check-docs.cjs`: task-owned links/UTF-8 checks are clean, but the
  repository-wide invocation exits 1 for the sole pre-existing ignored PR scratch
  link described below. It is not reported as a passed whole-repository gate.

Resolved failures: an incomplete synthetic representative fixture; private
dot-directory playback denied by Express; a stale 25-operation inventory count;
and cancellation being unavailable before the first progress event. A byte-exact
magic regression caught Node's ASCII decoder masking high bits; lossless signature
comparison fixes it. A loaded baseline migration subprocess and existing email
provider test timed out; their serial reruns passed. Each failing suite was rerun
after correction or removal of the demonstrated runtime interruption. No unresolved
change failure is hidden.

## Main changed sources

| Area | Review entry points |
| --- | --- |
| Contracts | [Music](../packages/schemas/src/music.schema.ts), [safe returns](../packages/schemas/src/return-path.ts) |
| Persistence | [Schema](../apps/api/prisma/schema.prisma), [migration 45](../apps/api/prisma/migrations/20261119000000_private_music_delivery/migration.sql) |
| API | [Controller](../apps/api/src/controllers/MusicController.ts), [authorization/policy](../apps/api/src/services/music.ts), [upload middleware](../apps/api/src/middleware/music-upload.ts) |
| Private bytes | [Storage/cleanup](../apps/api/src/services/musicStorage.ts), [bounded parsers](../apps/api/src/services/musicAudio.ts) |
| UI/client | [Workbench](../apps/web/src/pages/music/MusicPage.tsx), [client](../apps/web/src/api/music.ts), [translations](../apps/web/src/i18n/musicTranslations.ts) |
| Regressions | [Real API checks](../scripts/check-music-delivery.cjs), [browser checks](../tests/browser/music.spec.ts), API parser/provider/authority tests |

## Hallmark and rendered checks

The locked Cobalt app system is retained; no theme deal, marketing hero, imagery,
invented proof or material slots were introduced. Static `sloplint --scope app
--genre modern-minimal --render` over the two new screen files reports 0 FAIL,
0 REFLEX and 0 WARN. Its own render tier did not run: no authenticated URL was
provided. Rendered evidence instead comes from real Playwright app screens;
this is not a claim that Hallmark's render tier passed.

The fresh-context Hallmark reviewer inspected source and localized phone/desktop
screenshots, then scored one correction round: **ship; 3 resolved, 0 partial,
0 unresolved**. Short Russian labels remain on one line at 320px, compact paired
phone facts preserve filename/date readability, and translated receipts name
the acknowledged action. Confirmation's replacement lock stays adjacent to its
short control. Human visual/language/assistive acceptance remains open.

Screenshots are reproducible, ignored outputs beneath `test-results/music-*`:
selected/ready music in each locale/width, organizer correction, and organizer
policy at 320px. They contain synthetic identities/files only. The full browser
suite regenerates these paths; they are not committed source artifacts.

## Remaining release limits and next action

The repository-wide documentation checker also sees an existing ignored
`.hallmark/pr-body.md` scratch file whose relative validation link is broken.
That pre-existing private PR scratch is preserved; it is not a task-owned document.

No real festival limits or production volume were configured. Actual content/
recording quality, human ET/EN/RU/assistive approval, durable hosted storage,
capacity/shared limits, ingress/cookies/CI, backup/restore and deployment evidence
remain release gates. Frame/chunk validation is not an audible-quality guarantee.
Committed versions remain retained; operational-image durable cleanup and future
object providers are separate delivery-hardening work. There are no image slots
or missing artwork; real organizer policy and representative recordings are the
material needed for a real event.

Next product task: P5-SUBMISSION/S12, consuming the delivered entry/music APIs to
build the field-linked blocker review, explicit studio-wide lock confirmation,
durable submission receipt and scoped correction/resubmission. M3 stays open.
