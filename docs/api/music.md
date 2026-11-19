# Private music

[API index](../API.md). [ADR-028](../adr/028-private-music-model.md) owns the
model; [ADR-029](../adr/029-private-music-delivery.md) owns local delivery,
staging/retention and correction windows. P8-MEDIA/P5-MUSIC mount the following
authenticated operations beneath `/api/v1`. Images and CMS assets cannot receive music.

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

## Operations

Let `B = /events/:eventId/studios/:studioId/music`. Every owner relationship is
rechecked server-side; paths and UUIDs never establish authority.

| Method/path | Body / result |
| --- | --- |
| `PUT /events/:eventId/music-configuration` | Global admin only: `{expectedRevision, policy}` → configuration |
| `GET B` | Current event/studio names, configuration, explicit organizer authority and active tracks |
| `POST B` | `{operationId, trackId, performanceId?}` → immutable receipt with revision-1 track |
| `POST B/:trackId/versions` | Multipart field `file`; headers below → receipt after validated atomic replacement |
| `POST B/:trackId/commands` | Shared `MusicCommandSchema` → immutable receipt |
| `GET B/:trackId/versions/:versionId/bytes` | Exact current version only; authenticated `200`/`206`, bounded file stream |

`policy` requires `allowedMime` (`audio/mpeg`, `audio/wav`, distinct nonempty
subset), positive `maxBytes` (at most 134217728), positive `maxDurationMs`
(at most 86400000), ISO UTC `deadline` and `exceptionUntil >= deadline`.
Configuration exposes `{revision, policy|null, providerReady}`. Revision zero
means unconfigured; absent configuration never supplies permissive defaults.
All configuration saves append audit and reject stale revisions.

Upload headers: `X-Operation-Id` UUID, `X-Music-Revision` positive integer,
`X-Policy-Revision` positive integer. Optional `X-Display-Name` is a percent-encoded
UTF-8 display name; both multipart filename and display name must reject controls,
slashes, backslashes and lengths over 255 characters. Neither becomes a path.
Client MIME/extension are ignored: bounded content parsing detects the allowlisted
MP3/PCM WAV type and duration. Extra fields/files, oversize, malformed, unsupported
and over-duration content fail without replacing the working version.

`REPLACE` is accepted only through version upload, not JSON commands. `ATTACH`
requires an unattached DRAFT and exact active same-registration performance.
`CONFIRM`/`ACCEPT` pin the current version ID; ACCEPT is global-admin only and
requires CONFIRMED. `REOPEN` is global-admin only, requires a reason and ISO UTC
`until` in the future, no later than `exceptionUntil`. It returns to DRAFT with
the current version retained. Preparation and confirmation obey the independent
music window or that explicit correction window. Current policy limits are
rechecked before confirmation/acceptance. None changes application/entry approval.

Active exact-studio membership authorizes PENDING/APPROVED preparation, even
without representative role/roster grants. Active global admin can review/configure;
scoped admins, judges and moderators have no role-only bypass. Rejected/cancelled/
locked applications, archived studios/performances and removed members fail closed.
Every replay rechecks current access before returning an actor/body-bound receipt.

## Delivery and recovery

Configure `MUSIC_STORAGE_PATH` as an absolute private volume outside uploads and
web/public directories. API and workspace startup validate the path and a write/
delete probe; unset disables uploads. Playback uses current HttpOnly cookies or
native bearer authorization, `Cache-Control: private, no-store`, detected MIME,
`nosniff`, inline disposition, no conditional cache reuse and range requests.
Storage keys, hashes, uploader identities and filesystem paths never enter DTOs.
Historical bytes cannot obtain new access; removed membership blocks future requests.

Staging exists before bytes. One-hour expiry/minute cleanup retires before
external deletion; failed deletions retry. Committed versions are retained, not
automatically pruned. Failed storage/parser/transaction/audit work leaves the
current version intact. Exact upload retries hash the supplied bytes again;
receipt identity includes actor, owner, revision, policy revision, display name and
hash. A new file/body must use a new operation after comparing current state.
An uncertain/cancelled response is never evidence that the server rolled back.

S11 is `/app/events/:eventId/studios/:studioId/music`, linked from application
detail for preparation and S10/organizer entry editing with `?performance=...`.
The selected track is URL state. Music routes/selections participate in the shared
safe-return allowlist; loopback cohosting permits only same-origin media through
its CSP. Limits precede the chooser; current metadata and native non-autoplay
audio remain through failures. The client retains the File
and frozen operation across session recovery/retries; refresh and explicit
comparison allow a new operation. Navigation warns about unsaved work. File
selection is memory-only and must be repeated after leaving/reloading.
Attach a prepared track from its performance editor before confirming it;
confirmation locks attachment as well as replacement until organizer reopening.

[Validation and remaining release limits](../MUSIC_DELIVERY_VALIDATION.md).
