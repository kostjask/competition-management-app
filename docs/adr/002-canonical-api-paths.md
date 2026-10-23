# ADR-002: One versioned API and canonical resource paths

Date: 2026-10-23

Status: Accepted; versioned composition/authentication boundaries implemented on
2026-10-24. Canonical studio registration and dancer nesting are also implemented. Other
resource-specific integration remains in Phase 1; see
[current API status](../API.md).

## Context and alternatives

`apps/api/src/index.ts` mounts unversioned routers individually. Performance
handlers compete under studio/event path variants and are unmounted. The users
route file is empty, so there is no user resource implementation to mount yet.
Dancer collection and item handlers assume different parents. Invitation router
paths repeat their mount prefix, and the public-route predicate does not match
the effective acceptance URL. Frontend paths and the historical registration
guide are therefore not a reliable API specification.

Keeping aliases for each existing URL would preserve conflicting semantics and
multiply authorization tests. Choose one versioned layout and migrate the web
client together; this development baseline has no supported legacy API contract.

## Decision

All business endpoints use `/api/v1`. A single route-composition module registers
each resource router once with its actual parent scope; routers do not repeat
mount prefixes. Routes compose validation/auth middleware and controller calls.
Controllers/services own business rules. Do not mount an empty placeholder and
describe it as an implemented resource.

The following is the target path inventory, not a list of working endpoints.
Methods apply only when that operation is implemented; this ADR adds no scoring,
user-management, deletion, or other product features.

| Resource | Collection | Item or action |
| --- | --- | --- |
| Authentication | `/auth` | `POST /register`, `/login`, `/verify-email`; `GET /profile` |
| Events | `GET, POST /events` | `GET, PATCH /events/:eventId` |
| Categories | `/events/:eventId/categories` | `/:categoryId` |
| Age groups | `/events/:eventId/age-groups` | `/:ageGroupId` |
| Formats | `/events/:eventId/formats` | `/:formatId` |
| Judges | `/events/:eventId/judges` | `/:judgeId` |
| Studio registrations | `GET, POST /events/:eventId/studio-registrations` | `PATCH, DELETE /events/:eventId/studio-registrations/:studioId` |
| Studios | `GET /studios` | `GET, PATCH, DELETE /studios/:studioId`; `PATCH /studios/:studioId/approval` |
| Representatives | under `/studios/:studioId` | `PATCH /representatives/:representativeId` |
| Dancers | `GET, POST /studios/:studioId/dancers` | `GET, PATCH, DELETE /studios/:studioId/dancers/:dancerId` |
| Performances | `GET, POST /events/:eventId/performances` | `GET, PATCH, DELETE /events/:eventId/performances/:performanceId` |
| Invitations | `GET, POST /invitations` | `GET /invitations/:token`; `POST /invitations/accept` |
| Images | `/images` | `POST /events/:eventId`, `/users/:userId`, `/dancers/:dancerId`, `/studios/:studioId` |
| Users (reserved) | `/users` | Defined when user management is implemented |
| Scores (reserved) | `/events/:eventId/scores` | Defined by the scoring ADR before implementation |

Every table path is relative to `/api/v1`; action paths in the last column use
the parent stated in that row. Keep infrastructure `/health` and static `/uploads`
outside the business API prefix.

Registration items use the unique event/studio pair rather than also exposing an
alternate registration-ID route. During Phase 1, POST accepts the existing studio
creation fields and creates studio plus registration transactionally. After
ADR-001's migration, extend the shared request schema with a mutually exclusive
existing-`studioId` variant; do not expose a second registration endpoint.

Performance collection queries may use a validated `studioId` filter; it narrows
authorized results and never grants access. Creation must include a validated
studio selection, and the server must verify ownership, event registration, event
configuration, and that every participant belongs to that active studio. The
existing model has no performance `studioId`; do not fabricate one in a DTO or
infer authorization from an arbitrary first participant. Cross-studio performance
support requires a separate domain decision.

## Authentication and transition

- Public business routes are exactly auth registration/login/email verification,
  invitation inspection, and invitation acceptance. Everything else requires
  authentication and resource-specific authorization. Keep event reads protected
  during stabilization; public event/results DTOs and publication rules must be
  defined before exposing them.
- Attach public/authenticated middleware to concrete routes. A single-segment
  wildcard must not accidentally expose invitation listing or future admin paths.
- Preserve existing credentials and tokens through the URL migration. Do not add
  redirects or duplicate legacy handlers. Update frontend base URL, environment
  examples, documentation, and smoke checks in the corresponding integration work.
- Separate route composition from server startup so request-level tests can
  exercise the actual application without importing a listening server.
- Use the global error envelope, 201 for creation and 204 for successful deletion
  without a body. Define DTOs for data-bearing success responses under ADR-005.

## Verification and consequences

Add request-level contract tests for canonical paths, every mounted operation,
public/protected boundaries, parent/child mismatches, ownership, missing resources,
and validation errors. Verify removed duplicate paths do not execute mutations.
Route registration alone is insufficient evidence of safe integration.

This intentionally changes development URLs. The ADR itself originally changed
no runtime behavior. Versioned composition, studio registration, and dancer nesting
with shared contracts and access checks are now implemented. Performance integration
and broader DTO alignment remain explicitly tracked. Next is canonical event-scoped
performance integration with duplicate/controller/authorization repairs.

Related: [studio identity](001-studio-identity-and-event-registration.md),
[shared contracts](005-shared-api-contracts.md).
