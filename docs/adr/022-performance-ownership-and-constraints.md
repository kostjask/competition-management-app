# ADR-022: Explicit performance ownership and event integrity

Accepted: 2026-11-11. Owners: P3-PERFORMANCE-OWNER and P3-CONSTRAINTS.

Performances belong to one retained studio event registration. Store required
`registrationId` and `studioId` beside `eventId`; a compound foreign key verifies
all three against the registration, and a second verifies the studio's current
event. Ownership is immutable, including for administrators and empty participant
sets. Cancellation, approval changes and dancer archival retain the owner and
scores. Approval and active membership determine access, never identity.

Use compound foreign keys for category, age group and format event consistency.
Participants carry their owner's studio ID, constrained against both performance
and dancer. This prevents direct SQL or concurrent roster moves from changing
ownership. Restrict updates/deletes of referenced identity keys; configuration
labels/ranges can still change until P3-HISTORY defines submitted snapshots.

Migration preflight audits every existing performance, including archives. Backfill
only a nonempty, wholly single-studio set with a matching studio event and existing
registration. Refuse empty/mixed/missing/cross-event ownership or invalid ranges
atomically, with no guessed owner or fabricated registration. Repair requires
explicit reviewed data correction or a verified disposable-target rebuild. Keep
performance/participant/score IDs and values. No prior migration is rewritten.

Row CHECKs enforce event start <= end, positive nullable event limits, nonnegative
age minima and ordered nullable maxima, positive ordered format counts/duration,
and positive performance duration/stage order. Existing deadline checks remain.
Equal event instants and age zero follow existing shared contracts. Cross-row
participant active/membership/approval/stage checks run in serializable API write
transactions; serialization conflicts require an explicit caller retry. Database
membership keys protect relationships independently of those checks. No age,
overlap, format eligibility or submission policy is introduced here.

The owning organizer UI is a read-only performance ownership register with studio
filter, registration links and participant counts. It consumes canonical reads;
entry editing, missing-music status and configuration remain gated by P3-ENTRIES
and P4-ENTRY-CONFIG. Empty ownership remains meaningful even without participants.
No dancer personal details are shown in the register.

Rollback requires coordinated application rollback and a new reviewed migration.
Dropping owner columns loses explicit identity for empty records; never infer a
rollback owner from participants. External target/provenance/release gates remain.
