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
grouped/public P7 results and M5 remain open.

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

- [ ] P6-UI-LIVE: within P6-SCHEDULE/TEMPLATES/JUDGE/MODERATOR after the respective model/recovery decisions, implement S13 accessible schedule editor/conflicts, scoring-template setup, S14 current/next/completion/connection console and S15 rubric/exact inputs/autosave/explicit submission/lock/correction. UI exit requires F07–F09 touch/keyboard venue rehearsal, stale/repeated/reconnecting/removed-access/manual-fallback cases and full cross-phase language/accessibility/state/visual gates; current identity and local/server acknowledgement remain visible throughout.

- [x] P6-LIVE-MODEL: ADR-003/030 and additive migration 46 supply lifecycle mapping, event-owned stages/sessions, stable queue slots, transactional moves/swaps/removal/reuse, moderator authority and immutable acknowledgements. Existing orders/history and unscheduled drafts remain intact. Scope/replay/concurrency/conflict/transition tests pass. START/ADVANCE, LIVE entry and finalization enforce ADR-004 rubric/panel readiness and sheet completeness.
- [x] P6-SCORING-MODEL: accepted ADR-004 and migration 47 supply immutable ordered rubric versions, exact integer ranges/steps/weights, per-performance panel/sheet snapshots, draft/submission locks, reasoned paused-queue correction/deductions/disqualification and reproducible private calculations. Normalized weighted criterion means, equal panel means, no dropped scores, one three-decimal half-up rounding and shared competition ties are explicit. Composite keys enforce event and criterion/template ownership; legacy Float history is unchanged and excluded. Current source readiness/completeness, scope/replay/race/rollback/history and exact-math checks pass. Publication remains independent under P7. [Evidence](../SCORING_VALIDATION.md).
- [x] P6-SCHEDULE: eligible append-generation, stage/session URL filters, dancer rest/stage/window conflicts and source-bound atomic save are delivered with S13. Native moves/destinations, preview/confirmation, exact-operation/session/stale-form recovery, saved print reference and localized responsive/browser checks pass. Event setup consumes validated SCHEDULED/return-to-review transitions. [Evidence](../SCHEDULE_VALIDATION.md); human/venue release gates remain open.
- [x] P6-TEMPLATES: organizer rubric/criterion versions, ET/EN/RU labels/instructions, exact ranges/steps/weights, category mapping, session panels and readiness checks are delivered at `/app/admin/events/:eventId/scoring`. Immutable inspection/copy, keyboard ordering, source-bound preview/confirmation and retained invalid/stale/uncertain/session/navigation recovery pass browser/Hallmark checks. Inactive panel members remain removable without rewriting started sheets. Venue/human release remains open. [Evidence](../SCORING_VALIDATION.md).
- [x] P6-JUDGE: S15 delivers touch/keyboard scoring, exact ranges, draft autosave, private server-confirmed lock and paused correction under ADR-004/031. The assigned sheet stays pinned through reconnect and concurrent stage starts. Route and API checks deny foreign, revoked and unassigned access. [Local validation](../JUDGE_VALIDATION.md) includes the full workspace/API/database/browser gates and Hallmark recapture. Venue and human gates remain open.
- [x] P6-MODERATOR: S14 delivers the assigned current/next queue and frozen-panel completion counts, organizer LIVE entry, permission-checked transitions and reasoned queue/sheet corrections with audited acknowledgement. [Local validation](../MODERATOR_VALIDATION.md) covers ET/EN/RU, exact retry, revoked access and responsive Hallmark review. Venue acceptance remains P6-RECOVERY.
- [ ] P6-RECOVERY: [ADR-031](../adr/031-live-scoring-reconnect.md) implements both roles' acknowledged HTTP, read-only stale/offline state and exact operation recovery. S14 adds connection status and a last-read print reference for the stop-and-verify handoff. Verify operational health and latency on the intended venue network, approve any manual continuation record/export and rehearse both roles there. Real-time delivery follows transactional HTTP if rehearsal shows a need.

Exit: a moderator advances the correct queue, assigned judges receive the correct
performance, acknowledged scores survive reconnect, submissions/actions cannot
duplicate, and a rehearsal proves recovery/manual fallback. Admin view previews
remain optional deferred scope, not a live-operation release gate.

## Phase 7 — Results and publication

Entry: P6-SCORING-MODEL and validated submitted score sheets. Public release needs
an explicit ADR-002 public DTO/publication decision; spectators need no account.

- [ ] P7-UI-RESULTS: within P7-PUBLISH/EXPORT, implement S16 private completeness/results review, revision finalization/publication preview/confirmation, public group filters/ranking tables, correction version/time notices and privacy-safe localized exports. F10 UI exit includes missing sheets, zero/ties, unpublished access denial, stale/repeated publish, public empty/export-error states, accessible tables and responsive ET/EN/RU visual acceptance.

- [ ] P7-CALCULATE: consume ADR-004's exact per-performance calculations and frozen inputs to build grouped category/age/format ranking revisions, withdrawal/disqualification handling and result completeness/reproducibility. Reuse the accepted no-drop/rounding/shared-tie policy rather than duplicating its math. Golden grouped fixtures reproduce historical and edge cases; existing P6 private totals do not complete this task.
- [ ] P7-PUBLISH: separate admin provisional/finalized/public states; public result pages expose only approved DTOs. Audit corrections with reasons/version/time; block unpublished results for unauthorized users.
- [ ] P7-EXPORT: CSV/PDF result/protocol exports and reproducibility checks, applying privacy rules and correct ET/EN/RU labels.

Exit: calculations match golden fixtures and published results can be reproduced;
publication/access/correction tests pass. Complete M5 only with the Phase 6 rehearsal
and applicable Phase 9 deployment/backup/operational gates.
