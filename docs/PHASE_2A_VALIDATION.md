# Phase 2A foundation evidence

Updated: 2026-10-25. Scope: user-requested remaining Phase 2A foundations, plus
explicitly requested staging preparation. Validation ran on the working tree
before logical batch commits; earlier eligibility/recovery changes are preserved
and retain their own evidence reports. Git history identifies the committed batches.
This is local technical evidence, not a hosted deployment or release claim.

## Delivered scope

- P2-AUDIT: append-only AuditLog, actor FK, safe action/metadata contracts and
  transactional account/token, invitation/access and approval hooks (ADR-012).
- P2-PRIVACY: minimization, authorized viewers, sensitive fields, retention review,
  export/deletion responsibility and existing-account transition policy. No
  automatic account/draft/audit cleanup or roleless deactivation (PRIVACY.md).
- P2-ONBOARDING-MODEL: recoverable owner/event-bound drafts, strict shared details,
  revision/operation retry, read/save/cancel services and derived internal return
  paths. Verification preserves drafts; intent creates no role or membership.
  Public pending-account proof and application completion remain later workflows.
- P2-STAFF-MODEL: restrictive Role/key and Studio/event references, bound-scope
  CHECK, removed assignment state, mandatory supported event staff creation,
  rejection of unclassified historical acceptance/rotation and least-privilege
  moderator stage.manage distinct from score.submit (ADR-013). Existing historical
  assignments are not repaired or reclassified automatically. Middleware rejects
  removed assignments, scoped-admin bypass and global judge/moderator grants.
- P2-EMAIL local implementation: Resend HTTPS adapter and silent fake, validated
  key/origin configuration, ET/EN/RU templates, nullable account/frozen invitation
  locale policy, atomic encrypted dispatch intent, worker serialization, bounded
  retries and stable provider idempotency IDs. Rendered body/sender are frozen
  across deployments. Terminal processing clears ciphertext; dispatch stops after
  23 hours or invalid token binding. Provider acceptance never means inbox receipt.
- P2-UI-FOUNDATION: semantic tokens/native components and synthetic development
  fixture, with error-summary focus/field links and truthful email states. No
  final branding, real application or auth journey is implied.
- Initial P9-BROWSER: Playwright/Chromium, strict browser-test TypeScript check,
  isolated Vite lifecycle and CI. P9-DEPLOY preparation: container images,
  loopback-only local staging and hosted rollout/scope/backup checklist (STAGING.md).

## Commands and results

| Command | Recorded result |
| --- | --- |
| pnpm db:generate | Pass; current Prisma client generated |
| pnpm db:validate | Pass |
| pnpm exec prisma format --check --schema apps/api/prisma/schema.prisma | Pass |
| pnpm build | Pass across four workspace packages |
| pnpm typecheck | Pass workspace/seed and strict browser harness checks |
| pnpm lint | Pass; web scope, including fixture and browser setup |
| pnpm test | Pass localization guard, 92 API and 9 web tests |
| pnpm test:browser | Pass 12 Chromium cases, ET/EN/RU at 320/390/768/1440px |
| scripts/test-migrations.ps1 | Pass fresh/upgrade/default preservation and exact schema parity including SQL-only CHECKs, functions and triggers |
| pnpm test:baseline | Pass complete isolated PostgreSQL migration/seed/HTTP workflows, including new foundation fixture |
| Docker staging build/start/smoke | Pass final image build/restart, all 26 migrations, SPA/health, guest denial and 503 production fake-mail responses; failed registration leaves zero users/tokens/audits/deliveries |
| git diff --check | Pass; generated staging secrets/screenshots remain ignored |

Migration additions are 20261025050000_domain_audit,
20261025060000_onboarding_staff_locale and 20261025070000_email_delivery; the prior
session-version migration remains in the same tested chain. None rewrites applied
history or deletes account/domain rows. Moderator's built-in score.submit grant
is deliberately removed and replaced by stage.manage; custom roles and assignments
are preserved. Historical invitations retain nullable unclassified role references
and cannot be used to gain access. Operational classification/reissue needs review.

The baseline creates/drops only its random dance_baseline_* database. Migration
checks use temporary schemas. Existing application development data/environment
files were not reset or rewritten. Its first startup encountered the old implicit
SMTP configuration; the fixture now explicitly selects fake mail, preventing
application .env settings from influencing that test. The rerun passed.

## Behavior evidence

scripts/check-foundation.cjs uses a separate child with random queue encryption
key and an injected provider; it makes no real provider network requests. It proves:

- Audit and domain changes roll back together in either failure direction;
  actor FK and private metadata writes fail; persisted audit UPDATE/DELETE fail.
- Identical draft retry preserves the complete row; changed operation reuse,
  stale revision, unknown event and terminal-state edits fail. Another owner's
  lookup cannot select this draft. Verification retains it without access grants;
  cancellation is repeatable and keeps the account active.
- Role/key mismatch, bound global/admin invitations and cross-event studio
  invitations fail at the database boundary. Scoped/removed administrator cannot
  perform an admin-only operation; moderator cannot submit scores by default.
- Registration, token, audit and encrypted delivery intent commit together;
  domain rollback leaves no dispatchable intent. Ciphertext hides recipient/link
  secrets and is authenticated to its delivery ID. Lost provider acknowledgement
  retries the identical request/sender/key. Competing workers produce one terminal
  receipt; revoked token and expired-window messages cancel without dispatch.

Unit tests cover all five template kinds in all three locales, escaped links,
recipient locale precedence, ciphertext nonce/authentication/wrong-key rejection,
fixed Resend HTTPS/timeout/idempotency behavior, concealed provider failures and
invalid/missing provider configuration. Production fake delivery refuses requests.
Earlier HTTP recovery tests still cover synchronous injected rollback, neutral
acknowledgements, credentials, collisions, sessions and concurrency; those fixture
semantics do not replace the real queue's asynchronous retry semantics.

Browser checks exercise keyboard submit, focus to summary and linked field,
visible focus ring, invalid association, input persistence while switching
languages, success, disabled/busy states and no horizontal overflow. Screenshots
and computed palette values supplement the 13-pair text/control contrast check.
Representative phone, tablet and desktop fixture images were visually inspected;
this is not fluent-language or screen-reader certification. Initial Windows
process-tree teardown was unreliable under the sandbox; in-process Vite setup/
close now exits cleanly without killing a separate shell process.

## Remaining gates and next action

P2-SCOPE-DEPLOY remains open: no intended hosted database/provenance audit, backup
restore or coordinated rollout exists. Real staging email remains open: there is
no provider account, verified sender/domain or controlled inbox delivery evidence.
The Wix site alone does not establish ownership of a configurable sending domain.
Local staging uses fake mail, synthetic/empty data and private loopback ingress.
Its independent ignored environment file and volumes are retained for rehearsal.

Full I18N-PREFERENCES UI editing/login/logout/link reconciliation, fluent review,
screen-reader and complete browser journeys retain their existing owners. Invite
and reset link screens are unfinished. Existing-account invitation identity,
upload ownership/content, remaining boundary/session controls and hosted operations
still block external exposure; no Phase 2A/M1/M2/M4 completion is claimed.

Next actionable development task: **P2-INVITE-IDENTITY**. Hosted staging next needs
a chosen account/budget/region, controlled domain and Resend configuration, then
protected deployment and real delivery/scope/restore evidence under STAGING.md.
