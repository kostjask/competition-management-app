# Studio registration contract

[API index](../API.md). Paths are relative to `/api/v1`. Authentication requires
an active verified account. A new applicant needs no role. Policy and actor matrix:
[ADR-003](../adr/003-registration-lifecycle.md).

`POST /events/:eventId/studio-registrations` accepts either a new application or
same-studio reapplication. Both enforce the application window for every actor,
including global admins: PRE_REGISTRATION/REGISTRATION_OPEN and strictly before
registrationDeadline when configured. Null deadline means no automatic cutoff.

```json
{
  "operationId": "f228f339-bbc7-4ec1-b43f-28e39fe68154",
  "name": "Example studio",
  "country": "Estonia",
  "city": "Tallinn",
  "representativeName": "Applicant",
  "representativeEmail": "applicant@example.com"
}
```

New application returns 201. Optional fields are country, city, directorName,
directorPhone and JSON-object invoiceDetails. Text is trimmed/nonblank. Non-admins
must supply representative contact; membership links only to the authenticated
account. Admin contact never creates membership. Studio, PENDING registration,
membership and audit are atomic. Both approvals begin pending. Unknown fields,
including userId, eventId and approval/review overrides, are rejected.

Supply and retain a UUID operationId across uncertain responses. Retries with the
same normalized payload/event/creator return the current saved registration,
including after a later cancellation; they never create another identity. Changed
input or another creator conflicts without revealing identities. The operation
binding and request digest are private. Concurrent first requests may yield 409;
GET or retry the same operation to reconcile. Without operationId creation is not
retry-safe: GET owned registrations before retrying. Name matching never merges
studios. The case-sensitive global active-name index remains authoritative;
duplicate names return private 409 duplicateName. Archived names can be reused.

Reapplication uses the same canonical POST with only:

```json
{ "studioId": "existing-studio-id", "revision": 2 }
```

An active owner or global admin may reapply CANCELLED/REJECTED registrations for
the studio's own event. It returns 200, keeps studio/registration IDs, memberships,
organization approval and immutable audit history, increments revision and resets
the event decision to PENDING with no reason/review allowance. It cannot create a
missing registration, reuse a studio in another event, or merge by name. A retry
of the preceding successful revision returns the saved PENDING result; stale
conflicting operations return 409 concurrentChange. Read before retrying.

`GET /events/:eventId/studio-registrations` returns registration DTOs including
CANCELLED history/current pair state. Global admins see all active studios in the
event; others only active owned memberships. Studio.eventId must match. Archived
studios and contradictory legacy cross-event registrations are not exposed.

`PATCH /events/:eventId/studio-registrations/:studioId` is global-admin-only:

```json
{ "status": "APPROVED", "revision": 1, "canEditDuringReview": false }
```

Review accepts PENDING/APPROVED/REJECTED in pre/open/review stages. CANCELLED and
LOCKED cannot receive decisions. Organization approval is independent: any event
decision may be recorded while organization is pending/rejected. Both approvals
are required for representative access; either order reconciles access atomically.
Reversing either decision removes access only if no other approved active studio
qualifies in that event; role rows remain for history. Reapproval restores the same
assignment. Missing role configuration/audit failure rolls everything back.

Optional reason is CONTACT_ORGANIZER, INCOMPLETE_DETAILS, INELIGIBLE or CAPACITY;
rejection defaults to CONTACT_ORGANIZER, other decisions clear it. These codes
have ET/EN/RU copy; no authored review prose is accepted. Omitted review allowance
is preserved. It governs existing entry correction gates, never pending profile
corrections or new applications in DATA_REVIEW. Matching immediate retries are
no-ops; stale conflicting revisions return 409. Concurrent operations serialize.

`DELETE /events/:eventId/studio-registrations/:studioId?revision=3` returns 204.
An active owner/global admin may cancel only PENDING in pre/open/review, also
after the deadline. It retains the row as CANCELLED and increments revision;
studio/member/history are retained. Matching retries return 204. An old cancel
cannot cancel a newer reapplication. Missing/malformed revision is 400; stale is
409; unsupported state/window or ownership is 403. Wrong studio/event is 404.

DTO: id, studioId, eventId, status (PENDING/APPROVED/REJECTED/LOCKED/CANCELLED),
revision, nullable decisionReason, canEditDuringReview, ISO UTC createdAt/updatedAt,
nextActor (ORGANIZER/APPLICANT/NONE) and studio { id, name, approvalStatus, country,
city }. nextActor describes who should inspect next; it grants no permission or
promise that a closed window permits a write. Private contacts/billing/storage,
creator and retry digests are omitted. Studio profile registration summaries add
revision/reason but omit nextActor. All errors use the global localized envelope.

Frontend helpers use shared inferred contracts; createStudio also accepts the
reapplication body, updateStudioRegistration requires revision and cancellation
requires revision as a separate argument. Organizer setup/review is implemented;
applicant status/correction journeys remain P5.

## Organizer review and notifications

Global-admin-only `GET /events/:eventId/review` returns a serializable snapshot
of the event and its active, event-owned applications, authorized studio profiles,
minimal scoped audit history and notification states. Non-admins (including scoped
admin assignments) receive 403; missing events receive 404. Private queue ciphertext,
binding digests, account recipient IDs and retry secrets never enter this DTO.

Organization and event decision writes use the existing canonical PATCH routes.
Both advance the shared registration revision. A changed decision atomically saves
the decision, reconciles derived access, appends audit and creates one notification
per active member whose linked account is active and verified. Contact email does
not establish recipient identity. The account's language preference selects ET/EN/RU
with the existing ET default. No active eligible recipient means no notification.

Migration 31 adds `ReviewNotification`, with a unique registration/kind/revision/
recipient key and restrictive registration/dispatch relations. It retains decision
kind/status/reason/revision and links to the existing encrypted P2 email queue.
Matching write retries create no duplicate intent. Queue/intent/audit failures
roll back the decision and access together. Neutral mail says a decision changed;
it never claims both independent approvals succeeded. Links currently lead to the
account; P5 owns the applicant status route. No sensitive evidence appears in mail.

States are `TEST_ONLY` (fake provider; no mail sent), `PENDING` (automatic retry,
delivery unconfirmed), `ACCEPTED` (provider accepted, inbox delivery unconfirmed),
and `CANCELLED` (expired/cancelled dispatch; decision remains saved). Expired pending
intent is displayed as cancelled even before the worker processes it.
`POST /events/:eventId/review/:notificationId/retry` is global-admin-only and returns
204. It verifies the notification's active studio/event and current eligible owner.
Pending live intent and provider-accepted intent are no-ops; expired intent is
cancelled before a replacement is queued. It never repeats the decision. Wrong
event, missing/archived studio or notification returns 404; an ineligible recipient
returns 403. Actual provider delivery and human language review remain release gates.
