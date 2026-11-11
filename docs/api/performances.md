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

PATCH requires `expectedRevision` and a nonempty subset of those fields except `studioId`. Unknown
fields, blank titles, empty/duplicate dancer lists, and nonpositive/noninteger
or PostgreSQL-incompatible duration/order values are rejected. IDs in category,
age group, and format must belong to the route event. Every selected dancer must
be active and belong to the chosen studio. PATCH revalidates the resulting
configuration and participant set even when those fields are omitted. Invalid
configuration/participants return 409. Format limits and age eligibility remain
Phase 5 work; no new age policy is implied here.

The model stores immutable `studioId` and `registrationId` ownership under
[ADR-022](../adr/022-performance-ownership-and-constraints.md). Compound keys
require the registration, studio and configuration to match the performance event;
participant keys require the same owning studio as their dancer and performance.
Item access checks that active stored owner, including for admins. Non-admins additionally
need active representative membership, organization approval, and an `APPROVED`
registration for that event. Writes follow `REGISTRATION_OPEN`, or `DATA_REVIEW`
with that registration's review override. Reads remain available during stage
locks. Admins bypass permission, approval, membership, and stage gates, while
parent/participant/active-record constraints still apply.

GET collection returns performances of authorized active owners in that event,
ordered by stage order then ID. Empty participant sets retain their owner and are
readable; create/PATCH still require nonempty complete selections until P3-ENTRIES.
Optional strict query `?studioId=...` narrows this scope; it never grants access.
No authorized studio yields an empty array; an explicitly requested inaccessible
studio fails access checks. Missing event/item/active studio yields 404. A missing
registration blocks creation with 409, including for admins. Migration 33 backfills
only unambiguous nonempty single-studio legacy sets with matching registrations;
empty/mixed/missing/cross-event owners require reviewed repair before migration.
There is no first-participant inference. Archived dancers remain
visible in existing performance reads for history, but cannot be selected or
retained by PATCH; replace them with active same-studio participants. Performance
DELETE remains possible and preserves all participants and scores.

Create returns 201; list/detail/update return 200; DELETE returns 204. The shared
DTO contains positive `revision`, `id`, `eventId`, `studioId`, `registrationId`, `title`, `durationSec`, `orderOnStage`, `categoryId`,
`ageGroupId`, `formatId`, and `participants` (`dancerId` plus the shared dancer
DTO). It omits nonexistent timestamps, private storage
paths, and audit fields. Backend serialization and frontend responses are
runtime-validated. Client helpers now take `eventId`; creation carries `studioId`
in its body; the server derives the registration ID. PATCH cannot transfer ownership
and POST rejects a caller-supplied registration ID. List accepts an optional studio
filter. Global admins use these canonical reads in the read-only organizer register
at `/admin/events/:eventId/performances?studio=:studioId`; the UI displays no dancer
personal details and links the owner to its application. The unused duplicate performance type in `packages/types` is
removed; shared schemas are canonical. Unused legacy nomination schemas/types are now removed.

Writes use serializable transactions; serialization/relationship races return 409
and require reloading before retry. Participant replacement uses a nested update so a
stage-order conflict rolls back replacement too. The existing unique
`(eventId, orderOnStage)` constraint returns 409 on conflict, including orders
held by archived performances. DELETE writes `deletedAt`/`deletedBy` and retains
relations; archived performances cannot be read, patched, or deleted again.
Row CHECKs enforce positive duration/order, event limits/date ordering and age/format
bounds. Configuration and participant keys also apply to direct SQL. The owner-change
trigger and restrictive foreign keys preserve identity, including archived rows.
Migration fresh/upgrade/refusal and API/database/UI checks are in
[ownership evidence](../PERFORMANCE_OWNERSHIP_VALIDATION.md).
Restore, order reuse and cross-event studio reuse remain later work.

## Saved revisions and organizer history

[ADR-023](../adr/023-entry-history-and-calendar-dates.md) and migration 35 add
immutable, privacy-minimal saved snapshots. POST starts at revision 1; PATCH and
DELETE increment once and atomically capture the resulting entry, participants,
studio display name, category/age/format labels and bounds, event timezone and
age reference date. Durable audit includes actor/IDs/revision only. Later source
edits never rewrite a saved snapshot. DELETE supplies the expected revision in
`?expectedRevision=3`; omitted, malformed or unknown query keys return 400.
All actors obey revision checks. Stale/concurrent writes return 409; reload and
compare before retrying. A lost response must be reconciled through GET/history,
never blindly replayed. A failed capture or audit rolls back the entire write.

`GET /events/:eventId/performances/:performanceId/history` uses the same current
active-owner/permission/approval checks as item reads, including exact route event.
It returns newest-first `{ revision, origin, capturedAt, actorKind, snapshot }`.
`origin` is CREATE/EDIT/ARCHIVE or LEGACY_BASELINE; actorKind is USER or MIGRATION.
No raw actor account data is exposed. Snapshot fields are policyVersion (1),
eventId/studioId/registrationId, studioName, title, durationSec/orderOnStage,
timeZone/ageDate, configuration (category id/name; age-group id/name/minAge/maxAge;
format id/name/minParticipants/maxParticipants/maxDurationSeconds), participants
(dancerId/firstName/lastName/birthDate), and archived. No contact, billing, image,
storage path or score fields are retained. This is private authorized history.

Migration baselines include archived performances, retain source identities and
scores, and explicitly claim no original author/save time or prior submission.
capturedAt is capture time. SQL prevents snapshot updates/deletes. Archival retains
versions but standard endpoints, including history, still return 404 for archived
entries. The organizer register selects history with `?performance=:performanceId`,
retains the studio filter across reload/session recovery and displays only saved
title, studio/configuration, participant count, reference date and provenance.
Its date policy describes the shared rule; these complete-field CRUD endpoints do
not newly enforce eligibility. No submission receipt/correction action is exposed;
P3-ENTRIES consumes these foundations and owns their lifecycle/consumer tests.
