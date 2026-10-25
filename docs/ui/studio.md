# Studio applications and entries

Target screen contracts, not an implementation claim. Inherit all shared
[UI requirements](../UI_UX.md), [design rules](../DESIGN_SYSTEM.md) and
[flow acceptance](../USER_FLOWS.md). Routes are in the
[route inventory](../UI_UX.md#route-inventory); API paths are relative to /api/v1.

## S07 — Applicant and representative dashboard

- **Purpose / roles / route:** find status and next work; pending owned applicants at proposed `/applications`, approved reps at `/representative`.
- **Primary action:** continue one selected application or resolve its top blocker.
- **Data:** own studios, event applications and permitted task summaries/deadlines.
- **Sections / components:** event/studio switcher, organization/event status rows, next action/contact, deadlines, corrections, entry/music/review progress when implemented.
- **States:** loading; no studio/application with onboarding entry; pending/rejected/locked; failed load distinct from empty; no representative-role wall for applicants.
- **Responsive / accessibility:** priority cards/list, one column mobile; statuses announced once after change, no reliance on badge colors.
- **API:** GET `/studios`, authorized event registrations; cross-event aggregate task dashboard contract pending if necessary.
- **Acceptance:** returning roleless applicant finds their own pending record; rejected/locked user sees specific next step without exposing roster writes. F03/F04.

## S08 — Application and studio profile

- **Purpose / roles / routes:** apply and maintain authorized studio/contact details; `/events/:id/register`, `/events/:id/studio`, `/studios/:studioId` proposed.
- **Primary action:** submit application, inspect status or save permitted profile changes.
- **Data:** selected event, studio fields, representative contact, separate approvals, profile edit authority; optional invoice details private.
- **Sections / components:** context/requirements, short application form, optional details, profile and contact sections, independent statuses and pending cancellation.
- **States:** no application/form; uncertain create result reconciled via owned lists; duplicate-name conflict without other studio identity; locked profile explanation; missing/denied.
- **Responsive / accessibility:** stacked labeled forms; desktop paired optional fields; explain required versus optional and cancellation consequences.
- **API:** registration POST/list/DELETE; studio GET/PATCH, representative PATCH. Pending membership currently permits reads, not profile writes without studio.manage. Additional-member invitation is S17.
- **Acceptance:** no accidental duplicate retry, no auto-merge by name, contact email never changes account identity; approved-entry permissions are separate. F03/F04.

## S09 — Dancer management

- **Purpose / roles / route:** manage an authorized roster; approved reps/admins; proposed `/studios/:studioId/dancers`.
- **Primary action:** add/edit dancer or archive with impact confirmation.
- **Data:** scoped dancer DTOs, calendar birth dates, event approval/stage/review permission, agreed age policy and historical usage summary when supported.
- **Sections / components:** studio context/lock banner, searchable list/table, dancer editor, archive confirmation; photos only after upload/security gates.
- **States:** no dancers, no search matches, list retry, field/date errors, stage lock or approval denied, stale write, missing/archived record.
- **Responsive / accessibility:** mobile labeled rows/editor; desktop table; birth-date label and accessible calendar/manual entry, explicit archive action name.
- **API:** studio-nested dancers GET/POST/PATCH/DELETE; photos via images after gates; server search/pagination pending if volume requires it.
- **Acceptance:** leap/calendar date stable in each timezone; another studio's dancer cannot be read/changed; archival does not claim historical deletion or restore support. F04.

## S10 — Performance registration

- **Purpose / roles / route:** prepare authorized entries; approved reps/admins; S10 proposed collection/new/edit URLs.
- **Primary action:** save draft then continue review after draft contracts exist.
- **Data:** scoped performance, participant roster, permitted categories/age groups/formats, duration, revision and draft state.
- **Sections / components:** title/details, searchable participant selection with counts, configuration/eligibility guidance, duration, music link and save status.
- **States:** no entries/configuration, loading roster/options, field/relationship error, lock/deadline, unsaved/saving/saved/failed/conflict; preserve selection.
- **Responsive / accessibility:** mobile sequential form, desktop details/participants with summary; selection uses actual checkboxes, selected counts and linked nested errors.
- **API:** event performances CRUD plus dancer/configuration reads. Setup reads currently require event.manage; P5-ENTRIES must supply an authorized representative configuration-read contract, not grant management permission. Draft/revision contracts require P3-ENTRIES/HISTORY.
- **Acceptance:** no schedule order required by target draft workflow; current API still requires order/full fields, so do not fake draft success. Backend rejects cross-event options/cross-studio participants. F04.

## S11 — Music upload

- **Purpose / roles / route:** attach valid private music; authorized reps/admins; S10 editor music child proposed.
- **Primary action:** upload/replace and preview the acknowledged file.
- **Data:** performance identity, current media/version, allowed type/size/duration/deadline and upload progress.
- **Sections / components:** limits before chooser, labeled file input/drop area, progress/cancel, current file metadata, explicit playback controls, retry/replacement confirmation.
- **States:** no file, uploading, server processing, ready, invalid/failed/canceled, expired access, locked; previous file retained after failed replacement.
- **Responsive / accessibility:** no drag-only upload; touch controls, named progress, keyboard-operable audio, no autoplay; long filenames wrap.
- **API:** pending P3-MUSIC-MODEL/P8-MEDIA contracts; image upload endpoints do not accept music.
- **Acceptance:** selected file alone never appears ready; server validates content/ownership; retry does not detach the working file. F04.

## S12 — Data-review checklist and submission

- **Purpose / roles / routes:** resolve blockers and submit/review; own approved reps and admin review, proposed routes in inventory.
- **Primary action:** fix a linked issue, then submit entries or request authorized correction.
- **Data:** latest entries/music, validation issues, warnings, revision, deadlines and lock consequences, receipt/correction metadata.
- **Sections / components:** studio/event and progress, blockers before warnings, entry summaries with field links, confirmation, durable receipt; admin correction reason/scope/deadline.
- **States:** checking, no entries, incomplete music/configuration, stale review, submission uncertain, submitted/locked/correction requested/expired; errors do not clear work.
- **Responsive / accessibility:** one-column ordered checklist mobile; desktop summaries/detail; errors link to exact entry/field, receipt heading receives focus on success.
- **API:** current entry reads; validation/submit/receipt/correction/version contracts pending P3-ENTRIES/HISTORY.
- **Acceptance:** final server validation and retry-safe receipt; unaffected entries remain locked during scoped correction; submission is not studio approval. F07/F10.
