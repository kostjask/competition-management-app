# Public studio and festival consumers: local validation

Date: 2026-11-17. Scope: P4-STUDIO-PAGES/S18/F11 and
P4-PUBLIC-PAGES/S19/F02, consuming the existing P4-PUBLIC-EDITOR/S20 CMS.
[Public contract](api/public-pages.md) owns executable behavior;
[roadmap](roadmap/website.md) and [checkpoint](../DEVELOPMENT_PLAN.md) own status.
This report describes the uncommitted working-tree changes based on main d5bc51b,
not deployed software or an application-database migration.

## Starting state and decisions

The working tree was clean. Fetched origin/main matched local main; every visible
remote branch was already merged. GitHub open-PR discovery returned an empty
list. CMS PRs #6/#7 were retained rather than recreated. No commit, branch/history
mutation, push, production deployment, DNS/cookie/host change or Wix cancellation
was performed.

The first two actionable existing tasks were the studio and festival public
consumers, not further organizer administration. Their owning organizer UI is
the already-delivered structured S20 CMS. Public HTML now uses the exact same
published-read service as public JSON, with all locale variants for one HTML
page read in a serializable transaction. No migration or new library was needed:
a new local workspace reuses the existing React/React DOM and shared schemas.

The separate React/Node render build emits readable HTML/CSS without browser
scripts or the authenticated shell/client. An opt-in loopback entry serves one
explicitly configured public surface. This supports local implementation without
colliding with current private paths. ADR-026 records the distinction between
isolated local consumers and the still-required coordinated `/app`/legacy-link
transition before cohosting. Existing private session/mail/return contracts are
preserved; they have not been migrated or declared cohosting-ready.

Added public projection fields are allowlisted contact email/phone independent
of handoff, festival slug/name/summary and edition calendar-date/period summaries.
Linked facts remain canonical. Unlinked calendar dates use Europe/Tallinn for
past/current grouping. No draft identity, entry settings, participant/account,
staff permission or private media path enters HTML. Changing event policy still
suppresses rules/handoff; rights withdrawal still unpublishes affected content.

## Checks and observed results

