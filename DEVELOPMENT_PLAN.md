# Development checkpoint

Updated: 2026-11-16. This file owns current priority, state summary and release
gates. [Product scope](docs/PRODUCT_SCOPE.md) owns audiences/features; roadmaps own
task checkboxes. [The map](docs/README.md) routes selected work to its docs/source.

## Next action

**Next: P4-PUBLIC-EDITOR — controlled shared CMS with S20/F12.**
P4-PUBLIC-MODEL's [design](docs/adr/026-studio-and-festival-platform.md#concrete-model-and-publication-design)
and [source inventory](docs/PUBLIC_CONTENT_INVENTORY.md) are complete as a design
prerequisite. Implement its structured storage/shared contracts, draft/authorized
preview/explicit publication, public-read boundary and the owning organizer UI.
Include audit, conflict/same-operation recovery, ET/EN/RU and Hallmark/browser
acceptance. No speculative CRM or production service changes.

This deliberately supersedes the earlier M3-first/public-after-M3 ordering.
P5-ENTRIES remains the next participant-workflow task with prerequisites delivered;
its backend work is retained. Public websites do not depend on completing M3/M5.
The ordered queue below owns subsequent selection.

## Product delivery goal

One organization, two public experiences, one shared administration workspace:

| Area | Target | Scope |
| --- | --- | --- |
| Studio website | neposedo.ee | New public pages: studio/about, teachers, classes/groups, timetable, joining, selected media and contact/social links |
| Festival portal | fest.neposedo.ee | Replace Wix: editions/branding, rules, judges, registration handoff, results/archive and contact |
| Private workspace | fest.neposedo.ee/app initially | Developer/director content administration plus authorized festival representatives, staff and judges |

These are target addresses, not verified DNS, hosted services or mounted routes.
Neposedõ has two teachers and one or two festivals/competitions yearly. Only the
developer and director need content/organization administration. Studio public
content is created from scratch; social accounts continue to carry frequent
updates. No CRM, student/guardian registry, enrolment, attendance, tuition billing,
parent portal or multi-organizer offering. [Scope](docs/PRODUCT_SCOPE.md) owns detail.

## Current state

Source reviewed on 2026-11-16; runtime evidence below remains dated, not rerun.

- Current branch/upstream/intended target are main/origin/main/main at c12df16.
  Authorized fetch and open-PR inspection succeeded on 2026-11-16: no divergence
  or open PR overlap. The working tree was initially clean. No branch, merge,
  commit, push or deployment is part of this design task.
- Auth/session/locale, controlled staff invitations/offboarding, organizer event
  setup and independent application/review workflows are delivered locally.
  [Review evidence](docs/APPLICATION_REVIEW_VALIDATION.md) and owning roadmaps
  retain exact scope; M1–M5 external release gates remain open.
- P3-PERFORMANCE-OWNER/CONSTRAINTS/HISTORY/CALENDAR-DATES/ENTRIES and
  P4-ENTRY-CONFIG are complete locally. Explicit immutable ownership, nullable
  unscheduled drafts, saved revisions, studio-wide BASIC/FINAL checkpoints,
  any-older percentage eligibility, withdrawal/restore/resubmission and organizer
  configuration/review/recovery are retained. [ADR-025](docs/adr/025-entry-submission-lifecycle.md),
  [recovery evidence](docs/ENTRY_RECOVERY_VALIDATION.md) and
  [checkpoint evidence](docs/ENTRY_CHECKPOINT_VALIDATION.md) own policy/results.
- P5-ENTRIES representative S09/S10, music and submission UI remain open. Initial
  event-day estimates are P5-APPLICATION-ESTIMATES. Music follows
  P3-MUSIC-MODEL → P8-MEDIA → P5-MUSIC; approval, entry review and music acceptance
  remain separate. Live scoring/calculated results remain Phase 6–7 work.
- P4-PUBLIC-MODEL is complete as design only: ADR-026 defines identities,
  publication/recovery/asset boundaries, locale/host/rendering/route transition,
  with S20/F12 editor scope. Live Wix inventory found disputed archive attribution
  and a placeholder mail target; owner/export/rights verification remains a
  migration/release gate. No CMS/public APIs, public pages, schema or /app base
  are implemented. Existing event/judge/image authentication remains required;
  public raster cleanup is independent of private-music prerequisites.
