# ADR-026: One organization, two public sites and shared administration

Accepted direction and P4-PUBLIC-MODEL design, 2026-11-16, from the user's scope
clarification and the checkpoint's selected design task. This closes the design
prerequisite; migrations, executable contracts, CMS and public pages are not
delivered by this ADR.
[Product scope](../PRODUCT_SCOPE.md) owns the feature/audience boundaries;
[website roadmap](../roadmap/website.md) owns implementation gates.

Implementation note (2026-11-16): P4-PUBLIC-EDITOR now implements the structured
model, controlled CMS and published JSON/raster boundary. [Current contracts](../api/content.md)
record explicit singleton initialization, existing `/content` workspace paths,
server-generated identities and selective text/color copy (images are excluded
and re-uploaded into the new document). The design text below remains the decision
record; public HTML/SEO, `/app` identity-link transition, hosts and Wix migration
are consumer/release work, not implied implementation. [Validation](../CONTENT_EDITOR_VALIDATION.md).

## Context

The existing monorepo primarily implements festival application and entry
workflows. Neposedõ also needs a new public dance studio website; its present
studio presence is Instagram/Facebook. The festival Wix site needs replacement
and annual edition branding without recurring developer rebuilds. The developer
and director administer content/operations. Student administration and CRM are
explicitly outside current scope; additional organizers remain a future option.

## Decision

Keep one repository, the existing backend and shared contracts. Organize public
content/publishing, festival registration/entries and competition operations as
clear modules with deliberate interfaces. Retain the existing database initially;
new public content models require their own design/migrations. Do not repurpose
event-owned entrant `Studio`/`Dancer` rows as a studio CMS or student registry.

Target separate public experiences at `neposedo.ee` and `fest.neposedo.ee`, plus
one private workspace, initially targeted at `fest.neposedo.ee/app`. No hostname
or route is implemented or ownership verified by this decision. The mapping below
governs later implementation and its route-transition checks. Keep current auth/
application paths valid until that transition. Anonymous
studio visitors need no shared cross-subdomain login; avoid broadly scoped cookies
solely because the two sites share branding/administration.

Provide a structured CMS for studio content and festival editions. Separate
drafts, private previews and explicit public revisions; publication is independent
of event lifecycle/approval/submission and score/result publication. Public DTOs
and assets must be allowlisted; never expose authenticated event or image routes
by removing their middleware. Preserve privacy and history under existing ADRs.

Use stable studio branding, configurable festival-edition presentation and a
consistent operational workspace. Public-site releases are independent of M3/M5
when their own dependencies pass. Keep historical result documents/links without
inventing scoring records. Real registration and calculated result links require
their respective released workflows.

## Alternatives and consequences

A single public navigation tree would couple two audiences and branding needs;
separate public addresses preserve the existing festival address and a clear studio
identity. Fully independent products/services would duplicate accounts, editing
and operations for a two-person administration team. A broad CRM/student system
would introduce unrelated workflows. These alternatives are not current scope.

One backend keeps maintenance proportional to current scale, but public traffic,
preview/auth boundaries and content delivery still need explicit checks. The
design below settles publication, routing and rendering/bundle boundaries without
mandating a new framework, package, microservice or repository reorganization.

Later expansion can revisit organizer isolation and studio operations through a
new decision. Do not add tenancy abstractions, subscriptions or student data now.

## Concrete model and publication design

### Evidence and alternatives

[Inventory](../PUBLIC_CONTENT_INVENTORY.md) records reachable Wix routes, result
destinations, artwork identifiers and unresolved attribution. Studio content is
new. The Wix 2026 results heading reuses 2025-labelled links; older years also
reuse one destination. Do not import those associations blindly. Rights, original
exports and domain ownership remain release gates; draft CMS development needs
no Wix credentials.

