# ADR-011: Public account recovery and session revision

Date: 2026-10-25

Status: Accepted technical policy for P2-AUTH-RECOVERY; real delivery/UI remain gated.

Expose four canonical POST operations: /auth/resend-verification,
/auth/correct-email, /auth/request-password-reset and /auth/reset-password.
Request bodies are strict shared schemas; clients infer types from them.

The first three return the identical 202 response with authRequestAccepted and
delivery: unconfirmed for unknown, ineligible, wrong-credential, conflicting and
eligible requests. This acknowledges a request, never delivery or account existence.
Do not return account IDs, secrets or eligibility flags. A globally unavailable
adapter returns the same 503 for every valid request, before account lookup.
Transient send failure rolls back the transaction and logs only a fixed diagnostic;
the response remains unconfirmed. This avoids an eligible-only delivery error
becoming an account-existence oracle. A separate sent/failed response would be
more specific but would disclose account existence; uniform acknowledgement is
the chosen policy. It is not a delivery receipt or promise of background retry.

Resend applies only to active unverified accounts. Correction additionally proves
the current password, updates only the same unverified account's canonical email
and creates a verification token bound to the new email, without changing IDs,
contact snapshots, invitations, roles or ownership. Already verified, inactive,
passwordless, wrong-password and colliding destinations are unchanged. Only the
new address receives verification; the operation never verifies or issues a session.
Reset requests apply only to active verified accounts; consuming the purpose-bound
token atomically changes the password, consumes the link and revokes outstanding
account tokens. Reset returns passwordReset, without a session or activation.
New registration/reset passwords retain the eight-character minimum and are
bounded to 72 UTF-8 bytes to prevent bcrypt truncation. Login continues to accept
existing credentials; no stored password is rewritten by this validation change.

Use existing ADR-010 serializable account locks and digest rotation. The delivery
call occurs inside the request transaction so a failed send preserves old links,
email and token state. A delivery can succeed before a commit later fails: that
link is invalid and the acknowledgement remains unconfirmed. Clients may retry;
only the committed current token can work. P2-EMAIL must settle provider
idempotency/durable retry before external release; no distributed atomic delivery
or outbox is claimed. The silent development fake and injected test adapters make
this backend scope reviewable without inventing a provider or storing raw secrets.

Add nonnegative User.sessionVersion, default zero. JWTs carry that version and
protected requests match the current value before loading roles. Successful reset
and pending email correction increment it atomically. Old versions and legacy
JWTs without a version fail closed and require sign-in; no compatibility fallback.
This minimal credential revocation is needed for safe public password reset.
Cookie/localStorage, return URLs and broader session design remain P2-SESSION.
The migration changes no IDs, credentials, ownership or domain rows; old sessions
are intentionally invalidated by the coordinated API rollout. A reviewed rollback
must not restore acceptance of legacy/revoked sessions.

All four endpoints share a bounded process-local IP window using centralized rate
limit configuration, 429 with Retry-After and semantic feedback. Express proxy
trust remains false; forwarded IP headers do not select the bucket. Multi-instance
shared limits, trusted-proxy deployment and other auth/invite/upload limits remain
P2-BOUNDARIES. This limiter is not an external-release or distributed-abuse claim.
