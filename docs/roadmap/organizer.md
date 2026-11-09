# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 4 — Organizer setup and review

Local core entry: the applicable Phase 2 technical foundations and
P3-REGISTRATION/REGISTRATION-REAPPLY contracts pass locally (2026-11-09).
Consume ADR-003 and ADR-019's completed M2 content policy/contracts before
organizer-authored content storage/editors. P4-CORE with setup UI is next. Full M1 and
provider/hosted/human evidence gate external release, not isolated implementation.
Entry/staff extensions use their own model gates and do not block M2.

M2 order: P4-CORE with the setup portion of P4-UI-CORE, then P4-REVIEW with its
review UI portion, then P5-APPLICATION. Extend P3-UX-CONTRACTS with the actual
DTO/action needs instead of inventing another parallel contract task. The
cross-cutting UI checkboxes do not make all future screens prerequisites.
P4-STAFF is already technically delivered; its completed execution subdivisions
remain evidence, not new work to count against the next-task queue.

- [ ] P4-UI-CORE: within P4-CORE/REVIEW, implement S05 dashboard/event setup/checklist and S06 independent organization/event approval queue/detail; complete S01/S02 event list/detail action hierarchy and correct stage-based apply/resume actions with explicit authenticated discovery. F02/F03/F05 plus cross-phase responsive/accessibility/localization/state/visual gates apply to M2; stale decisions and saved-decision notification failures need recovery.
- [ ] P4-UI-EXTENSIONS: within P4-ENTRY-CONFIG/STAFF after their gates, implement category/age/format and entry-data review sections (S12), plus S17 event staff status/invite/resend/revoke/distinct remove-access screens (staff technical scope is delivered locally under P4-STAFF; category/entry sections retain their gates). Extend the same UI exit gates to these screens; do not make staff/scoring an M2 prerequisite.

- [ ] P4-CORE: implement event details (venue/location/description/image/limits/timezone/registration deadline), organizer contact, registration lifecycle prerequisites, and actionable setup checklist. Create/approve an event without direct database access. Scoring configuration is not required just to accept studio applications.
- [ ] P4-REVIEW: separate organization verification/event acceptance queues, show who acts next, and provide safe reasons/contact and decision notifications using P2-EMAIL/AUDIT. Pending corrections follow P3-REGISTRATION. Test approval isolation, event ownership, denied decisions, and transitions.
- [ ] P4-ENTRY-CONFIG: after P3-ENTRIES, build category/age-group/format configuration and entry/music deadlines, validate overlap/count/duration policies, and show incomplete entries/missing music. Scoring templates and schedule generation move to Phase 6.
- [x] P4-STAFF (local technical scope, 2026-11-06): P4-STAFF-READ/UI and P9-BROWSER-STAFF below implement S17 event invitation/assignment administration, truthful access gaps, status/history and distinct confirmed revoke/remove controls. Shared scoped DTOs, canonical clients, 113 API + 16 web tests, 108 Chromium cases, isolated PostgreSQL/Prisma/migration/workspace checks pass. Human/real-mail/hosted M4 release gates stay open. See [evidence](../STAFF_UI_VALIDATION.md).

Bounded execution tasks for P4-STAFF (2026-11-06), in order:

- [x] P4-STAFF-READ (2026-11-06): global-admin-only event staff overview DTO/API/client with event-bound invitations, active/removed assignments and truthful account/Judge access readiness. No secret/internal credential fields; missing event, wrong scope and denied reads tested.
- [x] P4-STAFF-UI (2026-11-06): S17 event staff route, invite/resend/revoke and distinct confirmed accepted-access removal. Preserve drafts and acknowledged state through loading, failures, conflicts, uncertain responses and session recovery; ET/EN/RU, navigation and keyboard confirmation.
- [x] P9-BROWSER-STAFF (2026-11-06, delivered staff slice of P9-BROWSER/P9-UI-REGRESSION): maintained S17/F06 browser cases at four widths/all locales, direct/denied routes, invitation acceptance-to-removal, missing assignments, uncertain responses, expiry/retry, focus and retained work. PostgreSQL continues to prove history/rollback; human/real-mail/hosted release evidence remains open.

M2 core exit: organizer can open registration and approve/reject the correct
studio/event through UI; invalid transitions/configuration are actionable and
blocked on the backend. Extensions close only when their respective tests pass.
