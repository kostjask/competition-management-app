# Registration workflow

## Separate operations

1. Account access and verification establish identity.
2. An event application requests independent organization and event approvals.
3. Final entry submission confirms roster/performances/music; it is not implemented.

A role does not establish ownership or approval. Pending applicants do not need
a representative role to apply or inspect owned applications. Target eligibility
is [ADR-006](adr/006-account-eligibility-and-staff-onboarding.md); current public
signup is still generic. [Domain rules](DOMAIN.md).

## Implemented boundaries

Paths below are relative to /api/v1. Payloads, DTOs and exact rules live once in
the linked resource contracts.

| Operation | Route | Contract |
| --- | --- | --- |
| Register / login / verify | POST /auth/register, /auth/login, /auth/verify-email | [Auth](api/auth.md); public, login verification enforcement pending |
| Own identity/roles | GET /auth/profile | [Auth](api/auth.md); authenticated |
| Apply / list own or admin registrations | POST/GET /events/:eventId/studio-registrations | [Applications](api/registrations.md) |
| Admin event decision / pending cancellation | PATCH/DELETE /events/:eventId/studio-registrations/:studioId | [Applications](api/registrations.md) |
| Organization profile / approval / own contact | /studios/:studioId and actions | [Studios](api/studios.md) |
| Inspect / accept / administer invitations | /invitations/:token, /invitations/accept, /invitations | [Invitations](api/invitations.md); security/lifecycle incomplete |

Application creation atomically saves a new event-owned studio, PENDING
registration and non-admin applicant membership. Both approvals start pending;
event approval requires an approved organization and assigns event roles.
Admin-created contact does not link an account. Pending cancellation retains
studio/member. Current creation is not idempotent; reconcile a lost response
before retrying. Existing-studio reuse waits for ADR-001 migration; never auto-merge.

Non-admin new application: PRE_REGISTRATION/REGISTRATION_OPEN only, never
DATA_REVIEW. Review allowances unlock permitted entry corrections, not every
studio/profile operation. Keep independent approval, entry, lifecycle and score
states distinct. Exact operation gates remain in the contracts.

## Missing journey work

- /events/:id/register, /events/:id/studio and /accept-invitation are not mounted
  frontend pages; role dashboards are placeholders. Applicants need role-independent
  application status, safe event/language return and permitted correction paths.
- Email is a stub; login permits unverified users. Backend signup context,
  verification/reset/resend, safe session recovery and token lifecycle are pending.
- Staff scope is optional; existing-account acceptance lacks intended-account
  authentication. Judge role and record need atomic reconciliation; revoke/remove
  and studio-bound member invitations require their own contracts.
- Durable entry drafts/receipts, music and scoped corrections remain future work.

M2 requires security/onboarding foundations, real email, P3 registration policy,
organizer review and applicant UI. M4 needs staff acceptance/removal and admin UI.
Neither requires scoring/scheduling. Dependencies: [checkpoint](../DEVELOPMENT_PLAN.md).
Detailed recovery/acceptance: [flows](USER_FLOWS.md), F01/F03/F04/F06/F10.
Never use stub token logs as a production onboarding mechanism.
