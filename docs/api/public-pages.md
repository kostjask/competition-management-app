# Public HTML consumers

P4-STUDIO-PAGES/S18/F11 and P4-PUBLIC-PAGES/S19/F02 deliver local public
consumers of the [published CMS contract](content.md). They use the same
serializable published-read service as JSON; no HTML draft/preview endpoint or
browser authenticated client is involved. `@dance/public-site` is a separate
React server-render build with a bundled local stylesheet and no browser script.

## Isolated entry and routing

`pnpm --filter api start:public` starts the compiled public entry on loopback.
Build first with `pnpm build`. Set all four variables explicitly, without editing
the ordinary application environment during tests:

| Variable | Meaning |
| --- | --- |
| PUBLIC_SURFACE | `studio` or `festival` |
| PUBLIC_STUDIO_ORIGIN | Exact studio origin; HTTPS, or HTTP loopback for local validation |
| PUBLIC_FESTIVAL_ORIGIN | Distinct exact festival origin under the same validation |
| PUBLIC_PORT | Explicit listener port, 1–65535 |

For local inspection, use studio origin `http://127.0.0.1:4188` and festival
origin `http://127.0.0.1:4189`, starting one process per surface with its port.
These processes share the existing configured development database/storage;
starting a listener does not initialize, seed or publish CMS content. The normal
API process continues to own content cleanup and administration. Missing
publications correctly return 404. Tests instead use random disposable databases.

The request Host must exactly match that surface's configured origin host/port.
Mismatches return 421; forwarded host/protocol headers are not trusted. Generated
links use configured origins only. Public entries expose GET/HEAD public content
and rasters, HTML, CSS, robots and sitemap. They mount no private APIs, uploads,
SPA fallback, session endpoints or credentialed CORS. Unsafe requests do not write.

| Surface | HTML paths |
| --- | --- |
| Both | `/` redirects to `/et`; `/et`, `/en`, `/ru` |
| Studio | `/:locale/about`, `/teachers`, `/classes`, `/timetable`, `/join`, `/contact`, `/media` |
| Festival | `/:locale/festivals/:festivalSlug`; `/:locale/festivals/:festivalSlug/:editionSlug` |
| Edition | Edition path plus `/rules`, `/judges`, `/registration`, `/results`, `/contact` |

Unknown paths/locales, unsupported queries (including preview/revision IDs),
unpublished/archived editions and mismatched festival/edition identities return
localized 404 HTML, never a login wall. Database/read failures return localized
503 HTML with Retry-After and a same-page retry. GET/HEAD, success and failure
use no-store without ETags or conditional reuse. Error HTML is noindex/nofollow.
HTML CSP permits only local CSS/rasters and forbids scripts, forms, frames and
base overrides. The existing public raster service rechecks live rights and
publication for every GET/HEAD. No embedded social feed or remote media fetch.

## Content, language and metadata

Studio pages render about, public teacher profiles, classes/teacher links,
public timetable with weekday/local times/IANA zone/validity, joining, contact,
approved photos and social links. Direct fragments use document-local identities.
Homepage facts come from actual published timetable rows; no fake availability,
booking, enquiry storage or student data is introduced. Empty sections explicitly
say that information is not published.

Festival pages render published portal/festival summaries and stable edition
indexes grouped into upcoming/current, past and undated editions. Linked dates
use current Event facts and its time zone. Unlinked edition calendar dates are
compared with the current Europe/Tallinn calendar date; an edition remains
current through its end date. Absent dates stay undated. Rules/judges, canonical
location/deadline, reviewed historical result links with edition/date/language,
and contact are readable outside artwork. Palette choices remain the shared
contrast-checked cobalt/forest/brick pairs.

Registration uses only the published projection's currently available reviewed
external action or truthful contact fallback. Contact remains visible when an
external action is active. Changed canonical policy suppresses rules/external
handoff until reviewed again. No unfinished internal application or calculated
results workflow is advertised. Content never grants an account or permission.

All three locale projections for one page are read in one transaction. Explicit
language links preserve the section and festival/edition. Authored blocks carry
actual lang and visible fallback labels; names/addresses/time zones are not
automatically translated. Fully source-language fallback pages canonicalize to
that source route. Mixed pages keep the requested canonical, with actual-language
search/social text. Hreflang contains only variants whose included nonidentity
prose, metadata, image alternatives and links are actually authored in that
language. `/sitemap.xml` includes only those current published variants; private
previews, withdrawn editions and fallback duplicates are excluded. `/robots.txt`
advertises that surface's configured sitemap. There is no cached HTML fallback.

## Local delivery versus release

These are runnable local consumers, not production ingress configuration.
Existing workspace routes, Vite base, safe returns, identity/mail links, cookies,
CORS defaults, DNS and deployment manifests are unchanged. The coordinated
ADR-026 `/app` transition (including legacy secret-link handling and every
identity/return test) is required before festival HTML shares the workspace host.
Do not proxy this isolated entry over existing workspace routes.

P9-WIX-TRANSITION and each site's release acceptance retain approved real content,
media rights/export/archive attribution, domain/TLS ownership, ingress and `/app`
integration, actual registration handoff, hosted CI/observability, storage and
backup/restore/rollback rehearsals, and human visual/fluent/assistive review.
No deployment, migration of the application database, Wix cancellation or human
approval is implied. [Validation](../PUBLIC_SITES_VALIDATION.md) owns evidence.
