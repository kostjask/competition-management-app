# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 5 — Studio application and competition entries

"Studio" here means a participating festival organization. Neposedõ's public
studio website is [P4-STUDIO-PAGES](website.md), not this entrant-management UI.
Student administration, CRM, attendance and tuition billing are outside scope.
P5-ENTRIES/S09/S10 and P5-APPLICATION-ESTIMATES/S06/S08 are delivered locally on
2026-11-18. P8-MEDIA/P5-MUSIC and S11 are delivered locally on 2026-11-19;
P5-SUBMISSION/S12 is next. Human/hosted M3 release gates remain open.

Local development follows the checkpoint's workflow queue. P5-APPLICATION uses
the registration/reapplication and organizer setup/review implementations;
P5-UI-APPLICATION is its UI acceptance scope, not a second independently counted
delivery of the same feature. Real inbox, hosted deployment and human review are
still required before M2 release. Their absence does not block fake-backed local
application development. Scope the same distinction to M3 entry/media work.

- [x] P5-UI-APPLICATION (local technical scope, 2026-11-11): S07/S08 role-independent home/apply/status/profile/self-contact, two approval rows, next actor/contact, cutoff, retained cancel/reapply, exact event/studio/language and uncertain-response/session recovery are implemented. [Evidence](../APPLICATION_REVIEW_VALIDATION.md) records 24 review/application Chromium cases, form-specific validation/focus and full local gates. Real email and human/hosted release evidence remain separate open M2 gates. Optional billing editing and entry task summaries remain postponed.
- [ ] P5-UI-ENTRIES (S09/S10/S11 complete locally, 2026-11-19; S12 open): within P5-ENTRIES/MUSIC/SUBMISSION after domain/media gates, deliver S09 dancer list/editor/archive, S10 unscheduled draft/participant selector, S11 upload/replacement/preview and S12 blocker checklist/lock confirmation/receipt/correction. Include field links and acknowledged save/revision/lock states. M3 UI exit uses F04/F07/F10, touch/keyboard, ET/EN/RU and complete-state/visual checks. [S11 evidence](../MUSIC_DELIVERY_VALIDATION.md) includes organizer rules/acceptance/correction and frozen-operation/session/cancellation recovery; human/hosted approval remains open.
- [ ] P5-UI-MEMBERS: within separately gated P5-MEMBERS/REUSE, implement S17 studio-bound representative invitations/membership and owned-studio selection without name merging; distinguish contact from login identity and explain cross-event lock/history impact. Apply the same UI exit gates when these extensions ship.

- [x] P5-APPLICATION (local technical scope, 2026-11-11): canonical event application/profile and My applications pages consume the completed local onboarding/registration/setup/review implementations. Verified draft completion is atomic and revisioned; contact prefilling, independent statuses/reasons, window checks, profile/self-contact corrections, cancel/reapply and frozen retries are implemented. Synthetic signup/verify/apply/admin-review/return plus ET/EN/RU/mobile/keyboard recovery and isolated form validation pass full workspace/database/migration/Chromium gates; [evidence](../APPLICATION_REVIEW_VALIDATION.md). M2 release still needs real inbox, hosted and human evidence; no external milestone is closed.
- [x] P5-APPLICATION-ESTIMATES (local technical scope, 2026-11-18): ADR-027/migration 43 deliver initial and adjusted counts for every actual event-local day, explicit zero and unrecorded legacy state. Revisioned owner adjustments, reasoned organizer corrections, immutable history/actor-bound retries and shared application/event conflicts preserve both approvals and entry data. Owning S06/S08 Cobalt UI includes field errors, server comparison, refreshed initial days without lost input and session/network recovery in ET/EN/RU. Full workspace, disposable migration/API and browser gates pass; [evidence](../APPLICATION_ESTIMATES_MUSIC_VALIDATION.md). Human/hosted release gates remain open.
- [x] P5-ENTRIES (local technical scope, 2026-11-18): after the local M2 application/approval workflow, P3-ENTRIES, and P4-ENTRY-CONFIG pass, build dancer list/create/edit/archive and performance create/edit/archive with participants/title/category/age/format/duration. Full M2 release evidence remains required before external M3 use, not before isolated entry implementation. Validate age date, participant count/duration, active ownership, and event configuration again on backend. Include resumable drafts, actual save/error states, network/session/stage-change recovery, and concurrent-edit conflict handling. Delivered scoped S09/S10 with calendar dates, searchable participants, current field grants and policy issues; migration 42 supplies dancer revisions/immutable retry receipts. Existing organizer review shares the editor and withdrawal/restore. [Validation](../ENTRY_WORKSPACE_VALIDATION.md) records isolated API/migration and ET/EN/RU 320–1920px browser checks. Music/submission, human approval and external M3 release remain open.
- [ ] P5-REUSE: after P3-STUDIO-IDENTITY, allow selecting an existing owned studio/roster for another event, preserving locks and history. No name-based auto-merge. This is not an M2 prerequisite.
- [x] P5-MUSIC (local technical scope, 2026-11-19): consumes P3-MUSIC-MODEL/P8-MEDIA with an application-owned S11 workbench linked from S08 and representative/organizer S10. Explicit MiB/seconds/UTC limits precede file selection; current metadata/native non-autoplay audio, progress/server-processing/stop, replacement confirmation, exact-operation retries, saved-state comparison, session recovery and navigation warning retain work and prior versions. Confirmation, global-admin acceptance and reasoned bounded reopening are distinct. Cobalt ET/EN/RU at 320–1920px, 20 focused music browser checks, full browser run plus interrupted-case rerun, full API/migration/workspace gates and Hallmark review pass; [evidence](../MUSIC_DELIVERY_VALIDATION.md). S12/M3 and human/hosted release remain open.
- [ ] P5-SUBMISSION: after P5-ENTRIES/MUSIC, implement field-linked validation summary, warnings versus blockers, explicit lock confirmation, server receipt, retry-safe submission, and scoped corrections/resubmission with audit and deadline/lock explanations.
- [ ] P5-MEMBERS: after explicit inviter/membership/event-role policy and required schema, add authorized studio-bound additional-representative invitations; test exact-studio authority, acceptance and removal. Contact email/role alone cannot grant ownership. Not an M2 prerequisite.

M3 exit: approved representatives complete roster, performances, required music,
submission and corrections end-to-end; invalid/cross-studio participants cannot
submit; saved progress, repeated actions, locks, and concurrency are tested.
P5-REUSE/MEMBERS are separately gated extensions, not hidden M2 requirements.
