# Authorization and security status

Working-tree audit: 2026-10-25. This describes current boundaries and open work,
not a production-readiness or deployed-data audit. Task priority: [checkpoint](../DEVELOPMENT_PLAN.md).

## Current model

- JWT middleware resolves database roles/permissions per request. A null event
  scope means global. The `admin` key sets a dedicated bypass; controllers still
  need active parent/child and relationship checks. Read helper behavior rather
  than assuming all helpers merge scopes or apply identical bypasses.
- Active studio membership is distinct from a representative role. Organization
  approval and event approval are separate; entry operations also check stage.
- Event reads require authentication. Auth register/login/verify and invitation
  inspect/accept are public. Other mounted business operations require auth plus
  their specific checks. [API](API.md) owns exact endpoint boundaries.
- New scope migration restricts event deletion and enforces null-safe assignment/
  outstanding-invitation uniqueness. It retains history and refuses ambiguous
  duplicates. **Deployment still needs P2-SCOPE-DEPLOY** and [ADR-008](adr/008-event-scope-integrity.md).
- ADR-009/010 supply canonical email and purpose-bound token digests, expiry,
  atomic consumption/rotation and legacy-link invalidation. Verification/recovery
  reject inactive accounts; invitation acceptance also refuses inactive invitees.
  Recovery/rotation management helpers are internal, not public endpoints.
  [Lifecycle evidence](IDENTITY_TOKEN_VALIDATION.md) records local checks and limits.

## Known gaps and owning tasks

The [audit correction map](AUDIT_FOLLOWUP.md) tracks all 15 findings to roadmap
owners and acceptance evidence. H2 is technically corrected locally under
P2-IDENTITY-TOKENS; the other findings remain open. M1 explicitly includes P2-INVITE-IDENTITY,
P2-ROLES-ADMIN-SCOPE and P2-BOUNDARIES-UPLOADS/ERRORS. Mounted API security cannot
be deferred until its UI or the full M4 staff workflow exists.

Verified impacts include arbitrary-password invitation session issuance for an
existing active account, continued access after disabling an account, roleless
foreign-image mutation and public HTML delivery through image upload. An
event-scoped admin assignment also receives the global bypass; deployed assignment
provenance is unverified. Correct these under the mapped preservation/regression
requirements before external exposure; no production exploit or deployed occurrence
is inferred from the local probes.

| Gap | Owner |
| --- | --- |
| Login permits unverified active users; request auth does not verify existing/active/verified user; public resend/recovery/email correction remain absent | P2-AUTH |
| DEV_AUTH synthesizes dev-admin, which can fail actor foreign keys | P2-AUTH |
| Public signup lacks validated studio context; legitimate roleless accounts need recovery | P2-ONBOARDING-MODEL/SIGNUP |
| Existing-account invitation acceptance can mint a session without authenticating the intended account; role eligibility/staff scope remain incomplete | P2-INVITE-IDENTITY (M1); P2-STAFF-MODEL/INVITE for full workflow |
| Event-scoped admin assignment currently enables a global bypass | P2-ROLES-ADMIN-SCOPE; P2-SCOPE-DEPLOY provenance review |
| Judge role and Judge record are separate; accepted-access removal/history policy incomplete | P2-JUDGE-ACCEPT/OFFBOARD |
| Image routes check identity/existence, not resource ownership/permission | P2-BOUNDARIES-UPLOADS (M1) |
| CORS hardcodes *; rate-limit config is unused; production boundary hardening pending | P2-BOUNDARIES |
| Frontend guards disagree on display-name matching rather than stable keys/scope | P2-ROLES |
| Bearer storage/session and safe email/reauth return policy undecided | P2-SESSION |
| No durable AuditLog or complete data retention/access policy | P2-AUDIT/PRIVACY |
| Silent development email fake does not deliver; production rejects unavailable delivery; full delivery/retry workflow pending | P2-EMAIL |
| Disguised HTML is accepted and served publicly; provider/cleanup lifecycle also incomplete | P2-BOUNDARIES-UPLOADS before API exposure (M1); P8-MEDIA extends provider/private-access lifecycle |

## Change requirements

Validate external input and every client-supplied relationship on the backend.
Test denied, cross-event/studio, inactive/deleted, stale/concurrent and rollback
cases alongside success. Never infer account ownership from contact email or
merge identities by normalized email/name. Preserve rows/history during migration;
review ambiguous data through authorized tooling. Do not log secrets, personal
records or arbitrary request/error payloads.

Frontend gates cannot authorize operations. Public discovery/results require
approved minimal DTOs/publication controls under ADR-002; no spectator account is
needed by target policy. [Testing](TESTING.md) defines evidence; passing DTO/unit
checks alone does not establish security or external release readiness.
