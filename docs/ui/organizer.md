# Organizer setup and review

Target screen contracts, not an implementation claim. Inherit all shared
[UI requirements](../UI_UX.md), [design rules](../DESIGN_SYSTEM.md) and
[flow acceptance](../USER_FLOWS.md). Routes are in the
[route inventory](../UI_UX.md#route-inventory); API paths are relative to /api/v1.

Implementation (2026-11-12): S05 event workspace/create/setup and S06 independent
review are complete locally. [Validation](../ORGANIZER_VALIDATION.md) records checks
and the completed local development-database/runtime handoff. P5 now delivers
applicant apply/status/resume actions on authenticated S01/S02 discovery;
[application validation](../APPLICATION_VALIDATION.md) records that integration.
This does not close external M2 gates.

## S05 — Admin dashboard and event setup

- **Purpose / roles / route:** prioritize event work and configure safely; admins; existing/proposed routes in inventory.
- **Primary action:** complete setup checklist or open the highest-priority blocker.
- **Data:** selected event, application counts, configuration completeness, valid lifecycle transitions, deadlines/timezone/contact as added.
- **Sections / components:** event selector/context, actionable blockers, approvals and incomplete-data summaries, setup sections for details/registration, then separately gated entry rules/staff/schedule/results.
- **States:** no event → create; partial setup; failed section save preserving input; transition blocked with linked prerequisites; conflict/reload and denied access.
- **Responsive / accessibility:** desktop sidebar/summary and content, mobile sequential sections; checklist text and focusable links; accessible date/time controls.
- **API:** event CRUD with timezone/deadline/contact/authored content/revision, existing protected raster image client, ADR-003 lifecycle targets and linked recommendation checklist. Category/age/format configuration remains the separately gated M3 scope.
- **Acceptance:** organizer can open valid registration without SQL; scoring setup does not block studio applications; raw stage selection cannot bypass transition validation. F05.

## S06 — Studio approval queue

- **Purpose / roles / route:** review the right organization/event separately; global admins; `/admin/events/:eventId/applications`.
- **Primary action:** inspect then approve/reject/request correction where supported.
- **Data:** registration summaries, authorized studio details, independent approval statuses, decision revision/audit and reason policy.
- **Sections / components:** event/status filters, table/list, review detail, two explicit approval sections, contact/decision history and confirmation.
- **States:** skeleton, no pending versus filtered empty, missing studio, denied, stale decision/conflict, notification failure after saved decision.
- **Responsive / accessibility:** mobile summary list/detail page; desktop table/detail pane; row actions identify studio and decision, focus returns logically.
- **API:** event-bound review snapshot with scoped history and notification states; canonical registration/studio decision PATCHes share the registration revision. Notification retry is separate from decision saving. Semantic reasons and review allowance follow ADR-003.
- **Acceptance:** organization approval alone never claims event approval; backend records independent decisions and requires both approvals for representative access; canceled pending application retains studio/membership. F03/F05.
