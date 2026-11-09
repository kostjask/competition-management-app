# Event contract

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

`GET /api/v1/events` and `GET /api/v1/events/:eventId` require authentication;
any authenticated account may read, without an event role. Lists are ordered by
start instant then ID. `POST /api/v1/events` and `PATCH /api/v1/events/:eventId`
remain admin-only, including when a non-admin has global or event-scoped
`event.manage`. Creation returns 201; reads and updates return 200. Missing
items return 404. All errors use the global envelope, including 401/403 denials.
No event DELETE endpoint is introduced.

POST requires trimmed, nonblank `name`, `startsAt`, and `endsAt`; optional
`stage` retains the database default `PRE_REGISTRATION`. Existing stage values remain unchanged. Creation accepts only
PRE_REGISTRATION (default) or REGISTRATION_OPEN. Optional `venue`, `country`, `city`, and `description`
accept trimmed nonblank text or null. `maxStudios` and `maxPerformances` accept
positive integers up to 2147483647 or null. These stored settings do not add new
registration-capacity enforcement. Dates must be ISO instants with Z or an
explicit offset; timezone-free strings and calendar-only dates are rejected.
The end must be strictly later than the start. PATCH accepts a nonempty subset;
omitted fields stay unchanged and explicit null clears optional details/limits.
Optional timeZone accepts a validated IANA identifier (default UTC); optional
registrationDeadline accepts an explicit-offset instant or null. The deadline must
be at or before startsAt, including partial date updates. Null explicitly means no
automatic cutoff. Both fields are included in all event DTOs.

Stage PATCH requires expectedStage matching the stored stage. M2 allows only
PRE_REGISTRATION -> REGISTRATION_OPEN -> DATA_REVIEW, or CANCELLED from those
states. An unchanged stage is allowed; backwards/skipped/live/final transitions
are refused. Stale expectedStage returns 409. All changes append transactional
audit. See [ADR-003](../adr/003-registration-lifecycle.md).

Unknown fields, IDs, audit timestamps, relations, image URLs and private paths
are rejected. Image changes remain on the upload route, whose resource-specific
authorization is still P2-BOUNDARIES.

A partial date update validates the resulting stored pair in a serializable
transaction. Concurrent edits cannot produce a reversed pair; serialization
conflicts return 409 with instructions to reload before retrying. Missing records
and concurrent disappearance return 404. Existing legacy rows are not rewritten;
invalid stored date pairs must be corrected before a PATCH can succeed.

List/detail/create/update use one explicit DTO: `id`, `name`, `startsAt`,
`endsAt`, `stage`, `createdAt`, nullable `venue`, `country`, `city`,
`description`, `maxStudios`, `maxPerformances`, and `imageUrl`.
Dates serialize as ISO UTC strings. DTOs omit `imagePath`, relations and the
nonexistent `updatedAt`; the detail screen no longer renders that timestamp.
Backend serialization and frontend responses validate shared schemas. Migration 30 adds timezone/deadline and registration history/retry fields without
rewriting instants. The current editor remains explicitly UTC and offers only
permitted M2 stage targets; P4-CORE owns timezone/deadline setup controls. DST
wall-time selection must reject gaps and require an explicit offset for folds.
