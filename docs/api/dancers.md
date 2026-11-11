# Dancer contract

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

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
timestamp strings are no longer accepted. Migration 34 stores native PostgreSQL
DATE; Prisma maps it to UTC midnight and HTTP keeps YYYY-MM-DD. Its preflight
audits all legacy rows, including archives, and refuses non-midnight timestamps
for reviewed repair instead of guessing a timezone. Midnight rows retain the
previously displayed UTC day. Leap days and database-session timezone independence
are tested. [ADR-023](../adr/023-entry-history-and-calendar-dates.md) defines completed
years on the event-local start date, with March 1 advancement for February 29 in
non-leap years. The shared calculation is implemented; submission eligibility
enforcement remains P3-ENTRIES, not these roster CRUD endpoints.

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
error envelope. Migration 34 changes only the birth-date storage type; identity,
archive actors and relations are retained.
