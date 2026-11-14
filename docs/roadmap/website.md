# Public festival website and Wix replacement

[Current checkpoint](../../DEVELOPMENT_PLAN.md) · [Domain scope](../DOMAIN.md#current-product-scope)

## Goal and current evidence

Replace fest.neposedo.ee for the single Neposedõ organizer, who runs one or two
festivals/competitions per year. On 2026-11-14 the user supplied screenshots and
confirmed that the useful Wix functionality is festival announcements, rules in
ET/EN/RU, registration information/link, judges by year, historical result links
and contact/social links. The reported annual charge is EUR 372; replacement
hosting/storage/domain costs and actual cancellable services remain to be checked.

Source inspection confirms event description translations/contact/image fields
and authenticated event/judge/image routes. Those foundations do not provide a
public publishing model or authorize exposing existing private resources.
This roadmap records planned scope, not delivered public pages or accepted schema.

## Order and boundaries

P5-ENTRIES and the remaining M3 participant path retain priority. After that path,
start P4-PUBLIC-MODEL, then P4-PUBLIC-EDITOR and P4-PUBLIC-PAGES; complete
P9-WIX-TRANSITION before retiring Wix. Phase prefixes identify owning concerns,
not a requirement to finish every task in those phases first.

Use a reusable public layout with branding per edition (logo, artwork/background,
controlled colors) and preserve previous editions. Keep working forms/navigation
consistent and accessible. A general page builder, subscriptions and additional
organizer tenancy are outside this scope. New UI work follows Hallmark and the
[required redesign direction](../DESIGN_SYSTEM.md#required-full-redesign).

## Tasks

- [ ] P4-PUBLIC-MODEL: inventory actual pages/assets/documents/links and record a
  bounded ADR before dependent implementation. Decide festival/edition identity,
  stable URLs, retained branding/content, multilingual fallback, publication
  revisions and draft/preview/publish/unpublish behavior. Reconcile public rule
  text and registration status with canonical event policy without bypassing rule
  freezes or inventing a second application lifecycle. Define explicit public
  DTOs/assets/documents and authorized editing/preview; private participant media,
  staff/account details and draft content stay private. Resolve public storage
  needs independently of P8-MEDIA's private-music prerequisite.
- [ ] P4-PUBLIC-EDITOR: after P4-PUBLIC-MODEL, provide organizer editing for
  branding, ET/EN/RU content/rules, judge presentation, contact/social links and
  historical result documents/links. Include accessible color constraints,
  draft/preview/explicit publication, revision conflicts, safe retry/recovery and
  durable audit. Copy selected presentation/content to a new edition draft with
  dates/rules reviewed; never copy participants, approvals, scores or published
  results automatically. Preserve prior editions and keep public judge profiles
  separate from permission-granting staff assignments.
- [ ] P4-PUBLIC-PAGES: consume the accepted model/editor to deliver organizer
  landing/upcoming editions, edition-specific branding/details, ET/EN/RU rules,
  truthful registration status/application handoff, judge presentation, archived
  result documents/links and contact/social links. Render key information as text,
  support mobile/keyboard/assistive use, language navigation, search indexing and
  social previews. Anonymous reads expose only explicitly published content;
  preview authorization, unpublished/withdrawn content, private files, cross-event
  substitutions and registration/session recovery need behavior/browser coverage.
  Historical documents/links do not depend on importing old scoring records;
  new calculated result publication retains Phase 7 prerequisites.
- [ ] P9-WIX-TRANSITION: after public pages/editor pass, migrate and verify
  required content, judge artwork and historical result documents/links, preserving
  attribution and authorized publication. Inventory existing URLs and plan stable
  redirects, domain/DNS ownership, TLS, search metadata, backups and rollback.
  Verify actual Wix-bundled services and replacement recurring costs before
  cancellation. Rehearse hosted rollout/rollback with P9-DEPLOY/RECOVERY and
  delivered-scope observability/browser/human ET/EN/RU/accessibility checks.
  Verify old links and new anonymous pages plus registration handoff; obtain
  explicit authorization before domain cutover or Wix cancellation and retain the
  working site until acceptance. Public hosting need not wait for M5 when its
  own dependencies pass; unfinished operational features cannot be advertised as
  available.

## Exit criteria and next action

Replacement is complete only when the organizer can prepare/publish an edition
without a developer rebuild, useful existing content and archives are retained,
anonymous/public and authenticated/private boundaries pass, registration reaches
the correct edition, and hosted transition/rollback and human review have evidence.
Automated technical checks alone do not establish visual approval or authorize
retiring Wix. Existing M1–M5 implementation/release status stays separate.

Next product task remains P5-ENTRIES. The first task for this workstream is
P4-PUBLIC-MODEL; the content inventory and publication/storage ADR are still open.
