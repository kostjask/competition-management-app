# Stable dependency refresh

Verified against the npm registry on 2026-10-23 before Phase 1 implementation. The working tree was clean at the start. All 42 external dependency declarations now match the verified stable versions, including the documented TypeScript compiler/API split. Workspace dependencies remain workspace:*; packages/types has no external dependencies to update. pnpm 12.15.0 and Turbo 2.11.10 were already current and remain unchanged.

## Version changes

| Package | Previous declaration | Updated declaration |
| --- | --- | --- |
| `@eslint/js` | `^9.39.1` | `^10.0.1` |
| `@prisma/adapter-pg` | `^7.3.0` | `^7.10.1` |
| `@prisma/client` | `^7.3.0` | `^7.10.1` |
| `@tailwindcss/vite` | `^4.1.18` | `^4.3.3` |
| `@types/multer` | `^1.4.12` | `^2.3.0` |
| `@types/node` | `^25.2.2`, `^24.10.1` | `^26.6.5` |
| `@types/react` | `^19.2.7` | `^19.3.0` |
| `@types/react-dom` | `^19.2.3` | `^19.3.0` |
| `@vitejs/plugin-react` | `^5.1.1` | `^6.1.2` |
| `autoprefixer` | `^10.4.24` | `^10.6.1` |
| `date-fns` | `^4.1.0` | `^4.4.0` |
| `dotenv` | `^17.2.4` | `^18.0.9` |
| `eslint` | `^9.39.1` | `^10.13.0` |
| `eslint-plugin-react-hooks` | `^7.0.1` | `^7.1.1` |
| `eslint-plugin-react-refresh` | `^0.4.24` | `^0.5.7` |
| `express` | `^5.2.1` | `^5.3.0` |
| `globals` | `^16.5.0` | `^17.13.0` |
| `multer` | `^1.4.5-lts.1` | `^2.5.0` |
| `nodemon` | `^3.1.11` | `^3.1.14` |
| `postcss` | `^8.5.6` | `^8.5.31` |
| `prisma` | `^7.3.0` | `^7.10.1` |
| `react` | `^19.2.0` | `^19.3.1` |
| `react-dom` | `^19.2.0` | `^19.3.1` |
| `react-router-dom` | `^7.13.0` | `^7.18.4` |
| `tailwindcss` | `^4.1.18` | `^4.3.3` |
| `tsx` | `^4.21.0` | `^4.23.15` |
| `typescript` | `^5.9.3`, `~5.9.3` | `npm:@typescript/typescript6@^6.0.2` |
| `typescript-eslint` | `^8.48.0` | `^8.72.0` |
| `vite` | `^7.3.1` | `^8.3.5` |
| `zod` | `^4.3.6` | `^4.6.7` |

The root also declares @typescript/native as npm:typescript@^7.0.2. Prisma CLI, client, and PostgreSQL adapter move together to 7.10.1. The registry's prisma latest tag currently points to 8.0.0-rc.27; that prerelease was excluded by inspecting stable published versions rather than blindly using the tag. Other prereleases were excluded as well.

## Compatibility changes

TypeScript 7.0.2 provides the tsc build/typecheck executable. The typescript dependency is an npm alias to the stable @typescript/typescript6 compatibility package (6.0.2), providing the compiler API required by typescript-eslint and other existing tools, plus a separate tsc6 executable. Both root and web use the same compatibility alias, while the root native alias supplies tsc to every workspace. This follows [Microsoft's side-by-side setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/). The latest [typescript-eslint support range](https://typescript-eslint.io/users/dependency-versions/) is below TypeScript 6.1; no peer range was overridden or lint rule disabled. TypeScript 6 support can be removed once these tools support the native compiler API.

Removed the web tsconfig baseUrl option and made its remaining relative path explicit, preserving alias targets for TypeScript 7. The newer React hooks lint rule also requires asynchronous auth hydration to avoid immediate state updates inside the mount effect. Initial token state is captured once; profile results/errors update state through promise callbacks. Explicit login/register/refresh handlers retain their loading/error setup. This also avoids a redundant effect-triggered profile fetch when login updates token state. No endpoint or role/permission behavior changed.

[Vite 8 migration guidance](https://vite.dev/guide/migration) and the [ESLint 10 migration guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0) were reviewed. Vite's default browser baseline now targets newer browsers; no project-specific browser support policy is currently recorded. The existing Vite/ESLint configurations otherwise work with the stable releases. Multer 2 retains the middleware's in-memory upload API, exercised by new HTTP multipart tests for buffers, size limits, MIME filtering, and unexpected file fields.

## Validation

- Registry/manifest comparison: all 42 external declarations match the selected stable releases or documented TypeScript aliases.
- pnpm.cmd install --frozen-lockfile: passed, without peer dependency conflict warnings.
- pnpm.cmd build and pnpm.cmd typecheck: passed across all four workspaces, using TypeScript 7.0.2, including strict seed checking.
- pnpm.cmd lint: passed with ESLint 10 and current React/TypeScript lint plugins.
- pnpm.cmd test: passed, seven API/runtime/upload tests.
- pnpm.cmd db:validate and pnpm.cmd db:generate: passed with Prisma 7.10.1.
- pnpm.cmd test:baseline: passed isolated deployment/redeployment, full-record seed preservation, production-seed rejection, compiled API health/login/profile, and access-denial checks.
- PowerShell scripts/test-migrations.ps1: passed isolated migration SQL, data preservation, partial uniqueness, and schema parity checks.
- Prisma formatting and git diff --check: passed.

The upgrade changes no database model or migration SQL. Database checks used disposable fixtures and cleaned up their own data. Node remains 24.x; @types/node is the latest stable declaration release, 26.6.5, as requested. Runtime behavior remains validated on Node 24.22.1. Frontend auth hydration was typechecked, linted, and bundled; browser E2E coverage is still a separate roadmap item.

Next: decide ADR-001/002/005 before Phase 1 route-contract implementation. Remaining P0 domain, routing, and security findings are unchanged.
