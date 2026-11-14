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
consume these contracts; [review/application evidence](../APPLICATION_REVIEW_VALIDATION.md)
records completed local validation (2026-11-11). P3-PERFORMANCE-OWNER and
P3-CONSTRAINTS with the read-only organizer register are also complete locally
under [ADR-022](../adr/022-performance-ownership-and-constraints.md), with
[ownership evidence](../PERFORMANCE_OWNERSHIP_VALIDATION.md). P3-CALENDAR-DATES and P3-HISTORY foundations now pass under
[ADR-023](../adr/023-entry-history-and-calendar-dates.md). P3-ENTRIES-DRAFT delivers
its bounded nullable/unscheduled draft prerequisite under
[ADR-024](../adr/024-incomplete-entry-drafts.md). Studio checkpoint/history consumers
are delivered locally under ADR-025; reversible withdrawal/resubmission keeps
P3-ENTRIES open. No scoring/live schema is needed for M2. Validation:
[registration evidence](../REGISTRATION_LIFECYCLE_VALIDATION.md).

Checkpoint delivery (2026-11-14): the user confirmed studio-wide checkpoints and
an allowance for any older dancers, without a next-age-group cap.
[ADR-025](../adr/025-entry-submission-lifecycle.md), the completed
[director questionnaire](../ENTRY_POLICY_QUESTIONNAIRE.md) and
[supplied rules](../DANCE_EXPRESS_RULES.md) record policy and provenance.
Migration 38, shared contracts, API and Cobalt S12 configuration/review/editor
implement independent basic/final windows, immutable manifests, eligibility,
locks, acceptance, scoped reopening and reasoned exceptions. Rules freeze once
registration begins. [Validation](../ENTRY_CHECKPOINT_VALIDATION.md) owns exact
results and the completed, explicitly authorized local database reset/reseed.
Music remains independently gated. No whole M3 or external release is claimed.

P3-UX-CONTRACTS is a cross-cutting contract checklist, not a separate all-domain
gate. Its M2 application/time/approval portion belongs with P3-REGISTRATION;
draft/history/selector portions belong with their M3 model tasks. Keep the umbrella
open until its delivered portions are complete. No scoring/live schema is needed
for M2, and P3-ENTRIES is an M3 prerequisite, not an M2 gate.

- [ ] P3-UX-CONTRACTS (M2 application/time/approval portion complete locally 2026-11-09 under ADR-003; M3 draft/history/selector/eligibility scope remains open): within existing model tasks, resolve UX-D05–D07 and record state/action/permission matrices and UI-ready DTOs for deadlines/timezone, both approvals, draft revisions, validation, receipts and corrections. Add authorized representative category/age-group/format option reads before S10 selectors: current setup reads require event.manage; do not grant management permission just to populate a form. Contract exit includes localized status/action examples, calendar/DST cases and explicit next actor/recovery rules. Approved models do not claim implemented screens.

