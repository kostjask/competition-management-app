# Design: Dance competition operations

Implementation baseline for the P4-CORE organizer/event slice, selected with
Hallmark on 2026-11-10. This establishes a reusable direction; it is not human
visual approval or completion of P9-UI-REDESIGN. The required scope and functional
constraints remain in [the design system](docs/DESIGN_SYSTEM.md).

## System

- Genre: modern-minimal. Shape: app screens, no marketing hero.
- Theme: Cobalt, selected from the three-theme Hallmark deal after inspecting its
  reference alongside Broadside and Dusk.
- Material: cool paper, graphite, ruled facts, precise control edges, one cobalt
  action. The organizer's registration readiness is the signature, not artwork.
- Typography: local system-ui/Segoe UI with Latin/Cyrillic fallback. No new remote
  font dependency; titles and controls share this operational family.
- Layout: readiness and lifecycle rail beside the editor on desktop; sequential
  regions on phones. Event discovery uses a date/name/action index; event details
  use a fact sheet with a real image only when available.

## Tokens and controls

[Scoped tokens](apps/web/src/features/events/design/tokens.css) own this slice.
[Scoped foundations](apps/web/src/features/events/design/base.css) and
[composition](apps/web/src/pages/events/event-setup.css) consume them.

Paper, graphite, ink, muted text, rule, accent, focus and semantic feedback roles
are tokens. Spacing uses the shared scale and the named page/column/row tokens.
Controls have a 44px minimum hit area, 6px fallback corners, a restrained key edge,
instant focus rings, native disabled states and acknowledged inline outcomes.
Required boundaries maintain 3:1 contrast and text maintains 4.5:1.

## Motion and content

Motion is limited to short control feedback and is removed for reduced motion.
No decorative animation, invented statistics, logo, stock photo or proof is used.
Authored descriptions use explicit source language and labeled fallback, with
plain-text rendering and actual HTML lang. UI copy remains ET/EN/RU.

## Adoption

P8-MEDIA/P5-MUSIC extend Cobalt to the application-owned music child workspace.
Current event/studio identity, explicit limits and a ruled current-version ledger
precede the chooser. One URL-selected track and native audio replace a decorative
media gallery. Upfront limits use MiB/seconds and clearly labelled UTC windows;
the organizer's rule disclosure and reasoned correction remain native forms.
Progress distinguishes transfer from server validation, stop is available before
the first progress event, and uncertain writes retain their File/operation for
retry or explicit saved-state comparison. No imagery or material slots are needed.
Human language/assistive/visual acceptance remains a separate release gate.

P5-APPLICATION-ESTIMATES adds an event-day/count ledger to S08 and its owning S06
review. Native labelled counts expose every real calendar day and explicit zero;
current event timezone accompanies the form. The editor retains local values
through errors/session recovery; explicit server comparison controls replacement.
Reasoned organizer corrections and immutable snapshots use a disclosed ruled
history, separate from approval actions. Existing Cobalt tokens, instant focus,
44px controls and ET/EN/RU remain; no images or material slots are needed.
P3-MUSIC-MODEL introduces no premature upload/playback or acceptance controls.

P5-ENTRIES extends the locked Cobalt app system to a searchable studio roster,
calendar-date editor and unscheduled draft/participant workspace at the `/app`
base. The shared organizer editor uses a paired basic/final desktop form and a
sequential phone form, native searchable checkboxes, actual selection counts,
saved issue links and current field availability. Inline receipt/conflict/archive
states retain work and focus. Rendered review removed duplicate/misleading lock
guidance and kept refresh with the other actions. No images, material slots,
palette, remote font or shell replacement are introduced; human acceptance remains
separate. [Validation](docs/ENTRY_WORKSPACE_VALIDATION.md).

P4-STUDIO-PAGES/S18 and P4-PUBLIC-PAGES/S19 introduce separate public reading
surfaces in `packages/public-site`, preserving the locked Cobalt paper/local
Latin/Cyrillic face without importing the authenticated shell or client. Direct
section links, a real class/timetable opening ledger and a stable edition archive
carry the design. Studio branding is stable; festival action/focus roles use only
the shared accessible cobalt/forest/brick choices. Authored text and reviewed
rasters supply the material; no invented photographs, proof, statistics or empty
image frames. Non-home document titles outrank item headings; the studio directory
uses three balanced links. No animation or browser script is needed. Explicit
fallback, no-store errors and responsive no-script links preserve all content at
320–1920px. [Evidence](docs/PUBLIC_SITES_VALIDATION.md) separates technical/visual
checks from approved real material and human language/assistive acceptance.