| Command / scope | Observed result |
| --- | --- |
| `pnpm install --offline --ignore-scripts` | Passed using cached existing packages; workspace/lockfile links updated, no downloads or new library |
| `pnpm build` | Passed for all five workspace packages, including separate public SSR/CSS build |
| `pnpm typecheck` | Passed, including API seed and browser TypeScript |
| `pnpm lint` | Passed repository web ESLint gate; public package also has strict TypeScript |
| `pnpm test` | Passed: 3 tooling, 8 public-renderer, 28 web and 129 API cases, plus translation source guard |
| Focused public renderer / API entry | 8 renderer and 4 public HTTP boundary cases passed |
| `node scripts/test-baseline.cjs --content-only` | Passed CMS, public HTML and cleanup fixtures against a verified random disposable database |
| `pnpm test:baseline` | Passed complete API/PostgreSQL baseline, including public HTML and all existing workflows; 199.14s |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1` | Passed fresh history, existing-data upgrade, preservation and exact schema parity for all 41 migrations |
| `pnpm db:generate` / `pnpm db:validate` | Passed with a nonconnecting placeholder URL for tooling |
| `pnpm exec prisma format --check --schema apps/api/prisma/schema.prisma` | Existing Windows CRLF-only failure; see exact evidence below |
| `pnpm test:focus browser public-pages.spec.ts` | Final 34/34 passed in 44.1s after review/contact refinements, with fresh captures |
| `pnpm test:browser` | Passed 316/316 Chromium cases, zero retries; 16.5m |
| Documentation / whitespace | Passed: 144 Markdown files, 1099 local links, UTF-8/anchors/fences/whitespace and `git diff --check` |
| Target freshness / overlap | Re-fetched origin; main remains 0 ahead/0 behind origin/main, no unmerged remote branch or open PR |

The normal application environment files/database were not reset, reseeded or
migrated. Docker Desktop initially was not running; starting it and the checked-in
Compose PostgreSQL fixture resolved the integration dependency. Every baseline/
migration database was script-owned and removed by its normal cleanup.
After the final portal contact/metadata refinements, the complete workspace checks
were rerun successfully and the focused content database fixture passed again in
42.84s. This last run includes the explicit portal contact regression.

Prisma's source format command exits 1 solely because the current Windows checkout
has 664 CRLF line endings. A formatter run on a scratch copy produces LF with
identical normalized content; that copy passes `prisma format --check`. Comparison
with the schema blob at HEAD proves the original source is unchanged. No schema
rewrite or unrelated formatting correction was included. This is an explicitly
reported tooling limitation, not a claimed pass of the original command.

## Behavior and visual evidence

The public HTML database fixture saves and publishes through the real CMS API.
It checks all 24 localized studio paths, SSR escaping, private draft changes,
public metadata/live sitemap and source-only fallback, current external handoff
with retained contact, festival/edition/archive paths and result attribution,
cross-festival and draft exclusion, rights-approved rasters and immediate page/
asset GET/HEAD withdrawal. Existing private Event/auth/upload boundaries remain.
Existing CMS and full API suites retain canonical-policy, concurrency, audit,
ownership, denied-role and private-media checks. No transaction behavior was
weakened for the new consumer.

The browser matrix exercises ET/EN/RU at 320/390/768/1440/1920px with JavaScript
disabled, real generated HTML/local CSS, skip-link/keyboard focus, responsive
navigation without horizontal overflow, class/teacher/timetable identity links,
edition/section-preserving language links, contact/social/cross-site actions,
registration/rules suppression on policy change and localized 404/503/retry.
It measures actual body/link/muted/primary/focus/control contrast in Chromium.
Synthetic screenshots stay ignored under test-results; no live approved material
or hosted success is inferred from them.

Hallmark uses the locked Cobalt paper/local Latin-Cyrillic font direction. The
opening shows real published timetable or edition facts. The fresh-context hero
review returned `ship`, with no floor finding. The finish review returned `fix`
for competing document/item heading prominence and a lone third directory link.
Both were corrected in one batch: item headings are subordinate and the studio
directory has three balanced columns above its phone stack. Final recapture and
scoring resolve both findings: Russian/English document titles outrank class
titles, and the desktop directory has no orphaned link. The final public rerun
also captures portal contact/social information below the archive. No empty image slots, fabricated photos,
metrics or testimonials were added; approved CMS material is the only content.

The required sloplint `--render --url` invocation ran its static tier. Its own
render tier could not run because optional puppeteer-core is not installed;
Playwright supplies actual rendered/device/keyboard/contrast evidence. This is
not described as a sloplint render pass. The source token-pair warning is a
documented false positive: accent ink is used on the filled action, never key-face.
Final static sweep: 0 FAIL, 0 open REFLEX, 0 WARN, one documented dismissal.
Local-font/content-index exceptions remain recorded in the CSS stamp. Approved
studio portraits and reviewed real class/site copy would most improve the final
material; there are no placeholder image slots to replace in code.

## Changed source

| Area | Files |
| --- | --- |
| Public HTML, routes, translations, CSS/build and unit fixtures | [public-site workspace](../packages/public-site) |
| Opt-in public HTTP boundary and startup | [public app](../apps/api/src/publicApp.ts), [entry](../apps/api/src/public-index.ts), [configuration](../apps/api/src/config/public.ts) |
| Published DTOs and common projection/read policy | [CMS schemas](../packages/schemas/src/cms.schema.ts), [content service](../apps/api/src/services/content.ts), [controller](../apps/api/src/controllers/ContentController.ts) |
| HTTP/database/browser verification | [entry tests](../apps/api/tests/public-pages.test.cjs), [database fixture](../scripts/check-public-pages.cjs), [browser tests](../tests/browser/public-pages.spec.ts) |
| Translation guard and existing CMS fixture alignment | [source detector](../scripts/check-i18n.cjs), [detector regressions](../apps/api/tests/i18n-source.test.cjs), [CMS browser fixture](../tests/browser/content.spec.ts) |

## Remaining release and integration work

Both local page-consumer slices are separate from WEB-STUDIO/WEB-FESTIVAL release.
Next is P9-WIX-TRANSITION's coordinated `/app` router/Vite/assets/client/safe-return/
onboarding/mail/legacy redirect integration, including old queued secret links and
all session/origin boundaries before cohosting. Real studio/festival content,
approved portraits/media/exports, historical edition attribution and disputed URL/
placeholder contact verification remain owner-dependent gates. Do not manufacture
content or republish disputed archives to fill these pages.

Domain/DNS/TLS ownership, actual director-approved registration handoff, hosted
CI/ingress/shared limits, storage persistence, observability, deploy/backup/restore/
rollback rehearsals and human visual/fluent ET/EN/RU/assistive review remain open.
No public release, phase/milestone closure, deployment or cancellation is claimed.
If external access blocks transition work after actionable local integration,
continue the next queued participant slice, P5-ENTRIES with S09/S10.
