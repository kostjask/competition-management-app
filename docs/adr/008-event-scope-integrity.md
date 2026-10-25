# ADR-008: preserve event scope and invitation history

Status: Accepted (2026-10-25)

## Decision

Physical event deletion is restricted while UserRole or Invitation references
exist. Keep those references for access and invitation history; event lifecycle
changes remain separate. No deletion endpoint or automatic assignment removal is
introduced. Null continues to mean deliberately global access. Existing null
scopes require an operator provenance review: they cannot be reconstructed from
the current database and must never be guessed or automatically reassigned.

Keep the Prisma compound UserRole unique index for event-scoped queries and add
a SQL-only unique (userId, roleId) partial index for null event scope. Global
lookups use typed findFirst predicates; Prisma cannot use null in the compound
unique input. Together the indexes prevent duplicate global and event assignments.

Replace permanent invitation tuple uniqueness with a SQL-only unique index on
(email, roleKey, eventId) NULLS NOT DISTINCT, limited to rows where usedAt and
supersededAt are null. Email comparison remains exact and case-sensitive until
P2-IDENTITY-TOKENS. Expiration is checked at request time, not in an index predicate.
Creating a replacement atomically marks expired outstanding invitations with
supersededAt before inserting a new row. Used and superseded rows retain IDs,
tokens, timestamps and scope; they do not prevent future invitations. Acceptance
and replacement use serializable transactions. There is no resend/revoke API in
this slice; those and digest-only tokens remain separate Phase 2 tasks.

## Migration and operations

Run scripts/audit-scope-integrity.sql read-only on each intended deployment before
deploying. It emits aggregate counts only. Review every null-scoped assignment
and invitation through authorized operator tooling; zero duplicates alone is not
proof that global scope was intended. No deployed-data audit is claimed locally.

The new migration takes write-blocking locks, rejects duplicate roles or
outstanding invitations (including expired ones), and changes no existing row.
An operator must resolve ambiguous duplicates with recorded policy before retry;
never merge/delete rows automatically. Deploy in a maintenance window with a
backup and stopped writers; apply migration before the matching API. Old API
writers cannot replace expired invitations under the new index and must not be
kept running. Prisma schema push/diff alone cannot recreate the SQL-only indexes.

Rollback is a forward repair, not an automatic down migration: reverting to
SET NULL would reopen privilege broadening, and restoring permanent invitation
uniqueness may fail after legitimate history accumulates. Preserve the new
constraints during application rollback; restore a verified backup only under an
explicit operational recovery plan. Rehearse fresh and existing-data upgrades,
rejected ambiguous upgrades, direct database concurrent writes, failed deletes,
and invitation replacement/acceptance before release.

PostgreSQL supports null-safe uniqueness and partial indexes as documented in
[constraints](https://www.postgresql.org/docs/16/ddl-constraints.html) and
[CREATE INDEX](https://www.postgresql.org/docs/16/sql-createindex.html).
