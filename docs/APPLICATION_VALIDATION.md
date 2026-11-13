# Applicant workflow validation

Historical branch evidence. The 2026-11-13 merge combines this branch with main's
integrated application/review and entry implementations. Current contracts and
validation are in [application/review validation](APPLICATION_REVIEW_VALIDATION.md)
and the [checkpoint](../DEVELOPMENT_PLAN.md). File paths and migration counts below
describe the earlier branch revision.

Date: 2026-11-12. Local technical scope: P5-APPLICATION and owning
P5-UI-APPLICATION, plus P4-UI-CORE's pending S01/S02 apply/resume integration.
Prior development-database handoff edits were preserved. No commit, push,
deployment, migration-history rewrite or application-database reset occurred.

## Delivered behavior

- Verified applicants need no representative role for `/applications`,
  `/events/:id/register`, `/events/:id/studio` or canonical `/studios/:studioId`.
  `/representative` opens the same owned application home. Event selection remains
  authenticated; applicant views use active membership, never studio-name matching.
- Exact owner drafts prefill the selected event. Optional profile fields may wait;
  account contact prefills creation. Optional draft ID/revision completion occurs
  atomically with creation, membership and audit. Foreign owner/event, changed
  revision and terminal draft states cannot be consumed. Failure rolls back completion.
- Creation retains operationId and normalized payload through uncertain responses;
  its explicit retry resolves that exact operation. Owned reads reconcile conflicts
  before input is released. Profile/contact edits use the registration revision;
  stale/uncertain writes preserve local fields and require fresh reads/explicit
  replacement. Profile and contact forms do not discard each other's unsaved input.
  Status refresh and acknowledged writes reload account permissions so approval
  or revocation changes are reflected without abandoning the mounted editor.
- Organization/event approvals, next actor, semantic reasons and organizer contact
  remain distinct. Pending cancellation retains identity/history, including after
  the deadline in supported stages. Reapplication uses the same studio and revision.
  Review email links now open the application home, without claiming delivery.
- Roleless pending profile correction keeps ADR-003's open-window policy and resets
  organization approval. Contact editing retains studio.manage, self-member and
  stage checks; account identity is unchanged. Versioned contact writes advance
  revision and append a privacy-minimal correction audit event in the transaction.
- ET/EN/RU controls, native forms, linked validation focus, session recovery,
  readable disabled controls and responsive approval rows use the existing design
  system. No private form data or operation payload enters browser storage. Unsaved
  reload/close and link navigation warn; same-page validation links move focus.

## Validation

Commands run from the root using Node 24 and the pinned pnpm:

| Command | Result |
| --- | --- |
| `pnpm.cmd build` | Passed |
| `pnpm.cmd typecheck` | Passed, including browser TypeScript |
| `pnpm.cmd lint` | Passed |
| `pnpm.cmd test` | Passed: localization guard, API and web tests |
| `pnpm.cmd db:generate` | Passed |
| `pnpm.cmd db:validate` | Passed |
| `pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma` | Passed |
| `pnpm.cmd test:baseline` | Passed: complete isolated database/API suite, including the fake-backed account-to-returning-applicant journey |
| `pnpm.cmd test:browser` | Passed: 147 Chromium tests; subsequent permission-refresh refinement confirmed by all 20 applicant cases |
| Hallmark `sloplint` on applicant/discovery files, app scope, with `--render --url` | Static: 0 FAIL, 0 REFLEX, 0 WARN; render unavailable without puppeteer-core |
| `node --check scripts/check-docs.cjs`, `node scripts/check-docs.cjs`, `git diff --check` | Passed; 115 Markdown files and 762 local links checked |

The isolated baseline creates/drops only its random `dance_baseline_*` database
using the checked-in Compose fixture. Docker required sandbox escalation; the
development database and ignored application connection settings were not used.
There is no model change, so no new migration or separate migration regression
was needed; baseline fresh deployment/redeployment still exercises all 31 migrations.
New regressions cover wrong-owner/event/stale draft consumption, duplicate-name
rollback, stale profile/contact writes and retained independent approval/access.
The fake-backed account-to-returning-applicant journey exercises actual HTTP and
PostgreSQL, using the supported resend path to capture a purpose-bound verification
link in a fake transport; verification secrets remain within its isolated child
process. `node scripts/test-baseline.cjs --registration-only` passed the final
registration/organizer/applicant subset, including this complete journey.

During development the full browser run exposed an unsaved-work guard intercepting
same-page field-summary links; the guard now allows focus navigation. The first
expanded database fixture assumed signup used the recovery fake transport; signup
actually queues encrypted mail. The corrected fixture uses resend before real
token consumption. These were corrected and rerun, not treated as environmental skips.

Chromium synthetic fixtures cover ET/EN/RU at 320/390/768/1440px, language changes,
lost creation response, profile correction, cancellation/reapplication, returning
approval status, stale replacement, empty/read-failure/denied states, stage change,
same-account session recovery, keyboard validation and touch confirmation dismissal.
Ignored screenshots/traces under test-results contain only synthetic data.

Hallmark review runs in-thread under its Codex harness. The project system wins
over a new theme: existing semantic tokens, native controls and shell are preserved.
Screenshot review moved approvals before long event context and repaired disabled
button readability. No image/material slots or invented proof were added.

## Remaining gates and next action

Local delivery does not close external M2. Real inbox delivery, hosted CI/required
checks, intended-target provenance, ingress/operations, deployment/restore and fluent
ET/EN/RU plus assistive-technology review remain release gates. Hallmark's optional
render dependency is absent; Playwright supplies browser/layout evidence.

Next: P3-PERFORMANCE-OWNER, beginning with the explicit studio/event-registration
ownership ADR and contradictory/empty participant audit before any M3 entry UI.
Calendar dates, event-consistent constraints and history/revision designs retain
their gates; this delivery adds no entry/music/live/results or multi-event reuse.
