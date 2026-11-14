# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 4 — Organizer setup and review

PR reconciliation (2026-11-13) combines main's integrated setup/review and M3
workflows with the parallel branch's explicit notification recovery. Additive
migration 37 retains recipient-bound transport retries and superseded attempts.
Image replacement increments the event revision, with authoritative refresh
preserving unsaved setup fields and detecting concurrent configuration changes.
Validation and remaining database/release limits are in
[merge validation](../APPLICATION_REVIEW_VALIDATION.md#merge-reconciliation-2026-11-13).
The checkpoint's core P3-ENTRIES review/configuration slice is now delivered
locally; reversible withdrawal/resubmission remains the next implementation task.

Local core entry: the applicable Phase 2 technical foundations and
P3-REGISTRATION/REGISTRATION-REAPPLY contracts pass locally (2026-11-09).
Consume ADR-003 and ADR-019's completed M2 content policy/contracts before
organizer-authored content storage/editors. P4-CORE with setup UI is complete locally
(2026-11-10); P4-REVIEW with review UI is complete locally (2026-11-11), with
full local checks recorded in [evidence](../APPLICATION_REVIEW_VALIDATION.md). Full M1 and
provider/hosted/human evidence gate external release, not isolated implementation.
Entry/staff extensions use their own model gates and do not block M2.

M2 order: P4-CORE with the setup portion of P4-UI-CORE, then P4-REVIEW with its
review UI portion, then P5-APPLICATION. Extend P3-UX-CONTRACTS with the actual
DTO/action needs instead of inventing another parallel contract task. The
cross-cutting UI checkboxes do not make all future screens prerequisites.
P4-STAFF is already technically delivered; its completed execution subdivisions
remain evidence, not new work to count against the next-task queue.

- [x] P4-UI-CORE (local technical scope, 2026-11-11): P4-CORE setup plus S05 separate pending counts, S06 independent review queues/detail/reasons/history/confirmation, and P5 event apply/resume links use Cobalt/ET/EN/RU and explicit recovery. [Setup evidence](../EVENT_SETUP_VALIDATION.md) and [review/application evidence](../APPLICATION_REVIEW_VALIDATION.md) record full local checks and the corrected coverage gate. Human visual/language/assistive and external release evidence remain open separately.
- [ ] P4-UI-EXTENSIONS (S12 ownership/history foundations and ADR-025 checkpoint configuration/review/details delivered locally): complete P4-ENTRY-CONFIG's option creation/reusable presets and P3-ENTRIES withdrawal recovery after their gates. S17 staff status/invite/resend/revoke/distinct remove-access technical scope is delivered locally under P4-STAFF. Extend existing UI exit gates; do not make staff/scoring an M2 prerequisite. [Checkpoint evidence](../ENTRY_CHECKPOINT_VALIDATION.md).

- [x] P4-CORE (local technical scope, 2026-11-10): event details/location/image/limits/timezone/deadline/contact, explicit authored-language storage/editors, actionable setup checklist and confirmed M2 transitions work through UI without SQL or scoring configuration. ADR-020, migration 31, strict DTO/API/client alignment, global-admin authorization, revisioned saves/creation retries and immutable atomic audit are delivered. Exact-instant/DST retention, modal focus, translated narrow actions and S01/S02/S05 recovery checks pass; [evidence](../EVENT_SETUP_VALIDATION.md). Studio approval queues/decisions remain P4-REVIEW; no external M2 or whole-UI approval is claimed.
- [x] P4-REVIEW (local technical scope, 2026-11-11): separate organization/event queues, next actor, semantic reasons/contact, revisioned decisions/history and transactional truthful notification intent are implemented under ADR-021/migration 32. Approval isolation, ownership/denials, races, audit/notice rollback and recovery pass full workspace/database/migration/Chromium gates; [evidence](../APPLICATION_REVIEW_VALIDATION.md). Real inbox/hosted/human M2 release gates remain open.
- [ ] P4-ENTRY-CONFIG (bounded checkpoint setup delivered locally 2026-11-14): ADR-025 configuration/review/editor UI consumes the new checkpoint contracts, independent deadlines, required credits, any-older percentage policy and allowed category/age/format combinations with count/duration overrides. Rules freeze after registration begins; deadlines stay editable, while organizer correction/reopening/exception actions remain separate. The Dance Express shortcut sets age/credit policy only; it is not a complete nomination preset. [Evidence](../ENTRY_CHECKPOINT_VALIDATION.md). Remaining: integrated option creation and complete reusable nomination presets, keeping event creation simple without an arbitrary workflow/form builder. Supplied kids groups use 210 seconds versus standard groups' 240. Music readiness requires its own contracts; scoring templates and schedule generation remain Phase 6.
- [x] P4-STAFF (local technical scope, 2026-11-06): P4-STAFF-READ/UI and P9-BROWSER-STAFF below implement S17 event invitation/assignment administration, truthful access gaps, status/history and distinct confirmed revoke/remove controls. Shared scoped DTOs, canonical clients, 113 API + 16 web tests, 108 Chromium cases, isolated PostgreSQL/Prisma/migration/workspace checks pass. Human/real-mail/hosted M4 release gates stay open. See [evidence](../STAFF_UI_VALIDATION.md).

Bounded execution tasks for P4-STAFF (2026-11-06), in order:

- [x] P4-STAFF-READ (2026-11-06): global-admin-only event staff overview DTO/API/client with event-bound invitations, active/removed assignments and truthful account/Judge access readiness. No secret/internal credential fields; missing event, wrong scope and denied reads tested.
- [x] P4-STAFF-UI (2026-11-06): S17 event staff route, invite/resend/revoke and distinct confirmed accepted-access removal. Preserve drafts and acknowledged state through loading, failures, conflicts, uncertain responses and session recovery; ET/EN/RU, navigation and keyboard confirmation.
- [x] P9-BROWSER-STAFF (2026-11-06, delivered staff slice of P9-BROWSER/P9-UI-REGRESSION): maintained S17/F06 browser cases at four widths/all locales, direct/denied routes, invitation acceptance-to-removal, missing assignments, uncertain responses, expiry/retry, focus and retained work. PostgreSQL continues to prove history/rollback; human/real-mail/hosted release evidence remains open.

M2 core exit: organizer can open registration and approve/reject the correct
studio/event through UI; invalid transitions/configuration are actionable and
blocked on the backend. Extensions close only when their respective tests pass.