This baseline covers organizer dashboard, event create/setup, authenticated
list/detail and the P4-REVIEW/P5-APPLICATION S06–S08 slice: independent decision
ledger, ruled queue/detail, short application form and profile/contact editors.
URL filters retain the selected studio; phone layouts stack the same information.
P3 ownership/constraint work extends this system to a read-only performance
register: ruled desktop rows, labelled phone rows, a persistent URL studio filter,
direct owning-application links and ledger-shaped loading placeholders. It adds
no entry editor or fabricated submission/music status. The Hallmark finish review
resolved the loading shape; no imagery or material slots are needed.
P3-HISTORY/CALENDAR-DATES extend the register with a URL-selected, ruled revision
ledger and the event-local age reference date. Captured studio/configuration names
and explicit migration provenance carry the history; participant personal details
stay out of the rendered register. Loading, empty, error/retry, session restoration
and close-to-trigger focus use the same controls and ET/EN/RU system.
P3-ENTRIES-DRAFT adds an inline owner/optional-title form, honest missing-field
summaries and separate stage-order availability. Uncertain saves retain their
operation and fields across filters/session recovery. New nullable snapshots use
the same ledger with explicit unselected labels. Presence never implies eligibility
or submission. No material/image slots are needed.
The shared shell, auth, staff and unfinished workflows retain their
own bounded P9-UI-REDESIGN slices. Preserve their behavior during future adoption;
do not interpret the old visuals as approved or restyle unrelated screens within
P4-CORE or its P4/P5 review/application extension. Human visual, fluent-language
and assistive review remain open.

ADR-025 extends the Cobalt register with studio-wide basic/final checkpoint views,
URL-selected one-at-a-time review, immutable confirmation ledgers, field-scoped
reopening and organizer entry detail/participant editing. A separate inline rules
view offers enabled checkpoints, event-zone deadlines, older-dancer percentages,
credit requirements and nomination overrides. Frozen policy is distinguished from
editable deadlines. Native controls, exact field links, truthful acknowledgements
and retained same-operation retries carry the workflow; no new imagery is needed.

The withdrawal/preset extension adds an active/withdrawn URL filter, retained inline
reason/confirmation and an acknowledged restore outcome with focus return. The
rules view copies the real Dance Express nomination table after confirmation and
creates ordinary options inline; category/age filters keep the working set small.
The preset disclosure closes after copying; the withdrawn empty state explains
how to find active entries. Finite/unbounded limits use native nullable controls.
No imagery, new palette, remote font, shell replacement or material slots are needed.
Technical checks and rendered review remain separate from human visual approval.

The 2026-11-17 CMS continuation keeps the revision ledger and native section
editor. Phone ledger facts use compact paired rows and secondary receipt details
stay disclosed. Private preview receives focus when ready and offers a return
to its trigger. The reviewed canonical facts travel with that preview; document
switches and conflicts require a fresh review before publication. The fresh
Hallmark finish review's two usability findings were resolved and recaptured.

P4-PUBLIC-EDITOR extends Cobalt to the shared CMS at the current `/content` paths.
One URL-selected structured section sits beside a draft/published revision ledger.
Exact IDs and publication impact use native disclosures to keep phone editing
usable; the full identities remain inspectable. Private locale preview, explicit
confirmation, server/local comparison and receipt reconciliation retain state
through session recovery. Teacher/class/timetable and edition content are bounded
native forms; Event facts stay read-only with owning-editor links. Media has
document-owned upload and explicit rights/retirement actions. No stock material,
new shell, remote font or public-page composition is introduced. Static Hallmark
and Playwright rendered evidence are in [CMS validation](docs/CONTENT_EDITOR_VALIDATION.md);
human visual, fluent-language and assistive approval remain release gates.

The review/application finish pass resolved misleading filtered-empty guidance
and repeated approval copy. The two decisions, contact and actual mail state
carry the hierarchy; no imagery or material slots are needed. Validation and
current local completion limits: [review/application evidence](docs/APPLICATION_REVIEW_VALIDATION.md).
