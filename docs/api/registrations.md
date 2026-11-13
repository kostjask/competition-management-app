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
creator and retry digests are omitted. The studio summary also includes nullable
approvalReason using the same semantic reason vocabulary. Studio profile registration summaries add
revision/reason but omit nextActor. All errors use the global localized envelope.

Frontend helpers use shared inferred contracts; createStudio also accepts the
reapplication body, updateStudioRegistration requires revision and cancellation
requires revision as a separate argument. P4/P5 mount review/status/correction
pages; [current evidence](../APPLICATION_REVIEW_VALIDATION.md) records their scope.

## Verified draft continuation

New application POST optionally supplies positive onboardingRevision. It requires
the caller's current DRAFT with that exact revision and intendedEventId equal to
this event (or null). It atomically marks the draft COMPLETED, incrementing its
revision, with studio/membership/application/audit creation. Stale, cancelled,
completed, another-event or admin draft commands conflict without changing rows.
The private operationId binding reconciles an already-created application before
checking the draft or application window. The browser retains the frozen command
through uncertain responses and retries exactly that command.

## Review history and notification status

GET `/events/:eventId/studio-registrations/:studioId/review` requires the exact
active event/studio and active owner or global admin. It returns:

- history: action, createdAt, nullable revision/fromStatus/toStatus/reason;
- notifications: id, revision, axis (ORGANIZATION/EVENT), createdAt and state.

No audit actors, recipients, encrypted bodies, provider IDs or credentials appear.
History is chronological and notification intents newest first. Organization and
event decisions each increment the same application revision and atomically queue
one notice per changed decision. Matching retries add neither notice nor audit.
Notification persistence/audit/access failure rolls back the entire decision.

States are SIMULATED (fake mode, no email), NO_RECIPIENT (no eligible verified
membership account), QUEUED, RETRYING, ACCEPTED (provider acceptance, never an inbox
receipt), or EXPIRED. The existing worker retries pending failures automatically
with the frozen body/idempotency key; refreshing status does not repeat a decision.
Expired/no-recipient notices remain visible with account/contact recovery. Active
verified membership accounts receive neutral review-update mail in their saved
locale (ET default), never the editable representative contact address. The email
links to `/applications` to read both current approvals. [ADR-021](../adr/021-m2-review-notifications.md).

POST `/events/:eventId/studio-registrations/:studioId/review/:notificationId/retry`
accepts an empty strict object and requires active global administrator access.
The exact event/studio/notice relationship is verified. A matching retry returns
204. Only expired deliveries with retained account bindings are requeued, after
checking current active verified membership. Accepted and unexpired deliveries
are preserved. Concurrent transport writes may return 409 and can be retried.
Inactive membership returns 403, incorrect or archived parents return 404, and
unknown body fields return 400. Transport retry does not repeat either decision.

Notification DTOs include boolean retryable. Historical unbound deliveries,
fake mode and notices without supported retry transport report false. Retried
attempts remain retained but superseded attempts no longer determine current
state. Account IDs, supersession details and queue bodies stay private. The UI
refreshes the notification section independently of unsaved decision/profile forms.
