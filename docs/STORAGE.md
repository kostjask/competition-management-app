# File storage

Current implementation is local only. Sources:
[provider interface](../apps/api/src/services/storage.ts),
[local implementation](../apps/api/src/services/local-storage.ts),
[startup](../apps/api/src/index.ts), [image controller](../apps/api/src/controllers/ImagesController.ts).

## Current behavior

The planned studio/festival CMS needs reviewed public images and archive documents
under [P4-PUBLIC-MODEL](roadmap/website.md). That public asset lifecycle is not
implemented, does not inherit private-music prerequisites and must not turn current
authenticated uploads into public files. Define allowlisted types, content/size
validation, draft/published references, cache/unpublish and replacement/cleanup
before consumers, following the completed ADR-026 design. That design chooses
document-owned normalized rasters, protected previews, live-reference/rights-gated
no-store public reads and independent durable cleanup. Documents initially use
reviewed HTTPS links; first-party PDF import stays gated under P9-WIX-TRANSITION.
Current raster limits below remain unchanged.

- STORAGE_TYPE accepts only local; startup installs LocalStorageService.
- Files live under configured STORAGE_PATH, resolved against the API working
  directory (default ./uploads, normally apps/api/uploads). Strict canonical keys
  and containment checks protect reads/writes/deletes. New keys use forward slashes
  on every platform and exclusive creation; client filenames are never stored.
- `/uploads/:resource/:filename` requires current authentication, live reference
  and resource read access. No public static serving remains. STORAGE_PUBLIC_URL
  is an optional validated URL base; default image URLs are origin-relative. Use
  the API origin for the browser's protected Blob download helper.
- Multer buffers one file, limited to 10 MiB with no extra fields/files. JPEG/PNG/
  WebP extension/MIME/signature/decoded format must match. Sharp fully decodes and
  re-encodes metadata-free WebP with a 16-megapixel input and 2048px output edge
  bound; malformed, vector and animated input is rejected. See ADR-015.
- Authorization precedes storage and is refreshed in the serializable reference/
  audit transaction. Failed mutation attempts new-file cleanup and preserves the
  old file. Successful commit precedes old-file cleanup; unreachable orphan files
  may remain after crashes/cleanup failures. Superseded/orphan files are never
  served. Durable compensation/cleanup/retry remains P8-MEDIA.
- Existing legacy files are retained on disk, but noncanonical keys are no longer
  served. Re-upload permitted images; no legacy transformation/deletion is run.
- Current image routes target events, **users**, dancers and studios. There is
  no judge-image endpoint; old judge/storage-path response examples were obsolete.

Exact paths, multipart field names and response DTOs:
[image contract](api/images.md). All routes require authentication; resource
ownership/permission/content enforcement is implemented under P2-BOUNDARIES-UPLOADS.
Image UI and full workflow release checks remain open. Entity deletion does not
guarantee media cleanup.

## Future providers

P4-PUBLIC-EDITOR adds a separate `content-private` namespace, owned by CMS
documents rather than private operational images. Normalized raster publication
requires current references and approved rights. Its durable staging/retirement/
cleanup worker is independent of private-music P8-MEDIA work. Exact headers,
leases, retry limits and restore restrictions: [content assets](api/content.md#raster-ownership-rights-and-cleanup).
PDF/video remain reviewed external HTTPS links; no PDF upload or remote fetch is enabled.

P8-MEDIA extends private provider selection, music validation and durable cleanup/
retry; current raster protection is delivered in P2. P3-MUSIC-MODEL owns music metadata/ownership.
Cloud-provider env fields are optional parsed settings, not installed adapters or
conditional credential checks. Adding an SDK/import alone does not complete
private access, deployment, backup, URL and migration policy. No cloud pricing or
automatic-backup guarantee is maintained here.

For missing local files, check API working directory, disk permissions, the stored
path and public origin without printing private records. [Configuration](ENVIRONMENT_CONFIGURATION.md)
documents active versus unused variables; [testing](TESTING.md) documents checks.
