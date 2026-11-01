# Roles and account entry

Database roles/permissions do not implement screens or replace membership,
approval, event scope and active-record checks. [Security status](docs/SECURITY.md)
owns current gaps; [ADR-006](docs/adr/006-account-eligibility-and-staff-onboarding.md)
owns target account policy.

| Actor | Target entry and authority |
| --- | --- |
| Studio applicant | Recoverable studio onboarding; own pending work without representative privileges |
| Representative | Active studio membership plus approved permitted event access; additional members need studio-bound invite |
| Judge | Event invitation; matching UserRole and Judge; scoring assignment separately |
| Moderator | Event invitation and explicit stage-operation permission |
| Administrator | Controlled provisioning; explicit authority |
| Spectator | No account; only approved published DTOs after public-access implementation |

## Stored relationships

Role has stable key and display name; RolePermission maps Permission operation
keys; UserRole binds user/role with nullable event scope (null means global).
StudioRepresentative is membership, StudioEventRegistration is event approval/
review permission, and Judge is score-linked event identity. They are not interchangeable.

Seeded keys: admin, representative, judge, moderator. No predefined manager role.
Moderator now has stage.manage separately from score.submit under ADR-013.
New organizer authority requires an explicit least-privilege decision.

## Backend scope policy and assignment inventory

Only an active, null-event assignment with the exact key `admin` receives the
global bypass. Event-scoped admin contributes no permissions, even in its own
event. Removed assignments and null-event judge/moderator assignments contribute
no authority. Display names never select this bypass. Existing custom permission
roles retain their explicit global/event permissions; a similar name/key or an
event.manage permission does not grant admin-only operations. Extending built-in
roles still requires the review below. No organizer role is implicitly defined.

Current representative global/event permission behavior is retained; membership,
approval and stored parent scope remain required. Replacing those inherited
assignments is outside this slice. Profile roles describe active stored rows,
including historical unsupported scopes; isAdmin and backend permission resolution
are authoritative. Frontend guard corrections remain P2-ROLES.

| Assignment writer | Permitted scope / safeguards |
| --- | --- |
| Public account registration, verification and recovery | No role assignment |
| Invitation creation / acceptance | Only bound event judge/moderator, no studio; strict shared input, role-reference check and assertStaffScope before writes; admin/global/unclassified invitation rejected |
| Studio registration approval | Only representative key, using the checked registration/studio event; no caller-selected role or scope |
| Development seed | Global admin and inherited global representative; judge bound to the demo event. Existing rows, including unsupported historical global judges and removed assignments, remain unchanged |
| Judge CRUD | Does not assign UserRole; reconciliation remains P2-JUDGE-ACCEPT |
| Generic role assignment / production admin provisioning | No mounted API; controlled operational provisioning needs its own reviewed procedure before hosted use |

The seed's global judge creation was corrected under P2-ROLES-ADMIN-SCOPE; it
does not infer event scope for historical rows. Database constraints continue to
retain such history. No assignment migration, deletion, restoration or global
promotion is performed. Any actual deployment provenance review/repair remains
P2-SCOPE-DEPLOY. The aggregate preflight now identifies active scoped admins,
active global staff and removed admins without emitting account/row details.

All 18 mounted global-admin-only operations are marked in api-coverage.json and
covered by HTTP/database scope matrices. See [scope evidence](docs/ADMIN_SCOPE_VALIDATION.md).

The new ADR-008 migration restricts event deletion and enforces null-safe role/
outstanding-invitation uniqueness while preserving history. Deployment/global-scope
provenance review is still P2-SCOPE-DEPLOY; never infer lost scope.

## Extending access

Before adding a role define operations, scope, assignment/removal authority,
backend checks, navigation, translations and negative tests. A database row alone
does not create a feature. Judge acceptance must eventually reconcile role/record/
invitation atomically; offboarding retains scores. Contact email grants no ownership.
Generic signup still exists; do not delete legitimate roleless applicants.

Use local seed fixtures only for development, not manual SQL as normal onboarding.
Frontend helpers currently disagree on display-name matching; P2-ROLES must unify
stable keys/scopes. [Frontend guide](apps/web/ROLE_SYSTEM.md) ·
[workflow](docs/REGISTRATION_API.md) · [checkpoint](DEVELOPMENT_PLAN.md).
