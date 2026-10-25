# Schedule, live operation and results

Target screen contracts, not an implementation claim. Inherit all shared
[UI requirements](../UI_UX.md), [design rules](../DESIGN_SYSTEM.md) and
[flow acceptance](../USER_FLOWS.md). Routes are in the
[route inventory](../UI_UX.md#route-inventory); API paths are relative to /api/v1.

## S13 — Schedule editor

- **Purpose / roles / route:** create a safe runnable schedule; admins/explicit authorized organizers only after permission decision; proposed `/admin/events/:id/schedule`.
- **Primary action:** generate/reorder and validate schedule revision.
- **Data:** submitted entries, stages/sessions, duration/buffers, participant conflicts, queue/schedule revision and locks.
- **Sections / components:** stage/session filters, unscheduled list, schedule table/timeline, conflict panel, move up/down or destination controls, preview/confirm.
- **States:** no entries, generating, conflicts, stale revision, live-locked changes, denied; cancel preview leaves saved schedule intact.
- **Responsive / accessibility:** mobile list with explicit move controls, desktop optional timeline/table; drag has keyboard and single-pointer alternatives, preserve focused item after move.
- **API:** pending P6-LIVE-MODEL/SCHEDULE; current performance order alone is insufficient.
- **Acceptance:** atomic swaps avoid duplicate slots; same-dancer conflict visible; retries/stale edits cannot silently overwrite schedule. F07.

## S14 — Moderator live console

- **Purpose / roles / route:** operate assigned stage safely; scoped moderator; proposed `/moderator/events/:id/live`, `/moderator` landing.
- **Primary action:** authorized advance/pause/skip after checking completion/prerequisites.
- **Data:** current/next queue, selected stage/session, revision, judge acknowledgement counts, connection and last-sync status.
- **Sections / components:** persistent stage/current identity, completion blockers, next list, separated main operation controls, connection/recovery panel and audited exception controls.
- **States:** waiting/no queue, in-progress, paused/skipped/reopened per future model, missing judges, stage conflict, offline/reconnecting, expired permission; uncertain operation reconciled before retry.
- **Responsive / accessibility:** tablet touch-first, mobile critical controls/current performance visible, desktop extra queue; confirm significant exceptions, announce queue change without stealing focus.
- **API:** pending live/completion commands, permission model and delivery/recovery contracts; no direct score.submit substitute.
- **Acceptance:** double tap causes one transition; cannot advance wrong stage/revision; completion display exposes no unauthorized peer score values. F08.

## S15 — Judge scoring

- **Purpose / roles / route:** accurately submit own assigned sheet; event judge with matching Judge/assignment; proposed `/judge/events/:id/score`, `/judge` landing.
- **Primary action:** score criteria and explicitly submit final sheet.
- **Data:** assigned current performance, versioned rubric/ranges/steps, own draft/revision, save status and lock/correction authority.
- **Sections / components:** stable performance identity, criterion labels/instructions and exact numeric inputs, progress, acknowledgement time, review/submit, lock and connection banners.
- **States:** no assignment/waiting, loading rubric, incomplete/invalid, unsaved/saving/saved/failed, submitting/uncertain/submitted/locked, offline/reconnect, correction reopened.
- **Responsive / accessibility:** touch-first one-column criteria, desktop optional summary; no slider-only scoring or forced orientation; label/range/error per criterion, numeric keypad where appropriate, deliberate focus when performance changes.
- **API:** pending P6 scoring/assignment/draft/submit/lock/reopen contracts and ADR-004.
- **Acceptance:** zero differs from missing; debounce alone never proves save; reconnect reconciles versions before advance; peers hidden under agreed policy; acknowledgement survives reload. F09.

## S16 — Results review and public results

- **Purpose / roles / routes:** verify, finalize/publish and inspect official output; authorized admins versus public spectators; proposed routes in inventory.
- **Primary action:** admin validates/finalizes/publishes a specific revision; visitor filters published groups.
- **Data:** calculation/rubric version, completeness/blockers, ranking groups/ties/penalties, publication state/time and correction history; public-minimal DTO.
- **Sections / components:** status/version notice, completeness summary before publish action, category/age/format filters, accessible ranking table/list, correction note and supported export links.
- **States:** calculating, incomplete/missing sheets, provisional/finalized/published/corrected per future model, no published groups, stale calculation, denied private version, export failure.
- **Responsive / accessibility:** mobile rank/name/result first with accessible detail; desktop comparison table, headers/captions, ties explicit; no private identity data in exports or hidden HTML.
- **API:** pending P7 calculation/publication/export contracts plus approved public access policy.
- **Acceptance:** public URL cannot reveal provisional results; confirmed publication names revision/scope; corrected publication preserves history and reproducibility. F10.
