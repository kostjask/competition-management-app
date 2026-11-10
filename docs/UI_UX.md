# UI and UX specification

Target specification established 2026-10-25; route/source facts refreshed 2026-11-10.
Documentation only; no runtime validation, accessibility conformance or release
completion is implied.

## Scope, authority, and reading order

The user has rejected the current UI as a placeholder and requires a full
[Hallmark redesign](DESIGN_SYSTEM.md#required-full-redesign). The functional
screen/flow contracts below remain requirements; existing visual appearance and
proposed styling do not establish an approved design.

UI and UX are one delivery contract: user goals, permissions, transitions and
recovery determine the page hierarchy, controls, feedback and responsive layout.
Use this document before implementing an affected page, together with its flow
and component rules. Deliver API, domain, interface, translations and tests as a
vertical slice under the [development plan](../DEVELOPMENT_PLAN.md).

| Source | Maintained responsibility |
| --- | --- |
| [USER_JOURNEYS](USER_JOURNEYS.md) | Product intent, terminology, account eligibility and journey outcomes |
| [USER_FLOWS](USER_FLOWS.md) | Detailed steps, state transitions, failure/recovery and flow acceptance |
| This document | Implementation audit, navigation, screen specifications and experience requirements |
| [DESIGN_SYSTEM](DESIGN_SYSTEM.md) | Visual tokens, reusable components and interaction rules |
| [API](API.md), [registration workflow](REGISTRATION_API.md) | Implemented HTTP contracts and workflow boundaries |
| [LOCALIZATION](LOCALIZATION.md) | Implemented dictionary, semantic feedback and locale rules |
| [database review](DATABASE_REVIEW.md), accepted [ADRs](adr/001-studio-identity-and-event-registration.md) | Persistence, security and architecture decisions |

Evidence labels throughout:

- **Current**: observed in the working tree on the audit date, not proof of deployed behavior.
- **Required**: confirmed target from repository instructions, accepted ADRs or existing journey requirements; may be unimplemented.
- **Proposed**: recommended implementation default; validate with the owning slice.
- **Open**: product/domain decision required before dependent behavior. See the decision register below.

Existing ADRs take precedence over proposals here. Do not reinterpret a UI label
as a database status or expose a private endpoint to satisfy a proposed screen.

## Product experience principles

1. Make the next permitted action obvious. Pair status with who acts next, the
   deadline when configured, and a recovery/contact path.
2. Keep event, studio and stage visible. Multi-role users deliberately select an
   authorized workspace; never infer context from the last unrelated action.
3. Separate account access, organization verification, event approval, entry
   submission, score submission and result publication. Each has distinct authority.
4. Report server truth. Saved, submitted, locked and published require an
   acknowledged response; a lost response is an uncertain outcome to reconcile.
5. Preserve work through validation, network and session failures within the
   agreed privacy policy. Never promise durable drafts or offline writes before
   their storage, conflict and recovery contracts exist.
6. Prioritize fast, predictable live operation over decoration. No surprise
   navigation, moving action targets or hidden stage changes.
7. Build ET/EN/RU, accessibility and narrow-screen use with every feature.

## People, goals and constraints

| Actor | Goal and priority | Constraints and dashboard priority |
| --- | --- | --- |
| Public visitor/spectator | Find competition information and published results | No account required by target policy; public DTO/access decision is open. Today event reads require login. Home explains available access without promising public discovery. |
| Unauthenticated applicant | Start studio onboarding or recover access | Preserve selected event/language; never offer staff-role selection. Existing-account sign-in and recovery are visible. |
| Pending applicant | Track application and act on organizer feedback | Legitimate roleless account; application home must use membership/ownership rather than representative-role gating. |
| Administrator | Configure event, resolve approvals, prepare and publish | Dense lists, many records, concurrent operators; dashboard prioritizes event setup blockers, pending decisions and missing data before totals. |
| Studio representative | Maintain roster, entries and music, meet deadlines | Often phone-based and interrupted; dashboard prioritizes approvals, deadlines, corrections and incomplete entries for the selected studio/event. |
| Judge | Score the assigned current performance accurately | Tablet/phone, glare, fatigue, weak connectivity, time pressure; dashboard is assignment/readiness followed by scoring, never other judges' scores by default. |
| Moderator | Operate the correct stage and monitor completion | Tablet/laptop, rapid repeated actions, noisy venue; dashboard prioritizes current/next, blockers, completion and connection health. |
| Multi-role user | Switch authorized responsibilities safely | Explicit event/role selection; avoid automatic scoring or stage mutation when switching context. Warn about unsaved changes. |

Administration may be optimized for desktop but must support essential review
and recovery on mobile. Judges and moderators require complete touch and keyboard
operation in either device orientation. Public views must exclude private dancer,
birth-date, contact, billing and unpublished scoring data.

## Audit of the current experience

Source review: 2026-11-10. Updated event setup/list/detail behavior is validated in [P4-CORE evidence](EVENT_SETUP_VALIDATION.md); other observations below remain source review. The original mixed-date
[audit table is archived](DEVELOPMENT_HISTORY.md#ui-source-audit-archived-2026-11-10).
Use the checkpoint/roadmaps for delivery and release status; this specification
owns target behavior, not a second implementation checklist.

- Auth, owner drafts/recovery, shell/session, profile language and scoped staff UI
  are mounted. API identity eligibility, invitation reconciliation and private
  image authorization are enforced. See [contracts](API.md) and [security](SECURITY.md).
- Event discovery is authenticated; create/edit routes require admin. Event forms
  expose event-zone/DST/deadline/contact/checklist and authored-content controls under P4-CORE/ADR-020.
- The organizer dashboard prioritizes setup blockers; other role dashboards remain placeholders. Application/review, entry/music and
  live/scoring/results screens remain their owning roadmap scopes. Event details
  show the actual application window and explain that the application form is pending; P5-APPLICATION owns
  the future apply/resume routes and actions.
- Automated Chromium coverage exists for delivered slices; real inbox/hosted,
  full-journey human language and assistive review remain release evidence.

## Information architecture and navigation

Required global shell: skip link, home/events, language, authenticated workspace
entry, account/profile/logout, main landmark and consistent help/contact location.
Auth shell retains home, language and selected-event context without unrelated
management navigation. One page H1, meaningful translated document title, then
context/status, primary action, work content and secondary/history content.

Proposed workspaces use an event selector and role navigation; representative
views also show studio. Admin: Overview → Setup → Applications → Entries/review →
Staff → Schedule → Results. Representative: Applications → Studio → Dancers →
Performances/music → Review/receipt. Judge: assignment/current sheet and own
submission status. Moderator: selected stage queue/completion/recovery.
Only show delivered, authorized destinations. Do not render dead navigation for
future features. On a direct forbidden URL show an actionable denied page rather
than quietly returning home; inaccessible/missing IDs retain API privacy behavior.

Breadcrumbs on nested management pages show event → studio/section → item.
Preserve authorized filters and scroll position on return from detail. Keep
filters in validated non-sensitive query parameters; no contacts, tokens or
birth dates in ordinary navigation URLs. Distinguish no records from no matches.

## Route inventory

Frontend URLs below are distinct from `/api/v1` endpoints. **P** means proposed,
unmounted route; spelling is a default to confirm within its owning slice. Route
parameters must be encoded. Keep canonical existing auth URLs and `/login` alias.

| Screen ID | Route | Current implementation / target gate |
| --- | --- | --- |
| S01 | `/`, `/events` | Home is minimal; authenticated event index delivered in P4-CORE |
| S02 | `/events/:id` | Event-zone facts, content fallback/contact/window state; setup/staff/review and application/status links |
| S03 | `/auth/login`, `/auth/register`, `/verify-email`, `/login` | Existing pages; alias redirects to login |
| S03 | `/auth/forgot-password`, `/auth/reset-password`, `/auth/resend-verification`, `/auth/correct-email`, `/auth/onboarding` | Mounted recovery and owner draft pages; ADR-017 |
| S04 | `/auth/profile` | Identity read-only; explicit account/email language save/clear |
| S05 | `/admin`, `/events/new`, `/events/:id/edit`, `/admin/events/:eventId/setup` | Setup/checklist/lifecycle/editor plus separate pending review counts/queue links delivered locally |
| S06 | `/admin/events/:eventId/applications` | Independent queues/detail, reasons, confirmation, history and truthful notification states |
| S07 | `/applications`; `/representative` | Role-independent application home delivered; representative entry console remains placeholder |
| S08 | `/events/:id/register`, `/events/:id/studio?studio=:studioId`; P `/studios/:studioId` | Application/status/profile/contact delivered; standalone studio route remains proposed |
| S09 | P `/studios/:studioId/dancers` | List/editor, P5-ENTRIES |
| S10 | P `/events/:id/studios/:studioId/performances`, nested `/new`, `/:performanceId/edit` | P5-ENTRIES |
| S11 | P performance editor `/music` child | P5-MUSIC; concrete parent is S10 item |
| S12 | P `/events/:id/studios/:studioId/review`, `/admin/events/:id/review` | P5-SUBMISSION/P4-ENTRY-CONFIG |
| S13 | P `/admin/events/:id/schedule` | P6-SCHEDULE |
| S14 | `/moderator`; P `/moderator/events/:id/live` | Placeholder; P6-MODERATOR |
| S15 | `/judge`; P `/judge/events/:id/score` | Placeholder; P6-JUDGE |
| S16 | P `/admin/events/:id/results`, `/events/:id/results` | P7-PUBLISH; public route gated by approved DTOs |
| S17 | I `/auth/accept-invitation`, `/admin/invitations`, `/admin/events/:eventId/staff`; P `/studios/:studioId/representatives` | P2-INVITE/P4-STAFF/P5-MEMBERS |

Route facts above are checked against src/routes/index.tsx; proposed paths remain
subject to their owning task. Event create/edit have route-level admin guards;
backend writes independently require global admin. Preserve deliberate not-found
and translated denied recovery as nested screens arrive.

## Responsive and live-event requirements

Required: usable at 320 CSS px, 200% text enlargement and 400% zoom/reflow;
no page-wide horizontal overflow except genuinely two-dimensional data areas.
See [design tokens and layouts](DESIGN_SYSTEM.md) for proposed breakpoints.

| Context | Layout and interaction |
| --- | --- |
| Mobile, below 768px | One primary column; collapsible labeled navigation; forms stack with full-width main action; summary lists retain item identity/status/action; tables use labeled overflow or equivalent cards. No hover-only help. |
| Tablet, 768–1023px | One or two columns according to content; judge rubric and moderator controls stay touch-sized; portrait remains fully usable. |
| Desktop, from 1024px | Sidebar/context plus wide work area; admin tables and optional review detail pane; critical action/status visible without reading decorative content. |

Live requirements: show event/stage, performance number/title, current/next,
server acknowledgement and connection state persistently. Keep submit and advance
away from destructive controls. Repeated taps produce one operation. Do not advance
focus or switch performance while a judge is editing without reconciling the
server version and preserving permitted pending work. No score-dependent stage
advance based only on local completion counters. Moderator sees completion rather
than peer values unless an explicit policy permits more. Provide approved manual
fallback/runbook and reconnection rehearsal before M5. Offline support is open;
until resolved, disable unsafe writes while disconnected and state what is unsaved.

## Shared UI-state and recovery contract

Every screen below inherits this table; its own specification lists additions.

| State | Required behavior |
| --- | --- |
| Initial loading | Preserve shell/context; label the busy region and use a structure-matching skeleton or status; no empty-state flash. |
| Background loading | Keep acknowledged data visible, label freshness; disable only actions whose prerequisites are uncertain. |
| Empty / filtered empty | Explain absence versus no matches; offer the next authorized action or reset filters. |
| Validation | Preserve values, field-linked summary and inline errors; focus summary after failed submit. No raw server prose/PII. |
| Server/transport error | Localized explanation, safe retry/contact; stale data marked. Never render failure as an empty success. |
| Offline | Persistent connection warning, last confirmation time, explicit unsaved state; no unsupported offline-success claim. |
| Reconnecting | Show progress; refetch identity, stage, permissions, revisions and operation outcome before re-enabling writes. |
| Success | Inline confirmation/receipt after server acknowledgement; optional toast supplements durable important evidence. |
| Locked / disabled | Explain cause, responsible actor, deadline and permitted correction/contact path; retain authorized read access. |
| Permission denied | No protected content flash; sign-in with safe return for guests, contextual denied page for authenticated users; honor API 404 privacy. |
| Conflict / uncertain response | Preserve local values; retrieve authoritative state and offer compare/reload/reapply. Never blindly repeat create, submit, publish or advance. |

Use confirmation for pending application cancellation, archive, file replacement,
entry final submit, accepted-access removal, reopening, finalization and publication.
Show named resource, exact scope, consequences, reversibility and explicit verb.
Focus the safe action for destructive dialogs. Ordinary field saving needs no
confirmation. Cancel returns to unchanged context. Undo appears only when a real
authorized reversal exists; soft deletion does not imply restoration support.
An acknowledged action followed by notification failure remains saved; offer
notification retry separately. Session expiry must restore authorized progress
under P2-SESSION; do not persist passwords, tokens or private drafts in arbitrary
browser storage. No automatic retry of non-idempotent mutations.

## Localization and formatting

Required: all application UI, accessible labels, errors, statuses, emails and
exports for a delivered slice in ET/EN/RU, following [LOCALIZATION](LOCALIZATION.md).
Render descriptors at display time so existing errors retranslate without losing
form values/focus. Current precedence is explicit session choice, account
preference, saved browser choice, supported browser language, then `et`, under
ADR-013 and [localization policy](LOCALIZATION.md). Profile saves are explicit.
Translate role/stage labels by stable keys, never authorize against translated text.
Do not translate personal names, studio names or performance titles automatically.
Organizer-authored content follows I18N-CONTENT, with a visible fallback language.

| Value | Required format and pending dependency |
| --- | --- |
| Event/deadline instant | ISO offset/UTC at API; Intl display in explicitly shown IANA event timezone after P3-REGISTRATION. Proposed initial organizer choice Europe/Tallinn must be confirmed, never silently inferred from browser locale. Current DTO includes timeZone (default UTC) and nullable registrationDeadline; P4-CORE now implements event-zone controls. |
| Date/time entry | Labeled date/time and timezone; resolve or reject DST gaps/ambiguities explicitly. P4-CORE datetime-local uses the selected event zone with DST gap/fold handling. Include exact date/time for deadlines, not relative text alone. |
| Birth date | Calendar `YYYY-MM-DD` API value; locale display without instant conversion/day shift. Age calculation needs configured date/rule. |
| Names | Preserve Unicode, spaces, hyphens and supplied order; account full name differs from dancer first/last fields. Do not enforce Latin-only names or use initials as the only accessible identity. |
| Numbers/counts | Intl.NumberFormat and locale plural messages; preserve stable IDs and unformatted machine payloads. No concatenated translated sentences. |
| Scores | Show agreed range, increment, precision and missing marker; zero is a valid value when rubric allows it. Accept localized decimal input then validate canonical exact representation under ADR-004. No silent rounding. |
| Duration | Labeled minutes/seconds or unambiguous `mm:ss`, canonical integer seconds; distinguish from clock time. |

Test Cyrillic font coverage, long Russian/Estonian labels, narrow layouts, leap
dates, DST boundaries and language changes during visible errors and pending work.
No unconfigured billing currency/fees are implied by invoice-detail fields.

## Accessibility and perceived performance

Required target: complete delivered processes meet [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/).
Include semantic headings/landmarks/forms, persistent labels, keyboard access,
visible unobscured focus, skip navigation and announced status/error changes.
Text contrast is at least 4.5:1 (large text 3:1); required control boundaries and
indicators meet 3:1. Do not rely on color or position alone. Aim for 44px targets;
WCAG AA minimum is 24 CSS px or its allowed spacing/exceptions. Dragging needs a
single-pointer alternative. Support paste/autofill/password managers; no
memory/puzzle-only authentication. Meet reflow, text-spacing and orientation rules.

On navigation, update title and focus the page heading/main once ready. On dialog
close restore trigger focus or the next logical control if removed. Inline errors
use aria-invalid/describedby; async status uses polite announcements, urgent
blocking errors alert once, with no repeated score-queue announcements per poll.
Avoid aria menu/tab roles unless full keyboard behavior exists. Reduced motion
removes nonessential animation. Verify keyboard plus screen reader manually;
automated checks and screenshots alone cannot establish conformance.

Proposed performance budgets to validate on representative mobile/venue networks:
visible interaction feedback within 100ms; a labeled wait state for operations
exceeding 1s; longer waits expose recovery without false completion. Target LCP
≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile for released pages. Proposed
live draft acknowledgement target ≤1s and queue freshness ≤2s on the agreed venue
network; P6-RECOVERY must decide transport, staleness threshold and fallback before
release. These are targets, not measured guarantees or a timeout/retry policy.
Lazy-load feature sections, reserve image dimensions, paginate large admin data,
avoid fetching full rosters for public summaries, and keep live updates from
reordering a control under a pointer. Record test device/network/data volume.

## Screen specifications

Read the selected group plus its relevant flow. Every screen inherits the shared
state/responsive/locale/focus/permission contracts above and DESIGN_SYSTEM.
Pending contracts do not authorize invented frontend endpoints.

| Screens | Contracts |
| --- | --- |
| S01–S04 | [Discovery and account](ui/account.md) |
| S05–S06 | [Organizer setup and review](ui/organizer.md) |
| S07–S12 | [Studio applications and entries](ui/studio.md) |
| S13–S16 | [Schedule, live operation and results](ui/competition.md) |
| S17–S17 | [Staff and representative invitations](ui/invitations.md) |

## Decision register and implementation gates

This register separates accepted subsets from unresolved choices. It does not
authorize new domain behavior or mark an implementation/release task complete.
Record substantial decisions in their owning ADR before dependent schema/code.

| ID | Options / recommendation | Owner and gate |
| --- | --- | --- |
| UX-D01 Branding | User direction accepted 2026-11-10: entire current UI is a rejected placeholder; fully reimagine/redesign using Hallmark. Replacement visual system/brand remains to be designed; preserve functional and accessibility/localization contracts. | [Full-redesign brief](DESIGN_SYSTEM.md#required-full-redesign); P9-UI-REDESIGN tracks delivery, separate from local technical completion |
| UX-D02 Public access | Keep authenticated events versus publication-safe discovery; recommend explicit public event/results DTOs with publication controls, never opening private current DTOs. | ADR-002 follow-up before public event/result release; P7-PUBLISH |
| UX-D03 Account/session recovery | Accepted in ADR-013/016/017: server-owned owner drafts, HttpOnly browser cookies/native bearer separation, explicit internal returns and neutral recovery. | Delivered local scope in foundation roadmap; external workflow review remains |
| UX-D04 Locale/content | ADR-013 defines account/recipient precedence; ADR-019 accepts M2 authored-content source-language and explicit fallback. Later workflow content remains open. | I18N-PREFERENCES delivered locally; I18N-CONTENT remains open for storage/editors/later workflows |
| UX-D05 Registration policy | M2 application policy accepted in [ADR-003](adr/003-registration-lifecycle.md): independent decisions, deadline/timezone, retained revisioned cancel/reapply, semantic reasons and pending profile correction. Entry transitions remain M3. | P3 registration backend/contracts delivered; P4/P5 screens remain pending |
| UX-D06 Entries/history | Draft representation, versioned submission, withdrawal, corrections and global roster locks; recommend server drafts without schedule position plus revision-based conflict detection. | P3-ENTRIES/HISTORY/OWNER and ADR-001 migration before related P5 UI |
| UX-D07 Eligibility/media | Age date/leap rules, participant/duration limits, required music, formats/limits and replacement; recommend explicit upfront event rules and server enforcement. | P3-CALENDAR-DATES/ENTRIES/MUSIC-MODEL before M3 |
| UX-D08 Staff authority | ADR-013/017/018 select global-admin staff management with explicit event scope and retained offboarding. Studio inviter/member extension remains P5-MEMBERS; separate stage authority remains a live-model decision. | Staff model/UI delivered locally; member/live extensions retain their own gates |
| UX-D09 Live/recovery | Single/multiple stages/sessions, transition authority, offline blocked versus durable queued drafts, freshness thresholds and manual fallback; recommend acknowledged online operations first, explicit read-only offline status until reconciled. | ADR-003 live portion/P6-RECOVERY before live UI promises |
| UX-D10 Scoring/publication | Rubric precision/rounding/ties/penalties, peer visibility, lock/reopen authority and correction publication; recommend exact versioned rules and explicit final submission/publication. | ADR-004/P6-SCORING-MODEL before score/results implementation |

## Slice acceptance and next implementation

Every delivered screen must have its route/client/DTO/permission map reviewed;
all listed states demonstrated; ET/EN/RU terminology reviewed; keyboard/focus and
screen-reader behavior checked; phone/tablet/desktop and long text verified; and
negative ownership/stage/session/retry tests. Record evidence by screen/flow ID,
revision, locale, viewport and role. Use [testing strategy](TESTING.md); browser
and visual regression infrastructure exists for delivered slices. Extend it with
each workflow; this documentation change reruns no browser evidence.

P2-UI-FOUNDATION/SHELL are delivered locally. Current UI priority follows the
[checkpoint](../DEVELOPMENT_PLAN.md#implementation-order): P4-CORE setup, P4-REVIEW,
then P5-APPLICATION. The first complete product UX milestone remains M2
(verify → apply → independent approvals → resume status), with all release gates.
