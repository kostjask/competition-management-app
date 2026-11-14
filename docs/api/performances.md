# Performance contract

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

Collection routes are `GET`/`POST /api/v1/events/:eventId/performances`; item
routes are `GET`/`PATCH`/`DELETE` at `.../performances/:performanceId`.
All require authentication and `performance.manage` for that event or globally,
with the existing admin bypass. Errors use the global envelope.

[Studio checkpoints](entry-workflow.md) now add optional per-event basic/final
locks, submission/review receipts, scoped corrections and organizer exceptions.
Draft PATCH/roster writes enforce those locks, including indirect changes to
submitted participants. Draft teacher/author credits are nullable, trimmed,
nonblank when supplied and limited to 500 characters. They follow the final-field
scope. New snapshots use policyVersion 3; older snapshots stay unchanged.
CHECKPOINT origin identifies an atomic studio-manifest capture. Null credit fields
do not change retained pre-credit creation retry digests.

POST accepts:

```json
{
  "studioId": "studio-id",
  "operationId": "8b0eef37-d79f-40be-8f9e-d1e181d6df59",
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
fields, blank supplied titles, duplicate dancer lists, and nonpositive/noninteger
or PostgreSQL-incompatible duration/order values are rejected. IDs in category,
age group, and format must belong to the route event. Every selected dancer must
be active and belong to the chosen studio. PATCH revalidates the resulting
configuration and participant set even when those fields are omitted. Participant
lists are limited to 1,000 supplied IDs. Null
configuration is valid for drafts; supplied IDs still require exact relationships. Invalid
configuration/participants return 409. Format/age checks run on the configured
FINAL studio checkpoint; no submission eligibility is implied by a draft save.

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
readable. Under [ADR-024](../adr/024-incomplete-entry-drafts.md), POST requires
only `studioId`: omitted title/duration/order/category/age-group/format become null,
and omitted participants become an empty list. PATCH omission retains values,
explicit null clears entry/configuration fields, and `dancerIds: []` clears the
participant set. Positive supplied values and all relationship checks remain.
Title is limited to 500 characters. Null stage order is independent of missing
entry fields and is never required for drafting or future submission.
Optional strict query `?studioId=...` narrows this scope; it never grants access.
`state=active` (default) or `state=withdrawn` selects the retained lifecycle state.
No authorized studio yields an empty array; an explicitly requested inaccessible
studio fails access checks. Missing event/item/active studio yields 404. A missing
registration blocks creation with 409, including for admins. Migration 33 backfills
only unambiguous nonempty single-studio legacy sets with matching registrations;
empty/mixed/missing/cross-event owners require reviewed repair before migration.
There is no first-participant inference. Archived dancers remain
visible in existing performance reads for history, but cannot be selected or
retained by PATCH; replace them with active same-studio participants. Performance
DELETE remains possible and preserves all participants and scores.

Create returns 201; list/detail/update return 200; revision-query DELETE returns 204.
The shared DTO contains `archived`, positive `revision`, `id`, `eventId`, `studioId`, `registrationId`, `title`, `durationSec`, `orderOnStage`, `categoryId`,
`ageGroupId`, `formatId`, and `participants` (`dancerId` plus the shared dancer
DTO). It omits nonexistent timestamps, private storage
paths, and audit fields. Backend serialization and frontend responses are
runtime-validated. Client helpers now take `eventId`; creation carries `studioId`
in its body; the server derives the registration ID. PATCH cannot transfer ownership
and POST rejects a caller-supplied registration ID. List accepts an optional studio
filter. Global admins use these canonical reads in the organizer register
at `/admin/events/:eventId/performances?studio=:studioId`; its inline form now creates
owner/title-only drafts with a retained operation ID and lists missing fields.
Presence checks are not eligibility, music or submission validation. The UI displays no dancer
personal details and links the owner to its application. The unused duplicate performance type in `packages/types` is
removed; shared schemas are canonical. Unused legacy nomination schemas/types are now removed.

Writes use serializable transactions; serialization/relationship races return 409
and require reloading before retry. Participant replacement uses a nested update so a
stage-order conflict rolls back replacement too. The existing unique
`(eventId, orderOnStage)` constraint returns 409 on conflict, including orders
held by archived performances. DELETE writes `deletedAt`/`deletedBy` and retains
relations. Withdrawn performances remain readable with their history by currently
authorized owners/organizers; ordinary PATCH and repeat archival cannot edit them.
Row CHECKs enforce positive supplied duration/order, event limits/date ordering and age/format
bounds. Configuration and participant keys also apply to direct SQL. The owner-change
trigger and restrictive foreign keys preserve identity, including archived rows.
Migration fresh/upgrade/refusal and API/database/UI checks are in
[ownership evidence](../PERFORMANCE_OWNERSHIP_VALIDATION.md).
Multiple null stage orders are permitted; assigned orders remain reserved.
Order reuse and cross-event studio reuse remain later work.

## Withdrawal and restoration

The canonical DELETE item endpoint also accepts a strict JSON command body
(without query parameters):

```json
{
  "expectedRevision": 3,
  "operationId": "8b0eef37-d79f-40be-8f9e-d1e181d6df59",
  "action": "WITHDRAW",
  "reason": "Studio withdrew the performance"
}
```

`POST .../performances/:performanceId/restore` accepts the same contract with
`action: "RESTORE"`. Both return 200 `{ id, revision, archived }` after atomic
revision capture, checkpoint invalidation, immutable operation and audit. The UUID
is bound to actor/event/performance/action/body. A matching retry returns its
original acknowledgement after current access checks, even if a later action has
changed the entry again; it does not repeat the transition. Reused UUIDs with
changed payloads/actors/routes, stale revisions or wrong current states return 409.
Uncertain clients retain the exact command and reconcile; an acknowledgement is
kept visible if the subsequent current-list refresh fails.

Representatives can withdraw before the configured basic deadline in nonterminal
stages, including after early submission. Afterwards contact the organizer.
Restoration is a structural `entries` write and obeys both checkpoint locks and
studio-wide reopening grants. Organizers can act late but cannot bypass active
studio/event/participant relationships. A restore retains owner, ID, participants,
reserved stage order, scores and history; it returns the studio checkpoints to
DRAFT, never restores acceptance or implicitly resubmits. Submit and review the
new manifest explicitly. Restoring with inactive participants fails with 409.
Required reasons stay out of URLs and are retained privately with the real actor.
The older query-revision archival command remains at this same DELETE endpoint
with its existing 204 behavior and no UUID deduplication guarantee.

## Draft creation recovery

POST optionally accepts UUID `operationId`. Organizer clients always supply it.
Migration 36 retains the ID with a normalized actor/event-bound digest; it is not
returned in DTOs. Matching retries recheck current access and return the current
active performance with 201 without adding another revision or audit. Reconciliation
uses current read access even after the write window closes; a new operation still
requires write access. Changed
payload/actor/event reuse and archived-entry reuse return 409. A concurrent first
attempt may return 409; retry the same body/ID. Calls without an operation ID have
no create deduplication guarantee and must reconcile uncertain outcomes manually.
The form freezes uncertain requests for explicit retry, preserves fields through
session recovery/filter changes, and reports saved only after decoding the server
response. A definite first-attempt input/access rejection permits editing retained
fields. A denial after an uncertain attempt retains the original operation.

## Saved revisions and organizer history

[ADR-023](../adr/023-entry-history-and-calendar-dates.md) and migration 35 add
immutable, privacy-minimal saved snapshots. POST starts at revision 1; PATCH and
DELETE increment once and atomically capture the resulting entry, participants,
studio display name, category/age/format labels and bounds, event timezone and
age reference date. Durable audit includes actor/IDs/revision only. Later source
edits never rewrite a saved snapshot. New captures use policyVersion 3 with nullable
entry fields/configuration and teacher/author credits; version 1/2 records remain unchanged.
DELETE supplies the expected revision in
`?expectedRevision=3`; omitted, malformed or unknown query keys return 400.
All actors obey revision checks. Stale/concurrent writes return 409; reload and
compare before retrying. A lost response must be reconciled through GET/history,
never blindly replayed. A failed capture or audit rolls back the entire write.

`GET /events/:eventId/performances/:performanceId/history` uses the same current
active-owner/permission/approval checks as item reads, including exact route event.
It returns newest-first `{ revision, origin, capturedAt, actorKind, snapshot }`.
`origin` is CREATE/EDIT/ARCHIVE/RESTORE/CHECKPOINT or LEGACY_BASELINE; actorKind is USER or MIGRATION.
No raw actor account data is exposed. Snapshot fields include policyVersion (1/2/3),
eventId/studioId/registrationId, studioName, title, durationSec/orderOnStage,
timeZone/ageDate, configuration (category id/name; age-group id/name/minAge/maxAge;
format id/name/minParticipants/maxParticipants/maxDurationSeconds), participants
(dancerId/firstName/lastName/birthDate), and archived. No contact, billing, image,
storage path or score fields are retained. This is private authorized history.

Migration baselines include archived performances, retain source identities and
scores, and explicitly claim no original author/save time or prior submission.
capturedAt is capture time. SQL prevents snapshot updates/deletes. Archival retains
versions; item/history reads include withdrawn entries under current authorization.
The organizer register selects history with `?performance=:performanceId`,
retains the studio filter across reload/session recovery and displays only saved
title, studio/configuration, participant count, reference date and provenance.
Its date policy describes the shared rule; these complete-field CRUD endpoints do
not enforce eligibility on draft saves. The separate studio-checkpoint commands
consume these foundations for validated submission/review receipts and corrections;
see the [checkpoint contract](entry-workflow.md) for their exact scope and remaining work.
