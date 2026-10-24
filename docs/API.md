# API integration status

Updated: 2026-10-24

The development API base URL is `http://localhost:4000/api/v1`. Set
`VITE_API_URL` to that complete base URL (including `/api/v1`) and restart Vite.
Existing web `.env` files that still point to the origin alone must be updated.
Frontend page URLs, such as `/auth/login`, are unchanged. Business endpoints no
longer have unversioned aliases. `/health` and `/uploads` stay at the server root.

## Composition and authentication

`apps/api/src/app.ts` exports `createApp(prisma)` without listening, registering
process handlers, or constructing a database client. Startup, storage setup,
signals, and listening remain in `src/index.ts`. `src/routes/api.ts` is the only
resource-router composition module. Authentication uses the injected Prisma
client, so HTTP tests can use controlled fixtures without a database connection.

These routes are public:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/verify-email`
- `GET /api/v1/invitations/:token`
- `POST /api/v1/invitations/accept`

`GET /api/v1/auth/profile` and invitation administration (`GET`/`POST
/api/v1/invitations`) attach authentication directly to their handlers. All event,
studio, dancer, performance, and image router operations require authentication before their
existing permission/ownership checks. Event reads remain protected. Unknown
routes reach a 404 through the global error handler; they do not gain a public
handler through a path predicate.

Invitation paths no longer repeat `/invitations`. Existing invitation tokens and
JWTs remain valid; URL migration does not rotate credentials. Invitation DTOs now omit raw tokens and use the global error envelope. Existing-account
identity, token persistence/lifecycle, role eligibility and broader authorization
limitations remain tracked Phase 2 work, not completed security hardening.

## Resource integration

The complete target layout is in [ADR-002](adr/002-canonical-api-paths.md). The
version prefix and mounted business controller/contracts are implemented:

| Resource | Current development path relative to `/api/v1` | Remaining work |
| --- | --- | --- |
| Events | `GET/POST /events`, `GET/PATCH /events/:eventId` | Strict shared DTOs/client, authenticated reads/admin writes, date ordering and error contracts implemented |
| Judges | `GET/POST /events/:eventId/judges`; `GET/PATCH/DELETE /events/:eventId/judges/:judgeId` | Controller, strict contracts/client helpers, scoped reads/admin writes, relationship and conflict checks implemented |
| Categories | `GET/POST /events/:eventId/categories`; `GET/PATCH/DELETE /events/:eventId/categories/:categoryId` | Controller, strict contracts/client helpers, parent/scope checks and conflict handling implemented |
| Formats and age groups | `GET/POST /events/:eventId/formats` and `/age-groups`; item `GET/PATCH/DELETE /:formatId` or `/:ageGroupId` | Strict DTOs/controller/client, parent/scope checks and serializable partial-range validation implemented |
| Invitations | `GET/POST /invitations`; `GET /invitations/:token`; `POST /invitations/accept` | Strict DTO/controller/client, role/event checks and standard errors implemented; security/lifecycle remains Phase 2 |
| Studio registration | `GET/POST /events/:eventId/studio-registrations`; `PATCH/DELETE /events/:eventId/studio-registrations/:studioId` | Implemented with shared DTOs, transactions, and ownership/event-scope tests; existing-studio reuse awaits ADR-001 migration |
| Studios | `GET /studios`; `GET/PATCH/DELETE /studios/:studioId`; approval and representative PATCH actions | Shared DTOs/client paths, member reads, scoped writes, active parents, and audited archive implemented |
| Dancers | `GET/POST /studios/:studioId/dancers`; `GET/PATCH/DELETE /studios/:studioId/dancers/:dancerId` | Implemented with shared DTOs, event-derived permissions, active ownership, stage checks, and audited soft deletion |
| Images | `/images/events/:eventId`, `/users/:userId`, `/dancers/:dancerId`, `/studios/:studioId` (each under `/images`) | Controller/shared DTOs/multipart helpers and error tests implemented; resource-specific authorization remains Phase 2 |
| Performances | `GET/POST /events/:eventId/performances`; `GET/PATCH/DELETE /events/:eventId/performances/:performanceId` | Implemented with shared contracts, single-studio ownership checks, transactions, and audited soft deletion |
| Users | No implementation | `routes/users.ts` is empty; no user-management endpoint is claimed |
| Scores | Reserved only | Scoring design and implementation in later phases |

The web client's event, studio, registration, dancer, performance, and judge operations follow
canonical paths and shared contracts. Auth, setup, invitation and image helpers
also decode shared response schemas. The transport returns unknown rather than
asserting unchecked generic response types.
Older implementation summaries do not supersede this current status or the ADR
target. The maintained [registration workflow](REGISTRATION_API.md) links here
for implemented contracts.

For the user-facing distinction between accounts, applications, and entry
submission, see [registration workflow](REGISTRATION_API.md) and
[user journeys](USER_JOURNEYS.md). Planned drafts, receipts, corrections, and
recovery screens do not add endpoints to this implemented API inventory.

## Studio registration contract

Schema follow-up is tracked in [database review](DATABASE_REVIEW.md). Explicit
performance ownership, incomplete drafts without stage order, display-name policy,
token/identity changes, and stronger event constraints are planned, not current
request/response contracts. Current full performance-create requirements and global
active studio-name uniqueness still apply. Keep API/client changes paired with
reviewed migrations; do not infer that the review introduces a draft endpoint or
allows duplicate studio names today.

Account eligibility target is defined in
[ADR-006](adr/006-account-eligibility-and-staff-onboarding.md): studio-focused
signup and invitation-only event staff. Current `/auth/register` still accepts
generic account creation; invitation event scope is optional. Judge acceptance
assigns a UserRole without creating a Judge record, while judge CRUD does not
assign that role. Backend signup enforcement, mandatory staff event scope, atomic
judge onboarding, and invitation lifecycle/offboarding remain planned. This policy
does not change existing endpoints or imply a new onboarding endpoint is available.

All paths here are relative to `/api/v1`. Authentication is required, but a new
applicant does not need a role before applying.

`POST /events/:eventId/studio-registrations` accepts a new studio:

```json
{
  "name": "Example studio",
  "country": "Estonia",
  "city": "Tallinn",
  "representativeName": "Applicant",
  "representativeEmail": "applicant@example.com"
}
```

Optional fields are `country`, `city`, `directorName`, `directorPhone`, and
JSON-object `invoiceDetails`. Names/text are trimmed and must not be blank.
Unknown fields, including `studioId`, `eventId`, `userId`, approval status, and
review overrides, are rejected. Representative contact fields are required for
non-admins. Membership always links to the authenticated user, never a submitted
user ID. Contact email does not select another account or grant ownership.

Creation returns 201 with a registration DTO. Studio, pending registration, and
the non-admin applicant's active representative membership are saved atomically.
Both organization and event approval start as `PENDING`. No role is assigned at
this point. Admin creation also creates a pending registration but does not make
the admin a representative; contact fields do not assign another user. Existing
admin stage bypass is preserved. Other users can apply only in
`PRE_REGISTRATION` or `REGISTRATION_OPEN`.

`GET /events/:eventId/studio-registrations` returns an array of registration DTOs.
Admins see active studios' registrations for that event; others see only studios
where they have active representative membership. During the event-owned schema
transition, `Studio.eventId` must also match the requested event. Legacy studios
without registration records are not synthesized into the list; their audited
backfill remains Phase 3 work.

`PATCH /events/:eventId/studio-registrations/:studioId` is admin-only and accepts
`{ "status": "APPROVED", "canEditDuringReview": false }`. Accepted input status
values remain `PENDING`, `APPROVED`, and `REJECTED`; omitted review permission is
preserved. An active organization must already be approved, and a registration
must exist for the exact event/studio pair. PATCH does not recreate a cancelled or
missing registration. Approval assigns the representative role to active members
in that event in the same transaction. Repeated approval does not duplicate roles;
a missing configured role rolls approval back. Other events' roles are untouched.

`DELETE /events/:eventId/studio-registrations/:studioId` returns 204 and permits an
admin or active owner to cancel only a `PENDING` registration. It retains the
studio, representatives, and other registrations. The conditional delete checks
pending status and access again, returning 409 if the record changed. As before,
cancellation depends on pending state rather than the event's registration stage.

Registration DTOs contain `id`, `studioId`, `eventId`, `status`,
`canEditDuringReview`, ISO UTC `createdAt`/`updatedAt`, and a `studio` summary with
`id`, `name`, `approvalStatus`, nullable `country`, and nullable `city`. Response
status also supports existing `LOCKED` records. DTOs omit billing/contact records,
storage paths, user credentials, and timestamps absent from Studio. Shared schemas
validate backend serialization and frontend responses. All registration errors
use the global envelope.

Frontend helpers `getStudios`, `createStudio`, and `updateStudioRegistration` now
return registration DTOs; each registration has a nested studio summary.
`cancelStudioRegistration` cancels event membership separately from studio
deletion. No current screen consumes these registration helpers. Studio profile
helpers now use the canonical contracts below.

Old `/events/:eventId/studios` and `.../studios/:studioId/registration` handlers
are removed. POST creates a new identity; it is not an idempotent retry operation
and does not merge similarly named studios. Registration of an existing studio
awaits the Phase 3 identity migration. Duplicate active studio names return 409
with code `CONFLICT` and message `Studio with this name already exists`, including
concurrent creation and matches in other events or locations. The existing
SQL-only index remains the authority: names are case-sensitive after input
trimming, and archived names can be reused. Failed creation rolls back the studio,
registration, and membership; existing records and roles remain unchanged. The
response contains no conflicting studio identity or database details.
Existing unique event/studio constraints
remain unchanged; this feature adds no database migration or automatic backfill.

## Authentication contract

Public mutations are `POST /api/v1/auth/register`, `/auth/login`, and
`/auth/verify-email`. Bodies reject unknown fields. Registration requires a
valid `email`, a password of at least eight characters, and a trimmed name of
at least two characters. Login requires email and nonempty password; verification
requires a nonempty token. Email case/canonicalization semantics are unchanged.
Invalid input returns the standard 400 envelope with `details.fields`.

Registration returns 201 with only `message` and `userId`, without a session.
An existing email or a database uniqueness race returns 409 `CONFLICT`.
Login returns 200 with `token`, literal `tokenType: "Bearer"`, and `user`
containing only `id`, `email`, and `name`. Verification returns the same
session plus `message`, after clearing the stored verification token.
Bad credentials return 401, disabled login returns 403, unknown verification
tokens return 404, and already-verified token records return 403. The frontend
validates each complete response before saving a returned session token.

`GET /api/v1/auth/profile` requires a bearer session and always selects the
caller, ignoring any attempted user selector in query parameters. It returns
`id`, `email`, `name`, ISO UTC `createdAt`, `isAdmin`, and `roles`.
Each role assignment contains only `id`, nullable `eventId`,
`role: { id, key, name }`, and nullable `event: { id, name }`.
Null event scope represents existing global assignments; event-specific IDs are
preserved. Roleless accounts receive an empty array. Assignments sort by ID.
Profiles exclude passwords, verification tokens, private paths, role descriptions,
permission relations, and redundant user/role foreign keys. A missing caller
record returns 404. Role keys/scopes are now available; frontend role-guard
unification remains P2-ROLES.

Auth success DTOs validate on both server and client. The shared error contract
contains `error`, `code`, `statusCode`, optional `details`, and ISO UTC
`timestamp`; the global handler uses its inferred type. The web client parses
that envelope and retains server messages/details, including disabled-account
403s, while tolerating local errors from unmigrated resources. Existing 401
session-clearing/redirect behavior is unchanged. JWT expiry uses validated
compact durations documented in [environment configuration](ENVIRONMENT_CONFIGURATION.md).

This contract slice does not implement signup eligibility, email canonicalization,
verification expiry/atomic consumption, active-account request checks, secure
email delivery, safe return destinations, or password recovery. Current login
still permits unverified active users, and verification still signs a session
without checking active status. These known security/workflow gaps remain in
Phase 2; DTO completion does not authorize external onboarding release.

## Event contract

`GET /api/v1/events` and `GET /api/v1/events/:eventId` require authentication;
any authenticated account may read, without an event role. Lists are ordered by
start instant then ID. `POST /api/v1/events` and `PATCH /api/v1/events/:eventId`
remain admin-only, including when a non-admin has global or event-scoped
`event.manage`. Creation returns 201; reads and updates return 200. Missing
items return 404. All errors use the global envelope, including 401/403 denials.
No event DELETE endpoint is introduced.

POST requires trimmed, nonblank `name`, `startsAt`, and `endsAt`; optional
`stage` retains the database default `PRE_REGISTRATION`. Existing stage values
remain unchanged. Optional `venue`, `country`, `city`, and `description`
accept trimmed nonblank text or null. `maxStudios` and `maxPerformances` accept
positive integers up to 2147483647 or null. These stored settings do not add new
registration-capacity enforcement. Dates must be ISO instants with Z or an
explicit offset; timezone-free strings and calendar-only dates are rejected.
The end must be strictly later than the start. PATCH accepts a nonempty subset;
omitted fields stay unchanged and explicit null clears optional details/limits.
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
Backend serialization and frontend responses validate shared schemas. This slice
adds no schema migration, setup form fields, image upload UI, new deadline fields,
or lifecycle transition policy; those remain separately tracked work.

## Studio profile contract

`GET /api/v1/studios` lists active studio profiles visible to the current user;
`GET /api/v1/studios/:studioId` reads one profile. Admins can read all; other
users need active representative membership. Reads do not require a role or
organization/event approval, so a pending applicant can find their profile.
Missing/archived studios return 404, including for admins. Reads remain available
when the event stage prevents writes.

`PATCH /api/v1/studios/:studioId` accepts a nonempty subset of `name`, `country`,
`city`, `directorName`, `directorPhone`, and `invoiceDetails`. Text is trimmed and
cannot be blank. Optional text and invoice details can be cleared with explicit
`null`; omitted fields remain unchanged. New invoice details must be a JSON
object with JSON-compatible nested values. Clearing uses SQL NULL; nested JSON
nulls remain JSON values. Legacy stored JSON values remain readable. Unknown
fields, including event/studio/user relationships, approval, logo, and audit
fields, are rejected.

Non-admin writes need active membership plus `studio.manage` for the studio's
stored event or globally. A different event's role is insufficient. Existing
organization-profile edits do not require organization or event approval; entry
operations retain their separate approval gates. Pending users without that
permission can read, but cannot edit or archive. PATCH, representative PATCH,
and DELETE are allowed to owners only in `PRE_REGISTRATION` or
`REGISTRATION_OPEN`. The existing review override unlocks dancers/performances,
not studio profiles. Admins bypass membership/permission/stage gates; active
parent/child checks still apply. These rules use the current event-owned schema;
cross-event organization locks remain an ADR-001 migration prerequisite.

The existing SQL-only partial index makes active studio names globally unique,
case-sensitively, regardless of event, country, or city. Profile rename prechecks
now follow that index; database uniqueness conflicts (including competing
renames) return 409 through the global envelope. Archived names can be reused.
This repairs the previous location-dependent precheck; it adds no index or
migration. Registration creation now maps database uniqueness conflicts to the
same global 409 response.

`DELETE /api/v1/studios/:studioId` returns 204 after recording `deletedAt` and
`deletedBy`. It retains the studio, memberships, registrations, dancers, and
performances; it does not cancel event applications or cascade deletion. Archived
studios cannot be read/changed/approved/archived again through these endpoints,
and their representative updates also return 404. Restoration remains deferred.
Use registration DELETE to cancel a pending application separately.

`PATCH /api/v1/studios/:studioId/representatives/:representativeId` updates a
nonempty subset of trimmed `name` and valid `email`. Non-admins may update only
their own active representative record with the write rules above. Admins may
update another active member, but cannot substitute a member from a different
studio or update an inactive member. Changing representative contact email never
changes account/login identity. Membership/role/activation fields are not accepted.

`PATCH /api/v1/studios/:studioId/approval` accepts only
`{ "status": "PENDING" | "APPROVED" | "REJECTED" }` and requires admin.
It changes organization approval only; event registrations, review permission,
and roles are untouched. All studio errors use the global envelope. Writes use
transactions and active-record predicates.

List/detail/profile update/approval return the same explicit studio DTO: `id`,
`eventId`, `name`, `approvalStatus`, nullable `country`, `city`, `directorName`,
`directorPhone`, `invoiceDetails`, `logoUrl`, `registrations`, and `representatives`.
Registration summaries include IDs, status (including existing `LOCKED`), review
permission, and ISO UTC creation/update timestamps, limited to the studio's
current event. Contradictory legacy registrations stay stored for the Phase 3
audit. Representative summaries contain `id`, `studioId`, `userId`, `name`,
`email`, `active`, and ISO UTC `createdAt`; only active members appear in profiles.
Representative PATCH returns that same member DTO. Billing/contact fields are
visible only to the authorized owner/admin. DTOs omit private storage paths,
passwords/tokens, unrestricted user/event/dancer relations, audit actors, and
nonexistent studio creation/update timestamps.

The shared schemas validate backend serialization and frontend responses.
`getStudio`, `updateStudio`, and `deleteStudio` now take `studioId` with no event
argument; `updateStudioRepresentative` also requires the actual representative ID.
`getMyStudios` calls the profile collection and `updateStudioApproval` calls the
organization approval action. Existing event-specific `getStudios` continues to
list application DTOs. No existing screen consumes these profile helpers.
Retired event-nested studio paths and singular `/representative` have no handlers.

## Dancer contract

Dancer collection routes are `GET`/`POST /api/v1/studios/:studioId/dancers`.
Item routes use `GET`, `PATCH`, and `DELETE` at
`/api/v1/studios/:studioId/dancers/:dancerId`. The old `/api/v1/dancers` paths
are removed. Authentication runs once at the studio mount; controllers derive
event scope from the stored studio, not submitted body/query relationships.

Non-admin access requires all of:

- `dancer.manage` permission for the studio's event or globally.
- Active representative membership in that studio.
- An active, organization-approved studio and an `APPROVED` registration matching
  its current `Studio.eventId`. Another event's registration does not grant access.

These requirements apply to reads and writes. Reads remain available when event
stages prohibit edits. Writes are allowed in `REGISTRATION_OPEN`, or in
`DATA_REVIEW` when that registration grants `canEditDuringReview`. A review override
does not unlock pre-registration or terminal stages. Admins retain their permission,
approval, membership, and stage bypass; active studio/dancer and parent-child
checks still apply. This is the existing event-owned studio transition; global
roster editing across multiple events is still an ADR-001 migration prerequisite.

POST accepts trimmed, nonblank `firstName`, `lastName`, and calendar `birthDate`:

```json
{ "firstName": "Example", "lastName": "Dancer", "birthDate": "2012-02-29" }
```

PATCH accepts a nonempty subset of those fields. Unknown fields, including studio
IDs, event IDs, photos, and audit fields, are rejected. Calendar validation rejects
impossible dates and non-leap February 29. Birth dates must use `YYYY-MM-DD`;
timestamp strings are no longer accepted. New dates are stored at UTC midnight
and returned as calendar dates, avoiding local-time day shifts. Existing stored
timestamps are not rewritten; reads expose their UTC calendar day. Historical
timezone interpretation and any required data correction remain a Phase 3 audit.
Age eligibility and further birth-date policy remain later workflow work.

Create returns 201, list/detail/update return 200, and DELETE returns 204.
The shared dancer DTO contains only `id`, `studioId`, `firstName`, `lastName`,
`birthDate`, and nullable `photoUrl`. It omits private storage paths, audit fields,
and nonexistent creation/update timestamps. Frontend methods infer request/response
types from the shared schemas and validate incoming responses at runtime.

Every item operation verifies both dancer ID and studio ID, including for admins.
Missing or archived studios/dancers return 404. DELETE soft-deletes with `deletedAt`
and the authenticated actor's `deletedBy`; it keeps the row and its relations.
Archived dancers disappear from lists and cannot be read, edited, or deleted again
through standard endpoints. Writes use transactions; restoration and comprehensive
concurrent-update handling remain separate work. Dancer errors use the global
error envelope. No schema or migration changes were required.

## Performance contract

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

## Judge contract

Authenticated collection operations use `GET/POST /api/v1/events/:eventId/judges`;
item operations use `GET/PATCH/DELETE /api/v1/events/:eventId/judges/:judgeId`.
Reads require admin or `event.manage` for that event or globally. Writes remain
admin-only. All operations check event existence; missing events return 404,
including collection reads. Item reads and mutations constrain both IDs, so a
judge from another event returns 404 even for admins. Permission denials use the
global 403 envelope. Existing event-stage behavior is unchanged.

POST accepts `userId`, `name`, and optional nullable `description`, `country`,
and `city`. The user must exist and be active (404/409 otherwise). The path is
the only event selector. Text is trimmed and nonblank; unknown body fields are
rejected. PATCH accepts a nonempty subset of the four profile fields. Omitted
fields stay unchanged; explicit null clears optional text. Event/user links,
scores, role, audit fields, and invented timestamps cannot be patched.

Creation returns 201; list/detail/update return 200. DTOs contain only `id`,
`eventId`, `userId`, `name`, nullable `description`, `country`, and `city`.
No user credentials, relations, or timestamps are returned. Backend serialization
and frontend helpers validate shared schemas. Helpers are exported through the
web API barrel; no judge management screen is implemented by this slice.

The existing unique user/event constraint returns 409, including concurrent
assignment conflicts; the same user can judge different events. DELETE remains
hard deletion for unscored records, returning 204 without a body. The actual
Score foreign key restricts deletion: scored judges return 409 and retain scores.
The previous route comment claiming cascade/soft deletion was incorrect. A
concurrently missing item returns 404; foreign-key races return 409. No migration
or automatic cleanup is introduced. CRUD neither grants nor removes UserRole;
invitation acceptance and history-preserving staff offboarding remain Phase 2.

## Category contract

Authenticated collection operations use GET/POST at
`/api/v1/events/:eventId/categories`; item GET/PATCH/DELETE use
`.../categories/:categoryId`. Reads require admin or `event.manage` for the
event or globally; writes remain admin-only. Every operation checks the event
exists (404 otherwise). Every item operation constrains both IDs, including
admin mutations. Wrong-event/missing items return 404; permission denials return
the global 403 envelope. Existing stage behavior is unchanged.

POST and PATCH accept only `{ "name": "Ballet" }`. Names are trimmed and must
be nonblank strings. Empty PATCH bodies, null names and unknown fields such as
id, eventId, performances or audit fields are rejected with the global validation
envelope. The path alone selects the event. DTOs contain exactly `id`,
`eventId` and `name`, with no invented timestamps or relations. Lists are
arrays ordered by name then ID. Backend serialization and frontend API helpers
validate shared schemas; helpers are exported through the API barrel. No
category management screen is delivered here.

Creation returns 201, list/detail/update return 200 and deletion returns 204
without a body. Existing per-event name uniqueness returns a standard 409 for
create/rename conflicts, including competing creates. Names can repeat across
events. Updates/deletes constrain the event in the database write, with a
concurrently missing item mapped to 404. DELETE hard-deletes unused categories;
the database foreign key blocks referenced categories with 409, preserving all
performances, including archived ones. Relationship races also return 409.
No schema/migration, new lifecycle restriction or historical snapshot behavior
is introduced. Legacy nomination schemas/types were removed under P1-TYPES.

## Formats and age groups

Both resources use authenticated GET/POST collections under an event, and
GET/PATCH/DELETE items with formatId or ageGroupId. Reads require admin or global/
event event.manage; writes remain admin-only. Every operation checks the event;
item predicates include both IDs. Missing parents/items return 404 and permission
denials use the standard envelope. Existing stage behavior remains unchanged.

Format input fields are name, minParticipants, maxParticipants and
maxDurationSeconds; all numeric values are positive PostgreSQL-compatible integers.
Age group input fields are name, minAge (nonnegative integer), and optional nullable
maxAge. Names are trimmed/nonblank; unknown fields and empty patches are rejected.
PATCH omission preserves maxAge, while null clears it. Minima cannot exceed maxima.
PATCH validates the resulting record in a serializable transaction; conflicting
concurrent edits return 409 or fail range validation with 400, preserving a valid
stored range. DTOs contain exactly id/eventId and the respective stored fields,
including explicit nullable maxAge. No fabricated timestamps/relations are sent.

Lists sort formats by name then ID and age groups by minAge then ID. Creation
returns 201, reads/updates 200 and deletion 204. The existing schema permits
repeated format/age-group labels, including concurrent creates and renames. This
slice does not add name uniqueness, overlap, eligibility or participant/duration
policy. The existing foreign keys prevent deleting configurations referenced by
active or archived performances (409). Missing/concurrently removed records return
404; relationship/serialization races map to standard errors. No migration.

## Invitation contracts

GET/POST /api/v1/invitations are authenticated admin operations. GET
/api/v1/invitations/:token and POST /api/v1/invitations/accept remain public.
Create accepts strict email/roleKey/optional eventId. The role and supplied event
must exist; submitted audit/token fields are rejected. The create response is
message/messageId (invitationSent)/invitationId; no raw token is returned. List
DTOs expose only id, email, roleKey, nullable eventId, UTC createdAt/expiresAt and
nullable UTC usedAt. Inspect exposes email/roleKey, nullable event id/name and UTC
expiry. Storage tokens, creators and unrestricted relations are excluded.

Accept requires token, trimmed name and password. It returns a validated bearer
session with explicit user identity, message and invitationAccepted messageId.
Lookups/role assignment/consumption are serializable and use typed null-aware
predicates, avoiding Prisma nullable-compound assertions. Missing records return
404, used/expired invitations and an already-assigned role return 400, active
invitation/constraint/serialization conflicts return 409. Missing role failures
roll back without creating accounts or consuming invitations. Existing invitation
history uniqueness can still prevent reuse; resend/history policy remains Phase 2.

Scope remains optional, including global scope, and role existence is not an
assignable-role policy. Existing-account acceptance still lacks intended-account
authentication/eligibility enforcement. No Judge record is created automatically.
Plaintext persistence, stub logging/delivery, token digests, safe existing-account
acceptance, mandatory staff scope and atomic Judge reconciliation remain Phase 2
release gates. This contract slice does not authorize external onboarding.

## Image contracts

POST /api/v1/images/events/:eventId uses multipart image; users/:userId and
dancers/:dancerId use photo; studios/:studioId uses logo. Paths remain canonical.
All require authentication and validate resource IDs/existence; archived studios/
dancers are unavailable. Resource ownership and permission checks remain
P2-BOUNDARIES, which must pass before an upload UI is exposed.

Missing file, declared MIME rejection, size and unexpected multipart fields use
the global validation envelope with uploadMissing/uploadType/uploadTooLarge/
uploadInvalid reasons. Existing JPEG/PNG/WebP and 10 MiB limits remain; content
sniffing/provider policy is P8-MEDIA. Success is exactly success:true, messageId:
saved and the appropriate imageUrl/photoUrl/logoUrl; private storage paths are
omitted. Helpers use FormData and runtime response decoding.

Upload occurs before database update/old-file removal. Database failure attempts
new-file cleanup and retains the old file. Full provider replacement, old-file
cleanup/retry and orphan handling remain P8-MEDIA; no durable cross-storage
transaction is claimed. Unexpected failures use a sanitized 500 envelope, with no
exception/SQL/storage-path details returned.

## Localized errors and coverage

All business errors retain error/code/statusCode/timestamp/optional details and
add semantic reason, numeric params and structured path/rule/params issues.
Success notices carry messageId; 204 and ordinary data DTOs remain unchanged.
The frontend renders descriptors through one localized presenter; legacy/future
reasons have a safe fallback and response decoding happens before session storage.
See [localization contracts](LOCALIZATION.md) and [ADR-007](adr/007-localized-feedback-contracts.md).

[The coverage inventory](api-coverage.json) maps all 56 mounted operations to
success/input/authentication/permission/parent/active/conflict test evidence or
explicit non-applicable/deferred cases. Runtime router and no-token tests prevent
inventory drift. This is not a test-coverage percentage or security/browser-release
claim. /health has a simple infrastructure status shape; static files are outside
the versioned business DTO/error contract. Empty users/scoring routes remain deferred.

## Validation

Run `pnpm.cmd build` followed by `pnpm.cmd --filter api test` for fresh HTTP tests
of the compiled app. The route tests use in-memory Prisma fixtures and real HTTP
requests/JWT verification. They cover public/protected boundaries, one dispatch
per mounted collection, wrong-event permission denial, studio ownership denial,
validation envelopes, and retired/unknown paths. They do not claim complete
operation-level authorization or database integration coverage.

Eight additional registration HTTP tests cover roleless creation, admin behavior,
strict inputs/stages, list scope, approval roles, parent mismatches, cancellation,
and retired paths. Seven dancer HTTP tests add CRUD/DTO, scope/ownership/approval,
stage/review, parent substitution, strict calendar inputs, audit/archive, and
retired-path coverage. Five performance HTTP tests cover canonical CRUD/DTOs, authentication and permission/approval/stage gates, strict inputs, parent substitution, legacy participant guards, list scope, and retired paths. Six studio HTTP tests add profile DTOs, roleless/member access, scoped writes, stage locks, nullable/strict inputs, conflict mapping, self/parent checks, approval, audited archive, and retired URLs. Three judge HTTP tests add CRUD/DTOs, nullable/strict inputs, authentication, scoped reads/admin writes, missing parents/users, inactive assignment, parent substitution, and conflict/error mapping. A registration duplicate-name HTTP regression checks the global conflict envelope for applicants and admins without exposing database details. Four event HTTP tests add nullable DTO/CRUD, strict inputs, offset serialization, partial-date regressions, all non-admin write scopes, missing records, and conflict mapping. Five auth HTTP tests cover strict inputs, hashed registration and duplicate races, login/verification DTOs and failure envelopes, caller-only profiles, role keys/scopes and private-field exclusion. A JWT configuration test checks valid signing durations and startup rejection. Three category HTTP tests add strict CRUD/DTOs, all-operation parent checks, authentication/scoped reads/admin writes, validation and database conflict/error mapping. Six setup HTTP tests add format/age CRUD, strict inputs, resulting partial ranges, scoped reads/admin writes, parents and conflict mapping. Invitation tests cover serialized/token-free DTOs, role/event checks, acceptance and error contracts. All image routes exercise multipart errors, explicit DTOs, missing/archived records and storage failures. Coverage and localization guards bring the API test total to 72; 8 frontend localization/transport tests also run.

`pnpm.cmd test:baseline` separately creates an isolated Compose PostgreSQL
database and starts the compiled server to verify deployment/seed preservation,
health, versioned login/profile, and basic authorization. It also runs
`scripts/check-studio-registrations.cjs` against that fixture: real creation and
approval rollback, active membership, deleted studios, contradictory legacy event
relationships, role idempotency, DTOs, pending-only cancellation, global duplicate-name conflicts, competing creation,
case sensitivity, and archived-name reuse/preservation. A creation
rollback fixture uses a signed nonexistent user under the current authentication
behavior; active-user verification remains Phase 2 work. The runner cleans up its
own fixture. The runner also executes `scripts/check-dancers.cjs` for real
event/global permissions, cross-studio and cross-event denial, active records,
stage/review rules, calendar-date persistence, partial updates, and audited soft
deletion. The runner also executes `scripts/check-performances.cjs` for real CRUD/DTOs, event/global permission scope, cross-studio denial, active/approved records, configuration/participant checks, stage/review rules, nested-write rollback on order conflict, legacy guards, and audited archive/relationship preservation. The runner also executes `scripts/check-studios.cjs` for real studio profiles, roleless/member reads, event/global writes, SQL/JSON null handling, global name conflicts and competing renames, representative self/parent checks, approval isolation, stages, and archive/relationship preservation. Full API integration coverage remains in the development plan.

The baseline runner also executes `scripts/check-judges.cjs`: real unique user/event
conflicts, cross-event items, scoped reads/admin writes, nullable updates, missing
and inactive users, unchanged roles, and score-restricted deletion with record
preservation. These checks use the runner-owned disposable database.

The baseline runner also executes `scripts/check-events.cjs`: real event DTOs,
nullable persistence, private-path exclusion, rejected-write preservation, missing
records and competing partial-date updates that must retain a valid date pair.

The baseline runner also executes `scripts/check-auth.cjs` against real users
and global/event roles: roleless profiles, caller-only identity, explicit DTOs,
UTC creation time, private-field exclusion, bearer login and disabled-login errors.

The baseline runner also executes `scripts/check-categories.cjs`: real CRUD,
trimmed-name persistence, same-event create/rename conflicts, competing creates,
cross-event parent checks, global/event read permissions, admin-only writes,
missing parents, strict rejected inputs, and foreign-key-restricted deletion
preserving active and archived performances. It uses the disposable fixture only.

The baseline also runs scripts/check-setup.cjs (real CRUD, nullable ranges,
label-policy preservation, serializable concurrent partial updates and referenced
performance preservation) and scripts/check-invitations.cjs (token-free DTOs,
scoped/global role acceptance, concurrent replay and missing-role rollback).
