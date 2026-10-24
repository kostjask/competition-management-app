# Roles, permissions, and account onboarding

Reviewed: 2026-10-24

Role definitions and permission mappings are stored in the database. This does
not make every role safe to self-select, automatically implement its screens, or
replace backend ownership, active-record, approval, and event-scope checks.

## Account entry policy

[ADR-006](docs/adr/006-account-eligibility-and-staff-onboarding.md) is the accepted
target, with runtime implementation pending:

| Account purpose | Entry path | Scope |
| --- | --- | --- |
| Pending studio applicant | Studio-focused self-service onboarding | Own recoverable progress/applications; no approved representative privileges. |
| Representative | Approval or authorized additional-member invitation | Explicit studio membership and permitted event access under ADR-001. |
| Judge | Admin invitation | Required event, judge role, and matching Judge record. |
| Moderator/stage operator | Admin invitation | Required event and explicit operational permissions. |
| Administrator | Controlled provisioning | Explicit administrative authority. |
| Spectator | No account | Published information only after public-access implementation. |

Generic public registration still creates roleless accounts today. The target
must be enforced through backend onboarding contracts, not just navigation or a
client role flag. Pending applicants must not need a representative role before
applying. Do not automatically delete existing roleless users.

## Stored authorization model

- `Role`: stable `key`, display `name`, and description.
- `Permission`: stable operation key and display metadata.
- `RolePermission`: maps roles to permissions.
- `UserRole`: associates user and role, optionally scoped by `eventId` today.
- `StudioRepresentative`: explicit studio membership; a role is not ownership.
- `StudioEventRegistration`: event approval and review-edit permission.
- `Judge`: event-specific judge identity used by scores; not interchangeable with
  a judge UserRole.

Seeded role keys are `admin`, `representative`, `judge`, and `moderator`. No
predefined `manager` role exists. Stage operators use `moderator`; organizer
management needs a separately approved permission specification. Current seed
moderator permission reuse of `score.submit` is not a complete stage-control policy.

## Current limitations and target repairs

- Frontend `useRole` compares display names; `RequireRole` uses a separate fuzzy
  name mapping. Phase 2 must unify checks around stable keys and event scopes.
- Judge invitation acceptance and judge record creation are separate operations.
  Target acceptance creates/reconciles both with invitation consumption in one
  transaction, including rollback and concurrency handling.
- Invitation role validation currently checks string syntax and event scope is
  optional. Target staff invitation policy validates allowed assignments and
  requires event scope for judge/moderator; global admin provisioning is separate.
- Additional representatives need studio-bound invitations with explicit inviter
  authority and membership rules. Contact details do not grant account ownership.
- Revoking an unused invitation differs from removing accepted event access.
  Offboarding must preserve judge/score history and be audited.

## Extending roles

Adding a database row alone does not implement a feature or secure its API.
Before adding a role, define its operations, global/event scope, assignment and
removal authority, backend enforcement, frontend navigation, localization, and
negative authorization tests. Do not use manual SQL role assignment as a normal
user onboarding workflow. Use the documented root seed command only for local
fixtures; production administrators require controlled provisioning.

Frontend gates are usability controls. Backend authorization remains the security
boundary. Admin bypass is operation-specific and must not bypass parent/child or
active-record invariants. Public event discovery/results remain deferred under
ADR-002 and must not be used to justify spectator signup.

See [registration workflow](docs/REGISTRATION_API.md),
[user journeys](docs/USER_JOURNEYS.md),
[frontend role guide](apps/web/ROLE_SYSTEM.md), and
[development plan](DEVELOPMENT_PLAN.md) for current gaps and delivery order.
