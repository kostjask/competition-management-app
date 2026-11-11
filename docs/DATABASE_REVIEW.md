# Database integrity and UX review

Reviewed: 2026-10-24

Current follow-up: [P2-SCHEMA-AUDIT](SCHEMA_SUITABILITY_AUDIT.md) reassesses the
working tree, SQL-only objects, Compose metadata and synthetic query plans, and
implements token row checks plus complete studio-index parity. Read that report
for its dated catalog/query evidence. This review retains domain concerns; the
[checkpoint](../DEVELOPMENT_PLAN.md) and roadmaps own current status.
Follow-up source review (2026-11-10) reconciles implemented staff/audit, M2
timezone/deadline and invitation management below. ADR-022 and the
[ownership evidence](PERFORMANCE_OWNERSHIP_VALIDATION.md) add the 2026-11-11
explicit owner/constraint implementation and local runtime checks.
Development data is [disposable](TESTING.md#development-database-and-disposable-data);
no compatibility work is required solely to preserve test rows.

Scope: repository Prisma schema, migration SQL, shared contracts, and relevant
controllers. No live records were inspected and no database tests were run for
this review. Findings describe the schema produced by repository migrations;
confirm deployment parity before changing an existing database.

The current relational foundation includes primary/foreign keys, explicit studio
membership, separate organization/event approval, participant uniqueness, and
soft deletion for core registration entities. It is not yet a complete draft,
scheduling, scoring, or history model. This guide records current limitations and
recommended targets; it introduces no implemented schema, endpoint, or permission.
The [development plan](../DEVELOPMENT_PLAN.md) owns priority and completion status.

Implemented follow-up (2026-10-25): P2-SCOPE-INTEGRITY adds restrictive event
foreign keys, global-role uniqueness and null-safe outstanding-invitation
uniqueness in a new migration. Expired invitation replacements retain history.
The first two findings below reflect the implemented follow-up; their selected
policy and rollout requirements are now [ADR-008](adr/008-event-scope-integrity.md).
No deployed data was inspected, repaired or migrated. Run the read-only preflight
and provenance review before deployment; local fixtures cannot establish whether
an existing null scope was intentional.

## Findings and delivery gates

| Area | Current structure and consequence | Target and owning task |
| --- | --- | --- |
| Event permission scope | New migration uses RESTRICT for UserRole/Invitation event references; null still means global. | P2-SCOPE-INTEGRITY technically complete (ADR-008). P2-SCOPE-DEPLOY provenance review/rollout remains required before deployment/M1. No event-delete endpoint. |
| Global uniqueness | New SQL-only indexes enforce global-role and null-safe outstanding-invitation uniqueness; used/superseded history remains. | P2-SCOPE-INTEGRITY technically complete; deployed duplicate/provenance review is P2-SCOPE-DEPLOY. Internal token lifecycle is implemented; public resend/revoke management is delivered under ADR-017. |
| Identity and tokens | Canonical account/invitation email, purpose-bound digests, expiry and atomic lifecycle are implemented under ADR-009/010; schema audit adds storage CHECKs. Invitations can reference a studio under ADR-013; representative invitation UI remains P5-MEMBERS. | P2-IDENTITY-TOKENS complete technically. P2-AUTH/INVITE/EMAIL own public workflows; P2-STAFF-MODEL/P5-MEMBERS define studio-bound scope. Deployment preflights remain required. |
| Studio identity | Studio belongs directly to one Event as well as having event registrations. | P3-STUDIO-IDENTITY: implement accepted ADR-001 with preserved memberships, approvals and history; multi-event reuse stays disabled until ready. |
| Studio names | SQL-only Studio_name_active_unique enforces global, case-sensitive active-name uniqueness. This can block unrelated organizations sharing a display name. | P3-STUDIO-NAMES: record the identity/duplicate-review policy before any new migration. Recommended target is non-unique display names with stable ID identity; no automatic merging or silent relaxation of current behavior. |
| Performance ownership | ADR-022 stores immutable studio/event-registration ownership, including empty participants; compound keys protect event and participant membership. | P3-PERFORMANCE-OWNER is locally implemented; migration 33 audits/backfills only unambiguous owners and atomically refuses reviewed-repair cases. |
| Drafts versus scheduling | Current creation requires complete entry data and an event-unique orderOnStage. Archived entries retain their reserved order. | P3-ENTRIES: allow authorized incomplete drafts without stage order, with strict final validation. Decide nullable transitional fields versus a dedicated draft structure before implementation. P6-LIVE-MODEL supplies separate schedule-entry/stage/session ordering. |
| Cross-event consistency | Compound performance/configuration/registration/studio and participant/studio foreign keys are enforced under ADR-022. Scores still have separate judge/performance FKs. | P6-SCORING-MODEL owns score/judge event consistency; retain transactional active/permission validation. |
| Historical accuracy | Performances reference mutable dancer/configuration records; there is no submission version/snapshot. | P3-HISTORY: define immutable submitted participant/configuration snapshots or versioned records plus revision/conflict checks. Later profile/roster edits must not silently alter historical entries or published calculations. |
| Dates and time | Birth dates are timestamps serialized to their UTC calendar day; event instants use timestamp columns with IANA timeZone and optional registrationDeadline under ADR-003. Age-reference policy remains pending. | P3-CALENDAR-DATES: audit historical interpretation, then migrate birth dates to native date where agreed. M2 timezone/deadline storage/contracts are implemented; setup controls remain P4-CORE. Never apply a blind timestamp/date conversion. |
| Score precision | Score uses a free-text criterion and Float value; no rubric range/step, lock, submission, assignment, or versioned calculation model exists. | P6-SCORING-MODEL: choose scaled integer or Decimal precision from the scoring specification, define rounding/tie behavior and finite/range/step validation, and migrate existing values under explicit conversion rules. |
| Constraints and query performance | SQL-only email/token/M2 checks plus ADR-022 event dates/positive limits, age/format bounds and performance duration/order CHECKs exist with exact parity. | P3-INDEXES still requires measured reverse-key indexes; entry eligibility/history and scoring rules retain their owning tasks. |
| Audit and removal | Minimal immutable AuditLog and retained staff assignment lifecycle are implemented under ADR-012/013/018. General entity restore policy and per-feature audit/active fields remain pending. | P2-AUDIT/STAFF-MODEL and P3-DATA-HYGIENE: explicit actor references, safe audit records, intentional referential actions, restore conflicts, and history-preserving access removal. |

## Required design decisions before migrations

- ADR-008 selects restricted deletion and null-safe uniqueness/history. Review
  existing null-scoped assignments without guessing whether scope was lost;
  complete P2-SCOPE-DEPLOY before rollout. Public revoke/resend management is
  delivered under ADR-017; preserve accepted/revoked history.
- ADR-009/010 now specify canonical email and purpose-bound digest lifecycles.
  Keep deployment collision review, identity versus editable contact separation,
  legacy-link invalidation and secret-free delivery/audit rules during rollout.
- Record the display-name identity policy before dropping/replacing the current
  studio index. Dancer names/birth dates likewise must not become unique identity
  keys: legitimate people can share them. Duplicate suggestions require review.
- ADR-022 fixes explicit registration ownership without changing complete-entry
  creation semantics. P3-HISTORY/ENTRIES must choose draft storage, snapshots and
  canonical save/submit contracts before entry editing. Migration 33 preserves IDs,
  participants and scores or refuses ambiguous input without changing it.
- Decide what submission freezes: participant name/birth-date eligibility, studio
  display details, category/age/format rules, and later scoring-rule versions.
  Historical personal data must follow the privacy/retention policy; snapshots
  are not permission to copy or retain every private field indefinitely.
- Choose a monotonic revision or equivalent optimistic-concurrency mechanism so
  stale saves receive actionable conflicts rather than silently overwriting edits.
- Define stage/session ordering and moving/swapping/withdrawing entries, including
  archived-order reuse, transaction/uniqueness strategy, and rollback behavior.
  Entry identity/submission must remain independent of scheduling position.

New broad model decisions require an ADR or explicit amendment to the owning ADR
before dependent code/migration work. ADR-001's reusable identity and ADR-006's
account eligibility remain accepted; this review does not reopen them. Naming,
draft representation, snapshot design, precision and scoring constraints
remain pending; ADR-022 accepts the delivered ownership/row-integrity subset.

## Verification requirements

Use new migrations; never rewrite applied history. Audit existing rows for
duplicates, contradictory parents, invalid ranges, ambiguous dates, and legacy
scores before enforcing new constraints. Flag unresolved rows for explicit repair;
do not silently delete, merge, approve, or fabricate ownership.

- Rehearse empty-database deploy and representative upgrades; preserve IDs,
  approvals/locks, membership, participants, scores and audit provenance.
- Prove event removal cannot turn scoped roles/invitations global; exercise
  null-scoped duplicates and simultaneous invitation/assignment writes directly
  in PostgreSQL, not only mocked Prisma tests.
- Test row checks such as endsAt > startsAt, positive limits/durations/counts, and
  valid min/max age/participant ranges according to agreed domain boundaries.
  Keep cross-table rules out of ordinary row CHECK expressions; use composite
  foreign keys or appropriate transactional enforcement instead.
- Test unscheduled/incomplete drafts, unauthorized draft access, required-field
  submission failures, stale revision conflicts, concurrent submit/retry, schedule
  swaps and historical display after profile/configuration edits.
- Test date/leap-day/DST boundaries and score precision/rounding/ties with fixtures.
- Review indexes for event registration queues, rosters by studio, memberships by
  user, judges by event, and participants by dancer using representative query
  plans. PostgreSQL does not automatically index the referencing side of an FK.
- Preserve/document SQL-only indexes and constraints in migration parity checks.
  Explicitly plan backup, forward repair/rollback, and safe old-client transition.

## References

Repository sources: [Prisma schema](../apps/api/prisma/schema.prisma),
[role-scope migration](../apps/api/prisma/migrations/20260210211945_studio_representatives/migration.sql),
[invitation migration](../apps/api/prisma/migrations/20260212161609_user_verification_and_invitation/migration.sql),
[active studio-name index](../apps/api/prisma/migrations/20260219175019_studio_approval_status_and_soft_delete_name_rule/migration.sql),
[current API contracts](API.md), and [migration validation](MIGRATION_VALIDATION.md).

Technical guidance: [PostgreSQL constraints/null uniqueness and foreign keys](https://www.postgresql.org/docs/16/ddl-constraints.html),
[numeric precision](https://www.postgresql.org/docs/16/datatype-numeric.html),
[date/time types](https://www.postgresql.org/docs/16/datatype-datetime.html),
[Prisma PostgreSQL mappings](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql),
and [OWASP token lifecycle guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
