# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 3 — Registration and entry data foundations

Local implementation entry: the relevant Phase 2 security, onboarding, audit and
contract foundations pass; their local technical scope is recorded as complete.
An actual security regression still takes priority. P2-SCOPE-DEPLOY, real inbox
delivery and hosted/human evidence remain mandatory external release gates;
their absence does not block isolated P3 design, migrations, API or UI development.
See the checkpoint's [gate rules](../../DEVELOPMENT_PLAN.md#development-and-release-gates).
This clarification changes planning order, not deployment authorization.

The M2 registration subset is technically complete locally (2026-11-09),
including reapplication and ADR-003's application/time/approval matrix. M2 content
policy/contracts are accepted in ADR-019. P4 setup/review and P5 applicant UI now
consume these contracts locally; next is P3-PERFORMANCE-OWNER before M3 entry UI.
No scoring/live schema is needed for M2. Validation:
[registration evidence](../REGISTRATION_LIFECYCLE_VALIDATION.md).

P3-UX-CONTRACTS is a cross-cutting contract checklist, not a separate all-domain
gate. Its M2 application/time/approval portion belongs with P3-REGISTRATION;
draft/history/selector portions belong with their M3 model tasks. Keep the umbrella
open until its delivered portions are complete. No scoring/live schema is needed
for M2, and P3-ENTRIES is an M3 prerequisite, not an M2 gate.

- [ ] P3-UX-CONTRACTS (M2 application/time/approval portion complete locally 2026-11-09 under ADR-003; M3 draft/history/selector/eligibility scope remains open): within existing model tasks, resolve UX-D05–D07 and record state/action/permission matrices and UI-ready DTOs for deadlines/timezone, both approvals, draft revisions, validation, receipts and corrections. Add authorized representative category/age-group/format option reads before S10 selectors: current setup reads require event.manage; do not grant management permission just to populate a form. Contract exit includes localized status/action examples, calendar/DST cases and explicit next actor/recovery rules. Approved models do not claim implemented screens.

