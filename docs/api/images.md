# Image contracts

[API index](../API.md) · Paths are relative to `/api/v1` unless shown in full.

POST /api/v1/images/events/:eventId uses multipart image; users/:userId and
dancers/:dancerId use photo; studios/:studioId uses logo. Paths remain canonical.
All require authentication and validate resource IDs/existence; archived studios/
dancers are unavailable. Resource ownership and permission checks remain
P2-BOUNDARIES, which must pass before an upload UI is exposed.

Missing file, declared MIME rejection, size and unexpected multipart fields use
the global validation envelope with uploadMissing/uploadType/uploadTooLarge/
uploadInvalid reasons. Existing JPEG/PNG/WebP and 10 MiB limits remain; content
sniffing/provider policy is P8-MEDIA. Success is exactly success:true, messageId:
saved and the appropriate imageUrl/photoUrl/logoUrl; private storage paths are
omitted. Helpers use FormData and runtime response decoding.

Upload occurs before database update/old-file removal. Database failure attempts
new-file cleanup and retains the old file. Full provider replacement, old-file
cleanup/retry and orphan handling remain P8-MEDIA; no durable cross-storage
transaction is claimed. Unexpected failures use a sanitized 500 envelope, with no
exception/SQL/storage-path details returned.
