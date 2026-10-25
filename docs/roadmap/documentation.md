# Documentation backlog

[Current checkpoint](../../DEVELOPMENT_PLAN.md) · [Documentation map](../README.md)

## Tasks

- [x] AUDIT-FOLLOWUP-PLAN (2026-10-25): map all 15 repository findings to owning roadmap tasks, prerequisites, milestone gates and correction/regression evidence in [the correction plan](../AUDIT_FOLLOWUP.md). Add explicit M1 security slices and M2 reapplication recovery, reconcile security/testing/checkpoint guidance and retain every implementation finding as unresolved. Documentation checks passed for 83 Markdown files/420 local links, checker syntax and final whitespace; runtime checks were not rerun for this prose-only update. Next implementation task remains P2-IDENTITY-TOKENS.

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
- [ ] Add `docs/DEPLOYMENT.md`.
- [x] Add ADR-001, ADR-002, and ADR-005 for studio identity, canonical paths, and shared contracts.
- [x] Add ADR-006 for studio-focused signup and invitation-only staff onboarding; align journey, registration, API, root, and role guides. Runtime signup restrictions, atomic judge assignment, and invitation UI/security remain unchecked in their owning phases.
- [x] DB-REVIEW: record [database integrity and UX findings](../DATABASE_REVIEW.md), map them to prioritized tasks, and align identity/onboarding/journey guidance. Documentation only; no schema migration, deployed-data audit, index change, token conversion, or constraint fix is claimed.
- [ ] Add ADR-003 and ADR-004 for lifecycle and scoring before their dependent implementation.
- [x] Consolidate obsolete implementation summaries into maintained guides; retain compatibility pointers and clearly label dated evidence.
- [x] Reconcile maintained setup/storage/controller/error/role guides with current source; remove speculative provider/code examples and stale completion claims.
- [x] Validate repository Markdown as UTF-8; preserve existing correct Unicode.
- [x] Document Phase 1 I18N-CONTRACT/VALIDATION, locale fallback and dictionary conventions in docs/LOCALIZATION.md and ADR-007. Account/email preferences, organizer-content policy and workflow/browser/fluent-language evidence remain their explicitly unchecked cross-phase tasks.

- [x] DOCS-AUDIT: audit all repository Markdown; shorten entry points, split roadmap/API by task, consolidate obsolete guides, correct source mismatches, and validate local links, anchors, task preservation and UTF-8. See [audit](../DOCUMENTATION_AUDIT.md).
- [x] REPOSITORY-AUDIT (2026-10-25): review working-tree implementation, recent history, contracts and plan claims; rerun workspace/Prisma/isolated database checks and record verified security/workflow defects, conditional risks and unverified areas in [the implementation audit](../REPOSITORY_AUDIT.md). No implementation changes or milestone closure; next development task remains P2-IDENTITY-TOKENS. Existing task owners retain the corrections; explicitly include scoped-admin and active-content upload cases in pre-exposure security checks and parser-error mapping in boundary hardening.
