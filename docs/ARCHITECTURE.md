# Architecture

## Runtime boundaries

| Package | Responsibility |
| --- | --- |
| apps/api | Express HTTP/security boundary, business rules, Prisma and provider integration |
| apps/web | React routes/forms, context-based session/locale state, validated API clients |
| packages/schemas | Browser/server-safe Zod inputs, serialized DTOs, semantic feedback contracts |
| packages/types | Shared declarations that cannot be inferred from schemas |

pnpm workspaces and Turbo orchestrate builds. Shared schemas emit ESM JavaScript
and declarations; the NodeNext API emits CommonJS and runs on Node 24. Web uses
Vite. Manifests/lockfile own exact versions; the compiler/tooling API split is
summarized in [README](../README.md).

## Request and data flow

1. A web feature calls its resource helper under `apps/web/src/api`.
2. `client.ts` uses the configured `/api/v1` base, attaches bearer credentials and
   returns unknown output; helpers decode shared schemas before use/session storage.
3. `createApp(prisma)` mounts `routes/api.ts`; concrete routes compose public/auth
   boundaries, middleware and controller delegation.
4. Controllers parse shared schemas and enforce stored relationships, permissions,
   ownership, active records and stage rules. They call Prisma directly and use
   transactions for dependent writes; services currently cover storage integration.
5. Explicit DTOs serialize dates and omit private persistence fields. Shared
   response validation runs before sending. The global handler converts failures
   to the semantic envelope; web presenters localize descriptors at render time.

`apps/api/src/index.ts` constructs dependencies, initializes local storage,
registers signals and listens. `app.ts` constructs no database/listener/provider;
tests inject a Prisma fixture. `/health` queries the database; `/uploads` serves
local files publicly outside the business prefix.

## Model and delivery boundaries

Current studios remain event-owned; reusable identities are the accepted ADR-001
target. Performance ownership is inferred from participants; explicit owners,
incomplete drafts, historical snapshots and native calendar-date storage remain
Phase 3 work. No score-sheet/live/results architecture is implemented.

Backend security gaps are tracked in [SECURITY](SECURITY.md), not excused by UI
gates or shared DTO completion. [DOMAIN](DOMAIN.md) distinguishes current rules
from targets. [Controllers](CONTROLLERS.md) and [API](API.md) cover implementation
conventions/contracts; accepted architecture decisions live in [the ADR index](README.md#decisions).
