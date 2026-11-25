# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 8 — Media and provider hardening (before dependent milestones)

Audit C3/C4 ownership and active-content protections for the already mounted image
API are P2-BOUNDARIES-UPLOADS/M1 requirements; they must not wait for music or
provider implementation. P8-MEDIA reuses and extends those protections. The
[audit correction map](../AUDIT_FOLLOWUP.md) defines regression and release evidence,
including M5's permanent security/browser tests with each owning feature task.

Core email provider/delivery is P2-EMAIL, not deferred here. Media must be ready
before M3 music upload, independently of Phase 6–7 progress.

- [ ] P8-UI-PROVIDERS (S11 local slice delivered, 2026-11-19; remaining delivery/S17 scope open): within P8-MEDIA/DELIVERY-HARDENING and consuming S11/S17 screens, expose actual upload/processing/replacement/delivery failure and retry states, upfront limits and accessible progress. Music now includes immediate cancellation, frozen retries/session recovery, retained previous versions, explicit comparison and ET/EN/RU phone/desktop checks. [Evidence](../MUSIC_DELIVERY_VALIDATION.md). Extend owning feature UI; remaining provider/hosted/human gates stay open.

- [x] P8-MEDIA (local technical scope, 2026-11-19): [ADR-028](../adr/028-private-music-model.md)/[ADR-029](../adr/029-private-music-delivery.md) now provide explicit private local storage and authenticated current-version range delivery, content-derived MP3/PCM WAV MIME/duration, configured byte/duration/deadline/exception limits, safe display names and exact active application ownership. Durable staging precedes bytes; serializable version/pointer/actor-body-hash receipt/audit commits retain previous versions on failure. Retire-before-delete cleanup retries failed deletion and preserves live/retained media. API/workspace startup validates the provider; unset disables upload. In-flight eligibility/session/admin revocation and policy/revision races fail closed. Preparation grants no roster/configuration access. Focused/full API, fresh/upgrade parity and S11/organizer browser checks pass; [evidence](../MUSIC_DELIVERY_VALIDATION.md). Production volume/capacity/restore and human/hosted gates remain open.
- [ ] P8-DELIVERY-HARDENING: expand email scheduling/retries/monitoring and schedule/correction templates as those features arrive; clean up expired tokens/files under retention policy, including durable cleanup for older operational images. Private music staging cleanup is delivered separately; committed music versions are not orphans. Existing P2-EMAIL behavior must remain functional throughout.

Exit: media replacement/private access and cleanup tests pass before P5-MUSIC;
production provider configuration fails safely. Delivery enhancements never defer
the basic verification/invitation/recovery email required by M2/M4.

## Phase 9 — Expanded quality and production operations

WEB-STUDIO and WEB-FESTIVAL are independent public release scopes under the
checkpoint; extend the existing deployment/observability/recovery/browser tasks
to those releases. Verify both target hosts, TLS/redirects/locale metadata, private
workspace/auth-link mapping, public versus preview cache rules and persistent
media. Studio content is new; P9-WIX-TRANSITION owns festival archive migration
and authorized Wix cutover. Do not require live judging completion for either
public launch or weaken account-flow release gates. No provider/domain change
is implemented or authorized merely by adding target addresses to the docs.

Baseline CI is P1-CI. Tests, localization/accessibility and privacy apply when each
feature is built, not first in Phase 9. Existing Node/API/PostgreSQL tests remain;
introduce new test libraries only for a concrete need.

