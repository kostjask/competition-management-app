# Frontend access gates

Sources: src/auth/RoleGate, useRole, RequireAuth, RequireRole and roles.ts.
Gates control presentation; backend security checks every operation.
[Role model](../../ROLE_ARCHITECTURE.md) · [security gaps](../../docs/SECURITY.md).

useRole, RequireRole and RoleGate share auth/access.ts: exact stable keys, supported
global/event assignments and server-resolved isAdmin. Scoped admins and global
judge/moderator assignments grant no role access. Labels never authorize.
RequireRole accepts eventId; omit it only for a section landing page. RoleGate
accepts eventId and permissions; all supplied conditions must pass. hasPermission
without eventId requires a global permission. Global representative/custom
permissions apply within events as on the backend. No role gate establishes
studio ownership, application approval or a matching Judge record.

Profiles contain active assignments and resolved permission scopes. Refresh the
profile after access changes; backend checks remain authoritative on every request.
Forbidden role URLs show translated denial and a focused heading/home recovery.
Guest/expired sessions follow the existing sign-in path. Browser/unit coverage and
limits are recorded in [validation](../../docs/BOUNDARIES_ROLES_VALIDATION.md).
Available constants: REPRESENTATIVE, JUDGE, MODERATOR. No predefined manager.

The shell now provides translated supported navigation, selected-event context,
read-only profile, skip/main/route focus, and explicit sign-in/denied/missing states.
Browser sessions use ADR-016 cookies; reauthentication refreshes current access
before resuming. Full workflow and human review remain open.

## Remaining workflow requirements

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
