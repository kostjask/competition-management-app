# ADR-026: One organization, two public sites and shared administration

Accepted direction, 2026-11-16, from the user's scope clarification and request
to refactor the plan accordingly. Implementation is not delivered by this ADR.
[Product scope](../PRODUCT_SCOPE.md) owns the feature/audience boundaries;
[website roadmap](../roadmap/website.md) owns implementation gates.

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
or route is implemented or ownership verified by this decision. P4-PUBLIC-MODEL
must settle host/path mapping, SPA/router base, safe returns, email links,
redirects, exact-origin session/CSRF configuration and deployment topology before
changing routes. Keep current auth/application paths valid until then. Anonymous
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
preview/auth boundaries and content delivery still need explicit checks. Frontend
bundle/rendering/deployment separation must be chosen on search/readability,
availability and maintenance evidence in P4-PUBLIC-MODEL; this ADR does not mandate
a framework, new package, microservices or physical repository reorganization.

Later expansion can revisit organizer isolation and studio operations through a
new decision. Do not add tenancy abstractions, subscriptions or student data now.
