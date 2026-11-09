# ADR-003: M2 registration lifecycle

Accepted 2026-11-09 for the M2 application/review scope. Live operation remains
P6-LIVE-MODEL. This decision does not add DRAFT, SCHEDULED or LIVE stages.

Organization and event decisions are independent. An administrator may record
either decision first; representative access requires both APPROVED, an active
studio and active membership. Reversing a decision reconciles access, retaining
assignment history and any other approved studio in the same event.

M2 stage changes are PRE_REGISTRATION → REGISTRATION_OPEN → DATA_REVIEW.
Cancellation is allowed from these three stages. Backward/skipped changes and
transitions into live/final states are refused until their owning lifecycle task.
Existing terminal/live records remain readable. An unchanged stage is a no-op.
Stage PATCH supplies expectedStage; stale stages conflict. P4-CORE adds mandatory expectedRevision for all event edits and setup readiness before opening, as recorded in [ADR-020](020-organizer-event-setup.md). All actors, including
global administrators, obey application deadlines and stage locks.

Event instants use explicit-offset ISO input and UTC storage. timeZone is an IANA
identifier (UTC default). registrationDeadline is nullable: null explicitly means
no automatic cutoff; otherwise it must be at or before startsAt. At the exact
deadline applications/reapplications/profile corrections are closed. Stage closure
can close earlier. A deadline edit checks the resulting stored event dates.
Clients must convert a selected local wall time into an explicit-offset instant:
reject nonexistent DST times and require the user to choose an offset for an
ambiguous time. The API never guesses a zone or resolves a timezone-free date.

| Action | Actor | State/window | Result / next actor |
| --- | --- | --- | --- |
| New application | Verified account, no role required; admin creates without membership | PRE_REGISTRATION/REGISTRATION_OPEN, before deadline | PENDING; organizer reviews both decisions |
| Event decision | Global admin | PENDING/APPROVED/REJECTED in open/pre/review | PENDING/APPROVED/REJECTED; organizer or applicant according to decisions |
| Organization decision | Global admin | Independent organization policy | Both approvals determine access |
| Profile correction | Active owner or admin | Pending application in application window | Same application with incremented revision and organization reset to PENDING for re-review; no entry submission implied |
| Review correction allowance | Global admin | Event decision in pre/open/review | canEditDuringReview controls existing entry correction gates only |
| Cancel | Active owner or global admin | PENDING, pre/open/review (also after deadline) | Retained CANCELLED registration; applicant may reapply when window permits |
| Reapply | Active owner or global admin | CANCELLED/REJECTED, application window | Same studio/members/registration; PENDING, review allowance cleared |

LOCKED and CANCELLED cannot receive event decisions. Rejection requires no
organization approval and is reversible by admin review or applicant reapplication.
The existing global-admin profile-edit override remains explicit; it does not
bypass new-application/reapplication windows. Pending-owner corrections cover
name/location/director/billing profile fields only, not memberships or entries.
M2 decision reasons are semantic codes, default CONTACT_ORGANIZER on rejection;
there is no organizer-authored review prose. Organization correction outside the
pending application window is contact/review, not an implicit unlock.

Mutation revision is mandatory for event decisions, cancellation and reapplication.
Successful transitions increment revision once. Matching retries return the saved
state; stale conflicting operations return 409 and require an authoritative GET.
Cancellation uses a revision query parameter so an old retry cannot cancel a newer
reapplication. POST with studioId and revision is the canonical same-event reapply
operation. It cannot register another event's studio or merge by name.

New applications may supply a UUID operationId. Its private creator/request digest
binds retries to the same normalized request and event; reuse with different input
or identity conflicts. Without it, callers must reconcile GET before retrying.
Clients generate and retain it across uncertain responses. The global active-name
index remains unchanged. Durable audit records creation, pending profile corrections, decisions, cancellation,
reapplication and event updates in the same serializable transaction. Conflicting
transactions return 409; audit failure rolls all changes back. No mail delivery is
claimed by these operations; notification intent is P4-REVIEW.

No existing identity, registration or audit record is deleted by the migration.
Rollback after use requires retaining/exporting new cancellation/audit history;
do not downgrade an enum or discard attempts to roll back application binaries.
Revisioned transitions plus immutable audit retain attempts on the stable pair;
this is not a separate mutable attempt table or a multi-event identity migration.

Content policy is [ADR-019](019-m2-authored-content.md). UI-ready application/status
screens and human/browser review remain P4/P5; this decision alone delivers none.

Localized contract examples (ET / EN / RU) live in Registration catalogue keys:
pending is Ootel / Pending / На рассмотрении; the structured
nextActor selects organizerNext/applicantNext, never an authorization grant.
CONTACT_ORGANIZER selects contactOrganizer; changing locale changes the interface
copy without changing the saved status/reason, authored names or resource IDs.
