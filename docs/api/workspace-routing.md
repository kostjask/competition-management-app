# Workspace routing and local cohosting

The private browser application uses `/app`. API paths remain `/api/v1`, private
images remain `/uploads`, and host-only session cookies keep `Path=/`. This
implements the local identity-link transition in [ADR-026](../adr/026-studio-and-festival-platform.md#workspace-and-identity-link-migration).
It does not change DNS, production ingress, cookie scope, deployment or Wix.

## Browser and link contract

Vite builds assets under `/app/assets`. The data router has basename `/app`;
ordinary router links remain basename-relative. The shared `workspaceLink`
builder creates absolute browser/mail paths. `ReturnPathSchema` accepts the exact
implemented legacy and canonical destinations and outputs one canonical `/app`
path. `routerReturnPath` adapts those values at the router boundary. Unsupported
destinations fall back to `/app`; absolute URLs, encoded separators, traversal,
fragments, duplicate prefixes and unsupported queries fail validation. Existing
bounded `studio` selections remain supported. The assigned judge score route is
allowlisted by exact pathname. Unsuitable view-filter queries are
omitted when generating a sign-in return; the implemented editor path is retained.

Onboarding returns and newly rendered transactional mail use canonical paths.
`WEB_ORIGIN` remains an exact origin without a path. Old queued messages are not
rewritten or resent. Bounded GET/HEAD legacy redirects remain indefinitely in
the local cohost and development server; public `/` still redirects to `/et`.
Only supported `lang`, identity-route `token`/`returnTo`, signup `eventId` and
existing route-specific `studio` queries survive. Duplicate or invalid values
and other parameters are dropped. Unknown operational paths never receive a
private SPA fallback from the cohost.

A blocking, local head script captures an identity token in document memory
and removes token queries/fragments before the application renders. No browser
storage contains it. No-referrer headers protect even development resources
injected ahead of the HTML metadata. Verification, recovery and invitation
consumers preserve router history state when cleaning a client navigation.
An explicit valid mail-link language wins over saved/account language for that
visit; account preferences are not changed. Public content does not consume
workspace identity or grant permissions.

## Local rehearsal

After `pnpm build`, `pnpm --filter api start:workspace` explicitly starts the
festival/public renderer, built workspace, protected API and private images on
one loopback listener. It requires the four public-entry variables documented in
[public setup](public-pages.md#isolated-entry-and-routing), with
`PUBLIC_SURFACE=festival`. It refuses a missing workspace build. The ordinary
API and public-only entries retain their separate behavior.

For an isolated rehearsal, choose exact loopback origins such as studio
`http://127.0.0.1:4188` and festival `http://127.0.0.1:4189`, with
`PUBLIC_PORT=4189`. Set `WEB_ORIGIN` and `CORS_ORIGIN` explicitly to that festival
origin and build with `VITE_API_URL=/api/v1`. Set these per process; do not replace
an application environment file. The listener uses its configured database;
starting it does not seed, migrate, initialize or publish anything. Automated
database checks instead own a randomly named disposable database.

The browser client defaults to same-origin `/api/v1`. In ordinary Vite development,
only `/api/v1` and `/uploads` proxy to the loopback API on port 4000; explicit
`VITE_API_URL` overrides remain supported. The SPA and its assets use no-store,
no-referrer, noindex and same-origin CSP (including `media-src 'self'` for private
music playback). S11 music paths and bounded performance/track selections are
allowlisted for cohosting and safe authentication returns. Missing assets return 404 rather than
HTML. Public HTML retains its script-free CSP. The studio public entry cannot
enable workspace cohosting. Exact Host, CORS, CSRF and backend authorization
remain mandatory; no forwarded-host trust or cross-subdomain cookie is added.

Hosted topology/ingress, legacy URL inventory beyond implemented workspace paths,
content rights/attribution, TLS/ownership, rollback and human acceptance remain
open [Wix transition](../roadmap/website.md) gates.
