# Authentication contract

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

Public mutations are `POST /api/v1/auth/register`, `/auth/login`, and
`/auth/verify-email`. Bodies reject unknown fields. Registration requires a
valid `email`, a password of at least eight characters, and a trimmed name of
at least two characters. Login requires email and nonempty password; verification
requires a nonempty token. Account/invitation email inputs strip surrounding ASCII
spaces and lowercase ASCII letters before validation. Dots and plus tags remain
significant; non-ASCII addresses are rejected. See [ADR-009](../adr/009-email-identity.md).
Invalid input returns the standard 400 envelope with `details.fields`.

Registration returns 201 with `message`, `messageId: "registered"` and `userId`,
without a session.
An existing email or a database uniqueness race returns 409 `CONFLICT`.
Login returns 200 with `token`, literal `tokenType: "Bearer"`, and `user`
containing only `id`, `email`, and `name`. Verification returns the same
session plus `message` and `messageId: "emailVerified"`, after atomically consuming
the purpose-bound digest token and verifying the account in one transaction.
Verification tokens expire in 24 hours. Unknown, expired, revoked, wrong-purpose
and replayed tokens return 404; inactive, changed-email or already-verified
accounts return 403 without consuming a live token. Concurrent losers may return
409; only one request can verify and receive a session. Bad credentials return
401 and disabled login returns 403. The frontend
validates each complete response before saving a returned session token.

`GET /api/v1/auth/profile` requires a bearer session and always selects the
caller, ignoring any attempted user selector in query parameters. It returns
`id`, `email`, `name`, ISO UTC `createdAt`, `isAdmin`, and `roles`.
Each role assignment contains only `id`, nullable `eventId`,
`role: { id, key, name }`, and nullable `event: { id, name }`.
Null event scope represents existing global assignments; event-specific IDs are
preserved. Roleless accounts receive an empty array. Assignments sort by ID.
Profiles exclude passwords, verification tokens, private paths, role descriptions,
permission relations, and redundant user/role foreign keys. A missing caller
record returns 404. Role keys/scopes are now available; frontend role-guard
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
without granting access, reactivation or a new session. These are not public
resend/recovery endpoints. See [ADR-010](../adr/010-identity-token-lifecycle.md).

Migration invalidates old links and removes plaintext columns, preserving accounts
and ownership. The development email fake is silent; production delivery throws
unavailable, producing the standard private 500 instead of a false success.
Accounts/tokens can already be persisted when delivery fails; retry/recovery and
truthful delivered UI/provider contracts remain P2-AUTH/EMAIL work.

Signup eligibility, active-account protected-request checks, safe return
destinations, public resend/email correction/password recovery and secure email
delivery remain open. Login still permits unverified active users. Existing JWTs
are not invalidated by password recovery; session lifecycle remains P2-SESSION.
These gaps prevent external onboarding release.
