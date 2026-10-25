# Studio registration contract

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

Schema follow-up is tracked in [database review](../DATABASE_REVIEW.md). Explicit
performance ownership, incomplete drafts without stage order, display-name policy,
token/identity changes, and stronger event constraints are planned, not current
request/response contracts. Current full performance-create requirements and global
active studio-name uniqueness still apply. Keep API/client changes paired with
reviewed migrations; do not infer that the review introduces a draft endpoint or
allows duplicate studio names today.

Account eligibility target is defined in
[ADR-006](../adr/006-account-eligibility-and-staff-onboarding.md): studio-focused
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
helpers use the canonical [studio contract](studios.md).

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
