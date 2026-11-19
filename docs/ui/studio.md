# Studio applications and entries

Target screen contracts, not an implementation claim. Inherit all shared
[UI requirements](../UI_UX.md), [design rules](../DESIGN_SYSTEM.md) and
[flow acceptance](../USER_FLOWS.md). Routes are in the
[route inventory](../UI_UX.md#route-inventory); API paths are relative to /api/v1.

## S07 — Applicant and representative dashboard

- **Purpose / roles / route:** find status and next work; owned applicants at `/applications` without a role; `/representative` entry console remains a placeholder.
- **Primary action:** continue one selected application or resolve its top blocker.
- **Data:** own studios, event applications and permitted task summaries/deadlines.
- **Sections / components:** event/studio switcher, organization/event status rows, next action/contact, deadlines, corrections, entry/music/review progress when implemented.
- **States:** loading; no studio/application with onboarding entry; pending/rejected/locked; failed load distinct from empty; no representative-role wall for applicants.
- **Responsive / accessibility:** priority cards/list, one column mobile; statuses announced once after change, no reliance on badge colors.
- **API:** GET `/studios`, authorized event registrations and event facts; entry task aggregation remains future scope.
- **Acceptance:** returning roleless applicant finds their own pending record; rejected/locked user sees specific next step without exposing roster writes. F03/F04.

## S08 — Application and studio profile

P5-APPLICATION-ESTIMATES extends S08 with a required count for every current
event-local day, including zero, and an independent saved-history ledger. Legacy
applications without counts show unrecorded. Owners may adjust before cutoff;
closed/cancelled/rejected/locked records explain the restriction. Network/session
recovery retains the exact operation; stale writes retain local values until
explicit server comparison/replacement. Estimates never imply submitted entries
or change either approval. [Contract](../api/registrations.md#planning-estimates).

- **Purpose / roles / routes:** apply and maintain authorized studio/contact details; `/events/:id/register`, `/events/:id/studio?studio=:studioId` mounted; standalone `/studios/:studioId` remains proposed.
- **Primary action:** submit application, inspect status or save permitted profile changes.
- **Data:** selected event, studio fields, representative contact, separate approvals, profile edit authority; optional invoice details private.
- **Sections / components:** context/requirements, short application form, optional details, profile and contact sections, independent statuses and pending cancellation.
- **States:** no application/form; uncertain create result reconciled via owned lists; duplicate-name conflict without other studio identity; locked profile explanation; missing/denied.
- **Responsive / accessibility:** stacked labeled forms; desktop paired optional fields; explain required versus optional and cancellation consequences.
- **API:** registration POST/list/DELETE and `/review` history/status; studio GET/PATCH and self representative PATCH. Pending active owners may correct profile/self-contact during the application window without a role. Profile correction resets organization verification and revision; UI always supplies expectedRevision. Additional-member invitation is S17.
- **Acceptance:** no accidental duplicate retry, no auto-merge by name, contact email never changes account identity; approved-entry permissions are separate. F03/F04.

P5-APPLICATION delivers the local minimal form/status/profile/contact slice,
including verified draft completion and retained cancel/reapply. Optional billing
editing and broader entry task summaries are postponed; existing billing API data
is preserved. Profile/contact validation belongs to its own form, with field-linked
summaries and independent invalid states. No standalone studio route is needed for
this event-owned M2 path.
[Evidence](../APPLICATION_REVIEW_VALIDATION.md) records browser/database scope and
remaining human, real-inbox and hosted release gates.

## S09 — Dancer management

- **Purpose / roles / route:** manage an authorized roster; approved reps/admins; mounted `/app/studios/:studioId/dancers`.
- **Primary action:** add/edit dancer or archive with impact confirmation.
- **Data:** scoped dancer DTOs, calendar birth dates, event approval/stage/review permission, agreed age policy and historical usage summary when supported.
- **Sections / components:** studio context/lock banner, searchable list/table, dancer editor, archive confirmation; photos only after upload/security gates.
- **States:** no dancers, no search matches, list retry, field/date errors, stage lock or approval denied, stale write, missing/archived record.
- **Responsive / accessibility:** mobile labeled rows/editor; desktop table; birth-date label and accessible calendar/manual entry, explicit archive action name.
- **API:** studio-nested dancers GET/POST/PATCH/DELETE; photos via images after gates; server search/pagination pending if volume requires it.
- **Acceptance:** leap/calendar date stable in each timezone; another studio's dancer cannot be read/changed; archival does not claim historical deletion or restore support. F04.

## S10 — Performance registration

- **Purpose / roles / route:** prepare authorized entries; approved reps/admins; mounted `/app/events/:eventId/studios/:studioId/performances` with `/new` and `/:performanceId/edit` children.
- **Primary action:** save an acknowledged draft, then continue editing its revision.
- **Data:** scoped performance, participant roster, permitted categories/age groups/formats, duration, revision and draft state.
- **Sections / components:** title/details, searchable participant selection with counts, configuration/eligibility guidance, duration, music link and save status.
- **States:** no entries/configuration, loading roster/options, field/relationship error, lock/deadline, unsaved/saving/saved/failed/conflict; preserve selection.
- **Responsive / accessibility:** mobile sequential form, desktop details/participants with summary; selection uses actual checkboxes, selected counts and linked nested errors.
- **API:** event performances CRUD, revisioned dancer commands and the [scoped entry context](../api/entry-context.md). Setup management stays restricted; safe representative options, current availability and configured-policy draft issues use exact studio/event authority. ADR-023/024/025 supply nullable unscheduled drafts, saved revisions and current write/correction guards.
- **Acceptance:** no schedule order is required for draft saves. Backend rejects supplied cross-event options/cross-studio participants. Draft acknowledgement never implies submission eligibility. F04.

S09/S10 local delivery includes searchable native selection, field-linked errors,
calendar dates, immutable dancer retries, roster archive impact confirmation,
entry withdrawal/restore, saved draft guidance, stale comparison, session recovery
and unsaved-navigation guards. Existing organizer review uses the same editor.
Representative submission consumes this workspace through S12 below. S10 and the organizer editor link
to the scoped S11 music child; entry and music approvals stay separate.
[Contracts](../api/entry-context.md).

## S11 — Music upload

- **Purpose / roles / route:** attach valid private music; exact active PENDING/APPROVED members and global admins; `/app/events/:eventId/studios/:studioId/music` from S08 or S10 with `?performance=...`. Preparation grants no roster/configuration access.
- **Primary action:** upload/replace and preview the acknowledged file.
- **Data:** performance identity, current media/version, allowed type/size/duration/deadline and upload progress.
- **Sections / components:** limits before chooser, labeled file input/drop area, progress/cancel, current file metadata, explicit playback controls, retry/replacement confirmation.
- **States:** no file, uploading, server processing, ready, invalid/failed/canceled, expired access, locked; previous file retained after failed replacement.
- **Responsive / accessibility:** no drag-only upload; touch controls, named progress, keyboard-operable audio, no autoplay; long filenames wrap.
- **API:** [Private music contract](../api/music.md) supplies revisioned explicit policy, actor/body/hash receipts, staging/replacement, current-version byte ranges, attachment, confirmation, organizer acceptance and reasoned bounded reopening. Image upload endpoints do not accept music.
- **Acceptance:** selected file alone never appears ready; server validates content/ownership; retry does not detach the working file. F04.

Local S11 implementation includes upfront MiB/seconds/UTC limits, named
indeterminate/determinate progress, immediate stop, retained uncertain operation,
refresh/explicit comparison, session recovery, navigation warning, native private
non-autoplay audio and current acknowledged metadata. Organizer rules and reasoned
correction share the locked Cobalt system. [Evidence](../MUSIC_DELIVERY_VALIDATION.md)
separates technical checks from human/hosted release approval. S12 consumes its independent music state.

## S12 — Data-review checklist and submission

The representative checklist and shared organizer correction/review are delivered
locally on 2026-11-19. The entry index and S08 link to
`/app/events/:eventId/studios/:studioId/performances?entry=review&checkpoint=BASIC|FINAL`.
Field-linked blockers, independent music notices, explicit studio-wide locking,
source-pinned commands, focused durable receipts and scoped correction/resubmission
consume the existing checkpoint model. Failed/uncertain/stale/session states retain
work and require authoritative comparison before a fresh confirmation. The shared
organizer view retains reasoned named-field/entry deadlines and separate acceptance.
[Evidence](../SUBMISSION_VALIDATION.md) owns checks and release limits.

Delivered foundation (2026-11-11): global-admin-only
`/admin/events/:eventId/performances?studio=:studioId` shows saved entries, their
explicit owning application and participant counts. It is a read-only Cobalt
register with loading/empty/error/retry, ET/EN/RU, URL-filter and session recovery;
it makes no eligibility, music, receipt or submission claims. The checklist and
correction/submission controls below retain their model gates.
[Ownership evidence](../PERFORMANCE_OWNERSHIP_VALIDATION.md).

P3-ENTRIES-DRAFT extends this foundation with inline owner/optional-title creation,
missing-field summaries and separate unscheduled labels under ADR-024. Uncertain
creates retain their body/operation for explicit retry through filter/session
recovery; decoded acknowledgement is required for success. Nullable saved history
is readable. That historical foundation alone did not deliver S10/S12; their
owning representative implementations are now delivered locally.

- **Purpose / roles / routes:** resolve blockers and submit/review; own approved reps and admin review, proposed routes in inventory.
- **Primary action:** fix a linked issue, then submit entries or request authorized correction.
- **Data:** latest entries/music, validation issues, warnings, revision, deadlines and lock consequences, receipt/correction metadata.
- **Sections / components:** studio/event and progress, blockers before warnings, entry summaries with field links, confirmation, durable receipt; admin correction reason/scope/deadline.
- **States:** checking, no entries, incomplete music/configuration, stale review, submission uncertain, submitted/locked/correction requested/expired; errors do not clear work.
- **Responsive / accessibility:** one-column ordered checklist mobile; desktop summaries/detail; errors link to exact entry/field, receipt heading receives focus on success.
- **API:** [canonical checkpoint contract](../api/entry-workflow.md); `reviewToken`/`expectedReview`, server `canSubmit`, immutable receipt and current music summary.
- **Acceptance:** final server validation and retry-safe receipt; unaffected entries remain locked during scoped correction; submission is not studio approval. F07/F10.
