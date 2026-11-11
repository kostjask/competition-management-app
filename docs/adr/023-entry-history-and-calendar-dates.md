# ADR-023: Entry history and calendar dates

Accepted for local implementation: 2026-11-11. Owners: P3-HISTORY and
P3-CALENDAR-DATES. This establishes foundations for P3-ENTRIES, not submission.

## Calendar and eligibility

Dancer birth dates are PostgreSQL DATE values, transported as YYYY-MM-DD. Prisma
represents them as Date at UTC midnight; never format a birth date in the user's
timezone. The original column is TIMESTAMP(3) without time zone. Current canonical
writes use UTC midnight and reads expose the UTC day. Migration 34 audits every
row including archives and refuses non-midnight values before DDL. Reviewed repair
must establish the intended date; there is no timezone guess or blind truncation.
Midnight values retain their existing displayed day, including leap days.

The eligibility reference is the event start's calendar date in its stored IANA
timezone. Age is completed years on that date; February 29 birthdays advance on
March 1 in non-leap years. A birth date after that date is invalid for eligibility.
Event/deadline instants and DST gap/fold behavior remain ADR-003/020. This task
does not change their timestamp columns or apply eligibility to legacy saves.
P3-ENTRIES must enforce age/format rules at submission; incomplete drafts may
remain invalid. Event date/timezone changes affect future revisions only.

## Immutable revisions

Each performance has a positive optimistic revision. Every canonical create,
edit and archive atomically appends an immutable PerformanceRevision containing
the studio display name/IDs, entry fields, configuration names/bounds, ordered
participant IDs/names/calendar birth dates, event timezone/reference date and
policy version. Exclude contacts, billing, photos, paths, passwords and scores.
Audit stores IDs/revision only, not snapshot personal data. User provenance is
an actor relation; migrated baselines explicitly have no historical actor/time.
Their createdAt is capture time, never claimed as the original save/submission.

Migration 35 captures all retained records, including archives, as revision 1
with LEGACY_BASELINE provenance. It never invents past submission or corrections.
Later source edits do not alter snapshots. A new performance revision captures
then-current sources. History reads use saved values, never live joins for display.
Snapshots and their provenance cannot be updated/deleted through SQL or the API;
restrictive foreign keys retain owner/performance/actor identity. Soft deletion
retains versions. Standard history access requires the same active owner and
authorization as existing performance reads; archived entries have no new public
read path. No public export or automatic retention/erasure is introduced.
Retention periods need the organizational review in PRIVACY before real data use.

PATCH requires expectedRevision; DELETE requires expectedRevision in the query.
A stale or concurrent change returns 409 without partial participants, history or
audit. Reload and compare the authoritative revision before retrying; an uncertain
write is reconciled through GET/history. Never automatically overwrite a newer
revision. Snapshot creation and audit share the serializable write transaction.

## Required submission/correction consumer

P3-ENTRIES must atomically pin an immutable revision in its submission receipt
using expectedRevision plus a retained UUID operation ID/request digest. Identical
retries return the receipt, mismatched reuse conflicts; concurrent submits yield
one receipt. A correction creates a new revision and receipt referencing the prior
receipt with actor, semantic reason, allowed field scope and deadline; it never
rewrites a prior snapshot. Withdrawal/lock state belongs to that lifecycle, not an
event stage or this history table. Implement and test concurrent submits, receipts,
correction authorization and stale correction scopes there before P5 editing.

Rollback requires a reviewed forward migration and coordinated binaries. Reverting
DATE to timestamps cannot recover unknown legacy zones. Dropping revision storage
would destroy retained evidence and is not an acceptable application rollback.
