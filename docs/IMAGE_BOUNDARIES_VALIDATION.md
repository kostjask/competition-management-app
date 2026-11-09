# Image boundary validation

> Dated evidence; results and “next task” statements apply to the recorded snapshot.
> Current priority/status: [checkpoint](../DEVELOPMENT_PLAN.md); commands: [TESTING](TESTING.md).

Date: 2026-11-01. Task: P2-BOUNDARIES-UPLOADS, C3/C4. Base revision 76912d0 plus
preserved uncommitted invitation/admin-scope work. Evidence applies to this working
tree, without a commit, hosted rollout or application database reset.

## Delivered scope and decisions

[ADR-015](adr/015-image-boundaries.md) records resource-specific ownership, active
parent, permission, approval/stage and private retrieval policy before dependent
implementation. [Image contracts](api/images.md) define exact paths and behaviors.
All four image endpoints now derive scope from stored resources, authorize before
decoding/storage and refresh identity/session revision, role permissions,
membership, parent/stage and original image reference in a serializable transaction.
The existing role resolver is reused for fresh checks without changing its policy.

Sharp 0.35.5 is a new justified dependency: actual raster decoding and canonical
re-encoding are needed to validate compressed pixel data and remove metadata/active
payloads. Inputs are restricted to matching JPEG/PNG/WebP formats, 10 MiB and
16 megapixels, without animation; output is metadata-free oriented WebP bounded to
2048px per edge with a random UUID .webp filename. Implementation guidance uses
the official [constructor](https://sharp.pixelplumbing.com/api-constructor/),
[metadata](https://sharp.pixelplumbing.com/api-input/) and
[output](https://sharp.pixelplumbing.com/api-output/) documentation.

Unrestricted Express static serving is removed. Canonical /uploads resource URLs
require an eligible bearer account, a current database reference and resource
read access. Responses fix image/webp, nosniff, sandbox CSP, safe disposition and
private no-store. Unreferenced/superseded/orphan/noncanonical legacy files are
inaccessible. No existing files are automatically converted or deleted.

The client returns protected image Blobs only from the configured API origin,
refuses query/fragment/credential/foreign URLs, disables redirects/caching and
retains semantic API errors. No image UI was added. STORAGE_PATH now controls the
actual local root; optional STORAGE_PUBLIC_URL is parsed centrally and defaults to
relative URLs. Browser consumers require the API origin. Provider selection is
still local; cloud adapters remain P8-MEDIA.

Database references and IMAGE_REPLACED audit records commit atomically. New migration
20261101000000_image_audit expands action/target allowlists to image replacement,
Event and Dancer, preserving prior rows, metadata checks and immutable triggers.
No backfill, credential change or inferred ownership occurs. Prefer forward repair;
reverting expanded allowlists after new audit events requires a reviewed retention
decision and must not silently erase audit evidence.

## Regression evidence

Two maintained HTTP regressions were executed against the original HEAD image
controller/upload middleware, temporarily transpiled into generated outputs. They
failed with **200 instead of 403** for a foreign-photo write and **200 instead of
400** for disguised HTML declared image/png. Generated files were restored in a
finally block; both tests pass with the fix. Source edits were preserved.

HTTP/raster tests use real PNG/JPEG/WebP bytes and storage fakes; no previously
accepted arbitrary-byte fixture is treated as a genuine image. They check strict
DTO/error semantics, metadata stripping, safe derived filenames, input/output pixel
bounds, HTML/SVG, truncated data, MIME/extension/content mismatch and animated
WebP/APNG rejection. Existing multipart size/type/field checks remain maintained.

The PostgreSQL child uses only the random baseline database and its own verified
temporary storage root. It checks full domain/audit snapshots and files around
roleless/cross-user/event/studio, missing/removed permission/member, approval,
stage, inactive and archived-parent denial. Genuine permitted writes/readbacks
exercise all four resources, metadata-free WebP, private headers and bearer denial.
It exercises stored DATA_REVIEW overrides without permitting terminal-stage edits.

Injected audit failure proves database/reference/audit rollback and new-file cleanup.
Membership revocation after file storage is caught by transactional reauthorization.
A storage barrier produces one successful replacement and one 409 loser. Simulated
post-commit cleanup failure still returns truthful success; the leftover old file
cannot be retrieved because it is no longer referenced. Temporary files are removed
in finally after verifying their resolved root is the child-owned temp directory.

## Commands and results

| Command | Result |
| --- | --- |
| `pnpm.cmd --filter api add sharp` | Manifest/lockfile updated; network-enabled run required |
| `pnpm.cmd install --frozen-lockfile` and `pnpm.cmd install --force --frozen-lockfile` | Complete successfully; resolution unchanged |
| `pnpm.cmd build` | Workspace builds pass; unchanged outputs may use Turbo cache |
| `pnpm.cmd typecheck` | Workspace, seed and browser TypeScript pass |
| `pnpm.cmd lint` | Web lint passes |
| `pnpm.cmd test` | Localization guard, 99 API and 10 frontend tests pass |
| `node --test --test-name-pattern="image boundaries reject" apps/api/tests/routes.test.cjs` | Both focused boundary regressions pass after expected original-handler failures |
| `node --test apps/api/tests/raster-images.test.cjs` | Both decoder/metadata/content suites pass |
| `pnpm.cmd db:generate`, `pnpm.cmd db:validate` | Generated/valid with explicit unused local placeholder URL |
| `pnpm.cmd exec prisma format --check --schema apps/api/prisma/schema.prisma` | Pass |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-migrations.ps1` | Fresh/upgrade history, historical audit preservation and exact parity pass |
| `pnpm.cmd test:baseline` | Full PostgreSQL/HTTP baseline and isolated image child pass |
| `node --check scripts/check-image-boundaries.cjs` | Pass |
| `node --check scripts/check-docs.cjs`, `node scripts/check-docs.cjs`, `git diff --check` | Documentation/whitespace pass |

Initial fresh frontend tests exposed an ignored generated apps/web tsx launcher
pointing to missing 4.21.0, while the lockfile/root installation is 4.23.15. Frozen
reinstallation did not remove that obsolete launcher. Only the three confirmed
ignored stale launchers were removed after checking resolved workspace paths and
their target contents; frontend/full tests then passed through the root launcher.
No source dependency was downgraded and no unrelated source was reset.

## Remaining limits and next action

No blocker remains for this technical slice. Storage and PostgreSQL do not share a
distributed commit; crashes/cleanup failures can leave unreachable orphan files.
Durable cleanup/retry, cloud/provider selection, music/media expansion and privacy
operations remain P8-MEDIA. No legacy cleanup/reset or real-data deployment was
performed. The running local staging rehearsal remains on its previously recorded
code/schema; intended rollout/migration, Linux container/native dependency evidence
and hosted CI are still operational work. No new image UI/browser/accessibility or
human language review is claimed. No external milestone closes.

Next actionable task: remaining P2-BOUNDARIES transport/abuse controls—configured
CORS, security headers, production validation and login/invitation/upload limits.
P2-BOUNDARIES-ERRORS, SESSION and deployment scope gates remain open separately.
