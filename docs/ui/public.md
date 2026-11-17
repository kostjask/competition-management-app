# Public studio, festival and shared content screens

Target contracts under [product scope](../PRODUCT_SCOPE.md) and
[ADR-026](../adr/026-studio-and-festival-platform.md). S20/CMS/public JSON and
isolated local S18/S19 HTML consumers are implemented; external release and
cohosted `/app` integration remain open. [Contract](../api/public-pages.md).
Inherit [UI/recovery](../UI_UX.md),
[design direction](../DESIGN_SYSTEM.md#required-full-redesign), ET/EN/RU and
accessibility requirements. Target domains are not mounted production routing.

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
  rebuilds. Target /app/content/studio, /app/content/festivals and
  /app/content/editions/:editionId under ADR-026. P4-PUBLIC-EDITOR currently mounts
  `/content/studio`, `/content/festivals`, `/content/editions/:editionId`; the
  coordinated `/app` transition remains a cohosting/release prerequisite; isolated
  public consumers preserve these current private paths.
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

### S20 composition and recovery contract

P4-PUBLIC-MODEL defines this contract; P4-PUBLIC-EDITOR implements it locally.
See [exact delivered boundaries](../api/content.md) and [validation](../CONTENT_EDITOR_VALIDATION.md).
Use Hallmark app-screen review and the operational Cobalt direction from
[DESIGN](../../DESIGN.md), not annual festival artwork on working controls.
The signature is a draft/published revision ledger beside the structured editor,
with exact revision identity and the next permitted action. No marketing hero,
stock material, invented totals or silent publication. The director/developer
audience and maintenance purpose are established by product scope.

- Studio view: ordered about, teachers, classes, timetable, joining/contact and
  selected-media sections. Native fields/disclosures keep one editing task in
  view; class/teacher references use stable IDs, never matching by name.
- Festivals view: a ruled festival/edition index with explicit draft/published
  state, edition selection and create/copy actions. Edition view separates
  editorial fields from read-only canonical event facts and links to setup/rules.
  Public biographies remain distinct from staff assignments.
- Desktop places revision/readiness alongside the form; phone/tablet stacks it
  in document order. Preserve a capped measure, tokenized color/type, instant
  visible focus, 44px hit areas and reduced motion. No color-only state.
- URL retains selected edition, section and preview language through validated
  nonsecret IDs/keys. Fields stay mounted in component state; no draft text,
  secrets or media bytes in query strings/browser persistence.
- Source language and ET/EN/RU translations are explicit. Preview all locales
  with actual-language fallback notices and HTML lang. Optional translations
  can be cleared. Interface/error/confirmation copy uses all three dictionaries;
  language choice grants no permission.

| State/action | Observable behavior |
| --- | --- |
| Loading / empty / error | Form/index-shaped loading placeholders; missing content explains one create/edit action; translated error and explicit retry without losing work |
| Edit / save | Mark unsaved work; Save announces the acknowledged draft revision; current published revision remains visible |
| Preview | Authorized saved revision only; Save first for unsaved fields; private/noindex notice and viewport/language selection; no preview capability tokens in public links |
| Publish | Exact saved revision, canonical facts, readiness and impact; disabled reasons link to fields; explicit confirmation publishes no unsaved fields |
| Unpublish / rollback / retire | Explain affected URLs/media; explicit confirmation; acknowledge receipt and refresh live state; rollback rechecks policy/rights |
| Conflict | Retain local fields beside server revision; compare/reload/manual reconciliation; no automatic overwrite or merge |
| Uncertain response | Retain operation ID/body; reconcile receipt/current version before explicit same-operation retry; superseded receipt never claims current publication |
| Session/access change | Mounted inert session recovery retains work; refresh authority; no automatic mutation replay; translated denied-access navigation |
| Copy edition | Select presentation sections; explain cleared dates/event/action/results; new draft requires review and copies no operational records |

Field errors link from one announced summary; acknowledge saves/publications in a
polite live region. Confirmations return focus to their trigger or resulting
revision. Keyboard and long ET/EN/RU labels must work at phone/tablet/desktop
widths. Implement/render these states before UI completion; this text is neither
a mockup nor visual approval.
