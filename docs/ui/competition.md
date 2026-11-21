# Schedule, live operation and results

Target screen contracts, not an implementation claim. Inherit all shared
[UI requirements](../UI_UX.md), [design rules](../DESIGN_SYSTEM.md) and
[flow acceptance](../USER_FLOWS.md). Routes are in the
[route inventory](../UI_UX.md#route-inventory); API paths are relative to /api/v1.

## S13 — Schedule editor

- **Purpose / roles / route:** locally implemented global-admin schedule editor at `/app/admin/events/:eventId/schedule` under ADR-030; venue release remains gated.
- **Primary action:** generate/reorder and validate schedule revision.
- **Data:** submitted entries, stages/sessions, duration/buffers, participant conflicts, queue/schedule revision and locks.
- **Sections / components:** stage/session filters, unscheduled list, schedule table/timeline, conflict panel, move up/down or destination controls, preview/confirm.
- **States:** no entries, generating, conflicts, stale revision, live-locked changes, denied; cancel preview leaves saved schedule intact.
- **Responsive / accessibility:** mobile list with explicit move controls, desktop optional timeline/table; drag has keyboard and single-pointer alternatives, preserve focused item after move.
- **API:** [schedule preview/commands](../api/schedule.md), shared strict contracts and migration 46; legacy performance order remains independent.
- **Acceptance:** atomic swaps avoid duplicate slots; same-dancer conflict visible; retries/stale edits cannot silently overwrite schedule. F07.

The implemented Cobalt ledger uses stage/session URL filters, explicit session
setup, append-generation, keyboard moves, cross-session destinations and projected
times. Conflicting previews cannot save; confirmation names the proposed revision.
Current server comparison is separate from the retained local draft and exact
uncertain command. All acknowledged sessions are printable. ET/EN/RU phone/desktop
browser checks accompany delivery; human language/assistive and venue acceptance
remain open. S14/S15 and full P6-UI-LIVE are not completed by this slice.

Organizer scoring-template setup is implemented at
`/app/admin/events/:eventId/scoring` under [ADR-004](../adr/004-exact-scoring.md)
and [the scoring contract](../api/scoring.md). The Cobalt criterion ledger supports
ordered exact ranges/steps/weights, ET/EN/RU labels/instructions, immutable version
inspection/copy, category assignment and session panels. Source-bound preview,
explicit confirmation, readiness blockers and exact-operation/stale/session/
navigation recovery accompany it. Inactive panel members remain visible so an
organizer can remove them from future panels without erasing frozen sheets.
This delivers the setup portion of P6-UI-LIVE; S14/S15 remain their owning tasks.

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

- **Purpose / roles / route:** accurately submit own assigned sheet; event judge with matching Judge/assignment; `/app/judge/events/:eventId/score` and `/app/judge` landing.
- **Primary action:** score criteria and explicitly submit final sheet.
- **Data:** assigned current performance, versioned rubric/ranges/steps, own draft/revision, save status and lock/correction authority.
- **Sections / components:** stable performance identity, criterion labels/instructions and exact numeric inputs, progress, acknowledgement time, review/submit, lock and connection banners.
- **States:** no assignment/waiting, loading rubric, incomplete/invalid, unsaved/saving/saved/failed, submitting/uncertain/submitted/locked, offline/reconnect, correction reopened.
- **Responsive / accessibility:** touch-first one-column criteria, desktop optional summary; no slider-only scoring or forced orientation; label/range/error per criterion, numeric keypad where appropriate, deliberate focus when performance changes.
- **API:** [own-sheet reads and acknowledged commands](../api/scoring.md) under [ADR-004](../adr/004-exact-scoring.md). [ADR-031](../adr/031-live-scoring-reconnect.md) owns stale reads, in-tab edits and exact retry decisions.
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
