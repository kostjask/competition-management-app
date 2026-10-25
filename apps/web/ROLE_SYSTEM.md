# Frontend access gates

Sources: src/auth/RoleGate, useRole, RequireAuth, RequireRole and roles.ts.
Gates control presentation; backend security checks every operation.
[Role model](../../ROLE_ARCHITECTURE.md) · [security gaps](../../docs/SECURITY.md).

Current useRole compares display names; RequireRole uses a separate fuzzy mapping.
They do not consistently implement stable key/event-scope authorization. P2-ROLES
must unify them with tests; admin bypass also needs operation-specific alignment.
Available constants: REPRESENTATIVE, JUDGE, MODERATOR. No predefined manager.

## Required behavior after repair

- Use one key/scope-aware helper for guards and navigation, aligned with backend
  profile/permission contracts. Database display/translated labels never authorize.
- Keep verification, recovery and owned application progress accessible to legitimate
  roleless applicants. Representative gates apply to approved management work.
- Only show implemented destinations. Loading, unavailable, pending, denied and
  recovery states explain the next action; direct forbidden URLs need clear handling.
- Keep selected authorized event/studio visible and preserve validated internal
  return/language context. No public staff-role selection or implied spectator signup.
- Invitation UI distinguishes new/existing/wrong/inactive accounts and expired links;
  existing users authenticate without resetting passwords. Judge record plus role
  is required before readiness; peer-score visibility follows the future scoring policy.
- Test roleless/global/event/multi-role navigation, backend-denied actions and
  responsive keyboard ET/EN/RU output. Contact edits never create membership.

Targets/screens: [UI_UX](../../docs/UI_UX.md); detailed task gates:
[foundation roadmap](../../docs/roadmap/foundation.md).
