# Studio profile contract

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

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
operations retain their separate approval gates. Pending active owners may PATCH profile details without a role during the
application window (before a configured deadline); their correction increments
the registration revision and returns organization approval to PENDING for review; this exception does not allow
archival. The pending-owner exception also permits updating the owner's own active
representative contact during the application window. Other writes retain the permission rule. PATCH, representative PATCH,
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

Profile and representative PATCH optionally accept expectedRevision; the delivered
UI always supplies the current same-event application revision. A changed receipt
conflicts unless it is the immediately preceding matching saved request. Profile
and revisioned contact saves increment that receipt atomically, invalidating stale
review decisions. Profile corrections also clear approvalReason when returning
organization verification to PENDING. An otherwise empty revision-only PATCH is
invalid. Existing callers omitting expectedRevision keep their previous write
contract; the UI's revisioned commands support safe uncertain-response recovery.

`PATCH /api/v1/studios/:studioId/approval` accepts required status
(PENDING/APPROVED/REJECTED) and positive revision, plus optional reason from the
event-decision semantic codes. Rejection defaults to CONTACT_ORGANIZER; other
statuses clear it. It requires global admin and consumes/increments the studio's
canonical same-event application revision. Matching immediate retries are no-ops;
stale conflicting receipts return 409. It changes organization approval only;
event decision and review allowance are untouched. Derived representative access is reconciled transactionally when
both approvals qualify, or removed with retained history when none qualify. All studio errors use the global envelope. Writes use
transactions and active-record predicates. Audit and transactional notification
intent commit with the decision; [registration review status](registrations.md#review-history-and-notification-status)
describes delivery states and private-field boundaries.

List/detail/profile update/approval return the same explicit studio DTO: `id`,
`eventId`, `name`, `approvalStatus`, nullable `approvalReason`, `country`, `city`, `directorName`,
`directorPhone`, `invoiceDetails`, `logoUrl`, `registrations`, and `representatives`.
Registration summaries include IDs, status (including `LOCKED` and `CANCELLED`), revision, nullable decisionReason, review
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
list application DTOs. S06/S07/S08 consume these helpers for organizer review and
role-independent application/status/profile/contact recovery.
Retired event-nested studio paths and singular `/representative` have no handlers.
