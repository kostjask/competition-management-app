# M2 organizer review and applicant validation

Implementation: 2026-11-10; completion validation: 2026-11-11. Scope: P4-REVIEW with P4-UI-CORE review and
P5-APPLICATION with P5-UI-APPLICATION, S02/S05–S08/F01–F03/F05.
Working tree started clean. No commit, push, deployment, dependency change or
application-database migration/reset was performed. Migration 32 is additive;
database checks create random disposable Compose databases/schemas and clean them
up. [ADR-021](adr/021-m2-review-notifications.md) owns the contract extension.

## Delivered behavior

- S05 pending counts and S06 organization/event queues use actual authorized
  reads. URL filters retain selected detail and offer show-all recovery. Separate
  decisions, semantic reasons, next actor, contact, review allowance and history
  remain explicit. Confirmation identifies decision and studio. Organization
  decisions invalidate stale event/profile receipts and vice versa.
- Changed decisions atomically persist access reconciliation, immutable audit,
  ReviewNotice and encrypted dispatch intent. Matching retries do not duplicate
  effects. Recipient identity comes from active verified membership accounts and
  saved account locale, never editable contact email. SIMULATED, NO_RECIPIENT,
  QUEUED, RETRYING, ACCEPTED and EXPIRED are truthful, separate from decision save.
  ACCEPTED means provider acceptance only. Pending failures retry automatically;
  expired notifications retain account/contact recovery without repeating approval.
- S07 `/applications` and S08 event application/status/profile/self-contact routes
  work without a representative role. The short form preserves event/language,
  prefills verified draft/contact data and atomically completes the exact draft.
  Guest login/signup retains the selected event; strict returns retain the exact
  selected studio. Optional billing editing and broader entry task summaries are
  postponed; existing billing data/API behavior is preserved.
- Frozen commands survive lost responses and session recovery. Profile/contact
  UI writes use expectedRevision; pending profile corrections reset organization
  verification. Server comparison preserves local input until explicit replacement.
  Acknowledged writes survive failed readback. Confirmed pending cancellation and
  same-studio reapply retain identity/membership/history and obey current windows.

## Validation ledger

Key changes: [application screens](../apps/web/src/pages/applications),
[review/notification service](../apps/api/src/services/reviewNotifications.ts),
[registration controller](../apps/api/src/controllers/StudioRegistrationsController.ts),
[studio controller](../apps/api/src/controllers/StudiosController.ts),
[shared contracts](../packages/schemas/src/studio-registration.schema.ts), and
[additive migration](../apps/api/prisma/migrations/20261110010000_application_review/migration.sql).
The ledger below records the original implementation pass. The completion pass
below supersedes its inherited coverage-test blocker.

| Command | Result |
| --- | --- |
| pnpm.cmd test:focus api routes.test.cjs | 74 HTTP tests passed, including exact-pair review reads and private-field allowlists |
| pnpm.cmd test:focus web applications.test.tsx | 2 application-window/strict-contract tests passed |
| pnpm.cmd test:focus web session-format.test.tsx | 3 tests passed after updating the previously unsupported application return URL |
| pnpm.cmd test:registration | Focused PostgreSQL checks passed, including organization/event races, JSON profile retry, notice/audit rollback, reasons, wrong-event/owner/inactive denials and atomic draft completion |
| pnpm.cmd test:baseline | Full baseline passed twice; final run passed all 32 migrations, upgrade/seed/HTTP/domain/provider-fake checks and cleanup (538.54s under concurrent browser load; earlier run 150.65s) |
| powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1 | Fresh/upgrade preservation and schema parity passed for all 32 migrations |
| pnpm.cmd exec playwright test tests/browser/applications.spec.ts | 21 Chromium cases passed, including 12 locale/width combinations, keyboard confirmation/return focus and synthetic signup-to-returning-applicant journey |
| pnpm.cmd test:browser | 156/156 Chromium cases passed in the final full run (8.6m), after updating the old unsupported-application-link assertion and rerunning that case first |
| pnpm.cmd build / pnpm.cmd typecheck | Passed, including strict browser test TypeScript |
| pnpm.cmd lint | Passed with no warnings after resolving the confirmation-ref cleanup warning |
| pnpm.cmd db:generate / pnpm.cmd db:validate / Prisma format --check | Passed with explicit nonconnecting placeholder URL |
| pnpm.cmd test | Tooling 3/3 and web 22/22 pass; API 116/117 pass, with only the inherited coverage-inventory recognition failure described below |
| Hallmark sloplint with --scope app --genre modern-minimal --render | Static sweep: 0 FAIL/REFLEX/WARN across 13 scoped files. Its render tier has no authenticated HTML/URL, so actual captures come from Playwright |
| Documentation checker / git diff --check | Passed after documentation and final diff review |

