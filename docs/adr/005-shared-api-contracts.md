# ADR-005: Shared Zod contracts and explicit serialized DTOs

Date: 2026-10-23

Status: Accepted; pending incremental Phase 1 implementation.

## Context and alternatives

`packages/schemas` already owns request schemas, but the web API modules duplicate
request and response interfaces. Event/studio/dancer/performance frontend types
expect timestamps missing from Prisma models. `DateSchema` accepts both strings
and JavaScript dates. Shared performance declarations use `nominationId` and
`durationSeconds`, while current API inputs/models use `categoryId` and
`durationSec`. Controllers frequently return Prisma records and relations
directly, producing inconsistent shapes and risking private-field exposure.

Prisma-generated types describe persistence rather than JSON or role-specific
responses. Handwritten interfaces cannot validate external input. Choose shared
Zod contracts with inferred types and explicit server serialization; no new schema
library or generated OpenAPI infrastructure is needed for this decision.

## Decision

- `packages/schemas` owns transport schemas for path/query/body input, success
  DTOs, and the standard error envelope. It must remain usable by browser and
  backend without importing Prisma, Express, or server configuration.
- Infer types from schemas. Use `z.input` for caller inputs and `z.output` for
  parsed/transformed values when they differ; `z.infer` is the output type.
  Remove duplicated frontend interfaces as each resource migrates.
  `packages/types` holds only types that cannot be derived from schemas; remove
  legacy nomination/performance declarations after checking their consumers.
- The backend validates all external input, including params and query filters.
  Use explicit request field allowlists and reject unknown body fields in migrated
  mutation contracts, so misspelled/legacy fields are not silently ignored.
  Backend validation and authorization remain mandatory regardless of UI checks.
- HTTP timestamps are ISO 8601 UTC strings, serialized with `toISOString()`;
  nullable timestamps are explicitly `null`. Calendar-only dates such as dancer
  birth dates use `YYYY-MM-DD`, with explicit calendar validation and UTC
  persistence conversion to avoid timezone day shifts. Replace the transport
  string-or-Date union when migrating each caller and handler together.
- Define nullability and optionality deliberately: a nullable stored field is
  returned as `null`; an omitted PATCH field means unchanged. Clearing a field
  requires an explicitly nullable update contract. Never promise timestamps or
  relations absent from the implementation; add timestamps in Phase 3 before
  making them required in responses.
- Use current names `categoryId`, `durationSec`, and explicit participant data.
  Participant count is derived, not trusted as a parallel submitted value. Keep
  existing event/registration enum values until their domain migrations occur.
- Define separate summary/detail DTOs when their fields differ. Explicitly map
  selected database fields to DTOs and validate serialized output against the
  response schema before sending it. Validate responses in the shared web API
  layer as resources migrate; generic TypeScript arguments are not runtime checks.
- Auth/profile DTOs expose only intended identity, role keys, and event scopes.
  Never serialize passwords, verification tokens, storage paths, or unrestricted
  user/role relations. Invitation acceptance credentials remain request-only;
  login token responses are explicit. Development invitation-token exposure is a
  tracked Phase 2 issue, not permission to include tokens in general DTOs.
- Preserve the existing global error shape: `error`, `code`, `statusCode`, optional
  `details`, and ISO `timestamp`. Validation details use `details.fields` keyed by
  field path. Keep sensitive/internal errors out of public details. Eliminate
  local error formats through the existing error classes/handler.
- Keep collection responses as arrays during stabilization; do not introduce an
  unused pagination wrapper. Define pagination in shared contracts when needed.

## Rollout and verification

Migrate one resource end to end: schemas/exports, backend validation and DTO
mapping, frontend API client and consumers, route tests, and examples. Start with
auth and events, then studio registrations/studios, dancers, and performances.
Coordinate URL changes with [ADR-002](002-canonical-api-paths.md). Do not treat
these target contracts as already implemented or add a schema migration solely
to satisfy an inaccurate frontend interface.

Tests must cover serialized success shapes, invalid input, nullable/omitted
fields, date/calendar boundaries, unknown mutation fields, validation envelopes,
and exclusion of private fields. Request tests must also cover unauthorized and
cross-scope requests. Run shared/web/API typechecks and builds after each slice;
add contract generation/OpenAPI later without duplicating definitions.

This ADR changes no runtime payloads. It records the migration rules and accepts
temporary duplication only in resources not yet migrated. Domain data migration
requirements remain in [ADR-001](001-studio-identity-and-event-registration.md).
