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
P5-SUBMISSION/S12 and the owning P5-UI-ENTRIES acceptance are delivered locally
on 2026-11-19. Human/hosted M3 release gates remain open; the next queued work is
P6-LIVE-MODEL after its material queue/operation decisions.

Local development follows the checkpoint's workflow queue. P5-APPLICATION uses
the registration/reapplication and organizer setup/review implementations;
P5-UI-APPLICATION is its UI acceptance scope, not a second independently counted
delivery of the same feature. Real inbox, hosted deployment and human review are
still required before M2 release. Their absence does not block fake-backed local
application development. Scope the same distinction to M3 entry/media work.

- [x] P5-UI-APPLICATION (local technical scope, 2026-11-11): S07/S08 role-independent home/apply/status/profile/self-contact, two approval rows, next actor/contact, cutoff, retained cancel/reapply, exact event/studio/language and uncertain-response/session recovery are implemented. [Evidence](../APPLICATION_REVIEW_VALIDATION.md) records 24 review/application Chromium cases, form-specific validation/focus and full local gates. Real email and human/hosted release evidence remain separate open M2 gates. Optional billing editing and entry task summaries remain postponed.
- [x] P5-UI-ENTRIES (local technical scope, S09–S12, 2026-11-19): roster, saved draft/participants, private music and representative checklist/lock/receipt/scoped correction are delivered in their owning slices. S12 shares organizer review while retaining separate authority and source-pinned operations. Field and first-entry links retain checkpoint context; stale/uncertain/session/navigation states retain work and avoid false empty/success claims. Final 40 affected Chromium cases cover ET/EN/RU at 320–1920px, correction, receipt focus, retries, keyboard and nonwrapping actions; [submission evidence](../SUBMISSION_VALIDATION.md), [S11 evidence](../MUSIC_DELIVERY_VALIDATION.md). Human fluent-language/assistive/touch/visual and hosted M3 release approval remain open.
- [ ] P5-UI-MEMBERS: within separately gated P5-MEMBERS/REUSE, implement S17 studio-bound representative invitations/membership and owned-studio selection without name merging; distinguish contact from login identity and explain cross-event lock/history impact. Apply the same UI exit gates when these extensions ship.

- [x] P5-APPLICATION (local technical scope, 2026-11-11): canonical event application/profile and My applications pages consume the completed local onboarding/registration/setup/review implementations. Verified draft completion is atomic and revisioned; contact prefilling, independent statuses/reasons, window checks, profile/self-contact corrections, cancel/reapply and frozen retries are implemented. Synthetic signup/verify/apply/admin-review/return plus ET/EN/RU/mobile/keyboard recovery and isolated form validation pass full workspace/database/migration/Chromium gates; [evidence](../APPLICATION_REVIEW_VALIDATION.md). M2 release still needs real inbox, hosted and human evidence; no external milestone is closed.
- [x] P5-APPLICATION-ESTIMATES (local technical scope, 2026-11-18): ADR-027/migration 43 deliver initial and adjusted counts for every actual event-local day, explicit zero and unrecorded legacy state. Revisioned owner adjustments, reasoned organizer corrections, immutable history/actor-bound retries and shared application/event conflicts preserve both approvals and entry data. Owning S06/S08 Cobalt UI includes field errors, server comparison, refreshed initial days without lost input and session/network recovery in ET/EN/RU. Full workspace, disposable migration/API and browser gates pass; [evidence](../APPLICATION_ESTIMATES_MUSIC_VALIDATION.md). Human/hosted release gates remain open.
- [x] P5-ENTRIES (local technical scope, 2026-11-18): after the local M2 application/approval workflow, P3-ENTRIES, and P4-ENTRY-CONFIG pass, build dancer list/create/edit/archive and performance create/edit/archive with participants/title/category/age/format/duration. Full M2 release evidence remains required before external M3 use, not before isolated entry implementation. Validate age date, participant count/duration, active ownership, and event configuration again on backend. Include resumable drafts, actual save/error states, network/session/stage-change recovery, and concurrent-edit conflict handling. Delivered scoped S09/S10 with calendar dates, searchable participants, current field grants and policy issues; migration 42 supplies dancer revisions/immutable retry receipts. Existing organizer review shares the editor and withdrawal/restore. [Validation](../ENTRY_WORKSPACE_VALIDATION.md) records isolated API/migration and ET/EN/RU 320–1920px browser checks. Subsequent music/submission slices are delivered locally; human approval and external M3 release remain open.
- [ ] P5-REUSE: after P3-STUDIO-IDENTITY, allow selecting an existing owned studio/roster for another event, preserving locks and history. No name-based auto-merge. This is not an M2 prerequisite.
- [x] P5-MUSIC (local technical scope, 2026-11-19): consumes P3-MUSIC-MODEL/P8-MEDIA with an application-owned S11 workbench linked from S08 and representative/organizer S10. Explicit MiB/seconds/UTC limits precede file selection; current metadata/native non-autoplay audio, progress/server-processing/stop, replacement confirmation, exact-operation retries, saved-state comparison, session recovery and navigation warning retain work and prior versions. Confirmation, global-admin acceptance and reasoned bounded reopening are distinct. Cobalt ET/EN/RU at 320–1920px, 20 focused music browser checks, full browser run plus interrupted-case rerun, full API/migration/workspace gates and Hallmark review pass; [evidence](../MUSIC_DELIVERY_VALIDATION.md). S12 is delivered in its owning slice; M3 and human/hosted release remain open.
- [x] P5-SUBMISSION (local technical scope, 2026-11-19): consumes P5-ENTRIES/MUSIC and the existing studio-wide BASIC/FINAL API/history. S12 adds field-linked blockers, independent music notices, explicit lock confirmation, source-fingerprint freshness, durable focused receipts, retry-safe operations and scoped correction/resubmission with audit/window explanations. Shared read/write guards deny terminal grants, final-lock bypass and empty/duplicate/retired correction scopes. Current authority and actor/body-bound replay remain enforced. Full workspace/API baseline and final 40 affected browser checks pass; [evidence and check limits](../SUBMISSION_VALIDATION.md). M3 and human/hosted release remain open; no schema/migration change was needed.
- [ ] P5-MEMBERS: after explicit inviter/membership/event-role policy and required schema, add authorized studio-bound additional-representative invitations; test exact-studio authority, acceptance and removal. Contact email/role alone cannot grant ownership. Not an M2 prerequisite.

M3 exit: approved representatives complete roster, performances, required music,
submission and corrections end-to-end; invalid/cross-studio participants cannot
submit; saved progress, repeated actions, locks, and concurrency are tested.
P5-REUSE/MEMBERS are separately gated extensions, not hidden M2 requirements.
