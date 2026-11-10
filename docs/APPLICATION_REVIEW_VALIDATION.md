# M2 organizer review and applicant validation

Date: 2026-11-10. Scope: P4-REVIEW with P4-UI-CORE review and
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
The owning roadmaps/checkpoint keep completion open for the inherited test gate.

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

## Open gates

The inherited coverage test checks for direct require calls in the baseline, which
already uses a timed check(name, context) helper. Both patterns are present in HEAD
before this task. Thus invitation conflict evidence is reported missing even though
the registered check-staff-access suite executes in the full database baseline.
Repository instructions prohibit unrelated fixes without a request; authorization
to correct this test-only recognition mismatch was requested. P4/P5 implementation
is delivered, but their completion checkboxes remain open until this required
workspace test gate is resolved.

Real inbox evidence, intended-target scope provenance, hosted CI/ingress/
deployment/rollback/restore/observability and human visual/fluent ET/EN/RU/
assistive review remain external M2 release gates. Full-UI redesign remains open
for the shared shell, auth/staff and other workflows. This slice does not implement
entries, billing editing, music, multi-event identity/reuse, live or results work.

Next: resolve the inherited test gate and finish local P4/P5 validation; then
P3-PERFORMANCE-OWNER before dependent M3 entry contracts/UI. No external milestone
is closed by these local checks.

To use these changes against the application database, apply the additive migration
through the normal verified local setup process, regenerate Prisma and restart the
API. This task validated deployment into disposable fixtures and did not change
that application target or its environment files.
