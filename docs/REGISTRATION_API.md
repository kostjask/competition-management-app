# Registration and invitation workflow

Reviewed: 2026-10-24

This guide distinguishes the implemented API from the intended user experience.
For exact paths, payloads, responses, and validation coverage, use
[API.md](API.md). For planned screens, recovery behavior, and acceptance criteria,
use [USER_JOURNEYS.md](USER_JOURNEYS.md). Delivery order and blockers remain in the
[development plan](../DEVELOPMENT_PLAN.md).

## Intended account eligibility

[ADR-006](adr/006-account-eligibility-and-staff-onboarding.md) establishes
studio-focused self-service signup and invitation-only judges/moderators. There
is no spectator-account use case. Pending studio applicants retain account access
without receiving representative privileges before approval. Additional
representatives require studio-bound invitations; admins use controlled provisioning.

This direction is not implemented yet: the current public registration API still
creates a roleless account without studio context. Backend signup enforcement,
recoverable onboarding progress, and existing-account transition policy must be
implemented together. A label change or client-supplied role is insufficient.

## Three separate actions within studio onboarding

1. **Register your studio / establish account access:** start validated studio
   onboarding, establish a personal login, and verify the email address. Generic
   account creation is current behavior, not the target entry path.
2. **Apply to competition:** create a studio and pending event registration through
   the current API; request organization verification and event acceptance.
3. **Submit entries:** confirm dancers, performances, and music for review. This
   workflow is planned and has no implemented final-submission API or UI yet.

Account creation does not register a studio or enter a competition. Organization
approval does not grant event approval. A representative role does not replace
active membership, approval, ownership, or event-stage checks.

## Implemented API boundaries

All paths below include `/api/v1`. They are API endpoints, not frontend page URLs.

| Operation | Endpoint | Current boundary |
| --- | --- | --- |
| Create account | `POST /api/v1/auth/register` | Public; creates an unverified user and invokes the email stub. |
| Verify email | `POST /api/v1/auth/verify-email` | Public token operation; successful verification returns an authentication token. |
| Sign in | `POST /api/v1/auth/login` | Public; verification enforcement remains Phase 2 work. |
| Read own profile | `GET /api/v1/auth/profile` | Authenticated. |
| Apply with a new studio | `POST /api/v1/events/:eventId/studio-registrations` | Authenticated; no pre-existing representative role required. |
| List applications | `GET /api/v1/events/:eventId/studio-registrations` | Admin or active studio membership; non-admins see only owned registrations. |
| Review event registration | `PATCH /api/v1/events/:eventId/studio-registrations/:studioId` | Admin-only; organization must already be approved. See API contract for supported statuses. |
| Cancel pending application | `DELETE /api/v1/events/:eventId/studio-registrations/:studioId` | Admin or active owner; pending-only, retaining studio and membership records. |
| Inspect invitation | `GET /api/v1/invitations/:token` | Public; business/security and DTO hardening remain. |
| Accept invitation | `POST /api/v1/invitations/accept` | Public; existing-account binding and token lifecycle require Phase 2 review. |
| List/create invitations | `GET/POST /api/v1/invitations` | Authenticated administration; broader permission and token-exposure hardening remain. |

Do not use retired unversioned endpoints or `/invitations/invitations` examples.
Use the root [setup instructions](../README.md#local-setup); the local API base is
`http://localhost:4000/api/v1`. Never obtain verification or invitation tokens from
logs as a production workflow.

## Application lifecycle today

Creating an application atomically creates the studio, its `PENDING` event
registration, and the non-admin applicant's active representative membership.
Organization approval also starts `PENDING`; no representative role is assigned
until event approval. Admin-created contact details do not assign membership to
an account. The backend derives ownership from authenticated identity.

Non-admin creation is allowed only during `PRE_REGISTRATION` and
`REGISTRATION_OPEN`. `DATA_REVIEW` is for permitted corrections, not new
applications. Approved dancer editing currently requires `REGISTRATION_OPEN`, or
`DATA_REVIEW` with the registration's explicit review permission. Read and write
authorization remain backend responsibilities.

Organization approval and event acceptance are separate decisions under
[ADR-001](adr/001-studio-identity-and-event-registration.md). Existing-studio reuse
across events requires the Phase 3 migration; current creation makes a new studio
and is not an idempotent retry operation. Similar studio names must never trigger
automatic identity merging.

## Current user-facing gaps

- Public signup is unrestricted, contrary to the ADR-006 target. Keep existing
  legitimate pending accounts recoverable; do not automatically delete roleless users.
- Application routes `/events/:id/register` and `/events/:id/studio` are linked
  from event details but are not implemented. No application status screen exists.
- New applicants have no assigned role and need an authenticated application home
  independent of the representative role gate, with ownership enforced on the API.
- Event reads remain authenticated under ADR-002; public discovery is undecided.
- Registration copy and backend email-verification enforcement do not agree.
  Verification currently returns to the homepage rather than the selected event.
- Email delivery is a development stub. Verification resend/address correction,
  password reset, invitation resend/revoke, and token-expiry behavior need work.
- Invitation emails link to `/accept-invitation`, but that frontend page is missing.
- Judge invitation acceptance assigns a role but does not create the event Judge
  record; separate judge CRUD does not assign the role. Unify them transactionally.
- Invitation scope is currently optional. Require event scope for judges/moderators,
  validate assignable roles, and handle existing accounts through authentication
  without resetting credentials. Add concurrency-safe acceptance and offboarding.
- Entry submission, correction requests with reasons/deadlines, durable drafts,
  music handling, and submission receipts are planned rather than implemented.

## Intended onboarding and release gate

Target journey: register your studio (optionally in a selected event) → account
access/sign-in → verification → studio
application → application status → approved entry preparation → review and submit.
Returning applicants should resume saved progress with the event and studio clear.
Show separate organization/event statuses and an actionable next step throughout.
See the journey guide for detailed validation and recovery requirements.

Phase 1 integration remains the immediate priority, with baseline CI added early.
Phase 2A now supplies onboarding persistence decisions, audit/privacy foundations,
and production email (P2-EMAIL) before Phase 2B authentication/signup behavior.
Registration lifecycle is P3-REGISTRATION; core organizer review is Phase 4 and
applicant UI is P5-APPLICATION. Together these gate M2, the first usable studio
application journey. Scoring/scheduling are Phase 6 work, not M2 prerequisites.
Phase 8 expands email/media hardening; it no longer owns initial email delivery.
No current API test or this documentation establishes a complete production-ready
onboarding experience. Use the plan's milestone gates and task IDs for exact scope.

Staff target journey: admin selects event and judge/moderator → invitation →
intended-account authentication or invited account setup → atomic acceptance and
assignment → event workspace. Provide status/resend/revoke and separate removal of
accepted access. “Manager” must resolve to stage operation (`moderator`) or a
separately designed organizer permission set; do not grant global admin by default.
