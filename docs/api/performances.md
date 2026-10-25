# Performance contract

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

Collection routes are `GET`/`POST /api/v1/events/:eventId/performances`; item
routes are `GET`/`PATCH`/`DELETE` at `.../performances/:performanceId`.
All require authentication and `performance.manage` for that event or globally,
with the existing admin bypass. Errors use the global envelope.

POST accepts:

```json
{
  "studioId": "studio-id",
  "title": "Example performance",
  "durationSec": 120,
  "orderOnStage": 1,
  "categoryId": "category-id",
  "ageGroupId": "age-group-id",
  "formatId": "format-id",
  "dancerIds": ["dancer-id"]
}
```

PATCH accepts a nonempty subset of those fields except `studioId`. Unknown
fields, blank titles, empty/duplicate dancer lists, and nonpositive/noninteger
or PostgreSQL-incompatible duration/order values are rejected. IDs in category,
age group, and format must belong to the route event. Every selected dancer must
be active and belong to the chosen studio. PATCH revalidates the resulting
configuration and participant set even when those fields are omitted. Invalid
configuration/participants return 409. Format limits and age eligibility remain
Phase 5 work; no new age policy is implied here.

The current model stores no performance studio ID. Item access checks the full
participant set: it must identify exactly one studio, and that active studio's
`eventId` must match the route event, including for admins. Non-admins additionally
need active representative membership, organization approval, and an `APPROVED`
registration for that event. Writes follow `REGISTRATION_OPEN`, or `DATA_REVIEW`
with that registration's review override. Reads remain available during stage
locks. Admins bypass permission, approval, membership, and stage gates, while
parent/participant/active-record constraints still apply.

GET collection returns only performances whose entire participant set belongs to
one authorized active studio in that event, ordered by stage order then ID.
Optional strict query `?studioId=...` narrows this scope; it never grants access.
No authorized studio yields an empty array; an explicitly requested inaccessible
studio fails access checks. Missing event/item/active studio yields 404. Mixed
or empty legacy participant sets are excluded from lists and return 409 on item
operations, including for admins. Repair requires the Phase 3 data audit; no rows
are rewritten or guessed from the first participant. Archived dancers remain
visible in existing performance reads for history, but cannot be selected or
retained by PATCH; replace them with active same-studio participants. Performance
DELETE remains possible and preserves all participants and scores.

Create returns 201; list/detail/update return 200; DELETE returns 204. The shared
DTO contains `id`, `eventId`, `title`, `durationSec`, `orderOnStage`, `categoryId`,
`ageGroupId`, `formatId`, and `participants` (`dancerId` plus the shared dancer
DTO). It omits nonexistent timestamps, fabricated studio fields, private storage
paths, and audit fields. Backend serialization and frontend responses are
runtime-validated. Client helpers now take `eventId`; creation carries `studioId`
in its body, and list accepts an optional studio filter. No existing UI consumes
these helpers. The unused duplicate performance type in `packages/types` is
removed; shared schemas are canonical. Unused legacy nomination schemas/types are now removed.

Writes are transactional. Participant replacement uses a nested update so a
stage-order conflict rolls back replacement too. The existing unique
`(eventId, orderOnStage)` constraint returns 409 on conflict, including orders
held by archived performances. DELETE writes `deletedAt`/`deletedBy` and retains
relations; archived performances cannot be read, patched, or deleted again.
No Prisma model/migration changed. Restore, order reuse, full concurrent editing,
performance snapshots, and cross-event studio reuse remain later work.
