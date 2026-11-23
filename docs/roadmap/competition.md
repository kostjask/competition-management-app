# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 6 — Scheduling, live operations, and judging

Local implementation entry: the consumed M3 entry/submission and M4 staff
technical workflows and model decisions pass. Full M3/M4 release evidence gates
external competition operation, not isolated model/tests development. Follow the
checkpoint's delivery priority: finish the local M2/M3 path before promoting this
track, unless a concrete prerequisite or explicit user request requires it.
The current queue additionally prioritizes public studio/festival delivery, whose
anonymous content/archives do not require M3/M5. Preserve competition tasks and
their own prerequisites; no old score reconstruction is required to migrate Wix
result documents. Public CMS publication never substitutes for P7-PUBLISH.
Complete model/specification tasks before their own dependent screens. Do not
require these models for M2 registration.

The user accepted the recommended [live-model brief](../LIVE_MODEL_DECISIONS.md)
on 2026-11-21. [ADR-030](../adr/030-session-queues.md) and
[the schedule contract](../api/schedule.md) own explicit stages/sessions, revisioned
queues, moderator/admin authority and bounded HTTP recovery. P6-LIVE-MODEL and
P6-SCHEDULE/S13 are complete locally; [validation](../SCHEDULE_VALIDATION.md)
records full API/migration/workspace/browser gates and the final S13 rerun.
Scoring readiness still gates START/ADVANCE, LIVE entry and finalization. Venue
recovery rehearsal and M5 release remain open.

The user accepted the recommended [scoring policy](../SCORING_MODEL_DECISIONS.md)
on 2026-11-21. [ADR-004](../adr/004-exact-scoring.md) and migration 47 implement
exact rubric versions, frozen per-performance panels/sheets, reasoned corrections
and private reproducible calculations. [The contract](../api/scoring.md) owns the
organizer rubric/category/panel workbench. [Evidence](../SCORING_VALIDATION.md)
records completed full API/migration/workspace checks, 440 full browser cases,
23 affected cases and Hallmark static/rendered acceptance. Venue recovery,
public P7 results and M5 remain open.

PR #13 integration (2026-11-21): main's squash-merged schedule snapshot at
`6515dfd` exactly matches prerequisite `f06194f`. Resolved the 24 overlapping
files to the tested scoring/CI branch and merged target ancestry without rewriting
history. The resolved source tree matches `171734b`; migrations 46/47 and their
contracts/UI remain intact. Integration revalidation passes all 67
CMS/schedule/scoring browser cases, workspace tests/typecheck/lint/build and Prisma
validation/format checks. The prior full 441-case browser run remains
source-identical, rather than a new full run. The user authorized completing and
publishing the merge after automatic approval review requested explicit Git
authorization. Hosted checks belong to PR #13. No release gate is closed.

- [ ] P6-UI-LIVE: S13 schedule and scoring setup, S14 moderator console and S15 judge scoring are delivered locally. S13 requires a new confirmation after a rejected source conflict and explicit current-schedule comparison. S14/S15 show localized interruption instructions and clear pending work after confirmed access loss. UI exit requires F07–F09 touch/keyboard venue rehearsal, stale/repeated/reconnecting/removed-access/manual-fallback cases and full cross-phase language/accessibility/state/visual gates; current identity and local/server acknowledgement remain visible throughout.

