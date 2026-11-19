# Private music model

[API index](../API.md). [ADR-028](../adr/028-private-music-model.md) owns the
P3-MUSIC-MODEL decision. This is a storage/contract prerequisite, with **no mounted
music API yet**. Image endpoints and public CMS assets cannot receive music.

`MusicTrack` is permanently registration/studio/event-owned, optionally attached
to one exact-owner performance. `MusicVersion` contains immutable metadata for
validated private bytes outside PostgreSQL. Composite foreign keys prohibit a
foreign performance association or another track's current version. Versions
and actor/body-bound `MusicOperation` receipts are immutable. Deletion restricts
retained history; application/entry withdrawal remains separate.

The shared `MusicTrackSchema`/`MusicVersionSchema` expose display metadata only:
UUID version identity, displayName, detectedMime, byteLength, durationMs and
createdAt. They exclude object keys, digests, uploader identities and access URLs.
Commands pin operation UUID, expected revision and exact version where applicable.
ATTACH takes a performance ID; REOPEN requires a reason. Domain transitions are
DRAFT → CONFIRMED → ACCEPTED, with reasoned organizer reopening to DRAFT.
Representative replacement requires DRAFT; confirmation is not acceptance.

These schemas and the pure transition helper do not authorize writes. P8-MEDIA
must implement current active membership, exact owner/event/registration checks,
safe private staging, detected content/limits, revisioned atomic replacement,
receipt replay, audit and authenticated byte delivery. P5-MUSIC owns S11 and the
organizer consumer; expose no controls or fake ready/accepted states until then.
Configured MIME/size/duration/deadline/exception policies must exist before upload
is enabled. No real festival limits, storage provider or cleanup promises are
inferred from this model task.
