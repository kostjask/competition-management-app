# Authorization and security status

Working-tree audit: 2026-10-25. This describes current boundaries and open work,
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
  inspect/accept are public. Other mounted business operations require auth plus
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

## Known gaps and owning tasks

The [audit correction map](AUDIT_FOLLOWUP.md) tracks all 15 findings to roadmap
owners and acceptance evidence. H2 and C2 are technically corrected locally under
P2-IDENTITY-TOKENS and P2-AUTH-ELIGIBILITY; the other findings and parent P2-AUTH
remain open. M1 explicitly includes P2-INVITE-IDENTITY,
P2-ROLES-ADMIN-SCOPE and P2-BOUNDARIES-UPLOADS/ERRORS. Mounted API security cannot
be deferred until its UI or the full M4 staff workflow exists.

Verified impacts include arbitrary-password invitation session issuance for an
existing active account, roleless
foreign-image mutation and public HTML delivery through image upload. An
event-scoped admin assignment no longer receives the global bypass under ADR-013;
the full H1 task's assignment-provenance and inventory evidence remains open.
Correct remaining defects under the mapped preservation/regression
requirements before external exposure; no production exploit or deployed occurrence
is inferred from the local probes.

| Gap | Owner |
| --- | --- |
| Public signup lacks validated studio context; legitimate roleless accounts need recovery | P2-ONBOARDING-MODEL/SIGNUP |
| Existing-account invitation acceptance can mint a session without authenticating the intended account; full invitation management remains incomplete | P2-INVITE-IDENTITY (M1); P2-STAFF-MODEL/INVITE for full workflow |
| Scoped-admin bypass predicate corrected locally; full assignment provenance/negative inventory review remains | P2-ROLES-ADMIN-SCOPE; P2-SCOPE-DEPLOY |
| Judge role and Judge record are separate; accepted-access removal/history policy incomplete | P2-JUDGE-ACCEPT/OFFBOARD |
| Image routes check identity/existence, not resource ownership/permission | P2-BOUNDARIES-UPLOADS (M1) |
| CORS hardcodes *; configured process-local limits cover recovery only; other auth/invite/upload limits and production boundary hardening pending | P2-BOUNDARIES |
| Frontend guards disagree on display-name matching rather than stable keys/scope | P2-ROLES |
| Credential-reset JWT revision checks exist; bearer storage/cookie and safe email/reauth return policy remain undecided | P2-SESSION |
| Minimal immutable transactional audit/privacy policy implemented; per-feature coverage and organizational retention review continue | Owning feature tasks; P9 operations |
| Resend/queue/templates/retries implemented locally; real staging inbox evidence and link UI remain open | P2-EMAIL / P2-UI-AUTH |
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
