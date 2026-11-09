# ADR-018: Atomic staff acceptance and retained offboarding

Status: accepted, 2026-11-06. Implements P2-JUDGE-ACCEPT/P2-OFFBOARD under ADR-013.

Judge invitation acceptance creates the missing Judge for the recipient/event,
using the account name as its initial display name. Existing Judge IDs, profile
fields and scores remain unchanged. Moderator acceptance creates no Judge.
Judge reconciliation, active UserRole, invitation consumption and USER audit
commit in the existing serializable transaction. ACCESS_RECONCILED records a
missing Judge repair against the assignment; a role alone is not readiness.
Removed access cannot be restored by invitation acceptance.

Global admins remove an event judge/moderator assignment through
POST /events/:eventId/staff/:assignmentId/remove with an empty strict body.
The stored assignment determines user/role/scope. Unsupported/global assignments
are refused. Missing or wrong-event assignments return 404. Removal retains the
assignment, Judge, scores, invitations and other event/role access. An identical
retry succeeds without another audit. ACCESS_REMOVED and removedAt commit
atomically; concurrent serialization conflicts return 409 and can be retried.
Pending invitation revocation remains a separate operation. Staff management UI
is now implemented locally under P4-STAFF. Restoration remains unavailable and
requires separate reviewed scope.

P4-STAFF adds global-admin-only GET /events/:eventId/staff using a consistent
repeatable-read snapshot and explicit minimal DTOs. It reports supported bound
invitations separately from event judge/moderator assignments, retaining removed
access and terminal history. Removed, unavailable-account and missing-Judge states
do not imply readiness. Unclassified/global/studio rows are excluded without
repair. The event UI uses existing mutations with explicit refresh after failure,
retained local inputs/receipts and confirmed history-preserving removal.
No schema migration or database reset is required.
