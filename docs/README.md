# Documentation map

Start with [repository instructions](../AGENTS.md) and the
[current checkpoint](../DEVELOPMENT_PLAN.md). Then read only the selected task's
roadmap entry and relevant rows below. Do not load every guide or historical report.
For a large specification, locate the task/heading with `rg -n` and read that section.

## Authority and task routing

| Information | Canonical owner |
| --- | --- |
| Repository rules / task selection | [AGENTS](../AGENTS.md); [checkpoint queue and gates](../DEVELOPMENT_PLAN.md#implementation-order) |
| Product scope / audiences / exclusions | [Product scope](PRODUCT_SCOPE.md); [ADR-026](adr/026-studio-and-festival-platform.md) for the shared architecture direction |
| Task checkboxes / prerequisites / exit criteria | Selected [roadmap](../DEVELOPMENT_PLAN.md#task-map); no parallel status list |
| Implemented behavior / exact payloads | Source + shared Zod schemas + Prisma/migration SQL; [API resources](API.md#resource-integration) explain them |
| Accepted architecture | ADRs below; acceptance does not prove implementation |
| Product/UI targets | Journeys → selected S/F/UX-D section; targets do not create endpoints |
| Commands / isolation / evidence requirements | [TESTING](TESTING.md); setup sequence in [root README](../README.md#local-setup), settings in [environment](ENVIRONMENT_CONFIGURATION.md) |
| Dated validation and review findings | [History/evidence index](DEVELOPMENT_HISTORY.md#evidence-index); past results and next tasks are historical |

When source and a maintained guide disagree, investigate the relevant code, tests
and decision before editing. Do not infer domain policy from a screen proposal.
Use only the selected rows below; referenced evidence is optional unless the task
requires that past result or rollout limitation.

| Working on | Read | Inspect source |
| --- | --- | --- |
| Setup / environment | [Root setup](../README.md#local-setup), [configuration](ENVIRONMENT_CONFIGURATION.md) | package.json, app `.env.example` files, API config/env.ts |
| Backend structure | [Architecture](ARCHITECTURE.md), [controllers](CONTROLLERS.md) | app.ts, routes/api.ts, selected controller |
| HTTP contract | [API index](API.md), selected resource under api/ | packages/schemas/src, matching router/controller/client |
| Error / translation | [Errors](ERROR_HANDLING.md), [localization](LOCALIZATION.md) | errors/, web i18n/, ErrorFeedback |
| Security / roles / invitations | [Security](SECURITY.md), [roles](../ROLE_ARCHITECTURE.md), ADR-006/008 | auth middleware, permission helpers, invitation controller |
| Audit / privacy / onboarding foundation | [Privacy](PRIVACY.md), ADR-012/013/014 | services/audit, onboarding, staffPolicy, emailQueue; schema/migrations |
| Registration / domain | [Domain](DOMAIN.md), [workflow](REGISTRATION_API.md), ADR-001/003/019 | registration/studio controllers, schema.prisma |
| Application estimates / private music | [Estimate contract](api/registrations.md#planning-estimates), [music contract](api/music.md), ADR-027/028/029 | application estimates; MusicController, music policy/content/storage services, shared contracts and S11 workbench |
| Schedule / live model | [Schedule contract](api/schedule.md), [ADR-030](adr/030-session-queues.md), [S13/S14](ui/competition.md), [F07](flows/F07.md) | ScheduleController, schedule service, explicit stage/session/slot models, S13; ADR-004 now supplies backend scoring readiness |
| Scoring / rubric setup | [Scoring contract](api/scoring.md), [ADR-004](adr/004-exact-scoring.md), [decision context](SCORING_MODEL_DECISIONS.md) | ScoringController, exact scoring services/shared schemas, immutable scoring models and organizer rubric/panel editor |
| Judge scoring / reconnect | [S15](ui/competition.md#s15--judge-scoring), [F09](flows/F09.md), [ADR-031](adr/031-live-scoring-reconnect.md), [scoring contract](api/scoring.md) | Own judge projection, existing scoring commands, judge event list and frozen rubric editor; venue rehearsal remains downstream |
| Moderator console / reconnect | [S14](ui/competition.md#s14--moderator-live-console), [F08](flows/F08.md), [ADR-031](adr/031-live-scoring-reconnect.md), [live schedule contract](api/schedule.md#assigned-live-console) | Assigned-session read, existing schedule and scoring commands, organizer and moderator console; venue rehearsal is downstream |
| Live venue rehearsal | [Runbook](LIVE_REHEARSAL.md), [Phase 6](roadmap/competition.md#phase-6--scheduling-live-operations-and-judging) | Venue preflight, cross-device measurements, pause-and-verify handoff and acceptance record for F07–F09 |
| Private grouped results / finalization | [Results contract](api/results.md), [ADR-032](adr/032-private-results.md), [S16](ui/competition.md#s16--results-review-and-public-results), [F10](flows/F10.md) | ResultsController, exact scoring calculation, private result revisions and organizer review |
| Database migration | Owning ADR/model, [testing](TESTING.md#postgresql-checks); dated audits only for their specific findings | schema, migration SQL, scripts/check-*.cjs |
| Frontend feature | [Web guide](../apps/web/README.md), relevant S/F IDs in [screens](UI_UX.md#screen-specifications) / [flows](USER_FLOWS.md), [design system](DESIGN_SYSTEM.md) | selected page, API helper and shared schema |
| App-wide redesign | [UX audit and redesign plan](UX_REDESIGN_PLAN.md) | role and page findings, controls, Day/Night and staged acceptance |
| Product overview | [Product scope](PRODUCT_SCOPE.md), [journey outcomes](USER_JOURNEYS.md) | Checkpoint for actual delivery |
| Studio/festival websites / CMS / Wix replacement | [Website roadmap](roadmap/website.md), [CMS contract](api/content.md), [public HTML](api/public-pages.md), [workspace routing](api/workspace-routing.md), [public screens](ui/public.md), [publishing flow](flows/F12.md), [inventory](PUBLIC_CONTENT_INVENTORY.md), ADR-026 | CMS/public consumers and local `/app` transition implemented; packages/public-site, explicit API public/cohost entries; hosted ingress/Wix release gates remain open |
| Representative roster / entries / submission | [Studio roadmap](roadmap/studio.md), [entry context](api/entry-context.md), [checkpoints](api/entry-workflow.md), [dancers](api/dancers.md), [performances](api/performances.md), [S09–S12](ui/studio.md#s09--dancer-management), ADR-023/025 | pages/entries, shared PerformanceEditor/EntryReviewPanel, DancersController, EntryWorkflowController; separate data/music receipts and external release gates |
| Tests / CI / release evidence | [Testing](TESTING.md) | workspace scripts, tests, .github/workflows/ci.yml |
| Storage / images | [Storage](STORAGE.md), [image contract](api/images.md) | storage services, ImagesController, upload middleware |

Paths in the source column are relative to their corresponding app unless qualified.
[Staging preparation](STAGING.md) now includes a local isolated Docker rehearsal
and protected hosted rollout checklist. P9-DEPLOY still owns hosting, ingress,
deployment/rollback evidence; provider variables alone do not establish readiness.

## Audit corrections

Session scheduling follows [ADR-030](adr/030-session-queues.md) and the
[schedule contract](api/schedule.md). The [live brief](LIVE_MODEL_DECISIONS.md)
records the accepted 2026-11-21 recommendation and original implementation context.

The [correction map](AUDIT_FOLLOWUP.md) routes all 15 findings to their owning
roadmap tasks, acceptance evidence and milestone gates. The [audit](REPOSITORY_AUDIT.md)
retains dated source/probe results; planning does not imply implementation fixes.

## Decisions

| ADR | Accepted decision (delivery status is in roadmap/checkpoint) |
| --- | --- |
| [004](adr/004-exact-scoring.md) | Exact normalized/weighted scoring, frozen rubric/panels, submitted locks, reasoned corrections and independent private calculation/publication boundaries |
| [001](adr/001-studio-identity-and-event-registration.md) | Reusable studio identity |
| [002](adr/002-canonical-api-paths.md) | Canonical versioned API paths |
| [003](adr/003-registration-lifecycle.md) | M2 registration lifecycle |
| [005](adr/005-shared-api-contracts.md) | Shared Zod contracts and serialized DTOs |
| [006](adr/006-account-eligibility-and-staff-onboarding.md) | Account eligibility and invitation-only staff |
| [007](adr/007-localized-feedback-contracts.md) | Locale-independent feedback |
| [008](adr/008-event-scope-integrity.md) | Event scope integrity and history |
| [009](adr/009-email-identity.md) | Canonical email identity |
| [010](adr/010-identity-token-lifecycle.md) | Purpose-bound identity secrets |
| [011](adr/011-public-account-recovery.md) | Public recovery and session revision |
| [012](adr/012-durable-domain-audit.md) | Durable domain audit |
| [013](adr/013-onboarding-staff-and-recipient-locale.md) | Onboarding/staff models and recipient locale |
| [014](adr/014-transactional-email-dispatch.md) | Transactional encrypted email dispatch |
| [015](adr/015-image-boundaries.md) | Authorized raster images and private retrieval |
| [016](adr/016-browser-sessions-and-safe-return.md) | Browser/native session transport and safe returns |
| [017](adr/017-public-onboarding-and-invitation-lifecycle.md) | Public studio intent and invitation lifecycle |
| [018](adr/018-staff-acceptance-and-offboarding.md) | Atomic staff acceptance and retained offboarding |
| [019](adr/019-m2-authored-content.md) | M2 authored content and language fallback |
| [020](adr/020-organizer-event-setup.md) | Organizer readiness, retained content and revision/retry-safe event setup |
| [021](adr/021-m2-review-notifications.md) | Revisioned independent review, truthful notification intent and verified draft completion |
| [022](adr/022-performance-ownership-and-constraints.md) | Immutable performance registration ownership, event/participant keys and row constraints |
| [023](adr/023-entry-history-and-calendar-dates.md) | Immutable saved revisions, privacy-minimal snapshots and event-local calendar eligibility |
| [024](adr/024-incomplete-entry-drafts.md) | Nullable unscheduled drafts, retained ownership/history and actor-bound creation retries |
| [025](adr/025-entry-submission-lifecycle.md) | Accepted studio-wide checkpoints, any-older percentage, staged review/locks/reopening and event-adjustable rules; source questionnaire/images retained |
| [026](adr/026-studio-and-festival-platform.md) | One organization, two public sites and shared CMS; concrete revision/edition/asset/publication/locale/route design; no CRM/student system or runtime implementation |
| [030](adr/030-session-queues.md) | Event-owned stages/sessions, stable slots, source-bound schedule revisions, moderator authority and scoring readiness gates |
| [031](adr/031-live-scoring-reconnect.md) | Acknowledged HTTP judge drafts, read-only stale/offline state and exact-operation reconciliation |
| [032](adr/032-private-results.md) | Grouped results from frozen scores, private revision review and atomic event finalization |

ADR-003/030 accept registration and session-queue lifecycle mappings; actual live
operation remains gated on scoring and its rehearsal.
ADR-004 scoring was accepted on 2026-11-21. [DOMAIN](DOMAIN.md#pending-model-decisions)
and [the scoring contract](api/scoring.md) distinguish the implemented model/setup
from S15 scoring and the downstream S14/P7 work. The [decision brief](SCORING_MODEL_DECISIONS.md)
retains alternatives and the P6-SCORING-MODEL → P6-TEMPLATES organizer-UI boundary.

## History and compatibility

[Development history and evidence index](DEVELOPMENT_HISTORY.md#evidence-index)
cover dated audits, validation reports and earlier checkpoints. They are outside
the default reading path. [Audit corrections](AUDIT_FOLLOWUP.md) map findings to
roadmap owners; the roadmap owns completion, not the original audit.

Compatibility pointers retain old setup/storage/controller/error summary filenames
for saved/external links. They contain no independent instructions; maintained
destinations are linked above. No pointer was removed by the 2026-11-10 maintenance.
The ignored local specialist profiles in .github/agents supplement AGENTS, defer
to the active environment's delegation policy and are not a portable policy source.
No repository .agents or .codex directory was present during this inventory.

Latest product/plan audit: [2026-11-16](DOCUMENTATION_AUDIT.md#product-replan-2026-11-16).
Earlier maintenance measurements: [2026-11-10](DOCUMENTATION_AUDIT.md#maintenance-2026-11-10).
