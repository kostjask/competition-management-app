# ADR-017: Public studio intent and invitation lifecycle

Accepted 2026-11-05 for P2-SIGNUP/INVITE/UI-AUTH, extending ADR-010/013/016.

Require complete studio-intent details (phone optional), an operation UUID,
revision zero and optional existing intended-event ID on public registration.
Create the account, owner draft, token, audit and transactional delivery intent
atomically. This is declared studio intent, not business approval: no studio,
membership, application or role is created. Generic credential-only signup fails.

An identical lost-response retry may return the original acknowledgement only
after current password proof and an exact initial draft/name/locale match. A
different operation/content, inactive identity or later edited/terminal draft
conflicts without overwriting anything. Concurrent losers can retry a conflict;
unique email/owner constraints prevent duplicate accounts/drafts. Existing users
are not merged, deleted, reactivated or populated with invented drafts.

Pending progress uses password proof on each canonical read/save/cancel request.
This avoids adding another transferable pending token/cookie; a new tab/device
can recover by proving the same account again. Passwords stay only in component
memory and are never persisted, logged or echoed. The transaction rechecks and
locks the current email/password/revision/active account after bcrypt proof.
Only that owner's draft is reachable; supplied user IDs are rejected. Verified
owners may instead use their current eligible session on the same operations,
without gaining unrelated privileges. Unverified
users still cannot use ordinary protected APIs. Revision/operation retries and
retained cancellation follow ADR-013; completion/application remains P5.

Invitation management remains global-admin-only, for bound event judge/moderator
invitations. Resend rotates a live pending digest and queues mail in the same
transaction. Resend/revoke commands carry the displayed expiry as a compare-and-
swap precondition; stale/lost-response retries conflict rather than silently
rotating again. Refresh status to reconcile. Expired links require explicit
replacement creation; accepted access cannot be removed by revoking its invitation.

Status is accepted, revoked, superseded, expired, pending. Revoked precedes
superseded because revocation sets both timestamps to free the outstanding slot;
replacement-only rows remain superseded. This corrects the projection without
rewriting history. Token-proven inspection may show terminal state and whether
an intended account exists, but no inactive-account flag, digest or raw token.
Existing acceptance still requires the intended eligible session and never
changes credentials. New setup alone receives a session. Judge reconciliation
and accepted-access offboarding are separate tasks now implemented locally under
[ADR-018](018-staff-acceptance-and-offboarding.md); invitation status alone is
never implied readiness.

UI link secrets are removed from visible URLs and retained only in page memory.
Acceptance is deliberate, with new/existing/wrong-account states, sign-in in place
and explicit logout to switch. Reloading a stripped link requires reopening the
email; raw tokens/passwords are not stored for convenience. Recovery remains
enumeration-neutral/delivery-unconfirmed under ADR-011. Safe event returns come
from the validated server draft or shared route allowlist; no intent grants access.

Only the audit action allowlist needs a forward migration. Preserve domain and
immutable audit history on rollout/rollback; do not revert allowed actions by
deleting history. Deploy API/shared/browser together. Real inbox delivery, hosted
provenance/operations and fluent-language/screen-reader review remain release gates.
