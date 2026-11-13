# Event contract

[API index](../API.md) · Paths are relative to `/api/v1`.

Event list/detail require authentication, including roleless accounts. Lists are
ordered by start instant then ID. Creation and PATCH require an active global
admin; scoped admin and event.manage grants cannot bypass this rule. Creation
returns 201, reads/updates 200, missing records 404, stale writes 409. Errors use
the global envelope. There is no event DELETE operation.

POST requires trimmed name (1–500 characters), startsAt and endsAt. Optional
venue/country/city/organizerPhone accept trimmed nonblank text up to 500 characters
or null; organizerEmail accepts a valid email up to 254 characters or null.
maxStudios/maxPerformances are positive 32-bit integers or null. They remain
stored configuration, without new automatic capacity enforcement.

Dates are ISO instants with Z or an explicit offset. Calendar-only, timezone-free
or reversed dates are refused. timeZone is a validated IANA identifier, default
UTC. registrationDeadline is an instant or null (no automatic cutoff); it must
be at or before startsAt. PATCH validates the resulting stored date pair/deadline
inside the transaction, including partial edits.

Description writes use ADR-019 AuthoredContent or null: sourceLocale (et/en/ru),
nonempty sourceText up to 20000 characters, and translations containing optional
nonempty text for the other supported locales. Clearing an optional translation
means omitting it from the replacement object. No HTML interpretation or automatic
translation occurs. Existing unknown-language text is retained verbatim until an
organizer assigns a source language or explicitly clears it. Names, titles,
addresses and contacts remain authored identity/display values.

POST allows PRE_REGISTRATION (default) or REGISTRATION_OPEN. Opening requires
venue, city, country and organizerEmail, plus classification of any retained
description. Missing prerequisites produce field issues. The same rule protects
the resulting setup while open. Image/description/limits/scoring are optional.
PRE_REGISTRATION still permits applications under ADR-003; this is not a second
application-window model. Null cutoff remains a valid explicit policy.

PATCH requires positive expectedRevision and at least one mutable field. A stage
write also supplies expectedStage. M2 permits PRE_REGISTRATION → REGISTRATION_OPEN
→ DATA_REVIEW, or CANCELLED from those stages. Backward/skipped/live/final targets
are refused. Existing terminal records remain readable. Writes use serializable
transactions and immutable audit. The immediate matching retry at revision N+1
returns the saved state without incrementing/auditing again; other stale writes
conflict. A conditional-write/serialization race returns 409; an initially missing
record returns 404. Read and compare before rebasing local edits.

POST may supply UUID operationId. It is privately bound to the normalized request
and actor; matching retries return the same event, changed requests/actors conflict.
Concurrent first requests may yield 409; retry the same operation without changing
its payload. Without operationId, reconcile before retrying an uncertain creation.
The first-party UI retains the operation/request and never silently replays writes.

All event responses validate the shared strict EventSchema: id, name, startsAt,
endsAt, timeZone, registrationDeadline, stage, createdAt, venue, country, city,
description (AuthoredContent or null), unclassifiedDescription (text or null),
organizerEmail, organizerPhone, revision, maxStudios, maxPerformances and imageUrl.
Dates serialize as ISO UTC. Private image paths, source storage columns, creator/
request digests, operation IDs and relations are omitted. Unknown mutation fields,
IDs, audit timestamps, image URLs and private paths are rejected. Image changes
remain on the separate [image route](images.md), accepting JPEG/PNG/WebP up to
10 MB and returning authenticated canonical WebP retrieval URLs.

Migration 31 and [ADR-020](../adr/020-organizer-event-setup.md) own new persistence,
readiness, concurrency and rollout/rollback implications. Apply the additive
migration before coordinating API/client rollout; do not mix old/new writers.
The organizer workspace is /admin; setup is /admin/events/:eventId/setup, with
/events/:id/edit retained. Creation and setup expose event-zone input, explicit
cutoff/no-cutoff choice, DST gap/fold handling, contact/details, optional image and
source-language editors, three-language fallback previews, linked readiness and
confirmed M2 transitions. Dashboard prioritizes incomplete setup. Authenticated
list/detail expose saved event facts and truthful application-window availability;
apply/resume routes remain P5-APPLICATION and review queues remain P4-REVIEW.
The minute-based editor retains exact stored seconds/milliseconds on unchanged
time fields, including an existing DST fold offset. Changing the time or choosing
another offset resolves a new instant at the editor's minute precision.
