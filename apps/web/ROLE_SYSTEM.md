# Frontend roles and onboarding access

Reviewed: 2026-10-24

This guide replaces older examples that gated first-time registration on the
representative role or claimed arbitrary database roles automatically implement
working UI. See [role architecture](../../ROLE_ARCHITECTURE.md) and
[ADR-006](../../docs/adr/006-account-eligibility-and-staff-onboarding.md).

## Navigation and account entry

- Offer “Register your studio” for self-service studio onboarding, not generic
  spectator signup. Backend eligibility enforcement is still pending.
- Keep account verification/recovery, onboarding progress, and “My applications”
  accessible to authenticated pending applicants without a representative role.
  Backend queries must return only authorized memberships/applications.
- Use representative/event permissions for approved management work, not as a
  prerequisite for becoming an applicant.
- Judges and moderators enter through event invitations; do not offer role
  selection on public signup. Additional representatives use studio-bound invites.
- Invitation acceptance must distinguish new users, existing users, wrong-account
  sessions, and invalid/expired/revoked links. Existing users authenticate without
  resetting their password. Never treat local UI success as proof of assignment.
- Keep active event/studio visible and preserve a validated internal destination
  across authentication. Published information requires no spectator account,
  but public API publication remains future work.

## Current components and limitations

`RoleGate`, `useRole`, `RequireAuth`, and `RequireRole` exist under `src/auth`.
`RoleGate` supports authentication/guest/admin and role conditions. These are UI
controls and cannot authorize API operations.

`useRole` currently compares role display names, while `RequireRole` uses fuzzy
name matching against a fixed mapping. These disagree with stable role-key
constants. Do not describe key-based or arbitrary-role checks as working until
Phase 2 unifies the helpers, event scopes, and route guards with tests.

Admin behavior also differs across helpers. Validate bypass per operation;
frontend visibility does not remove backend parent/ownership/active-record checks.
A database role added without routes, screens, permissions, and translations does
not automatically create a usable workflow.

## Target implementation checklist

- Use `role.key` and explicit event scope consistently after the helper repair.
- Keep one authorization helper for route guards and conditional navigation.
- Derive permitted management actions from backend contracts, including studio
  membership, approval, event registration, and stage restrictions.
- Provide loading, unavailable, pending, denied, and recovery states; avoid
  silently sending a pending applicant to a blank homepage.
- Show staff invitation/assignment status in admin UI. A judge role without its
  event Judge record is incomplete onboarding, not a ready judge.
- Translate auth, invitation, status, and error text in ET/EN/RU and verify
  keyboard/mobile use. Peer-score visibility follows the future scoring policy;
  judge/moderator role labels alone must not expose all scores.

The currently available constants are `REPRESENTATIVE`, `JUDGE`, and `MODERATOR`
in `src/auth/roles.ts`; admin handling uses existing dedicated checks. “Manager”
is not a predefined role. Stage operation maps to `moderator`; organizer
permissions need an explicit design before new navigation or assignments.

See [user journeys](../../docs/USER_JOURNEYS.md),
[API status](../../docs/API.md), and
[development plan](../../DEVELOPMENT_PLAN.md). These requirements do not imply
that onboarding screens or authorization repairs have been implemented.
