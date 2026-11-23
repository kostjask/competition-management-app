# Development checkpoint

Updated: 2026-11-23. This file owns current priority, state summary and release
gates. [Product scope](docs/PRODUCT_SCOPE.md) owns audiences/features; roadmaps own
task checkboxes. [The map](docs/README.md) routes selected work to its docs/source.

## Next action

**Next task: P6-RECOVERY venue rehearsal.** Name the stage lead and judge devices,
verify venue connection health and latency, and approve the manual continuation
record before a cross-device F08/F09 rehearsal. Rehearse a lost acknowledgement,
connection interruption, reassignment and the pause-and-verify handoff. S14 and S15
implement local acknowledged HTTP and exact-operation recovery under
[ADR-031](docs/adr/031-live-scoring-reconnect.md). P6-RECOVERY, P6-UI-LIVE and
M5 retain their venue and human acceptance gates.

The user directed results to stay private on 2026-11-23.
[ADR-032](docs/adr/032-private-results.md) and migration 48 complete P7-CALCULATE
locally and add source-pinned private S16 finalization. The organizer
reviews category/age/format ranks and outstanding sheets, saves a calculation
and confirms the selected revision. P7-PUBLISH, P7-EXPORT and the public portion
of S16 remain open. Resume public work after an agreed release and correction
policy. The venue rehearsal remains the first actionable operational task.

S16 browser verification covered ET/EN/RU at 320–1920 px, focus return,
session recovery and exact receipt reconciliation. The full browser run
passed 483 cases and flagged two. The updated event-setup navigation assertion
and the performance-register case interrupted by a loopback connection error
both passed on rerun. Hallmark static and rendered checks found no open issues.
Migration 48 passed fresh, existing-data upgrade and catalog parity checks.
The full disposable API baseline passed, including grouped golden results,
frozen-source reproduction, scope, stale and repeated commands, and audit
rollback. Workspace tests, typecheck, lint, build, Prisma generation, validation
and format checks passed. The documentation checker passes with only the
pre-existing ignored `.hallmark/pr-body.md` broken link excluded.

PR #12 CI repair (2026-11-21): the failed Workspace check was S20's delayed
preview/document-switch browser case. Private preview results now retain their
document/revision identity; request cleanup runs at the document commit. The
regression waits for the intercepted request, committed destination and released
response, covers late success/error, and requires a fresh destination preview
before publishing. Local checks pass: 20 delayed-response stress cases, all 441
browser cases, workspace tests/typecheck/lint/build and Prisma checks. The standard
documentation check retains its pre-existing ignored scratch-link failure; all
162 repository documents pass with that scratch directory excluded. PR #12 is
already merged; the repair is included in PR #13, which owns hosted validation. This focused
correction does not change the queue below.

PR #13 target integration (2026-11-21): merged main at `6515dfd`
into the existing scoring/CI-repair branch without rewriting history. The target tree is
identical to the branch's earlier schedule commit `f06194f`; all 24 conflicts
resolve to the current branch's source. The resolved tree before this status
update exactly matches `171734b`, preserving migrations 46/47, scoring and the
CMS fix. Integration revalidation passes: all 67 CMS/schedule/scoring browser
cases, workspace tests/typecheck/lint/build and Prisma validation/format checks.
The prior full 441-case browser run remains source-identical; it is not counted
as a new full run. Repository documentation and whitespace checks pass with ignored
scratch excluded; the standard checker still encounters the existing scratch link.
The user authorized completing and publishing the merge after automatic approval
review requested explicit Git authorization. Hosted validation belongs to PR #13;
no phase or release gate changes.

The user accepted the recommended [scoring policy](docs/SCORING_MODEL_DECISIONS.md)
on 2026-11-21. [ADR-004](docs/adr/004-exact-scoring.md), additive migration 47 and
[the scoring contract](docs/api/scoring.md) implement exact rubric versions,
frozen per-performance panels/sheets, submission locks, reasoned correction and
private reproducible calculations. The organizer rubric/category/panel workbench
includes ET/EN/RU, source-bound preview and exact-operation recovery.
[Evidence](docs/SCORING_VALIDATION.md) records local completion of
P6-SCORING-MODEL/P6-TEMPLATES: full API/migration/workspace checks, 440 full browser
cases, 23 affected cases and clean Hallmark static/rendered review. S14, P7 and
the venue and M5 release gates remain open.
The user accepted the recommended [live policy](docs/LIVE_MODEL_DECISIONS.md) on
2026-11-21. [ADR-030](docs/adr/030-session-queues.md), migration 46 and the
[schedule contract](docs/api/schedule.md) implement explicit stages/sessions,
revisioned queues and organizer scheduling with source-bound preview/confirmation.
[Validation](docs/SCHEDULE_VALIDATION.md) records completed local delivery of
P6-LIVE-MODEL and P6-SCHEDULE/S13: full workspace/API/migration checks, 417 full
browser checks and the final 20-case S13 recovery/filter rerun pass. START/ADVANCE,
LIVE entry and finalization now consume ADR-004 readiness/completeness rather
than an unimplemented constant gate. A reasoned admin advance override never
makes missing sheets complete. Event setup now initiates LIVE after explicit
confirmation and server readiness checks. S16 now owns private finalization.
Local M3/M4 prerequisites are available; human/hosted release and M3/M5 remain open.

