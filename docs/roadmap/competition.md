# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 6 — Scheduling, live operations, and judging

Entry: M3/M4 for the user workflow; complete model/specification tasks before
their own dependent screens. Do not require these models for M2 registration.

- [ ] P6-UI-LIVE: within P6-SCHEDULE/TEMPLATES/JUDGE/MODERATOR after the respective model/recovery decisions, implement S13 accessible schedule editor/conflicts, scoring-template setup, S14 current/next/completion/connection console and S15 rubric/exact inputs/autosave/explicit submission/lock/correction. UI exit requires F07–F09 touch/keyboard venue rehearsal, stale/repeated/reconnecting/removed-access/manual-fallback cases and full cross-phase language/accessibility/state/visual gates; current identity and local/server acknowledgement remain visible throughout.

- [ ] P6-LIVE-MODEL: extend ADR-003 with SCHEDULED/LIVE/FINALIZED/ENDED/CANCELLED transitions, stage/session/queue states, authorized advance/pause/skip/withdraw/reopen actions, and safe lifecycle migration. Separate schedule-entry/stage/session ordering from performance identity/draft submission; define moving/swapping/withdrawing and archived-slot reuse with transactional uniqueness/concurrency checks. Preserve existing orders/history, allow unscheduled entries from P3-ENTRIES, and add schedule indexes/conflict/transition tests.
- [ ] P6-SCORING-MODEL: accept ADR-004 and implement rubric/templates/criteria, ranges/steps/weights, judge assignments, draft/submitted/locked score sheets, penalties/disqualification, rounding/dropped scores/ties, versioned calculation and publication/correction semantics. Choose scaled integers or explicit Decimal precision instead of unspecified Float semantics; define finite/range/step checks, exact tie/rounding rules and preservation/conversion of existing scores. Enforce same-event judge/performance and criterion-template consistency where practical via database keys plus backend validation. Extend P3-CONSTRAINTS/HISTORY without rewriting historical scores silently. This precedes scoring-template UI.
- [ ] P6-SCHEDULE: after P6-LIVE-MODEL, build generation/editing with stage/session filters and dancer conflict reporting; validate manual adjustments. Scheduling is no longer part of core Phase 4 registration setup.
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
