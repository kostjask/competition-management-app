# User journeys and UX requirements

Reviewed: 2026-10-24

This guide describes the intended user experience and its acceptance criteria.
It is a product specification, not a claim that these screens or workflows exist.
The [development plan](../DEVELOPMENT_PLAN.md) controls delivery order;
[API.md](API.md) describes implemented contracts. Accepted ADRs govern architecture.
New domain decisions listed below must be resolved before dependent implementation.

## Current implementation and gaps

| Area | Current behavior | Required improvement |
| --- | --- | --- |
| Account creation | Registration, login, and verification pages/endpoints exist. Registration copy promises immediate login; the backend login handler does not check email verification. | Align backend verification enforcement, recovery, and translated instructions in Phase 2. |
| Email | Sending is a development stub. | Deliver real verification/invitation/recovery email before external onboarding; Phase 8 owns provider work. |
| Continuing after authentication | Login can use route state; verification navigates to `/`. | Preserve the selected event and safe application destination through registration, verification, and session expiry. |
| Event discovery | Event screens exist, but event API reads require authentication under ADR-002. | Explain sign-in requirements; public discovery requires a separate publication/DTO decision. |
| Applying | Canonical registration API exists. Event links point to missing `/events/:id/register` and `/events/:id/studio` pages. | Implement the routes and an application home accessible to authenticated applicants without an assigned role. |
| Registration availability | Event UI treats `DATA_REVIEW` as open for new applications; non-admin creation only permits `PRE_REGISTRATION` and `REGISTRATION_OPEN`. | Match backend rules and explain closed registration and permitted corrections separately. |
| Approval | Organization and event approval are independent; both start pending. Event approval assigns representative roles. | Explain both statuses and the next action; never treat a role as proof of approval. |
| Dancers | Canonical API supports authorized CRUD with calendar birth dates, approval gates, stage locks, and soft deletion. | Build roster UI; eligibility, restore, and multi-event behavior remain future work. |
| Invitations | Inspection/acceptance API exists; email links use `/accept-invitation`, which has no frontend route. | Build new/existing-account acceptance and expired/revoked-link recovery after backend hardening. |
| Competition entries | Performance integration is incomplete; role dashboards are placeholders. | Complete Phase 1 contracts before building entries, music, submission, or live operations. |

## Language and navigation

Use distinct actions throughout the interface:

| Label | Meaning |
| --- | --- |
| Create account | Create a personal login; does not apply to an event. |
| Apply to competition | Request studio participation in the selected event. |
| Add performance | Prepare one competition entry with its participants and music. |
| Submit entries | Confirm a complete set of entries for review under the future submission policy. |
| Cancel application | Cancel a pending event application; does not delete the studio or account. |

Always show the active event and studio on management screens. Distinguish the
application deadline, entry deadline, music deadline, and event date if the event
uses separate deadlines. Display exact times with the event timezone; do not
promise deadlines or review turnaround that the organizer has not configured.

## Journey 1: Create an account and continue

Starting point: a visitor selects a competition action or opens account creation.

1. Keep the event name and intended next action visible through onboarding.
2. Ask only for the personal details needed to create the account. Studio,
   director, and billing details belong to later steps; prefill repeated contact
   details from the profile while allowing appropriate edits.
3. Explain password requirements before submission and support password managers,
   paste, autocomplete, and a labelled show-password control.
4. On success, show the destination email and verification instructions. Provide
   resend with throttling and a defined correction path for a mistyped address.
5. After verification, offer a clear continue action to the selected event.
   Without an event destination, open the application home or event selection.
6. Provide password reset and clear invalid/expired/already-used link recovery.
   Existing-account links should guide the user to sign in or recover access.

Only permit validated internal return destinations; never trust an arbitrary
redirect URL. Do not put credentials or verification tokens into return URLs.
Recovery responses must follow the account-enumeration policy defined in Phase 2.

Acceptance criteria:

- A new user can resume the intended event after opening email in another tab;
  define a safe fallback when opening on another device.
- Instructions and backend verification enforcement agree.
- Expired links and existing accounts have a usable recovery path.
- Session expiry preserves recoverable progress and returns to the same task
  after reauthentication, subject to current authorization.

## Journey 2: Apply and track approval

Starting point: an authenticated applicant chooses an event accepting applications.

