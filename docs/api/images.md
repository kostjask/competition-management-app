# Image contracts

[API index](../API.md) ? Upload paths are relative to `/api/v1`.
Policy: [ADR-015](../adr/015-image-boundaries.md).

POST /images/events/:eventId uses multipart image; users/:userId and
dancers/:dancerId use photo; studios/:studioId uses logo. These canonical
operations require a current active, verified identity. Only one file is accepted;
extra fields/files are rejected. Client event/studio/owner associations are never
used for authorization. Missing file/type/size/multipart errors retain the shared
uploadMissing/uploadType/uploadTooLarge/uploadInvalid semantic reasons in ET/EN/RU.

| Image | Write authority | Read authority |
| --- | --- | --- |
| Event | Active global admin | Any current eligible account, matching event reads |
| User | Owner or global admin; target must be active | Owner/global admin; target active |
| Studio | Active member with stored-event/global studio.manage and studio.edit stage, or global admin | Active member/global admin |
| Dancer | Active member, stored-event/global dancer.manage, both studio/registration approvals and dancer.manage stage/review exception, or global admin | Same approved roster-access boundary, without write-stage gate |

Archived dancers or studios and unavailable parents fail even for admins. Removed
roles/membership cannot keep access. Writes authorize before decoding/storage and
recheck current identity/session revision, roles, membership, parent/stage and the
original reference inside a serializable transaction. No event-scoped admin bypass
exists. A verified roleless account may replace only its own photo.

Only JPEG (.jpg/.jpeg), PNG (.png) and WebP (.webp) are accepted when extension,
declared MIME and decoded format agree. Keep the 10 MiB input limit; reject invalid,
truncated, animated and over-16-megapixel inputs. Real raster decoding re-encodes
single-frame WebP, strips metadata, applies orientation and bounds output to 2048px
per edge. Paths use server UUID filenames and .webp, never client filenames. SVG,
HTML and MIME/extension/content mismatches fail before storage.

Success remains exactly success:true, messageId:saved and the appropriate
imageUrl/photoUrl/logoUrl; private storage paths are omitted. Replacement and a
privacy-safe IMAGE_REPLACED audit commit together. Transaction/audit/access failure
attempts new-file cleanup and preserves the previous reference/file. Concurrent
losers return 409. Old-file cleanup occurs after commit; failure leaves an
unreachable orphan and does not turn a committed success into a false failure.
Crash-safe durable cleanup/retry remains P8-MEDIA.

GET /uploads/:resource/:filename (outside /api/v1) requires a bearer session,
canonical UUID .webp key, live database reference and the read authority above.
There is no public static fallback. Superseded/orphan/legacy files, traversal and
archived/inactive subjects cannot be retrieved. Success uses image/webp, nosniff,
private no-store, a restrictive sandbox CSP and a fixed safe Content-Disposition.

The web downloadImage helper returns a Blob for canonical image URLs on the API's
own origin only, disables redirects/caching and never puts credentials in a URL.
A future image UI must create/revoke its own blob URL, handle errors and preserve
accessibility; no upload/image UI is introduced here. STORAGE_PUBLIC_URL must use
the API origin for that helper; default URLs are origin-relative. See
[storage/configuration](../STORAGE.md) and [validation](../IMAGE_BOUNDARIES_VALIDATION.md).
