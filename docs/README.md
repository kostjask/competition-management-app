# Documentation map

Start with [repository instructions](../AGENTS.md) and the
[current checkpoint](../DEVELOPMENT_PLAN.md). Then read only the selected task's
roadmap entry and relevant rows below. Do not load every guide or historical report.
For a large specification, locate the task/heading with `rg -n` and read that section.

## Authority and task routing

Code establishes runtime behavior; contracts describe it. Accepted ADRs govern
intended architecture; an accepted decision may still need implementation. UI and
flow specifications describe targets. The checkpoint owns priority; roadmap files
own checkboxes. Dated reports record past evidence, never fresh validation.

| Working on | Read | Inspect source |
| --- | --- | --- |
| Setup / environment | [Root setup](../README.md#local-setup), [configuration](ENVIRONMENT_CONFIGURATION.md) | package.json, `.env.example`, API config/env.ts |
| Backend structure | [Architecture](ARCHITECTURE.md), [controllers](CONTROLLERS.md) | app.ts, routes/api.ts, selected controller |
| HTTP contract | [API index](API.md), selected resource under api/ | packages/schemas/src, matching router/controller/client |
| Error / translation | [Errors](ERROR_HANDLING.md), [localization](LOCALIZATION.md) | errors/, web i18n/, ErrorFeedback |
| Security / roles / invitations | [Security](SECURITY.md), [roles](../ROLE_ARCHITECTURE.md), ADR-006/008 | auth middleware, permission helpers, invitation controller |
| Registration / domain | [Domain](DOMAIN.md), [workflow](REGISTRATION_API.md), ADR-001 | registration/studio controllers, schema.prisma |
| Database migration | [Database review](DATABASE_REVIEW.md), owning ADR, [testing](TESTING.md#postgresql-checks) | schema, migration SQL, scripts/check-*.cjs |
| Frontend feature | [Web guide](../apps/web/README.md), relevant S/F IDs in [screens](UI_UX.md#screen-specifications) / [flows](USER_FLOWS.md), [design system](DESIGN_SYSTEM.md) | selected page, API helper and shared schema |
| Product overview | [Journey outcomes](USER_JOURNEYS.md) | Checkpoint for actual delivery |
| Tests / CI / release evidence | [Testing](TESTING.md) | workspace scripts, tests, .github/workflows/ci.yml |
| Storage / images | [Storage](STORAGE.md), [image contract](api/images.md) | storage services, ImagesController, upload middleware |

Paths in the source column are relative to their corresponding app unless qualified.
No deployment runbook exists yet; P9-DEPLOY owns it. Do not infer production setup
from provider variables or historical examples.

## Audit corrections

The [correction map](AUDIT_FOLLOWUP.md) routes all 15 findings to their owning
roadmap tasks, acceptance evidence and milestone gates. The [audit](REPOSITORY_AUDIT.md)
retains dated source/probe results; planning does not imply implementation fixes.

## Decisions

| ADR | Decision / implementation boundary |
| --- | --- |
| [001](adr/001-studio-identity-and-event-registration.md) | Reusable studio identity; current atomic creation exists, global identity migration pending |
| [002](adr/002-canonical-api-paths.md) | Canonical versioned API; mounted resources aligned; public DTOs/future resources pending |
| [005](adr/005-shared-api-contracts.md) | Shared Zod inputs/serialized DTOs; Phase 1 implemented |
| [006](adr/006-account-eligibility-and-staff-onboarding.md) | Studio signup / invitation-only staff; enforcement pending |
| [007](adr/007-localized-feedback-contracts.md) | Locale-independent feedback; foundation implemented, full journey review pending |
| [008](adr/008-event-scope-integrity.md) | Scope/history preservation; local technical slice implemented, deployment audit pending |

ADR-003 lifecycle and ADR-004 scoring are reserved, unaccepted decisions. Their
required scope is in [DOMAIN](DOMAIN.md#pending-model-decisions); no files or
implemented transitions are implied.

## History and compatibility

Read historical evidence only when investigating a regression or verifying a
past claim: [development history](DEVELOPMENT_HISTORY.md),
[baseline change review](BASELINE_CHANGE_REVIEW.md),
[baseline validation](BASELINE_VALIDATION.md),
[migration validation](MIGRATION_VALIDATION.md),
[dependency refresh](DEPENDENCY_UPDATES.md),
[scope validation](SCOPE_INTEGRITY_VALIDATION.md).

Old setup/storage/controller/error summary filenames are compatibility pointers;
their maintained destinations are linked above. Keep one owner for each rule,
command or task. Update references instead of adding another implementation summary.
Audit scope, findings and measurements: [DOCUMENTATION_AUDIT](DOCUMENTATION_AUDIT.md).