1. Show entry requirements, relevant deadlines, organizer contact, and an explicit
   explanation that applying is separate from submitting performances.
2. Collect studio details and representative contact information. Explain required
   fields and postpone optional billing information until needed.
3. Submit once, show confirmation only after server success, and open the
   application's status page. Prevent duplicate clicks. An uncertain network
   result must be reconciled before retrying creation; the current POST is not
   idempotent.
4. Show organization verification and event approval as separate rows with
   explanations and next actions. Do not promise access to roster or entry editing
   while approval requirements are unmet.
5. Let the applicant return through “My applications” without a representative
   role. Backend access remains restricted to active owned memberships or admins.
6. Offer pending cancellation with a confirmation explaining that the studio is
   retained. For approved/locked applications, explain the applicable policy and
   organizer contact rather than offering the unsupported pending-only action.

| State or condition | User-facing explanation | Next action |
| --- | --- | --- |
| No application | You have not applied to this competition. | Apply if registration is open. |
| Organization pending | Your studio is awaiting verification. | Check submitted details and organizer contact; show review timing only if configured. |
| Organization approved, event pending | Your studio is verified; this competition application is awaiting review. | Follow application status. |
| Event approved | Your studio is accepted for this competition. | Prepare entries when the event stage permits. |
| Rejected | The application or studio was not approved. Identify which decision applies. | Show a safe review reason/contact; resubmission requires an agreed policy. |
| Locked or stage-restricted | Editing is closed for this application or event. | View saved data and any granted correction permission. |

These explanations are UI conditions, not new persisted status values. Keep
organization approval, event registration, entry submission, and event lifecycle
separate. “Corrections requested” and “entries submitted” need their own approved
model; do not silently map them to registration `PENDING` or `LOCKED`.

Acceptance criteria:

- A roleless applicant can see only their own applications and the next action.
- Closed registration never offers a working-looking new application action.
- A delayed response, refresh, or retry cannot silently create duplicate studios.
- Approval changes become visible after refresh; email is supplementary to the
  application status page.

## Journey 3: Prepare and submit entries

Starting point: an approved studio representative opens an editable competition.

Use a resumable checklist: studio details, dancers, performances, music, review,
and submission. Show completion and blocking issues for each section. Users may
revisit saved sections; avoid forcing all roster work into a single long form.

- Show save-in-progress, saved, unsaved, and failed-save states accurately.
  Preserve form values after validation/network errors. Warn before leaving
  unsaved work and define server-backed draft persistence before promising autosave.
- Make dancer selection searchable. Display birth dates in a locale-appropriate
  format and explain the event's age calculation date and policy. Validate
  participant relationships and eligibility again on the backend.
- Show participant count and music/performance duration against format limits.
  Explain a specific conflict, for example “This format allows up to 8 dancers;
  you selected 9.”
- Show accepted music types and size/duration limits before upload. Provide
  upload progress, retry, playback preview, and replacement confirmation. Retain
  the previous working file until replacement succeeds.
- Review all performances before submission. Link each blocking issue directly
  to its field or entry; distinguish warnings from submission blockers.
- Explain what submitting will lock and whether later edits are permitted. Show
  a server-confirmed receipt with event, studio, entry summary, submission time,
  and next action. Repeated submission must not duplicate entries or receipts.
- For corrections, show the affected entry/field, organizer reason, deadline,
  and permitted editing scope. Preserve unaffected entries and audit changes.

Returning studios should select an existing owned studio and reuse their roster
only after ADR-001 migration and historical-data/lock policies are implemented.
Never match or merge studios automatically by name. Copying a previous performance
is optional future scope and requires rechecking eligibility, configuration, and
music; it is not part of the first registration milestone.

Acceptance criteria:

- An approved representative can resume saved work on a later visit.
- Ineligible participants, invalid duration/count, missing required music, and
  cross-studio relationships cannot pass final server validation.
- A deadline/stage change during editing produces an actionable response without
  falsely reporting a successful save or discarding visible form values.
- Concurrent edits are detected and resolved without silently overwriting changes.
- Corrections are permitted only for the authorized event, scope, and stage.

## Journey 4: Organize and review

The admin home should prioritize applications awaiting review, requested
corrections, incomplete entries, and missing music for the selected event.
Keep organization verification separate from event acceptance, even when the
screens link between them. Show who must act next and the relevant deadline.

