# ADR-028: Application-owned private music versions

Accepted model prerequisite for P3-MUSIC-MODEL, 2026-11-18. Implements ADR-025's
music boundary; P8-MEDIA and P5-MUSIC still own transport/provider and screens.

A MusicTrack belongs permanently to one registration/studio/event tuple. It may
exist before a complete performance; attaching to a performance later requires
the same tuple and one track per performance. Attachment is explicit and revisioned;
names, contact email and role labels never establish ownership. No public music,
storage URL, filesystem path or public CMS asset association is introduced.

MusicVersion stores immutable validated metadata: opaque private object key,
SHA-256, display filename, detected audio MIME, byte length, parsed duration in
milliseconds, uploader and time. Bytes stay outside PostgreSQL. Only successfully
stored, content-validated versions enter this table. Unfinished uploads remain
private provider staging under P8-MEDIA; they cannot replace the current version.
The current-version composite foreign key cannot select another track's version.

State transitions are DRAFT → CONFIRMED → ACCEPTED. Confirmation pins the current
acknowledged version and locks representative replacement. Organizer acceptance
is separate; neither action changes application or entry approval. Explicit
organizer REOPEN with a reason returns to DRAFT, retaining the current working
version and immutable command history. Replacing in DRAFT atomically switches
only after validation/storage succeed. Failed/cancelled replacements retain the
old version. Existing short-lived access may expire naturally; future issuance
must recheck authority. Withdrawal/offboarding never destroys version history.

All future writes require actor-bound UUID receipts, expected track revision,
current exact-studio/event membership, active records and current music policy.
Representative preparation may use PENDING/APPROVED applications without roster
or configuration grants. New access is denied for rejected/cancelled/locked
applications and removed members. Global-admin writes require explicit policy
and reasons for exceptions; judges/moderators gain no music access by role alone.
Reads/stream URL issuance reauthorize the exact track and current version. Server
validation covers relationships even when a client passes a valid schema.

P8-MEDIA must configure detected MIME allowlists, byte/duration limits, independent
deadline and allowed exception window before exposing uploads; there are no
invented festival limits or fallback permissive defaults. It must define bounded
streaming, safe server-generated keys, malware/parser isolation as applicable,
signed private access or authorized proxy, expiry, compensation, staging cleanup,
retention and provider startup validation. Display filenames never become paths.
Old object removal must follow retained-version/receipt policy and cannot race a
current-version switch. Deleting bytes is separate from deleting provenance.

This slice delivers constrained storage, strict metadata/state contracts and
model regressions. It mounts no media endpoint and advertises no upload, ready,
playback or acceptance UI before P8-MEDIA/P5-MUSIC. S11 and organizer music review
consume this model later; S06 continues to distinguish application approvals.
No application database is migrated here. Rollback must preserve any future
version/operation records; provider rollout and cleanup need their own rehearsal.
