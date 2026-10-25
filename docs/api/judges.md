# Judge contract

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

Authenticated collection operations use `GET/POST /api/v1/events/:eventId/judges`;
item operations use `GET/PATCH/DELETE /api/v1/events/:eventId/judges/:judgeId`.
Reads require admin or `event.manage` for that event or globally. Writes remain
admin-only. All operations check event existence; missing events return 404,
including collection reads. Item reads and mutations constrain both IDs, so a
judge from another event returns 404 even for admins. Permission denials use the
global 403 envelope. Existing event-stage behavior is unchanged.

POST accepts `userId`, `name`, and optional nullable `description`, `country`,
and `city`. The user must exist and be active (404/409 otherwise). The path is
the only event selector. Text is trimmed and nonblank; unknown body fields are
rejected. PATCH accepts a nonempty subset of the four profile fields. Omitted
fields stay unchanged; explicit null clears optional text. Event/user links,
scores, role, audit fields, and invented timestamps cannot be patched.

Creation returns 201; list/detail/update return 200. DTOs contain only `id`,
`eventId`, `userId`, `name`, nullable `description`, `country`, and `city`.
No user credentials, relations, or timestamps are returned. Backend serialization
and frontend helpers validate shared schemas. Helpers are exported through the
web API barrel; no judge management screen is implemented by this slice.

The existing unique user/event constraint returns 409, including concurrent
assignment conflicts; the same user can judge different events. DELETE remains
hard deletion for unscored records, returning 204 without a body. The actual
Score foreign key restricts deletion: scored judges return 409 and retain scores.
The previous route comment claiming cascade/soft deletion was incorrect. A
concurrently missing item returns 404; foreign-key races return 409. No migration
or automatic cleanup is introduced. CRUD neither grants nor removes UserRole;
invitation acceptance and history-preserving staff offboarding remain Phase 2.
