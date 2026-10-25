# Validation and continuous integration

Run commands from the repository root with Node 24 and the pnpm version pinned
in package.json. On Windows PowerShell, use pnpm.cmd in place of pnpm.

## Workspace checks

```text
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:validate
pnpm exec prisma format --check --schema apps/api/prisma/schema.prisma
pnpm build
pnpm typecheck
pnpm lint
pnpm test
git diff --check
```

Prisma configuration needs DATABASE_URL even for checks that do not connect.
For those checks, an explicit placeholder such as
postgresql://unused:unused@127.0.0.1:1/unused is sufficient. Do not replace an
existing application environment file. Build/typecheck cover the four workspace
packages and the API seed. Lint currently covers web only. The API uses Node's
built-in test runner against the compiled application; pnpm test builds its
dependencies first. The web test script uses the existing tsx runner for Node tests and static React
component rendering. No interactive browser test infrastructure is claimed.

Turbo may reuse unchanged local results. To run fresh HTTP tests after building,
use pnpm --filter api test. In CI each job begins with a fresh checkout and
installation; the workflow does not restore build outputs or a Turbo cache.

## Development database and disposable data

User-confirmed baseline (2026-10-25): the current project development database
contains only disposable test data; no real user or production data needs
preservation. Development tasks may adjust the schema/model, reset/reseed this
database and replace fixtures to improve the project. Prefer a clean model over
legacy compatibility or data-conversion work needed only to retain these rows.
This is standing authorization within the selected task, not an instruction to
reset a database during every task or this documentation update.

Before a destructive operation, verify the resolved host/port/database/schema or
Compose project/service/volume identifies the intended disposable target. Inspect
connection details locally without printing passwords, URLs containing secrets or
private records. If the target cannot be established, resolve that uncertainty
before proceeding. The statement does not authorize deleting other databases,
environments, source changes or unrelated files.

Use new migrations by default. A migration applied only to confirmed disposable
environments may be replaced/reworked when unpublished and unused elsewhere;
reset/rebuild the target and regenerate Prisma/fixtures consistently. Do not infer
publication/deployment state from the local database containing test data. Keep
fresh-install/parity and applicable upgrade/rollback tests meaningful, and report
the reset/reseed and migration strategy in the handoff.

Roadmap references to preserving identity, credentials, history or ambiguous data
describe required domain behavior and safeguards for retained/non-disposable data;
they do not require retaining the current test rows or building unnecessary legacy
transition machinery. Use synthetic fixtures to test the required invariants.
Reassess and update this policy before real data or a non-disposable deployment is
introduced; production retention, backup/restore and deployment gates remain open.

## PostgreSQL checks

Start the repository's local PostgreSQL 16 service and build before testing:

```text
docker compose -f docker/docker-compose.yml up -d postgres
pnpm db:generate
pnpm build
pnpm test:baseline
```

Run the separate migration regression suite from PowerShell:

```powershell
./scripts/test-migrations.ps1
```

Windows PowerShell can also use
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1.
PowerShell 7 (pwsh) runs the same script on Linux. The script selects pnpm.cmd on
Windows and pnpm elsewhere.

The baseline runner uses only the checked-in Compose fixture, creates a random
dance_baseline_* database, deploys/redeploys migrations, checks full-record seed
idempotency and production-seed refusal, and starts its own compiled API on a
temporary port. It runs registration, dancer, performance, studio, judge, category,
format/age-group and invitation
HTTP/database workflows, event DTO/persistence and concurrent partial-date
checks, and auth/profile DTOs with real global/event roles. Category checks include
strict CRUD, scoped reads/admin writes, cross-event parents, name conflicts and
competing creates, plus deletion preserving active/archived performances. Setup
checks preserve duplicate labels, nullable ages and valid concurrent partial ranges.
Invitation checks cover real scoped/global acceptance, concurrency and rollback.
Scope-integrity checks additionally race direct global/event role and invitation
writes, restrict deletion with assignments or invitation history, and replace
expired links concurrently without losing old records. The baseline's isolated
upgrade schemas verify full-field role/invitation preservation and atomic refusal
of ambiguous legacy duplicates. Migration parity compares both scope SQL-only
indexes exactly as well as Prisma-derived columns and foreign keys.
Email-identity fixtures also verify canonical email upgrades, full-field preservation,
account/global/event invitation collision refusal and direct-write checks under
ADR-009. Migration parity includes the SQL-only canonical email CHECK constraints;
HTTP workflows exercise case/space variants and duplicate-account preservation.
Token fixtures cover legacy plaintext removal/link invalidation, account/access/
invitation-history preservation, purpose/expiry/replay/rotation/revocation,
concurrent verification/recovery, inactive/changed-email denial and real database
failure rollback after token claim. Recovery primitives run against the disposable
database; they are not public endpoints. The SQL-only outstanding-account-token
unique index is included in migration parity. Secret-free development and failed
production email stubs have unit regressions.
Schema-audit fixtures additionally validate six token storage CHECKs, refusal of
each invalid preexisting state with all checks rolled back, full-record valid
upgrade preservation and direct SQL rejection. Expired account-token fixtures
retain a positive historical issuance/expiry interval. Exact parity now includes
the SQL-only active-studio-name index without excluding it from signatures.

