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
authorization/content rules are in [the image contract](images.md).

A partial date update validates the resulting stored pair in a serializable
transaction. Concurrent edits cannot produce a reversed pair; serialization
conflicts return 409 with instructions to reload before retrying. Missing records
and concurrent disappearance return 404. Existing legacy rows are not rewritten;
invalid stored date pairs must be corrected before a PATCH can succeed.

List/detail/create/update use one explicit DTO: `id`, `name`, `startsAt`,
`endsAt`, `timeZone`, nullable `registrationDeadline`, `stage`, `createdAt`, nullable `venue`, `country`, `city`,
`description`, `maxStudios`, `maxPerformances`, and `imageUrl`.
Dates serialize as ISO UTC strings. DTOs omit `imagePath`, relations and the
nonexistent `updatedAt`; the detail screen no longer renders that timestamp.
Backend serialization and frontend responses validate shared schemas. Migration 30 adds timezone/deadline and registration history/retry fields without
rewriting instants. Migration 31 adds `revision` (initially 1), nullable
`organizerEmail`, `organizerPhone`, and JSON `authoredDescription`. POST/PATCH
validate contact details and the shared ADR-019 sourceLocale/sourceText/translations
contract. Existing `description` is retained verbatim with unspecified language;
the editor requires an explicit source-language choice before converting it.
Only the source text is required; translations may be cleared. Names and addresses
are never automatically translated. All event DTOs include these four new fields.

PATCH may supply `expectedRevision`; mismatch returns 409. Every configuration or
image write increments the event revision. The organizer editor always sends it,
retains input on conflict/uncertain responses, and requires an authoritative read
and comparison before another write. Creation has no idempotency key: an uncertain
response blocks another create and directs the organizer to inspect the event list.

The editor uses event-local wall times, rejects DST gaps, and exposes both UTC
instants for an explicit choice during folds. Changing timezone reinterprets the
entered wall times; stored instants are not inferred by the API. Event list/detail
dates display the event timezone. Opening registration confirms the stage change;
only existing ADR-003 transitions/date prerequisites are enforced. Contact, venue,
description and image checklist omissions are actionable recommendations, not new
publication requirements. Scoring is not a registration prerequisite.