The current [Prisma model](../../apps/api/prisma/schema.prisma) has operational
Event/Judge/Studio/Dancer records, not publication records.
[Resource mounts](../../apps/api/src/routes/api.ts) authenticate event/judge/image
reads. EventSchema includes operational contacts/configuration; image storage
serves authenticated live references. Reuse
[authored content](../../packages/schemas/src/content.schema.ts),
[registration policy](../../apps/api/src/services/registrationPolicy.ts),
[safe returns](../../packages/schemas/src/return-path.ts) and
[email links](../../apps/api/src/services/emailTemplates.ts) as maintained policy
owners, not anonymous APIs. No protected DTO becomes a public response.

Choose normalized identities, one structured revision document per publication
unit, explicit asset references and minimal live operational facts. Per-field
relational translations would duplicate ADR-019. A free-form page builder is
outside scope. Event-as-edition would require fake operational events for archives;
a separate CMS service would duplicate identity and publication transactions.

### Records and integrity

Names below define future storage; P4-PUBLIC-EDITOR adds strict shared Zod
contracts, forward migrations and integration tests together. This design creates
no tables/data and rewrites no migration. New content identities use random UUIDs;
existing event IDs remain unchanged. All records have appropriate created/updated
actor/time fields; immutable revisions retain creator/time rather than updates.

| Record | Fields and database invariants |
| --- | --- |
| Festival | UUID, unique stable ASCII slug, archivedAt. Recurring identity, initially Dance Express; no organizer tenancy or annual rules. |
| FestivalEdition | UUID, festivalId, stable edition slug unique within festival, nullable unique eventId FK, archivedAt. Edition has zero or one Event; an Event belongs to at most one edition. Historical editions require no Event. Slugs allow two editions in one year. |
| ContentDocument | UUID, kind STUDIO_SITE / FESTIVAL_PORTAL / FESTIVAL_EDITION, nullable unique editionId, draftRevisionId, nullable publishedRevisionId, positive version. Exactly one singleton of each site kind; edition kind requires editionId and others forbid it. Enforce with CHECK and partial unique indexes. |
| ContentRevision | UUID, documentId, sequential number unique per document, schemaVersion, strict kind-specific JSON payload, creator/time. Immutable. Composite FKs require draft/published pointers to reference revisions of the same document. |
| ContentRevisionAsset | revisionId, assetId, structured field path; unique tuple, restrictive FKs. Derive from parsed content; never accept a separate client reference list. |
| PublicAsset | UUID, owning documentId, immutable server-generated key, detected type, digest, size, dimensions, validation/rights states and reviewer/time. Public availability derives from a live publication reference, never a public toggle. |
| ContentOperation | Unique UUID operationId, actorId, documentId, kind, normalized request digest, committed version/revision and receipt time. Atomic receipt/domain/audit writes. |
| ContentAssetCleanup | UUID, assetId/key, dueAt, lease/attempt state and safe failure code; unique pending job per key. Durable idempotent cleanup, independent of private music. |

Bound revision/version integers; index edition/event lookups, revision history,
live asset references and cleanup due jobs. Enforce revision immutability with
database update/delete protection as well as service policy. Use Restrict for
revision, asset, actor and event relations rather than cascades erasing history.
Circular document/revision creation uses a nullable draft pointer inside the creation transaction;
no draftless document is exposed. Pointer kind/schemaVersion is server-validated.
Archive requires prior unpublish; archiving a Festival requires all its editions
unpublished. Past dates do not archive content automatically.

Freeze festival/edition slugs and linked event identity after first publication.
Earlier linking is explicit, versioned and audited: target Event must exist and
be unused by another edition. Later corrections require unpublish, explicit
relink/URL-migration review and republish, never moving applications. Reserve old
published paths for reviewed redirects; do not reassign them. Event deletion is
restricted by the edition FK and cannot silently delete an archive.

### Structured content

Each aggregate publishes atomically: one studio-site document, one portal document
and one per edition. Studio teacher/class/timetable references therefore cannot
mix revisions. Portal listings derive from live published editions and active
festival identities, not an independently editable list of edition copies.

