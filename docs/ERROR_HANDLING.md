# Error handling

Sources: [error classes](../apps/api/src/errors/index.ts),
[global handler](../apps/api/src/errors/handler.ts),
[shared schemas](../packages/schemas/src/common.schema.ts),
[semantic feedback](LOCALIZATION.md). Business routes use the shared envelope;
/health and static files are infrastructure exceptions.

| Class | HTTP | Code | Default reason |
| --- | --- | --- | --- |
| ValidationError | 400 | VALIDATION_ERROR | invalidInput |
| UnauthorizedError | 401 | UNAUTHORIZED | authenticationRequired |
| ForbiddenError | 403 | FORBIDDEN | permissionDenied |
| NotFoundError | 404 | NOT_FOUND | recordNotFound |
| ConflictError | 409 | CONFLICT | conflict |
| InternalServerError | 500 | INTERNAL_SERVER_ERROR | unexpected |

Envelope: error, code, statusCode, ISO timestamp, optional details, plus reason,
numeric params and structured issues (path/rule/params). Exact enums/allowlists
live in shared schemas; do not duplicate them here. details.fields and prose are
legacy diagnostics, not UI text. Do not include secrets/PII in diagnostics.

## Backend

Throw the specific centralized class; pass an existing semantic reason when
needed. ValidationError/ConflictError accept message, optional details, reason;
UnauthorizedError/ForbiddenError accept message, reason. NotFoundError accepts
resource and optional ID. Wrap delegated async handlers with the existing
asyncHandler convention. Express 5 also forwards rejected async-handler promises;
the wrapper is not a requirement imposed by older Express behavior.

ZodError reaches the global handler and becomes a 400 with structured issues.
Do not wrap an output-contract failure as user input: it is a server defect.
Known Prisma P2002/P2003/P2034 errors become 409 (conflict, relationshipConflict,
concurrentChange); P2025 becomes 404. Malformed JSON becomes 400; unexpected
errors receive sanitized 500 output. Inspect operation code for narrower mappings.

## Frontend

client.ts returns unknown output; resource helpers decode shared schemas.
ApiError preserves semantic descriptors. Store toUiError(error), then render
ErrorFeedback; formatSuccess handles messageId notices. Translate at render time
so existing errors change language without refetch. Never display raw message,
details, SQL/exception prose or Zod strings; unknown reasons get a safe fallback.
See [web client conventions](../apps/web/src/api/README.md).

Verify status/reason, safe issue paths and private-field exclusion; avoid matching
English sentences as the sole assertion. Test invalid input, auth/scope/ownership,
relationship and concurrency failures relevant to the change.
