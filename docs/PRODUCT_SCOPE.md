# Neposedõ product scope

Agreed direction, 2026-11-16. This document owns product scope and audience
boundaries; the [checkpoint](../DEVELOPMENT_PLAN.md) owns priority/release gates,
[roadmaps](../DEVELOPMENT_PLAN.md#task-map) own tasks and
[ADR-026](adr/026-studio-and-festival-platform.md) owns the architectural direction.
Targets here do not imply implemented routes, public APIs or hosted services.

## Organization and audiences

Serve one organization, Tantsuansambel Neposedõ. Its small dance studio has two
teachers, one of whom is the director; the director also organizes one or two
festivals/competitions per year. The developer and director are the intended
administrators. Being a teacher or appearing on a public page grants no account
or administrative permission. Festival representatives, judges and moderators
retain only their authorized organization/event/task access.

The studio currently uses Instagram and Facebook and has no website to migrate.
Create its public website from scratch. Replace the existing festival Wix site,
preserving useful festival content and archives. The user's reported Wix cost is
EUR 372/year; replacement costs and cancellable bundled services remain unverified.
Onboarding other organizers or selling a hosted platform remains future scope.

## Public addresses and private workspace

| Target address | Audience and purpose | Content origin |
| --- | --- | --- |
| `neposedo.ee` | Prospective students/parents; studio identity, teachers, classes/groups, public timetable, joining information, selected media, contact/social links | New content supplied/reviewed by the director |
| `fest.neposedo.ee` | Participating studios and spectators; upcoming festivals, edition-specific rules/branding, judges, registration handoff, results and archives | Existing useful Wix material plus new edition content |
| `fest.neposedo.ee/app` | One authenticated workspace; content administration and authorized festival workflows | Existing application extended through its own tasks |

These are target information architecture, not verified domain/DNS configuration
or mounted paths. Confirm ownership, hosting, URL mapping and auth-link redirects
before implementation/cutover. Preserve existing application/auth links until a
tested migration replaces them. No separate `app` subdomain is required initially.

Two public addresses separate audiences and branding; they do not require two
independent systems. Both should link clearly to each other. Visitors need no
account to read published information. Entry, staff and scoring access is private.

## Studio public website

Initial content: home/about, the two teachers, dance styles and age groups,
classes/groups, public timetable, joining instructions, location/contact and
selected photos/videos or social links. Public timetable content is not an
attendance, booking or enrolment system. Use direct contact/social links initially;
enquiry forms and their storage/delivery are outside the baseline.

Stable studio branding should not change with each festival edition. A news/blog
section is optional deferred scope, not required for launch; social accounts can
continue carrying frequent updates. Do not require live social embeds or automatic
feed synchronization. Publication of media needs reviewed rights/consent and
accessible alternatives; social content is not automatically authorized for reuse.

## Festival portal and competition workspace

Festival editions retain their own logos, artwork, controlled color theme,
dates/location, translated rules and judge presentation. Keep previous editions
available under stable links. The edition-to-operational-event relationship and
URL details are defined by ADR-026's completed P4-PUBLIC-MODEL design; storage
and routing implementation remain P4-PUBLIC-EDITOR/public-page work.

Published registration information must reflect the canonical event policy and
link to the correct edition/application. Until the application workflow is
released, show the director-approved existing registration/contact method rather
than advertising an unfinished service. Content publication does not open event
registration, approve studios, submit entries or publish calculated results.

Historical results may remain approved documents/links and judge artwork may
remain images; reconstructing old scores/accounts is not required. New calculated
results retain Phase 7 review/publication/correction gates. A public judge profile
must not create an account, staff assignment or scoring permission.

## Shared content administration

Provide one workspace for the developer and director with Studio website,
Festivals and Competition operations sections as those features are delivered.
Use existing controlled account provisioning and backend authorization; no public
admin signup, shared password or automatic privilege from contact details.

Content management covers ET/EN/RU text, branding/media/documents, draft editing,
authorized preview and explicit publishing/unpublishing with revision/audit and
conflict/retry recovery. Reuse ADR-019's authored-language/fallback policy where
applicable; ADR-026 and the [public consumer contract](api/public-pages.md) define
implemented local locale/canonical/hreflang/sitemap behavior.
Changing drafts must not silently change published pages. Preview must remain
private and excluded from public caches/indexing. Selectively copy presentation
to a new edition draft without copying participants, approvals, scores or results.

This is a bounded CMS, not a general page builder. Use consistent working forms
and navigation; annual public branding must not compromise accessibility or make
users relearn registration/judging. Apply Hallmark to new/redesigned UI and review
ET/EN/RU, keyboard/assistive and phone/tablet/desktop behavior.

## Explicit exclusions and terminology

No CRM/contact pipeline, trial-booking workflow, student/guardian records,
enrolment, attendance, tuition billing, parent portal or studio payments are
included. Existing festival invoice details do not imply tuition administration;
later event fee requirements keep their own roadmap scope. Revisit these only
after a concrete need and explicit scope selection.

"Neposedõ studio website" describes this organization's public presence.
Existing `Studio`, `Dancer` and membership models describe festival entrants and
their authorized rosters; they are not an internal student registry. Studio-wide
entry checkpoints mean one participating studio's event submission. Organization
approval refers to the participating studio, not onboarding another organizer.

## Release outcomes

- **WEB-STUDIO:** publish the new studio site with director-approved content and
  shared editing, independently of competition completion.
- **WEB-FESTIVAL:** replace useful Wix functionality and archives with the
  festival portal, verified registration handoff and rehearsed cutover/rollback.
- **M2–M5:** preserve application, participant/media/submission, staff and live/
  judging/results workflows and their existing technical/external gates.

Public-site releases consume only their own technical and operational dependencies;
they do not require full M3/M5. Deployment, domain changes and Wix cancellation
remain separately authorized actions. Exact order and next task live only in the
[checkpoint](../DEVELOPMENT_PLAN.md#implementation-order).
