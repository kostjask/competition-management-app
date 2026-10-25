# UI and UX specification

Audited: 2026-10-25. Documentation only; no screen, API, migration, accessibility
conformance, or release completion is implied.

## Scope, authority, and reading order

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

Static source audit; no browser usability or assistive-technology test was run.
Sources: [routes](../apps/web/src/routes/index.tsx), layouts, all current pages,
auth guards/context, API modules, i18n and feedback components; backend router,
controllers, shared schemas, Prisma model and the related maintained guides.

| Finding / mismatch | Evidence and intended resolution | Owner |
| --- | --- | --- |
| Product signup is studio-focused; current signup is generic | ADR-006 versus RegisterPage/auth API. Enforce recoverable onboarding on backend; do not merely relabel signup. | P2-SIGNUP |
| Verification instructions exceed runtime enforcement | RegisterPage asks users to check email; login still permits unverified accounts and delivery is a stub. | P2-AUTH/EMAIL |
| Event screens look public but data is protected | `/events` and detail lack route auth guards; API reads require auth per ADR-002. Explicit sign-in state now; public release only after DTO/publication decision. | P2-UI-SHELL; UX-D02 |
| Dead application links and incorrect stage availability | EventInfo links `/events/:id/register` and `/events/:id/studio`; neither route exists. It offers application in DATA_REVIEW; backend only allows new non-admin applications in PRE_REGISTRATION/REGISTRATION_OPEN. | P5-APPLICATION |
| Guards disagree about roles and omit consistent event scope | useRole uses exact display names; RequireRole uses fuzzy display names. Backend profile already exposes keys/scopes. Denied guards redirect home without explanation. | P2-ROLES |
| Interrupted authentication loses task | Login restores pathname only; token-bearing 401 hard redirects; verification sends users home after a timer and is guest-gated. Signed-in/wrong-account email links need deliberate recovery. | P2-SESSION/AUTH |
| Missing invitation and recovery screens | `/accept-invitation` is used by email but absent; password reset, resend/revoke UI/API are incomplete. Judge record and role remain separate. | P2-INVITE/JUDGE-ACCEPT |
| Dashboards and profile controls overpromise | Four role pages are text placeholders; profile Edit has no handler and account menu says Edit Profile. Remove misleading actions or deliver a supported contract. | P2-UI-SHELL; feature phases |
| Event form omits stored setup details and controlled transitions | EventForm collects name/dates/stage; edit initializes only those. Venue/limits/image/timezone/deadlines/checklist need feature work; raw stage selector is not a transition workflow. | P3-REGISTRATION/P4-CORE |
| Draft, music, live and results promises exceed persistence | Performance create needs complete fields and stage order; Score has free-form criterion/Float, no sheet locks. No music/live/results endpoints or screens. Keep these as gated targets. | Phases 3, 5–7 |
| Localization foundation is stronger than visible UI | Semantic feedback and three catalogues exist; auth/layout/profile/dashboard literals and profile date-fns formatting remain. Existing date formatter uses browser timezone; event timezone is absent. | I18N-UI/FORMATTING |
| Accessibility and visual patterns are inconsistent | Login/register use click handlers rather than semantic form submit; AuthNav declares menu roles without complete menu keyboard handling; AuthLayout removes focus outline; spinner has English label. No shared tokens, skip link or complete focus contract. | P2-UI-FOUNDATION/SHELL |

P2-SCOPE-INTEGRITY is technically complete under ADR-008; P2-SCOPE-DEPLOY remains
open. This static UI audit does not claim deployed-data, staff-onboarding or
browser/assistive-technology validation.

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
| S01 | `/`, `/events` | Home is minimal; list implemented partially; protected data |
| S02 | `/events/:id` | Partial details with dead application links |
| S03 | `/auth/login`, `/auth/register`, `/verify-email`, `/login` | Existing pages; alias redirects to login |
| S03 | P `/auth/forgot-password`, `/auth/reset-password` | P2-AUTH/SESSION contracts first |
| S04 | `/auth/profile` | Read-only data; Edit is inert |
| S05 | `/admin`, `/events/new`, `/events/:id/edit`; P `/admin/events/:id/setup` | Dashboard placeholder; partial forms; P4-CORE |
| S06 | P `/admin/events/:id/applications` | P4-REVIEW |
| S07 | `/representative`; P `/applications` | Placeholder; new role-independent application home |
| S08 | P `/events/:id/register`, `/events/:id/studio`; P `/studios/:studioId` | First two already linked but unmounted; P5-APPLICATION |
| S09 | P `/studios/:studioId/dancers` | List/editor, P5-ENTRIES |
| S10 | P `/events/:id/studios/:studioId/performances`, nested `/new`, `/:performanceId/edit` | P5-ENTRIES |
| S11 | P performance editor `/music` child | P5-MUSIC; concrete parent is S10 item |
| S12 | P `/events/:id/studios/:studioId/review`, `/admin/events/:id/review` | P5-SUBMISSION/P4-ENTRY-CONFIG |
| S13 | P `/admin/events/:id/schedule` | P6-SCHEDULE |
| S14 | `/moderator`; P `/moderator/events/:id/live` | Placeholder; P6-MODERATOR |
| S15 | `/judge`; P `/judge/events/:id/score` | Placeholder; P6-JUDGE |
| S16 | P `/admin/events/:id/results`, `/events/:id/results` | P7-PUBLISH; public route gated by approved DTOs |
| S17 | P `/accept-invitation`, `/admin/events/:id/staff`, `/studios/:studioId/representatives` | P2-INVITE/P4-STAFF/P5-MEMBERS |

