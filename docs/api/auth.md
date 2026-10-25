# Authentication contract

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

Public mutations are `POST /api/v1/auth/register`, `/auth/login`, and
`/auth/verify-email`. Bodies reject unknown fields. Registration requires a
valid `email`, a password of at least eight characters, and a trimmed name of
at least two characters. Login requires email and nonempty password; verification
requires a nonempty token. Email case/canonicalization semantics are unchanged.
Invalid input returns the standard 400 envelope with `details.fields`.

Registration returns 201 with `message`, `messageId: "registered"` and `userId`,
without a session.
An existing email or a database uniqueness race returns 409 `CONFLICT`.
Login returns 200 with `token`, literal `tokenType: "Bearer"`, and `user`
containing only `id`, `email`, and `name`. Verification returns the same
session plus `message` and `messageId: "emailVerified"`, after clearing the stored
verification token.
Bad credentials return 401, disabled login returns 403, unknown verification
tokens return 404, and already-verified token records return 403. The frontend
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

This contract slice does not implement signup eligibility, email canonicalization,
verification expiry/atomic consumption, active-account request checks, secure
email delivery, safe return destinations, or password recovery. Current login
still permits unverified active users, and verification still signs a session
without checking active status. These known security/workflow gaps remain in
Phase 2; DTO completion does not authorize external onboarding release.
