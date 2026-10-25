# Design system and interaction rules

Reviewed: 2026-10-25. Implementation specification, not an installed component
library or approved brand. Use with [UI_UX](UI_UX.md) screen contracts and
[USER_FLOWS](USER_FLOWS.md). [LOCALIZATION](LOCALIZATION.md) owns translation and
semantic-feedback code conventions; [API](API.md) owns DTOs/enums/permissions.

## Direction and adoption

Foundation implementation (2026-10-25): semantic tokens in web/src/index.css and
native controls in components/ui/Foundation.tsx are implemented and checked in
the development-only /__fixtures/foundation route. ET/EN/RU fixtures, measured
contrast and initial Chromium device/keyboard evidence are recorded in
[foundation validation](PHASE_2A_VALIDATION.md). This validates those basic states;
later workflow components, final branding, fluent and screen-reader review remain
open. Static alert previews suppress live announcements; validation announces one
error summary and links focus the relevant field.

Required direction: calm, legible, predictable administration and live operation;
clear action hierarchy and data identity across devices/languages. There is no
approved brand identity, logo, artwork, dark theme or final palette. Do not invent
brand assets. The current app uses light slate surfaces, blue/amber accents,
rounded cards, Sora body and Fraunces display fonts, with one-off gradients/shadows.
Treat that as existing styling, not a validated system.

Foundation token/basic-control defaults are verified for the synthetic states
above; other numeric/type/layout defaults remain **proposed** until their owning
workflow review. Accessibility/interaction/privacy requirements are **required**.
Final branding is UX-D01. Adopt tokens and components incrementally in owning
feature slices; do not broadly restyle unrelated screens or introduce a library
without concrete need. This document adds no CSS or package dependency.

## Color roles and contrast

Use semantic names rather than choosing a Tailwind hue on each page. Candidate
light-theme values below; measure every actual foreground/background pairing,
including hover/focus/disabled/composite surfaces. Meaning always includes text
and, when helpful, an icon. A color token alone never establishes conformance.

| Role / proposed token | Value | Use |
| --- | --- | --- |
| canvas | `#F8FAFC` | Page background |
| surface / surface-muted | `#FFFFFF` / `#F1F5F9` | Cards, tables, grouped controls |
| text / text-secondary | `#0F172A` / `#475569` | Body and supporting copy |
| border-subtle / border-control | `#CBD5E1` / `#64748B` | Decorative divisions / required control boundary |
| action / action-hover | `#1D4ED8` / `#1E40AF` | Main button/link, white on filled button |
| focus | `#1D4ED8` | Visible ring with surface-colored offset |
| success-text / success-surface | `#166534` / `#F0FDF4` | Saved/approved/completed feedback |
| warning-text / warning-surface | `#92400E` / `#FFFBEB` | Attention, waiting for review, incomplete data |
| danger / danger-surface | `#B91C1C` / `#FEF2F2` | Invalid/destructive/rejected |
| info-text / info-surface | `#075985` / `#F0F9FF` | Informational/review states |
| neutral-text / neutral-surface | `#334155` / `#F1F5F9` | Locked/ended/unavailable |
| overlay | `rgba(15,23,42,0.45)` | Modal backdrop only; dialog is opaque |