- The repository contains **40 migrations**. Migration 40 corrects migration 39's
  cross-schema AuditLog constraint lookup without rewriting published history.
  [Migration CI evidence](docs/TESTING.md#migration-ci-correction-2026-11-14)
  owns validation; no current hosted success is inferred. Last application-database
  evidence (2026-11-14) has migrations 1–39 applied, migration 40 pending. No fresh
  database inspection or migration was performed for this audit.
- The full Hallmark redesign direction remains active. Bounded Cobalt organizer
  work is recorded in [DESIGN](DESIGN.md); technical test completion is not human
  visual approval of either public site or the complete workspace.
- External blockers remain intended-target assignment provenance, real staging
  inbox delivery, hosted CI/ingress/shared limits, deploy/rollback/restore,
  observability and delivered-scope human ET/EN/RU/assistive review. Public launches
  consume their own subset; email-dependent account flows still require real mail.

The preceding long checkpoint and branch/validation narratives are preserved in
[the 2026-11-14 snapshot](docs/history/checkpoint-2026-11-14.md).
[Development history](docs/DEVELOPMENT_HISTORY.md) routes older evidence;
[the documentation audit](docs/DOCUMENTATION_AUDIT.md#product-replan-2026-11-16)
records this review and its limits. Development data is disposable only under the
[verified-target policy](AGENTS.md#development-database-policy).

## Task map

Phase numbers assign technical ownership; outcome dependencies determine delivery.
Existing task IDs and technical completion remain valid.

| Scope | Task file |
| --- | --- |
| Phase 0–1 completed technical slices | [Completed](docs/roadmap/completed.md) |
| Phase 2A foundations / 2B auth and onboarding | [Foundation](docs/roadmap/foundation.md) |
| Phase 3 participating-studio registration / entry data | [Registration](docs/roadmap/registration.md) |
| Phase 4 organizer setup / review | [Organizer](docs/roadmap/organizer.md) |
| Phase 5 applicant / representative UI | [Studio](docs/roadmap/studio.md) |
| Phase 6–7 scheduling / judging / results | [Competition](docs/roadmap/competition.md) |
| Phase 8–9 providers / quality / operations; optional backlog | [Operations](docs/roadmap/operations.md) |
| Cross-phase studio/festival websites / CMS / Wix replacement | [Website](docs/roadmap/website.md) |
| Cross-phase I18N tasks | [Localization](docs/roadmap/localization.md) |
| Documentation tasks | [Documentation](docs/roadmap/documentation.md) |

## Development and release gates

| Gate | Required before | Implication |
| --- | --- | --- |
| Local technical prerequisites | Dependent design/code/migrations/UI | Consume implemented auth/scope/audit/contracts as applicable; do not block isolated work on missing hosted evidence. A concrete security regression takes priority. |
| Domain/model decisions | Dependent behavior/schema changes | P4-PUBLIC-MODEL/ADR-026 design is complete for CMS/edition/publication/URL/storage; implementation must enforce it. Existing registration/entry/staff ADRs remain; live/scoring require their own decisions. |
| Intended-target deployment safety | Retained/hosted migration/deployment and event deletion | P2-SCOPE-DEPLOY, verified target/provenance, backups and coordinated rollout remain mandatory where consumed. Disposable local policy does not cover other targets. |
| External workflow release | Exposing each released workflow | Require its implementation, hosted CI/ingress/observability/deploy/restore and human language/assistive checks. Real mail is required for released verification/invitation/recovery flows. |
| Public publication | Anonymous content/assets/results | Explicit published DTOs/assets/revisions, private previews and cache/unpublish rules; no private participant data or scoring drafts. Content publication never changes event stage or approvals. |

Public websites need no visitor login. Shared administration does not grant
public access to protected APIs or staff access to unrelated tasks. A limited
public-site launch may link to the approved existing registration/contact method;
it must not promise unfinished application/scoring functions. Deployment/domain
changes and cancelling Wix require explicit authorization after reviewable checks.

## Implementation order

This queue supersedes the 2026-11-14 ordering. It prioritizes a coherent public
presence without discarding the completed festival foundations. No task is marked
complete by the replan. Select the first actionable unchecked task by default.

| Order | Task | Dependencies / outcome |
| --- | --- | --- |
| 1 | P4-PUBLIC-EDITOR | Shared developer/director CMS, controlled access, drafts/preview/publish and reusable edition setup; P4-PUBLIC-MODEL design prerequisite delivered |
| 2 | P4-STUDIO-PAGES | New studio public site consuming CMS; no student-management data; WEB-STUDIO can release after its own gates |
| 3 | P4-PUBLIC-PAGES | Festival public portal, published edition rules/judges/archives and truthful registration handoff |
| 4 | P9-WIX-TRANSITION | Content/archive/URL migration and rehearsed replacement; retain Wix until verification and authorized cutover |
| 5 | P5-ENTRIES with P5-UI-ENTRIES S09/S10 | Next participant slice; ownership/checkpoint/config prerequisites already delivered locally |
| 6 | P5-APPLICATION-ESTIMATES | Initial expected entry counts per actual event-local day; preserve completed M2 contracts |
| 7 | P3-MUSIC-MODEL → P8-MEDIA → P5-MUSIC → P5-SUBMISSION | Explicit music policy/private-media gates before complete M3 submission |
| 8 | Phase 6–7 model/consumer tasks | Consume required M3/M4 workflows; live/scoring/recovery decisions before dependent screens and M5 |

When external domain/hosting/content access blocks cutover, keep that gate open
and continue the first actionable local participant task; do not wait on accounts
or bypass release criteria. P4-STUDIO-PAGES and P4-PUBLIC-PAGES share model/editor
prerequisites but each has independent acceptance. P4-STAFF remains locally
complete; future member/reuse work retains its own policy and identity gates.
P3-STUDIO-NAMES/IDENTITY with P5-REUSE precede cross-event shared-roster reuse;
indexes/data hygiene follow actual queries/invariants. Phase 3 stays open.

Attach existing authorization/audit, ET/EN/RU, component/browser/recovery and
rendered/Hallmark acceptance to each slice. Cross-cutting UI/QA tasks are
acceptance owners, not duplicate queue slots or a reason to finish future screens.
Do not count execution subdivisions as separate existing tasks when asked for the
next N tasks. New prerequisites/overlap require an explicit justified queue update.

## Milestone gates

Public outcomes are added alongside existing operational milestones; no M1–M5
requirement or completed technical slice is removed.

| Milestone | Outcome | Required work |
| --- | --- | --- |
| WEB-STUDIO | Director can maintain and publish the new studio website | P4-PUBLIC-MODEL/EDITOR/STUDIO-PAGES; approved new content/media; domain/HTTPS, public boundary, SEO/locale, backup/restore and human review for released scope |
| WEB-FESTIVAL | Useful Wix functionality and archives replaced | P4-PUBLIC-MODEL/EDITOR/PUBLIC-PAGES and P9-WIX-TRANSITION; verified registration handoff, historical links and authorized domain/cancellation steps |
| M1 | Stable technical/security foundation | Phase 1; P2-SCOPE-INTEGRITY/SCOPE-DEPLOY/IDENTITY-TOKENS/AUDIT/PRIVACY/AUTH/ROLES (including ADMIN-SCOPE)/BOUNDARIES (including UPLOADS/ERRORS)/SESSION/INVITE-IDENTITY |
| M2 | Verified applicant applies to one event, tracks both approvals and resumes; organizer configures/reviews | M1; P2-ONBOARDING-MODEL/SIGNUP/EMAIL; P3-REGISTRATION (including REAPPLY); P4-CORE/REVIEW; P5-APPLICATION |
| M3 | Approved representative saves entries/music, submits and handles corrections | M2; P3-PERFORMANCE-OWNER/CONSTRAINTS/HISTORY/CALENDAR-DATES/ENTRIES; P4-ENTRY-CONFIG; P5-ENTRIES/MUSIC/SUBMISSION; P8-MEDIA |
| M4 | Intended staff accepts scoped invitation; removal preserves history | M1; P2-STAFF-MODEL/INVITE/JUDGE-ACCEPT/OFFBOARD/EMAIL; P4-STAFF |
| M5 | Rehearsed competition operation, recovery and reproducible published results | M3 + M4; Phases 6–7; applicable Phase 9 operations |

Every external milestone needs delivered-scope P9-BROWSER/OBSERVABILITY/DEPLOY/
RECOVERY and applicable locale/accessibility/privacy review. M1 needs
I18N-CONTRACT/CORE/VALIDATION; M2/M4 add delivered I18N-UI/FORMATTING/PREFERENCES/QA;
M3/M5 extend to entries/scoring/exports/results. Public content consumes ADR-019
and its own locale/metadata/editor QA. Historical published documents need no
score import; new calculated results require Phase 7. No external milestone is
currently declared complete. Pending external evidence is not a blanket local
development gate or authorization for publishing unfinished workflows.

## Completion rules

**Technical slice:** explicit scope; reviewed schema/migration/preservation and
rollback implications; aligned shared contracts/DTOs/client paths; backend
authorization, relationship, inactive-record, invalid-input and conflict checks;
applicable commands actually pass; docs/plan/evidence and final diff updated.
Exceptions must be explicit. Existing completed backend slices stay completed
when separately scoped UI/provider/audit work is pending.

**Releasable workflow:** all milestone prerequisites plus usable UI, truthful
server acknowledgement, safe retries and network/session/stage/conflict recovery;
ET/EN/RU including errors/emails, locale metadata/formatting and fluent review;
keyboard/focus/screen-reader and phone/tablet/desktop checks; durable sensitive
audit events and negative scope tests; browser and staging/deploy/restore evidence
tied to revision. No phase/milestone closes with required work unfinished.

For UI work, read only the relevant S01–S20 screen, F01–F12 flow and UX-D decision
in [UI_UX](docs/UI_UX.md), [USER_FLOWS](docs/USER_FLOWS.md) and
[DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md). They define target behavior, not delivered
features. [TESTING](docs/TESTING.md) owns commands and evidence requirements.