The provider-configured foundation child additionally proves encrypted review mail
rollback, ET/EN/RU recipient templates, verified-account exclusion, provider failure
and retry, concurrent worker/idempotency behavior, acceptance and expiry. It uses
an injected provider fake and makes no provider network call.

The final copy-only pass changed profile/contact buttons from the inherited
onboarding “Save draft” text to accurate “Save details”/“Save contact” labels and
shortened definite-error edit recovery. Build/typecheck/lint and the owning
21-case browser file were rerun after these labels. Timings reflect concurrent
workstation load and are not a performance comparison.

## Rendered review

The bounded Cobalt app-screen baseline consumes existing tokens and focuses on
the two-row decision ledger. The fresh-context Hallmark finish reviewer inspected
representative ET/EN/RU review/applicant captures at 320/390/768/1440px. No Floor
violation was observed. Its two findings were resolved: filtered-empty guidance
now explains retained detail and offers show-all; repeated approval guidance was
removed from the event heading. Maintained captures confirm the corrected layout.
No image/material slots exist. Human visual approval is not claimed.

Screenshots/traces contain synthetic data and stay ignored under test-results.
Browser fixtures exercise the real clients/components with synthetic HTTP state;
PostgreSQL independently proves actual relationships, authorization, transactions,
constraints and rollback. These are not hosted/live-provider end-to-end evidence.

## Completion validation — 2026-11-11

The working tree started clean. The next two queued task IDs were P4-REVIEW and
P5-APPLICATION, with their owning UI scopes. The current continuation request
authorizes resolving their recorded validation blocker. No new domain policy,
contract, migration, dependency, deployment or application-database change was
needed.

The focused API test first reproduced the missing invitation-conflict evidence
failure. Its inventory now uses the existing TypeScript parser to recognize
awaited timed-helper and direct suite invocations. Regression fixtures exclude
comments, strings, unused imports, unawaited calls and unrelated helpers. This is
static registration evidence; the full database baseline still must execute.

The browser regression first failed in ET/EN/RU because a studio-name error also
marked the representative name invalid. Profile and contact forms now own separate
errors and summaries, with links targeting their own fields. The browser fixture
now models the real representative response contract and revisioned contact save.
Three new cases prove correct focus, isolated invalid states, no invalid writes
and successful corrected contact readback. This extends the file to 24 cases.

| Command / review | Completion-pass result |
| --- | --- |
| pnpm.cmd test:focus api coverage.test.cjs | 2/2 passed after reproducing the original failure |
| pnpm.cmd exec playwright test tests/browser/applications.spec.ts --grep 'validation focus' | 3/3 passed after reproducing the form error in all locales |
| pnpm.cmd test | Tooling 3/3, web 22/22, API 118/118 passed; localization guard passed |
| pnpm.cmd build / pnpm.cmd typecheck / pnpm.cmd lint | Passed |
| pnpm.cmd db:generate / pnpm.cmd db:validate / Prisma format --check | Passed with explicit nonconnecting placeholder URL |
| pnpm.cmd test:browser | 159/159 Chromium cases passed (8.5m), including all 24 review/application cases |
| pnpm.cmd test:baseline | Full baseline passed on rerun, including all 32 migrations, seed/redeploy, upgrade/HTTP/domain/provider-fake checks and cleanup (349.32s). First run timed out in a fixture SQL subprocess under concurrent validation load, then cleaned up |
| powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1 | Fresh history, upgrade preservation, uniqueness and schema parity passed for all 32 migrations |
| Hallmark sloplint apps/web/src/pages/applications --scope app --genre modern-minimal --render | Scoped static sweep: 0 FAIL/REFLEX/WARN across 11 files. Render tier reports no HTML; authenticated captures come from Playwright |
| Documentation checker / git diff --check | Passed after final documentation and diff review |

Docker Desktop was initially stopped; it and the checked-in Compose PostgreSQL
service were started. Database commands use runner-created disposable targets.
The application database and environment files were not migrated/reset/edited.
No commit, push or deploy was performed.

Hallmark finish review ran in-thread using generated desktop/phone review,
applicant and Russian invalid-form captures. The existing Cobalt app hierarchy,
field error placement, focus and reflow remain coherent; no new visual finding
was observed. No new imagery/material slots or composition were introduced.
This is automated/agent evidence, not human visual or fluent-language approval.

