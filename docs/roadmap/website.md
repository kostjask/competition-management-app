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
Source inspection on 2026-11-16 finds event descriptions/contact/images and
protected event/judge/image routes; CMS/publication/public APIs do not exist yet.

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

- [ ] P4-PUBLIC-MODEL: inventory studio content needs and actual Wix pages/assets/
  documents/links. Extend ADR-026 with concrete models/contracts before dependent
  implementation: studio pages, teachers/classes/public timetable, festival versus
  edition versus operational event identity, stable URLs and retained content.
  Specify draft/private preview/published revisions/unpublish and caching,
  publication readiness, ET/EN/RU fallback and indexable locale metadata/URLs.
  Decide target host/path/router base, email/auth link migration, safe returns,
  exact-Origin session/CSRF and hosting/rendering/bundle boundaries without
  prematurely choosing a framework. Define public DTOs/assets/documents, controlled
  developer/director administration and provider cleanup/replacement; current
  private uploads remain private. Resolve public media independently of
  P8-MEDIA's private-music prerequisite. Public rules/status must consume canonical
  event policy without bypassing freezes or introducing another lifecycle.
- [ ] P4-PUBLIC-EDITOR: after P4-PUBLIC-MODEL, deliver one controlled CMS workspace
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
- [ ] P4-STUDIO-PAGES: after model/editor, create public home/about, teachers,
  classes/groups/styles/ages, timetable, joining information, location/contact,
  selected media and social links. Content comes from the director; no student
  records, bookings, enquiry pipeline, billing or news/feed integration is needed.
  Link the festival portal clearly; use stable studio branding and readable text
  beyond artwork. Cover ET/EN/RU, actual-language fallback, indexable metadata,
  phone/tablet/desktop, keyboard/assistive use, loading/error/missing/unpublished
  states and public-media permission/rights review. Verify domain ownership/TLS,
  deployment/backup/rollback and human approval before WEB-STUDIO release.
- [ ] P4-PUBLIC-PAGES: after model/editor, deliver festival landing/upcoming/past
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

## Exit criteria and next action

WEB-STUDIO and WEB-FESTIVAL are distinct outcomes in the checkpoint. Both need
usable director content editing, explicit safe publishing and released-scope
privacy/locale/accessibility/hosting evidence. Festival replacement additionally
needs archive/link migration and verified cutover. A studio-site launch does not
close Wix replacement; local tests alone close neither external outcome.

Next: P4-PUBLIC-MODEL. Open specifics are content inventory, edition/event mapping,
publication/media model and target URL/deployment/session design. ADR-026 records
only the accepted broad direction; implementation tasks remain unchecked.
