# Documentation backlog

[Current checkpoint](../../DEVELOPMENT_PLAN.md) · [Documentation map](../README.md)

Current application priority: [checkpoint queue](../../DEVELOPMENT_PLAN.md#implementation-order).
Completed entries describe their delivery date; linked reports retain historical
commands/results. Feature roadmaps own implementation and release status.

## Tasks

- [x] DOCS-BRANCH-WORKFLOW (2026-11-13): add target freshness, overlapping implementation/PR checks, dependency-base tracking and shared-file/migration coordination to AGENTS after the parallel M2 branches required reconciliation. Authorize fetching existing remote refs for comparison while preserving session authorization for integration and publication. Documentation checks pass. The next implementation task remains the checkpoint's P3-ENTRIES lifecycle.
  Operational follow-up (2026-11-14): PR #4 reused the branch after PR #3 was
  squash-merged. Main's complete tree equals the branch's earlier b3dd683 tree;
  the old merge base produces conflicts against newer entry work. The local
  noncommitting ancestry reconciliation preserves the complete newer tree and
  existing edits. [Current handoff](../../DEVELOPMENT_PLAN.md#current-state)
  records the subsequent commit/push authorization and validation limits. Hosted
  mergeability/CI must confirm the published head; this outside-feature-queue
  repair leaves P5-ENTRIES next.

- [x] DOCS-UI-DIRECTION (2026-11-10): record the user's rejection of the entire placeholder UI and required full Hallmark redesign; reconcile UX-D01 and provisional typography/adoption guidance, add P9-UI-REDESIGN ownership and agent/checkpoint routing. Documentation only; redesign remains unimplemented, existing technical completion and implementation queue unchanged.

- [x] DOCS-MAINTENANCE (2026-11-10): source-check maintained instructions, clarify canonical owners/selective reading, move repetitive checkpoint evidence to existing history, reconcile stale routing/backlog/behavior claims and label dated reports. Application priorities, task states and release gates preserved. [Scope, checks and remaining work](../DOCUMENTATION_AUDIT.md#maintenance-2026-11-10).

- [x] PLAN-REVALIDATION (2026-11-06): separate local/model/deployment/release gates, restore registration-first M2 order and preserve task IDs/acceptance criteria. Documentation-only [findings and validation](../PLAN_REVALIDATION.md); its next-task statement is historical.

- [x] DOCS-DISPOSABLE-DATA (2026-10-25): record the user's confirmation that the current development database contains only disposable test data. Add standing scoped reset/reseed/fixture permission and target verification in AGENTS/TESTING; clarify plan/foundation/audit preservation requirements without changing domain safeguards, migration publication rules or active-task priority. Documentation only; no database reset or implementation changes.

- [x] AUDIT-FOLLOWUP-PLAN (2026-10-25): map all 15 repository findings to task owners, prerequisites, milestone gates and regression acceptance in [the correction map](../AUDIT_FOLLOWUP.md). No implementation change; subsequent closure belongs to feature roadmaps.

- [x] Rewrite the root README as the short entry point: product, prerequisites, startup, scripts, architecture links, and current maturity.
- [x] Add [user journeys and UX requirements](../USER_JOURNEYS.md) with implementation gaps, target steps, approval explanations, recovery/notification behavior, acceptance criteria, and decision/dependency gates. Rewrite the registration guide around current contracts and link maintained guides from README/API.
- [x] Replace the default web README with frontend-specific setup and conventions.
- [x] Add `docs/ARCHITECTURE.md` with application boundaries and request/data flow.
- [x] Add `docs/DOMAIN.md` with current lifecycle/role/registration rules and explicitly pending scoring/ranking decisions.
- [x] Add `docs/API.md` with current versioned integration status, authentication boundaries and validation scope.
- [x] Split current API contracts by resource and link them from the API index; keep schemas and source authoritative.
- [ ] Add generated OpenAPI instructions when that infrastructure is implemented; extend resource docs alongside future endpoints.
- [x] Add `docs/SECURITY.md` with authorization model and data-handling rules.
- [x] Add `docs/TESTING.md` for existing checks, CI, isolated fixtures, cleanup and validation limits.
- [ ] Add `docs/DEPLOYMENT.md` when P9-DEPLOY has provider-specific hosted rollout/rollback/restore evidence; [STAGING](../STAGING.md) owns current preparation/rehearsal steps. Do not create a second generic checklist.
- [x] Add ADR-001, ADR-002, and ADR-005 for studio identity, canonical paths, and shared contracts.
- [x] Add ADR-006 for studio-focused signup and invitation-only staff onboarding; align journey, registration, API, root, and role guides. Implementation is tracked separately in the foundation/organizer roadmaps.
- [x] DB-REVIEW: record [database integrity and UX findings](../DATABASE_REVIEW.md), map them to prioritized tasks, and align identity/onboarding/journey guidance. Documentation only; no schema migration, deployed-data audit, index change, token conversion, or constraint fix is claimed.
- [ ] Complete lifecycle/scoring ADR coverage: [ADR-003](../adr/003-registration-lifecycle.md) is accepted for M2; live scope remains P6-LIVE-MODEL. ADR-004 scoring remains unaccepted/unfiled and must precede P6-SCORING-MODEL consumers. Keep this combined outcome open until remaining decisions are recorded.
- [x] Consolidate obsolete implementation summaries into maintained guides; retain compatibility pointers and clearly label dated evidence.
- [x] Reconcile maintained setup/storage/controller/error/role guides with current source; remove speculative provider/code examples and stale completion claims.
- [x] Validate repository Markdown as UTF-8; preserve existing correct Unicode.
- [x] Document Phase 1 I18N-CONTRACT/VALIDATION, locale fallback and dictionary conventions in docs/LOCALIZATION.md and ADR-007. Later delivery and human review remain tracked in the localization roadmap.

- [x] DOCS-AUDIT: audit all repository Markdown; shorten entry points, split roadmap/API by task, consolidate obsolete guides, correct source mismatches, and validate local links, anchors, task preservation and UTF-8. See [audit](../DOCUMENTATION_AUDIT.md).
- [x] REPOSITORY-AUDIT (2026-10-25): source/contracts and isolated validation [evidence](../REPOSITORY_AUDIT.md); no implementation changes or milestone closure. [Correction map](../AUDIT_FOLLOWUP.md) routes findings; original next-task/security status is historical.
