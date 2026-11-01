# Authorization and security status

Working-tree status: 2026-11-01. This describes current boundaries and open work,
not a production-readiness or deployed-data audit. Task priority: [checkpoint](../DEVELOPMENT_PLAN.md).

## Current model

- JWT middleware first checks current existing/active/verified identity, then
  resolves database roles/permissions per request. A null event
  scope means global where supported. Only active null-event `admin` sets the
  dedicated bypass. Removed assignments, scoped admin and global judge/moderator
  are ignored under ADR-013; controllers still
  need active parent/child and relationship checks. Read helper behavior rather
  than assuming all helpers merge scopes or apply identical bypasses.
- Active studio membership is distinct from a representative role. Organization
  approval and event approval are separate; entry operations also check stage.
- Event reads require authentication. Auth register/login/verify and invitation
  inspection/new-account setup are public; existing-account acceptance requires
  the intended eligible session and never issues a replacement JWT. Other mounted business operations require auth plus
  their specific checks. [API](API.md) owns exact endpoint boundaries.
- Login requires correct credentials and an active, verified account. Protected
  requests with missing/inactive/unverified subjects return 401 before any role
  bypass, including previously issued admin JWTs. Verified roleless users remain
  eligible for independently authorized operations. DEV_AUTH is development-only,
  using an eligible persisted account and its actual roles; no synthetic actor
  or automatic privileges are created. See [eligibility evidence](AUTH_ELIGIBILITY_VALIDATION.md).
- New scope migration restricts event deletion and enforces null-safe assignment/
  outstanding-invitation uniqueness. It retains history and refuses ambiguous
  duplicates. **Deployment still needs P2-SCOPE-DEPLOY** and [ADR-008](adr/008-event-scope-integrity.md).
- P2-ROLES-ADMIN-SCOPE completes the backend writer/operation inventory and
  HTTP/PostgreSQL scope evidence for all 18 admin-only operations. The judge seed
  now binds new access to its event; historical records remain unchanged. Read-only
  deployment preflight flags active scoped admin/global staff and removed admin
  assignments. See [scope evidence](ADMIN_SCOPE_VALIDATION.md); intended-deployment
  provenance/repair remains P2-SCOPE-DEPLOY.
- ADR-009/010 supply canonical email and purpose-bound token digests, expiry,
  atomic consumption/rotation and legacy-link invalidation. Verification/recovery
  reject inactive accounts; invitation acceptance also refuses inactive invitees.
  Invitation rotation/revocation helpers are internal; public account recovery
  now uses the digest primitives under ADR-011.
  [Lifecycle evidence](IDENTITY_TOKEN_VALIDATION.md) records local checks and limits.
- ADR-011 adds public resend, password-proven pending email correction and reset.
  Request acknowledgements are uniform and explicitly delivery-unconfirmed;
  injected synchronous failures roll back token/email changes. Real Resend mail
  now uses a transactional encrypted queue with bounded idempotent retries under
  ADR-014; staging inbox delivery is still unverified. Reset increments the stored JWT
  revision, revokes older sessions and returns no session or access grants.
  Recovery routes share process-local IP limits; real staging delivery, UI, distributed
  throttling and other session controls remain separate release gates.
- P2-BOUNDARIES-UPLOADS now enforces ownership/scope, active parents, resource
  stage/approval and fresh transactional access on all four image endpoints.
  Raster content is decoded/re-encoded into bounded metadata-free WebP; private
  authenticated retrieval requires live references and uses safe headers/no-store.
  Reference/audit rollback and new-file cleanup are tested. Unreachable orphan
  cleanup and provider expansion remain P8-MEDIA; see [image evidence](IMAGE_BOUNDARIES_VALIDATION.md).

## Known gaps and owning tasks

The [audit correction map](AUDIT_FOLLOWUP.md) tracks all 15 findings to roadmap
owners and acceptance evidence. C1/C2/C3/C4/H2 are technically corrected locally
under P2-INVITE-IDENTITY, P2-AUTH-ELIGIBILITY, P2-BOUNDARIES-UPLOADS and
P2-IDENTITY-TOKENS; other findings
remain open. M1 explicitly includes P2-INVITE-IDENTITY,
P2-ROLES-ADMIN-SCOPE and P2-BOUNDARIES-UPLOADS/ERRORS. Mounted API security cannot
be deferred until its UI or the full M4 staff workflow exists.

The arbitrary-password existing-account invitation session defect is corrected
with transactional identity/revision checks and durable audit; see
[invitation evidence](INVITATION_IDENTITY_VALIDATION.md). Foreign-image mutation and
public HTML through upload are now corrected locally under ADR-015. An
event-scoped admin assignment no longer receives the global bypass under ADR-013;
H1's local backend inventory/evidence is complete; actual deployment provenance
remains open under P2-SCOPE-DEPLOY.
Correct remaining defects under the mapped preservation/regression
requirements before external exposure; no production exploit or deployed occurrence
is inferred from the local probes.

| Gap | Owner |
| --- | --- |
| Public signup lacks validated studio context; legitimate roleless accounts need recovery | P2-ONBOARDING-MODEL/SIGNUP |
| Intended-account acceptance corrected locally; invitation management and acceptance UI remain incomplete | P2-INVITE / P2-UI-AUTH; P2-JUDGE-ACCEPT |
| Scoped-admin bypass and backend inventory corrected locally; actual deployment assignment provenance/repair remains | P2-SCOPE-DEPLOY; frontend guards remain P2-ROLES |
| Judge role and Judge record are separate; accepted-access removal/history policy incomplete | P2-JUDGE-ACCEPT/OFFBOARD |
| Image ownership/content/private retrieval corrected locally; image UI and actual rollout remain gated | Owning UI workflows; P9 operations |
| CORS hardcodes *; configured process-local limits cover recovery only; other auth/invite/upload limits and production boundary hardening pending | P2-BOUNDARIES |
| Frontend guards disagree on display-name matching rather than stable keys/scope | P2-ROLES |
| Credential-reset JWT revision checks exist; bearer storage/cookie and safe email/reauth return policy remain undecided | P2-SESSION |
| Minimal immutable transactional audit/privacy policy implemented; per-feature coverage and organizational retention review continue | Owning feature tasks; P9 operations |
| Resend/queue/templates/retries implemented locally; real staging inbox evidence and link UI remain open | P2-EMAIL / P2-UI-AUTH |
| Durable orphan cleanup/retry and cloud/private media provider lifecycle remain incomplete | P8-MEDIA; current raster authorization/content/retrieval are delivered under ADR-015 |

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
