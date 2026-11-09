# Session, formatting and shell validation

> Dated evidence; results and “next task” statements apply to the recorded snapshot.
> Current priority/status: [checkpoint](../DEVELOPMENT_PLAN.md); commands: [TESTING](TESTING.md).

2026-11-05. Tasks: P2-SESSION, Phase 2 I18N-FORMATTING and P2-UI-SHELL.
Base revision 3445f94 plus the preserved prior boundary/role work and this uncommitted
working tree. No commit, push, application-data reset or staging deployment occurred.

## Decisions and implementation

[ADR-016](adr/016-browser-sessions-and-safe-return.md) records the cookie/bearer
tradeoff before dependent code. Browsers use one-hour host-only HttpOnly JWT cookies,
SameSite=Lax and Secure in production. Negotiated browser responses contain no JWT;
tokens are removed from old browser storage rather than migrated. Non-browser
clients retain explicit bearer sessions. Transport confusion and ambiguous proofs
fail closed. Every protected operation still rechecks eligibility/revision/access.
Cookie requests require exact-origin credentialed CORS; unsafe operations also need
X-CSRF-Protection: 1. Native bearer requests do not depend on cookie proof.

POST /auth/logout is caller-only, strictly validated and transactional: sessionVersion
increments with immutable SESSION_REVOKED audit, then the cookie clears. All account
sessions are revoked, while other accounts, credentials and domain access are
preserved. Failed audit/domain work rolls back; concurrent losers do not append
another audit. Migration 28 expands only the action CHECK. No model/data rewrite,
backfill or disposable fixture compatibility was introduced.

Profile bootstrap establishes browser state. Expiry pauses mounted work behind an
inert native dialog, with same-account sign-in and fresh profile permissions before
resuming. Writes are never automatically replayed. Explicit logout confirms loss of
unsaved work and does not claim success on network failure. Nonsecret BroadcastChannel
messages reconcile other tabs; server checks cover every tab/device independently.
Browsers without that API reconcile at their next protected request. Reload can
recover saved server work, not unsaved private in-memory fields or passwords.

Shared return paths allow implemented canonical relative destinations only. Login
rejects external/encoded/query/fragment/unsupported paths; verification strips its
secret from the visible URL before a deliberate Verify action and explicit Continue.
Missing device context falls back to /. A signed-in user must explicitly sign out
before verifying another account. Registration no longer falsely sets signed-in state.
Verification stays disabled until identity bootstrap resolves, and a retry that
establishes a legitimate guest clears earlier network feedback. Full studio signup, password-recovery screens and invitation management/acceptance
journeys are not claimed by this slice.

The app/auth shell now has translated supported role navigation, selected-event
context, skip/main landmarks, route title/focus and explicit protected-event sign-in,
denied and not-found states. The account disclosure uses ordinary links/buttons
with Escape/focus restoration. Profile is read-only, wraps long identity text,
translates known role keys and labels global/unsupported scope without implying
privilege. Unimplemented application/studio actions are unavailable rather than
broken links. Roleless users can browse permitted event data. Workspace placeholders
are explicitly unavailable, without invented management operations.

Central Intl formatting covers current instant/calendar-date/numeric displays,
including semantic validation/plural interpolation. UTC is explicit on event
read/edit screens; datetime editors preserve UTC instants in a non-UTC browser.
Calendar helpers refuse invalid days and do not shift birth-date-style values.
Document lang, route titles, loading/control names and profile joined dates follow
ET/EN/RU. Future currency/duration/event-zone requirements stay with their features.
Migrated literal exceptions were removed; 34 generic-registration exceptions remain.
Private image credentials also work with the deployed relative /api/v1 base and
still refuse foreign, query-bearing, redirected or noncanonical image URLs.

## Key changed files

- API transport/auth/logout: [session service](../apps/api/src/services/browserSession.ts), [middleware](../apps/api/src/middleware/auth.ts), [controller](../apps/api/src/controllers/AuthController.ts).
- Contracts/history: [session DTOs](../packages/schemas/src/auth.schema.ts), [return allowlist](../packages/schemas/src/return-path.ts), [forward migration](../apps/api/prisma/migrations/20261105000000_session_audit/migration.sql).
- Browser state/layout: [transport](../apps/web/src/api/client.ts), [provider](../apps/web/src/auth/AuthContext.tsx), [recovery dialog](../apps/web/src/auth/SessionRecovery.tsx), [shell](../apps/web/src/components/layouts/SiteChrome.tsx), [formatters](../apps/web/src/i18n/format.ts).
- Maintained regressions: [HTTP](../apps/api/tests/browser-session.test.cjs), [PostgreSQL](../scripts/check-browser-session.cjs), [browser](../tests/browser/shell-session.spec.ts).

