# Schema suitability audit

Reviewed: 2026-10-25. Task: P2-SCHEMA-AUDIT. Evidence refers to the working tree,
including pending migrations, not a committed/deployed revision. This supersedes
the structural status in the dated [database review](DATABASE_REVIEW.md).

## Conclusion and scope

Retain the relational foundation and existing canonical APIs. Implemented two
bounded improvements: database checks for the already-accepted ADR-010 token
storage rules, and exact parity coverage for the previously excluded active
studio-name index. No broader schema redesign is justified before its existing
domain decisions. No dependency, HTTP DTO, client, endpoint or seed contract changes
are needed; the token service already writes the guarded states. Expired-token
fixtures now use historically coherent issuance/expiry dates.

Reviewed all 19 Prisma models, migration DDL, shared schemas, identity services,
authentication middleware and mounted controllers against the onboarding,
registration, entry, staff, media and scoring boundaries in
[DOMAIN](DOMAIN.md), [ADR-001](adr/001-studio-identity-and-event-registration.md),
[ADR-006](adr/006-account-eligibility-and-staff-onboarding.md),
[foundation](roadmap/foundation.md), [registration](roadmap/registration.md) and
[competition](roadmap/competition.md). Accepted product direction is retained;
pending domain decisions below are proposals, not newly implemented features.

## Catalog and environment evidence

Fresh application of all migrations in an isolated PostgreSQL 16 schema yielded
19 business tables, 134 columns, 27 foreign keys, 35 indexes and eight CHECKs.
All 27 foreign keys use RESTRICT on deletion. Column types include 95 text,
20 timestamp-without-time-zone, nine int4, four bool, one jsonb, one float8 and
four enum columns. There is no native calendar date, timestamptz or Decimal score
column. Prisma defaults for UUID/CUID IDs and updatedAt are client behavior;
do not treat them as database-generated identity or update triggers.

Eight SQL-only checks comprise the two canonical-email guards and six new token
guards. SQL-only indexes comprise active studio-name uniqueness, global-role
uniqueness, null-safe outstanding-invitation uniqueness and outstanding account
tokens. The migration suite now compares all index definitions, including the
studio index, alongside columns, enums and constraints. No catalog exclusion
remains for that index.

Read-only metadata inspection of the checked-in Compose service's dance_comp
database found 18 business tables, no AccountToken table, two legacy secret
columns and migration history ending at 20261023190000_add_event_max_performances.
This is known lag behind the working tree, not target-schema parity. No rows,
secret columns, credentials or application environment files were read. The API's
configured DATABASE_URL was not inspected, so this does not identify any other
application/deployment target. Existing Compose application rows were not reset,
migrated or reseeded. Audit/test scripts wrote only their own random schemas or
baseline databases and removed them through their cleanup paths.

Before running the new API against an older database, verify its target, run the
scope/email preflights and apply pending migrations with the coordinated rollout
in ADR-008/009/010. Existing plaintext links are invalidated by the lifecycle
migration. Disposable development reset is permitted after target verification;
no reset or legacy compatibility layer was necessary for this audit.

## Prioritized findings and decisions

