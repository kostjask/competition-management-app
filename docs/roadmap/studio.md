# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 5 — Studio application and competition entries

- [ ] P5-UI-APPLICATION: within P5-APPLICATION, deliver S07 role-independent application home and S08 apply/status/studio profile with two approval rows, next action/contact, permitted profile/contact edits and pending cancellation. Preserve exact event/studio/language; reconcile uncertain creation. M2 UI exit is F01–F03 with admin decision and real email under all cross-phase quality gates.
- [ ] P5-UI-ENTRIES: within P5-ENTRIES/MUSIC/SUBMISSION after domain/media gates, deliver S09 dancer list/editor/archive, S10 unscheduled draft/participant selector, S11 upload/replacement/preview and S12 blocker checklist/lock confirmation/receipt/correction. Include field links and acknowledged save/revision/lock states. M3 UI exit uses F04/F07/F10, touch/keyboard, ET/EN/RU and complete-state/visual checks.
- [ ] P5-UI-MEMBERS: within separately gated P5-MEMBERS/REUSE, implement S17 studio-bound representative invitations/membership and owned-studio selection without name merging; distinguish contact from login identity and explain cross-event lock/history impact. Apply the same UI exit gates when these extensions ship.

- [ ] P5-APPLICATION: after P2-SIGNUP, P3-REGISTRATION, P4-CORE/REVIEW, build canonical event application/studio pages, studio profile onboarding, and “My applications” accessible without a representative role. Preserve selected event/studio/language, prefill contact data, postpone optional fields, show both approvals and next action/contact, and support pending cancellation/corrections under explicit policy. Align stage availability and reconcile uncertain creation before retry. M2 is complete only after end-to-end account verification, application, admin decision, and returning-applicant recovery pass with real email, ET/EN/RU, keyboard, and mobile use.
- [ ] P5-ENTRIES: after M2, P3-ENTRIES, and P4-ENTRY-CONFIG, build dancer list/create/edit/archive and performance create/edit/archive with participants/title/category/age/format/duration. Validate age date, participant count/duration, active ownership, and event configuration again on backend. Include resumable drafts, actual save/error states, network/session/stage-change recovery, and concurrent-edit conflict handling.
- [ ] P5-REUSE: after P3-STUDIO-IDENTITY, allow selecting an existing owned studio/roster for another event, preserving locks and history. No name-based auto-merge. This is not an M2 prerequisite.
- [ ] P5-MUSIC: after P3-MUSIC-MODEL and P8-MEDIA, implement upload/replacement/progress/retry/preview with upfront limits and preservation of the old file after failed replacement.
- [ ] P5-SUBMISSION: after P5-ENTRIES/MUSIC, implement field-linked validation summary, warnings versus blockers, explicit lock confirmation, server receipt, retry-safe submission, and scoped corrections/resubmission with audit and deadline/lock explanations.
- [ ] P5-MEMBERS: after explicit inviter/membership/event-role policy and required schema, add authorized studio-bound additional-representative invitations; test exact-studio authority, acceptance and removal. Contact email/role alone cannot grant ownership. Not an M2 prerequisite.

M3 exit: approved representatives complete roster, performances, required music,
submission and corrections end-to-end; invalid/cross-studio participants cannot
submit; saved progress, repeated actions, locks, and concurrency are tested.
P5-REUSE/MEMBERS are separately gated extensions, not hidden M2 requirements.