## Commands and evidence

| Command | Result |
| --- | --- |
| pnpm.cmd build | Pass; workspace build, unchanged work may use Turbo cache |
| pnpm.cmd typecheck | Pass; workspace, browser and role-test TypeScript |
| pnpm.cmd lint | Pass; repository lint currently covers web |
| pnpm.cmd test | Pass; source localization guard, 108 API and 16 frontend tests |
| pnpm.cmd --filter api test | Fresh 108-test pass |
| pnpm.cmd test:browser | 46 Chromium cases across existing foundations/roles and new session/shell scope |
| pnpm.cmd db:generate / db:validate | Pass using a nonconnecting placeholder URL |
| pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma | Pass |
| pnpm.cmd test:baseline | Complete isolated PostgreSQL/API baseline passes, including new session cases |
| powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1 | Fresh/upgrade preservation and schema parity pass |
| node --check scripts/check-docs.cjs / node scripts/check-docs.cjs / git diff --check | Pass |

Docker target inspection verified the checked-in postgres:16 dance-postgres service
on local port 5432. Tests created/removed their random dance_baseline_* database
and migration schemas on the documented disposable fixture. No real/development
application rows or applied deployment history were changed. Sandbox escalation
was approved for Docker/integration commands; no approval remains pending.

New HTTP tests cover cookie attributes/production host-only flags, no token in JSON,
Origin/CSRF denial before account reads, cookie/bearer/duplicate/expired proof denial,
caller-only logout, inactive/unverified denial and private audit failure envelopes.
The database fixture proves immutable audit/credential preservation, caller revision
change, unrelated-account access, concurrent logout and failure rollback. Existing
admin/event/studio/parent/upload/token security matrices remain passing.

Browser evidence combines 12 foundation, 13 role and 21 session/shell cases. S01-S04
ET/EN/RU run at 320/390/768/1440px with long identity text, direct roleless/scoped/
multi-role URLs, metadata, keyboard/disclosure/skip/focus and overflow checks.
Visual spot review of ET profile at 320/1440px, EN at 768px and RU at 320px confirms
legible wrapping, supported navigation and visible account focus without clipped
identity or role content. This does not establish fluent-language/screen-reader review.
Additional cases prove mounted-input recovery, offline logout, a second-tab logout
pause, verification in another tab, safe/unsafe returns, selected-event context,
missing/denied reads, absent unsupported actions, locale-input preservation and
UTC datetime submission from Pacific/Honolulu. Synthetic screenshots/traces stay
ignored under test-results; fluent-language and screen-reader review remain open.

The initial browser run exposed a retained guest-only verification wrapper that
redirected away from its success/Continue screen; its maintained regression now
passes. A context-text assertion exposed combined direct/child text, now rendered
as a semantic paragraph. The first database attempt reached the new session fixture
but failed module resolution; using the repository's createRequire convention
fixed it, and the complete rerun passed. Build/lint/source-guard setup failures were
corrected before final passing checks; no unrelated baseline was weakened. One
foundation case reset during a file-watched run while edits were ongoing; its
isolated rerun passed. The final full 46-case run after edits finished passed, including delayed identity
bootstrap and retry-to-guest regressions. The docs
checker now excludes ignored Playwright artifacts, matching its generated-output
policy rather than treating failure-context Markdown as repository documentation.

## Rollout and remaining work

Deploy migration 28 and matching API/shared/browser code together. Production
cookie authentication requires HTTPS/same-site topology and exact origins; the
existing loopback HTTP staging rehearsal remains guest/health evidence only.
Keep expanded audit allowlists/history and monotonic revisions on rollback;
never delete logout audit rows or revive localStorage/revoked sessions.

No external milestone/phase closes. Intended deployment provenance/backup, real
staging email, ingress/shared-process limits, fluent-language/screen-reader and
complete signup/recovery/invitation/application journeys remain open. No library
was added or downgraded. Next recorded task: P2-SIGNUP, using the existing owner-only
draft model, eligibility/session/privacy foundations and translated UI patterns.
