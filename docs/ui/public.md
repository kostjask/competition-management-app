# Public studio, festival and shared content screens

Target contracts under [product scope](../PRODUCT_SCOPE.md) and
[ADR-026](../adr/026-studio-and-festival-platform.md). None of these screens or
public APIs are implemented. Inherit [UI/recovery](../UI_UX.md),
[design direction](../DESIGN_SYSTEM.md#required-full-redesign), ET/EN/RU and
accessibility requirements. Target address/path mapping is not mounted routing.

## S18 — Public studio website

- **Purpose / actor:** let prospective students/parents understand Neposedõ and
  find joining information without an account. Target neposedo.ee.
- **Content:** readable home/about, two teachers, dance styles/ages, groups/classes,
  public timetable, joining, selected reviewed media, location/contact/social links
  and clear festival navigation. Stable studio branding, separate from annual art.
- **States:** published content, actual-language fallback, missing/unpublished,
  loading/read failure where applicable and accessible navigation back to home.
- **Acceptance:** direct links, language/metadata and contact actions work on
  phone/tablet/desktop and keyboard/assistive use. No student records, login wall,
  booking/enquiry pipeline, compulsory news maintenance or live social feed.
  Flow F11; P4-STUDIO-PAGES owns implementation and WEB-STUDIO acceptance.

## S19 — Public festival portal and editions

- **Purpose / actor:** let visiting studios/spectators discover editions, inspect
  rules/judges and find registration/results. Target fest.neposedo.ee.
- **Content:** upcoming/past editions, dates/location, edition branding/artwork,
  ET/EN/RU rules, public judge presentation, approved historical documents/links,
  contact/social and studio-site navigation. Key facts exist outside artwork.
- **Action:** director-approved current registration/contact method until a
  released application workflow can accept the correct edition/language return.
  New calculated results appear only after their independent P7-PUBLISH gate.
- **States:** unpublished editions never leak; withdrawn/changed publication and
  cache behavior follow model policy; missing translations have explicit fallback;
  closed registration has truthful permitted alternatives.
- **Acceptance:** anonymous reads use public contracts/assets only; private
  participant files, account details and scoring drafts stay inaccessible. Stable
  archive links, responsive/assistive, locale/metadata and F02 handoff checks pass.
  P4-PUBLIC-PAGES owns delivery; P9-WIX-TRANSITION owns migration/cutover.

## S20 — Shared content administration

- **Purpose / actor:** developer/director maintain both sites without annual code
  rebuilds. Target workspace /app, with exact editor routes decided by model task.
- **Navigation:** Studio website, Festivals and Competition operations as delivered;
  explicit edition selection for festival content, site selection for studio
  content. Public teacher biographies create no account. Other festival users see
  only their authorized working tasks, not CMS navigation or data.
- **Content/actions:** bounded structured editors, ET/EN/RU/source-language preview,
  branding/media/documents, draft/save/preview/publish/unpublish and selective new
  edition draft copy. Show draft and published revision separately.
- **States:** loading/empty/field/server errors, unsaved work, acknowledged save,
  private preview, readiness/disabled reasons, stale revision comparison, uncertain
  response and expired-session recovery. No automatic mutation replay.
- **Acceptance:** F12 denial/concurrency/retry/audit/public-boundary checks plus
  responsive keyboard/focus and rendered Hallmark review. Protect preview/assets
  and handle replacement/unpublish caching explicitly. P4-PUBLIC-EDITOR owns scope;
  current application routes stay unchanged until a separately validated mapping.
