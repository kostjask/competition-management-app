# Development checkpoint

Updated: 2026-11-14. This file owns current priority, state summary and milestone
gates. Roadmap files own task checkboxes; [the map](docs/README.md) routes selected
tasks to contracts/specifications. Read history only to investigate past evidence.

## Next action

**Next: P5-ENTRIES with its P5-UI-ENTRIES S09/S10 representative scope.**
The user confirmed **studio-wide** basic/final checkpoints and **any older age**
within the configured older-dancer percentage. [ADR-025](docs/adr/025-entry-submission-lifecycle.md)
records the accepted policy; the completed [questionnaire](docs/ENTRY_POLICY_QUESTIONNAIRE.md)
and [image rules](docs/DANCE_EXPRESS_RULES.md) remain source evidence.

The checkpoint implementation spans shared contracts, migrations 38–39,
studio-wide manifests/receipts, optimistic/retry-safe commands, field/roster locks,
scoped reopening, independent acceptance, any-older percentage eligibility,
category-specific limits, rule freeze and the translated Cobalt organizer rules,
review and details editors. P3-ENTRIES and P4-ENTRY-CONFIG are complete locally,
including same-identity withdrawal/restore/resubmission, organizer recovery,
atomic option creation and a complete reusable Dance Express nomination copy.
[Recovery validation](docs/ENTRY_RECOVERY_VALIDATION.md) and
[checkpoint validation](docs/ENTRY_CHECKPOINT_VALIDATION.md) record exact checks
and limits. Whole M3 delivery and external release are not complete.

The verified disposable application database localhost:5432/dance_comp, public
schema, was reset and reseeded on 2026-11-14 after fresh explicit user consent
satisfied Prisma's CLI guard. Additive migration 39 was subsequently applied
without another reset/reseed. All 39 canonical migrations are applied; the obsolete
parallel-branch migration is absent. Seed counts and temporary API health,
administrator login/profile and entry-configuration reads pass. The database
handoff blocker is resolved; no external deployment or mail delivery is implied.

Build the representative roster and unscheduled entry/participant editors,
consuming the completed ownership, history, calendar, checkpoint and configuration
contracts. Include durable drafts, ET/EN/RU, field errors and session/network/
stage/conflict recovery. Initial per-event-day estimates
are recorded under P5-APPLICATION-ESTIMATES. Music deadlines, private files,
version confirmation/acceptance and reminders retain P3-MUSIC-MODEL/P8-MEDIA/
P5-MUSIC gates. Keep application approval, entry review and music acceptance
separate. No unresolved stakeholder policy question blocks representative data entry.

## Product delivery goal

Serve the single Neposedõ organizer with a public festival website and the
registration/competition workspace, replacing the existing Wix site at
fest.neposedo.ee. Annual editions need configurable branding and editable ET/EN/RU
content, registration access/status, judges, results archives and contact/social
links. [Website roadmap](docs/roadmap/website.md) owns the additional cross-phase
tasks, dependencies and replacement acceptance; public publishing is not delivered.

P5-ENTRIES and the remaining M3 participant path retain priority. After that path,
take P4-PUBLIC-MODEL as the next public-site planning task, then its editor/public
page consumers and migration/cutover. Public-site dependencies do not require
finishing live scoring to retain historical result documents. Existing M1–M5
gates remain; website replacement has its own acceptance below and does not
silently become a prerequisite for isolated participant-workflow development.

## Current state

- **Wix replacement goal accepted (2026-11-14):** user screenshots and confirmation
  establish the useful current scope: festival landing, multilingual rules,
  registration information/link, judges by edition, results document/link archives
  and contact/social links. Annual branding and organizer content publishing are
  planned additions. Reported Wix cost is EUR 372/year, not a verified net saving.
  [Website tasks](docs/roadmap/website.md) remain unchecked; migration inventory,
  public/private publication design, storage and hosted transition are outstanding.
  P5-ENTRIES remains the next implementation task. No Wix cancellation, domain
  change, public deployment or architecture implementation is authorized by this
  documentation update.

