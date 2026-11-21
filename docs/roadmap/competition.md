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
Scoring readiness still gates START/ADVANCE, LIVE entry and finalization. S14/S15,
venue recovery rehearsal and M5 release remain open.

- [ ] P6-UI-LIVE: within P6-SCHEDULE/TEMPLATES/JUDGE/MODERATOR after the respective model/recovery decisions, implement S13 accessible schedule editor/conflicts, scoring-template setup, S14 current/next/completion/connection console and S15 rubric/exact inputs/autosave/explicit submission/lock/correction. UI exit requires F07–F09 touch/keyboard venue rehearsal, stale/repeated/reconnecting/removed-access/manual-fallback cases and full cross-phase language/accessibility/state/visual gates; current identity and local/server acknowledgement remain visible throughout.

- [x] P6-LIVE-MODEL: ADR-003/030 and additive migration 46 supply lifecycle mapping, event-owned stages/sessions, stable queue slots, transactional moves/swaps/removal/reuse, moderator authority and immutable acknowledgements. Existing orders/history and unscheduled drafts remain intact. Scope/replay/concurrency/conflict/transition tests pass. START/ADVANCE, LIVE entry and finalization deliberately fail closed until scoring readiness/completeness is implemented; S14/venue delivery remains downstream.
- [ ] P6-SCORING-MODEL: accept ADR-004 and implement rubric/templates/criteria, ranges/steps/weights, judge assignments, draft/submitted/locked score sheets, penalties/disqualification, rounding/dropped scores/ties, versioned calculation and publication/correction semantics. Choose scaled integers or explicit Decimal precision instead of unspecified Float semantics; define finite/range/step checks, exact tie/rounding rules and preservation/conversion of existing scores. Enforce same-event judge/performance and criterion-template consistency where practical via database keys plus backend validation. Extend P3-CONSTRAINTS/HISTORY without rewriting historical scores silently. This precedes scoring-template UI.
- [x] P6-SCHEDULE: eligible append-generation, stage/session URL filters, dancer rest/stage/window conflicts and source-bound atomic save are delivered with S13. Native moves/destinations, preview/confirmation, exact-operation/session/stale-form recovery, saved print reference and localized responsive/browser checks pass. Event setup consumes validated SCHEDULED/return-to-review transitions. [Evidence](../SCHEDULE_VALIDATION.md); human/venue release gates remain open.
- [ ] P6-TEMPLATES: after P6-SCORING-MODEL, build scoring-template/criterion configuration and prerequisite checks before opening live judging, not before accepting studio applications.
- [ ] P6-JUDGE: after P6-SCORING-MODEL/TEMPLATES and P4-STAFF, build touch-friendly assigned-current-performance rubric, explicit ranges, draft autosave and server-confirmed final lock; block unassigned scoring and prohibited peer-score visibility.
- [ ] P6-MODERATOR: after P6-LIVE-MODEL, P6-SCORING-MODEL, and P4-STAFF, build current/next queue and judge completion without premature scores; permission-checked state transitions, controlled reopen/corrections, and audited action confirmation.
- [ ] P6-RECOVERY: define reconnect/offline policy with P6-LIVE-MODEL/SCORING-MODEL before dependent UI promises, then verify it against P6-JUDGE/MODERATOR. Distinguish local drafts from acknowledged server state, reconcile idempotently, and provide operational health/manual fallback/export. Add real-time delivery only after reliable transactional HTTP workflows; test concurrent/repeated score and stage actions.

Exit: a moderator advances the correct queue, assigned judges receive the correct
performance, acknowledged scores survive reconnect, submissions/actions cannot
duplicate, and a rehearsal proves recovery/manual fallback. Admin view previews
remain optional deferred scope, not a live-operation release gate.

## Phase 7 — Results and publication

Entry: P6-SCORING-MODEL and validated submitted score sheets. Public release needs
an explicit ADR-002 public DTO/publication decision; spectators need no account.

- [ ] P7-UI-RESULTS: within P7-PUBLISH/EXPORT, implement S16 private completeness/results review, revision finalization/publication preview/confirmation, public group filters/ranking tables, correction version/time notices and privacy-safe localized exports. F10 UI exit includes missing sheets, zero/ties, unpublished access denial, stale/repeated publish, public empty/export-error states, accessible tables and responsive ET/EN/RU visual acceptance.

- [ ] P7-CALCULATE: implement versioned totals, weights, penalties, dropped scores, rounding, rankings by category/age/format, withdrawal/disqualification, and tie rules. Golden fixtures reproduce historical and edge cases.
- [ ] P7-PUBLISH: separate admin provisional/finalized/public states; public result pages expose only approved DTOs. Audit corrections with reasons/version/time; block unpublished results for unauthorized users.
- [ ] P7-EXPORT: CSV/PDF result/protocol exports and reproducibility checks, applying privacy rules and correct ET/EN/RU labels.

Exit: calculations match golden fixtures and published results can be reproduced;
publication/access/correction tests pass. Complete M5 only with the Phase 6 rehearsal
and applicable Phase 9 deployment/backup/operational gates.