Required: normal text contrast ≥4.5:1, large text ≥3:1; necessary boundaries,
focus/selection and graphical indicators ≥3:1 against adjacent colors as applicable
under [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Do not use pale divider color as
the sole input boundary. Disabled controls retain readable explanatory copy;
opacity alone must not communicate disabled/locked. No success green for an
unacknowledged save. Avoid score quality heatmaps until scoring policy approves them.

## Typography and numeric presentation

Proposed operational stack: `system-ui, "Segoe UI", sans-serif`, supporting Latin
and Cyrillic. Preserve existing Sora/Fraunces on discovery until branding review
if needed; verify Cyrillic fallback, font loading and layout stability before
approving it. Do not require remote fonts for live scoring to remain usable.

| Token | Size / line height / weight | Use |
| --- | --- | --- |
| caption | 12 / 18px / 400–500 | Noncritical metadata only |
| small | 14 / 20px / 400–600 | Table and supporting text |
| body | 16 / 24px / 400 | Default copy and form inputs |
| lead | 18 / 28px / 400–500 | Short introductions |
| heading-3 | 20 / 28px / 600 | Section/card heading |
| heading-2 | 24 / 32px / 600 | Major section |
| heading-1 | 32 / 40px / 600 | Page heading, may reduce to 28px on phone |
| live-value | 32–48px / 1.2 / 600 | Current number/score summary when useful |

Use rem-based implementation to respect user settings. No essential instructions
at caption size. Use tabular numerals for score, rank, duration and queue columns.
Allow translated headings to wrap; no fixed-height text boxes. Use sentence case,
descriptive action verbs and normal letter spacing for operational labels. Score
precision, locale decimal handling and duration/date formats follow UI_UX and
ADR-004; never silently round user input or show missing scores as zero.

## Geometry, spacing, layers and motion

| Group | Proposed values / rules |
| --- | --- |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64px; 4px base; label-to-control 8, field gap 16–24, section gap 32 |
| Control size | Default input/button 44px minimum height; compact admin 36px if adequate pointer spacing; live actions/score controls 48–56px; icons 16/20/24px with separate target padding |
| Touch targets | Aim ≥44×44px throughout, ≥48px for live controls; required WCAG minimum 24 CSS px or permitted spacing/exceptions. Compact mode does not remove touch alternatives. |
| Radius | 6px control, 8px card, 12px dialog; pill only for badge/avatar, not every control |
| Border | 1px control/divider; visible 2px focus ring plus 2px offset; confirm contrast and high-contrast mode |
| Elevation | Surface 0; card `0 1px 3px rgb(15 23 42 / .10)`; overlay `0 12px 32px rgb(15 23 42 / .20)`; no decorative heavy shadow on live data |
| Layers | Base 0, sticky section 10, navigation 20, popover 30, modal 40, toast 50; no toast obscures modal controls or live primary action |
| Motion | 120–180ms nonessential transitions; respect prefers-reduced-motion; no animated layout shift, flashing deadline, or auto-advance animation |
| Breakpoints | Tailwind defaults: sm 640, md 768, lg 1024, xl 1280, 2xl 1536px; mobile-first with content-based wrapping below each |

WCAG minimum target size is not an instruction to make judge controls 24px. Test
real fingers and keyboard under time pressure. Sticky bars include safe-area
padding and must not cover the focused field/error or mobile keyboard content.

## Layout and containers

Proposed page gutters: 16px phone, 24px tablet, 32px desktop. General content max
width 1200px, dense administration up to 1440px, readable text about 68ch, simple
auth form 448px and ordinary editor 720px. Prefer one primary action per section.
Place context/status and primary task above optional description/imagery.

Phone stacks fields and review details; tablet supports two columns only when
labels/help remain readable; desktop can add 240px navigation and master/detail
review. Never require landscape for live controls. Horizontal table overflow is
a labeled region with visible scroll affordance and keyboard access, not page-wide
overflow. An equivalent mobile list preserves relationships, labels and all
critical actions. Avoid rendering duplicate interactive table/card versions into
the accessibility tree simultaneously. Print/export uses its own privacy-safe
layout, not a screenshot of a private admin table.

## Common component contract

Every interactive component documents variants, sizes, default/hover/focus/active,
disabled, loading, invalid and selected/read-only states as applicable. Use native
HTML first. All have accessible names, visible focus, logical DOM/tab order,
keyboard equivalence and ET/EN/RU text. No arbitrary tabIndex ordering or clickable
divs. Name, role and value must match visible purpose. Icon-only actions have
translated accessible names and a discoverable visible hint.

Native disabled controls prevent action but are not focusable; place the reason
as readable nearby text. If aria-disabled is necessary for discoverability, block
pointer and keyboard activation in code. Read-only data remains selectable and
readable, with an explicit lock reason. Loading preserves button width and name;
prevent duplicate actions for the specific operation without freezing unrelated UI.

## Inputs and actions

| Component / variants | Behavior and states | Accessibility contract |
| --- | --- | --- |
| Button: primary, secondary, quiet, danger; default/compact/live | Primary for task commitment; danger only for destructive action; icon plus text preferred. Enter/Space follows native behavior; pending label and scoped disabled state. | Native button, correct type; no unlabeled icon; actual disabled or enforced aria-disabled with explanation; never rely on hover title. |
| Link: body, navigation, inline action | Use for navigation/download, button for mutation. Body links underlined or otherwise distinguishable without color alone; visited/focus states considered. | Real href, meaningful destination name, current page via aria-current; warn about new tab only when deliberately used. |
| Text/email/password/textarea | Persistent label, required/optional indication, help, preserved value, invalid and read-only variants. Password toggle retains value/focus and allows managers/paste. | Label/id; autocomplete/inputmode as appropriate; aria-invalid and describedby; native form submit, no Enter interception needed for ordinary fields. |
| Select: native single, searchable large dataset | Prefer native select for short options. Searchable selector only for demonstrated volume; keep selected identity when filtering; loading/error/no match distinct. | Full combobox/listbox keyboard and screen-reader behavior if custom; Escape closes, arrows navigate, selection announced. Do not improvise a partial ARIA widget. |
| Checkbox / checkbox group | Independent choices, explicit selected count for participants; mixed select-all reflects current documented scope. | Native checkbox and label; group fieldset/legend; indeterminate announced; select-all does not silently select unseen unauthorized records. |
| Radio group | One choice among mutually exclusive options; do not use for multi-role privileges during public signup. | Native radios with common name, fieldset/legend and arrow-key behavior; option label and help association. |
| Date/time | Calendar and keyboard/manual entry, visible expected format and explicit event timezone. Validate real calendar and DST ambiguity under agreed model. | Native controls preferred; custom picker must support keyboard, localized month/year navigation and focus return; never placeholder-only label. |
| File upload: chooser, optional drop zone, replacement | Limits before selection; selected/uploading/processing/ready/failed/canceled/locked; old file retained until replacement commits. No unsupported resumable-upload promise. | Real labeled file input; keyboard/touch chooser equivalent to drag; named progress/status; accessible cancel/retry/playback, no autoplay. |
| Score input: numeric field, optional +/- controls | Range/step/precision visible per criterion; localized decimal parsing, zero/missing distinct, invalid preserved. Slider only supplementary. +/- uses exact step without exceeding limits. | Criterion label/help/error; appropriate numeric inputmode; named increment/decrement; keyboard edit; do not hijack page shortcuts or change scores by unexpected wheel events. |

Do not leak raw exception messages through tooltips/placeholders. Shared schemas
provide usability validation while backend enforces rules. Current image limits
(JPEG/PNG/WebP, 10 MiB declared-file checks) are not music-upload limits; use the
actual approved media contract before showing accepted music types or sizes.

## Navigation, content and overlays

| Component / variants | Behavior and states | Accessibility contract |
| --- | --- | --- |
| Global/section navigation: expanded/collapsed | Context and authorized destinations stable; collapse on phone; no dead future-feature links. Role/event/studio switch rechecks permissions and unsaved work. | Labeled nav landmarks, skip link, aria-current; disclosure button with expanded/control association; close and restore trigger focus. |
| Account/language selector | Keep language visible on auth and workspaces; native names Eesti/English/Русский; account disclosure includes profile/logout. | Prefer disclosure with ordinary links/buttons; if menu roles used implement full arrows/Escape/focus behavior. Language buttons expose selected state and lang. |
| Tabs: local panels or route navigation | Local tabs only when one task has parallel sections; route tabs are links with actual URLs. Invalid required fields remain discoverable from summary across panels. | Real tablist pattern with selected state, arrows and focus management for panels, or nav links for route tabs; do not mix the semantics. |
| Breadcrumbs | Event → section/studio → record; omit redundant root on simple auth pages. | Labeled breadcrumb nav, ordered list, current text/link marked; separators decorative. |
| Card / summary list | Identity/status/action clear; no decorative card for every label. Empty and failed summaries distinct. | Headings and lists semantic; meaningful link text; no nested interactive controls in a whole-card link. |
| Table: default/compact, selectable, sortable | Admin comparison; column priority, filters, stable sort and pagination. Sorting never silently loses pending edits. | Caption, th scope, real sort buttons/aria-sort; checkbox labels identify row; row action name includes target. Do not use grid role without implementing its keyboard model. |
| Dialog: confirmation/editor | Resource, effect, reversibility, cancel and explicit action; avoid nested modal dialogs; mutation pending keeps dialog open until outcome known. | Named modal dialog, focus moved inside/trapped, background inert, Escape cancels when safe, close restores trigger/logical successor; danger opens at safe action. |
| Drawer: contextual detail/editor | Desktop side detail or phone full-height sheet; retain parent filters and unsaved editor. | Choose modal (dialog rules) versus non-modal complementary region explicitly; non-modal must not trap focus or hide parent from assistive tech. |
| Alert: info/success/warning/error, persistent | Inline near affected section; persistent network/lock/blocker notice; safe retry/contact. Dismiss only when noncritical. | Semantic status for routine updates, alert for urgent blocking error once; text/icon accompany color; no multiple competing live announcements. |
| Toast: confirmation, transient info | Supplementary confirmation only; never sole receipt/error/lock reason. Pause dismissal during focus/hover, no essential action behind short timeout. | Polite announcement, named dismiss, avoid focus theft; required information remains inline. |
| Badge: neutral/info/warning/success/danger | Short translated status, optional icon; selected/locked/draft not interchangeable. | Text meaning; not a button unless separate action; no live region per repeated table badge. |
| Progress: determinate/indeterminate, checklist | Determinate only with actual measurable progress; upload completion not server readiness; step checklist names blockers. | Labeled progress/value for measurable work; status for unknown duration; no fake percentage; announce milestones rather than every increment. |
| Skeleton / spinner | Match loaded structure and reserve space; preserve shell; localized busy label. Avoid flashing skeleton for every background refresh. | Skeleton decorative/aria-hidden, busy region/status provides one description; respect reduced motion; never keyboard-focus placeholders. |
| Audio preview | Explicit playback, progress and error; no auto playback when changing entry. | Keyboard-operable native audio controls preferred, named file/performance context and understandable duration; player remains usable by touch. |

## Form validation and error summary

Required sequence: instructions before entry → gentle validation on committed
field changes/blur → complete schema validation on submit → backend validation
→ shared localized semantic feedback. Do not emit errors on every keystroke for
an untouched field. Preserve input on validation/server failure and language switch.

After failed submit, focus a summary headed with the problem/count; links focus
the exact field or open its section then focus it. Each invalid field has
aria-invalid and error/help IDs in describedby. Root/relationship errors appear
at the relevant group/summary rather than guessed onto an unrelated field. Nested
participant/criterion issues use stable identity-aware field mappings. Explain
how to correct a value with actual safe bounds. Never render raw Zod/server prose,
SQL, token, contact data or unknown diagnostic payloads.

Reuse ErrorFeedback/UiError descriptors and formatIssue/formatSuccess under
LOCALIZATION; extend component focus/inline association as needed rather than
building an independent error format. Current ErrorFeedback is a foundation,
not evidence of full focus handling. Avoid simultaneous assertive and polite
regions repeating the same error. Frontend invalid state must not replace final
backend authorization or cross-field validation.

## Status vocabulary and visual mappings

Translate enum labels by stable key; preserve wire values. Status badge plus
explanation/next action is required where users must act. Map target states only
after their domain contract is approved; UI must not manufacture new enum values.

| Domain | Current or target states | Proposed semantic treatment |
| --- | --- | --- |
| Event, current | PRE_REGISTRATION / REGISTRATION_OPEN / DATA_REVIEW | Neutral preparatory / info open / warning review; show exact permitted action |
| Event, current | FINALIZED / ENDED / CANCELLED | Neutral lock / neutral complete / danger canceled; none implies results published |
| Organization approval, current | PENDING / APPROVED / REJECTED | Warning / success / danger with independent organization label |
| Event registration, current | PENDING / APPROVED / REJECTED / LOCKED | Warning / success / danger / neutral lock; not the same as organization status |
| Invitation, target lifecycle | Invited / accepted / expired / revoked | Info / success / neutral / neutral; delivery failed is separate danger status; existing supersession is not the whole lifecycle |
| Entry submission, target | Draft / incomplete / submitted / correction requested / locked | Neutral / warning / success acknowledgement / warning with scope / neutral lock |
| Score, target | Unsaved / saving / saved draft / submitting / submitted / locked / failed | Warning / info busy / neutral acknowledgement / info busy / success receipt / neutral lock / danger with recovery |
| Live queue, target | Waiting / current / next / paused / skipped / completed / reopened | Neutral / info plus strong identity / neutral / warning / warning / success / warning with audit reason |
| Results, target | Provisional / finalized / published / corrected | Warning private / neutral locked / success public / info with version/reason |
| Connection, target | Connected / reconnecting / offline / stale | Text with last confirmation / info busy / warning / warning; never just a green/red dot |

Target state names here are explanatory labels, not approved schema enums. Final
names/transitions follow ADR-003/004, P3-ENTRIES and P2-STAFF-MODEL. No warning icon
should resemble an action when it is only status. Tables need accessible column
context so two APPROVED badges cannot be confused across organization/event.

## Administration density and live touch rules

Admin default rows about 48px; optional compact rows about 36px for pointer-heavy
desktop work. Phone uses readable summaries and spaced targets. Prioritize identity,
status, deadline/next actor, then actions; move secondary metadata to details.
Right-align numeric comparisons with tabular digits; left-align names/labels.
Provide server pagination/filter contracts when volumes demand them; do not imply
client filtering searches the whole database. Bulk destructive decisions are
deferred until authorization, selection scope, review and partial-failure semantics
are specified. No checkbox alone authorizes bulk approval.

For live use: persistent current performance/stage/connection, 48–56px primary
targets, short stable labels, high contrast and minimal motion. Separate Submit
from next-performance navigation, Advance from Skip/Reopen, and scoring from
moderator commands. Show operation in progress and acknowledgement; never move
the action under a finger. Confirmation is required for consequential exceptions;
routine advancing follows the agreed live model without repetitive modal noise.
No global single-character shortcut active inside score fields; optional shortcuts
must be documented, disableable and safe for assistive technology. Timeout/session
recovery preserves allowed work without silently extending authority.

## Tailwind implementation guidance

Proposed adoption in the existing Tailwind CSS 4 setup:

1. Define semantic theme/CSS tokens centrally in the existing stylesheet entry;
   map colors, typography, spacing and containers once. Use theme variables/classes
   rather than arbitrary hex values, radii or gradients per screen.
2. Add small shared presentational primitives under existing components structure:
   Button/Link styling, Field/ErrorSummary, Input/Select/Checkbox, StatusBadge,
   Alert, Dialog, PageHeader, EmptyState and responsive data presentation. Preserve
   existing semantic-feedback and API layers. Add live-specific score/queue
   components in the owning feature when real contracts exist.
3. Use typed explicit variant/size/state props; centralize class composition
   without adding a styling library by default. A className escape hatch must not
   silently override focus, invalid or disabled behavior. Distinguish link/button
   semantics in implementation, even when styling is shared.
4. Start with the auth/navigation/profile slice; migrate existing event screens
   only as their own slice requires. Remove an old literal-style pattern when
   its replacement is adopted; do not keep two competing shared button systems.
5. Every component example/fixture covers ET/EN/RU long text, keyboard/focus,
   disabled/loading/invalid and narrow viewport. Document intentional exceptions
   with reason and owner. Do not install Storybook or a component framework merely
   to satisfy a documentation checkbox; choose a minimal fixture/gallery approach
   under P9-BROWSER based on review needs.

## Component and visual acceptance

Required evidence per adopted component: actual contrast pairs, keyboard behavior,
screen-reader name/role/value, 320px/zoom/text-spacing behavior, pointer/touch target,
reduced-motion/high-contrast behavior where relevant, and ET/EN/RU output. For
complete processes also check consistent help, redundant-entry reduction,
accessible authentication and error prevention under WCAG 2.2 AA. There is no
conformance claim until the delivered scope is tested.

Proposed visual fixtures: default, focus, invalid, loading, empty, denied and
locked states at phone (390px plus 320px reflow), portrait tablet (768px) and
desktop (1440px). Pin synthetic data/clock/fonts, disable nonessential animation
and exclude private screenshots. Compare both long-language layout and actual
component states; baseline changes require human review, never blanket acceptance.
Visual diffs supplement semantic/user-flow/authorization tests. Regression tools
and budgets are planned work under P2-UI-FOUNDATION/P9-BROWSER, not configured here.
