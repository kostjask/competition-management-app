# Public account recovery validation

Date: 2026-10-25. Task: P2-AUTH-RECOVERY, completing the technical backend P2-AUTH
scope after eligibility. Evidence is from the working tree based on e1ba9db;
earlier eligibility edits are preserved, and no commit/deployment is implied.
Decision: [ADR-011](adr/011-public-account-recovery.md). Contract:
[auth API](api/auth.md#public-recovery-operations).

## Delivered scope

Four canonical public POST endpoints implement verification resend, pending email
correction, recovery request and token-based reset. Strict shared schemas and
web API helpers infer transport types; ET/EN/RU semantics distinguish accepted
request from confirmed delivery. All three request operations return identical
202 authRequestAccepted / delivery: unconfirmed for eligible/unknown/inactive/
ineligible/wrong-password/colliding requests. A globally unavailable adapter returns
uniform 503 before account lookup. Fixed error logging never includes delivery
arguments, credentials, token URLs or recipient data.

Correction proves the current password of the same active unverified user. It
atomically updates only canonical account email/revision and rotates a verification
digest, preserving IDs, credentials, membership/contact snapshots and roles. It
does not verify, activate or mint a session. Reset consumes a live purpose-bound
one-hour link and atomically changes password, consumes/revokes account tokens,
increments sessionVersion and issues no session. Registration/reset passwords have
an eight-character minimum and 72-UTF-8-byte maximum; existing login inputs remain
supported. Byte boundary tests include multibyte passwords.

The sessionVersion migration defaults existing users to zero and rejects negative
values. JWT issuers in login/verification/invitation acceptance carry the current
version. Protected requests match it before roles; reset and correction increment
it, invalidating older sessions. Unversioned legacy JWTs fail closed. Apply pending
migrations and replace all old API workers together before enabling these flows;
older workers must not keep accepting legacy/revoked JWTs. The application database
was not migrated/reset/reseeded by this task.

All four routes share centralized process-local IP throttling, including invalid
requests, with semantic 429/Retry-After. The map is bounded and expiry is tested.
Proxy trust is explicitly false; forwarded IP headers cannot bypass the bucket.
This does not close distributed/proxy or other auth/invite/upload limit work.

## Evidence and commands

- API unit/HTTP tests validate strict bodies before reads, neutral responses,
  password proof, delivery-unavailable behavior, fixed failure logs, no-session
  reset DTOs, UTF-8 password bounds, shared route/IP limits and session revisions.
- The API inventory now has 60 mounted operations and accepts test evidence from
  all API test files. Existing denied/cross-event/studio/ownership tests remain.
- The PostgreSQL baseline runs an isolated child API with injected mail fakes.
  It proves canonical correction, wrong credentials/passwordless/inactive/verified
  rejection, destination collision without mutation, and complete membership/
  credential/role preservation. Failed sends preserve old token/email state;
  failed synthetic links cannot verify/reset. Lost-response correction retry is
  neutral without duplicate mutation or mail. Competing corrections preserve
  one identity/revision/token; a token-insert database failure rolls back the
  email, revision and prior token state.
- Real reset cases cover wrong purpose, invalid password, expiry, replay,
  inactive-account denial, competing consumers and a trigger failure after claim.
  The failed transaction preserves password/tokens/revision; retry succeeds.
  Old and legacy JWTs are rejected and new-password sign-in succeeds. Concurrent
  resends retain exactly one outstanding token without verification/role grants.
  Synthetic raw delivery secrets stay in the child and never enter normal DTOs.
- `pnpm.cmd build`, `pnpm.cmd typecheck`, `pnpm.cmd lint`, `pnpm.cmd test`: passed
  (87 API tests, eight frontend tests, localization guard). Changed tasks ran
  fresh; unchanged dependencies used Turbo cache. Final password-bound checks
  reran build/typecheck/tests. Final explicit proxy setting was rebuilt and all
  eight focused recovery tests passed again.
- `pnpm.cmd db:generate`, `pnpm.cmd db:validate`, Prisma format/check: passed with
  an explicit nonconnecting placeholder DATABASE_URL. No application .env was edited.
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1`:
  passed; rerun also passed with explicit default-zero legacy-user preservation
  and negative-revision rejection. Exact SQL-only constraint/index parity passed.
- `pnpm.cmd test:baseline`: passed new recovery cases and all previous migration,
  upgrade/refusal, seed/redeployment, domain, eligibility and token workflows.
  Final rerun also passed invitation JWT revision use and the expanded correction
  race/database-failure cases.
- `node --check scripts/check-auth-recovery.cjs`: passed.
- `node --check scripts/check-docs.cjs`, `node scripts/check-docs.cjs` and
  `git diff --check`: passed; final diff reviewed.

## Limits and next task

Technical completion is not a releasable email journey. The silent development
adapter does not send mail; production request endpoints uniformly return 503
until real delivery exists. Transient send failure returns an explicitly
unconfirmed acknowledgement after rollback, not a receipt or background-retry
promise. A successful send followed by failed transaction commit may yield an
invalid link. P2-EMAIL must decide durable dispatch/provider idempotency, retry,
localized templates and staging evidence before external release. No raw-secret
outbox is introduced. Uniform response bodies/statuses do not claim constant-time
behavior under arbitrary database/provider latency.

P2-UI-AUTH has no new screens from this slice. Cookie/storage/return handling,
distributed abuse controls, public signup context and durable audit remain their
own tasks. C1 intended-account invitation authentication and H1 scoped-admin
semantics remain open; their issuers were only aligned with session revision.
No browser/human language review, hosted CI or external milestone is claimed.

Next recorded task: P2-AUDIT, providing minimal durable actor/audit support for
the prioritized invitation/access corrections. Staff role/scope policy remains
another prerequisite of P2-INVITE-IDENTITY.
