# Invitation contracts

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

GET/POST /api/v1/invitations are authenticated admin operations. GET
/api/v1/invitations/:token and POST /api/v1/invitations/accept remain public.
Create accepts strict email/roleKey/optional eventId. Email follows the shared
ASCII-space trimming/lowercasing policy in [ADR-009](../adr/009-email-identity.md),
also used by account registration and login. The role and supplied event
must exist; submitted audit/token fields are rejected. The create response is
message/messageId (invitationSent)/invitationId; no raw token is returned. List
DTOs expose only id, email, roleKey, nullable eventId, UTC createdAt/expiresAt and
nullable UTC usedAt. Inspect exposes email/roleKey, nullable event id/name and UTC
expiry. Storage digests, creators and unrestricted relations are excluded.
Only purpose-bound SHA-256 digests are persisted, with seven-day issuance expiry.

Accept requires token, trimmed name and password. It returns a validated bearer
session with explicit user identity, message and invitationAccepted messageId.
Lookups/role assignment/consumption are serializable and use typed null-aware
predicates, avoiding Prisma nullable-compound assertions. Missing records return
404, used/expired invitations and an already-assigned role return 400, active
invitation/constraint/serialization conflicts return 409. Missing role failures
roll back without creating accounts or consuming invitations. One outstanding
invitation per canonical email/role/scope is enforced in PostgreSQL, including global
scope. Creating a replacement for an expired link atomically sets the old row's
internal supersededAt timestamp and retains its history. Used/superseded rows do
not block new invitations; superseded links return invitationExpired. The public
DTOs are unchanged. Internal helpers atomically rotate a pending live invitation
digest or revoke/supersede its row; old raw links immediately stop working.
Public resend/revoke APIs and management authorization remain P2-INVITE.
Acceptance claims the matching digest, expiry and nonrevoked pending state in
the same transaction as access writes. Inactive invitees return 403 without
consumption, activation, credential changes, access writes or a session.
Old plaintext links are invalidated by migration; legacy rows retain their
recipient/scope/history with null digests. See [ADR-010](../adr/010-identity-token-lifecycle.md).
Event deletion is restricted while roles or invitations reference it, preserving
scope and history; no event-delete endpoint is introduced. See
[ADR-008](../adr/008-event-scope-integrity.md) for indexes and deployment preflight.

Scope remains optional, including global scope, and role existence is not an
assignable-role policy. Existing-account acceptance still lacks intended-account
authentication enforcement for active users. No Judge record is created automatically.
The silent development email fake does not deliver or log links; production throws
unavailable and returns a private 500, potentially after invitation persistence.
Real delivery/retry, safe existing-account acceptance, mandatory staff scope and
atomic Judge reconciliation remain Phase 2 release gates. This contract slice
does not authorize external onboarding.
