# Repository Development Instructions

These instructions apply to the entire repository.

## Project Context

This repository contains a dance competition management system implemented as a TypeScript monorepo:

- `apps/api`: Express and Prisma backend.
- `apps/web`: React and Vite frontend.
- `packages/schemas`: shared Zod validation and contract schemas.
- `packages/types`: shared TypeScript types that cannot be derived from schemas.
- `docs`: architecture, setup, API, and workflow documentation.
- `DEVELOPMENT_PLAN.md`: current status, prioritized roadmap, blockers, and next actions.

## Before Making Changes

1. Read `DEVELOPMENT_PLAN.md` and the documentation relevant to the requested work.
2. Inspect `git status --short` and the relevant diff before editing.
3. Preserve all existing uncommitted work. Never reset, discard, overwrite, or broadly reformat unrelated changes.
4. Inspect the implementation before relying on documentation. When code and documentation conflict, identify the mismatch and determine which behavior is intended.
5. Check the current phase, dependencies, and priority in `DEVELOPMENT_PLAN.md`.
6. If the user did not select a task, work on the highest-priority actionable unchecked item in the active development phase.
7. Do not start a later roadmap phase while its documented dependencies or exit criteria remain incomplete, unless the user explicitly requests it.

## Development Principles

- Fix root causes rather than symptoms.
- Keep changes focused on the requested task or active plan item.
- Follow existing project structure and conventions unless an approved architecture decision changes them.
- Prefer simple, explicit code over unnecessary abstractions.
- Do not implement unrelated roadmap items opportunistically.
- Do not downgrade dependencies or introduce new libraries without a concrete need.
- Record broad or difficult-to-reverse architecture decisions under `docs/adr/` before implementing dependent work.
- When requirements are ambiguous and the choice materially affects domain behavior or architecture, explain the options and recommendation before making the change.

## Type Safety and Contracts

- Keep TypeScript strict and avoid `any`, unsafe casts, and implicit `unknown` handling.
- Validate all external input on the backend with Zod or an established equivalent.
- Treat the backend as the security and validation boundary; never rely only on frontend validation.
- Keep Prisma models, migrations, shared Zod schemas, API DTOs, frontend API clients, and UI types consistent.
- Prefer types inferred from shared schemas over manually duplicated request and response interfaces.
- Use explicit serialized DTOs at HTTP boundaries. Dates crossing the API boundary should use documented ISO strings.
- Use one canonical endpoint per operation and ensure documented, backend, and frontend paths agree.

## Backend Rules

- Keep routes focused on route declaration and middleware composition.
- Put non-trivial request handling and business behavior in the established controller/service layers.
- Use centralized configuration instead of reading environment variables throughout the application.
- Use centralized error classes and the global error handler; do not introduce incompatible ad-hoc error formats.
- Enforce authentication, permissions, event scope, resource ownership, and active-record checks on the backend.
- Never trust client-provided event, studio, user, dancer, performance, judge, or score relationships.
- Use transactions for multi-record operations that must succeed or fail together.
- Apply soft-delete and audit fields consistently where the domain requires them.
- Review migrations for data preservation, indexes, constraints, referential actions, and rollback implications.
- Never edit an already-applied migration merely to change current behavior; add a new migration unless the migration is confirmed unpublished and disposable.

## Frontend Rules

- Keep role and permission checks aligned with backend role keys and event scopes.
- Frontend role gates are usability controls, not security boundaries.
- Reuse the API client and shared contracts instead of calling `fetch` directly in feature components.
- Provide loading, empty, validation-error, server-error, success, and disabled states where applicable.
- Maintain keyboard accessibility, semantic HTML, responsive layouts, and clear focus states.
- Keep all user-facing application text translatable in Estonian, English, and Russian unless explicitly temporary.
- Avoid introducing global state management until component/context state is demonstrably insufficient.

## Testing and Validation

- Add or update tests for changed behavior when the repository has the necessary test infrastructure.
- For bug fixes, add a regression test that fails before the fix when practical.
- Test authorization failures and cross-event/cross-studio access, not only successful requests.
- Start with the narrowest relevant validation, then expand to broader checks.
- Before finishing, run all applicable commands available in the repository:
  - Targeted tests.
  - Typecheck.
  - Lint.
  - Build.
  - Prisma format/validate/generate checks.
  - Migration or API integration checks when database behavior changed.
- Do not claim validation passed unless the command actually completed successfully.
- If validation cannot run because of environment, dependency, database, or unrelated repository problems, report the exact blocker and distinguish it from failures caused by the current change.
- Do not fix unrelated failing tests or lint issues unless the user asks; report them separately.

## Documentation and Plan Maintenance

- Update documentation whenever setup, environment variables, API contracts, architecture, domain workflows, or operational behavior changes.
- Keep examples synchronized with actual ports, paths, payloads, and response shapes.
- Use UTF-8 and correct existing mojibake only in files already being changed or as a dedicated documentation task.
- Before completing any implementation task, update `DEVELOPMENT_PLAN.md`:
  - Check completed tasks.
  - Update statements that are no longer accurate.
  - Record newly discovered risks or blockers.
  - Add newly required work in the correct phase.
  - Record the next concrete actionable task.
- Do not mark a phase complete until its exit criteria are satisfied.
- If the requested task is intentionally outside the current plan, add it to the appropriate phase or document why it should remain outside the roadmap.

## Git and Change Safety

- Assume existing modifications belong to the user unless proven otherwise.
- Never run destructive Git commands or remove files merely because they appear obsolete without confirming they are not part of active work.
- Do not commit, push, create branches, rewrite history, or modify remotes unless explicitly requested.
- Keep generated files and secrets out of Git according to `.gitignore`.
- Do not expose `.env` values, credentials, tokens, personal data, or uploaded private files in logs or responses.
- Review the final diff and `git diff --check` before handoff.

## Completion Report

At the end of a development task, provide a concise handoff containing:

1. What was implemented and why.
2. Important behavior or architecture decisions.
3. Files changed.
4. Validation commands and their results.
5. Remaining risks, blockers, or intentionally deferred work.
6. The next concrete task recorded in `DEVELOPMENT_PLAN.md`.

Do not describe a task as complete while required implementation, tests, migrations, documentation, or plan updates remain unfinished.