[Submission evidence](docs/SUBMISSION_VALIDATION.md) records the field-linked
checklist, independent music notices, source-pinned confirmations, durable receipts,
scoped correction and exact-operation/session/navigation recovery. Final workspace,
full disposable API baseline and 40 affected browser checks pass; preserved
documentation scratch-link and CRLF-only format-check limits are explicit.

P8-MEDIA and P5-MUSIC/S11 are delivered locally with organizer policy, private
content validation/staging, atomic replacement, exact-operation recovery,
current-version playback and reasoned music acceptance/correction. [Evidence](docs/MUSIC_DELIVERY_VALIDATION.md)
records migration 45, disposable API/migration checks, 20 focused localized music
browser cases and the complete browser run plus one interrupted-case rerun.
Actual event policy, production volume and human/hosted release evidence remain
open. The repository documentation checker has one pre-existing ignored PR
scratch-link failure; task-owned documentation links are valid.

P5-APPLICATION-ESTIMATES with owning S06/S08 and P3-MUSIC-MODEL are delivered
locally. [Evidence](docs/APPLICATION_ESTIMATES_MUSIC_VALIDATION.md) records actual
event-day counts, revisioned adjustments/review/recovery, private music metadata
and isolated migration/API/browser checks. Estimates never change approvals or
create entries; the model adds no premature upload/playback controls.

The coordinated local P9-WIX-TRANSITION `/app`/legacy-link integration and
P5-ENTRIES with owning S09/S10 are delivered. [Validation and limits](docs/ENTRY_WORKSPACE_VALIDATION.md)
record routing, roster/draft/participant UI, retry/concurrency and isolated
migration/API/browser checks. Existing S20 and organizer entry review are reused.
Representative submission is delivered locally; entry and music workflows retain external release gates.

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

Source, session scheduling, scoring and private results reviewed locally on 2026-11-23. Older reports retain
their dates; no hosted or application-database state is inferred.

- S15 is complete locally. `/app/judge` links to a private own-sheet workspace
  with frozen rubrics, localized exact input, server-confirmed lock and corrections.
  ADR-031 keeps unsaved drafts in the tab, reads exact receipts before retry and
  protects the selected performance during stage or connection changes. Main and
  `origin/main` matched at `5ef6e75`, including merged PR #13. No open PR or older
  branch needed integration for S15. [Validation](docs/JUDGE_VALIDATION.md).
- S14 is complete locally with the moderator/organizer console, current/next queue and
  frozen-panel acknowledgement counts, reasoned exceptions and a last-read
  handoff. The moderator and judge share the live connection policy. The
  moderator compares an exact receipt with current server state before retrying.
  Venue measurement, approval of any manual continuation and human rehearsal
  remain open under P6-RECOVERY. [Validation](docs/MODERATOR_VALIDATION.md).
- Integration review on 2026-11-21: fetched origin/main 6515dfd includes schedule
  PR #12 and has an identical tree to current branch HEAD f06194f. There are no
  open PRs; the current schedule tip and two older implementation tips are
  patch-equivalent to merged work, with no code integration needed. No merge,
  branch/history change, commit or push was performed in this continuation.
  The scoring policy was accepted before implementation. Existing proposal edits
  were preserved/extended; application-database state was not inspected or changed.
- Earlier integration base: main cd5c7a5 includes submission PR #11, private-music PR #10, estimate/music-model PR #9,
  workspace/entry PR #8,
  public consumers and CMS PRs #6/#7. At that earlier validation, fetched origin/main matched
  HEAD. No open PR overlapped that work; the two old implementation
  branches are patch-equivalent to PRs #10/#11, with no integration needed.
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
- P6-LIVE-MODEL and P6-SCHEDULE/S13 are complete locally under ADR-030. Explicit
  session queues, eligible entry snapshots, dancer/stage timing checks, atomic
  moves, immutable acknowledgements and current moderator authority are tested.
  Organizer UI retains drafts through stale/uncertain/session recovery; print
  references all acknowledged queues. ADR-004 supplies backend scoring readiness.
  Venue, human and hosted release remain open. The canonical docs checker retains one pre-existing
  ignored PR scratch-link failure; repository docs pass when that scratch is excluded.
