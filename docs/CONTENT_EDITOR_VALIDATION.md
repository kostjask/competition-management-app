# Shared CMS local validation

Scope: P4-PUBLIC-EDITOR with S20/F12, following the delivered P4-PUBLIC-MODEL
design. This is local technical evidence, not a public-site launch, content-rights
approval, staging deployment or human visual/language/assistive acceptance.
[Implemented contract](api/content.md) · [Roadmap](roadmap/website.md).

## Continuation and revalidation (2026-11-17)

The clean checkout was main/upstream origin/main at `04f3ccd`. Authorized fetch
and overlap inspection found the existing P4-PUBLIC-EDITOR implementation in
[PR #6](https://github.com/kostjask/competition-management-app/pull/6), head
`3a5777d`. The user explicitly authorized applying that implementation as
uncommitted changes. No branch/history mutation, commit, push or deployment was
performed. Final fetch confirmed the same target and PR head, no divergence and
no additional overlapping PR. The original PR's hosted checks passed; those
checks do not validate the subsequent uncommitted fixes.

The continuation fixes two reproduced publication defects. Switching documents
previously retained an old publication confirmation. A linked Event could also
change after preview without changing the CMS document version; the previous
publish request acknowledged the unseen facts. The browser regression observed
the retained confirmation, and the PostgreSQL regression observed HTTP 200 where
409 was required, before the fixes.

Private preview now returns the current admin-only canonical facts and a policy
fingerprint. Publication requires that exact fingerprint and rejects changed
facts atomically. Document switches discard stale review/confirmation state;
late preview responses cannot populate a different document. Known conflicts
require reconciliation and new review. Committed retries retain their original
receipt without renewing policy review. A contact phone must contain usable
digits. No public DTO exposes the fingerprint or private entry settings.

| Fresh check | Observed result |
| --- | --- |
| Focused contracts | 4 passed, including required/invalid policy fingerprints and invalid phone-only contacts |
| Full workspace | Build, typecheck including API seed/browser tests, lint without warnings, and tests passed: 125 API, 28 web, 3 tooling plus i18n source checks |
| Full PostgreSQL baseline | Passed in 230.70s, including all migrations, seed preservation/refusal, auth/scope/entry workflows and CMS/cleanup |
| Final focused CMS/cleanup | Passed in 24.45s after final API refinements; includes cross-document publish denial, explicit publication-audit rollback, stale policy rejection without receipt/audit/pointer changes, fresh review and superseded committed retry |
| Migration regression | Passed fresh history, existing-data upgrade, SQL-only guards and exact schema parity |
| Prisma | Validate and generate passed; inherited format failure corrected, then format check and generation passed |
| Final CMS browser | 23 passed in 59.0s; ET/EN/RU at 320/390/768/1440, capped 1920, recovery/conflicts, document switching, delayed preview, selected edition copy, read-only/current canonical facts and preview focus/return |
| Hallmark | Static sweep: 0 FAIL, 0 REFLEX, 0 WARN. Fresh-context finish review: two Finish findings; phone ledger spacing/receipt grouping and preview discovery/focus both resolved and recaptured |
| Documentation/diff | UTF-8/local links/anchors/fences/whitespace checks and final diff check passed |

The final CMS browser checks were rerun, rather than the original 276-test full
browser suite below. Playwright captures the real React app with synthetic HTTP
fixtures; database tests separately exercise actual API/PostgreSQL behavior.
The Hallmark `--render` invocation again completed the static tier only (no HTML
target and no separate Puppeteer installation); its render-lint tier is not
claimed. Fresh Playwright captures and the independent finish review provide the
rendered evidence. No imagery/material slots were introduced; the director still
supplies approved prose/media/rights. Human fluent-language, assistive/visual and
hosted release gates remain open.

All database work used the checked-in PostgreSQL 16 Compose service and random
disposable fixture databases. No application database, application environment
file, credentials, DNS, cookies, public host mapping or Wix service was changed.
The checkpoint and owning roadmap now record P4-STUDIO-PAGES/S18 as next; public
HTML, `/app` routing and identity-link migration remain consumer tasks.

### Git publication follow-up

After this validation, the user authorized merging PR #6, then explicitly
requested creating and merging a PR for the remaining local fixes. PR #6 merged
at `213b37a`. Branch `fix/cms-reviewed-publication` is based on that merged main;
the exact staged tree was preserved, so the follow-up contains only the review,
recovery, UI/test and documentation changes above. Its parent has the same file
contents as the original CMS PR head, avoiding a duplicate implementation or
schema/migration change. No source edits or tests were discarded. Git publication
does not authorize a deployment or application-database migration.

## Delivered behavior and decisions

- Structured Studio website, Festival portal and per-edition documents, immutable
  revisions/references/operation receipts, optional unique restrictive Event link,
  forward migration 41 and database invariants. No existing migration was rewritten.
- Current active/verified global-admin authority is required for every CMS read,
  preview and write, including retries. Strict shared schemas validate local
  references, authored ET/EN/RU, dates/times/zones, payload bounds and HTTPS links.
  Profiles create no accounts/permissions. Entrant and operational records stay separate.
- Draft saves leave publication unchanged. Exact saved-revision publication,
  unpublish, older-revision republish, readiness, durable audit and receipts are
  transactional. Conflicts preserve local text and compare current server data;
  uncertain/session recovery requires reconciliation and explicit retry.
- Public JSON is an allowlisted projection, with actual-language fallback,
  canonical Event facts and live availability. Changed schedule/rules suppress
  stale rule prose/actions. Internal registration remains disabled. Reviewed
  historical document/video/social links use HTTPS; no PDF upload or remote import.
- Private normalized rasters have document ownership, explicit rights and
  current-publication gating for GET/HEAD. Replaced/unpublished/revoked bytes cannot
  be fetched anonymously. Durable staging and cleanup recover from crashes,
  deletion failure and expired leases; restoring bytes never restores publication.
- Cobalt structured editor/edition index, URL-selected section/language, revision
  ledger, private preview, confirmations, field errors and mounted session recovery.
  Selective edition copy includes text/color only; images must be uploaded again.
  Dates, event/action/results/publication and operational records are excluded.
- Current routes remain `/content/...`; `/app`, public HTML/SEO composition,
  DNS/cookie/hosting changes and Wix migration are later scoped work.

## Original implementation evidence (2026-11-16)

The working tree started clean at `9ab5fec`. Intended target is `origin/main`.
Initial authorized fetch found target `04f3ccd`: one unique commit on each side,
but identical tracked contents. Open-PR inspection returned no open PRs. No branch,
history, commit, push or deployment mutation was performed.
The final authorized fetch/PR inspection confirmed the same target/content and
no overlapping PR. Ancestry remains 1/1; it was not rewritten.

Implementation owners: [shared contracts](../packages/schemas/src/cms.schema.ts),
[database](../apps/api/prisma/schema.prisma), [content service](../apps/api/src/services/content.ts),
[CMS controller](../apps/api/src/controllers/ContentController.ts),
[asset controller](../apps/api/src/controllers/ContentAssetsController.ts),
[cleanup](../apps/api/src/services/contentStorage.ts),
[client](../apps/web/src/api/content.ts), [editor](../apps/web/src/pages/content/ContentPage.tsx)
and [ET/EN/RU catalogue](../apps/web/src/i18n/contentTranslations.ts).
The migration is additive and forward-only: existing operational rows/history
are not converted or removed. Rollback does not authorize dropping retained CMS
history or restoring rights/publication. No retained environment was migrated.

| Check | Observed result |
| --- | --- |
| Focused CMS contracts | Passed branding contrast, strict/unsafe/unknown data, source locale, local identity/reference, timetable/date/zone, exact publish review and safe-return cases |
| CMS HTTP/PostgreSQL fixture | Passed ordinary/scoped/staff denials, receipts/changed retries/two-admin races, draft/public isolation, fallback, private preview, immutable history, atomic audit rollback, raster rights/cross-document ownership, copy exclusions and canonical policy/withdrawal |
| Cleanup fixture | Passed crash staging, retained references, rights retirement, deletion failure/retry, lease expiry and restored-byte withdrawal |
| Full isolated baseline | Final run passed in 232.38s: fresh/redeployed migrations, seed idempotency/production refusal and existing auth/staff/registration/entry/API checks plus CMS/cleanup |
| Migration regression | Passed fresh history, existing-data upgrade, exact schema parity and SQL-only guards in a random disposable Compose database |
| Workspace tests | `pnpm test` passed: 124 API, 28 web, 3 tooling tests plus the i18n source gate |
| Browser | Full regression: 276 passed (16.4m). Final CMS suite: 19 passed (56.4s), including ET/EN/RU at 320/390/768/1440, capped 1920 layout, confirmation/focus, concurrent/lost/session recovery, collection identity, denied access, field-error keyboard order and explicit first creation. Final localized page-title/first-creation check also passed |
| Prisma | `format --check`, `db:validate` and `db:generate` passed |
| Typecheck/lint/build | `pnpm typecheck`, `pnpm lint`, `pnpm build` passed, including browser-test TypeScript and API seed |
| Final CMS boundary refinement | Focused contracts and disposable CMS/cleanup rerun passed in 27.92s, including superseded upload receipt after revocation and the trailing-slash document-kind regression |
| Documentation/diff | Markdown UTF-8/local links/anchors/fences/whitespace and `git diff --check` passed |
| Hallmark static | Clean: 0 FAIL, 0 REFLEX, 0 WARN for the CMS app screen |

One concurrent final focused-baseline attempt timed out waiting for API startup;
migration/seed also slowed substantially while the full browser suite ran. It
did not reach CMS assertions. Serial focused reruns and the final full baseline
subsequently passed. A separate failing initialization regression exposed Prisma's
default-ID behavior with overlapping nullable composite relations; explicit
server UUID generation fixed it and the HTTP regression passed. A browser-test
helper using a newer Promise library API was replaced to match the repository's
TypeScript library target. No implementation/test blocker remains.

## Rendered review and remaining release gates

Playwright captures rendered UI states using synthetic fixtures and the actual
React application. In-thread Hallmark finish review found excessive repeated IDs
on phones and unstructured canonical facts; UUID/impact disclosures and localized
read-only facts/owning-editor links resolved those findings. A time-range dash
found by the mechanical sweep was replaced. No stock material or image slots
were introduced. Actual media, prose and rights approvals come from the director.

The Hallmark `--render` invocation ran its static tier; its separate Puppeteer
render tier was not run (no HTML/URL target in the static invocation and no local
Puppeteer dependency). Playwright screenshots and in-thread review provide the
rendered evidence; this report does not claim a Puppeteer render-lint pass.

All database tests use verified random `dance_baseline_*` / `dance_migrations_*`
Compose fixtures, not application credentials or an application-database reset.
The application database has not been migrated/inspected in this slice; deploy the
forward migration through the verified-target workflow before running this code
against a retained environment. No hosted migration or deployment is inferred.

Public-page composition, source-language SEO/metadata routes, legacy `/app`
identity-link migration, domain/TLS, hosted CI/ingress, backup/restore, approved
content/media/archive attribution and human ET/EN/RU/assistive/visual review remain
their own consumer/release gates. WEB-STUDIO, WEB-FESTIVAL and M1–M5 remain open.
Next after technical acceptance: P4-STUDIO-PAGES with S18, consuming these APIs.
