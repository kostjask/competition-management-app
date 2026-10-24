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
JWTs remain valid; URL migration does not rotate credentials. Existing invitation
business logic, token exposure, local error formats, and broader authorization
limitations remain tracked work, not completed security hardening.

## Remaining resource integration

The complete target layout is in [ADR-002](adr/002-canonical-api-paths.md). The
version prefix is implemented; these resource-specific repairs remain:

| Resource | Current development path relative to `/api/v1` | Remaining work |
| --- | --- | --- |
| Events | `/events`, `/events/:eventId` | Shared DTO alignment |
| Event setup | `/events/:eventId/judges`, `/categories`, `/formats`, `/age-groups` (each under the event) | Controller/error/contract consolidation |
| Studio registration | `GET/POST /events/:eventId/studio-registrations`; `PATCH/DELETE /events/:eventId/studio-registrations/:studioId` | Implemented with shared DTOs, transactions, and ownership/event-scope tests; existing-studio reuse awaits ADR-001 migration |
| Studios | `GET /studios`; `GET/PATCH/DELETE /studios/:studioId`; approval and representative PATCH actions | Shared DTOs/client paths, member reads, scoped writes, active parents, and audited archive implemented |
| Dancers | `GET/POST /studios/:studioId/dancers`; `GET/PATCH/DELETE /studios/:studioId/dancers/:dancerId` | Implemented with shared DTOs, event-derived permissions, active ownership, stage checks, and audited soft deletion |
| Images | `/images/events/:eventId`, `/users/:userId`, `/dancers/:dancerId`, `/studios/:studioId` (each under `/images`) | Resource-specific upload authorization |
| Performances | `GET/POST /events/:eventId/performances`; `GET/PATCH/DELETE /events/:eventId/performances/:performanceId` | Implemented with shared contracts, single-studio ownership checks, transactions, and audited soft deletion |
| Users | No implementation | `routes/users.ts` is empty; no user-management endpoint is claimed |
| Scores | Reserved only | Scoring design and implementation in later phases |

The web client's studio, registration, dancer, and performance operations follow
canonical paths and shared contracts. Auth/event/setup DTO consolidation remains.
Older implementation summaries do not supersede this current status or the ADR
target. The maintained [registration workflow](REGISTRATION_API.md) links here
for implemented contracts.

For the user-facing distinction between accounts, applications, and entry
submission, see [registration workflow](REGISTRATION_API.md) and
[user journeys](USER_JOURNEYS.md). Planned drafts, receipts, corrections, and
recovery screens do not add endpoints to this implemented API inventory.

## Studio registration contract

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
awaits the Phase 3 identity migration. Existing unique event/studio constraints
remain unchanged; this feature adds no database migration or automatic backfill.

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
migration. Registration creation conflict/error consolidation remains separate
Phase 1 work.

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
removed; shared schemas are canonical. Legacy nomination cleanup remains separate.

Writes are transactional. Participant replacement uses a nested update so a
stage-order conflict rolls back replacement too. The existing unique
`(eventId, orderOnStage)` constraint returns 409 on conflict, including orders
held by archived performances. DELETE writes `deletedAt`/`deletedBy` and retains
relations; archived performances cannot be read, patched, or deleted again.
No Prisma model/migration changed. Restore, order reuse, full concurrent editing,
performance snapshots, and cross-event studio reuse remain later work.

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
retired-path coverage. Five performance HTTP tests cover canonical CRUD/DTOs, authentication and permission/approval/stage gates, strict inputs, parent substitution, legacy participant guards, list scope, and retired paths. Six studio HTTP tests add profile DTOs, roleless/member access, scoped writes, stage locks, nullable/strict inputs, conflict mapping, self/parent checks, approval, audited archive, and retired URLs. The API test total is 41.

`pnpm.cmd test:baseline` separately creates an isolated Compose PostgreSQL
database and starts the compiled server to verify deployment/seed preservation,
health, versioned login/profile, and basic authorization. It also runs
`scripts/check-studio-registrations.cjs` against that fixture: real creation and
approval rollback, active membership, deleted studios, contradictory legacy event
relationships, role idempotency, DTOs, and pending-only cancellation. A creation
rollback fixture uses a signed nonexistent user under the current authentication
behavior; active-user verification remains Phase 2 work. The runner cleans up its
own fixture. The runner also executes `scripts/check-dancers.cjs` for real
event/global permissions, cross-studio and cross-event denial, active records,
stage/review rules, calendar-date persistence, partial updates, and audited soft
deletion. The runner also executes `scripts/check-performances.cjs` for real CRUD/DTOs, event/global permission scope, cross-studio denial, active/approved records, configuration/participant checks, stage/review rules, nested-write rollback on order conflict, legacy guards, and audited archive/relationship preservation. The runner also executes `scripts/check-studios.cjs` for real studio profiles, roleless/member reads, event/global writes, SQL/JSON null handling, global name conflicts and competing renames, representative self/parent checks, approval isolation, stages, and archive/relationship preservation. Full API integration coverage remains in the development plan.
