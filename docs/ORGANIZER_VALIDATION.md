# Organizer setup and independent review validation

Date: 2026-11-12. Scope: P4-CORE and P4-REVIEW with S05/S06's owning
P4-UI-CORE scope. Source migration 31 is additive. No commit, push, external
deployment or real mail was performed. The previously untracked `.hallmark/`
files were preserved.

## Delivered implementation

- Admin event workspace/create/setup with venue/location, limits, contact,
  event-local dates/timezone/deadline, protected image replacement and linked
  setup recommendations. No new mandatory publication policy or scoring gate.
- Native time inputs reject DST gaps and require an explicit instant for folds.
  Event configuration uses revision conflicts and stage confirmation. Failed or
  uncertain writes retain input and require a server read/compare before retry.
  Uncertain creation directs the organizer to inspect the list before creating again.
- ADR-019 descriptions store an explicitly chosen source language plus optional
  authored translations. All three resolution/fallback outcomes can be previewed.
  Legacy text is retained without inferred language; names/addresses are not translated.
- Event-bound organization/event review filters and detail with separate decisions,
  semantic rejection reasons, next actor, review allowance, authorized contact/billing,
  minimal scoped audit history and independent notification status/retry.
- Both decision types use the same registration revision. Decision, derived access,
  audit and eligible-account notification intent commit atomically. Matching retries
  create no duplicate mail. Recipient identity comes from the linked active verified
  account, not a profile contact field. Queue bodies remain encrypted; provider
  acceptance is explicitly distinct from delivery. Fake mail is labelled test-only.

