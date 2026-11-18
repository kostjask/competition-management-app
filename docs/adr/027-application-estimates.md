# ADR-027: Revisioned application planning estimates

Accepted for local implementation, 2026-11-18. Owns P5-APPLICATION-ESTIMATES.

Counts are planning information, not performances, submitted entries, capacity
reservations or another approval axis. Saving does not reset either approval,
create entry rows, grant access or send decision mail. Review consumes the latest
snapshot and its history in S06; applicants use S08.

Each supplied snapshot contains every inclusive event-local calendar date from
startsAt through endsAt exactly once, including explicit zeroes. Dates advance
as calendar dates across DST, never as 24-hour event-zone instants. Counts are
integers 0–10000 with at most 366 days per snapshot (technical input bounds).
An omitted estimate on the established creation API means unrecorded, never zero;
this preserves existing M2 clients and records. The current application UI requires
all current days. No historical values are fabricated or backfilled.

The event revision pins day validation. Changed dates/timezone never remap older
snapshots; stale writes conflict. Owners with active exact-studio membership may
adjust PENDING/APPROVED applications during the application window. Global admins
may correct those applications in the existing review stages, with a mandatory
private reason. Cancelled/rejected/locked applications are read-only until the
existing lifecycle permits another adjustment. No new review allowance is added.

One serializable transaction advances the shared application revision, appends
an immutable counts/timezone/event-revision/source/reason snapshot and safe audit.
Application decisions and profile edits therefore invalidate stale estimate edits
and vice versa. UUID operation IDs bind target, actor and parsed body; current
ownership is checked before historical acknowledgement replay. Changed retries
conflict, concurrent writes cannot both advance the same revision, and audit
failure rolls back the whole write. Initial counts join atomic application creation.

Existing read authorization protects history. Transport DTOs omit actor IDs, operation
bindings and digests; private correction text is plain text. Historical actor IDs
are retained as provenance, without granting authority. Immutable rows prevent
hard deletion of their application; normal soft deletion remains unchanged.
Rollback means reverting consumers before schema removal; deleting snapshots is
not an operational rollback. Application database migration/deployment is separate.
