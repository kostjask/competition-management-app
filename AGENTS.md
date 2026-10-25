# Repository instructions

Applies repository-wide. TypeScript monorepo: apps/api (Express/Prisma), apps/web
(React/Vite), packages/schemas (shared Zod contracts), packages/types (types that
cannot be inferred). [Documentation map](docs/README.md).

## Start and scope

1. Read [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md), then only the selected task's
   roadmap section and relevant docs. Check active phase, priority and prerequisites.
2. Inspect git status --short and relevant diffs before editing. Existing edits
   belong to the user: preserve them; no reset/discard/overwriting or unrelated reformatting.
3. Inspect implementation; reconcile code/doc mismatches before relying on docs.
4. Without a selected task, choose the highest-priority actionable unchecked item
   in the active phase. Respect documented dependencies/exit criteria; later work
   needs its plan gates or an explicit user request. Do not add unrelated roadmap work.

Fix root causes with simple, focused changes following existing conventions.
No dependency downgrade/new library without concrete need. Record broad or hard
to reverse architecture choices in docs/adr before dependent work. If ambiguity
materially changes domain behavior/architecture, explain options and recommendation first.

## Development database policy

The user confirmed on 2026-10-25 that the current development database contains
only disposable test data, with no real user/production data to preserve. Choose
the schema/model best suited to the project; reset/reseed that database and
replace fixtures when useful within the selected task. Do not add legacy
compatibility, backfills or preservation complexity solely for existing test rows.
Before destructive database work, verify the resolved connection target is this
disposable development/test database without exposing credentials; do not assume
other environments are disposable. Applied migration history may be rewritten
only after confirming it is unpublished and unused by non-disposable environments.
Domain integrity/history behavior and meaningful migration tests still apply;
existing source/Git edits must always be preserved. Operational details:
[TESTING](docs/TESTING.md#development-database-and-disposable-data).

## Contracts and backend

- Keep strict TypeScript; no any, unsafe casts or implicit unknown handling.
  Infer transport types from shared Zod schemas instead of duplicating interfaces.
- Validate all external input on the backend. Align Prisma/migrations, schemas,
  serialized DTOs, clients and UI. HTTP dates use documented ISO strings/calendar
  dates; one canonical endpoint per operation. Keep examples/payloads synchronized.
- Routes compose middleware/controller calls; non-trivial behavior belongs in
  established controllers/services. Use centralized config, errors and global handler.
- Backend is the security boundary: enforce authentication, permissions, event
  scope, ownership and active records. Verify every supplied entity relationship;
  never trust client event/studio/user/dancer/performance/judge/score associations.
- Use transactions for atomic multi-record work; consistent domain soft-delete
  and audit fields. Review preservation, indexes, constraints, referential actions
  and rollback. Add migrations; edit applied history only when confirmed unpublished/disposable.

## Frontend

- Align role keys/event scopes with backend; UI gates provide usability only.
  Use shared contracts and API helpers, no feature-level fetch.
- Provide loading, empty, validation/server-error, success and disabled states;
  semantic HTML, keyboard access, responsive layout and clear focus.
- All user-facing text must be translatable in ET/EN/RU unless explicitly temporary.
  Keep component/context state until a broader state solution is demonstrably needed.

## Validate and maintain

- Add/update behavior tests where infrastructure exists; add a failing-before-fix
  regression when practical. Include denied/cross-event/cross-studio cases.
- Start narrow, then run applicable tests, typecheck, lint, build and Prisma
  format/validate/generate; database changes also need migration/API integration
  checks. Commands and isolation: [TESTING](docs/TESTING.md).
- Claim success only for completed commands. Report exact environmental,
  dependency/database or unrelated blockers separately from change failures;
  do not fix unrelated failures without a request.
- Update docs when setup/env/contracts/architecture/workflows/operations change.
  Use UTF-8; correct mojibake in touched files or a dedicated docs task.
- Before completion update the checkpoint and owning roadmap: completed tasks,
  stale statements, risks/blockers, new work in its phase, next concrete action.
  Do not close a phase before exit criteria. Place outside-plan work appropriately
  or explain why it stays outside. Keep current state separate from historical evidence.

## Git safety and handoff

No commits, push, branch/history/remote changes without explicit authorization.
No destructive Git commands or removal of apparently obsolete files without
confirming they are not active work. Keep generated files/secrets ignored; never
expose env values, credentials, tokens, personal data or private uploads.
Review final diff and git diff --check.

Handoff: outcome/why, key decisions, changed files, commands/results, remaining
risks/deferred work, and the next recorded task. Do not claim completion while
required implementation/tests/migrations/docs/plan updates remain unfinished.