Current role-section unknown children redirect to their root. Add deliberate
not-found handling as nested screens arrive; do not let a typo masquerade as a
successful visit. Event create/edit currently lack route-level admin guards;
backend still enforces admin-only writes. Shell repair must align visibility and
direct navigation without treating a frontend guard as authorization.

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
form values/focus. Current initialization is saved choice → supported browser
language → `et`; cross-device/account/email preference precedence is still open.
Translate role/stage labels by stable keys, never authorize against translated text.
Do not translate personal names, studio names or performance titles automatically.
Organizer-authored content follows I18N-CONTENT, with a visible fallback language.

| Value | Required format and pending dependency |
| --- | --- |
| Event/deadline instant | ISO offset/UTC at API; Intl display in explicitly shown IANA event timezone after P3-REGISTRATION. Proposed initial organizer choice Europe/Tallinn must be confirmed, never silently inferred from browser locale. Current DTO has no timezone/deadline fields. |
| Date/time entry | Labeled date/time and timezone; resolve or reject DST gaps/ambiguities explicitly. Current datetime-local uses browser timezone and is a known gap. Include exact date/time for deadlines, not relative text alone. |
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

These are unresolved choices, not authorization to implement new domain behavior.
Record substantial decisions in their owning ADR before dependent schema/code.

| ID | Options / recommendation | Owner and gate |
| --- | --- | --- |
| UX-D01 Branding | Preserve current Sora/Fraunces styling versus neutral system stack; recommend neutral operational UI, reserve display typography for discovery after Cyrillic/fallback review. No approved logo, brand palette or final assets exist. | Product/design before final visual approval; does not block accessible structural components |
| UX-D02 Public access | Keep authenticated events versus publication-safe discovery; recommend explicit public event/results DTOs with publication controls, never opening private current DTOs. | ADR-002 follow-up before public event/result release; P7-PUBLISH |
| UX-D03 Account/session recovery | Cookie versus bearer storage, onboarding persistence before/after verification, cross-tab/device return and enumeration policy; recommend server-owned recoverable context and allowlisted internal destinations. | P2-SESSION/ONBOARDING-MODEL/IDENTITY-TOKENS before signup/recovery UI |
| UX-D04 Locale/content | Account/email preference precedence and required authored translations/fallback; recommend deterministic recipient locale and explicit content fallback. | I18N-PREFERENCES before P2-EMAIL; I18N-CONTENT before organizer content publication |
| UX-D05 Registration policy | Deadlines/timezone, cancellation/rejection/resubmission, reasons and corrections; recommend separate named transitions for each approval and entry action. | P3-REGISTRATION, ADR-003 application portion before P4/P5 application slice |
| UX-D06 Entries/history | Draft representation, versioned submission, withdrawal, corrections and global roster locks; recommend server drafts without schedule position plus revision-based conflict detection. | P3-ENTRIES/HISTORY/OWNER and ADR-001 migration before related P5 UI |
| UX-D07 Eligibility/media | Age date/leap rules, participant/duration limits, required music, formats/limits and replacement; recommend explicit upfront event rules and server enforcement. | P3-CALENDAR-DATES/ENTRIES/MUSIC-MODEL before M3 |
| UX-D08 Staff authority | Organizer management and studio inviter scope versus admin-only; recommend least privilege with explicit event/studio membership and separate stage-control permissions. | P2-STAFF-MODEL before invitations; P5-MEMBERS before member extension |
| UX-D09 Live/recovery | Single/multiple stages/sessions, transition authority, offline blocked versus durable queued drafts, freshness thresholds and manual fallback; recommend acknowledged online operations first, explicit read-only offline status until reconciled. | ADR-003 live portion/P6-RECOVERY before live UI promises |
| UX-D10 Scoring/publication | Rubric precision/rounding/ties/penalties, peer visibility, lock/reopen authority and correction publication; recommend exact versioned rules and explicit final submission/publication. | ADR-004/P6-SCORING-MODEL before score/results implementation |

## Slice acceptance and next implementation

Every delivered screen must have its route/client/DTO/permission map reviewed;
all listed states demonstrated; ET/EN/RU terminology reviewed; keyboard/focus and
screen-reader behavior checked; phone/tablet/desktop and long text verified; and
negative ownership/stage/session/retry tests. Record evidence by screen/flow ID,
revision, locale, viewport and role. Use [testing strategy](TESTING.md); browser
and visual regression infrastructure remains planned, not installed by this work.

First proposed UI slice: **P2-UI-FOUNDATION**, then **P2-UI-SHELL** paired with
P2-ROLES: shared controls/feedback/focus, translated responsive navigation,
explicit protected-event/denied states and honest profile actions. It can be
reviewed with fixtures while the required security work proceeds, but cannot
release gated management/upload workflows early. The first complete product UX
milestone remains M2 (verify → apply → independent approvals → resume status).
