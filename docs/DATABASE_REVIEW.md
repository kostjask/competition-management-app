# Database integrity and UX review

Reviewed: 2026-10-24

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
| Global uniqueness | New SQL-only indexes enforce global-role and null-safe outstanding-invitation uniqueness; used/superseded history remains. | P2-SCOPE-INTEGRITY technically complete; deployed duplicate/provenance review is P2-SCOPE-DEPLOY. Token/resend/revoke lifecycle remains P2-IDENTITY-TOKENS/INVITE. |
| Identity and tokens | User email is text-unique without normalization in the shared input schema; verificationToken has no expiry metadata, and invitation tokens are stored directly. Invitations cannot reference a studio. | P2-IDENTITY-TOKENS: define email canonicalization/collision resolution and purpose-specific token digest, expiry, consumption/revocation, and rotation. P2-STAFF-MODEL/P5-MEMBERS define studio-bound invitation scope. |
| Studio identity | Studio belongs directly to one Event as well as having event registrations. | P3-STUDIO-IDENTITY: implement accepted ADR-001 with preserved memberships, approvals and history; multi-event reuse stays disabled until ready. |
| Studio names | SQL-only Studio_name_active_unique enforces global, case-sensitive active-name uniqueness. This can block unrelated organizations sharing a display name. | P3-STUDIO-NAMES: record the identity/duplicate-review policy before any new migration. Recommended target is non-unique display names with stable ID identity; no automatic merging or silent relaxation of current behavior. |
| Performance ownership | Performance has no studio/registration owner field; controllers infer ownership from its participant dancers. Empty/mixed legacy sets are not a reliable owner. | P3-PERFORMANCE-OWNER: define an explicit event-consistent owning studio/registration relationship, audit/backfill unambiguous records, and reject ambiguous data for reviewed repair rather than guessing from the first dancer. |
| Drafts versus scheduling | Current creation requires complete entry data and an event-unique orderOnStage. Archived entries retain their reserved order. | P3-ENTRIES: allow authorized incomplete drafts without stage order, with strict final validation. Decide nullable transitional fields versus a dedicated draft structure before implementation. P6-LIVE-MODEL supplies separate schedule-entry/stage/session ordering. |
| Cross-event consistency | Individual foreign keys do not require a performance's configuration or a score's judge to belong to the same event. Current controllers enforce several relationships. | P3-CONSTRAINTS and P6-SCORING-MODEL: add suitable compound keys/foreign keys where practical, retaining backend validation and transaction rules for relationships not expressible directly. |
| Historical accuracy | Performances reference mutable dancer/configuration records; there is no submission version/snapshot. | P3-HISTORY: define immutable submitted participant/configuration snapshots or versioned records plus revision/conflict checks. Later profile/roster edits must not silently alter historical entries or published calculations. |
| Dates and time | Birth dates are timestamps serialized to their UTC calendar day; event instants use timestamp columns and there is no event timezone or age-reference policy. | P3-CALENDAR-DATES: audit historical interpretation, then migrate birth dates to native date where agreed. Define timezone-aware event/deadline instant storage and an explicit IANA event timezone. Never apply a blind timestamp/date conversion. |
| Score precision | Score uses a free-text criterion and Float value; no rubric range/step, lock, submission, assignment, or versioned calculation model exists. | P6-SCORING-MODEL: choose scaled integer or Decimal precision from the scoring specification, define rounding/tie behavior and finite/range/step validation, and migrate existing values under explicit conversion rules. |
| Constraints and query performance | No business CHECK constraints or explicit non-unique indexes appear in the Prisma schema. Existing unique indexes cover some query prefixes, not every foreign-key lookup. | P3-CONSTRAINTS/P3-INDEXES: add row invariants and query-driven indexes without duplicating existing coverage; verify representative plans and migration parity. |
| Audit and removal | Mutable entities have inconsistent timestamps and actor fields; there is no durable AuditLog, assignment lifecycle, or restore specification. | P2-AUDIT/STAFF-MODEL and P3-DATA-HYGIENE: explicit actor references, safe audit records, intentional referential actions, restore conflicts, and history-preserving access removal. |

## Required design decisions before migrations

- ADR-008 selects restricted deletion and null-safe uniqueness/history. Review
  existing null-scoped assignments without guessing whether scope was lost;
  complete P2-SCOPE-DEPLOY before rollout. Broader revoke/resend lifecycle remains
  P2-IDENTITY-TOKENS/INVITE; preserve accepted/revoked history.
- Specify email normalization across signup, login, invitations, and contact
  matching. Audit collisions first; never merge accounts or change ownership based
  on normalized email alone. Keep login identity distinct from editable contact data.
- Specify token-purpose separation, digest-only secret storage, expiry and atomic
  consume/revoke/resend behavior. Define how existing token links expire or rotate
  safely; keep raw secrets out of audit records, ordinary DTOs, logs and migration output.
- Record the display-name identity policy before dropping/replacing the current
  studio index. Dancer names/birth dates likewise must not become unique identity
  keys: legitimate people can share them. Duplicate suggestions require review.
- Choose performance ownership and draft storage together, with one canonical
  create/update/submit contract and explicit required fields at each transition.
  Preserve IDs, participants, scores, and published data when backfilling ownership.
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
draft representation, snapshot design, precision and constraint implementation
choices remain pending rather than silently accepted migrations.

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
