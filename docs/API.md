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
studio, dancer, and image router operations require authentication before their
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
| Studios | `/studios`, `/studios/:studioId`, approval and representative actions | Shared DTO/client alignment |
| Dancers | `GET/POST /studios/:studioId/dancers`; `GET/PATCH/DELETE /studios/:studioId/dancers/:dancerId` | Implemented with shared DTOs, event-derived permissions, active ownership, stage checks, and audited soft deletion |
| Images | `/images/events/:eventId`, `/users/:userId`, `/dancers/:dancerId`, `/studios/:studioId` (each under `/images`) | Resource-specific upload authorization |
| Performances | Unmounted | Fix controllers, duplicate handlers, authorization, and canonical event paths before mounting |
| Users | No implementation | `routes/users.ts` is empty; no user-management endpoint is claimed |
| Scores | Reserved only | Scoring design and implementation in later phases |

The web client's base URL, registration operations, and dancer operations follow canonical paths and shared contracts.
Its remaining studio-detail/performance paths and response types still need
the corresponding planned repairs.
Older implementation summaries do not supersede this current status or the ADR
target. The maintained [registration workflow](REGISTRATION_API.md) links here
for implemented contracts.

For the user-facing distinction between accounts, applications, and entry
submission, see [registration workflow](REGISTRATION_API.md) and
[user journeys](USER_JOURNEYS.md). Planned drafts, receipts, corrections, and
recovery screens do not add endpoints to this implemented API inventory.

## Studio registration contract

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
deletion. No current screen consumes these registration helpers. Existing studio
detail/edit/delete helpers remain a separate contract-alignment task.

Old `/events/:eventId/studios` and `.../studios/:studioId/registration` handlers
are removed. POST creates a new identity; it is not an idempotent retry operation
and does not merge similarly named studios. Registration of an existing studio
awaits the Phase 3 identity migration. Existing unique event/studio constraints
remain unchanged; this feature adds no database migration or automatic backfill.

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
retired-path coverage. The API test total is 30.

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
deletion. Full API integration coverage remains in the development plan.
