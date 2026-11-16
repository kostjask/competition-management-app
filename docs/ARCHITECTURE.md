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
2. `client.ts` uses the configured `/api/v1` base, includes HttpOnly cookie credentials and
   CSRF/session-negotiation headers. It returns unknown output; resource helpers
   decode shared schemas before use. Browser credentials never enter Web Storage;
   native bearer transport is separate. See [client conventions](../apps/web/src/api/README.md).
3. `createApp(prisma)` mounts `routes/api.ts`; concrete routes compose public/auth
   boundaries, middleware and controller delegation.
4. Controllers parse shared schemas and enforce stored relationships, permissions,
   ownership, active records and stage rules. They call Prisma directly and use
   transactions for dependent writes; services cover audit, registration/access
   policy, onboarding, sessions, email dispatch and storage.
5. Explicit DTOs serialize dates and omit private persistence fields. Shared
   response validation runs before sending. The global handler converts failures
   to the semantic envelope; web presenters localize descriptors at render time.

`apps/api/src/index.ts` constructs dependencies, initializes local storage,
registers signals and listens. `app.ts` constructs no database/listener/provider;
tests inject a Prisma fixture. `/health` queries the database. `/uploads` is
authenticated, current-reference/resource-scoped image retrieval outside the
business prefix, with no public static fallback. See [image contracts](api/images.md).

## Model and delivery boundaries

Current participating studios remain event-owned; reusable identity is the
accepted ADR-001 target. Performances have explicit immutable studio/registration
owners, nullable unscheduled drafts and saved revisions under ADR-022/023/024.
Native DATE birth dates and ADR-025 studio checkpoints/review/recovery are
implemented. Representative entry/music UI and live/scoring/calculated-result
models remain open; see [domain](DOMAIN.md) and the checkpoint for task status.

## Studio and festival target architecture

[ADR-026](adr/026-studio-and-festival-platform.md) keeps one repository/backend
with public content/publishing, festival registration/entries and competition
operations as clear modules. Target two public addresses and shared private
administration; [product scope](PRODUCT_SCOPE.md) owns audiences/exclusions.
There is no CMS, public-content API or /app router base implemented yet.

P4-PUBLIC-MODEL's ADR-026 design defines optional unique edition/event links,
immutable structured revisions, public DTO/document-owned rasters, authorized
preview, no-store reads, locale routes, request-rendered public HTML and required
/app identity-link transition checks. P4-PUBLIC-EDITOR implements the model and S20/F12;
no framework switch, new service or database split is implied.
Current auth URLs, safe returns, mail links and origin checks remain canonical
until a tested route transition. Anonymous studio pages do not need shared-domain
login cookies. Never expose current private images/event DTOs as public content.

Backend security gaps are tracked in [SECURITY](SECURITY.md), not excused by UI
gates or shared DTO completion. [DOMAIN](DOMAIN.md) distinguishes current rules
from targets. [Controllers](CONTROLLERS.md) and [API](API.md) cover implementation
conventions/contracts; accepted architecture decisions live in [the ADR index](README.md#decisions).
