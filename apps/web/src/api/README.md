# Web API helpers

The configured base URL includes /api/v1 (development: http://localhost:4000/api/v1).
Feature components call these helpers, never fetch directly. Requests validate
external input on the backend; frontend checks are usability controls only.

client.ts includes HttpOnly cookie credentials and CSRF/session-negotiation headers,
handles JSON/multipart/204 responses, and
returns unknown output. Each resource helper calls decode with its shared response
schema; malformed server data becomes an invalidResponse ApiError. Auth helpers
validate token-free browser session metadata; credentials never enter Web Storage.
401 emits recoverable session state, without hard navigation or automatic write retry. Request and DTO types come from
@dance/schemas. There are no unchecked generic response assertions.

Canonical modules cover auth, events, studio profiles/registrations, dancers,
performances, judges, categories, formats, age-groups, invitations and image uploads.
IDs in paths are encoded. Private images accept only canonical API-origin paths,
including a same-origin relative /api/v1 base; redirects and foreign URLs are refused. DELETE helpers return void for 204. The upload helpers
use FormData without setting Content-Type manually. Upload ownership/content/private retrieval is implemented under ADR-015; this transport module does not authorize management UI.

Store toUiError(error) in component state and render ErrorFeedback. It preserves
stable reason/rule IDs and translates at render time. Use formatSuccess for a
notice's messageId. Never display ApiError.message, raw server prose/details or
Zod message strings to users. See the maintained [API reference](../../../../docs/API.md)
and [localization contracts](../../../../docs/LOCALIZATION.md).

Onboarding helpers use the strict shared owner-proof/session unions on canonical
POST /auth/onboarding/read, /save, /cancel. Password proof is component-memory-only
and gives no ordinary session. Invitation helpers validate status/accountExists
previews and displayed-expiry CAS resend/revoke; all normal DTOs exclude raw secrets.
Registration now requires studio intent, not only credentials (ADR-017).
