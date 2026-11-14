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

- [x] P5-UI-APPLICATION (local technical scope, 2026-11-11): S07/S08 role-independent home/apply/status/profile/self-contact, two approval rows, next actor/contact, cutoff, retained cancel/reapply, exact event/studio/language and uncertain-response/session recovery are implemented. [Evidence](../APPLICATION_REVIEW_VALIDATION.md) records 24 review/application Chromium cases, form-specific validation/focus and full local gates. Real email and human/hosted release evidence remain separate open M2 gates. Optional billing editing and entry task summaries remain postponed.
- [ ] P5-UI-ENTRIES: within P5-ENTRIES/MUSIC/SUBMISSION after domain/media gates, deliver S09 dancer list/editor/archive, S10 unscheduled draft/participant selector, S11 upload/replacement/preview and S12 blocker checklist/lock confirmation/receipt/correction. Include field links and acknowledged save/revision/lock states. M3 UI exit uses F04/F07/F10, touch/keyboard, ET/EN/RU and complete-state/visual checks.
- [ ] P5-UI-MEMBERS: within separately gated P5-MEMBERS/REUSE, implement S17 studio-bound representative invitations/membership and owned-studio selection without name merging; distinguish contact from login identity and explain cross-event lock/history impact. Apply the same UI exit gates when these extensions ship.

- [x] P5-APPLICATION (local technical scope, 2026-11-11): canonical event application/profile and My applications pages consume the completed local onboarding/registration/setup/review implementations. Verified draft completion is atomic and revisioned; contact prefilling, independent statuses/reasons, window checks, profile/self-contact corrections, cancel/reapply and frozen retries are implemented. Synthetic signup/verify/apply/admin-review/return plus ET/EN/RU/mobile/keyboard recovery and isolated form validation pass full workspace/database/migration/Chromium gates; [evidence](../APPLICATION_REVIEW_VALIDATION.md). M2 release still needs real inbox, hosted and human evidence; no external milestone is closed.
- [ ] P5-APPLICATION-ESTIMATES: extend the initial studio application with expected performance counts per actual event-local calendar day, as requested in ADR-025/questionnaire. Define revisioned contracts and adjustment/review behavior; do not hardcode two days or treat estimates as submitted entries. Existing M2 application completion does not include this new extension.
- [ ] P5-ENTRIES: after the local M2 application/approval workflow, P3-ENTRIES, and P4-ENTRY-CONFIG pass, build dancer list/create/edit/archive and performance create/edit/archive with participants/title/category/age/format/duration. Full M2 release evidence remains required before external M3 use, not before isolated entry implementation. Validate age date, participant count/duration, active ownership, and event configuration again on backend. Include resumable drafts, actual save/error states, network/session/stage-change recovery, and concurrent-edit conflict handling.
- [ ] P5-REUSE: after P3-STUDIO-IDENTITY, allow selecting an existing owned studio/roster for another event, preserving locks and history. No name-based auto-merge. This is not an M2 prerequisite.
- [ ] P5-MUSIC: after P3-MUSIC-MODEL and P8-MEDIA, implement upload/replacement/progress/retry/preview with upfront limits and preservation of the old file after failed replacement.
- [ ] P5-SUBMISSION: after P5-ENTRIES/MUSIC, implement field-linked validation summary, warnings versus blockers, explicit lock confirmation, server receipt, retry-safe submission, and scoped corrections/resubmission with audit and deadline/lock explanations.
- [ ] P5-MEMBERS: after explicit inviter/membership/event-role policy and required schema, add authorized studio-bound additional-representative invitations; test exact-studio authority, acceptance and removal. Contact email/role alone cannot grant ownership. Not an M2 prerequisite.

M3 exit: approved representatives complete roster, performances, required music,
submission and corrections end-to-end; invalid/cross-studio participants cannot
submit; saved progress, repeated actions, locks, and concurrency are tested.
P5-REUSE/MEMBERS are separately gated extensions, not hidden M2 requirements.
