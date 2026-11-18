# Studio and festival websites, shared CMS and Wix replacement

[Current checkpoint](../../DEVELOPMENT_PLAN.md) · [Product scope](../PRODUCT_SCOPE.md)
· [Architecture direction](../adr/026-studio-and-festival-platform.md)

## Goal and current evidence

Create Neposedõ's first studio website and replace the useful festival Wix
functionality. Studio content comes from the director, not a previous website;
Instagram/Facebook remain social channels. Only the developer and director need
content administration. This is public content management, not CRM or student
administration. See the canonical scope for audiences, exclusions and addresses.

The 2026-11-14 screenshots/user confirmation establish festival landing, ET/EN/RU
rules, registration information/link, judges by edition, historical result links
and contact/social links. Reported Wix cost: EUR 372/year, with net savings and
bundled services unverified. Inventory actual assets/URLs before migration.
P4-PUBLIC-EDITOR now implements structured CMS/publication/public JSON and raster
APIs, retaining protected event/judge/image routes. P4-STUDIO-PAGES and
P4-PUBLIC-PAGES add local HTML consumers. The coordinated `/app` integration and
opt-in loopback festival cohost are rehearsed locally; public release/cutover
gates remain open. [Contract](../api/public-pages.md) and [workspace evidence](../ENTRY_WORKSPACE_VALIDATION.md).
P4-PUBLIC-MODEL now has a [concrete design](../adr/026-studio-and-festival-platform.md#concrete-model-and-publication-design)
and a [live source inventory](../PUBLIC_CONTENT_INVENTORY.md). Archive attribution,
rights/original exports and domain ownership remain migration/release checks.

## Order and boundaries

The [checkpoint queue](../../DEVELOPMENT_PLAN.md#implementation-order) now starts
this workstream before remaining M3 UI; the prior public-after-M3 ordering is
superseded. Model → shared editor → studio pages/festival pages → Wix transition.
Studio and festival public acceptance are independent. Missing external content/
hosting access does not block the next actionable participant implementation.

Stable studio branding, configurable festival editions and consistent working
forms have different purposes. Use Hallmark and the
[redesign direction](../DESIGN_SYSTEM.md#required-full-redesign); reuse backend,
contracts and controlled identity. Do not introduce a separate CRM, broad page
builder, microservices or organizer tenancy. Preserve all existing task IDs.

## Tasks

- [x] P4-PUBLIC-MODEL (2026-11-16): [ADR-026](../adr/026-studio-and-festival-platform.md#concrete-model-and-publication-design)
  defines structured site/edition revisions, optional unique operational-event
  linkage, global-admin authority, atomic publication/audit/receipts, live policy
  projection, public DTO/raster boundaries, document links, cleanup, no-store,
  ET/EN/RU locale metadata and host/router/auth-mail transition. The
  [inventory](../PUBLIC_CONTENT_INVENTORY.md) records actual Wix routes, result
  links and image identifiers, including conflicting year links and placeholder
  contact target. S20/F12 specify the owning editor/recovery contract.
  This prerequisite was design-only; the editor task below supplies implementation.
  Original exports/rights, archive attribution and domain/provider verification
  remain P9-WIX-TRANSITION/release gates; no speculative content was approved.
- [x] P4-PUBLIC-EDITOR (2026-11-16, revalidated 2026-11-17, local): delivered one controlled CMS workspace
  with Studio website and Festivals sections; retain Competition operations and
  authorized task-specific navigation as delivered. Edit ET/EN/RU text, teacher
  profiles/classes/public timetable/joining/contact, selected media, festival
  branding/rules/judge presentation and historical documents/links. Support
  accessible branding constraints, draft/preview/explicit publish/unpublish,
  field errors, revision conflicts, acknowledged safe retries/session recovery and
  durable audit. New-edition copy creates a draft with dates/rules reviewed and
  no participants/approvals/scores/results. Public teacher/judge profiles grant no
  accounts or permissions. Prove denied ordinary-user/staff writes and no draft
  leakage through preview, cache, media URLs or direct API access.
  [Exact contract](../api/content.md) and [validation](../CONTENT_EDITOR_VALIDATION.md)
  record migration 41, immutable revisions/receipts/audit, strict public projections,
  raster rights/cleanup, canonical policy, conflicts/retries and S20/F12 ET/EN/RU
  browser/Hallmark evidence. Selective copy includes text/color; images are explicitly
  excluded and re-uploaded. Current browser paths are `/app/content/...`; the local
  base/legacy-link transition and public HTML consumers are implemented. No public launch, production migration or human approval.
  The authorized PR #6 continuation binds publishing to reviewed canonical facts,
  clears confirmation/preview state across documents, focuses private previews and
  reduces phone ledger density. Publication-audit rollback, policy changes and
  festival-copy UI are covered by the fresh validation evidence.
- [x] P4-STUDIO-PAGES (2026-11-17, local consumer): after model/editor, create public home/about, teachers,
  classes/groups/styles/ages, timetable, joining information, location/contact,
  selected media and social links. Content comes from the director; no student
  records, bookings, enquiry pipeline, billing or news/feed integration is needed.
  Link the festival portal clearly; use stable studio branding and readable text
  beyond artwork. Cover ET/EN/RU, actual-language fallback, indexable metadata,
  phone/tablet/desktop, keyboard/assistive use, loading/error/missing/unpublished
  states and public-media permission/rights review. Verify domain ownership/TLS,
  deployment/backup/rollback and human approval before WEB-STUDIO release.
  Delivered as a separate React/Node render build and opt-in loopback entry with
  published-only content, actual timetable/class links, ET/EN/RU/readable HTML,
  fallback/canonical/hreflang/live sitemap and no-script responsive navigation.
  [Evidence and limitations](../PUBLIC_SITES_VALIDATION.md) separate local delivery
  from production integration, approved material and human/hosted acceptance.
- [x] P4-PUBLIC-PAGES (2026-11-17, local consumer): after model/editor, deliver festival landing/upcoming/past
  editions, annual branding/dates/location, ET/EN/RU rules, judge presentation,
  result document/link archives, contact/social links and registration handoff.
  Public content requires no account; expose only explicit published DTOs/assets.
  Existing application/staff routes stay protected. Until M2 is released, use the
  director-approved current registration/contact method with truthful availability;
  after release, preserve edition and language through sign-in/application return.
  Test unpublished/withdrawn/private/cross-event cases, draft preview exclusion,
  cache invalidation, mobile/keyboard/assistive use and localized metadata/social
  previews. Historical documents/links need no reconstructed score records; new
  calculated results retain P7-PUBLISH gates.
  Delivered published portal/festival/edition indexes, canonical dates/venue,
  rules/judges, attributed historical links and truthful external/contact handoff.
  Current policy/rights/withdrawal checks are shared with JSON. Contact remains
  visible during an available external action. No new internal registration or
  calculated results claim. The existing S20 CMS is the owning organizer UI.
  [Public contract](../api/public-pages.md) records isolated routes and the
  local `/app` integration and external ingress gates below; no production routes were changed.
- [ ] P9-WIX-TRANSITION: after festival pages/editor pass, migrate useful content,
  judge artwork and historical result documents/links with reviewed rights and
  edition attribution. Inventory URLs and verify link/redirect coverage, domain/
  DNS ownership, TLS, metadata, storage persistence and rollback. Verify actual
  Wix-bundled services and replacement recurring costs. Rehearse hosted rollout/
  restore with P9-DEPLOY/RECOVERY, scope-appropriate CI/observability/browser and
  human ET/EN/RU/accessibility approval. Test anonymous pages/archives and the
  actual registration handoff. Keep Wix live until acceptance and obtain explicit
  authorization for domain cutover/cancellation. This does not require M3/M5;
  unfinished operational services cannot be advertised as available.
  Local integration substep completed on 2026-11-18: coordinated ADR-026 `/app`
  router/Vite/client/return/onboarding/mail mapping, bounded indefinite legacy
  redirects and opt-in loopback festival cohost. Queued token links, pre-resource
  secret stripping, explicit locale, scope/session boundaries and actual built
  same-origin assets/API were checked. [Evidence](../ENTRY_WORKSPACE_VALIDATION.md).
  External content/archive/URL inventory/ownership/hosting evidence remains a
  separate cutover prerequisite; this task and WEB-FESTIVAL remain open.

## Exit criteria and next action

PR #6 and its CMS continuation PR #7 are merged into main; public consumer work
is retained at ee0bf72. The workspace/entry slice started from that clean intended
target with no unmerged remote branch or open PR overlap. Shared CMS contracts,
migration 41 and S20 are retained. Migration 42 belongs to the entry slice; the
public renderer/base transition adds no migration. Deployment/release gates remain open.

WEB-STUDIO and WEB-FESTIVAL are distinct outcomes in the checkpoint. Both need
usable director content editing, explicit safe publishing and released-scope
privacy/locale/accessibility/hosting evidence. Festival replacement additionally
needs archive/link migration and verified cutover. A studio-site launch does not
close Wix replacement; local tests alone close neither external outcome.

Next website work: obtain and verify real exports/rights, archive attribution,
legacy public URLs, host ownership and the hosted cutover/restore plan. The local
`/app`/legacy-link cohost integration is delivered. Keep WEB-STUDIO and
WEB-FESTIVAL independently unreleased; do not republish disputed archives or the
placeholder contact without owner verification. With external transition access
unavailable and S09/S10 complete, the checkpoint's next local task is
P5-APPLICATION-ESTIMATES. Do not deploy or cancel Wix as part of local work.
