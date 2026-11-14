# Entry recovery and nomination setup

Date: 2026-11-14. Scope: P3-ENTRIES reversible withdrawal/resubmission and
P4-ENTRY-CONFIG option creation/reusable nomination preset, with their S12
organizer UI. [ADR-025](adr/025-entry-submission-lifecycle.md) records decisions;
the roadmaps/checkpoint own completion. This evidence does not close M3 or any
external release gate.

## Delivered behavior

- Canonical DELETE accepts a strict, reasoned WITHDRAW command; POST `/restore`
  restores the same performance identity. Current access, exact event/owner,
  expected revision, immutable actor-bound UUID and terminal/deadline/lock rules
  apply. The older query-revision DELETE keeps its established 204 behavior.
- Withdrawal is allowed before the basic deadline despite early confirmation.
  Restore is a structural membership write requiring normal access or explicit
  whole-studio `entries` reopening. Organizer authority never bypasses active
  participants/studio/configuration. Submission/review remain separate actions.
- Both transitions capture immutable revisions, invalidate acceptance and retain
  receipts, owner, participants, reserved stage order and scores. Retry returns
  its original acknowledgement after current access checks without repeating a
  transition, including after a later action. Audit failure rolls back everything.
- The register has an active/withdrawn URL filter, history access for retained
  entries, confirmed reasons, stale-state comparison, session/lost-response retry,
  acknowledged readback recovery and keyboard focus return. Draft state survives
  filter changes. Withdrawn-empty guidance identifies the active-state filter.
- Rules save new options and nominations atomically. Supplied existing IDs must
  match their event and values; new options freeze with published rules. Batched
  relationship reads validate complete tables without one query per combination.
- The confirmed Dance Express copy supplies 10 categories, six age bands, four
  formats and 182 allowed combinations. Kids groups use 210 seconds, standard
  groups 240, solo/duet 150; big groups are unbounded above seven. Overlapping age-7
  bands and configured checkpoint windows are retained. Values remain ordinary
  editable event options. A personal preset library is outside this task.
- Cobalt/native controls, ET/EN/RU, category/age nomination filters and new option
  creation remain in the existing organizer scope. Discarding a conflicted draft
  also discards unsaved option IDs. No media/music/billing/scoring work is added.

## Migration and preservation

Additive migration 39 makes DanceFormat.maxParticipants nullable and adds
PerformanceOperation, restrictive actor/performance foreign keys, immutable
operation/revision validation and RESTORE provenance/audit support. Existing
finite format values and immutable snapshots are unchanged. No migration history
is rewritten, reset, reseed, backfill or destructive source/Git operation is used.
Rollback requires reviewing any new unbounded formats and retained operation
history; do not drop evidence tables to make an old application fit.

Fresh/retained-data upgrade and exact SQL/Prisma parity checks passed. The test
runners create only owned random disposable databases/schemas and clean them up.
The resolved ordinary target was verified without credentials as
localhost:5432/dance_comp, public. `pnpm.cmd db:migrate` applied migration 39
successfully (39 migrations total), without reset/reseed. The baseline's API
health/login/profile checks belong to its isolated fixture; no persistent
application server restart or external deployment is claimed.

## Validation

- Focused API routes: 77 passed after adding archived to the explicit DTO assertion.
- Preset/contract unit cases: 2 passed; full web suite: 28 passed.
- Workspace test: 121 API cases, 28 web cases, 3 tooling cases and I18N gate passed.
- `pnpm.cmd build`, `pnpm.cmd typecheck`, `pnpm.cmd lint`, `pnpm.cmd db:generate`,
  `pnpm.cmd db:validate` and Prisma `format --check` passed. Turbo reused unchanged
  dependency tasks; affected source builds/tests executed.
- Focused PostgreSQL: withdrawal/restore/resubmission, current membership/parent
  denials, deadlines, scoped structural locks, changed/stale/concurrent commands,
  immutable old receipts/operations, nullable snapshots and audit rollback passed.
  The final focused run also persisted all 182 nominations and their options.
- `pnpm.cmd test:baseline` passed in 162.42s: full migration upgrades/refusal,
  full-record seed idempotency/production refusal, redeployment, API health/login,
  all resource/auth/scope/audit and entry workflow/recovery suites, then cleanup.
- `pnpm.cmd test:browser` passed all 258 Chromium cases (13.5m). The confirming
  `pnpm.cmd test:focus browser entry-recovery.spec.ts` passed 29 cases after the
  finish refinements. A final EN desktop/RU phone two-case confirmation passed
  after correcting the inactive draft-view guidance. Captures were inspected.
- `scripts/test-migrations.ps1` passed fresh/upgrade/refusal/preservation/schema
  parity checks, including migration 39's exact guards and nullable maxima.
- Hallmark static sweep: 0 FAIL, 0 REFLEX, 0 WARN across six feature files.
  `--render --url` was attempted; puppeteer-core is unavailable. Maintained
  Playwright screenshots provide rendered phone/tablet/desktop review instead.
  In-thread finish review resolved withdrawn-empty guidance, the unnecessarily
  open preset disclosure and inactive draft-view guidance. Confirming captures
  show the corrections; no image/material slots are needed.

Initial failures and corrections: the DTO assertion needed its new archived
field; browser session recovery needed the strict login fixture response and an
awaited filter read. Both focused corrections passed. One database rerun timed
out in seeding during concurrent validation load; a subsequent isolated focused
retry passed. The initial sandbox Docker denial was retried with authorized
fixture access. These are recorded failures, not successful commands.
The first full baseline passed upgrades/seed preservation but failed its temporary
API health deadline during concurrent validation. Its subsequent complete retry
passed; the runner's deadlines/gates were not relaxed to achieve that result.

Initial/final origin fetches succeeded. This branch is five commits ahead and one
behind origin/main because main contains its earlier squash; the committed file
trees are identical (`git diff HEAD origin/main` is empty). Its own upstream has
zero divergence. GitHub showed no open overlapping PRs. No branch/history
integration was necessary or performed. Final diff, documentation/link/UTF-8 and
whitespace checks passed; no commits, pushes or deployments were performed.

## Limits and next action

Human visual/fluent-language/assistive review, real mail, hosted CI/deployment/
rollback/restore and other release gates remain open. No new image/material slots
are required. Local technical success is not visual approval or external M3 release.
Next: P5-ENTRIES with P5-UI-ENTRIES S09/S10 representative roster, unscheduled
entry/participant editing and recovery, consuming these completed data contracts.
Music retains P3-MUSIC-MODEL → P8-MEDIA → P5-MUSIC gates; estimates remain the
separate P5-APPLICATION-ESTIMATES extension.