| Kind | Allowed payload |
| --- | --- |
| STUDIO_SITE | Name, introduction/about; ordered teachers with local UUID/name/biography/portrait; classes with local UUID/title/style/age description/teacher references/joining text; weekly timetable slots with class reference, weekday, local start/end, IANA zone, location and validity calendar dates; joining/contact/social links and selected raster media. No student lists or enrolment. |
| FESTIVAL_PORTAL | Organization/public contact, introduction, festival summaries keyed by Festival UUID, cross-site links and stable branding. Edition presence derives from publication. |
| FESTIVAL_EDITION | Title/display label, introduction, dates/location when unlinked, bounded brand tokens/artwork, ordered named rule sections, public judge profiles/artwork, registration handoff, reviewed historical result links and explicit public contacts. Public profiles have no User/Judge FK or permission semantics. |

Named prose reuses AuthoredContentSchema. Rules are ordered stable local section
IDs with authored headings and paragraphs/list items. Render escaped text, never
stored HTML, scripts, templates, arbitrary CSS or Markdown HTML. Names stay
authored identity values. Validate local references within the revision, dates,
time ranges, URL protocols and bounded field/array/payload sizes at the backend.
Never derive a profile identity/account from contact email.

Each document declares primaryLocale (et/en/ru); its title, introduction and
metadata have that source language. Other profile/section prose can declare its
own source under ADR-019. This gives an explicit canonical source route rather
than inferring it from browser language or the first translated field.

