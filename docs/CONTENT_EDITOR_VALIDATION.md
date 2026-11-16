# Shared CMS local validation — 2026-11-16

Scope: P4-PUBLIC-EDITOR with S20/F12, following the delivered P4-PUBLIC-MODEL
design. This is local technical evidence, not a public-site launch, content-rights
approval, staging deployment or human visual/language/assistive acceptance.
[Implemented contract](api/content.md) · [Roadmap](roadmap/website.md).

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

## Evidence

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
