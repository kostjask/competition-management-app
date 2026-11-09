# Invitation contracts

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

GET/POST /api/v1/invitations are authenticated admin operations. GET
/api/v1/invitations/:token is public. POST /api/v1/invitations/accept permits
unauthenticated new-account setup; existing recipients must authenticate as the
intended active, verified account. Any supplied Authorization header or browser session cookie is validated;
ambiguous credentials are rejected. Cookie mutations require Origin/CSRF proof.
Create accepts strict email, roleKey (judge/moderator), required eventId and
optional recipient locale (et/en/ru). Locale resolves explicit value, existing
recipient account preference, then et; never the inviter's UI. Email follows the shared
ASCII-space trimming/lowercasing policy in [ADR-009](../adr/009-email-identity.md),
also used by account registration and login. The role and supplied event
must exist; submitted audit/token fields are rejected. The create response is
message/messageId (invitationCreated)/invitationId/delivery (unconfirmed); no raw token is returned. List
DTOs expose only id, email, roleKey, nullable eventId, UTC createdAt/expiresAt and
nullable UTC usedAt/revokedAt/supersededAt and status. Inspect exposes email/roleKey, nullable event id/name, UTC
expiry, status and accountExists. Known terminal links can be inspected but cannot
be accepted; unknown/rotated digests return 404. Storage digests, creators and unrestricted relations are excluded.
Only purpose-bound SHA-256 digests are persisted, with seven-day issuance expiry.

Accept takes either `{ token }` for an authenticated existing recipient, or
`{ token, name, password }` for new-account setup. New names/passwords follow the
shared registration validation, including the bcrypt UTF-8 byte limit. Extra fields
and incomplete setup pairs are rejected. Existing recipients may send the setup
shape, but its name/password never modify the account or prove identity.
New-account success returns accountCreated=true, a validated native bearer or
negotiated token-free browser cookie session (see [auth](auth.md)),
explicit user identity, message and invitationAccepted messageId. Existing-account
success returns accountCreated=false, user/message/messageId and no token/tokenType;
the client retains its current session. Browser acceptance never stores a bearer
token. Both return 201.
No session returns 401 for an active existing recipient; a different eligible
account (including an admin) returns 403. Invalid, stale, inactive or unverified
sessions return 401. A signed-in unrelated account cannot create the invitee.
Account identity, eligibility and session revision are rechecked and locked in
the serializable acceptance transaction. Existing password/name/verification,
locale, session revision and unrelated assignments remain unchanged, including
for passwordless accounts. Only newly created accounts receive verified setup.
Lookups/role assignment/consumption are serializable and use typed null-aware
predicates, avoiding Prisma nullable-compound assertions. Missing records return
404; accepting used/expired invitations and creating an already-assigned role return 400; active
invitation/constraint/serialization conflicts return 409. Missing role failures
roll back without creating accounts or consuming invitations. One outstanding
invitation per canonical email/role/scope is enforced in PostgreSQL, including global
scope. Creating a replacement for an expired link atomically sets the old row's
internal supersededAt timestamp and retains its history. Used/superseded rows do
not block new invitations; accepting superseded links returns invitationExpired.
Unclassified historical scope remains uninspectable. Public status/commands follow below.
Acceptance claims the matching digest, expiry and nonrevoked pending state in
the same transaction as access writes. Inactive invitees return 403 without
consumption, activation, credential changes, access writes or a session.
Old plaintext links are invalidated by migration; legacy rows retain their
recipient/scope/history with null digests. See [ADR-010](../adr/010-identity-token-lifecycle.md).
Event deletion is restricted while roles or invitations reference it, preserving
scope and history; no event-delete endpoint is introduced. See
[ADR-008](../adr/008-event-scope-integrity.md) for indexes and deployment preflight.

ADR-013 adds restrictive Role and studio/event composite references. New bound
invitations require supported role scope; representative invitations need matching
studio/event scope and remain unavailable in staff creation until P5-MEMBERS.
Historical unclassified rows are preserved but cannot be accepted or rotated.
Global/admin invitations are rejected; removed assignments need reviewed restoration.
Acceptance enforces intended-account authentication and writes USER-attributed
access/acceptance audit records in the same transaction. Failed access, consumption
or audit writes roll back the entire acceptance. Judge invitations now reconcile a
missing Judge in the same event using the account name; existing Judge IDs and
profile fields are preserved. Moderator acceptance creates no Judge. Removed
assignments return 409 and cannot be restored through acceptance.
The silent development email fake does not deliver or log links. Real email is
queued encrypted inside the creation transaction, with bounded retries and provider
idempotency under ADR-014. Unavailable delivery rolls back creation. Staging delivery
and hosted rollout remain release gates. This contract slice
does not authorize external onboarding.