| Priority / area | Evidence and consequence | Decision, target and owner |
| --- | --- | --- |
| Implemented: identity row integrity | AccountToken and Invitation previously accepted malformed digests; account tokens allowed zero/negative lifetimes or both terminal states; a pending invitation could have no usable secret. See schema and identityTokens service. | New 20261025030000_identity_token_checks enforces ADR-010 without repairing rows. Invalid data refuses migration atomically. No authentication authorization is delegated to these row checks. |
| Implemented: parity blind spot | test-migrations.ps1 excluded Studio_name_active_unique from catalog signatures despite its role in current duplicate-name behavior. | Include its exact DDL in expected schema and compare every index. Preserve global case-sensitive active-name uniqueness until P3-STUDIO-NAMES decides otherwise. |
| Immediate security behavior, existing owners | UserRole eventId remains nullable, Invitation roleKey is free text with no role FK/studio binding, and auth middleware resolves roles without checking active/existing/verified users. Scoped admin still sets the global bypass. | P2-AUTH next. P2-STAFF-MODEL/ROLES-ADMIN-SCOPE define allowed role references/event scope; P2-INVITE-IDENTITY authenticates the intended active account. Do not make every eventId nonnull or infer global intent; controlled global admins remain valid. |
| Onboarding / durable accountability | User supports roleless pending accounts, but has no onboarding draft, locale or durable audit relation. deletedBy/deactivatedBy are text, not actor FKs. | P2-ONBOARDING-MODEL defines resumable account context; P2-AUDIT/PRIVACY define actor identity, safe metadata and retention before adding storage. Preserve pending users; an intent flag/contact email must never prove privilege. I18N-PREFERENCES owns locale persistence. |
| Organization identity / registration | Studio.eventId duplicates the event path through StudioEventRegistration; membership has a unique studio/user pair; registration has a unique studio/event pair. Controllers currently enforce the same event in nested creation and reads. | Retain current single-event behavior. ADR-001's reusable Studio plus event registrations is the target under P3-STUDIO-IDENTITY. Preserve approvals/memberships; do not remove eventId independently. P3-STUDIO-NAMES owns display-name policy, and REGISTRATION-REAPPLY owns identity-preserving cancellation/reapplication. |
| Performance owner / cross-event keys | Performance stores configuration IDs but no studio/registration owner. PerformancesController derives exactly one studio from participants and rejects ambiguous sets; validateSelection checks event/studio/active relationships in code. Separate FKs still permit contradictory parents through direct SQL. | Prefer an explicit event registration owner for event-bound entries, subject to P3-PERFORMANCE-OWNER's ADR. Compare with direct studio ownership before accepting it. P3-CONSTRAINTS adds event-consistent composite keys/FKs where practical; participant membership/active checks remain transactional. No first-dancer inference or ownership backfill in this audit. |
| Entry drafts / scheduling / history | Performance requires complete configuration and event-unique orderOnStage; archived rows reserve their order. Mutable dancers/configuration can change historical display. | P3-ENTRIES compares nullable draft fields against separate draft storage after OWNER/HISTORY decisions. Separate submission and scheduling; P6-LIVE-MODEL owns schedule placement. P3-HISTORY chooses revisions and privacy-minimal immutable snapshots. Do not relax required columns or release archived order before those gates. |
| Date/time, numeric bounds and capacity | Event/dancer timestamps have no timezone/date distinction in PostgreSQL; event ordering/ranges are validated in shared schemas/controllers, not row CHECKs. maxStudios/maxPerformances fields alone do not enforce concurrent capacity. | P3-REGISTRATION/CALENDAR-DATES define IANA event timezone, event/deadline instant mapping, age-reference day and native birth date after interpretation audit. Recommend native date for calendar-only birth dates and explicit instant/timezone storage; never blindly cast historical values. P3-CONSTRAINTS owns event/configuration/entry bounds; capacity needs transactional application rules. |
| Judges / scoring | Judge is unique per user/event but separate from UserRole. Score is unique per performance/judge/free-text criterion; value is float8; no same-event FK, rubric, sheet lock or scoring version exists. | P2-JUDGE-ACCEPT/OFFBOARD reconcile assignment/access and preserve score history. P6-SCORING-MODEL decides scaled integer versus Decimal using rubric steps, rounding and ties; do not pick precision or convert scores without that specification. |
| Removal, normalization and media | All 27 FK deletions restrict history loss. Studio/Dancer/Performance use soft deletion; User/membership use active state; actors/timestamps differ by model. Images store nullable path/URL text; billing details use nullable jsonb. | Retain restrictive actions and ID-based relationships. P2-PRIVACY/AUDIT and P3-DATA-HYGIENE define removal/restore/actor consistency. Keep files outside PostgreSQL; P2-BOUNDARIES-UPLOADS secures current resource ownership/content, P3-MUSIC-MODEL/P8-MEDIA own durable media metadata/lifecycle. Do not expand private billing/contact copies. |

Role, Permission and RolePermission already separate stable keys from labels and
use unique keys/composite association identity. UserRole's normal composite and
SQL-only global uniqueness cover null scope deliberately. Keep these structures;
permission semantics must be corrected in their handlers rather than inferred
from display names. User.email remains canonical under ADR-009; editable
StudioRepresentative contact/name snapshots remain distinct from User identity
and cannot grant ownership. Mixed UUID/CUID text IDs are compatible with shared
string IDs; converting every key to a native UUID would add churn with no concrete
query or integrity benefit. Nullable passwords represent incomplete setup, not
evidence of an implemented OAuth workflow.

