# Invitation contracts

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

GET/POST /api/v1/invitations are authenticated admin operations. GET
/api/v1/invitations/:token and POST /api/v1/invitations/accept remain public.
Create accepts strict email/roleKey/optional eventId. The role and supplied event
must exist; submitted audit/token fields are rejected. The create response is
message/messageId (invitationSent)/invitationId; no raw token is returned. List
DTOs expose only id, email, roleKey, nullable eventId, UTC createdAt/expiresAt and
nullable UTC usedAt. Inspect exposes email/roleKey, nullable event id/name and UTC
expiry. Storage tokens, creators and unrestricted relations are excluded.

Accept requires token, trimmed name and password. It returns a validated bearer
session with explicit user identity, message and invitationAccepted messageId.
Lookups/role assignment/consumption are serializable and use typed null-aware
predicates, avoiding Prisma nullable-compound assertions. Missing records return
404, used/expired invitations and an already-assigned role return 400, active
invitation/constraint/serialization conflicts return 409. Missing role failures
roll back without creating accounts or consuming invitations. One outstanding
invitation per exact email/role/scope is enforced in PostgreSQL, including global
scope. Creating a replacement for an expired link atomically sets the old row's
internal supersededAt timestamp and retains its history. Used/superseded rows do
not block new invitations; superseded links return invitationExpired. The public
DTOs are unchanged. Resend/revoke APIs and the broader lifecycle remain Phase 2.
Event deletion is restricted while roles or invitations reference it, preserving
scope and history; no event-delete endpoint is introduced. See
[ADR-008](../adr/008-event-scope-integrity.md) for indexes and deployment preflight.

Scope remains optional, including global scope, and role existence is not an
assignable-role policy. Existing-account acceptance still lacks intended-account
authentication/eligibility enforcement. No Judge record is created automatically.
Plaintext persistence, stub logging/delivery, token digests, safe existing-account
acceptance, mandatory staff scope and atomic Judge reconciliation remain Phase 2
release gates. This contract slice does not authorize external onboarding.
