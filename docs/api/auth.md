# Authentication contract

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

Public mutations include `POST /api/v1/auth/register`, `/auth/login`,
`/auth/verify-email` and the recovery operations below. Bodies reject unknown fields. Registration requires a
valid `email`, a password of at least eight characters and at most 72 UTF-8 bytes, and a trimmed name of
at least two characters, with optional locale et/en/ru persisted as recipient
preference (no browser inference). Registration also requires a strict `onboarding`
object: UUID `operationId`, `revision: 0`, nullable existing `intendedEventId`,
and `details` containing studioName (2-160), country (2-100), city (1-100),
directorName (2-160) and directorPhone (0-40 characters). No role/user selector is
accepted. Account, initial draft (revision 1), verification token, audit and delivery
intent commit atomically. Signup grants no studio, membership, application or role. Login requires email and nonempty password; verification
requires a nonempty token. Account/invitation email inputs strip surrounding ASCII
spaces and lowercase ASCII letters before validation. Dots and plus tags remain
significant; non-ASCII addresses are rejected. See [ADR-009](../adr/009-email-identity.md).
Invalid input returns the standard 400 envelope with `details.fields`.

Registration returns 201 with `message`, `messageId: "registered"`, `userId`
and `delivery: "unconfirmed"`,
without a session.
An exact original retry with current password proof, matching operation/details/name/locale
and unchanged active draft returns the original acknowledgement without duplicate mail.
Other existing emails/changed drafts and uniqueness races return 409 `CONFLICT`.
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
Those failures do not mint sessions or mutate account state. The browser validates
its token-free session metadata, then refreshes profile before continuing.

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
`id`, `email`, `name`, ISO UTC `createdAt`, nullable `preferredLocale`, `isAdmin`, `roles`, and `permissions`.
Each role assignment contains only `id`, nullable `eventId`,
`role: { id, key, name }`, and nullable `event: { id, name }`.
Only active assignments are included. Null event scope represents existing global
assignments; event-specific IDs are preserved. Roleless accounts receive empty
roles and permissions arrays. Assignments sort by ID. Resolved permissions contain
`{ eventId: string | null, keys: string[] }` with sorted operation keys, from the same
request authorization used by the backend. Scoped admin/global staff rows confer
no permissions; only isAdmin grants the global bypass. Admin permissions may be
empty because isAdmin is authoritative. Assignment removal takes effect on the
next profile request. Refresh the profile to reconcile client presentation; every
backend request still rechecks authorization independently.
Profiles exclude passwords, verification tokens, private paths, role descriptions,
permission relations, and redundant user/role foreign keys. A missing caller
record fails at authentication with 401. Frontend gates use exact keys, resolved
permissions and event scope; display names never authorize.

Auth success DTOs validate on both server and client. The shared error contract
uses the global [semantic envelope](../ERROR_HANDLING.md), including reason, params
and structured issues alongside legacy diagnostics; the handler uses its inferred type. The web client parses
that envelope and retains server messages/details, including disabled-account
403s, with safe fallback handling for legacy/unknown error descriptors. Existing 401
session-clearing/redirect behavior is unchanged. JWT expiry uses validated
compact durations documented in [environment configuration](../ENVIRONMENT_CONFIGURATION.md).

Registration atomically creates its account, owner draft and initial verification digest;
raw secrets are passed only to the delivery adapter. AccountToken records retain
consumed/revoked history and bind the immutable account ID and issuance email.
Internal rotation/recovery helpers implement one outstanding token per purpose,
one-hour recovery expiry and atomic password change for active verified accounts,
without granting access, reactivation or a new session. Public operations now use
these primitives under [ADR-011](../adr/011-public-account-recovery.md).

## Browser sessions and logout

[ADR-016](../adr/016-browser-sessions-and-safe-return.md) defines the threat model.
Login, verification and new-account invitation acceptance negotiate browser mode
with X-Session-Transport: cookie. Responses replace token/tokenType with
session: cookie and ISO expiresAt, retaining the explicit user and operation
message fields. No browser JWT enters JSON or Web Storage. The host-only HttpOnly
cookie is dance_session in development/test and __Host-dance_session in production;
it uses Path=/, SameSite=Lax, Secure in production and a fixed one-hour expiry.
Bearer API clients omit the header and retain their existing explicit token DTO.
Cookie JWTs cannot authenticate as bearer tokens or vice versa; ambiguous credentials
fail closed. Supplied invitation cookies receive the same identity/eligibility checks.

Every unsafe cookie request, including login, requires an exact configured Origin
and X-CSRF-Protection: 1. Credentialed CORS is limited to exact allowed origins;
wildcard development configuration cannot support browser sessions. Browser requests
use credentials: include, including canonical private images and multipart uploads.
No Origin is required for native bearer requests. HTTPS/same-site browser/API or
same-origin ingress is required in production; do not weaken Secure for rehearsal.