## Query-driven index review

`node scripts/audit-schema-fixture.cjs` creates a random schema from every migration,
loads 10,000 synthetic rows per reviewed table (100 events), ANALYZEs those tables,
then runs EXPLAIN ANALYZE with buffers. Output contains catalog/plan metadata only.
Representative predicate probes isolate index coverage; these are not end-to-end
API latency measurements or production workload predictions.

| Predicate / source | Observed plan | Rows returned / filtered | Shared hits |
| --- | --- | --- | --- |
| UserRole.userId, auth middleware | UserRole_userId_roleId_eventId_key index scan | 1 / 0 | 3 |
| AccountToken user/purpose/outstanding, rotation | AccountToken_outstanding_unique index scan | 1 / 0 | 3 |
| Invitation canonical email/role/null event/outstanding, creation | Invitation_outstanding_unique index scan | 1 / 0 | 3 |
| Active membership by user, studio visibility | Sequential scan | 1 / 9,999 | 124 |
| Pending registrations by event, queue candidate ordering | Sequential scan plus sort | 100 / 9,900 | 100 |
| Judges by event, JudgesController | Sequential scan | 100 / 9,900 | 74 |
| Active dancers by studio, DancersController | Sequential scan | 1 / 9,999 | 94 |
| Participants by dancer, reverse relation | Sequential scan | 1 / 9,999 | 54 |

Retain the foundation indexes; adding another index on those prefixes is redundant
for these probes. Route measured reverse-key candidates to P3-INDEXES: membership
userId/active, registration eventId/status/order, judge eventId, dancer
studioId/deletedAt, participant dancerId. Recheck actual controller projections,
joins, sort order, active distributions and read/write cost before selecting
columns or partial predicates. Existing studio/user, studio/event, user/event and
performance/dancer composite indexes do not supply those reversed leading keys.
No new performance index is added ahead of that owning task's gates.

## Migration, regression and validation evidence

The new migration adds six row-local CHECKs in one transaction, validating existing
rows and changing no stored values. It takes PostgreSQL ALTER TABLE locks; plan
stopped writers or a reviewed rollout window on retained environments. SQL-only
objects are documented on the Prisma models and included in schema parity. A
reviewed forward migration can remove these checks without a data conversion;
it relaxes protection. No applied migration history is rewritten.

`check-token-constraints.cjs` proves each invalid state was accepted before this
migration, then makes the upgrade refuse it with all six additions rolled back.
The valid upgrade preserves full account/token/invitation records, including
historical null digests. After upgrade, direct invalid writes fail with unchanged
records. Existing HTTP/database tests retain inactive/cross-event/studio denial,
verification/recovery concurrency, token rotation/replay and transaction rollback.

Completed commands:

- `pnpm.cmd db:generate`, `pnpm.cmd db:validate`, Prisma format check: passed using
  a nonconnecting placeholder DATABASE_URL, without editing environment files.
- `pnpm.cmd build`, `pnpm.cmd typecheck`, `pnpm.cmd lint`, `pnpm.cmd test`: passed;
  76 API tests and eight frontend tests plus localization guard. API tasks ran
  fresh; unchanged workspace outputs/frontend/lint used Turbo cache.
- `node --check scripts/check-token-constraints.cjs` and
  `node --check scripts/audit-schema-fixture.cjs`: passed.
- `node scripts/audit-schema-fixture.cjs`: passed; catalog/plans above recorded and
  the synthetic schema removed.
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1`:
  passed fresh/upgrade parity; rerun passed with the studio index included.

- `pnpm.cmd test:baseline`: passed the new six-check direct-write/refusal fixtures,
  full-record upgrade preservation, empty deployment/redeployment/seed checks and
  all existing domain, identity/concurrency and HTTP/database workflows.
- `node --check scripts/check-docs.cjs`, `node scripts/check-docs.cjs` and
  `git diff --check`: passed; final diff reviewed.

No deployment, human/browser review, hosted CI run or production workload claim
follows from this technical audit.

Next: P2-AUTH under the correction order. P2-SCOPE-DEPLOY remains an operational
gate; the 14 remaining security/workflow findings retain their existing owners.
