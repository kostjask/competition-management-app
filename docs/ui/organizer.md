# Organizer setup and review

Target screen contracts, not an implementation claim. Inherit all shared
[UI requirements](../UI_UX.md), [design rules](../DESIGN_SYSTEM.md) and
[flow acceptance](../USER_FLOWS.md). Routes are in the
[route inventory](../UI_UX.md#route-inventory); API paths are relative to /api/v1.

## S05 — Admin dashboard and event setup

- **Purpose / roles / route:** prioritize event work and configure safely; admins; existing/proposed routes in inventory.
- **Primary action:** complete setup checklist or open the highest-priority blocker.
- **Data:** selected event, application counts, configuration completeness, valid lifecycle transitions, deadlines/timezone/contact as added.
- **Sections / components:** event selector/context, actionable blockers, approvals and incomplete-data summaries, setup sections for details/registration, then separately gated entry rules/staff/schedule/results.
- **States:** no event → create; partial setup; failed section save preserving input; transition blocked with linked prerequisites; conflict/reload and denied access.
- **Responsive / accessibility:** desktop sidebar/summary and content, mobile sequential sections; checklist text and focusable links; accessible date/time controls.
- **API:** event CRUD, category/age-group/format clients; lifecycle/checklist/deadline contracts pending P3/P4. Image controls wait for P2-BOUNDARIES.
- **Acceptance:** organizer can open valid registration without SQL; scoring setup does not block studio applications; raw stage selection cannot bypass transition validation. F05.

## S06 — Studio approval queue

- **Purpose / roles / route:** review the right organization/event separately; admins; proposed `/admin/events/:id/applications`.
- **Primary action:** inspect then approve/reject/request correction where supported.
- **Data:** registration summaries, authorized studio details, independent approval statuses, decision revision/audit and reason policy.
- **Sections / components:** event/status filters, table/list, review detail, two explicit approval sections, contact/decision history and confirmation.
- **States:** skeleton, no pending versus filtered empty, missing studio, denied, stale decision/conflict, notification failure after saved decision.
- **Responsive / accessibility:** mobile summary list/detail page; desktop table/detail pane; row actions identify studio and decision, focus returns logically.
- **API:** registrations GET/PATCH and studio approval PATCH; reasons/corrections/history pending contracts.
- **Acceptance:** organization approval alone never claims event approval; backend prevents event approval before organization approval; canceled pending application retains studio/membership. F03/F05.