POST /auth/logout is authenticated, accepts an empty body/object only, and returns
204 after atomically incrementing only the caller's sessionVersion and appending
SESSION_REVOKED audit. It revokes all account sessions without changing credentials,
roles, membership or other accounts. Its cookie is cleared only after commit.
An audit/domain failure rolls back both changes. Concurrent/stale requests fail at
401 and do not duplicate audit. Failed offline logout never claims revocation.

Bootstrap always reads profile. A 401 pauses an already mounted browser view behind
an inert reauthentication dialog instead of navigating away or replaying writes.
Recovery locks the prior account email; switching account requires explicit logout
and confirmation of lost unsaved work. Other tabs receive nonsecret BroadcastChannel
notifications and recheck or pause; server revision checks are authoritative on every
device. Browsers without BroadcastChannel reconcile on their next protected request.
Passwords/private work are not persisted. Reload recovers only already saved work.

Return destinations use the shared implemented-route allowlist. Only canonical
relative paths without query/hash/escapes/credentials are accepted; unsupported or
external values fall back to /. Login uses a validated returnTo query rather than
unchecked router state. Verification removes its secret from the visible URL before
an explicit Verify action and offers a deliberate Continue; missing device context
falls back to /. Signed-in users must explicitly sign out before verifying a different
account. Full recovery/signup/invitation UI and real email remain their existing gates.

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
not change the bucket. Other auth, invitation and upload operations now have
separate configured buckets; login defaults to 20 per window. See
[boundary configuration](../ENVIRONMENT_CONFIGURATION.md). Distributed/ingress
limits remain deployment work; these defaults do not authorize external release.

Migration invalidates old links and removes plaintext columns, preserving accounts
and ownership. The development email fake is silent; production delivery throws
unavailable, producing the standard private 500 instead of a false success.
Transactional queue/domain changes commit atomically; provider retries remain
explicitly unconfirmed. Recovery uses the rollback semantics above; truthful delivered UI/provider
contracts and real email remain P2-UI-AUTH/EMAIL work.

DEV_AUTH is restricted to NODE_ENV=development and resolves DEV_AUTH_EMAIL to a
persisted active/verified account with its actual database roles. It grants no
synthetic admin identity or permissions. See [configuration](../ENVIRONMENT_CONFIGURATION.md).

Signup eligibility, full auth UI and real email delivery remain open. Browser
cookie storage/expiry, audited logout and safe return handling are implemented
locally under P2-SESSION.
These gaps prevent external onboarding release.

## Owner-proven onboarding

[ADR-017](../adr/017-public-onboarding-and-invitation-lifecycle.md) supplies three
canonical POST operations: /auth/onboarding/read, /save, /cancel. Every request
uses either strict email/password proof or an eligible verified session. Read
accepts proof or {}; save accepts proof plus draft, or {draft}; cancel accepts
proof plus revision, or {revision}. Draft is the shared OnboardingSaveSchema:
UUID operationId, nonnegative integer revision, nullable existing intendedEventId,
and the five bounded details strings (partial empty strings allowed after signup).
No owner ID can be supplied. Password proof grants no ordinary session and cannot
read other accounts. Wrong/inactive proof returns 401; session eligibility still
requires active/verified/current revision. The dedicated IP limit uses the login
request allowance and runs before parsing/bcrypt.

All return 200 with {email,emailVerified,returnTo,draft}; draft is null or
{id,status,revision,intendedEventId,details,updatedAt}. returnTo is allowlisted and
updatedAt is ISO UTC. Save uses optimistic revision plus operation UUID; exact
retries return stored state, conflicting/stale operations return 409. Cancellation
increments revision and retains account/history; it never deletes or reopens a
terminal draft. Verified reads preserve prior progress. Read/write identity checks,
revision changes and ONBOARDING_SAVED/CANCELLED audit commit serializably.
P5-APPLICATION now consumes exact verified owner drafts through the registration
POST and marks them COMPLETED atomically; [the application contract](registrations.md)
owns this separate domain operation. The onboarding editor's Continue opens the
draft's exact event application or `/applications` for saved status/event selection.

## Account language preference

POST /auth/preferences requires an eligible session and strict body
{preferredLocale: "et" | "en" | "ru" | null}. It updates only the caller with a
current active/verified/session-revision predicate and returns the same validated
object (200). Unsupported locales/extra selectors return 400; missing/ineligible
sessions return 401. Cookie requests require normal Origin/CSRF protection.
Null clears the account preference; deterministic email fallback is et. Concurrent
saves use last committed write for the same account, with no cross-account effects.
No credential, role, invitation locale or global server language changes occur.
The profile includes the stored nullable preference. No migration is needed.