- [x] P3-REGISTRATION (local technical scope, 2026-11-09): ADR-003 M2 state/action/actor/timezone/deadline/DST/correction/reason/retry/audit matrix accepted; migration 30, shared DTOs, canonical API/current clients and tests pass. Independent decisions derive access only when both approvals qualify; pending profile correction increments revision and returns organization approval to pending. Required reapply slice below passes. Live transitions remain P6-LIVE-MODEL; application/review screens and notifications remain P4/P5. See [evidence](../REGISTRATION_LIFECYCLE_VALIDATION.md).
- [ ] P3-STUDIO-IDENTITY: implement ADR-001 with data audit/backfill/preservation tests and a new migration; define shared studio/roster edit rules across event locks and historical entries before removing Studio.eventId. Never infer approval or auto-merge by name; flag contradictory participant/registration relationships. Multi-event reuse must not ship before this gate.
- [ ] P3-STUDIO-NAMES: decide/document display-name identity and duplicate-review policy before altering the global active-name index. Recommended target permits unrelated studios to share display names and uses stable IDs for identity; never auto-merge or add unique dancer name/birth-date identity keys. Audit existing records, search/disambiguation, rename/restore conflicts, canonical contracts, and index preservation/removal tests. Current case-sensitive global uniqueness remains until an explicit new migration; do not weaken it opportunistically in P1.
- [ ] P3-PERFORMANCE-OWNER: before draft/entry UI and M3, record explicit studio/event-registration ownership design, including event-consistent keys and active ownership validation. Audit/backfill existing performances only when ownership is unambiguous; preserve IDs, participants and scores. Resolve empty/mixed legacy participant sets through reviewed repair, not first-participant inference. Migrate controllers/DTOs atomically with canonical contracts and negative ownership tests; single-studio entries remain the current target.
- [ ] P3-CONSTRAINTS: before M3 entry enforcement, audit existing ranges and cross-event contradictions; add agreed row CHECK constraints for date ordering, positive limits/durations/counts and min/max bounds, and compound unique/FK protection for event-owned category/age-group/format relations where practical. Define remaining participant membership/active checks transactionally; ordinary row CHECKs must not query other tables. Cover direct SQL/API violations, rollback, concurrency, and preservation; score/judge event constraints extend in P6-SCORING-MODEL.
- [ ] P3-HISTORY: before P5-ENTRIES/SUBMISSION, specify submitted participant/studio/configuration snapshots or versioned records, audit provenance, and optimistic revision/conflict semantics. Later profile/dancer/configuration edits must not silently rewrite submitted/historical entries; define correction versioning and privacy-minimal retention. Test stale writes/concurrent submits, unchanged historical display, and explicit correction/audit outcomes with preservation migrations.
- [ ] P3-CALENDAR-DATES: audit legacy timestamp interpretation before conversion; choose native PostgreSQL date for dancer birth dates with documented mapping/backfill and leap-day/timezone tests. Define event/deadline instant storage, IANA event timezone, DST behavior and age-calculation date policy with P3-REGISTRATION/ENTRIES. Never blindly truncate or reinterpret existing timestamps. Complete before M3 eligibility; M2 event time/deadline semantics must already be explicit in P3-REGISTRATION.
- [ ] P3-INDEXES: review actual event registration/approval queues, studio rosters, memberships by user, judges by event, participants by dancer and active-record queries using representative EXPLAIN plans. Add only useful missing FK/filter/order indexes, respecting existing composite-index prefixes and SQL-only objects. Verify migration parity and performance; FK declarations do not index their referencing columns automatically. P2-SCHEMA-AUDIT [initial plans](../SCHEMA_SUITABILITY_AUDIT.md#query-driven-index-review) confirm reverse-key scan candidates; recheck actual projections/joins/order and workload distributions here before selecting indexes. No performance index was added early.
- [ ] P3-DATA-HYGIENE: add needed mutable-entity timestamps, intentional referential actions/indexes, consistent active filters and deletedBy/deactivatedBy actor fields. Define restore policy. Audit legacy birth-date timezone interpretation before converting values; current UTC calendar serialization does not rewrite stored dates. Retain historical data under P2-PRIVACY.
- [ ] P3-ENTRIES: after P3-PERFORMANCE-OWNER and the P3-HISTORY/CONSTRAINTS/CALENDAR-DATES designs, implement durable incomplete drafts without stage order, explicit submission/receipt state, idempotent retries, revision conflicts, correction scope/deadline, locks and withdrawal/resubmission. Record nullable transitional fields versus dedicated draft representation before code; validation becomes strict at submit, not every draft save. Keep submission separate from approval. Define age policy, format count/duration, entry/music deadlines and required music rules with backend tests; do not require Phase 6 schedule generation to save/submit an unscheduled entry.
- [ ] P3-MUSIC-MODEL: before P5-MUSIC, define file metadata, upload ownership, replacement lifecycle, and private access; store media outside PostgreSQL. Apply P2-PRIVACY and P8-MEDIA requirements.

- [x] P3-REGISTRATION-REAPPLY (local technical scope, 2026-11-09; required slice of P3-REGISTRATION): canonical POST accepts same-studio/event reapplication, retaining studio/registration IDs, memberships and audit history. Revisioned cancellation stores CANCELLED; stale/lost-response/concurrent create/cancel/reapply, wrong owner/event, inactive membership, deadline/admin/closed-stage denial and audit rollback pass in HTTP/PostgreSQL. Global active-name uniqueness remains; no multi-event reuse/merge/new-studio workaround. P5-APPLICATION owns browser recovery. See [evidence](../REGISTRATION_LIFECYCLE_VALIDATION.md).

Exit for M2 subset: P3-REGISTRATION including REGISTRATION-REAPPLY and relevant migration invariants pass on empty
and representative databases. P3-STUDIO-IDENTITY must pass before multi-event reuse;
a single-event application does not require reuse. Exit for the full phase/M3:
entry/roster/music invariants and preservation tests pass. Scoring/scheduling remain
separate Phase 6 dependencies and cannot block registration-only delivery.

## M3 and reuse sequencing

After the local M2 workflow works, establish explicit performance ownership,
calendar dates, event-consistent constraints and history/revision designs before
P3-ENTRIES. Event timezone/deadline semantics already belong in P3-REGISTRATION;
the remaining dancer date/age work must not delay M2. P3-MUSIC-MODEL precedes
P8-MEDIA/P5-MUSIC; scheduling and scoring remain later consumers.

P3-STUDIO-NAMES policy must precede any name-index change. P3-STUDIO-IDENTITY
must precede P5-REUSE and shared cross-event edits; coordinate its migrations with
the name and history decisions when that extension is selected. Neither global
reuse nor that migration is required for the single-event M2 workflow or a
single-event M3 entry, provided ownership/history invariants are satisfied.
P3-INDEXES uses the actual queries delivered by each workflow; P3-DATA-HYGIENE's
needed audit/active/referential fields are handled with their owning model task.
Do not use these broad reviews to defer required integrity checks, or to add
unsupported restore/reuse work to the M2 critical path.