For reproducible schema suitability and synthetic query-plan evidence, run
`node scripts/audit-schema-fixture.cjs` with the Compose PostgreSQL service running.
It creates a random schema in the checked-in dance_comp fixture database, applies
all migrations, loads synthetic data and prints only catalog/plan metadata, then
drops its own schema. It never reads application environment files or application
rows. This one-off audit is separate from normal CI baseline checks; it does not
establish production latency or deployment parity. Findings and current results:
[schema audit](SCHEMA_SUITABILITY_AUDIT.md).
It stops its server
and drops its own database in a
finally block. The migration suite creates random schemas in dance_comp, checks
fresh and existing-data upgrades, status/default/data preservation, the partial
active-studio-name index and schema parity, and removes its schemas/temp SQL.
These commands fail if Docker/PostgreSQL is unavailable; there is no skip-success
path. They do not reset the application database or use its credentials.

## GitHub Actions

[CI workflow](../.github/workflows/ci.yml) runs for pushes, pull requests and
manual workflow dispatch. It has read-only repository permissions, disables
persisted checkout credentials, and cancels superseded runs for the same ref.
It uses Node 24 and the repository-pinned pnpm version through the official
[setup-node](https://github.com/actions/setup-node) and
[pnpm action](https://github.com/pnpm/action-setup).

The two independent jobs are:

- **Workspace checks:** frozen installation, Prisma generation/validation/format
  check, build, typecheck, current lint, existing tests and whitespace checking of
  the triggering commit (or PR merge against its first parent).
- **PostgreSQL migrations and workflows:** frozen installation, generation/build,
  PostgreSQL readiness, migration regression checks through pwsh, and the baseline
  HTTP/database suite. Missing database infrastructure or any failed command fails
  the job; no job or check uses continue-on-error.

The database job combines the regular Compose file with
[the CI override](../docker/docker-compose.ci.yml), which adds a bounded health
check and disables restarts. A unique COMPOSE_PROJECT_NAME scopes the run's
volume/network; calls inside both scripts inherit it. All data/credentials are
disposable fixtures. The runner scripts clean up their own fixtures; an always
step also tears down the CI project and its volumes after failure or cancellation.
That volume-removing step is intended only for disposable hosted CI runners,
not the developer's persistent Compose project. A hard runner termination can
prevent finally/always cleanup; GitHub-hosted runner disposal is the final boundary.

Both jobs have 15-minute timeouts. No application secrets, environment files,
database dumps, request tokens or private records are uploaded as artifacts.
Configure both named jobs as required checks in branch protection if merge gating
is desired; workflow creation does not change repository settings.

Local workflow validation uses the official
[actionlint](https://github.com/rhysd/actionlint) release, plus docker compose
config --quiet for the merged files. A passing local check is not evidence of a
hosted run. The initial hosted run and branch-protection configuration remain
operator follow-up after the workflow is published.

## Phase 1 coverage and localization gate

pnpm test first runs pnpm test:i18n, a TypeScript AST source guard against new
hardcoded JSX text/accessible attributes. Existing reviewed exceptions are in
[i18n-hardcoded-baseline.json](i18n-hardcoded-baseline.json); they remain I18N-UI
work. The detector itself has a regression test. Do not regenerate this baseline
to hide new strings; translate them or document a specific intentional-content
exception. Catalogue completeness, placeholder and native plural checks run for
ET/EN/RU in the web test task. Typecheck also exercises invalid key/argument cases.

The current suite has 76 API tests and 8 frontend tests. Frontend checks include
all-locale component renders of the same stored error, field links, selector
semantics, network/non-JSON/multipart/204 handling, response-schema failures and
safe legacy/future fallback. Shared validation preserves root/nested rules and
bounds without input values. These are static component/transport checks, not
interactive browser, keyboard/mobile/screen-reader or fluent-language review.
Those remain per-workflow release checks under I18N-QA and P9-BROWSER.

[api-coverage.json](api-coverage.json) inventories 56 mounted method/path operations
and their test evidence/non-applicable or Phase 2 exceptions. Tests compare runtime
router registration to the inventory and reject unauthenticated access to every
protected operation. /health and static files are infrastructure exceptions.
The coverage inventory does not imply complete authorization hardening: upload
ownership and invitation existing-account/scope policy are still Phase 2 gates.

## Incremental UI/UX acceptance and visual regression strategy

Planned infrastructure, not a claim of installed browser/screenshot tooling.
Start P9-BROWSER/P9-UI-REGRESSION with P2-UI-FOUNDATION/SHELL, then extend alongside
each functional slice; do not wait for the final quality phase. Use
[UI_UX](UI_UX.md) S01–S17 contracts, [USER_FLOWS](USER_FLOWS.md) F01–F10 acceptance
and [DESIGN_SYSTEM](DESIGN_SYSTEM.md) component states as test identifiers.

| Layer | Evidence and scope |
| --- | --- |
| Existing unit/API/database checks | Keep current contract, authorization, ownership, stage, transaction, migration and localization checks. Browser visibility never replaces backend negative tests. |
| Interactive components | Add meaningful form submission, field/summary focus, dialog cancel/restore, navigation/role gates, keyboard selection and async status tests with the first shared/auth UI slice. Extend score/file/table behavior when those components arrive. |
| Browser user flows | M2: eligible signup → real/fake-provider verification → apply → independent admin approvals → returning roleless/approved status. M3: roster/entry/music/submit/scoped correction. M4: new/existing/wrong/inactive-account staff acceptance and access removal. M5: schedule → moderate → assigned scoring/autosave/submit/lock → publish/public view. Use provider fakes in CI; real email staging remains a separate release gate. |
| Recovery and abuse cases | Invalid fields, cross-event/studio URLs and commands, inactive/removed membership, expired session/link, stage/deadline change mid-edit, lost mutation response, repeated action, offline/reconnect and stale revisions as applicable. Assert authoritative result and preserved work, not only a success toast. |
| Visual regression | Reviewed synthetic state fixtures for phone 390px plus 320px reflow, portrait tablet 768px and desktop 1440px; ET/EN/RU including long labels. Cover default/focus/invalid/loading/empty/error/denied/locked and live reconnect states per component/page. Stabilize clock/data/fonts, disable nonessential animation; never put private dancer/contact/billing data or tokens into screenshots/artifacts. |
| Accessibility and language | Automated semantics/contrast checks plus manual keyboard, screen-reader announcements, focus restoration, touch, zoom/reflow/text-spacing and fluent ET/EN/RU review. Verify locale switching preserves work and displayed feedback, calendar birth dates do not shift and event timezone is explicit. Target complete delivered processes at WCAG 2.2 AA; snapshots alone cannot establish conformance. |

Select the smallest appropriate browser/visual tool during implementation based
on the concrete coverage gap; no new dependency is authorized merely by listing
this strategy. Check in reviewed baselines only after inspection. A visual change
must be explained and approved through normal code review; do not blindly update
all snapshots to make CI pass. Keep behavior, permission and golden calculation
assertions independent of screenshots. Record revision, S/F ID, role, locale,
viewport, browser/device, network fixture and manual-review evidence for each
released milestone. Exact runner commands and CI jobs must be documented when
the infrastructure is implemented, not invented as passing commands here.


## Audit correction evidence

The [audit correction map](AUDIT_FOLLOWUP.md) links each finding to its owning task
and required cases. For each correction, record finding/task ID, revision,
permitted/denied scenarios, exact commands/results and verification limits. Add
a failing-before-fix regression where practical and confirm it passes with the
fix. Convert synthetic audit probes into maintained tests; do not change the
baseline to accept a vulnerability.

Security cases need HTTP boundary tests plus isolated PostgreSQL checks when
identity/role/token consumption, migration, concurrency or rollback is involved.
Use synthetic accounts/files; assert rejected requests leave credentials, tokens,
access, records and media unchanged. Content checks include accepted-image HTTP
retrieval behavior, not only MIME declarations. Never log real secrets.

Interactive guards/navigation/forms need browser evidence for direct URLs,
wrong-account/event, expiry, retry and delivered loading/error/empty/success/
disabled states. Include keyboard/focus and ET/EN/RU coverage, then required
manual review. Existing static tests do not satisfy browser evidence; provider
fakes do not replace real staging delivery evidence.

Close an owning task/finding only after required implementation, tests, migrations
and docs are complete. Record containment separately from a full fix; keep
deployed-data provenance, hosted CI and unperformed human/browser checks open.

## Documentation-only changes

Run from the repository root:

```text
node --check scripts/check-docs.cjs
node scripts/check-docs.cjs
git diff --check
```

The dependency-free checker validates repository Markdown UTF-8, local file links,
Markdown heading/explicit anchors, code fences and trailing whitespace. It skips
generated/dependency directories and external URLs; it does not validate external
websites, domain truth or every Markdown extension. Review changed claims against
source, preserve task IDs/status and inspect the final diff separately.
Application build/typecheck/lint/tests and Prisma/database commands are not required
for prose/link changes alone; run them when executable behavior/contracts change.
Historical runtime reports are not fresh validation.

Feature tests stay with their owning tasks: lifecycle/stage permissions, age/date/
format eligibility, exact scoring/ties, permission aggregation; API identity/scope/
ownership, rollback/conflict/archive/restore and media compensation. Add browser
journeys incrementally from signup/verify/apply/approve to entries, staff and live
results. No unrelated future feature needs to be tested before its implementation.
