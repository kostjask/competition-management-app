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
component rendering. Playwright Chromium checks delivered foundation, session,
auth/onboarding/invitation, account-language and staff slices with synthetic data;
remaining application/domain journeys extend P9-BROWSER.

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

The [baseline runner](../scripts/test-baseline.cjs) uses only the checked-in
Compose fixture. It creates a random dance_baseline_* database, deploys/redeploys
migrations, verifies full-record seed idempotency/production refusal and runs its
compiled API on a temporary port. It stops that server and drops its database in
finally. Application database credentials/environment files are not used/reset.
The fixture raises login/general limits to 500/2000 per window for repeated hostile
operations; boundaries.test.cjs independently verifies low configured limits.

The runner composes resource and identity/scope/audit/onboarding/staff/registration
HTTP/PostgreSQL checks. Use its child-script list and the
[operation inventory](api-coverage.json) to locate a selected suite, rather than
loading every past report. SQL-only indexes/CHECKs/functions/triggers must retain
exact fresh/upgrade parity alongside Prisma columns/foreign keys. Synthetic
fixtures cover invalid-upgrade refusal, unchanged denied records, history,
concurrency, rollback, expiry/replay and current authorization. Specific dated
results are in the [evidence index](DEVELOPMENT_HISTORY.md#evidence-index).

For reproducible schema suitability and synthetic query-plan evidence, run
`node scripts/audit-schema-fixture.cjs` with the Compose PostgreSQL service running.
It creates a random schema in the checked-in dance_comp fixture database, applies
all migrations, loads synthetic data and prints only catalog/plan metadata, then
drops its own schema. It never reads application environment files or application
rows. This one-off audit is separate from normal CI baseline checks; it does not
establish production latency or deployment parity. Dated findings/results:
[schema audit](SCHEMA_SUITABILITY_AUDIT.md).
The migration suite creates random schemas in dance_comp, checks
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
  check, build, typecheck, current lint, Node/localization tests, Playwright Chromium
  installation/browser tests and whitespace checking of
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

pnpm test first runs pnpm test:i18n, the TypeScript AST guard against new hardcoded
JSX/accessible text. [Reviewed exceptions](i18n-hardcoded-baseline.json) are not
permission to regenerate a baseline to hide new strings. Translate new UI or
document a specific intentional-content exception. Catalogue completeness,
placeholders, plurals and invalid key/argument typechecks cover ET/EN/RU.
[LOCALIZATION](LOCALIZATION.md) owns dictionary/presenter conventions.

[api-coverage.json](api-coverage.json) owns the mounted operation/test mapping;
counts belong to the inventory or a dated run, not a second current tally here.
Runtime registration and unauthenticated-operation checks guard inventory drift.
/health uses an infrastructure shape; private image GET is separately tested in
the image baseline. globalAdmin evidence is enforced by HTTP and isolated
check-admin-scope.cjs fixtures, including immediate access removal and safe
preflight. P2-SCOPE-DEPLOY still needs intended-target provenance.

Security/content, identity eligibility and recovery checks live in maintained API
unit tests and baseline child scripts. Use synthetic accounts/secrets/files,
assert denied requests preserve credentials/access/records/media, test accepted
image retrieval as well as MIME, and keep raw secrets within the test process.
check-image-boundaries.cjs deletes only its verified temporary storage root;
client images must use canonical API-origin paths without redirects/credential
query parameters. Static/contract checks do not replace browser/human workflow
review or real staging delivery. Scope-specific runners are linked below.

## Incremental UI/UX acceptance and visual regression strategy

Playwright infrastructure exists; [browser checks](#browser-and-foundation-checks)
own runner commands and delivered scope. Extend P9-BROWSER/P9-UI-REGRESSION alongside
each functional slice; remaining strategy below does not claim future coverage. Use
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

Extend the existing runner for concrete coverage gaps; no new dependency is
authorized merely by listing this strategy. Check in reviewed baselines only after
inspection. A visual change must be explained and approved through normal code review; do not blindly update
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
generated/dependency directories (including Playwright test-results/reports) and external URLs; it does not validate external
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

## Browser and foundation checks

Run `pnpm exec playwright install chromium`, then `pnpm test:browser`. CI installs
Chromium with its OS dependencies. Playwright global setup owns an in-process Vite server on
127.0.0.1:4177, refuses an occupied port and closes it after the run, avoiding
Windows shell/process-tree teardown. Browser test TypeScript is checked strictly
by tsconfig.browser.json as part of pnpm typecheck. The dev-only
/__fixtures/foundation route uses synthetic data and makes no API mutations.
Twelve ET/EN/RU cases cover 320/390/768/1440px, keyboard summary/field focus,
input preservation across language switches, disabled/busy states, overflow and
computed palette values. Thirteen additional role cases cover ET/EN/RU at all
four widths, exact-key/global/event/permission gates, keyboard denial recovery,
direct URLs, guest and expired sessions. The development-only scoped access
fixture uses the normal auth provider with intercepted synthetic profiles; browser
setup pins a same-origin API independent of ignored environment files. Screenshots/traces remain ignored under test-results.
Web unit checks measure semantic color pairs; visual fixture review supplements
these checks. This is initial Chromium coverage, not screen-reader/fluent review
or evidence for unfinished auth/application/scoring journeys.

Session/shell checks are in browser-session.test.cjs, session-format.test.tsx and
shell-session.spec.ts. The original session/shell scope includes 46 Chromium cases (67 in the complete
onboarding/invitation suite below):
foundation, role guards, ET/EN/RU shell/profile/navigation at four widths, expiry
recovery preserving mounted input, cross-tab verification/logout, offline failure,
explicit verification continuation, safe event returns and UTC editing from a
non-UTC browser zone. No private records or real link/session secrets enter artifacts.
Browser API URLs are pinned to same-origin /api/v1, independent of ignored env files.

The baseline additionally runs check-browser-session.cjs against its isolated
migrated database. It proves cookie/native transport, caller-only revision and
immutable audit, failure rollback, concurrent logout, other-account preservation
and immediate inactive denial. Cookie writes require an exact fixture Origin and
CSRF header. Production Secure/host-only attributes are checked separately in a
configuration-isolated child. No hosted HTTPS rollout is implied.

The full baseline additionally invokes scripts/check-foundation.cjs in an isolated
child with injected Resend-shaped provider credentials and a random encryption
key. It makes no provider network calls. PostgreSQL proves immutable audit and
bidirectional rollback, draft retry/cancel/verification retention, no intent grants,
role/studio FKs and scope denial, and durable encrypted queue rollback/retries,
worker concurrency, fixed provider request bodies and stale/expired cancellation.
See [current evidence](PHASE_2A_VALIDATION.md).

## Public onboarding and invitation lifecycle checks

routes.test.cjs covers generic signup bypass, strict owner commands and privileged
invitation command validation. The complete baseline runs check-public-onboarding.cjs
and check-invitation-lifecycle.cjs against its random isolated database: atomic
account/draft/token/audit rollback, no grants/session, owner isolation, retries,
stale/concurrent edits, verified recovery, retained cancellation, inactive denial,
resend invalidation, concurrent CAS, rollback, revoke history and expired replacement.
The expanded global-admin denial matrix covers all 20 operations. Migration 29
only extends the audit action CHECK; fresh/upgrade parity includes it.

onboarding-invitations.spec.ts adds ET/EN/RU signup/pending recovery at four widths,
local-work preservation, language switching, wrong-account sign-in/explicit
acceptance, neutral recovery, reset/link stripping, terminal/new-account invitation
and mobile administrator lifecycle controls. Synthetic screenshots remain ignored.
No real mail or human screen-reader/fluent-language review is claimed.

## Staff acceptance, offboarding and account preferences

The baseline runs check-staff-access.cjs and check-account-preferences.cjs against
its random isolated database. They prove Judge/role reconciliation across existing
combinations, one-winner acceptance, transactional audit/consumption rollback,
scoped/global-admin removal, concurrent/idempotent removal, retained Judge/Score
history, unchanged other-event access, denied restoration, strict self-only locale
writes and concurrent recipient isolation. The admin denial matrix now covers 22
operations. Route tests also enforce supported staff roles and preference contracts.

account-preferences.spec.ts adds 16 Chromium cases for ET/EN/RU at four widths,
keyboard save, 320px reflow, failure/retry/input preservation, disabled pending
state, account/browser/session precedence, clear, login/logout and a fresh tab's
persisted preference. Combined with the existing suite this is 83 cases. Stored
invitation locale/provider template checks remain in the foundation baseline.
Human fluent-language and screen-reader review, real inbox and hosted scope/rollout
evidence remain release gates. See [staff/preference evidence](STAFF_PREFERENCES_VALIDATION.md).

## Event staff administration (S17/F06)

staff.spec.ts extends the browser suite with event staff state/permission matrices,
four-width ET/EN/RU layouts, native modal safe focus/Tab/Escape/restore, retained
input through language/session changes, invite/resend/revoke/accept/remove in
separate tabs, removed and missing-assignment history, pending controls, conflict
refresh, lost removal responses and acknowledged mutations with failed readback.
All browser data/links are synthetic; PostgreSQL remains the proof for real
transactional history and authorization. The complete suite has 108 cases.

The baseline's check-staff-access.cjs now additionally verifies the global-admin
read DTO, missing event, guest/staff/scoped-admin denial, other-event exclusion,
removed/missing-Judge/unavailable-account states, accepted history and exact public
field allowlists. That dated staff slice covered 22 global-admin operations;
the organizer extension below brings the current inventory to 24. No schema or
migration change was needed for staff UI. [Staff UI evidence](STAFF_UI_VALIDATION.md) records
commands, reviewed screenshots and remaining human/real-mail/hosted release gates.

## M2 registration lifecycle checks (2026-11-09)

The following registration evidence predates the organizer slice. Current
organizer checks are described in the section below.

Start narrow with node scripts/test-baseline.cjs --registration-only after build.
It uses the same random disposable database/cleanup and seed checks as the full
baseline, and now runs check-studio-registrations, check-registration-lifecycle
and check-organizer.
It does not replace pnpm test:baseline or fresh/upgrade migration parity. New checks
cover independent approvals in both orders, retained assignments, correction
revisions, cancellation/reapplication races and stale/lost responses, event scopes,
admin/deadline denials, direct SQL constraints and audit rollback. No application
database or environment file is migrated/reset. Failure reporting prints stack
frames without assertion snapshots or environment values.

## Organizer setup and review checks (2026-11-12)

After building, run `pnpm test` and `pnpm exec playwright test tests/browser/organizer.spec.ts`.
The organizer suite covers ET/EN/RU at four widths, native date/DST selection,
keyboard stage confirmation, independent decisions, stale/uncertain saves,
session recovery and separate expired-notification retry. Unit checks exercise
DST gaps/folds, stored instant precision and encrypted account-recipient language.
The full browser suite includes the existing auth/staff/role checks; do not rebuild
or modify source concurrently with it, since Vite reload can invalidate stripped
one-time-link fixture state. Screenshots/traces remain ignored under test-results.

`pnpm test:baseline` now invokes `scripts/check-organizer.cjs`: event content/contact/
revision persistence, active/event/owner/global-admin denials, independent decisions,
shared stale revisions, matching retries, notification deduplication, decision races,
PostgreSQL notification/audit rollback, transport-state/retry guards and private-field
exclusion. The global-admin matrix includes both new review operations and snapshots
notification/dispatch rows when asserting denied-write preservation. Fixtures remove
only their own synthetic transport receipt before the separate queue-worker suite.
Run migration regression for fresh/upgrade/schema parity and retained unknown-language
legacy content. [Organizer validation](ORGANIZER_VALIDATION.md) records these isolated
checks and the completed disposable development-database reset/reseed/runtime verification.

## Applicant and discovery checks

`pnpm.cmd test:browser tests/browser/applications.spec.ts` exercises S07/S08 and
P4-UI-CORE's S01/S02 integration with ET/EN/RU at 320/390/768/1440px. It covers
verified draft prefill, field-summary focus, locale preservation, frozen uncertain
create retries, both approval rows, corrections, cancel/reapply, returning status,
stale replacement, changed owner drafts, closed stages, expired-session recovery,
empty/read-failure/denied states, permitted contact writes and touch confirmation.
The full browser command also protects existing organizer/auth/staff/shell slices.

`pnpm.cmd test:baseline` includes the extended registration/studio regression
scripts plus `check-applicant-journey.cjs`. The latter uses an isolated child,
fake verification delivery and the baseline's random disposable database for
signup → verification → exact draft application → independent admin decisions →
returning login/status. Secret verification values stay in memory. Draft ownership,
event/revision denial, failed-create rollback and stale profile/contact writes are
checked in PostgreSQL; browser fixtures do not replace these backend assertions.
There is no new migration for this slice. [Evidence](APPLICATION_VALIDATION.md)
records actual results and the separate provider/hosted/human release gates.