Branding selects allowlisted semantic tokens, a bounded accent and approved
raster art; no uploaded fonts or working-form CSS. Check allowed text/control
color pairs for contrast server-side. Images require approved rights and authored
alt text or explicit decorative classification. Essential dates/names/rules/actions
also exist as readable text. Preserve the
[design system](../DESIGN_SYSTEM.md#required-full-redesign) and operational
[Cobalt direction](../../DESIGN.md); public composition/visual approval remains
with the public-page tasks.

### Publishing, authority and recovery

Only current active/verified **global admin** (admin role with null event scope)
may read CMS draft/history/preview or write. Reuse controlled developer/director
provisioning; no new administrator signup/role-assignment UI. Event-scoped admin,
judge, moderator, representative and public teacher/judge presentation grant no
CMS authority. Recheck account/session version and role in each write transaction.

Drafts may omit publication-required values, but cannot contain invalid types,
references, oversized fields or unsafe URLs. Publish requires exact saved
revision/current document version and fresh readiness: source-language title/
introduction, usable joining/contact action, valid included sections/links,
approved ready assets/alternatives, accessible branding and reviewed edition
attribution. Empty sections disappear from navigation. WEB-STUDIO additionally
requires the agreed about/teachers/classes/timetable/joining/contact scope; a
smaller technical publication cannot close that release. Optional translations
produce labelled fallback warnings, not fabricated translations.

In a serializable transaction: authorize, validate version/references/readiness,
change pointers, append durable audit and write receipt. Publish never saves
unsaved fields. Draft saves leave publication unchanged. Unpublish clears the
published pointer and retains revisions. Rollback republishes a selected previous
revision as a new audited operation after current rights/policy/readiness checks;
it cannot revive revoked media or open a closed event window.

All writes carry operationId and expectedVersion; publish names revisionId.
Changed actor/target/kind/body under an existing operationId returns 409. An
identical committed retry returns the original receipt after current authority
checks, even if superseded; identify its version and fetch current state
separately. A lost write with no receipt may be explicitly retried with the same
ID. Two edits of one version cannot both win. Serialization failures use the
existing conflict envelope; never automatically retry a semantic publication.
Keep receipts for the retained document lifetime.

UI compares retained local work with current server content, without automatic
language/section merges. On 401 use mounted session recovery, refresh authority,
reconcile the operation and offer explicit retry. No drafts, credentials or preview
tokens in URLs/localStorage. Audit draft/publish/unpublish/copy/link/asset review/
retirement with operation/document/revision IDs; extend the database allowlist.
Never log prose, private file bytes or contact/rights notes in audit metadata.

Copy selected presentation into a fresh edition identity and draft. Revalidate
and re-own selected raster bytes; no cross-document ownership sharing. Clear
event link, dates, rule-review fingerprints, registration action, result links
and publication pointer; mark copied rule prose for review. Do not copy
participants, approvals, staff/accounts, scores or published results.

### Canonical operational facts

For linked editions, Event owns dates/zone/location/registration window and entry
configuration owns checkpoint deadlines/eligibility/nomination limits. Display
these read-only in CMS with links to existing setup/rules editors. No CMS field
overrides them or invokes stage, approval, entry or result mutations. Unlinked
editions author presentation dates/location but cannot offer internal application.

At publish record a server-computed fingerprint of relevant schedule/entry-rule
fields and the admin's prose-review acknowledgement. Public reads always resolve
current minimal operational facts/availability through existing policy helpers.
Stage/window changes affect availability immediately; stage is not a publication
lifecycle. If schedule/rules change after review, suppress affected rule prose
and the application action with a translated update notice until explicit review/
republish. Do not show contradictory copied policy. Fingerprint relevant fields,
not broad Event revision (also changed by image replacement). This live projection
is an explicit exception to immutable editorial output; draft CMS edits still
cannot change public text.

Registration handoff is a strict union: contact, reviewed external HTTPS link,
or internal linked-event application. Until external M2 release is verified,
only director-approved contact/external handoff is eligible; enabling internal
handoff fails closed by default. Internal availability consumes
assertApplicationWindow (currently PRE_REGISTRATION or REGISTRATION_OPEN before
deadline); the application endpoint always rechecks window/authority/approvals.
External links require a reviewed availability interval and contact alternative;
an expired link never yields an "open" label. CMS creates no second event lifecycle.

Historical results are reviewed links with edition/date/title/language, never
reconstructed Score rows. New calculated results must consume the future
independently published P7 result identity; no arbitrary CMS score payload.

### Assets, documents, caching and cleanup

Use a distinct document-owned namespace outside static webroots. Reuse local
provider primitives and existing raster decoder/limits: one JPEG/PNG/WebP, 10 MiB,
matching extension/MIME/signature, full decode, 16-megapixel input bound and
metadata-free bounded WebP output. Authorize before processing and recheck before
attaching. Use exclusive random keys/containment checks. Never make private
uploads public by altering URLs/middleware. No arbitrary remote URL fetch/import.

Initial documents are reviewed external HTTPS links, including historical PDFs.
P9-WIX-TRANSITION owns necessary Wix file imports: rights/edition review, size/
type/structural validation and safe attachment delivery must pass before enabling
first-party PDF support. Until then retain the source host and do not cancel Wix.
The CMS document-link use case needs no premature PDF parser/provider dependency.
Video is a reviewed external link, not an upload pipeline or live social embed.

GET/HEAD asset reads check owner, current published reference, validation state
and non-revoked rights before serving normalized bytes with nosniff and fixed
safe type/disposition. Guessing a UUID, old revision URL or provider key grants
nothing. Preview asset reads require current global-admin authority. Public DTOs
contain no storage paths or rights-review notes. A cross-document attachment is
rejected even if the caller administers both documents; copy creates a new asset.

Initially public HTML/JSON/media, content-dependent redirects and misses all use
Cache-Control: no-store. No CDN/stale-while-revalidate/service-worker cache,
conditional 304 reuse or public object-store URLs. Preview also uses private,
no-store and X-Robots-Tag: noindex, nofollow; bypass shared caches. Replacement,
unpublish and revocation take effect on subsequent requests; downloaded copies
cannot be recalled. Positive caching needs a later tested purge/withdrawal decision.

Replacement creates new bytes/revision; old published assets stay until publication
switches. Retained revisions keep private media for rollback. Explicit retirement/
rights revocation blocks reads/publication/rollback and atomically unpublishes
the owning document if currently referenced, with an affected-page confirmation.
Retain reference rows as history, mark the asset unavailable and enqueue byte
deletion even when historical revisions refer to it. Never auto-republish restored
backup media.
Unattached files older than 24 hours are cleanup candidates. Worker rechecks
references/rights/lease before idempotent deletion, with bounded retries/durable
failure state. Failed writes attempt compensation; durable sweeps handle crashes.
Ordinary unpublish retains history, not a physical-deletion promise. Backup and
rights-removal procedures retain their privacy/restore review gates.

### Planned API contracts

Paths below are relative to /api/v1 and **not mounted**. P4-PUBLIC-EDITOR implements
strict shared schemas, controllers and clients together; no private-route aliases.

| Method/path | Contract |
| --- | --- |
| GET /public/studio?locale=et | Published studio document |
| GET /public/festivals?locale=et | Published portal and live published edition summaries |
| GET /public/festivals/:festivalSlug/editions/:editionSlug?locale=et | Published edition and minimal canonical facts/availability |
| GET /public/assets/:assetId | Live-reference/rights-gated normalized bytes |
| GET /content/documents and /content/documents/:documentId | Global-admin index/detail with draft/public pointers/version |
| POST /content/festivals | Idempotent stable Festival identity creation owned/audited through the portal document; no publication |
| POST /content/editions | Idempotent new identity or selective presentation copy, always unpublished |
| POST /content/editions/:editionId/link | Explicit versioned Event association before publication or after unpublish |
| POST /content/documents/:documentId/revisions | Draft payload, expectedVersion, operationId; receipt/revision ID |
| GET /content/documents/:documentId/revisions | Authorized immutable history with bounded cursor pagination |
| GET /content/documents/:documentId/preview?revisionId=...&locale=et | Authorized saved revision projected like public output; preview/readiness metadata outside public DTO |
| POST /content/documents/:documentId/publish or /unpublish | Exact revisionId for publish, expectedVersion, operationId; atomic receipt |
| GET /content/documents/:documentId/operations/:operationId | Current authorized actor's receipt for uncertain-response reconciliation |
| POST /content/documents/:documentId/assets | One protected raster; validated operationId/expectedVersion headers, no extra multipart fields |
| POST /content/documents/:documentId/assets/:assetId/review or /retire | Versioned rights decision, live-reference checks/audit |
| GET /content/documents/:documentId/assets/:assetId | Authorized private preview bytes |

Public DTOs allow only document kind, publication revision/time, requested locale,
resolved fields with actual lang/fallback, public text/explicit business contacts,
public asset IDs/URLs/dimensions/alt, stable slugs, approved result links and minimal
availability/action union. No Prisma spread, operational EventSchema reuse,
arbitrary JSON passthrough, draft IDs, account/participant/billing/audit data or
staff/private contacts. Validate locale et/en/ru and reject malformed/repeated
parameters. Missing/unpublished resources share 404; unavailable dependencies
yield 503 without stale content. Validate HTTPS links without credentials;
generate mailto/tel from separately validated public fields. Reject active/file
URL schemes; never server-fetch supplied links. New-window links use
noopener/noreferrer.

### Hosts, rendering and locale routes

Keep one backend/database. Festival same-origin ingress serves /api/v1 and
protected /uploads; studio ingress serves only public routes/assets and anonymous
/api/v1/public reads, never private/auth APIs. Use configured exact hosts/origins,
not arbitrary Host/X-Forwarded-Host for generated links. Ownership/TLS and the
observed www festival alias remain cutover verification gates.

Public pages must return readable request-rendered HTML/navigation/locale metadata
without JavaScript. Reuse React/Vite/Node capabilities via a separate public
render build entry; concrete build wiring belongs to the consumer task, with no
framework migration required. Private SPA keeps its separate asset manifest/base.
Public bundles cannot import authenticated shell/client or private configuration.
Avoid static-only content exports, which would need a second deployment transaction
to unpublish. Render through the same published-read service as public JSON, with
safe escaping and no user-selected fetch origin. Read failures show unavailable,
not cached drafts. This chooses rendering/bundle boundaries, not a new framework.

| Surface | Target paths |
| --- | --- |
| Studio | /et, /en, /ru; shared ASCII suffixes /about, /teachers, /classes, /timetable, /join, /contact |
| Festival | /:locale; /:locale/festivals/:festivalSlug and /:locale/festivals/:festivalSlug/:editionSlug with /rules, /judges, /registration, /results |
| CMS | /app/content/studio, /app/content/festivals, /app/content/editions/:editionId; private preview in the document view |
| Existing workspace | Current paths under /app, e.g. /app/events/:id/register, /app/admin/events/:id/setup, /app/auth/login, /app/verify-email |

Bare public / redirects to /et without geolocation/account inference. Explicit
locale links control public language, not account preferences. Unknown locale/
route returns 404; slugs do not change with language. Reuse ADR-019 resolution,
actual lang and labelled fallback. Fully fallback pages canonicalize to the
authored source-language route and get no duplicate hreflang entry. Genuine
authored language variants get self-canonical/reciprocal hreflang. A variant is
complete when all included non-identity prose/metadata has that source or an
explicit translation; no guessed language or automatic translation. Mixed pages
keep the requested shell language and mark each fallback block's lang; include
only reviewed authored variants in sitemap/hreflang. Search/social text follows
the same actual-language rule. Sitemap contains only live publications; preview
never appears. Handoff retains selected language/edition without personal data.

### Workspace and identity-link migration

The /app transition must ship router basename, Vite base/assets, API client,
safe-return schema, onboarding intended-event generation and mail templates
together. WEB_ORIGIN remains the festival HTTPS origin without a path; a central
link builder adds /app. Explicit legacy workspace/auth/verify/invitation/recovery
redirects preserve only supported lang/token/return parameters. Redact token
queries from logs; strip link secrets before resources/rendering as current flows
require. Retain legacy redirects indefinitely unless explicitly reviewed for
retirement; old operational paths cannot resolve to public content/SPA fallback.
Older queued mail must land safely; do not rewrite tokens or resend mail merely
because paths moved.

Generate internal application return paths from validated linked Event IDs.
Extend the current implemented-route allowlist with canonical /app paths, never
arbitrary absolute URLs or a broad /app prefix. Canonicalize allowed legacy paths
once; reject encoded separators/scheme-relative destinations/unsupported queries.
Validate lang separately. Preserve the existing specifically allowed studio-filter
queries, not general query forwarding. ADR-016's prose says no queries generally;
the current schema deliberately allows these bounded studio selections, which
this migration must retain.

Keep host-only HttpOnly, production Secure, SameSite=Lax cookies with Path=/ on
festival origin. /api access requires Path=/; no Domain=.neposedo.ee or /app-only
cookie. Only the exact workspace origin gets credentialed CMS/auth access; retain
X-CSRF-Protection: 1 on unsafe cookie requests. Studio reads omit credentials and
get no credentialed CORS privilege. Retain exact local development origins/current
proxy trust; hosted proxy review precedes trust expansion. Apply public HTML
security headers and credential-safe referrer policy; do not share auth-sensitive
caches. Do not change env defaults or production routing in this design task.

### Delivery and evidence

P4-PUBLIC-MODEL closes this design/inventory prerequisite only. Next is
P4-PUBLIC-EDITOR with S20/F12: migrations/contracts, controlled CMS, normalized
rasters/document links, private preview, explicit publication/recovery/audit and
published-read services. Use Hallmark's app-screen workflow with Cobalt, ET/EN/RU
and [S20 states](../ui/public.md#s20--shared-content-administration). Public visual
composition remains P4-STUDIO-PAGES/P4-PUBLIC-PAGES; a design contract is not an
implemented screen or human visual approval.

Required implementation evidence includes ordinary/staff/event-admin denials,
cross-document revision/media substitution, event association checks, duplicate/
changed retries, two-admin conflicts, atomic audit rollback, copy exclusions,
policy-change suppression, fallback/metadata, preview and guessed/superseded/
unpublished/revoked media (including HEAD), cleanup crash/retry/restore and legacy
mail/auth/returns when routes transition. Browser/Hallmark checks cover actual
CMS states and phone/tablet/desktop keyboard/focus. Human fluent/assistive and
hosted checks remain release gates.
[Testing](../TESTING.md#public-websites-and-shared-cms-acceptance) owns commands;
no runtime or release success is inferred from this ADR.
