# ADR-006: Studio-focused signup and invitation-only staff onboarding

Date: 2026-10-24

Status: Accepted product direction; runtime implementation pending.

## Context

Public account registration currently accepts name, email, and password without
studio details or an invitation. It creates a roleless user. Studio membership
is created later through event application; event approval grants representative
roles. Login does not yet enforce email verification.

The application serves studio representatives, judges, and event staff. There is
no spectator-account use case. Requiring an approved representative role before
account creation would prevent legitimate first-time applicants from applying.
Changing navigation alone would leave the unrestricted registration API available.

Judge invitations currently assign a UserRole but do not create an event Judge
record. Judge CRUD creates the record separately without assigning the role.
Invitation event scope is optional, and acceptance requires name/password even
for an existing account. These operations do not form a complete staff journey.

## Decision

| Person | Entry path | Intended access |
| --- | --- | --- |
| New studio applicant | Studio-focused self-service onboarding | Own onboarding progress and pending applications; no approved representative privileges. |
| Approved representative | Organization and event approval under ADR-001 | Authorized studio/event management, subject to membership, permissions, and stage. |
| Additional representative | Invitation from an admin or an authorized studio representative | Explicit studio membership; event permissions still follow approval policy. |
| Judge | Admin invitation to a specific event | That event's judge role and matching Judge record; scoring assignments are separate. |
| Moderator/stage operator | Admin invitation to a specific event | That event's operational permissions. |
| Administrator | Controlled provisioning | Explicit administrative access; no public admin signup. |
| Spectator | No account | Published information/results only after public DTO/publication work. |

- Replace generic public signup as a product path with “Register your studio.”
  Backend registration must require a valid studio-onboarding context or use the
  appropriate invitation flow. A client-provided role or intent flag is not proof
  of eligibility and must not grant access.
- Pending applicants are a necessary account state, not a new privileged role.
  They must be able to verify/recover their account, resume onboarding, and inspect
  authorized applications without an assigned representative role. Creating an
  account must not imply organization or event approval.
- Define the onboarding request/draft contract and server validation before
  implementation: associate self-service account creation with recoverable studio
  application progress, prevent an unrestricted API bypass, and handle duplicate
  email, interrupted verification, cancellation, and retries. Do not require
  storing studio/application records before verification without an explicit
  persistence decision. Existing event-registration endpoints remain canonical.
- Do not automatically deactivate/delete existing roleless users or merge studio
  identities. Audit existing accounts and define recovery/retention policy before
  any cleanup. Legitimate pending applicants must retain access to their work.
- Staff roles cannot be selected during public signup. Require a valid event for
  judge/moderator invitations; general invitation forms must not offer global
  staff scope or admin self-promotion. Preserve controlled administrator provisioning.
- On judge invitation acceptance, create or reconcile the same-event Judge record
  and judge UserRole, and consume the invitation atomically. Failure must leave
  none of those operations partially applied. A Judge record alone grants no
  access; a role alone is not a complete judge assignment.
- Existing users authenticate as the invited account before accepting, without
  changing their password. New invited users establish credentials through the
  verified invitation flow. Wrong-account sessions may switch accounts; inactive
  accounts must not be silently reactivated. Repeated/concurrent acceptance must
  not duplicate roles, assignments, or credential changes.
- Provide invitation status, resend, expiry, revoke, and event-access removal.
  Revoking a pending invitation and removing accepted access are distinct actions.
  Preserve judge/score history when removing access; do not hard-delete scoring
  records as an offboarding mechanism. Do not return raw tokens in production DTOs.
- Use the existing `moderator` role for stage operation. “Manager” is not a defined
  role; organizer-level management needs a separate least-privilege permission
  decision before granting it. Moderator permission design must not reuse
  `score.submit` as a substitute for stage management.
- Additional representative invitations must bind an explicit authorized studio;
  contact email or a representative role alone cannot create ownership. Define
  who may invite and which event roles follow acceptance before enabling this.

## Delivery and verification

P2-AUTH eligibility decision (2026-10-25): credential login requires an existing,
active, email-verified account. Wrong credentials return 401; correct credentials
for an inactive or unverified account return translated 403 reasons. Every
protected request checks the current account before resolving roles, including
admin operations. Missing, inactive or unverified accounts invalidate existing
bearer sessions with 401 so clients clear stale credentials. Verified roleless
users remain eligible; resource permissions/ownership remain separate checks.
Pending users can verify through the public token endpoint; public resend,
email correction and reset handlers are now delivered under ADR-011 with neutral
acknowledgements, password proof, atomic recovery and session-revision invalidation.

DEV_AUTH may skip bearer entry only in NODE_ENV=development. It resolves the
configured DEV_AUTH_EMAIL (default seeded admin@test.com) to a real active,
verified user and uses that user's actual roles. It never creates an account,
reactivates it, verifies it or fabricates administrative permissions. Missing or
ineligible seed identity fails closed. Production and test configurations refuse
DEV_AUTH=true. Seed remains explicit and idempotent; no credentials are logged.

Database review adds prerequisites without changing account eligibility:
P2-SCOPE-INTEGRITY must ensure event removal never nulls staff scope into global
access and must enforce a deliberate null-safe uniqueness/history policy.
P2-IDENTITY-TOKENS supplies consistent email canonicalization with collision
review, purpose-bound token digests, expiry/consumption/revocation and safe legacy
link transition before signup/invitation handlers change. P2-STAFF-MODEL adds
explicit studio scope for member invitations. Scope-integrity schema/index/history
changes are implemented under ADR-008;
deployment provenance review remains P2-SCOPE-DEPLOY. Identity/token technical
foundations are implemented under ADR-009/010; public auth workflows and staff
model fixes remain planned. See [database review](../DATABASE_REVIEW.md).

The revised development plan retains this product decision and changes delivery
ordering. Phase 1 stabilizes judge/controller/contracts and introduces baseline
CI. Phase 2A provides onboarding/assignment persistence decisions and required
migrations, minimal durable audit, privacy/retention policy, moderator permissions,
and real email. Phase 2B implements account eligibility, verification, invitation
security, atomic judge acceptance, offboarding, and consistent role-key checks.
It does not depend on later Phase 3 audit or draft-model work.

Phase 3 handles registration/entry lifecycle, studio reuse, and historical-data
rules. Phase 4 provides organizer application review and separately gated staff
administration; Phase 5 provides applicant/entry and additional-representative UI.
Core email is P2-EMAIL before external onboarding; Phase 8 expands delivery/media
hardening. Scoring and live schema move to Phase 6 and do not block the first
single-event studio application. Milestone prerequisites and stable task IDs in
the plan govern execution; this ADR does not mark any runtime gate complete.

Acceptance checks must cover direct generic-signup bypass, pending-user recovery,
cross-studio/event access, prohibited global staff scope, unknown/disallowed roles,
new/existing/wrong/inactive accounts, expired/revoked links, concurrent acceptance,
judge-role-record rollback, existing-assignment reconciliation, and removal that
preserves historical scores. Public access remains deferred under ADR-002.

Related: [studio identity](001-studio-identity-and-event-registration.md),
[canonical paths](002-canonical-api-paths.md),
[user journeys](../USER_JOURNEYS.md), and [development plan](../../DEVELOPMENT_PLAN.md).