Contracts: [events](api/events.md), [studios](api/studios.md),
[review/notifications](api/registrations.md#organizer-review-and-notifications).
Runtime/client types are inferred from shared Zod schemas. No new dependency.

Key source owners:

| Scope | Files |
| --- | --- |
| Event contracts/storage | [event schema](../packages/schemas/src/event.schema.ts), [Prisma schema](../apps/api/prisma/schema.prisma), [migration 31](../apps/api/prisma/migrations/20261112000000_organizer_setup_review/migration.sql) |
| Event setup UI | [form](../apps/web/src/pages/events/EventForm.tsx), [setup/recovery](../apps/web/src/pages/events/EventEdit.tsx), [time conversion](../apps/web/src/pages/events/eventTime.ts), [protected images](../apps/web/src/pages/events/EventImage.tsx) |
| Review contracts/API | [shared review DTO](../packages/schemas/src/review.schema.ts), [review controller](../apps/api/src/controllers/ReviewController.ts), [notification service](../apps/api/src/services/reviewNotifications.ts) |
| Review UI/localization | [review page](../apps/web/src/pages/admin/ReviewPage.tsx), [organizer catalogue](../apps/web/src/i18n/organizerCopy.ts) |
| Regression checks | [browser suite](../tests/browser/organizer.spec.ts), [database/API checks](../scripts/check-organizer.cjs), [recipient/encryption unit test](../apps/api/tests/review-notifications.test.cjs) |

## Verification

- Workspace build, strict typecheck and web lint passed during implementation.
- Unit checks passed: 117 API and 19 web tests, including encrypted
  review-recipient/locale and stored-instant precision regressions. The source scan
  passes with zero exceptions; the replaced form's eight stale identifier exceptions
  were removed without allowing new hardcoded application text.
- The full isolated PostgreSQL baseline passed: fresh migration deployment,
  redeployment, full-record seed idempotency, compiled API and all existing suites.
  New organizer checks proved independent approvals, active/event/owner denials,
  stale reviews, duplicate-intent prevention, concurrent decisions and PostgreSQL
  notification failure rolling back the decision/access/audit together. Final
  extension also passed pending/accepted/expired transport guards, retired-owner
  retry denial, strict retry payloads and all 24 global-admin operation matrices.
- Migration regression passed fresh/upgrade/schema parity. An added assertion
  checks that migration 31 never infers language/contact on existing event rows.
- The final full Chromium run passed **127/127** cases, including all 19 organizer
  cases and existing auth/onboarding/staff/role checks. The earlier affected rerun
  passed 58/58 cases. S05/S06 run ET/EN/RU at 320/390/768/1440px, with viewport
  overflow checks and screenshots. New recovery cases cover stale configuration,
  lost decision response, separate saved-decision/expired-notification state,
  explicit DST-fold choice, keyboard stage cancellation and direct-route denial.
  Follow-up cases also exercise review session recovery, separate notification
  retry and a missing selected application. Creation defaults are rounded to the
  displayed minute; edits preserve existing seconds/milliseconds.
  The first broad run exposed old DTO fixtures and disabled-button focus timing;
  both were corrected before the passing affected rerun.
- Hallmark static sweep: **0 FAIL, 1 WARN**. The WARN mistakes the DST candidate
  selection conditional for an unconnected success message; dismissed after source
  review. The tool's render tier did not run because it was given framework sources;
  Playwright supplied the authenticated rendered screenshots instead. In-thread
  finish review checked desktop review and Russian phone setup: fixed the studio
  contact label and explicit missing values. No new image/material slots or invented
  brand/proof assets. Existing semantic palette and operational typography retained.

Screenshots/traces and command logs are ignored verification output, not private
production artifacts. No fluent-language, assistive-technology or hosted release
review is claimed. Final commands passed:

| Command | Result |
| --- | --- |
| `pnpm.cmd build`, `pnpm.cmd typecheck`, `pnpm.cmd lint` | Pass |
| `pnpm.cmd test` | 117 API, 19 web; source scan with zero exceptions |
| `pnpm.cmd exec playwright test` | 127 passed, no skips/retries |
| `pnpm.cmd db:generate`, `pnpm.cmd db:validate` | Pass |
| `pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma` | Pass |
| `pnpm.cmd test:baseline` | Full isolated PostgreSQL/API/seed/migration/queue/image suites pass |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1` | Fresh/upgrade/preservation/schema parity pass |
| `node --check scripts/check-docs.cjs`, `node scripts/check-docs.cjs`, `git diff --check` | Pass |

Docker startup and database checks needed sandbox escalation for Docker's named
pipe. No failed check was relabelled as a pass: test receipts were corrected to
respect the existing email-state constraints and cleaned up within their own
fixture, and a final full run passed after these corrections. A prior password
reset browser timeout passed alone; the final full browser run is the evidence above.

## Development database reconciliation blocker

The API environment target was resolved without printing credentials:
PostgreSQL `localhost:5432/dance_comp`, with Compose publishing PostgreSQL on 5432.
Prisma status found two database-applied migrations absent from this checkout:
`20261110000000_event_setup` and `20261110010000_application_review`.
The checked-in migration `20261112000000_organizer_setup_review` is pending there.
The isolated baseline/database checks above do not have that divergence.

The repository explicitly permits rebuilding this verified disposable local
database. The attempted root command `pnpm.cmd --filter api exec prisma migrate reset --force --config prisma.config.ts`
was nevertheless blocked by Prisma's agent guard requiring fresh user consent.
No reset occurred. A subsequent seed attempt refreshed fixture permissions/roles/
users, then failed while creating the event against the divergent schema. No
successful seed or ready local API runtime is claimed.

Fresh consent was requested; do not bypass that guard or mark the local database
ready. Once permitted, reset/reseed only this verified disposable target and verify
migration status. No migration file was rewritten or removed. Retained/hosted
targets still require their own provenance/rollout checks. Downgrading after use
must preserve authored content and notification history; prefer forward repair.

## Remaining work and next action

Resolve the local database reconciliation above before closing P4-CORE/P4-REVIEW's
local runtime handoff. Then P5-APPLICATION with P5-UI-APPLICATION owns the actual
role-independent application/status/correction/cancel/reapply screens and stage-aware
apply/resume entry actions. P4-UI-CORE stays open for those shared discovery actions
and release review. Entry/scoring/scheduling work remains behind its own gates.
Real inbox, hosted CI/operations and human ET/EN/RU/accessibility gates remain open.
