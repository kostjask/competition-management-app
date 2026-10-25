# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 4 — Organizer setup and review

Core entry: M1, application-specific Phase 2 behavior, and P3-REGISTRATION.
Entry/staff extensions use their own gates and do not block M2.

- [ ] P4-UI-CORE: within P4-CORE/REVIEW, implement S05 dashboard/event setup/checklist and S06 independent organization/event approval queue/detail; complete S01/S02 event list/detail action hierarchy and correct stage-based apply/resume actions with explicit authenticated discovery. F02/F03/F05 plus cross-phase responsive/accessibility/localization/state/visual gates apply to M2; stale decisions and saved-decision notification failures need recovery.
- [ ] P4-UI-EXTENSIONS: within P4-ENTRY-CONFIG/STAFF after their gates, implement category/age/format and entry-data review sections (S12), plus S17 event staff status/invite/resend/revoke/distinct remove-access screens. Extend the same UI exit gates to these screens; do not make staff/scoring an M2 prerequisite.

- [ ] P4-CORE: implement event details (venue/location/description/image/limits/timezone/registration deadline), organizer contact, registration lifecycle prerequisites, and actionable setup checklist. Create/approve an event without direct database access. Scoring configuration is not required just to accept studio applications.
- [ ] P4-REVIEW: separate organization verification/event acceptance queues, show who acts next, and provide safe reasons/contact and decision notifications using P2-EMAIL/AUDIT. Pending corrections follow P3-REGISTRATION. Test approval isolation, event ownership, denied decisions, and transitions.
- [ ] P4-ENTRY-CONFIG: after P3-ENTRIES, build category/age-group/format configuration and entry/music deadlines, validate overlap/count/duration policies, and show incomplete entries/missing music. Scoring templates and schedule generation move to Phase 6.
- [ ] P4-STAFF: after P2-INVITE/JUDGE-ACCEPT/OFFBOARD, build scoped invitation/assignment admin screens with invited/accepted/expired/revoked status, resend/revoke and distinct remove-access controls. Test missing assignment and history preservation. This is the M4 UI gate, not a prerequisite for M2.

M2 core exit: organizer can open registration and approve/reject the correct
studio/event through UI; invalid transitions/configuration are actionable and
blocked on the backend. Extensions close only when their respective tests pass.
