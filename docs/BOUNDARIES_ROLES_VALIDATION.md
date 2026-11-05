# Boundary and role validation

2026-11-05. Technical scope: P2-BOUNDARIES, P2-BOUNDARIES-ERRORS and P2-ROLES.
Revision: base 3445f94 plus this uncommitted working tree. No commit, deployment,
application-data reset or schema migration was performed. External milestones stay open.

## Delivered behavior

- Exact configured HTTP(S) CORS origins, allowed preflight and private 403 denial;
  Origin-less native/server requests remain supported. Production refuses wildcard,
  malformed origin lists, example/low-diversity JWT secrets and unavailable storage types.
- API no-store, nosniff, frame denial, restrictive CSP, no-referrer and permissions
  headers on success/errors/preflight; production adds HSTS. SPA-host policy is separate.
- Separate bounded process-local socket-IP windows for login (20 by default),
  signup/verification, recovery, all invitation methods and image uploads (100 each
  by default), over 15 minutes. Limits run before expensive parsing/authentication;
  429 has shared tooManyRequests semantics and Retry-After. Forwarded IPs cannot
  evade limits. Existing clock-injected tests cover window expiry and IP isolation.
- Explicit 100 KiB JSON limit, 413 requestTooLarge, 400 invalidInput for supported
  malformed/aborted/invalid-length parser failures, and 415 unsupportedEncoding for
  unsupported charset/content encoding. Compressed JSON is deliberately refused.
  Parser bodies/charset/exception details never reach responses. Unknown errors stay 500.
- Profile contains active role assignments plus backend-resolved permission scopes.
  Unsupported scoped admin/global staff rows grant no permissions; removal is visible
  on the next profile request. Admin bypass uses the server-resolved isAdmin flag.
- Hooks, route guards and gates use exact keys and matching/global event scope.
  Unscoped role checks select section landing pages only. Permission checks without
  an event require global scope. All supplied gate requirements must pass.
  Roleless onboarding stays available. Studio ownership, approvals and Judge readiness
  remain independent backend conditions. Denied role URLs have ET/EN/RU feedback,
  heading focus and keyboard home recovery.

## Commands and results

| Command / check | Result |
| --- | --- |
| pnpm.cmd build | Pass; workspace API/web/shared packages, unchanged outputs may use Turbo cache |
| pnpm.cmd typecheck | Pass; strict workspace and browser/role-test types |
| pnpm.cmd lint | Pass; current repository scope is web |
| pnpm.cmd test | Pass; localization guard, 105 API and 13 frontend tests |
| pnpm.cmd --filter api test | Fresh pass; 105 API tests after final parser/profile assertions |
| pnpm.cmd test:browser | 25 Chromium cases: 12 foundation plus 12 locale/viewport role matrices and guest/expiry |
| pnpm.cmd db:generate / db:validate | Pass using a nonconnecting placeholder URL |
| pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma | Pass |
| pnpm.cmd test:baseline | Pass; complete isolated PostgreSQL/API baseline including profile scope/removal, existing ownership/parent/admin-denial matrices and images |
| powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1 | Pass; fresh/upgrade preservation and schema parity in temporary fixture schemas |
| docker compose --env-file deploy/staging.env -f docker/docker-compose.staging.yml config --quiet | Pass; configuration only, no rollout or secret output |
| node --check scripts/check-docs.cjs / node scripts/check-docs.cjs / git diff --check | Pass; Markdown UTF-8, links/anchors, fences and whitespace plus final diff review |

The Compose target was verified as the checked-in postgres:16 dance-postgres
service on local port 5432. The baseline creates/removes its random dance_baseline_*
database using checked-in fixture configuration. Migration checks use temporary
schemas on the disposable Compose database, then remove those schemas. They do
not establish intended-deployment provenance. Docker checks required sandbox
escalation; the read check and both isolated suites were approved and passed.

The first full baseline stopped at 429 because its repeated single-IP fixture
logins exceeded the new default. Its environment now explicitly sets login/general
limits to 500/2000; the rerun passes. Dedicated HTTP tests independently verify
low limits, category isolation, pre-parser rejection and forwarded-address denial.
A production-email unit fixture now supplies an explicit production CORS origin.
Browser setup pins a synthetic same-origin API so ignored local Vite settings cannot
redirect fixture traffic. Initial JSX/type setup issues were corrected before passing.

Failing-before-fix evidence: original HEAD app/error handlers were transpiled into
unique isolated temporary modules without replacing source/current build files.
All four maintained CORS/header/rate/parser probes failed against those handlers.
The original RoleGate failed the combined-auth/role requirement test (the two
pure policy cases passed). Temporary probe files were removed in finally blocks.
The fixed maintained suites pass; original source/history was preserved.

Browser roles cover renamed/similarly named unrelated keys, scoped admin, global
judge, roleless/multiple roles, wrong event, global admin, absent permissions,
guest direct navigation and expired-profile session clearing. ET/EN/RU cases run
at 320/390/768/1440 px, inspect overflow, focus the denial heading and follow its
home link by keyboard. Synthetic screenshots/traces stay ignored in test-results. Visual spot review of
the focused denial/recovery at EN/RU 320px and ET 1440px confirms legible text and
visible keyboard focus; this is not fluent-language or screen-reader review.

## Limits and next work

No full application/auth/navigation journey, fluent-language or screen-reader
review is claimed. The rest of the shell remains P2-UI-SHELL and auth screens
remain P2-UI-AUTH. In-memory windows reset with the process; multiple workers
need reviewed shared/ingress limits. Proxy trust remains false, so clients behind
one ingress share its socket-IP bucket. Hosting HTTPS/SPA headers, deployment
provenance/backup, real mail and actual rollout remain unverified operational gates.
No dependency was added. Existing transactional image/domain audit behavior is
unchanged and its regression suite passes. Rejected parser/transport requests do
not create domain mutations or invent authenticated audit actors.

Next task: P2-SESSION. Explain cookie/bearer threat-model options and recommendation,
record the decision, then implement session expiry/storage and validated internal
return handling before dependent signup and full auth journeys.
