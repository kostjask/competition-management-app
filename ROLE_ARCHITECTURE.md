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
Moderator's current score.submit reuse is not an adequate stage-control policy.
New organizer authority requires an explicit least-privilege decision.

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