- **Product scope clarified (2026-11-14):** current delivery serves one organizer,
  the director of Tantsuansambel Neposedõ, running one or two festivals/competitions
  per year. Additional organizers and an organizer-based offering are future
  possibilities, outside current delivery. [Domain scope](docs/DOMAIN.md#current-product-scope)
  records the planning boundary while retaining event authorization, ownership,
  history and ET/EN/RU requirements. This documentation clarification adds no
  tenancy implementation or release gate; P5-ENTRIES remains next.

- **User-selected migration CI correction (2026-11-14):** reproduced the hosted
  AuditLog_action parity failure in an empty disposable database. Migration 39's
  unscoped catalog lookup can reuse another schema's already-expanded allowlist;
  local public tables masked the mismatch. Forward migration 40 installs the
  explicit canonical constraint without rewriting published history. The migration
  suite now owns a random empty database and reports actual/expected differences.
  [Testing evidence](docs/TESTING.md#migration-ci-correction-2026-11-14) records
  validation and limits. The application database remains at migration 39;
  migration 40 is pending there. Publication/hosted confirmation remain outstanding.
  This bounded repair does not change the next product task, P5-ENTRIES.

- **PR #4 ancestry reconciliation (2026-11-14):** main's ea29cd1 squash has the
  exact same complete Git tree as b3dd683, already an ancestor of this branch.
  The reported conflicts come from the old merge base, not new target behavior.
  A noncommitting ancestry merge was verified with no unresolved index entries;
  its tree exactly matched the pre-merge HEAD. All seven existing edited files
  were verified byte-for-byte unchanged before this documentation update. Runtime,
  contracts and migrations are unchanged, so the preceding 259-browser/workspace
  checks still apply; documentation and Git integrity checks cover this operation.
  The user subsequently authorized committing and pushing this resolution with
  the validated CI fixes. Publication must retain main as a merge parent; hosted
  mergeability and CI are checked against the resulting PR #4 head. Deployment
  remains unauthorized. This operational repair does not change P5-ENTRIES priority.

- **User-selected CI correction (2026-11-14):** PR #3 is already merged; its two
  failed Workspace checks tested the older b3dd683 revision. The questionnaire
  EOF blank line is removed, and staff confirmation restores focus after React
  commits dialog removal/control updates instead of waiting for animation frames.
  The regression fails on the original behavior and passes with the fix; all 26
  staff cases and 30 repeated ET/EN/RU F06 journeys pass without retries. Workspace
  tests/build/typecheck/lint and Prisma checks pass; the full 259-case browser
  suite passes without retries. [Evidence](docs/STAFF_UI_VALIDATION.md#ci-correction-2026-11-14)
  records exact results and limits. Fresh target/overlap checks find no additional
  changes affecting this correction. Commit/push was subsequently authorized for
  PR #4; hosted CI must confirm the published head. Deployment remains
  unauthorized. P5-ENTRIES remains next.

- **Entry recovery and setup (2026-11-14):** P3-ENTRIES, P4-ENTRY-CONFIG and their
  organizer UI extensions are complete locally. Migration 39 retains identity,
  immutable actor-bound lifecycle operations and unbounded format maxima. The
  organizer can withdraw/restore with current authorization, locks, revision/
  retry recovery and retained receipts; restoration requires fresh submission/
  review. Atomic option creation and the full adjustable 182-combination source
  preset pass API/PostgreSQL and ET/EN/RU browser checks. Full workspace, baseline,
  migration and 258-browser gates pass; focused confirmation covers final UI copy.
  [Evidence](docs/ENTRY_RECOVERY_VALIDATION.md) records initial failures/retries,
  Hallmark render-tool limits and the applied local migration. M3/media/hosted/
  human release gates remain open; next is P5-ENTRIES.

- **Studio checkpoint delivery (2026-11-14):** P3-ENTRIES core and remaining
  P3-HISTORY consumers now span contracts, migration 38, API, secure studio-wide
  locks/receipts/reopening and Cobalt organizer configuration/review/editor UI.
  [Evidence](docs/ENTRY_CHECKPOINT_VALIDATION.md) records final checks and limits.
  P3-HISTORY is complete locally; the recovery slice above subsequently completes
  P3-ENTRIES. Fresh user consent authorized the verified local
  database reset/reseed; the then-38 migrations and seeded API smoke checks passed.
  Migration 39 is now applied as recorded above.
  Other phase/release gates stay open.

- **Stakeholder answers received (2026-11-13, clarified 2026-11-14):** the user completed all numbered
  questionnaire answers and supplied six Dance Express rule images. ADR-025 now
  records the resulting staged workflow; the earlier per-entry/all-ages-in-range
  proposal is superseded. Younger dancers are unrestricted; the 20% older-dancer
  allowance and atomic form unit were subsequently confirmed as any older age and studio-wide checkpoints. Published
  nominations include category-specific limits (kids groups 210 seconds versus
  standard groups 240), so current independent option lists are insufficient.
  Rule edits freeze once registration starts, while organizer entry corrections
  and exceptions can occur later with retained history. Source scoring/fee/award
  rules are recorded for their owning later work, not added to this slice. No
  additional scoring/fee/award runtime work is claimed by this reconciliation.

- **Lifecycle preflight (2026-11-13):** source inspection confirms the existing
  draft/history/calendar prerequisites. Fresh origin/main is contained in this
  branch; GitHub lists only this branch's existing PR #3, targeting main. The
  then-unaccepted ADR-025 proposal made the competition-policy gate
  reviewable before dependent code. Focused checks pass: 77 API route tests,
  isolated PostgreSQL entry foundations and 38 Chromium performance/history/draft
  cases. The initial sandboxed database command failed; its authorized fixture
  retry passed. These validate current foundations, not future lifecycle behavior.
  No application database, runtime code or UI was changed; full implementation
  gates remain required after policy resolution. Existing user edits are retained.

- **Branch workflow guidance (2026-11-13):** AGENTS now requires fresh target and
  overlapping-PR/task checks before implementation and final integration
  validation, with explicit dependency bases and coordination of shared contracts
  and migrations. This follows the parallel M2 implementations reconciled below.
  [Documentation task](docs/roadmap/documentation.md#tasks) records the scope.

- **PR reconciliation (2026-11-13):** combined the parallel organizer/application
  branch with main's integrated M2 and newer M3 ownership/history/draft work.
  Main's contracts and 36 migrations remain canonical. The unpublished duplicate
  disposable-only branch migration is replaced by additive migration 37 for
  per-recipient transport retry tracking. Explicit administrator notification
  retries, verified onboarding continuation, representative application home and
  revisioned image replacement are retained. Historical branch evidence is labelled
  separately. [Merge validation](docs/APPLICATION_REVIEW_VALIDATION.md#merge-reconciliation-2026-11-13)
  records checks and database handoff limits. The next queued task above stays current.

- **M3 incomplete drafts (2026-11-11):** P3-ENTRIES-DRAFT adds nullable fields and
  stage order without replacing entry IDs, immutable owners or snapshots. Canonical
  CRUD validates supplied relationships, revisions and active access. Organizer
  draft creation shows actual acknowledgement, missing fields and unscheduled
  state; uncertain operations survive filter/session recovery. Completeness does
  not imply eligibility/submission. [Evidence](docs/ENTRY_DRAFT_VALIDATION.md).

- **M3 history/calendar foundations (2026-11-11):** ADR-023, native DATE, immutable
  saved snapshots, revisioned writes/audit and the translated Cobalt history
  ledger pass local workspace, database, migration and browser checks. Calendar
  policy/calculation is implemented; submission eligibility/receipt/correction
  consumers are now delivered by the checkpoint slice above, closing P3-HISTORY locally.

- **M3 ownership/integrity foundations (2026-11-11):** P3-PERFORMANCE-OWNER and
  P3-CONSTRAINTS pass locally under ADR-022. Explicit owners replace participant
  inference, compound keys prevent event/studio substitutions and SQL-only guards
  protect row bounds/owner immutability. Migration audits/backfills unambiguous
  owners or refuses reviewed-repair cases atomically, preserving IDs/participants/
  scores. The Cobalt organizer register exposes saved titles, owning applications
  and participant counts with ET/EN/RU and recovery; full entry editing/configuration
  remains gated. [Evidence](docs/PERFORMANCE_OWNERSHIP_VALIDATION.md) records checks,
  render-tool limits, the resolved first-run failures and remaining external gates.

- **Test feedback setup (2026-11-10):** user-requested P9-TEST-SPEED adds focused
  file/database commands, baseline timing and CI dependency-store caching while
  retaining full validation gates. [Testing](docs/TESTING.md#fast-development-loop)
  owns usage; [operations](docs/roadmap/operations.md) owns remaining measurement/
  isolation work. The inherited coverage-inventory recognition mismatch is fixed
  (2026-11-11); comments/strings/unused imports cannot stand in for suite calls.

- **UI design direction (2026-11-10):** the user rejects the entire current UI as
  a placeholder and requires a full Hallmark redesign.
  [Design direction](docs/DESIGN_SYSTEM.md#required-full-redesign) owns the brief;
  P9-UI-REDESIGN tracks delivery across existing workflow slices. Technical
  completion remains distinct from visual approval. The implementation queue
  now records the bounded Cobalt organizer/event implementation in
  [DESIGN](DESIGN.md); the shared shell, other workflows and human approval remain open.
- Phases 0–1 and the applicable Phase 2 local security/auth/scope/audit/onboarding
  foundations are technically delivered. Cookie-session recovery, translated
  auth/shell/profile, account language preferences and scoped staff administration
  are delivered locally. Roadmaps retain individual completion states and limits.
- P3-REGISTRATION, P3-REGISTRATION-REAPPLY and I18N-CONTENT's M2 policy/contracts
  are complete locally (2026-11-09): independent approvals, derived access,
  deadline/timezone, correction revisions, retained cancel/reapply and explicit
  content fallback. P3-UX-CONTRACTS and I18N-CONTENT stay open for later scope.
  P4-CORE and its S05/S01/S02 setup UI are complete locally (2026-11-10): event
  details/contact/timezone/deadline/limits, authored-description storage/editors,
  actionable readiness, confirmed M2 stages, revision/retry recovery and audit.
  Final validation fixed exact-instant retention and modal focus, and checked
  ET/EN/RU layout and recovery. P4-REVIEW/P5-APPLICATION now implement independent
  review queues/detail/reasons/history, transactional notification intent, and
  role-independent apply/status/profile/contact/cancel/reapply with verified draft
  completion and recovery. ADR-021/migration 32 and [evidence](docs/APPLICATION_REVIEW_VALIDATION.md)
  describe completed local validation (2026-11-11), including form-specific error
  isolation/focus and the corrected coverage gate. Entry/music, live/scoring and results remain unfinished;
  judge/moderator/representative dashboards are placeholders. No external milestone is complete.
- **Release blockers:** P2-SCOPE-DEPLOY's intended-target assignment provenance;
  real staging inbox delivery; hosted CI/required-check evidence, ingress/shared
  limits, deploy/rollback/restore and observability; delivered-scope human
  ET/EN/RU and assistive review. Local fixtures/fake mail do not close these gates.
  [STAGING](docs/STAGING.md) owns rehearsal/rollout instructions. The recorded
  rehearsal used 26 migrations; later hosted/staging rollout remains unverified.
- Repository schema has 39 migrations, including P4-CORE's additive event setup,
  P4-REVIEW's reasons/notification relations, ADR-022's ownership/constraints,
  ADR-023's calendar/history foundations, ADR-024's incomplete drafts and the
  additive per-recipient notification delivery retry migration 37, studio checkpoint
  migration 38 and retained recovery/unbounded format migration 39.
  Isolated fixtures cover migration/API behavior. The verified disposable
  application database was subsequently reset/reseeded on 2026-11-14 with fresh
  user consent; additive migration 39 is now applied without another reset/reseed.
  [Setup evidence](docs/EVENT_SETUP_VALIDATION.md) records the prior migration's local
  application and current isolated fresh/upgrade/API/browser checks. The user's **2026-11-09 startup record**
  verified localhost:5432/dance_comp in repository Compose and applied 12 pending
  migrations (all 30 applied), without reset/reseed. It recorded API port 4000,
  authentication enabled, a process-only EMAIL_PROVIDER=fake override for legacy
  local mail configuration and GET /health 200/status ok. This is dated operational
  evidence, not a fresh process/health check or a release-gate change. The original
  user-edited record is preserved in [history](docs/DEVELOPMENT_HISTORY.md#checkpoint-narrative-archived-2026-11-10).
- Current development rows are disposable under the scoped
  [database policy](AGENTS.md#development-database-policy); verify the resolved
  target before reset/reseed or migration-history changes. Domain integrity/history
  requirements still apply. Implementation checks used isolated databases/schemas;
  the separately authorized application database reset/reseed and smoke checks
  subsequently passed on 2026-11-14.

Latest recorded runtime evidence: [entry recovery/setup, 2026-11-14](docs/ENTRY_RECOVERY_VALIDATION.md).
Earlier reports and the former detailed checkpoint are in
[development history](docs/DEVELOPMENT_HISTORY.md#checkpoint-narrative-archived-2026-11-10).
[Audit corrections](docs/AUDIT_FOLLOWUP.md) map the 15 findings to task owners;
[plan revalidation](docs/PLAN_REVALIDATION.md) explains development/release gate separation.
These are dated evidence, not required reading for every task or fresh checks.

Documentation maintenance (2026-11-10): corrected source mismatches, clarified
ownership/selective routing, archived repetitive checkpoint narratives and
reconciled the documentation backlog. Scope/validation/remaining work:
[documentation audit](docs/DOCUMENTATION_AUDIT.md#maintenance-2026-11-10).
That maintenance record did not advance implementation or external release status.

## Task map

Checkboxes and detailed prerequisites live once, in the linked files. Stable task
IDs remain valid; phase numbers group topics rather than imposing an unrelated
all-phases-before-next-phase dependency.

| Scope | Task file |
| --- | --- |
| Phase 0–1 completed technical slices | [Completed](docs/roadmap/completed.md) |
| Phase 2A foundations / 2B auth and onboarding | [Foundation](docs/roadmap/foundation.md) |
| Phase 3 registration / entry data | [Registration](docs/roadmap/registration.md) |
| Phase 4 organizer setup / review | [Organizer](docs/roadmap/organizer.md) |
| Phase 5 applicant / representative UI | [Studio](docs/roadmap/studio.md) |
| Phase 6–7 scheduling / judging / results | [Competition](docs/roadmap/competition.md) |
| Phase 8–9 providers / quality / operations; optional backlog | [Operations](docs/roadmap/operations.md) |
| Cross-phase I18N tasks | [Localization](docs/roadmap/localization.md) |
| Cross-phase public festival website / Wix replacement | [Website](docs/roadmap/website.md) |
| Documentation tasks | [Documentation](docs/roadmap/documentation.md) |

Use the ordered implementation queue below when no task is selected. Check the
specific model/security dependencies rather than treating every unchecked task in
an earlier phase as a development blocker. Split broad tasks into reviewable
steps while preserving parent IDs. When asked for the next N tasks, select N
existing queued task IDs; do not count newly created subdivisions of one task as
N roadmap tasks. State any genuine blocker and justified queue change explicitly.
Do not mark a parent or umbrella complete while its required slices remain open.
Issues/PRs state outcome, prerequisites, scope, acceptance checks,
migration/preservation impact and evidence.

## Development and release gates

| Gate | Required before | Current implication |
| --- | --- | --- |
| Local technical prerequisites | Dependent design/code/migrations/UI | Applicable Phase 2 security/auth/scope/audit/contracts are recorded complete locally. P3 may proceed with isolated fixtures and fake-backed mail; each change must pass its own checks. Any concrete security regression takes priority. |
| Domain/model decisions | Dependent behavior and schema changes | ADR-003 application/review decisions precede P3 registration behavior; ownership/history/date/content/scoring decisions precede their own consumers. This replan approves no domain policy or new enum. |
| Intended-target deployment safety | Deployment/migration on the relevant retained or hosted target, and event deletion under ADR-008 | P2-SCOPE-DEPLOY, target verification, provenance review, backup and coordinated rollout remain mandatory. Local fixtures do not satisfy this gate. Disposable-target policy still applies only to verified disposable targets. |
| External workflow release | Declaring or exposing M1–M5 workflows for their intended users | Preserve every milestone prerequisite below, real inbox evidence where required, hosted CI/ingress/observability/deploy/restore and delivered-scope human language/assistive review. Local technical completion does not close any external milestone. |

P2-EMAIL's implemented queue/provider/templates may be used with test fakes while
real delivery stays open. Likewise later local entry/judging development consumes
the relevant earlier technical workflows, not proof of their hosted release.
This distinction must never be used to bypass an unfinished security or domain
implementation. External-account availability is not a reason to skip P3 or
promote unrelated later work indefinitely.

## Implementation order

The local M2 path is complete: a verified roleless applicant applies to one event,
receives independent organization/event decisions, and returns to status. Preserve
that path while completing the remaining M3 history/calendar/entry prerequisites;
music and live/results work retain their own gates.

| Order | Existing task | Concrete scope / dependency |
| --- | --- | --- |
| 1 - complete locally | P3-REGISTRATION | ADR-003 M2 policy, migration/API/DTO/client alignment and denial/concurrency/rollback checks pass, including the reapply slice. |
| 2 - complete locally | P3-REGISTRATION-REAPPLY | Canonical retained same-studio cancel/reapply, revision conflicts, safe retries and history/identity/access checks pass. |
| 3 - M2 policy complete | I18N-CONTENT - M2 policy/contracts | ADR-019 source-language/translation/fallback contract and ET/EN/RU copy/tests pass; P4-CORE also delivers event-description storage/editors. Later content remains open. |
| 4 - complete locally | P4-CORE with P4-UI-CORE setup scope | Organizer configuration, time/deadline/contact, authored descriptions, readiness and confirmed M2 stages pass UI/API/database checks. No second lifecycle model or scoring prerequisite. |
| 5 - complete locally | P4-REVIEW with P4-UI-CORE review scope | Independent queues/detail, reasons/corrections, next actor, revisioned decisions/audit and transactional notification intent pass full local gates (2026-11-11). |
| 6 - complete locally | P5-APPLICATION with P5-UI-APPLICATION | Role-independent apply/status/profile/contact, atomic verified draft completion, pending cancellation/reapply, form-specific validation and uncertain-response/session recovery pass full local gates (2026-11-11). |
| 7 - complete locally | P3-PERFORMANCE-OWNER with read-only organizer ownership register | ADR-022/migration 33, canonical owner DTOs, active access validation, unambiguous backfill/refusal, retained history and translated organizer reads pass local gates (2026-11-11). |
| 8 - complete locally | P3-CONSTRAINTS | Event/owner/configuration/participant compound keys, row bounds, direct SQL/API/rollback/concurrency and fresh/upgrade parity pass local gates (2026-11-11). Score/judge consistency remains P6-SCORING-MODEL. |
| 9 - complete locally | P3-HISTORY | ADR-023 foundations and ADR-025 checkpoint consumers preserve exact immutable source snapshots, concurrent receipts, scoped corrections, retry/audit atomicity and organizer history/acknowledgements. |
| 10 - complete locally | P3-CALENDAR-DATES | Migration 34 safely converts audited calendar dates; event-local completed-age/leap policy, shared calculation and organizer reference display pass local gates. Submit-time enforcement remains P3-ENTRIES. |
| 11 - complete locally | P3-ENTRIES-DRAFT within P3-ENTRIES | ADR-024/migration 36, nullable unscheduled drafts, revisioned clearing/completion, actor-bound create retries and organizer creation/completeness UI pass local gates (2026-11-12). The subsequent checkpoint/recovery slices complete the parent below. |
| 12 - complete locally | P3-ENTRIES | Migration 39, retained withdrawal/restore/resubmission, immutable actor-bound retries, lock/deadline/current-access checks and organizer recovery UI pass local gates (2026-11-14). |
| 13 - complete locally | P4-ENTRY-CONFIG | Atomic option creation, full reusable source nomination preset, unbounded formats, publication freeze and owning organizer UI pass local gates (2026-11-14). |

ADR-003 uses semantic M2 review reasons rather than authored review prose.
ADR-019's M2 source-language/fallback policy is implemented for event descriptions
by P4-CORE under ADR-020. Later multilingual content retains its owning workflow.

Attach authorization/audit, ET/EN/RU, component/browser/recovery checks and
documentation to each task. Cross-cutting P3-UX-CONTRACTS and UI/QA checkboxes
describe the relevant task's acceptance scope; they are not duplicate task slots
or requirements to finish all future screens before the current workflow.
External operations proceed alongside this path when access is available; they
remain release blockers without becoming blanket development blockers.

Local M2 and the M3 ownership/constraint/calendar/history design foundations now
pass. The bounded P3-ENTRIES-DRAFT slice delivers incomplete unscheduled saves.
The checkpoint/history/recovery and organizer option/preset consumers are delivered
locally. Next build P5-ENTRIES with its S09/S10 representative UI, followed by the
P3-MUSIC-MODEL → P8-MEDIA → P5-MUSIC → P5-SUBMISSION path. Develop the
history/constraint contracts before dependent drafts/submission. Keep calendar
birth dates separate from M2 event instants, and scheduling separate from entry
identity. P3-STUDIO-NAMES/IDENTITY and P5-REUSE are a coordinated extension before
multi-event reuse/shared cross-event edits, not hidden single-event M2 gates.
P3-INDEXES/DATA-HYGIENE follow concrete queries/model invariants rather than
inventing a second global prerequisite. Phase 3 remains open until all of its
required scope is complete. P4-STAFF's completed local scope is preserved;
P6/P7 advance after their consumed technical workflows/model decisions, with all
external M3/M4/M5 gates still enforced.

## Milestone gates

These are workflow/release acceptance gates. Use the task-specific local
prerequisites and implementation order above for development; this table does
not require hosted M1 completion before any isolated P3 work can start.

| Milestone | Outcome | Required work |
| --- | --- | --- |
| M1 | Stable technical/security foundation | Phase 1; P2-SCOPE-INTEGRITY, SCOPE-DEPLOY, IDENTITY-TOKENS, AUDIT, PRIVACY, AUTH, ROLES (including ROLES-ADMIN-SCOPE), BOUNDARIES (including BOUNDARIES-UPLOADS/ERRORS), SESSION and INVITE-IDENTITY (all P2). |
| M2 | Verified applicant applies to one event, tracks both approvals and resumes; organizer configures/reviews | M1; P2-ONBOARDING-MODEL/SIGNUP/EMAIL; P3-REGISTRATION (including REGISTRATION-REAPPLY); P4-CORE/REVIEW; P5-APPLICATION. No scoring/schedule/reuse prerequisite. |
| M3 | Approved representative saves entries/music, submits and handles corrections | M2; P3-PERFORMANCE-OWNER/CONSTRAINTS/HISTORY/CALENDAR-DATES/ENTRIES; P4-ENTRY-CONFIG; P5-ENTRIES/MUSIC/SUBMISSION; P8-MEDIA. |
| M4 | Intended staff accepts scoped invitation; assignment/removal preserves history | M1; P2-STAFF-MODEL/INVITE/JUDGE-ACCEPT/OFFBOARD/EMAIL; P4-STAFF. Independent of M3 after its own gates. |
| M5 | Rehearsed competition operation, recovery and reproducible published results | M3 + M4; Phases 6–7; applicable Phase 9 operations. |

Every external milestone also needs its delivered P9-BROWSER/OBSERVABILITY/DEPLOY/
RECOVERY scope. Begin these with the first release, not after results development.
P8-MEDIA precedes M3 music; P2-EMAIL precedes external M2/M4.

M1 requires I18N-CONTRACT/CORE/VALIDATION. M2/M4 also require delivered-scope
I18N-UI/FORMATTING/PREFERENCES/QA. Decide I18N-CONTENT policy before relevant
organizer content. M3/M5 extend these gates to entries, scoring, exports and results.
Future screens do not hold an earlier milestone open.

Website replacement acceptance is separate from M5: all required tasks in the
[website roadmap](docs/roadmap/website.md) must pass, including content/archive
migration, organizer publishing, accessible ET/EN/RU public pages, verified
registration handoff and hosted domain/redirect/rollback checks. Historical
results can be explicitly published documents/links; new calculated results keep
their Phase 7 gates. Retire Wix only after replacement verification and explicit
authorization for the external cutover/cancellation.

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

For UI work, read only the relevant S01–S17 screen, F01–F10 flow and UX-D decision
in [UI_UX](docs/UI_UX.md), [USER_FLOWS](docs/USER_FLOWS.md) and
[DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md). They define target behavior, not delivered
features. [TESTING](docs/TESTING.md) owns commands and evidence requirements.
