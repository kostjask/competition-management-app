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

The checkpoint's [implementation queue](../DEVELOPMENT_PLAN.md#implementation-order)
and [gate rules](../DEVELOPMENT_PLAN.md#development-and-release-gates) distinguish
local model/security prerequisites from hosted workflow release evidence.
[Plan revalidation](PLAN_REVALIDATION.md) records the 2026-11-06 source cross-check
and the restored P3 registration-first flow; it is not a new runtime audit.

| Working on | Read | Inspect source |
| --- | --- | --- |
| Setup / environment | [Root setup](../README.md#local-setup), [configuration](ENVIRONMENT_CONFIGURATION.md) | package.json, `.env.example`, API config/env.ts |
| Backend structure | [Architecture](ARCHITECTURE.md), [controllers](CONTROLLERS.md) | app.ts, routes/api.ts, selected controller |
| HTTP contract | [API index](API.md), selected resource under api/ | packages/schemas/src, matching router/controller/client |
| Error / translation | [Errors](ERROR_HANDLING.md), [localization](LOCALIZATION.md) | errors/, web i18n/, ErrorFeedback |
| Security / roles / invitations | [Security](SECURITY.md), [roles](../ROLE_ARCHITECTURE.md), ADR-006/008 | auth middleware, permission helpers, invitation controller |
| Audit / privacy / onboarding foundation | [Privacy](PRIVACY.md), ADR-012/013/014, [validation](PHASE_2A_VALIDATION.md) | services/audit, onboarding, staffPolicy, emailQueue; schema/migrations |
| Registration / domain | [Domain](DOMAIN.md), [workflow](REGISTRATION_API.md), ADR-001/003/019 | registration/studio controllers, schema.prisma |
| Database migration | [Current schema audit](SCHEMA_SUITABILITY_AUDIT.md), [database review](DATABASE_REVIEW.md), owning ADR, [testing](TESTING.md#postgresql-checks) | schema, migration SQL, scripts/check-*.cjs |
| Frontend feature | [Web guide](../apps/web/README.md), relevant S/F IDs in [screens](UI_UX.md#screen-specifications) / [flows](USER_FLOWS.md), [design system](DESIGN_SYSTEM.md) | selected page, API helper and shared schema |
| Product overview | [Journey outcomes](USER_JOURNEYS.md) | Checkpoint for actual delivery |
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

| ADR | Decision / implementation boundary |
| --- | --- |
| [001](adr/001-studio-identity-and-event-registration.md) | Reusable studio identity; current atomic creation exists, global identity migration pending |
| [002](adr/002-canonical-api-paths.md) | Canonical versioned API; mounted resources aligned; public DTOs/future resources pending |
| [003](adr/003-registration-lifecycle.md) | M2 independent decisions, deadline/timezone, revisioned retained cancellation/reapplication; live scope remains pending |
| [019](adr/019-m2-authored-content.md) | M2 authored content/source-language/fallback contract; P4 storage/editors remain pending |
| [005](adr/005-shared-api-contracts.md) | Shared Zod inputs/serialized DTOs; Phase 1 implemented |
| [006](adr/006-account-eligibility-and-staff-onboarding.md) | Studio-intent signup, verified access and scoped staff onboarding implemented locally; applications and external release remain gated |
| [007](adr/007-localized-feedback-contracts.md) | Locale-independent feedback; foundation implemented, full journey review pending |
| [008](adr/008-event-scope-integrity.md) | Scope/history preservation; local technical slice implemented, deployment audit pending |
| [009](adr/009-email-identity.md) | Canonical account/invitation email; collision refusal and local checks implemented, deployment review pending |
| [010](adr/010-identity-token-lifecycle.md) | Purpose-bound digests and atomic lifecycle; ADR-011 supplies public recovery, while real delivery remains gated |
| [011](adr/011-public-account-recovery.md) | Public recovery acknowledgements, password-proven correction, session revision and process-local recovery limits; real email/UI remain gated |
| [012](adr/012-durable-domain-audit.md) | Minimal transactional immutable audit and privacy-safe actor/metadata policy |
| [013](adr/013-onboarding-staff-and-recipient-locale.md) | Recoverable drafts, referenced staff/studio scope, removal history and recipient locale policy |
| [014](adr/014-transactional-email-dispatch.md) | Resend, encrypted durable dispatch, bounded idempotent retries and truthful acknowledgement |
| [015](adr/015-image-boundaries.md) | Image ownership/active parents, canonical raster decoding, private retrieval and audited replacement |
| [016](adr/016-browser-sessions-and-safe-return.md) | HttpOnly browser JWTs, native bearer isolation, CSRF, audited all-session logout, work recovery and safe return paths |
| [018](adr/018-staff-acceptance-and-offboarding.md) | Atomic Judge acceptance, retained event staff offboarding and audit |

ADR-003 accepts the M2 application/review subset; live operation remains pending.
ADR-004 scoring is reserved and unaccepted; its required scope is in
[DOMAIN](DOMAIN.md#pending-model-decisions).

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

Public studio onboarding and invitation lifecycle: [ADR-017](adr/017-public-onboarding-and-invitation-lifecycle.md) and [validation](ONBOARDING_INVITATIONS_VALIDATION.md).