- [x] P6-LIVE-MODEL: ADR-003/030 and additive migration 46 supply lifecycle mapping, event-owned stages/sessions, stable queue slots, transactional moves/swaps/removal/reuse, moderator authority and immutable acknowledgements. Existing orders/history and unscheduled drafts remain intact. Scope/replay/concurrency/conflict/transition tests pass. START/ADVANCE, LIVE entry and finalization enforce ADR-004 rubric/panel readiness and sheet completeness.
- [x] P6-SCORING-MODEL: accepted ADR-004 and migration 47 supply immutable ordered rubric versions, exact integer ranges/steps/weights, per-performance panel/sheet snapshots, draft/submission locks, reasoned paused-queue correction/deductions/disqualification and reproducible private calculations. Normalized weighted criterion means, equal panel means, no dropped scores, one three-decimal half-up rounding and shared competition ties are explicit. Composite keys enforce event and criterion/template ownership; legacy Float history is unchanged and excluded. Current source readiness/completeness, scope/replay/race/rollback/history and exact-math checks pass. Publication remains independent under P7. [Evidence](../SCORING_VALIDATION.md).
- [x] P6-SCHEDULE: eligible append-generation, stage/session URL filters, dancer rest/stage/window conflicts and source-bound atomic save are delivered with S13. Native moves/destinations, preview/confirmation, exact-operation/session/stale-form recovery, saved print reference and localized responsive/browser checks pass. Event setup consumes validated SCHEDULED/return-to-review transitions. [Evidence](../SCHEDULE_VALIDATION.md); human/venue release gates remain open.
- [x] P6-TEMPLATES: organizer rubric/criterion versions, ET/EN/RU labels/instructions, exact ranges/steps/weights, category mapping, session panels and readiness checks are delivered at `/app/admin/events/:eventId/scoring`. Immutable inspection/copy, keyboard ordering, source-bound preview/confirmation and retained invalid/stale/uncertain/session/navigation recovery pass browser/Hallmark checks. Inactive panel members remain removable without rewriting started sheets. Venue/human release remains open. [Evidence](../SCORING_VALIDATION.md).
- [x] P6-JUDGE: S15 delivers touch/keyboard scoring, exact ranges, draft autosave, private server-confirmed lock and paused correction under ADR-004/031. The assigned sheet stays pinned through reconnect and concurrent stage starts. Route and API checks deny foreign, revoked and unassigned access. [Local validation](../JUDGE_VALIDATION.md) includes the full workspace/API/database/browser gates and Hallmark recapture. Venue and human gates remain open.
- [x] P6-MODERATOR: S14 delivers the assigned current/next queue and frozen-panel completion counts, organizer LIVE entry, permission-checked transitions and reasoned queue/sheet corrections with audited acknowledgement. [Local validation](../MODERATOR_VALIDATION.md) covers ET/EN/RU, exact retry, revoked access and responsive Hallmark review. Venue acceptance remains P6-RECOVERY.
- [ ] P6-RECOVERY: [ADR-031](../adr/031-live-scoring-reconnect.md) implements both roles' acknowledged HTTP, read-only stale/offline state and exact operation recovery. S14 prints a last-read handoff. Local browser tests exercise access revocation during an uncertain write and verify that restored access starts from a fresh read. Use the [runbook](../LIVE_REHEARSAL.md) to measure venue health and propagation, decide whether to approve manual continuation, and rehearse on the intended devices and network. Real-time delivery follows transactional HTTP if rehearsal shows a need.

Exit: a moderator advances the correct queue, assigned judges receive the correct
performance, acknowledged scores survive reconnect, submissions/actions cannot
duplicate, and a rehearsal proves recovery/manual fallback. Admin view previews
remain optional deferred scope, not a live-operation release gate.

## Phase 7 — Results and publication

Entry: P6-SCORING-MODEL and validated submitted score sheets. Public release needs
an explicit ADR-002 public DTO/publication decision; spectators need no account.

The user directed results to stay private on 2026-11-23.
[ADR-032](../adr/032-private-results.md) and
[the results contract](../api/results.md) own private review and finalization,
including the atomic LIVE → FINALIZED transition for a reviewed revision.
Public projection, publishing, post-finalization corrections and exports remain
open. The Phase 6 venue rehearsal and M5 release gates still apply.

- [ ] P7-UI-RESULTS: S16 private completeness, grouped review, saved revision inspection and explicit finalization are implemented in ET/EN/RU. The rest of F10 still requires publication preview/confirmation, public grouping/ranking/empty states, correction version/time notices, localized exports, public access checks and human accessibility acceptance.

- [x] P7-CALCULATE: ADR-032 and migration 48 retain category/age/format ranking
  revisions from ADR-004's exact frozen sheets. Grouped golden fixtures cover
  shared ranks, zero, missing sheets, withdrawals, disqualification and historical
  reproducibility. The full disposable baseline and migration parity passed.
  [Checkpoint evidence](../../DEVELOPMENT_PLAN.md#next-action).
- [ ] P7-PUBLISH: provisional and finalized private revisions are implemented under ADR-032. A public projection, explicit publication, reasoned correction/version/time and public result pages remain deferred. Keep results private until a release policy is approved.
- [ ] P7-EXPORT: CSV/PDF result/protocol exports and reproducibility checks, applying privacy rules and correct ET/EN/RU labels.

Exit: calculations match golden fixtures and published results can be reproduced;
publication/access/correction tests pass. Complete M5 only with the Phase 6 rehearsal
and applicable Phase 9 deployment/backup/operational gates.
