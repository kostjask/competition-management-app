# ADR-015: Authorized raster images and private retrieval

Status: accepted, 2026-11-01. Scope: P2-BOUNDARIES-UPLOADS; follows ADR-012 and
the existing privacy and resource access policies. Provider/media UI expansion
remains P8-MEDIA and the owning workflow tasks.

Image writes use stored relationships and the same resource rules as ordinary
edits: event image by global admin; account photo by its active owner or global
admin; studio logo by active member with studio.manage in the stored event/global
scope and a studio.edit stage; dancer photo by active member with dancer.manage,
approved studio/event registration and the dancer-edit stage/review exception.
Global admin bypasses permission/stage gates, never missing/inactive/archived
records or parents. No submitted event/studio/owner association grants authority.

Images are private operational data until a separate publication contract exists.
Remove unrestricted static serving. Existing /uploads resource URLs require a
current eligible bearer identity, a currently referenced canonical storage key and
read access: event images follow authenticated event reads, user photos owner/admin,
studio logos active member/admin, dancer photos the existing approved roster-read
boundary. Archived parents and inactive accounts are unavailable. UI journeys must
fetch protected image blobs through the API client; tokens must never enter URLs.
No image UI currently exists. Public publication and signed-provider URLs are later
policy decisions, not implied by possession of an image URL.

Accept JPEG/PNG/WebP only when filename extension, declared MIME and decoded raster
format agree. Use sharp for real decoding and canonical WebP re-encoding; hand-built
magic-byte checks do not establish valid pixel content. Reject malformed/truncated
images, unsupported/animated inputs and inputs above 16 megapixels. Keep the
existing 10 MiB multipart bound; strip metadata, orient pixels, bound output to
2048px on either edge, and use random UUID filenames with a server-selected .webp
extension. No original bytes, client filenames, metadata or image contents enter
storage paths or audits. Safe retrieval fixes Content-Type, nosniff, restrictive CSP
and private no-store caching, with no static fallback. Noncanonical legacy files
are inaccessible; do not delete or transform existing files automatically.

Authorize before decoding/storage, then recheck current identity, roles, membership,
parent/stage and original storage reference in a serializable update transaction.
The database reference and privacy-safe IMAGE_REPLACED audit commit atomically.
Competing replacements conflict; failed authorization/database/audit mutations
attempt new-file cleanup and retain the old reference/file. Remove the superseded
file only after commit. File-system and database commits are not distributed:
crashes or cleanup failures may leave unreachable orphan files, addressed by
P8-MEDIA's durable cleanup/retry work. A cleanup failure after commit must not
misreport the committed replacement as failed. Retrieval always checks the live
reference, so orphaned/superseded files are inaccessible.

Add a forward migration extending audit action/target allowlists only; retain all
existing records and immutable audit protections. Rollback requires removing newly
introduced audit rows or retaining expanded allowlists; prefer forward repair.
No reset, legacy backfill or inferred ownership is required.
