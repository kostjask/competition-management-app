# Implementation plan revalidation

Reviewed: 2026-11-06. Documentation and source inspection only; no runtime tests,
deployment audit, database access, schema change or application fix was performed.
The [checkpoint](../DEVELOPMENT_PLAN.md#implementation-order) owns priority;
roadmap files retain task IDs, checkboxes and detailed acceptance requirements.

## Findings and adjustments

| Finding | Evidence inspected | Planning adjustment |
| --- | --- | --- |
| Whole-milestone entry rules made unavailable hosted evidence block local P3 and later work. | P3/P4 entry text, P5-ENTRIES's `after M2`, P6 entry, and ADR-008's intended-deployment operations. | Separate local technical, model-decision, intended-target deployment and external release gates. Keep M1 and all real-mail/hosted/human release requirements open and mandatory. Start P3 locally using isolated fixtures and test fakes. |
| The checkpoint promoted staff and then content policy while P3 registration remained unfinished. | Checkpoint/roadmaps; completed P2/P4 staff technical records. | Restore the P3/M2 application path as the active workstream. Preserve completed staff work without treating it as registration readiness or repeating it. |
| Splitting one broad parent into three new children changed the meaning of a request for three roadmap tasks. | P4-STAFF's recorded READ/UI/BROWSER execution subdivisions. | Keep those completed IDs/evidence, but require future next-N selection from the existing ordered queue. Newly created implementation steps do not substitute for N roadmap tasks. |
| P3 includes M2 registration, M3 entry foundations and optional cross-event reuse; treating the entire phase as one prerequisite delays usable applications. | P3 exits, milestone M2/M3 prerequisites and ADR-001. | Complete the M2 registration/reapply subset, then its organizer/applicant workflow. Keep ownership/history/date/entry prerequisites before M3 consumers and identity/name migration before reuse. Do not close the whole P3 phase after its M2 subset. |
| Contract/UI/QA umbrellas overlap owning feature tasks. | P3-UX-CONTRACTS, P4-UI-CORE, P5-UI-APPLICATION, I18N/UI/QA and P9 browser tasks. | Deliver their relevant acceptance scope with the owner, keeping unfinished umbrella scope open. Avoid all-future-screen gates and duplicate task counting. |
| Registration still needs lifecycle and recovery work. | [Registration controller](../apps/api/src/controllers/StudioRegistrationsController.ts), [stage helper](../apps/api/src/utils/stageChecks.ts), [shared contracts](../packages/schemas/src/studio-registration.schema.ts). | P3-REGISTRATION is next: settle ADR-003 and the M2 actor/state/time matrix before schema/API work. Follow with the existing same-studio P3-REGISTRATION-REAPPLY task, not a new-studio/name workaround. |
| Current application decisions are coupled more tightly than the target independent-approval workflow. | Registration update requires an approved organization for every status. Cancellation deletes only the pending registration; retained studio/member/name can block a new studio create. | Record both limits truthfully. ADR-003 must settle rejection/correction/cancellation authority and history; P4-REVIEW must consume the resulting rules rather than merely exposing current PATCH choices. This review does not choose new domain behavior. |
| The event model does not yet implement planned time/transition semantics. | [Prisma schema](../apps/api/prisma/schema.prisma), [event controller](../apps/api/src/controllers/EventsController.ts), [event contracts](../packages/schemas/src/event.schema.ts). | P3 owns event timezone/deadline/DST and application transitions. A valid enum or admin stage PATCH is not proof of a lifecycle graph. P4 consumes one agreed model; proposed live stages remain P6 work. |
| Some maintained guides described already-corrected auth/staff defects as current. | AuthController eligibility/signup, invitation/staff controllers, mounted auth/staff web routes and shared contracts. | Reconcile REGISTRATION_API/DOMAIN and the documentation map with implemented studio-intent signup, verified access, transactional mail, atomic Judge reconciliation and retained offboarding. Keep real inbox/deployment evidence separate. |
| Current-state prose treated a historical rehearsal as live runtime state. | Repository has 29 migration directories; earlier staging evidence recorded 26. No target was inspected in this review. | State repository count and last-recorded rehearsal separately; do not claim the rehearsal is currently running or current with source. No reset/rollout is implied. |

## Development flow and decision boundaries

The first local deliverable is the single-event M2 application workflow. The
checkpoint lists the exact next tasks, followed by organizer setup/review and
applicant apply/status/recovery. Tests, durable audit, translated feedback and
browser recovery ship with each feature rather than waiting for a final QA phase.

P3-REGISTRATION begins with ADR-003's application/review decision, including
actors/admin exceptions, legal transitions, independent approval rules,
cancellation/rejection/correction/retry/audit behavior and event instant/timezone
semantics. Broad or materially ambiguous domain choices still need explanation
before dependent implementation under AGENTS.md. No proposed status, deadline,
content translation model, approval rule or storage architecture is accepted by
this replan.

I18N-CONTENT's M2 policy is scheduled before organizer content editors. If the
registration design itself needs authored reason/content fields, settle that
policy before implementing those fields and record the prerequisite promotion.
Do not choose a free-text or enum reason model merely to preserve queue order.

For M3, explicit performance ownership and date/history/constraint contracts
precede incomplete unscheduled drafts, entry configuration and submission UI.
Music model/storage precede music UI; schedule generation is a later consumer.
Global studio identity/name migration remains required before multi-event reuse,
with history/lock rules before shared cross-event edits. Index/hygiene work follows
the concrete queries/invariants without deferring required integrity checks.

P2-SCOPE-DEPLOY still requires intended-target provenance, duplicates, backup and
coordinated migration/API rollout; fixture tests cannot substitute. Real delivery,
hosted CI/ingress/observability/deploy/restore and delivered-scope human language/
assistive review still gate release. Local implementation may continue while
accounts are unavailable. A concrete security regression or actual model
prerequisite remains a development blocker and outranks the feature queue.

## Preservation and validation

All existing application/source edits and completed task IDs are preserved.
No prior feature checkbox or external milestone was newly completed by this
review. PLAN-REVALIDATION records only this documentation work. Historical test
reports remain historical; the last recorded runtime evidence is linked from the
checkpoint and was not rerun or promoted to a fresh security audit.

Required checks for this documentation-only task:

- `node --check scripts/check-docs.cjs`
- `node scripts/check-docs.cjs`
- `git diff --check`

All three commands pass. The Markdown checker validates local links/anchors,
UTF-8, fences and whitespace; the final diff was reviewed. A before/after SHA-256
comparison confirms all 42 pre-existing non-Markdown edited/untracked files are
byte-identical. This task changes only the checkpoint, owning roadmap text,
registration/domain/documentation guides and this report. No application
environment values or target credentials were read for this review.
