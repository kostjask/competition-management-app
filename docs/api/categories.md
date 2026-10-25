# Category contract

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

Authenticated collection operations use GET/POST at
`/api/v1/events/:eventId/categories`; item GET/PATCH/DELETE use
`.../categories/:categoryId`. Reads require admin or `event.manage` for the
event or globally; writes remain admin-only. Every operation checks the event
exists (404 otherwise). Every item operation constrains both IDs, including
admin mutations. Wrong-event/missing items return 404; permission denials return
the global 403 envelope. Existing stage behavior is unchanged.

POST and PATCH accept only `{ "name": "Ballet" }`. Names are trimmed and must
be nonblank strings. Empty PATCH bodies, null names and unknown fields such as
id, eventId, performances or audit fields are rejected with the global validation
envelope. The path alone selects the event. DTOs contain exactly `id`,
`eventId` and `name`, with no invented timestamps or relations. Lists are
arrays ordered by name then ID. Backend serialization and frontend API helpers
validate shared schemas; helpers are exported through the API barrel. No
category management screen is delivered here.

Creation returns 201, list/detail/update return 200 and deletion returns 204
without a body. Existing per-event name uniqueness returns a standard 409 for
create/rename conflicts, including competing creates. Names can repeat across
events. Updates/deletes constrain the event in the database write, with a
concurrently missing item mapped to 404. DELETE hard-deletes unused categories;
the database foreign key blocks referenced categories with 409, preserving all
performances, including archived ones. Relationship races also return 409.
No schema/migration, new lifecycle restriction or historical snapshot behavior
is introduced. Legacy nomination schemas/types were removed under P1-TYPES.
