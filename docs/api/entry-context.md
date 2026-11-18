# Representative entry context

`GET /api/v1/events/:eventId/studios/:studioId/entry-context` supplies S09/S10
read-only configuration without granting `event.manage`. Optional query
`performanceId` selects one active entry belonging to that exact event/studio;
unknown query keys and parent substitution fail closed.

Authentication, performance permission, active studio membership, organization
approval and the matching approved event registration are checked on every read.
Global administrators retain the existing bypass, including neither missing nor
mismatched parents. Studio names, event names, the event-local age date/time zone,
explicit category/age/format DTOs, nullable checkpoint settings, current
`writableFields`, and configured-policy FINAL draft `issues` are returned through
the strict shared `EntryContextSchema`. No accounts, other studios, private
contacts, registration decisions, receipts or participant details are projected.

Availability uses the same stage/deadline/early-lock/correction guards as writes.
A grant limited to one performance unlocks that entry only when selected; it
never unlocks the studio-wide roster/entry form. Roster availability also checks
`dancer.manage`. These are advisory facts from one transaction: every write still
rechecks current authority, relationships, revision and policy. Administrative
configuration endpoints retain their existing permissions.

Draft issue reasons cover required fields, nomination combinations, active
participants, event-local age/birth dates, participant counts and effective
duration limits. For unconfigured legacy events, `settings` is null and this
configured-policy issue list is empty. An empty list does not acknowledge
submission, music readiness or eligibility. The existing checkpoint service
remains the final validation boundary.

Browser routes are `/app/studios/:studioId/dancers` and
`/app/events/:eventId/studios/:studioId/performances`, with `/new` and
`/:performanceId/edit` children. Approved application pages and organizer review
link to those scopes. Existing organizer entry review/configuration remains at
`/app/admin/events/:eventId/performances`.

The roster uses [revisioned dancer writes](dancers.md). Entry creation retains
its frozen creation operation, nullable unscheduled draft and authoritative
acknowledgement. The editor sends only currently writable fields, reconciles an
uncertain response before retrying, and requires explicit server/local comparison
after a stale revision. Native checkbox search/counts, inactive participant
removal, saved issue links and refresh retain local selections. Withdrawal and
restore use the existing immutable lifecycle operations. Music and representative
checkpoint submission remain separately gated work.
