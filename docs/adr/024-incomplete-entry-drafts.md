# ADR-024: Durable incomplete entry drafts

Accepted for local implementation: 2026-11-11. Owner: P3-ENTRIES-DRAFT,
a bounded prerequisite slice of P3-ENTRIES.

## Representation

Keep one Performance identity through drafting, completion and later submission.
Title, duration, category, age group, format and stage order are nullable. Omitted
create fields become null; omitted participants become an empty set. PATCH omission
retains a value, explicit null clears it, and an empty participant list clears the
selection. Supplied titles remain nonblank and supplied numeric values positive.
Every supplied relationship remains event/owner consistent. Multiple unscheduled
entries may have null order; assigned orders retain event uniqueness, including
archives. Scheduling is not part of draft completeness.

A dedicated draft table would require identity transfer, duplicate authorization
and history storage without a separate lifecycle need. Nullable fields preserve
existing immutable ownership, score relations and revision identity. This is
transitional incompleteness, not permission to submit incomplete data.

## History, retries and access

New snapshots use policyVersion 2 with nullable entry/configuration values.
Version 1 snapshots remain unchanged and readable. Left joins capture absent
configuration explicitly as null. Revision capture and audit remain atomic.
No submission status is inferred from completeness or migration provenance.

POST optionally accepts a UUID operationId, retained with an actor/event-bound
digest of the normalized request. The organizer always supplies one. A matching
retry rechecks current owner read access and returns the current active entry without
another save/audit; changed reuse conflicts. Concurrent creation may return 409;
retry the same operation. Archived entries cannot be recreated with the same ID.
Reconciliation remains available after the write window closes, while a new
operation still requires current write access. If a previously uncertain retry is
denied, the UI keeps its operation rather than assuming the original write failed.
PATCH/DELETE retain expectedRevision checks. No automatic stale overwrite.
Existing callers without operationId must reconcile uncertain POSTs manually.

Authorization, active records, both approvals and representative stage/review
rules remain authoritative on the server. Administrator exceptions remain the
existing policy; they do not bypass relationships or revision checks.

## Owning UI and boundaries

The Cobalt organizer register creates owner/title-only drafts through an inline
form. A failed or uncertain request retains its frozen body/operation ID for an
explicit retry, including session recovery; it never reports success before a
decoded response. Missing fields and unscheduled state are translated and shown
separately. Completeness means fields present, not eligibility or submission.
History renders missing configuration honestly. Representative editing belongs
to P5-ENTRIES after P4-ENTRY-CONFIG.

P3-ENTRIES stays open for submit-time age/count/duration/music/deadline validation,
immutable receipts, scoped corrections, locks, withdrawal and resubmission.
P3-HISTORY stays open for those consumers. No final receipt is created here.
Future submission must pin its validated revision under ADR-023. Entry/music
deadline and required-music configuration remain P4-ENTRY-CONFIG/P3-MUSIC-MODEL.

## Migration and rollback

Migration 36 only relaxes nullability, adds optional retry metadata and replaces
the snapshot capture function. It does not rewrite retained entry values or
immutable snapshots. Positive-value, compound-key and owner guards remain.
Rollback requires a forward migration and coordinated binaries: older clients
cannot decode incomplete entries. Do not fill absent data with invented defaults
or drop saved drafts to permit a downgrade. No applied history is rewritten.