Before opening registration, provide a setup checklist covering event details,
timezone/deadlines, categories, age rules, formats, contact information, and
required scoring configuration. Prevent invalid lifecycle transitions with
specific missing prerequisites. Review decisions and correction requests need
reasons where required by the agreed policy, safe notifications, and audit records.

Acceptance criteria: an administrator can configure an event, find pending work,
review the correct studio/event, and communicate the decision without direct
database access. UI previews do not grant impersonation or bypass permissions.

## Journey 5: Accept an invitation

Show the event, invited role, intended account, and expiry before acceptance.
New users complete account setup; existing users authenticate as the intended
account and accept without resetting their password. A wrong-account session
must offer account switching without assigning the invitation to that account.
After acceptance, open the relevant event workspace. Expired, revoked, or used
links need a safe explanation and resend/contact path.

Acceptance criteria: account identity and event assignment are checked on the
backend; repeated acceptance cannot duplicate roles or reset credentials.
The acceptance page must exist before invitation delivery is enabled for users.

## Journey 6: Judge, moderate, and view results

Judges need a touch-friendly current-performance view with rubric limits, draft
save status, and an explicit final submission action. After reconnect, show the
server-confirmed state and reconcile pending work before advancing. Never display
“submitted” based only on local state. Peer-score visibility follows the scoring ADR.

Moderators need current/next performances, stage/session context, judge completion,
and connection status. Advancing, skipping, reopening, and correcting require
clear authorization and confirmation appropriate to the action. Provide a manual
fallback/export procedure for network failure; offline scoring support remains
an explicit design decision, not a current guarantee.

Result views must distinguish provisional, finalized, published, and corrected
results under the scoring/publication specification. Public access requires
approved public DTOs and publication controls. Show correction explanations and
publication time when applicable without exposing private dancer/contact data.

Acceptance criteria: reconnect does not lose acknowledged submissions or duplicate
stage actions; users see the correct assigned performance; unpublished results
remain inaccessible to unauthorized viewers.

## Cross-cutting acceptance criteria

- Provide loading, empty, error, success, and disabled states with a clear next
  action. A failed request must not look like an empty successful list.
- Use semantic forms, associated labels, keyboard navigation, visible focus,
  field errors, and an error summary linked to fields. Announce asynchronous
  status changes accessibly; never rely on color alone.
- Translate all screens, errors, emails, and status explanations in ET/EN/RU.
  Preserve the selected language through authentication and invitations.
- Verify layouts on phone/tablet and desktop, including long translated text.
- Keep birth dates, billing data, and contact details out of public views,
  analytics, URLs, and routine logs; use authorized DTOs for private views.
- Test network failure, refresh, session expiry, stage changes, repeated actions,
  keyboard-only use, and cross-event/cross-studio access for each relevant journey.

## Decisions and delivery gates

| Decision needed before implementation | Owning phase |
| --- | --- |
| Verification enforcement, resend/address correction, invitation account binding, token expiry, and recovery privacy policy | Phase 2 |
| Safe return destination persistence across email tabs/devices and session expiry | Phase 2 |
| Draft/submission/receipt model, retry idempotency, concurrent edits, correction scope/expiry, withdrawal/resubmission, and historical snapshots | Phase 3, lifecycle ADR before dependent Phase 5 work |
| Age policy, event timezone, registration/entry/music deadlines, and required/optional music rules | Phase 3 model and Phase 4 configuration before Phase 5 validation |
| Reusable studio/roster edits across event locks and historical entries | Phase 3, ADR-001 prerequisite |
| Public event discovery and result DTO/publication policy | Separate decision under ADR-002; current event reads remain authenticated |
| Offline/reconnect, scoring locks, and correction/publication semantics | ADR-003/004 before Phases 6–7 |
| Real email delivery, translated templates, delivery failure/retry behavior | Phase 8; release gate for external onboarding |

The first onboarding UX milestone is: a new representative can create and verify
an account, apply to one event, and always find their status and next action.
It depends on Phase 1 stabilization, Phase 2 security, and relevant Phase 3–4
prerequisites. This documentation task does not advance those phases or enable
public registration. Real email is required before external onboarding even
though provider implementation is grouped in Phase 8.
