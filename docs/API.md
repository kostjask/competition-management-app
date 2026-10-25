# API integration status

Reviewed: 2026-10-25. Local base: http://localhost:4000/api/v1.
VITE_API_URL includes /api/v1; restart Vite after changes. Frontend page routes
are separate. No unversioned business aliases exist; /health and /uploads remain
at server root.

## Composition and authentication

createApp(prisma) in apps/api/src/app.ts constructs the app without listening or
creating dependencies. routes/api.ts mounts each resource once. Startup/storage/
signals live in index.ts. Controllers use the injected Prisma client.

Public operations: POST /auth/register, /auth/login, /auth/verify-email;
GET /invitations/:token; POST /invitations/accept. Profile and invitation admin
handlers attach auth directly; other resource routers require auth at their mount.
**Event reads remain authenticated.** Unknown routes use global 404 errors.
Exact permissions/ownership/stages are in each resource contract.

Phase 1 controller/shared DTO/client integration is complete for mounted business
resources. Security/workflow completion is separate: see [SECURITY](SECURITY.md).
URLs do not rotate existing JWTs/tokens. [ADR-002](adr/002-canonical-api-paths.md)
governs canonical paths; accepted targets do not add future endpoints.

## Resource integration

All table paths are relative to /api/v1; item suffixes append to the collection.
Use only the methods listed in the linked contract. Shared schemas own exact shapes.

| Resource | Collection / item | Contract |
| --- | --- | --- |
| Auth | /auth/register, /auth/login, /auth/verify-email, /auth/profile | [Auth](api/auth.md) |
| Events | /events; /events/:eventId | [Events](api/events.md) |
| Registration | /events/:eventId/studio-registrations; /:studioId | [Applications](api/registrations.md) |
| Studios | /studios; /:studioId; approval/representatives actions | [Studios](api/studios.md) |
| Dancers | /studios/:studioId/dancers; /:dancerId | [Dancers](api/dancers.md) |
| Performances | /events/:eventId/performances; /:performanceId | [Performances](api/performances.md) |
| Judges | /events/:eventId/judges; /:judgeId | [Judges](api/judges.md) |
| Categories | /events/:eventId/categories; /:categoryId | [Categories](api/categories.md) |
| Formats / age groups | /events/:eventId/formats or /age-groups; /:formatId or /:ageGroupId | [Setup](api/setup.md) |
| Invitations | /invitations; /:token; /accept | [Invitations](api/invitations.md) |
| Images | /images/events/:eventId, /users/:userId, /dancers/:dancerId, /studios/:studioId (all under /images) | [Images](api/images.md) |
| Users / scores | No mounted implementation | Reserved in ADR-002 |

Frontend helpers decode unknown transport output through shared response schemas,
including before session storage. DTOs omit private persistence fields; explicit
auth/token operations remain exceptions by contract. No draft, music, final-submit,
score-sheet, live or results API is implied by UI specifications.

## Resource contracts

The following anchors preserve older incoming links. New links should point
directly to the selected resource file.

<a id="studio-registration-contract"></a>

- [Studio registration contract](api/registrations.md)

<a id="authentication-contract"></a>

- [Authentication contract](api/auth.md)

<a id="event-contract"></a>

- [Event contract](api/events.md)

<a id="studio-profile-contract"></a>

- [Studio profile contract](api/studios.md)

<a id="dancer-contract"></a>

- [Dancer contract](api/dancers.md)

<a id="performance-contract"></a>

- [Performance contract](api/performances.md)

<a id="judge-contract"></a>

- [Judge contract](api/judges.md)

<a id="category-contract"></a>

- [Category contract](api/categories.md)

<a id="formats-and-age-groups"></a>

- [Formats and age groups](api/setup.md)

<a id="invitation-contracts"></a>

- [Invitation contracts](api/invitations.md)

<a id="image-contracts"></a>

- [Image contracts](api/images.md)

## Localized errors and coverage

Business errors carry error/code/statusCode/timestamp/optional details plus stable
reason, numeric params and structured issues. Success notices carry messageId;
ordinary DTOs and 204 need no invented notice. Render descriptors through the
shared presenter, not diagnostic English. [Error guide](ERROR_HANDLING.md) ·
[Localization](LOCALIZATION.md) · [ADR-007](adr/007-localized-feedback-contracts.md).

[api-coverage.json](api-coverage.json) maps all 56 mounted operations to evidence
or explicit deferred/non-applicable cases. Runtime registration/no-token checks
guard that inventory. It is not a coverage percentage, browser or security-release
claim. /health uses an infrastructure status shape; static files are outside the
business DTO/error contract.

## Validation

Commands, CI and isolated PostgreSQL checks: [TESTING](TESTING.md).
Operation-specific evidence/gaps: [coverage inventory](api-coverage.json).
Past results: [scope evidence](SCOPE_INTEGRITY_VALIDATION.md) and
[development history](DEVELOPMENT_HISTORY.md). Historical passing checks are not fresh runs.