## Pending invitation commands

Global-admin-only POST /invitations/:invitationId/resend and /revoke accept the
strict body {expiresAt: ISO UTC}, copied from the displayed list row. No role,
event, email or locale can be changed by these commands. Missing ID returns 404;
stale expiry, accepted, expired or superseded state returns 409 with no writes.
Resend rotates the digest/expiry and appends INVITATION_ROTATED plus transactional
mail intent; the prior raw link stops resolving. Success is
{invitationId,messageId:"invitationResent",delivery:"unconfirmed"}. It preserves
recipient locale. Revoke appends INVITATION_REVOKED and marks revokedAt and
supersededAt to release the pending unique slot; success is
{invitationId,messageId:"invitationRevoked"}. An identical revoke retry is harmless.
Neither command removes accepted access. Refresh before retrying a stale command;
expired invitations use explicit replacement creation with retained history.

Status precedence is ACCEPTED, REVOKED, SUPERSEDED, EXPIRED, PENDING; revocation
wins when both terminal timestamps exist. Public previews do not expose inactive
account flags, digests, tokens or creators. Acceptance still enforces identity,
current eligibility and event scope independently. The web uses
/auth/accept-invitation, signs existing users in place, offers explicit account
switching, strips link secrets and requires explicit acceptance. Accepted-access
removal is a separate global-admin operation described below.

## Accepted staff removal

POST /events/:eventId/staff/:assignmentId/remove requires active global admin and
strict empty JSON body {}. The stored event judge/moderator assignment determines
the target. Missing/wrong-event IDs return 404; unsupported role scope returns 403;
extra fields return 400. Success/repeated removal returns 204. The serializable
transaction retains UserRole with removedAt and appends exactly one ACCESS_REMOVED
audit; failure rolls back both. Concurrency conflicts return 409; retry is safe.
Judge, Score, accepted invitations and unrelated role/event access remain intact.
Current profile/permissions ignore removed assignments immediately. Pending revoke
never substitutes for offboarding. Staff UI is now implemented locally under
P4-STAFF. Restoration remains unavailable and requires separately reviewed scope.
See [ADR-018](../adr/018-staff-acceptance-and-offboarding.md).

## Event staff overview

GET /events/:eventId/staff requires an eligible active global administrator.
Missing events return 404; scoped admins, roleless users and event staff return
403, guests/ineligible accounts 401. The backend ignores caller-supplied user or
studio query selectors and always scopes every relation to the path event.
The strict StaffOverview DTO contains event {id,name}, invitations (the existing
secret-free Invitation DTO) and assignments. Only bound judge/moderator invitations
with no studio are listed; historical unclassified/global/representative records
are retained but excluded from this staff-specific view.

Each assignment has id, user {id,name,email}, roleKey (judge/moderator), nullable
UTC removedAt and status. Status precedence: REMOVED, ACCOUNT_UNAVAILABLE
(inactive or unverified), JUDGE_MISSING (judge role with no same-event Judge),
ACTIVE. Removed assignments and terminal invitation history remain visible.
An accepted invitation without an assignment does not invent access. ACTIVE means
eligible event access, never scoring readiness; scoring assignment is separate.
A repeatable-read transaction keeps the event/invitation/assignment view consistent.
No token digest, credential, session revision, account flags, score values or
unrestricted relation is serialized. This read makes no repairs or grants.

The event page is /admin/events/:eventId/staff, linked from event details and
/admin/invitations. It fixes the event when creating judge/moderator invitations,
uses the canonical existing create/resend/revoke/remove operations and shows
accepted history separately from current access. Native modal confirmation names
the event and person/role, defaults to Cancel, traps keyboard focus, blocks unsafe
closure while pending and restores focus to the trigger or refresh control.
Failed/uncertain actions preserve input and disable writes until explicit status
refresh; no create/remove is automatically repeated. Acknowledged mutations remain
acknowledged even if the subsequent overview read fails. Account session recovery
preserves the mounted form and requires explicit overview reload before more writes.
