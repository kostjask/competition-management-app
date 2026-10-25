# File storage

Current implementation is local only. Sources:
[provider interface](../apps/api/src/services/storage.ts),
[local implementation](../apps/api/src/services/local-storage.ts),
[startup](../apps/api/src/index.ts), [image controller](../apps/api/src/controllers/ImagesController.ts).

## Current behavior

- Startup installs LocalStorageService regardless of STORAGE_TYPE.
- Files live under `process.cwd()/uploads`; normal scoped API execution uses
  apps/api/uploads. STORAGE_PATH does not change it today.
- Express serves `/uploads` publicly. STORAGE_PUBLIC_URL supplies the URL origin
  (default http://localhost:4000); it does not add private access or authorization.
- Multer buffers one file in memory, limiting it to 10 MiB and declared MIME
  image/jpeg, image/png or image/webp. Content sniffing is not implemented.
- Upload writes the new file, updates the row, then removes the previous file.
  Database failure attempts new-file cleanup and retains the old file. Durable
  provider compensation, orphan cleanup and retry handling remain incomplete.
- Current image routes target events, **users**, dancers and studios. There is
  no judge-image endpoint; old judge/storage-path response examples were obsolete.

Exact paths, multipart field names and response DTOs:
[image contract](api/images.md). All routes require authentication; resource
ownership/permission enforcement is still P2-BOUNDARIES. Do not expose management
upload UI before that gate. Entity deletion does not guarantee media cleanup.

## Future providers

P8-MEDIA owns production/private provider selection, content validation, safe
replacement and orphan handling; P3-MUSIC-MODEL owns music metadata/ownership.
Cloud-provider env fields are optional parsed settings, not installed adapters or
conditional credential checks. Adding an SDK/import alone does not complete
private access, deployment, backup, URL and migration policy. No cloud pricing or
automatic-backup guarantee is maintained here.

For missing local files, check API working directory, disk permissions, the stored
path and public origin without printing private records. [Configuration](ENVIRONMENT_CONFIGURATION.md)
documents active versus unused variables; [testing](TESTING.md) documents checks.
