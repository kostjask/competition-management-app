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
event content migration/editors are delivered in P4-CORE under ADR-020; future rubric/announcement content is not
implemented by these contracts.

## Delivered local journey and remaining work

- P4-REVIEW/P5-APPLICATION mount organizer review at
  `/admin/events/:eventId/applications`, role-independent `/applications`, and
  `/events/:id/register` / `/events/:id/studio?studio=:studioId`. They show both
  approval states, semantic reasons, next actor/contact, event-zone cutoff,
  verified draft continuation and permitted profile/contact/cancel/reapply paths.
  Pending profile edits and review decisions use revision receipts. Frozen
  commands, explicit server comparison and session recovery preserve mounted work.
  [Evidence](APPLICATION_REVIEW_VALIDATION.md) separates synthetic browser/database
  checks from external release gates. Entry dashboards remain placeholders.
- Delivered auth pages cover studio signup, owner draft recovery, verification,
  resend/correction/reset and cookie-session recovery. Transactional encrypted
  provider dispatch is implemented; real inbox/hosted release evidence stays open.
- Staff invitation acceptance is at /auth/accept-invitation. Global-admin
  /admin/events/:eventId/staff provides invitation/assignment status and distinct
  revoke/remove; Judge/UserRole/consumption reconcile atomically and removal retains
  Judge/Score history. Additional studio members remain P5-MEMBERS.
- Durable nullable unscheduled entry drafts and immutable saved revisions are
  implemented under ADR-023/024. The opt-in [studio checkpoint API](api/entry-workflow.md)
  now adds basic/final confirmation/review receipts and scoped reopening under
  ADR-025. Music and complete representative workflow delivery remain later work.

P4-CORE setup and P4-REVIEW/P5-APPLICATION are delivered locally. Notification
intent commits with each changed decision under ADR-021; fake mode never claims
sent mail and provider acceptance never claims inbox delivery. The next feature
scope is the remaining P3-ENTRIES workflow plus coordinated P4/P5 configuration,
withdrawal, initial per-day estimates and representative consumers. The
[accepted lifecycle](adr/025-entry-submission-lifecycle.md) records the confirmed
studio-wide checkpoints and any-older percentage policy.
P3-PERFORMANCE-OWNER/CONSTRAINTS and the read-only organizer register are locally
implemented under [ADR-022](adr/022-performance-ownership-and-constraints.md).
ADR-019 content policy is accepted and ADR-020 implements event content storage/editors. Use test fakes/isolated databases while
external accounts are unavailable. Full M1, real email, hosted operations and
delivered-scope human review remain mandatory before M2/M4 external release.
Neither requires scoring/scheduling. Dependencies: [checkpoint](../DEVELOPMENT_PLAN.md).
Detailed recovery/acceptance: [flows](USER_FLOWS.md), F01/F03/F04/F06/F10.
Never use stub token logs as a production onboarding mechanism.