- [ ] P9-TEST-SPEED (user-requested, 2026-11-10): focused file/database commands,
  baseline per-suite timings and pnpm-store CI caching are implemented; local
  validation is recorded in [TESTING](../TESTING.md#test-runner-validation-2026-11-10).
  The focused registration baseline passed in 23.99s and full baseline in 154.11s;
  tooling tests, selected browser checks, workspace/Prisma/docs and actionlint passed.
  Full acceptance gates remain required. Next: collect hosted cold/warm cache
  timing, audit environment/generated-client inputs before hosted Turbo caching,
  and isolate shared baseline fixtures before attempting suite parallelism.
  Keep browser workers at two pending repeated comparative measurements.
  The inherited coverage-inventory recognition mismatch is corrected (2026-11-11):
  awaited timed/direct suites count; comments, strings and unused imports do not.
  [Review/application evidence](../APPLICATION_REVIEW_VALIDATION.md) records the
  regression and current validation. This correction does not close the remaining
  hosted measurement/isolation work above.

Development and external release are separate gates under the
[checkpoint](../../DEVELOPMENT_PLAN.md#development-and-release-gates).
P2-SCOPE-DEPLOY, real P2-EMAIL inbox delivery, hosted CI/ingress/rollout/restore
and human language/assistive review stay open until actual evidence exists.
Unavailable hosted accounts do not block isolated P3/P4/P5 development or justify
skipping the implementation queue. Prepare local observability/recovery work
alongside the first release workflow and execute external checks when access is
available; do not wait for judging/results. A concrete security regression or
required operational prerequisite takes priority over the feature queue.

- [ ] P9-UI-REDESIGN (active; cross-phase delivery): rebuild the entire placeholder UI with Hallmark. Follow the [app-wide UX audit](../UX_REDESIGN_PLAN.md), the [redesign brief](../DESIGN_SYSTEM.md#required-full-redesign) and the [delivery order below](#app-redesign-delivery-order). Preserve working contracts, authorization, and ET/EN/RU and accessibility requirements. Record rendered evidence and user acceptance for each slice. The [existing design baseline](../../DESIGN.md) records the previous directions.

  Local rehearsal feedback (2026-11-24): the user found the organizer workspace
  and event setup flow very unintuitive and called for a full UI rebuild. Rebuild
  [S05](../ui/organizer.md#s05--admin-dashboard-and-event-setup) so organizers can
  find their event, open setup and identify the next action without guidance.

  - Offer a searchable country selector and city/venue suggestions while allowing
    manual entry for locations missing from the suggestions.
  - Suggest the event time zone from the selected location. Show the inferred
    zone, allow manual override, and make changes to saved dates explicit.
  - Remove the generic “Choose...” choices from Registration cutoff and Description
    source language. Use an explicit no-cutoff choice where applicable. Keep the
    source language explicit when authors enter a description.
  - Show the selected language in the source text label or adjacent helper text.
  - Replace the language and fallback preview with guidance in the optional
    translation fields that a blank translation uses the source text. Keep this
    guidance available after a field receives focus or is filled.
  - Evaluate animated event artwork separately. The current image contract uses
    single-frame WebP. If animation is supported, define its limits and provide a
    still image for reduced-motion use.
  - Redesign the save confirmation so organizers can tell what was saved and
    see the next action without losing their place in the form.
  - Reassess the persistent setup sidebar. The user found it of little use
    during data entry and questioned its value after saving. Test showing
    setup blockers and available actions where and when they become useful.

  Studio representative sign-in feedback (2026-11-24): the user saw “Access
  denied” immediately after signing in. The regression reproduces an organizer
  return carried through sign-in. The local fix sends a representative to their
  application workspace and keeps the denial on a direct organizer visit.

  Studio representative event discovery feedback (2026-11-24): the user rejected
  the usability of both the [event list and event detail](../ui/account.md#s01--home-and-event-list)
  (S01/S02). Rebuild both screens around the representative's decision to attend
  and their next application action.

  - Lead with the event name, a readable date range, and location. Show the
    application status and deadline together and make the applicable action
    clear (start, resume, or view the application).
  - Remove duplicate event labels, empty optional fields, and the sign-in
    message for signed-in users. Use plain-language application status in place
    of internal stage labels. Show limits and contact details where they help
    the representative act, and show a human-readable time-zone label when needed.
  - Define a consistent date-format policy for list, detail, and cutoff. Prefer
    the user's explicit format preference when available, otherwise use the event
    location's regional format when known. Keep event times and cutoffs in the
    event's configured time zone. Verify the presentation in ET/EN/RU.

- [ ] P9-UI-REGRESSION: start with P2-UI-FOUNDATION/SHELL and expand per feature: minimal interactive component/user-flow tests and reviewed screenshots for delivered S/F IDs at phone/portrait tablet/desktop in ET/EN/RU. Cover focus/error/empty/denied/locked/reconnect states with deterministic synthetic data; record manual screen-reader/keyboard/contrast/touch and fluent-language evidence. No blanket baseline acceptance. UI exit evidence is milestone-scoped and must exist before release, not after all phases finish. See [TESTING](../TESTING.md).

- [ ] P9-BROWSER (initial foundation slice implemented, 2026-10-25): Playwright/Chromium and CI cover synthetic ET/EN/RU foundation states at four widths, keyboard/focus, language preservation, overflow and palette checks. The historical auth/shell/preferences, staff, event setup and review/application snapshot had 156 cases ([evidence](../APPLICATION_REVIEW_VALIDATION.md)); later entry extensions and current full-suite results are tracked in the [checkpoint](../../DEVELOPMENT_PLAN.md#current-state).
  [staff UI evidence](../STAFF_UI_VALIDATION.md) records the S17/F06 extension.
  The completed P9-BROWSER-STAFF execution slice is tracked under P4-STAFF in
  [organizer tasks](organizer.md). Full domain journeys and human review remain open; gate M2 on signup/verify/apply/approve/status, M3 on entries/corrections, M4 on staff acceptance/removal, and M5 on judging/results. Expand CI alongside each journey.
  The user-selected 2026-11-14 CI correction removes the questionnaire EOF blank
  line and restores staff confirmation focus after React commits, independent of
  animation frames. The staff file now has 26 cases; existing assertions and zero
  retries remain. [CI correction evidence](../STAFF_UI_VALIDATION.md#ci-correction-2026-11-14)
  records the failing-before-fix regression, repeated F06 checks and publication
  limits. This bounded correction does not close P9-BROWSER or change P5-ENTRIES priority.
- [ ] P9-OBSERVABILITY: structured safe logging/correlation IDs, error monitoring, metrics, and health/readiness for database/storage/email as applicable. Redact tokens/contact/birth/billing data under P2-PRIVACY before external operation.
- [ ] P9-DEPLOY (user-requested local staging preparation added, 2026-10-25): [STAGING](../STAGING.md), container builds and isolated loopback-only Compose rehearsal are implemented; no hosted account/domain exists. Hosted protected ingress, production configuration, deployment architecture, staging release/migration checklist, and rollback rehearsal before the first external deployment; do not wait for scoring/results.
- [ ] P9-RECOVERY: backups, restore rehearsal, retention and incident/runbook procedures before production data use; expand manual competition fallback before M5. Review privacy/accessibility/localization against actual implemented journeys at each release.

Exit: automated checks gate the released scope, staging deployment/rollback and
restore are rehearsed, observability/runbooks cover external operations, and
keyboard/mobile/ET/EN/RU/privacy requirements pass for each released milestone.

### App redesign delivery order

The 2026-11-25 [audit](../UX_REDESIGN_PLAN.md) supersedes the previous screen
delivery order after the user rejected the rendered experience. The shared
styles and passing workflow assertions are baseline evidence. See the audit
for screen-by-screen decisions, control coverage and Day/Night requirements.

1. [ ] **Role journeys and layouts.** Prototype organizer event-to-Live, applicant
   to next task, and judge sign-in-to-score. Review phone/desktop and Day/Night
   composition through recovery. The three sample journeys and desktop navigation
   comparison are available at `/app/__fixtures/redesign`. Review the complete
   event destination set and role journeys with users before closing.
2. [ ] **Shell and account foundation (S01/S03/S04).** Deliver actionable role
   landings, the focused shell, compact language and appearance controls, smaller
   Material actions, field focus and inline password visibility. Give temporary
   access failures a retry path. Decide current-session sign-out in an ADR before
   changing the contract. The top bar, assignment visibility, applicant landing,
   appearance, focus, inline visibility and sign-in retry copy are implemented
   locally. The header preferences use compact disclosures with visibly selected
   options and descriptions for Venue-aware and Match device. The event-local
   rail and mobile disclosure cover nine organizer destinations. Personal date
   format remains open.
3. [ ] **Venue journeys (S14/S15).** Use the event-scoped organizer route and
   assignment-driven staff views. Prioritize stage controls, sheet entry, status
   and reconnect. The local implementation prioritizes current performance and
   stage commands, keeps later queue positions accessible, and puts score entry
   ahead of receipts and optional comments. Live sign-in preserves the selected
   stage. Keep physical venue rehearsal, workflow acceptance and M5 gates open.
4. [ ] **Organizer and studio journeys (S01/S02/S05–S13/S16/S17).** Deliver
   event discovery/setup, approvals and staff, applications and studio entries,
   then schedule, scoring setup and private results. Verify all interactions,
   localized states and interrupted workflows in each slice. Continue with
   application review and the studio's next-task journey.
5. [ ] **Public studio and festival sites and CMS (S18–S20).** Deliver the
   visitor and editing journeys with published content and linked locale
   navigation. Keep the separate studio and festival release gates.
6. [ ] **Cross-role acceptance.** Complete rendered, behavior, localization,
   keyboard, assistive and real-device reviews in both modes. Record acceptance
   by workflow owner before closing the redesign.

## Deferred optional scope

CSV dancer import, copying previous performances, admin view previews, and broad
dynamic user/role administration are outside M2/M3 core delivery. Restore UI is
separately gated by P3-DATA-HYGIENE restore policy and authorization tests. Keep
these visible as backlog; do not implement them opportunistically or use them to
hold the first usable registration journey open.
