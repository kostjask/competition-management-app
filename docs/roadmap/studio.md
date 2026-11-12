# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 5 — Studio application and competition entries

Local development follows the checkpoint's workflow queue. P5-APPLICATION uses
the registration/reapplication and organizer setup/review implementations;
P5-UI-APPLICATION is its UI acceptance scope, not a second independently counted
delivery of the same feature. Real inbox, hosted deployment and human review are
still required before M2 release. Their absence does not block fake-backed local
application development. Scope the same distinction to M3 entry/media work.

- [x] P5-UI-APPLICATION (complete locally 2026-11-12): S07 role-independent owned application home and S08 apply/status/profile show both approvals, next actor/contact, permitted revisioned profile/contact edits and retained cancellation/reapply. Exact event/studio/language and immutable creation retries are preserved. F01–F03 synthetic browser/API checks cover admin decisions, recovery, keyboard, touch and mobile ET/EN/RU; real inbox, fluent/assistive review and hosted evidence still gate external M2. [Validation](../APPLICATION_VALIDATION.md).
- [ ] P5-UI-ENTRIES: within P5-ENTRIES/MUSIC/SUBMISSION after domain/media gates, deliver S09 dancer list/editor/archive, S10 unscheduled draft/participant selector, S11 upload/replacement/preview and S12 blocker checklist/lock confirmation/receipt/correction. Include field links and acknowledged save/revision/lock states. M3 UI exit uses F04/F07/F10, touch/keyboard, ET/EN/RU and complete-state/visual checks.
- [ ] P5-UI-MEMBERS: within separately gated P5-MEMBERS/REUSE, implement S17 studio-bound representative invitations/membership and owned-studio selection without name merging; distinguish contact from login identity and explain cross-event lock/history impact. Apply the same UI exit gates when these extensions ship.

- [x] P5-APPLICATION (complete locally 2026-11-12): canonical application/studio pages and “My applications” consume the completed P2/P3/P4 contracts without a representative-role wall. Verified owner drafts prefill the exact event and complete atomically with creation; optional details may wait, contact prefills from the account. Both approvals, next actor/contact, permitted corrections, cancellation and same-studio reapplication are implemented with revision/conflict/uncertain-response recovery. Safe return paths and notification destinations are aligned; no database migration was needed. Fake-backed verification/apply/admin-decision/returning-login checks and ET/EN/RU browser acceptance provide local evidence. External M2 still requires real email and all human/hosted/operations gates. [Validation](../APPLICATION_VALIDATION.md).
- [ ] P5-ENTRIES: after the local M2 application/approval workflow, P3-ENTRIES, and P4-ENTRY-CONFIG pass, build dancer list/create/edit/archive and performance create/edit/archive with participants/title/category/age/format/duration. Full M2 release evidence remains required before external M3 use, not before isolated entry implementation. Validate age date, participant count/duration, active ownership, and event configuration again on backend. Include resumable drafts, actual save/error states, network/session/stage-change recovery, and concurrent-edit conflict handling.
- [ ] P5-REUSE: after P3-STUDIO-IDENTITY, allow selecting an existing owned studio/roster for another event, preserving locks and history. No name-based auto-merge. This is not an M2 prerequisite.
- [ ] P5-MUSIC: after P3-MUSIC-MODEL and P8-MEDIA, implement upload/replacement/progress/retry/preview with upfront limits and preservation of the old file after failed replacement.
- [ ] P5-SUBMISSION: after P5-ENTRIES/MUSIC, implement field-linked validation summary, warnings versus blockers, explicit lock confirmation, server receipt, retry-safe submission, and scoped corrections/resubmission with audit and deadline/lock explanations.
- [ ] P5-MEMBERS: after explicit inviter/membership/event-role policy and required schema, add authorized studio-bound additional-representative invitations; test exact-studio authority, acceptance and removal. Contact email/role alone cannot grant ownership. Not an M2 prerequisite.

M3 exit: approved representatives complete roster, performances, required music,
submission and corrections end-to-end; invalid/cross-studio participants cannot
submit; saved progress, repeated actions, locks, and concurrency are tested.
P5-REUSE/MEMBERS are separately gated extensions, not hidden M2 requirements.
