# Development checkpoint

Updated: 2026-11-12. This file owns current priority, state summary and milestone
gates. Roadmap files own task checkboxes; [the map](docs/README.md) routes selected
tasks to contracts/specifications. Read history only to investigate past evidence.

## Next action

**Next: P3-PERFORMANCE-OWNER.**
The local M2 applicant path now implements P5-APPLICATION/P5-UI-APPLICATION and
P4-UI-CORE's S01/S02 apply/resume integration (2026-11-12). Establish the explicit
studio/event-registration ownership design and audit contradictory/empty participant
sets before M3 entry work. Calendar dates, event-consistent constraints and history
retain their own prerequisite gates. See [implementation order](#implementation-order),
[registration roadmap](docs/roadmap/registration.md) and
[applicant validation](docs/APPLICATION_VALIDATION.md). External M2 remains gated.

## Current state

- Phases 0–1 and the applicable Phase 2 local security/auth/scope/audit/onboarding
  foundations are technically delivered. Cookie-session recovery, translated
  auth/shell/profile, account language preferences and scoped staff administration
  are delivered locally. Roadmaps retain individual completion states and limits.
- P3-REGISTRATION, P3-REGISTRATION-REAPPLY and I18N-CONTENT's M2 policy/contracts
  are complete locally (2026-11-09): independent approvals, derived access,
  deadline/timezone, correction revisions, retained cancel/reapply and explicit
  content fallback. P3-UX-CONTRACTS and I18N-CONTENT stay open for later scope.
  P4 now implements setup/review UI, transactional notification intent and authored
  event-content storage/editors; its local database handoff is complete below.
  P5 application/status/profile/cancel/reapply UI and P4 discovery actions are
  delivered locally with ET/EN/RU and recovery coverage. The representative section
  opens owned applications; judge/moderator, entry/music, live/scoring and results
  workflows remain unfinished. No external milestone is complete.
- **Release blockers:** P2-SCOPE-DEPLOY's intended-target assignment provenance;
  real staging inbox delivery; hosted CI/required-check evidence, ingress/shared
  limits, deploy/rollback/restore and observability; delivered-scope human
  ET/EN/RU and assistive review. Local fixtures/fake mail do not close these gates.
  [STAGING](docs/STAGING.md) owns rehearsal/rollout instructions. The recorded
  rehearsal used 26 migrations; later hosted/staging rollout remains unverified.
- Repository schema now has 31 migrations. The user's **2026-11-09 startup record**
  verified localhost:5432/dance_comp in repository Compose and applied 12 pending
  migrations (all 30 applied), without reset/reseed. It recorded API port 4000,
  authentication enabled, a process-only EMAIL_PROVIDER=fake override for legacy
  local mail configuration and GET /health 200/status ok. This is dated operational
  evidence, not a fresh process/health check or a release-gate change. The original
  user-edited record is preserved in [history](docs/DEVELOPMENT_HISTORY.md#checkpoint-narrative-archived-2026-11-10).
- **2026-11-12 development database reconciliation complete:** reverified repository
  Compose PostgreSQL at localhost:5432/dance_comp. After fresh explicit user consent,
  reset the disposable database from checked-in history and reseeded successfully;
  all 31 migrations are current. Compiled API health, authenticated admin profile,
  event/review DTOs and anonymous/judge denials passed with auth bypass disabled
  and process-only fake mail. The temporary verification API was stopped. No source
  migration history was rewritten. Exact commands: [organizer validation](docs/ORGANIZER_VALIDATION.md).
- Current development rows are disposable under the scoped
  [database policy](AGENTS.md#development-database-policy); verify the resolved
  target before reset/reseed or migration-history changes. Domain integrity/history
  requirements still apply. The verified disposable target was reset/reseeded above.

Latest implementation evidence: [applicant/discovery, 2026-11-12](docs/APPLICATION_VALIDATION.md).
Organizer setup/review and database handoff: [2026-11-12](docs/ORGANIZER_VALIDATION.md).
Earlier runtime evidence: [registration lifecycle, 2026-11-09](docs/REGISTRATION_LIFECYCLE_VALIDATION.md).
Earlier reports and the former detailed checkpoint are in
[development history](docs/DEVELOPMENT_HISTORY.md#checkpoint-narrative-archived-2026-11-10).
[Audit corrections](docs/AUDIT_FOLLOWUP.md) map the 15 findings to task owners;
[plan revalidation](docs/PLAN_REVALIDATION.md) explains development/release gate separation.
These are dated evidence, not required reading for every task or fresh checks.

Documentation maintenance (2026-11-10): corrected source mismatches, clarified
ownership/selective routing, archived repetitive checkpoint narratives and
reconciled the documentation backlog. Scope/validation/remaining work:
[documentation audit](docs/DOCUMENTATION_AUDIT.md#maintenance-2026-11-10).
Implementation priority and external release status are unchanged.

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

The immediate outcome is a verified roleless applicant applying to one event,
receiving independent organization/event decisions, and returning to status.
Finish this local M2 path before promoting entry/music or live/results work.

| Order | Existing task | Concrete scope / dependency |
| --- | --- | --- |
| 1 - complete locally | P3-REGISTRATION | ADR-003 M2 policy, migration/API/DTO/client alignment and denial/concurrency/rollback checks pass, including the reapply slice. |
| 2 - complete locally | P3-REGISTRATION-REAPPLY | Canonical retained same-studio cancel/reapply, revision conflicts, safe retries and history/identity/access checks pass. |
| 3 - M2 policy complete | I18N-CONTENT - M2 policy/contracts | ADR-019 source-language/translation/fallback contract and ET/EN/RU copy/tests pass; P4 event content storage/editors are delivered. Later content retains its workflow gates. |
| 4 - complete locally | P4-CORE with P4-UI-CORE setup scope | Consumes #1–3; organizer configuration, event-local time/deadline/contact, authored content, protected images and actionable prerequisites are delivered with revision/recovery checks and the local runtime handoff. No scoring prerequisite. |
| 5 - complete locally | P4-REVIEW with P4-UI-CORE review scope | Independent approval queues/detail, reasons/allowed corrections, next actor and transactional notification intent with truthful delivery states pass isolated and local runtime checks. |
| 6 - complete locally | P5-APPLICATION with P5-UI-APPLICATION | Role-independent apply/status, exact owner-draft continuation, permitted revisioned profile/contact, retained cancellation/reapply and uncertain-response recovery. P4-UI-CORE S01/S02 apply/resume integration is delivered; external M2 release evidence remains open. |
| 7 - next | P3-PERFORMANCE-OWNER | Record studio/event-registration ownership and event-consistent keys, audit empty/mixed participant sets, then align migration/API/DTOs and negative ownership checks before M3 entry UI. |

ADR-003 uses semantic M2 review reasons rather than authored review prose.
ADR-019's M2 source-language/fallback policy is implemented by P4's authored event
content storage/editors. Later multilingual content retains its owning workflow.

Attach authorization/audit, ET/EN/RU, component/browser/recovery checks and
documentation to each task. Cross-cutting P3-UX-CONTRACTS and UI/QA checkboxes
describe the relevant task's acceptance scope; they are not duplicate task slots
or requirements to finish all future screens before the current workflow.
External operations proceed alongside this path when access is available; they
remain release blockers without becoming blanket development blockers.

After local M2 works, take the M3 P3 ownership/date/constraints/history/entry
foundations, then P4-ENTRY-CONFIG/P5-ENTRIES and the
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