- P6-SCORING-MODEL/P6-TEMPLATES are complete locally under ADR-004. Rubric/category
  versions, exact values, frozen panels/sheets, submission locks, reasoned
  correction/deductions/disqualification, private reproducible calculations and
  the ET/EN/RU organizer workbench are validated. LIVE entry rechecks current queue
  eligibility; normal advance/finalization require complete sheets, and reasoned
  admin overrides never fabricate completeness. [Evidence](docs/SCORING_VALIDATION.md).
  P6-RECOVERY venue work, P7 and release gates remain open.
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
  S11 music and S12 submission are now delivered; P5-UI-ENTRIES is complete locally.
  P5-APPLICATION-ESTIMATES now supplies initial and adjusted actual-day planning
  counts plus S06/S08 reasoned organizer review/history. P3-MUSIC-MODEL defines
  application-owned tracks, immutable versions/receipts and separate confirmation/
  acceptance. [Evidence](docs/APPLICATION_ESTIMATES_MUSIC_VALIDATION.md).
  P8-MEDIA/P5-MUSIC now supply explicit revisioned limits/windows, private local
  staging/cleanup/current-version delivery and S11 plus organizer review under
  ADR-029. Commit-time eligibility/session/admin checks cover in-flight revocation.
  P5-SUBMISSION supplies field-linked blockers, independent music notices, current
  server availability, source-pinned commands, focused receipts and scoped
  correction/resubmission. [Evidence](docs/SUBMISSION_VALIDATION.md) records final
  validation and known check limits. Approval, entry review and music acceptance
  stay separate. Session scheduling is delivered locally; scoring/results
  and venue operation retain their Phase 6–7 decision/release gates.
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
- The repository contains **48 migrations**. Migration 48 adds immutable private
  result revisions and event-local finalization without reclassifying terminal
  events. Migration 47 adds immutable exact
  rubric/sheet/operation/calculation history with relational ownership and retained
  calculation inputs. All 47 pass fresh/upgrade/catalog parity and the full
  disposable API baseline. Legacy Float scores are unchanged. Migration 46 adds explicit session
  queues and immutable schedule acknowledgements; no legacy order/history is
  rewritten. Browser/integration limits are in the schedule evidence above. Migration 43 adds immutable
  application estimates; migration 44 adds private music metadata, exact-owner
  relations and immutable version/operation history. Migration 45 adds explicit
  music policy, correction windows, staging and immutable audit extensions. Migration 42's dancer
  receipts and earlier CMS/audit corrections remain intact.
  The full API baseline passes with all 47. Last application-database evidence remains
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
| 5 | P5-ENTRIES with P5-UI-ENTRIES S09/S10 — complete locally | Scoped roster and saved entry/participant drafts with recovery; S11/S12 are now complete locally in their owning slices |
| 6 | P5-APPLICATION-ESTIMATES with S06/S08 — complete locally | Actual-day planning counts, revisioned owner adjustments and reasoned organizer correction; preserve M2 approvals |
| 7 | P3-MUSIC-MODEL/P8-MEDIA/P5-MUSIC/P5-SUBMISSION — complete locally | Private music and S11/organizer review plus S12 checklist, receipts and scoped correction delivered; M3 release gates remain open |
| 8 | P6-LIVE-MODEL/P6-SCHEDULE with S13 and P6-SCORING-MODEL/TEMPLATES — complete locally | ADR-030/004 queues, exact scoring and organizer rubric/panel setup pass full local checks |
| 9 | P6-JUDGE/S15 and judge-side P6-RECOVERY — complete locally | Own exact rubric and acknowledged scoring; ADR-031 owns read-first recovery |
| 10 | P6-MODERATOR/S14 — complete locally | Scoped queue and frozen-panel counts, acknowledged controls and reasoned exceptions |
| 11 | P6-RECOVERY — venue work next | Validate venue health, approve any manual continuation record and rehearse both roles using the handoff |
| 12 | P7-CALCULATE and private S16 finalization — complete locally | ADR-032 consumes frozen submitted sheets and finalizes one reviewed revision with atomic event state. |
| 13 | P7-PUBLISH / P7-EXPORT — deferred | The user requested private results. Confirm a public projection, correction policy and release scope before resuming. |

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
