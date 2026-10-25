# Formats and age groups

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

Both resources use authenticated GET/POST collections under an event, and
GET/PATCH/DELETE items with formatId or ageGroupId. Reads require admin or global/
event event.manage; writes remain admin-only. Every operation checks the event;
item predicates include both IDs. Missing parents/items return 404 and permission
denials use the standard envelope. Existing stage behavior remains unchanged.

Format input fields are name, minParticipants, maxParticipants and
maxDurationSeconds; all numeric values are positive PostgreSQL-compatible integers.
Age group input fields are name, minAge (nonnegative integer), and optional nullable
maxAge. Names are trimmed/nonblank; unknown fields and empty patches are rejected.
PATCH omission preserves maxAge, while null clears it. Minima cannot exceed maxima.
PATCH validates the resulting record in a serializable transaction; conflicting
concurrent edits return 409 or fail range validation with 400, preserving a valid
stored range. DTOs contain exactly id/eventId and the respective stored fields,
including explicit nullable maxAge. No fabricated timestamps/relations are sent.

Lists sort formats by name then ID and age groups by minAge then ID. Creation
returns 201, reads/updates 200 and deletion 204. The existing schema permits
repeated format/age-group labels, including concurrent creates and renames. This
slice does not add name uniqueness, overlap, eligibility or participant/duration
policy. The existing foreign keys prevent deleting configurations referenced by
active or archived performances (409). Missing/concurrently removed records return
404; relationship/serialization races map to standard errors. No migration.
