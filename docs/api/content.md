# Shared content and published reads

P4-PUBLIC-EDITOR implements ADR-026's structured CMS. Paths below are relative
to `/api/v1`. Exact request/response shapes are owned by
[shared schemas](../../packages/schemas/src/cms.schema.ts), not these examples.
Existing event, judge and image routes retain their authentication and scope.

## Authority and documents

Every `/content` operation requires the current active, verified global admin
assignment with null event scope. Event admins, ordinary users, representatives,
judges and moderators cannot read drafts/history/preview or write content. The
service rechecks account/session/assignment inside serializable transactions.
There is no administrator provisioning or public-profile account creation here.

`STUDIO_SITE` and `FESTIVAL_PORTAL` are explicitly created singletons. Editions
belong to a stable Festival and may link to one existing, unused Event. An Event
is linked to at most one edition. Neither entrants' Studio/Dancer records nor
operational Judge/User records are CMS profiles. Edition/festival slugs have no
update endpoint and cannot be reassigned. Event deletion is restrictive.

| Method/path | Request / result |
| --- | --- |
| GET /content/documents | Index with document details and Festival identities; no writes |
| POST /content/documents | `kind`, `operationId`, `expectedVersion: 0`; explicit singleton initialization receipt |
| GET /content/documents/:documentId | Version, saved draft, published pointer, document-owned assets and minimal canonical Event facts |
| POST /content/festivals | `name`, ASCII `slug`, operation/version of the portal document; identity creation receipt |
| POST /content/editions | `festivalId`, `slug`, nullable `copyDocumentId`, selected `sections`, operation/version of portal; unpublished draft creation receipt |
| POST /content/editions/:editionId/link | Nullable `eventId`, `migrationReviewed`, operation/version of edition document; versioned link receipt |
| POST /content/documents/:documentId/revisions | Strict `payload`, `operationId`, `expectedVersion`; immutable saved revision receipt |
| GET /content/documents/:documentId/revisions | Descending history, 20 records; optional positive `before` revision number |
| GET /content/documents/:documentId/preview | Required saved `revisionId`, `locale=et/en/ru`; private projected content, readiness issues, current canonical `facts` and `policyDigest` |
| POST /content/documents/:documentId/publish | Exact saved `revisionId`, `reviewed: true`, preview's `policyDigest`, operation/version; publication receipt |
| POST /content/documents/:documentId/unpublish | Operation/version; clears publication while retaining history |
| POST /content/documents/:documentId/archive | Operation/version; unpublished edition only, permanently stops editing |
| GET /content/documents/:documentId/operations/:operationId | Current authorized actor's committed receipt, or 404 |

Every write has a UUID operation identity and expected document version. An
identical committed retry returns its original receipt after current authority
checks. A changed actor/target/kind/body returns 409. Receipts describe that
operation, not the current publication. Read back current state separately.
Concurrent stale writes return 409; semantic writes are never automatically
replayed. Domain changes, revision references, receipt and audit commit together.
Revision, asset-reference and receipt history are database immutable.

Publication rechecks readiness, current media rights and the exact revision.
The required `policyDigest` is a 64-character lowercase SHA-256 fingerprint from
the authorized preview. A new publication compares it with canonical facts inside
the transaction. Schedule/rule changes after preview return 409 even when the
document version is unchanged, without a pointer, receipt or audit change. Preview
returns the corresponding admin-only facts; neither these entry settings nor the
digest enter public DTOs. Identical committed retries still return the original
receipt, including after later policy changes; they never re-acknowledge policy.
Known conflicts require reconciliation and a fresh review rather than same-body
replay. Document switches clear outstanding confirmation/private-preview state.
Republishing an older saved revision is rollback with the same current checks.
Draft saves do not change publication. Minimal technical publication requires
source-language title/introduction/metadata and a contact action; it does not
establish the larger WEB-STUDIO/WEB-FESTIVAL release gates.

Copy is intentionally selective: text and the approved color pair only. Images
are visibly excluded and must be uploaded into the new document. Dates, Event
link, registration action, metadata, results, policy review and publication are
cleared. Rules require fresh publication review. No operational records are copied.
Link changes require unpublish; after first publication they also require explicit
migration-impact acknowledgement. This does not move applications or mutate Event.

## Raster ownership, rights and cleanup

