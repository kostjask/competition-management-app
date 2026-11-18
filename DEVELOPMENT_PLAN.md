# Development checkpoint

Updated: 2026-11-18. This file owns current priority, state summary and release
gates. [Product scope](docs/PRODUCT_SCOPE.md) owns audiences/features; roadmaps own
task checkboxes. [The map](docs/README.md) routes selected work to its docs/source.

## Next action

**Next local task: P5-APPLICATION-ESTIMATES — expected counts per event-local day.**
Define revisioned initial-application estimates and their adjustment/review behavior
using the event's actual calendar days; estimates are not submitted entries.
Preserve the completed application/approval and entry contracts.

The coordinated local P9-WIX-TRANSITION `/app`/legacy-link integration and
P5-ENTRIES with owning S09/S10 are delivered. [Validation and limits](docs/ENTRY_WORKSPACE_VALIDATION.md)
record routing, roster/draft/participant UI, retry/concurrency and isolated
migration/API/browser checks. Existing S20 and organizer entry review are reused.
Music and representative submission remain separately gated M3 work.

P9-WIX-TRANSITION stays open for real content/rights/archive/URL inventory,
ownership/TLS, replacement costs and hosted/human cutover evidence. Keep Wix live.
No deployment, DNS, cookie-scope change or cancellation is authorized. Public
websites retain independent release gates and do not depend on finishing M3/M5.

## Product delivery goal

One organization, two public experiences, one shared administration workspace:

| Area | Target | Scope |
| --- | --- | --- |
| Studio website | neposedo.ee | New public pages: studio/about, teachers, classes/groups, timetable, joining, selected media and contact/social links |
| Festival portal | fest.neposedo.ee | Replace Wix: editions/branding, rules, judges, registration handoff, results/archive and contact |
| Private workspace | fest.neposedo.ee/app initially | Developer/director content administration plus authorized festival representatives, staff and judges |

These are target addresses, not verified DNS or hosted services. The private
`/app` base is implemented and rehearsed locally.
Neposedõ has two teachers and one or two festivals/competitions yearly. Only the
developer and director need content/organization administration. Studio public
content is created from scratch; social accounts continue to carry frequent
updates. No CRM, student/guardian registry, enrolment, attendance, tuition billing,
parent portal or multi-organizer offering. [Scope](docs/PRODUCT_SCOPE.md) owns detail.

## Current state

Source and the workspace/entry slice revalidated locally on 2026-11-18. Older reports retain
their dates; no hosted or application-database state is inferred.

- CMS follow-up: PR #6 and continuation PR #7 are merged into main. Public
  consumers are retained at ee0bf72; the workspace/entry slice starts from that
  clean intended target, matching fetched origin/main with no unmerged remote
  branch or open PR overlap.
  No original CMS work is duplicated. Publication requires the canonical-policy fingerprint from
  private preview; document changes invalidate review/confirmation state. The
  validated follow-up is retained without a new branch/history/publication action.
  [Evidence](docs/CONTENT_EDITOR_VALIDATION.md#continuation-and-revalidation-2026-11-17)
  separates fresh local checks from the original PR's dated evidence. No deployment
  or application-database mutation is part of the Git publication workflow.
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
- P5-ENTRIES and owning representative S09/S10 are complete locally: scoped roster
  create/edit/archive, unscheduled saved drafts, options/participants, withdrawal/
  restore and retained network/session/stale-edit recovery. Migration 42 adds
  dancer revisions and immutable retry receipts. [Evidence](docs/ENTRY_WORKSPACE_VALIDATION.md).
  S11 music and S12 submission remain open; P5-UI-ENTRIES is therefore not closed.
  Initial event-day estimates are next under P5-APPLICATION-ESTIMATES. Music follows
  P3-MUSIC-MODEL → P8-MEDIA → P5-MUSIC; approval, entry review and music acceptance
  remain separate. Live scoring/calculated results remain Phase 6–7 work.
- P4-PUBLIC-MODEL's design prerequisite and P4-PUBLIC-EDITOR implementation are
  locally complete and retained. The [CMS contract](docs/api/content.md) owns `/app/content` editing,
  immutable revisions/receipts, rights-gated normalized rasters/cleanup and explicit
  published JSON. P4-STUDIO-PAGES/P4-PUBLIC-PAGES now supply isolated public HTML
  consumers and live metadata/sitemaps. The coordinated `/app`/legacy identity-link
  transition and opt-in loopback festival cohost are implemented and rehearsed;
  production ingress and cutover remain unverified external work.
  Existing event/judge/image authentication remains required. Wix archive
  attribution, placeholder contact and owner/export/rights verification remain
  migration/release gates. Public raster cleanup is independent of private music.
- The repository contains **42 migrations**. Migration 42 adds positive dancer
  revisions, immutable actor/target/body-bound receipts and atomic safe audit
  metadata; migration 41 retains CMS ownership/history and migration 40 its
  published correction. All 42 passed disposable fresh/upgrade/catalog parity
  and full API baseline checks. Last application-database evidence remains
  2026-11-14 (1–39 applied, 40 pending); that database was not inspected or migrated
  here. No current hosted success is inferred.
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
| 1 | P4-PUBLIC-EDITOR — complete locally | Shared CMS and S20/F12 delivered; validation/release limits above |
| 2 | P4-STUDIO-PAGES — local consumer complete | Isolated request-rendered studio site; WEB-STUDIO still requires its own integration/material/hosted/human gates |
| 3 | P4-PUBLIC-PAGES — local consumer complete | Isolated festival portal/edition rules/judges/archives and truthful handoff; WEB-FESTIVAL remains unreleased |
| 4 | P9-WIX-TRANSITION — local integration complete; external gates open | Coordinated `/app`/legacy identity links and opt-in cohost validated; real content/archive/URL and hosted replacement evidence required; retain Wix |
| 5 | P5-ENTRIES with P5-UI-ENTRIES S09/S10 — complete locally | Scoped roster and saved entry/participant drafts with recovery; broader UI task stays open for S11/S12 |
| 6 | P5-APPLICATION-ESTIMATES — next local task | Initial expected entry counts per actual event-local day; preserve completed M2 contracts |
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
