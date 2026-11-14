# Documentation map

Start with [repository instructions](../AGENTS.md) and the
[current checkpoint](../DEVELOPMENT_PLAN.md). Then read only the selected task's
roadmap entry and relevant rows below. Do not load every guide or historical report.
For a large specification, locate the task/heading with `rg -n` and read that section.

## Authority and task routing

| Information | Canonical owner |
| --- | --- |
| Repository rules / task selection | [AGENTS](../AGENTS.md); [checkpoint queue and gates](../DEVELOPMENT_PLAN.md#implementation-order) |
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
| Database migration | Owning ADR/model, [testing](TESTING.md#postgresql-checks); dated audits only for their specific findings | schema, migration SQL, scripts/check-*.cjs |
| Frontend feature | [Web guide](../apps/web/README.md), relevant S/F IDs in [screens](UI_UX.md#screen-specifications) / [flows](USER_FLOWS.md), [design system](DESIGN_SYSTEM.md) | selected page, API helper and shared schema |
| Product overview | [Journey outcomes](USER_JOURNEYS.md) | Checkpoint for actual delivery |
| Public festival website / Wix replacement | [Website roadmap](roadmap/website.md), [product scope](DOMAIN.md#current-product-scope) | Event content, judge presentation and authenticated image boundaries; public publishing remains planned |
| Tests / CI / release evidence | [Testing](TESTING.md) | workspace scripts, tests, .github/workflows/ci.yml |
| Storage / images | [Storage](STORAGE.md), [image contract](api/images.md) | storage services, ImagesController, upload middleware |

Paths in the source column are relative to their corresponding app unless qualified.
[Staging preparation](STAGING.md) now includes a local isolated Docker rehearsal
and protected hosted rollout checklist. P9-DEPLOY still owns hosting, ingress,
deployment/rollback evidence; provider variables alone do not establish readiness.

## Audit corrections

The [correction map](AUDIT_FOLLOWUP.md) routes all 15 findings to their owning
roadmap tasks, acceptance evidence and milestone gates. The [audit](REPOSITORY_AUDIT.md)
retains dated source/probe results; planning does not imply implementation fixes.

## Decisions

| ADR | Accepted decision (delivery status is in roadmap/checkpoint) |
| --- | --- |
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

ADR-003 accepts the M2 application/review subset; live operation remains pending.
ADR-004 scoring is reserved and unaccepted; its required scope is in
[DOMAIN](DOMAIN.md#pending-model-decisions).

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

Maintenance scope and measurements: [documentation audit](DOCUMENTATION_AUDIT.md#maintenance-2026-11-10).