## Open release gates

Real inbox evidence, intended-target scope provenance, hosted CI/ingress/
deployment/rollback/restore/observability and human visual/fluent ET/EN/RU/
assistive review remain external M2 release gates. Full-UI redesign remains open
for the shared shell, auth/staff and other workflows. This slice does not implement
entries, billing editing, music, multi-event identity/reuse, live or results work.

P4-REVIEW/P5-APPLICATION and their owning UI scopes are complete locally.
Next: P3-PERFORMANCE-OWNER before dependent M3 entry contracts/UI. No external
milestone is closed by these local checks.

To use these changes against the application database, apply the additive migration
through the normal verified local setup process, regenerate Prisma and restart the
API. This task validated deployment into disposable fixtures and did not change
that application target or its environment files.

## Merge reconciliation, 2026-11-13

Resolved PR #3 against main 8c622cc. Main's integrated organizer/application
contracts, authored-content storage and M3 ownership/calendar/history/draft work
are retained. Compatible branch improvements include verified onboarding
continuation, representative application home, revisioned event images and
explicit transport retries. A Windows case collision between Application.css and
application.css is resolved to the lowercase file used by the integrated screens.
Historical branch reports remain labelled in the evidence index.

Migration 37 extends main's ReviewNotice/EmailDelivery model with private recipient
bindings and retained superseded transport attempts. Global-admin-only retry checks
the exact event/studio/notice and current active verified membership. Only expired
attempts are replaced. Accepted/unexpired attempts, review decisions/revisions and
unsaved UI forms are preserved. Browser checks include ET/EN/RU at 320/1440px,
keyboard pending/error recovery, lost response and expired-session continuation.
Image readback updates the setup revision while preserving mounted input, or
shows the normal comparison if other configuration changed concurrently.

The user confirmed the removed duplicate branch migration was unpublished and
used only by disposable development/test targets. Existing main migrations were
preserved. Database validation used isolated fixtures during this reconciliation.
A database previously reset to the parallel branch history
needs a verified-target disposable reset/reseed before running this source.
Historical queue rows without recipient bindings retain status and cannot be
retargeted by the new retry operation. Provider checks used synthetic mail,
and hosted deployment remains an external gate.

| Command | Result |
| --- | --- |
| `pnpm.cmd test:focus api routes.test.cjs` | 77 passed |
| `pnpm.cmd test:focus browser applications.spec.ts` | 30 passed before the additional lost-response/session case |
| `pnpm.cmd exec playwright test tests/browser/applications.spec.ts --grep 'uncertain notification'` | 1 passed |
| `pnpm.cmd test:focus browser event-setup.spec.ts` | 27 passed |
| `pnpm.cmd test` | 3 tooling, 121 API and 26 web tests passed, localization source check passed |
| `pnpm.cmd build`, `pnpm.cmd typecheck`, `pnpm.cmd lint` | Passed after resolving the updated privileged-operation count and unused destructuring lint errors |
| `pnpm.cmd db:generate`, `pnpm.cmd db:validate`, `pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma` | Passed |
| `pnpm.cmd test:baseline` | Full isolated PostgreSQL/API, 37 migrations, seed/redeploy, retry concurrency/rollback/recipient isolation and image revision checks passed |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1` | Fresh/upgrade/schema parity passed |
| `pnpm.cmd test:browser` | Final local run passed all 204 tests after the first run exposed the filter-refresh/session-expiry fixture race |
| `pnpm.cmd exec playwright test tests/browser/performances.spec.ts --grep 'uncertain draft saves preserve' --repeat-each 5` | 5 passed after explicitly awaiting the filtered table before expiring the fixture session |
| `pnpm.cmd exec playwright test tests/browser/applications.spec.ts --grep 'organizer dashboard shows independent' --repeat-each 5` | 5 passed with selected-detail navigation awaited before filter changes |
| Fresh full browser/workspace/PostgreSQL gates | Recorded by the pushed resolution's [PR checks](https://github.com/kostjask/competition-management-app/pull/3/checks) |

The fixture stabilization waits for observable loaded state and retains all
uncertain-write/session assertions. It changes the test sequencing only.
The first hosted workspace runs also exposed a review-navigation race in the
dashboard test. It now waits for the selected application's heading before
changing the queue filter and explicitly asserts that selection remains in the URL.
Documentation syntax/link checks and final Git whitespace checks passed.

External release/human-review gates remain open. The next recorded task is
P3-ENTRIES submission/receipt/correction lifecycle in the checkpoint.
