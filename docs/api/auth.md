# Authentication contract

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

Public mutations include `POST /api/v1/auth/register`, `/auth/login`,
`/auth/verify-email` and the recovery operations below. Bodies reject unknown fields. Registration requires a
valid `email`, a password of at least eight characters and at most 72 UTF-8 bytes, and a trimmed name of
at least two characters, with optional locale et/en/ru persisted as recipient
preference (no browser inference). Login requires email and nonempty password; verification
requires a nonempty token. Account/invitation email inputs strip surrounding ASCII
spaces and lowercase ASCII letters before validation. Dots and plus tags remain
significant; non-ASCII addresses are rejected. See [ADR-009](../adr/009-email-identity.md).
Invalid input returns the standard 400 envelope with `details.fields`.

Registration returns 201 with `message`, `messageId: "registered"`, `userId`
and `delivery: "unconfirmed"`,
without a session.
An existing email or a database uniqueness race returns 409 `CONFLICT`.
Login requires correct credentials plus an active, verified account and returns
200 with `token`, literal `tokenType: "Bearer"`, and `user`
containing only `id`, `email`, and `name`. Verification returns the same
session plus `message` and `messageId: "emailVerified"`, after atomically consuming
the purpose-bound digest token and verifying the account in one transaction.
Verification tokens expire in 24 hours. Unknown, expired, revoked, wrong-purpose
and replayed tokens return 404; inactive, changed-email or already-verified
accounts return 403 without consuming a live token. Concurrent losers may return
409; only one request can verify and receive a session. Bad credentials return
401; disabled login returns 403 `accountDisabled`, and unverified login with
correct credentials returns 403 `emailVerificationRequired` (ET/EN/RU).
Those failures do not mint sessions or mutate account state. The frontend
validates each complete response before saving a returned session token.

Every protected operation rechecks that the bearer subject still exists, is
active, verified and has the JWT's current integer sessionVersion before loading
roles/admin permissions. Missing, disabled
or unverified accounts return 401 `authenticationRequired`, invalidating a stale
client session. Previously issued JWTs therefore stop working on the next request
after disabling/removing/unverifying the account or a password reset. Legacy JWTs
without sessionVersion fail at 401 and require sign-in. Resource permissions and scope
remain separate; a verified roleless user is eligible but gains no new privilege.

`GET /api/v1/auth/profile` requires an eligible session and always selects the
caller, ignoring any attempted user selector in query parameters. It returns
`id`, `email`, `name`, ISO UTC `createdAt`, `isAdmin`, and `roles`.
Each role assignment contains only `id`, nullable `eventId`,
`role: { id, key, name }`, and nullable `event: { id, name }`.
Null event scope represents existing global assignments; event-specific IDs are
preserved. Roleless accounts receive an empty array. Assignments sort by ID.
Profiles exclude passwords, verification tokens, private paths, role descriptions,
permission relations, and redundant user/role foreign keys. A missing caller
record fails at authentication with 401. Role keys/scopes are now available; frontend role-guard
unification remains P2-ROLES.

Auth success DTOs validate on both server and client. The shared error contract
uses the global [semantic envelope](../ERROR_HANDLING.md), including reason, params
and structured issues alongside legacy diagnostics; the handler uses its inferred type. The web client parses
that envelope and retains server messages/details, including disabled-account
403s, with safe fallback handling for legacy/unknown error descriptors. Existing 401
session-clearing/redirect behavior is unchanged. JWT expiry uses validated
compact durations documented in [environment configuration](../ENVIRONMENT_CONFIGURATION.md).

Registration atomically creates its account and initial verification digest;
raw secrets are passed only to the delivery adapter. AccountToken records retain
consumed/revoked history and bind the immutable account ID and issuance email.
Internal rotation/recovery helpers implement one outstanding token per purpose,
one-hour recovery expiry and atomic password change for active verified accounts,
without granting access, reactivation or a new session. Public operations now use
these primitives under [ADR-011](../adr/011-public-account-recovery.md).

## Public recovery operations

All paths below are relative to /api/v1; bodies are strict shared schemas.

| POST path | Body | Eligible mutation |
| --- | --- | --- |
| /auth/resend-verification | email | Active unverified user: rotate verification link |
| /auth/correct-email | email, password, newEmail | Same active unverified account with correct current password: update canonical email, increment sessionVersion and rotate verification link |
| /auth/request-password-reset | email | Active verified account: rotate one-hour recovery link |
| /auth/reset-password | token, password | Consume live recovery link and atomically update password, increment sessionVersion and revoke outstanding account tokens |

The first three return 202 with exactly
`{ "messageId": "authRequestAccepted", "delivery": "unconfirmed" }`.
Unknown, inactive, already verified/pending-ineligible, wrong-password and
destination-collision outcomes share that acknowledgement. It contains no user ID,
token or eligibility/delivery result. No account is created, merged, reactivated,
verified or granted roles. Correction preserves membership/contact snapshots and
invitation scope. Returning the old email after a committed correction is a harmless
neutral retry. Successive resends rotate links; only the current committed link works.

Unavailable delivery returns uniform 503 authDeliveryUnavailable before account
lookup. Real delivery queues encrypted payloads in the same transaction as the
token/email change. Provider failure leaves a committed retryable intent; the
worker uses the same idempotency key, cancels invalid/expired links and stops within
23 hours. The silent fake does not send. Injected synchronous failure fixtures
still prove rollback of rotation/email changes; those fixture semantics are not
a claim of atomic external mail delivery. See [ADR-014](../adr/014-transactional-email-dispatch.md).
No acknowledgement promises inbox delivery. Real staging delivery and complete
verification/recovery/session UI remain release gates.

Reset returns 200 with exactly `{ "messageId": "passwordReset" }`, without a
session. Password uses registration's eight-character/72-UTF-8-byte bounds; login
continues to support existing credentials. Expired/revoked/wrong-purpose/used
tokens return 404, inactive/changed-email/invalid-eligibility accounts 403, and
concurrent consumption losers may receive 409. Failure preserves credentials,
token state and sessionVersion. Sign in with the new password after success;
all older JWT revisions fail. Client helpers decode these DTOs and clear a stored
session after successful reset; no new auth screen is delivered by this slice.

All four operations share configured per-IP process-local throttling: default
100 requests per 15 minutes, including invalid input. Excess requests return 429
tooManyRequests plus Retry-After. Proxy trust is false and forwarded headers do
not change the bucket. Distributed limits and other auth/invite/upload endpoints
remain P2-BOUNDARIES; these defaults do not authorize external release.

Migration invalidates old links and removes plaintext columns, preserving accounts
and ownership. The development email fake is silent; production delivery throws
unavailable, producing the standard private 500 instead of a false success.
Initial registration/invitation writes can already be persisted when delivery
fails. Recovery uses the rollback semantics above; truthful delivered UI/provider
contracts and real email remain P2-UI-AUTH/EMAIL work.

DEV_AUTH is restricted to NODE_ENV=development and resolves DEV_AUTH_EMAIL to a
persisted active/verified account with its actual database roles. It grants no
synthetic admin identity or permissions. See [configuration](../ENVIRONMENT_CONFIGURATION.md).

Signup eligibility, safe return destinations, auth UI and secure email delivery
remain open. Credential-revision invalidation is implemented; broader session
storage/cookie/return handling remains P2-SESSION.
These gaps prevent external onboarding release.
