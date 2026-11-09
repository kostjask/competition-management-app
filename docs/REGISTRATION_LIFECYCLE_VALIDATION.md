# M2 registration lifecycle validation

Date: 2026-11-09. Local technical delivery for the three selected queued scopes:
P3-REGISTRATION, P3-REGISTRATION-REAPPLY and I18N-CONTENT's M2 policy/contracts.
The existing working tree contained earlier staff/preference/planning edits; those
were preserved. No commit, application-data reset or deployment occurred.

## Delivered behavior and decisions

- ADR-003 accepts the M2 actor/state/window/correction/retry/audit matrix. Existing
  stages remain; API rejects backward/skipped/live transitions. Current event
  editor sends expectedStage and offers only allowed M2 targets.
- Event timeZone defaults to UTC; nullable registrationDeadline is an explicit UTC
  instant. A non-null cutoff is exclusive and must not follow startsAt. Admins
  also obey application windows. Existing dates are never reinterpreted.
- Organization/event decisions can occur in either order. Both approvals derive
  representative access; reversal retains assignment history and preserves access
  through another qualifying studio in that event. Reapproval restores the row.
- Pending profile corrections need ownership/window rather than a role. They
  increment application revision and reset organization approval to pending so
  stale review conflicts. Existing admin profile override is explicit.
- Cancellation retains CANCELLED registration/history. Same canonical POST accepts
  studioId/revision to reapply the exact studio/event, retaining membership and
  identity. Revisions prevent an old cancellation affecting a new application.
  Initial creation optionally binds UUID operationId to creator/normalized request
  digest for safe retries; callers without it must reconcile GET before retrying.
- Shared DTOs include revision/reason and explicit next actor. M2 reasons/statuses/
  fallback notices have ET/EN/RU catalogue copy. Private retry bindings stay private.
- ADR-019 and shared AuthoredContentSchema/resolveAuthoredContent define declared
  source language, optional authored translations and explicit source fallback
  with actual lang. Existing descriptions are preserved. P4 owns storage/editors;
  future rubric/announcement translations are not implemented.

Migration 20261109000000_registration_lifecycle is new; existing migration history
is unchanged. It adds cancellation enum, event timezone/deadline and registration
revision/reason/private retry fields, plus SQL-only guards/audit allowlists. There
are 30 migration directories. Existing IDs, decisions, memberships, timestamps and
historical audit remain. Used cancellation/audit history must be retained during
rollback; do not downgrade the enum or discard attempts to roll back binaries.
Revision input/DTO additions require coordinated migration/client rollout.

## Completed commands

| Command | Result |
| --- | --- |
| pnpm.cmd db:generate | Pass |
| pnpm.cmd db:validate | Pass |
| pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma | Pass |
| pnpm.cmd build | Pass, all four workspaces |
| pnpm.cmd typecheck | Pass, workspaces, API seed and browser TypeScript |
| pnpm.cmd lint | Pass, configured web ESLint scope |
| pnpm.cmd test | Pass, localization guard, 116 API + 17 web tests; Turbo reused unchanged dependency tasks |
| node scripts/test-baseline.cjs --registration-only | Pass, isolated registration workflows |
| pnpm.cmd test:baseline | Pass, complete isolated PostgreSQL/API baseline |
| powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1 | Pass, fresh/upgrade history, preservation and exact schema/SQL-only parity |
| pnpm.cmd test:browser | Pass, all 108 Chromium fixture cases |
| UTF-8/local Markdown target check | Pass, 189 local link targets |
| git diff --check | Pass |

Docker's Linux engine was initially unavailable. Restarting Docker Desktop restored
it; final database commands passed. An early migration SQL syntax error and an
invalid role-update field were corrected before the final successful runs. Early
failed attempts are not recorded as successful validation.

The database runner uses the checked-in local Compose service, random
dance_baseline_* databases and random migration schemas, and cleans up its own
fixtures. It does not read application environment credentials or migrate/reset
application tables. The development database's disposable-data authorization was
not used for an application reset or migration rollout.

## Regression coverage and limits

check-registration-lifecycle.cjs extends the maintained full baseline. It proves
both approval orders, role restoration/removal with retained rows, another studio's
access preservation, stale review after profile correction, exact IDs/membership
across cancel/reapply, duplicate/lost-response/concurrent operations, wrong owner/
event/inactive membership, admin/deadline/stage denials, private DTO projection,
direct SQL guard rejection and rollback when audit fails during create/correction/
decision/cancel/reapply/event transitions. Existing uniqueness, nested-write,
missing-role and cross-event tests remain. Original handlers were not separately
executed against the new tests; no failing-before-fix runtime result is claimed.

registration-policy.test.cjs covers cutoff equality and Tallinn DST instants,
explicit-offset/fold distinction, timezone validation, allowed/stale stage changes,
and all-locale authored fallback contracts. registration-contracts.test.tsx checks
ET/EN/RU copy and actual content language. Browser fixtures cover existing auth,
preferences, event/session/role and staff journeys at their maintained widths;
they do not claim unbuilt application/review screens. The event stage selector
change introduces no new visual layout or authored content editor.

Key changed files are the Event/Studio/StudioRegistrations controllers,
registrationPolicy service, migration/schema, shared event/studio/registration/
audit/content contracts, studio API helper and event form/edit client, catalogue,
regression scripts/tests and linked domain/API/flow/roadmap/checkpoint docs.

## Remaining work and next action

No local technical blocker remains for the selected scopes. P3-UX-CONTRACTS and
I18N-CONTENT umbrellas remain open for later workflow/entry/content implementation.
P3 itself and M2 external release remain open. P4/P5 must deliver setup controls,
independent review/application/status/correction UI, notification intent and browser
recovery. Human ET/EN/RU/assistive review, hosted scope provenance, real inbox,
CI/ingress/deployment/restore evidence remain external release gates.

Next: P4-CORE with P4-UI-CORE setup scope, consuming ADR-003/019; then P4-REVIEW
with review UI, then P5-APPLICATION with applicant UI. No scoring or multi-event
identity work is promoted ahead of this M2 path.
