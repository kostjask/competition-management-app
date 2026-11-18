# Local workspace transition and representative entries — 2026-11-17–18

Scope: the actionable local P9-WIX-TRANSITION integration and P5-ENTRIES with
owning S09/S10 and existing organizer review. P9's external cutover task remains
open. This record does not approve a public launch or complete M3.

## Target and integration

The initial working tree was clean on main at ee0bf72. Fetch confirmed equality
with origin/main; all remote branches were merged and the open-PR list was empty.
Implementation validation performed no branch/history/publication, deployment or
application-database mutation. PR publication and merge were separately authorized
on 2026-11-18 after these checks. The existing CMS, public consumers, migrations and organizer entry
work were extended. Final fetch on 2026-11-18 again found HEAD/origin/main at
ee0bf72, divergence 0/0, no unmerged remote branches and no open PRs. No integration was needed.

## Delivered behavior

- Coordinated `/app` router/assets/client/return/onboarding/mail paths, bounded
  legacy GET/HEAD redirects, explicit link locale, document-memory token handling
  and pre-resource no-referrer policy. Cookie Path=/, exact origin/CSRF checks and
  `/api/v1` remain intact. An explicit loopback festival cohost can serve the
  built private workspace beside script-free public HTML. Studio/public-only
  entries retain their separate boundaries. [Routing](api/workspace-routing.md).
- Approved representatives and organizers reach a scoped searchable roster,
  calendar-date editor and impact-confirmed archive. Migration 42 adds positive
  revisions and immutable actor/target/body-bound receipts; create/edit/archive,
  checkpoint invalidation and non-personal audit are atomic. Current studio
  access is checked on receipt replay. [Dancer contract](api/dancers.md).
- S10 creates an acknowledged nullable unscheduled draft, edits title/options/
  duration/credits and native searchable participant selection, restores saved
  drafts and uses existing withdrawal/restore. New scoped context supplies
  options, age date, configured-policy issues and actual field availability,
  including selected-performance corrections, without granting event.manage.
  Existing organizer entry review shares the improved editor. [Context](api/entry-context.md).
- Frozen same-operation retries, authoritative uncertain-save reconciliation,
  explicit server/local comparison, in-place session recovery, failed-read
  preservation, field focus and navigation/unload guards retain local work.
  All new UI text is ET/EN/RU. Draft acknowledgement makes no music, eligibility
  or submission claim; those workflows retain their separate gates.

## Checks

Completed locally:

| Command | Result |
| --- | --- |
| pnpm build | Passed all five workspaces |
| pnpm typecheck | Passed workspaces, seed and browser TypeScript |
| pnpm lint | Passed |
| pnpm test | Passed: 3 tooling, 8 public renderer, 28 web and 133 API tests |
| pnpm db:generate; pnpm db:validate; prisma format --check | Passed |
| pnpm test:entry-foundations | Passed focused HTTP/PostgreSQL entry suites |
| pnpm test:baseline | Passed full isolated baseline again after final migration text, 269.28 seconds |
| powershell -NoProfile -File scripts/test-migrations.ps1 | Passed fresh/upgrade/default preservation/catalog parity for all 42 migrations |
| entries.spec.ts | All 19 cases passed in the final full browser run |
| workspace-transition.spec.ts | Four cases passed; same-origin stylesheet/font assertions included |
| pnpm test:browser | All 339 Chromium cases passed, 17.9 minutes; no failures or retries |
| node scripts/check-docs.cjs; git diff --check | Passed: 147 Markdown files, 1135 local links; final diff clean |

The baseline and migration scripts verify and own randomly named disposable
Compose databases, create their fixtures and remove them afterwards. Initial
sandbox Docker access failed before database work; the same harness then ran
with expanded access. The application connection was not migrated or reset.

New real-database evidence includes duplicate dancer-create replay, changed-body/
actor rejection, stale/concurrent edits, immutable receipt denial, archive replay,
approval/membership/event/parent denials, transactional audit rollback and exact
selected-performance field availability. Existing suites retain age/percentage/
count/duration/nomination/active-participant checks and checkpoint history.
The audit rollback check caught and corrected the new migration's missing dancer
metadata allowance before final baseline success. No old migration was rewritten.

The first full browser run caught a canonical `/app` Vite development base-hint
response and an old organizer fixture missing dancer revision. Both were fixed;
all 14 affected cases then passed before the final full rerun. The Vite test host
now returns synthetic authentication failures for unmatched API requests, so it
cannot contact an ambient development API.

An actual same-origin build was also served by the opt-in loopback cohost.
Chromium verified guest sign-in, local `/app/assets`, exact same-origin profile
401s, legacy verification/token stripping, untouched browser storage and public
root `/et` redirect. No browser/CSP errors remained. This check caught an obsolete
Google Fonts import, which was removed without relaxing CSP; the entry system
already uses local system Latin/Cyrillic fonts. The process used synthetic config
and no application-database access. The ignored application environment files
were preserved; the rehearsal build used a per-process `VITE_API_URL=/api/v1`.

Browser fixtures are synthetic. The entry matrix covers ET/EN/RU at 320, 390,
768, 1440 and 1920px, actual roster/draft/participant saves, leap dates, keyboard
field focus, refresh persistence, scoped correction, network/session/conflict/
archive recovery and unsaved departure. Legacy verification checks actual redirects,
language, canonical application return, explicit verification and absence of token
values in resource URLs/referrers or browser storage. No real email is sent.

## Hallmark and limits

The locked Cobalt app system, local Latin/Cyrillic fonts, tokens, native controls,
ruled tables and sequential phone layout are extended. No invented proof, imagery
or material slots are introduced. The full-redesign direction remains open beyond
this bounded slice. In-thread rendered review found and resolved a misleading
hardcoded lock count, duplicate lock guidance, stretched refresh placement and
singular-count wording. Validation links focus fields without creating native hash
history entries that conflict with router blockers. The confirming 1440px/390px
roster/participant captures have clear hierarchy, working native controls and
sequential phone forms; the in-thread finish review has no remaining findings.
This is a local rendered review, not independent human visual approval.

Static sloplint over the new entry screens/styles and shared editor reports
0 FAIL, 0 REFLEX, 0 WARN. The requested `--render --url` invocation could not run
the Hallmark render tier because puppeteer-core is absent; no library was added.
Existing Playwright supplies actual rendered captures and viewport/keyboard
evidence. Human visual, fluent-language and assistive approval remains open.

P9-WIX-TRANSITION still requires real content exports/rights, archive attribution,
legacy public URL/redirect inventory, domain/DNS/TLS ownership, replacement costs,
hosted ingress/CI/observability/rollback/restore, actual registration handoff and
human acceptance before separately authorized cutover/cancellation. Keep Wix live.
Music model/provider/upload and representative checkpoint submission remain open
M3 prerequisites. The next local queue item after S09/S10 is
P5-APPLICATION-ESTIMATES: revisioned expected counts per actual event-local day.
