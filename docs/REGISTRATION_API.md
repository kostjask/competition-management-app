# Registration and invitation workflow

Reviewed: 2026-10-24

This guide distinguishes the implemented API from the intended user experience.
For exact paths, payloads, responses, and validation coverage, use
[API.md](API.md). For planned screens, recovery behavior, and acceptance criteria,
use [USER_JOURNEYS.md](USER_JOURNEYS.md). Delivery order and blockers remain in the
[development plan](../DEVELOPMENT_PLAN.md).

## Three separate actions

1. **Create account:** establish a personal login and verify the email address.
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
- Entry submission, correction requests with reasons/deadlines, durable drafts,
  music handling, and submission receipts are planned rather than implemented.

## Intended onboarding and release gate

Target journey: selected event → account creation/sign-in → verification → studio
application → application status → approved entry preparation → review and submit.
Returning applicants should resume saved progress with the event and studio clear.
Show separate organization/event statuses and an actionable next step throughout.
See the journey guide for detailed validation and recovery requirements.

Phase 1 integration remains the immediate priority. Authentication/recovery belongs
to Phase 2; state/model decisions to Phase 3; organizer review to Phase 4; applicant
screens and entries to Phase 5. Production email is owned by Phase 8 and must be
available before external onboarding. No current API test or this documentation
establishes a complete production-ready onboarding experience.
