# Public onboarding and invitation lifecycle validation

2026-11-05. Local technical scope: P2-SIGNUP, P2-INVITE and P2-UI-AUTH.
[ADR-017](adr/017-public-onboarding-and-invitation-lifecycle.md) records the
ownership/retry/status choices before implementation. This extends the earlier
identity, session and foundation evidence without closing an external milestone.

## Implementation and review boundaries

- Shared registration requires complete studio intent, initial operation UUID,
  revision zero and an optional existing event. A serializable service commits
  account, owner draft, verification digest, audit and delivery intent together.
  Exact proven initial retries are harmless; changed/terminal/inactive duplicates
  cannot overwrite existing accounts. No studio, application, membership or role
  is granted. Generic credential-only signup and role selectors are rejected.
- Three canonical POST onboarding commands prove the current password or use an
  eligible verified session. Identity is locked/rechecked in the transaction;
  supplied owner IDs cannot select another draft. Password proof never issues
  ordinary access. Revision/operation guards preserve competing edits; retained
  cancellation is terminal and audited. Verified owners recover the same draft.
- Global-admin staff commands create/list/status/resend/revoke event-bound
  judge/moderator invitations. Displayed expiry supplies the CAS precondition;
  digest rotation invalidates old links. Audit and delivery intent are atomic.
  Terminal status/history survives replacement. Revoke cannot remove accepted
  access. Existing acceptance preserves credentials and requires intended eligible
  identity; new setup alone receives a session.
- ET/EN/RU semantic signup, pending recovery, neutral resend/correction/recovery,
  reset and invitation screens use shared contracts and API helpers. Link tokens
  are stripped from visible URLs and retained only in memory. Wrong accounts
  switch explicitly in place; sign-in never silently accepts an invitation.
  Administrator controls show retained state and unconfirmed delivery. Inputs and
  local edits survive validation/server conflicts; reload is deliberate.

Primary implementation: studioSignup/onboarding services, AuthController,
InvitationsController and auth/invitation routes; shared auth/onboarding/invitation
schemas; web auth pages, onboarding/invitation clients and admin InvitationsPage.
Migration 29 only extends AuditLog_action with ONBOARDING_SAVED/CANCELLED. It
retains all earlier actions/history and changes no application records. Deploy
shared contracts, API and browser together. No application reset, deployed rollout,
commit or push occurred.

## Maintained checks

The original HEAD RegisterSchema permits credential-only signup; an isolated
transpilation probe confirms the new negative assertion fails before the fix.
Temporary probe output is removed without replacing source or current modules.

routes.test.cjs permanently checks the generic bypass, malformed proof/owner
selectors, global-admin denial and strict displayed-expiry commands. Existing
invitation identity/credential/replay/concurrency tests remain intact. Coverage
inventory includes all mounted operations and the expanded 20-operation admin
scope matrix.

The baseline runs check-public-onboarding.cjs and
check-invitation-lifecycle.cjs against a random isolated local PostgreSQL database.
It exercises full-record rollback, no grants/session, exact retry, wrong proof,
cross-owner session reads, invalid event, concurrent/stale edits, verification
recovery, retained cancellation/inactive denial, resend invalidation, CAS races,
audit rollback, revoke retry/history and expired replacement. Existing foundation
checks cover encrypted delivery/rollback; existing acceptance checks cover intended,
wrong/inactive/stale accounts, access preservation and concurrent consumption.

onboarding-invitations.spec.ts supplies ET/EN/RU at 320/390/768/1440px for signup
and pending recovery, language/input preservation, stale edits, explicit retry and
cancellation. Additional locale cases cover wrong-account logout/in-place sign-in,
deliberate acceptance, neutral recovery/correction, reset/link stripping, terminal
and new-account setup, plus mobile administrator create/resend/revoke/status.
Earlier foundation/role/shell/browser-session cases remain in the full suite.
Synthetic screenshots and traces stay ignored under test-results.

Completed local checks: pnpm build, pnpm typecheck (including browser fixtures),
pnpm lint, pnpm test (110 API and 16 frontend tests plus localization guard),
and pnpm test:browser (67 Chromium cases). Prisma generate/validate/format and
scripts/test-migrations.ps1 fresh/upgrade/index/CHECK/trigger parity pass.
The pending-save regression disables draft inputs until the response completes,
preventing newer edits from being overwritten. Original-handler generic-signup
regression fails before the fix. Markdown/local-link/UTF-8 and git diff whitespace
checks pass.

Visual review inspected Russian signup validation at 320px, English desktop input
at 1440px, Estonian mobile invitation management and English mobile cancelled-draft
recovery. Controls reflow without clipping; synthetic evidence stays ignored.
The complete pnpm test:baseline run passes: all 29 migrations on an empty random
database, seed full-record idempotency, redeployment, new onboarding/invitation
fixtures, the 20-operation scope matrix and existing resource/identity/session/
recovery/foundation/encrypted-mail/image suites. The runner removes its isolated
database; migration parity also removes its temporary schemas. Application data
and the previously recorded staging rehearsal are unchanged.

## Remaining gates and next action

No hosting/domain/Resend account or real staging inbox evidence is available.
Hosted authorization provenance, HTTPS/shared ingress limits and rollout/restore
checks remain operational gates. Fluent ET/EN/RU review, manual screen-reader and
complete accessibility release evidence remain open; automated browser checks do
not establish conformance. Cross-device account/link locale reconciliation remains
I18N-PREFERENCES. Applications/approval remain P5-APPLICATION.

Next: P2-JUDGE-ACCEPT, reconciling Judge/UserRole/consumption atomically for the same
event, including existing assignments and failure rollback. Accepted-access removal
is P2-OFFBOARD. A role or accepted invitation alone is never claimed as staff
readiness, and Phase 2/external M1/M4 are not closed here.