| Method/path | Boundary |
| --- | --- |
| POST /content/documents/:documentId/assets | One multipart `image`; UUID `X-Content-Operation` and integer `X-Content-Version` headers, no extra fields |
| POST /content/documents/:documentId/assets/:assetId/review | `approved`, operation/version; explicit rights approval or irreversible revocation |
| POST /content/documents/:documentId/assets/:assetId/retire | Operation/version; irreversible retirement |
| GET/HEAD /content/documents/:documentId/assets/:assetId | Current admin, same owning document, normalized private bytes |
| GET/HEAD /public/assets/:assetId | Ready, approved, nonretired bytes referenced by the owner's current publication |

JPEG/PNG/WebP uploads use existing extension/MIME/signature/full-decoder checks:
one file up to 10 MiB, 16 million input pixels, metadata-free WebP at a 2048px
maximum edge. Keys are random, exclusive, contained and private under
`STORAGE_PATH/content-private`. There is no provider-key/static URL or remote import.
Asset alternative text is authored prose or explicit decorative classification.
Cross-document references/reviews/preview substitutions fail even for administrators.

An authorized staging row commits before bytes are written. Finalization then
commits readiness, version, receipt and audit. Same-operation uploads reuse the
same normalized digest/key. Interrupted staging and unattached files older than
24 hours are durable cleanup candidates. Referenced, nonrevoked history remains
private for rollback. Rights revocation/retirement atomically unpublishes a current
reference and queues deletion even if history retains reference rows.

The startup worker runs every minute, with bounded batches, leases and eight
attempts. It commits retirement before filesystem deletion; retries treat a
missing file as already deleted. `DELETE_RETRY` is a safe durable failure code;
exhausted jobs require operator investigation. Restored bytes do not restore
readiness/rights/publication. Ordinary unpublish retains bytes and history.

## Published projection and cache policy

| Method/path | Output |
| --- | --- |
| GET /public/studio?locale=et | Explicit published studio projection |
| GET /public/festivals?locale=et | Published portal plus currently published edition summaries and stable slugs |
| GET /public/festivals/:festivalSlug/editions/:editionSlug?locale=et | Published edition projection, canonical minimal Event facts and truthful action |

Public projections include explicit contact email/phone independently of the
current handoff action, so an external registration action does not hide contact.
The portal includes stable festival slug/name/resolved-summary identities and
edition start/end calendar dates plus `upcoming`, `past` or `undated` grouping.
Only configured public festival identities or those with a published edition are
included. [HTML consumers](public-pages.md) document dates, locale metadata and
live sitemap behavior; JSON and HTML share the same published-read service.

Locale accepts only one `et`, `en` or `ru` value. Missing/unpublished resources
share 404. Dependency connection failures return 503 without stale output.
Public fields are resolved `{text, lang, fallback}` values with named stable paths;
classes/profiles/timetable/images/results have bounded explicit projection fields.
The output excludes draft IDs, Event configuration/private contacts, storage keys,
rights-review details, accounts, participants, approvals and scores. Result links
retain reviewed edition label/date/language. URLs are HTTPS without credentials;
there is no stored HTML/CSS/script execution or server fetch of supplied links.

Linked Event dates/zone/venue/deadline and entry-rule fingerprints remain canonical.
Schedule/rule changes suppress rule prose and registration action until explicit
review/republish; image-only Event changes do not invalidate policy. Stage/window
availability uses the existing registration policy. Internal application handoff
fails closed until M2 external release is separately verified. External handoff
needs an explicitly reviewed interval and a contact alternative; expired/closed
availability yields contact. CMS publication never changes competition lifecycle.

Public JSON/media/misses are `Cache-Control: no-store`; private content/preview
also has `private, no-store` and `X-Robots-Tag: noindex, nofollow`. ETag generation
is disabled; conditional media requests cannot turn into reusable 304 responses.
All bytes use fixed WebP type, nosniff and safe inline disposition. Withdrawal
affects subsequent requests and cannot recall downloaded copies.

## Owning workspace

Current routes are `/content/studio`, `/content/festivals` and
`/content/editions/:editionId`, with bounded section/preview-language query state.
Existing auth/mail/application paths stay canonical. Isolated request-rendered
public entries now consume this contract; the coordinated `/app`/legacy-link
transition remains required before cohosting, owned by P9-WIX-TRANSITION.
No DNS, cookie, deployment or hosting change is included. See
[CMS validation](../CONTENT_EDITOR_VALIDATION.md) and
[public consumer validation](../PUBLIC_SITES_VALIDATION.md).
