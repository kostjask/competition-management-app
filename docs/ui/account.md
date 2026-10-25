# Discovery and account

Target screen contracts, not an implementation claim. Inherit all shared
[UI requirements](../UI_UX.md), [design rules](../DESIGN_SYSTEM.md) and
[flow acceptance](../USER_FLOWS.md). Routes are in the
[route inventory](../UI_UX.md#route-inventory); API paths are relative to /api/v1.

## S01 — Home and event list

- **Purpose / roles / route:** orient visitors and authenticated users; `/`, `/events`.
- **Primary action:** browse an available event or explicitly sign in for protected event data today.
- **Data:** session, authorized event summaries, stage, dates, venue, image URL.
- **Sections / components:** H1/introduction, workspace/continue links when authorized, current/upcoming/past event cards; optional filters when supported; admin create action.
- **States:** skeleton cards; no events versus no matches; guest access explanation; retry for failed list; no fabricated public data.
- **Responsive / accessibility:** cards stack then grid; dates/stage remain readable; meaningful detail link names, no nested card buttons or image-only titles.
- **API:** GET `/events` via events client; public variant pending UX-D02.
- **Acceptance:** guest is told why access is required; non-admin empty list never asks them to create an event; all visible links resolve. Flow F02.

## S02 — Event details

- **Purpose / roles / route:** decide participation or enter authorized workspace; authenticated readers today at `/events/:id`.
- **Primary action:** apply, resume application, enter workspace or view published results according to access/stage and delivered features.
- **Data:** event DTO, authorized own application/membership, configured deadlines/contact when contracts exist.
- **Sections / components:** event name/stage/date/timezone, venue/description, requirements/deadlines, action/status panel, secondary organizer contact; real image or neutral fallback.
- **States:** detail skeleton, missing/private event, retry, application unavailable reason, pending/approved resume; no new application in DATA_REVIEW.
- **Responsive / accessibility:** details then action on mobile; desktop side panel; real headings, text alternatives and exact deadline text.
- **API:** GET `/events/:eventId`, own registration/profile clients; published DTO pending.
- **Acceptance:** action availability matches backend and applicant ownership; action explains account/application distinction. F02/F03.

## S03 — Authentication and account recovery

- **Purpose / roles / routes:** establish/recover access; routes in inventory; public applicant or invitee, including explicit signed-in link handling.
- **Primary action:** sign in, start eligible studio signup, verify, request recovery or set a new password.
- **Data:** validated safe destination/event context, credential inputs, token outcome and throttling feedback; never store password in recovery state.
- **Sections / components:** context/title, semantic form, instructions, show-password button, linked errors, progress/success, recovery/contact links; verification has a deliberate Continue action.
- **States:** submitting, check-email, missing/expired/used token, wrong account, unverified/inactive account, throttled request, delivery failure and safe resend/address-correction path after contracts exist.
- **Responsive / accessibility:** single readable form column on every device; optional secondary introduction on desktop; password manager/autocomplete/paste, keyboard submit, focus error summary.
- **API:** auth register/login/verify-email; resend/reset and onboarding context are pending P2 contracts. Logout currently clears local bearer state; broader invalidation depends on session decision.
- **Acceptance:** no staff self-selection, no false sent/session claim, selected task/language survives defined recovery, wrong-account links cannot grant access. F01/F06.

## S04 — Profile

- **Purpose / roles / route:** understand own identity/access; any authenticated user at `/auth/profile`.
- **Primary action:** inspect identity and event-scoped assignments; preference/edit only when supported.
- **Data:** own profile DTO and agreed locale preference contract.
- **Sections / components:** identity, localized joined date, role/event list, account recovery/help; global scope explicitly labeled rather than “No event.”
- **States:** loading, retryable unavailable, legitimate no roles with application link, expired session; no inert Edit action.
- **Responsive / accessibility:** definition lists stack; long email wraps; roles are text, dates use locale formatter.
- **API:** GET `/auth/profile`; no current profile update endpoint.
- **Acceptance:** pending users have a next action; no promise that editing representative contact changes login email. F01/F04.
