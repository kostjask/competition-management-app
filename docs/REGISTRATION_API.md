# Registration workflow

## Separate operations

1. Account access and verification establish identity.
2. An event application requests independent organization and event approvals.
3. Final entry submission confirms roster/performances/music; it is not implemented.

A role does not establish ownership or approval. Pending applicants do not need
a representative role to apply or inspect owned applications. Public signup now
requires studio intent and retains an owner-proven draft under ADR-017; it grants
no studio, membership, application or role. Login/protected access requires an
active verified account. [Domain rules](DOMAIN.md) and [auth contract](api/auth.md).

## Implemented boundaries

Paths below are relative to /api/v1. Payloads, DTOs and exact rules live once in
the linked resource contracts.

| Operation | Route | Contract |
| --- | --- | --- |
| Register / login / verify | POST /auth/register, /auth/login, /auth/verify-email | [Auth](api/auth.md); studio-intent signup and verified/active login enforced |
| Own identity/roles | GET /auth/profile | [Auth](api/auth.md); authenticated |
| Apply / list own or admin registrations | POST/GET /events/:eventId/studio-registrations | [Applications](api/registrations.md) |
| Admin event decision / pending cancellation | PATCH/DELETE /events/:eventId/studio-registrations/:studioId | [Applications](api/registrations.md) |
| Organization profile / approval / own contact | /studios/:studioId and actions | [Studios](api/studios.md) |
| Inspect / accept / administer invitations and event staff | /invitations and actions; /events/:eventId/staff and removal | [Invitations](api/invitations.md); scoped lifecycle, intended-account acceptance and retained offboarding implemented locally |

Application creation atomically retains a studio, PENDING registration, applicant
membership and audit. Organization and event decisions are independent; both must
be approved for derived representative access, in either order. Revocation retains
assignment history and preserves access through another qualifying studio.

Cancellation retains the registration as CANCELLED. Revisioned canonical POST with
studioId reapplies the same studio in the same event, preserving memberships and
history. Initial creation supports a retained UUID operationId for safe uncertain
responses. See [the canonical contract](api/registrations.md) for payloads, retry
rules, explicit next actor, private fields and conflicts. No name merge or
multi-event reuse is introduced.

[ADR-003](adr/003-registration-lifecycle.md) governs M2 stages, event timezone,
optional deadline, correction scope and admin exceptions. Application writes obey
the window even for admins; cancellation remains possible after the deadline in
pre/open/review. Pending active owners may correct profile details before closure
without a role; correction increments the application revision and returns
organization approval to PENDING for review. Review allowance remains separate
from profile corrections. Current admin profile override is retained explicitly.

[ADR-019](adr/019-m2-authored-content.md) governs source language and authored
translation fallback. M2 review reasons use translated semantic codes. Event
content storage/editors now implement that contract in P4; future
rubric/announcement content remains outside this scope.

## Missing journey work

- Applicant application/status pages are not mounted; the admin workspace now
  provides setup/review. Other role dashboards remain placeholders.
  Applicants need role-independent event applications, both approval states,
  verified draft continuation and permitted cancellation/correction/reapply paths.
- Delivered auth pages cover studio signup, owner draft recovery, verification,
  resend/correction/reset and cookie-session recovery. Transactional encrypted
  provider dispatch is implemented; real inbox/hosted release evidence stays open.
- Staff invitation acceptance is at /auth/accept-invitation. Global-admin
  /admin/events/:eventId/staff provides invitation/assignment status and distinct
  revoke/remove; Judge/UserRole/consumption reconcile atomically and removal retains
  Judge/Score history. Additional studio members remain P5-MEMBERS.
- Durable entry drafts/receipts, music and scoped corrections remain future work.

Organizer setup/review now has implementation and isolated validation; the
development database still needs reconciliation as recorded in
[organizer validation](ORGANIZER_VALIDATION.md). Applicant UI follows this slice.
If the registration design needs authored content fields, settle their content
policy before implementing those fields. Use test fakes/isolated databases while
external accounts are unavailable. Full M1, real email, hosted operations and
delivered-scope human review remain mandatory before M2/M4 external release.
Neither requires scoring/scheduling. Dependencies: [checkpoint](../DEVELOPMENT_PLAN.md).
Detailed recovery/acceptance: [flows](USER_FLOWS.md), F01/F03/F04/F06/F10.
Never use stub token logs as a production onboarding mechanism.