- [x] P3-REGISTRATION (local technical scope, 2026-11-09): ADR-003 M2 state/action/actor/timezone/deadline/DST/correction/reason/retry/audit matrix accepted; migration 30, shared DTOs, canonical API/current clients and tests pass. Independent decisions derive access only when both approvals qualify; pending profile correction increments revision and returns organization approval to pending. Required reapply slice below passes. Live transitions remain P6-LIVE-MODEL; application/review screens and notifications remain P4/P5. See [evidence](../REGISTRATION_LIFECYCLE_VALIDATION.md).
- [ ] P3-STUDIO-IDENTITY: implement ADR-001 with data audit/backfill/preservation tests and a new migration; define shared studio/roster edit rules across event locks and historical entries before removing Studio.eventId. Never infer approval or auto-merge by name; flag contradictory participant/registration relationships. Multi-event reuse must not ship before this gate.
- [ ] P3-STUDIO-NAMES: decide/document display-name identity and duplicate-review policy before altering the global active-name index. Recommended target permits unrelated studios to share display names and uses stable IDs for identity; never auto-merge or add unique dancer name/birth-date identity keys. Audit existing records, search/disambiguation, rename/restore conflicts, canonical contracts, and index preservation/removal tests. Current case-sensitive global uniqueness remains until an explicit new migration; do not weaken it opportunistically in P1.
- [x] P3-PERFORMANCE-OWNER (local technical scope, 2026-11-11): ADR-022/migration 33 store immutable studio/event-registration ownership and event-consistent keys. Controllers/DTOs/clients use canonical explicit ownership, including empty participant reads; current active membership/approval/stage checks remain enforced. Migration audits all retained performances, backfills only unambiguous owners and atomically refuses empty/mixed/missing/cross-event legacy relationships for reviewed repair, preserving IDs/participants/scores. The owning read-only Cobalt organizer register, ET/EN/RU, negative ownership, database and browser checks pass. Single-studio entries remain the target; full draft editing stays gated. [Evidence](../PERFORMANCE_OWNERSHIP_VALIDATION.md).
- [x] P3-CONSTRAINTS (local technical scope, 2026-11-11): ADR-022/migration 33 validate existing data and add row CHECKs for event dates/positive limits, positive durations/counts and age/format bounds, plus compound category/age-group/format/owner and participant membership keys. Active checks run in serializable API write transactions; CHECKs query no other tables. Direct SQL/API violations, rollback, concurrent conflicts, preservation, invalid-upgrade refusal and fresh/upgrade parity pass with the organizer register's browser scope. Score/judge event constraints remain P6-SCORING-MODEL. [Evidence](../PERFORMANCE_OWNERSHIP_VALIDATION.md).
- [x] P3-HISTORY (local technical scope, 2026-11-14): ADR-023/migration 35 foundations and ADR-025/migration 38 consumers implement immutable privacy-minimal source snapshots, migration/user/CHECKPOINT provenance, optimistic revisions, exact manifest receipts and atomic audit. Concurrent submission, current-version acceptance, scoped correction/resubmission, lost-response retries, SQL immutability/ownership and rollback checks cover the consumers. Organizer history and checkpoint acknowledgements preserve ET/EN/RU and recovery. [Foundation evidence](../ENTRY_HISTORY_CALENDAR_VALIDATION.md), [consumer evidence](../ENTRY_CHECKPOINT_VALIDATION.md). The verified local application database is now reset/reseeded; external release gates remain open.
- [x] P3-CALENDAR-DATES (local technical scope, 2026-11-11): ADR-023/migration 34 audit all retained timestamps, refuse unsupported/non-midnight values for reviewed repair and preserve existing UTC calendar days in native DATE. Shared completed-age calculation uses the event-local start date; February 29 advances on March 1 in non-leap years. UTC HTTP/Prisma mapping, leap/day/DST/session-zone and migration parity/refusal checks pass with the organizer reference-date/history UI. ADR-003/020 event/deadline instant semantics remain unchanged. Submit-time eligibility enforcement belongs to P3-ENTRIES. [Evidence](../ENTRY_HISTORY_CALENDAR_VALIDATION.md).
- [ ] P3-INDEXES: review actual event registration/approval queues, studio rosters, memberships by user, judges by event, participants by dancer and active-record queries using representative EXPLAIN plans. Add only useful missing FK/filter/order indexes, respecting existing composite-index prefixes and SQL-only objects. Verify migration parity and performance; FK declarations do not index their referencing columns automatically. P2-SCHEMA-AUDIT [initial plans](../SCHEMA_SUITABILITY_AUDIT.md#query-driven-index-review) confirm reverse-key scan candidates; recheck actual projections/joins/order and workload distributions here before selecting indexes. No performance index was added early.
- [ ] P3-DATA-HYGIENE: add needed mutable-entity timestamps, intentional referential actions/indexes, consistent active filters and deletedBy/deactivatedBy actor fields. Define restore policy. Audit legacy birth-date timezone interpretation before converting values; current UTC calendar serialization does not rewrite stored dates. Retain historical data under P2-PRIVACY.
- [ ] P3-ENTRIES (core checkpoint slice delivered locally 2026-11-14; parent remains open): ADR-024 durable nullable drafts now feed ADR-025 studio-wide basic/final checkpoints. Shared contracts, migration 38, API and owning organizer UI implement receipts, independent acceptance, actor-bound retries, revision conflicts, early/deadline locks, whole/field/entry reopening, late organizer exceptions, category-specific nominations, any-older percentage eligibility, rule freeze and teacher/author credits. [Evidence](../ENTRY_CHECKPOINT_VALIDATION.md). Next: same-identity reversible withdrawal/resubmission and organizer recovery UI; current soft archival has no restore endpoint. Initial per-event-day estimates belong to P5-APPLICATION-ESTIMATES; complete option/preset setup remains P4-ENTRY-CONFIG. Music confirmation/acceptance/reminders retain P3-MUSIC-MODEL/P8-MEDIA/P5-MUSIC gates. Keep studio approval, entry review and music acceptance distinct. No Phase 6 schedule prerequisite.
- [x] P3-ENTRIES-DRAFT (bounded local prerequisite, 2026-11-12): ADR-024/migration 36 retain one identity/immutable owner through nullable unscheduled create, completion, clearing and archive. Supplied relationships/values remain validated; current access/revisions, atomic snapshots/audit and actor/event-bound creation retry recovery apply. The Cobalt organizer inline owner/title form, missing-field/unscheduled summaries and nullable history support ET/EN/RU, keyboard and filter/session recovery. [Evidence](../ENTRY_DRAFT_VALIDATION.md). This closes only the draft slice; later checkpoint/history consumers are delivered above, while reversible withdrawal/resubmission keeps P3-ENTRIES open.
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
