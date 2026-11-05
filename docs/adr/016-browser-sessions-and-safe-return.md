# ADR-016: Browser sessions and safe return

Accepted 2026-11-05 for P2-SESSION. Scope: current browser and documented API clients.

Persistent bearer localStorage is simple and avoids ambient-cookie CSRF, but any
same-origin script can read and export the credential. Browser memory storage
loses reload/cross-tab continuity. Choose an HttpOnly JWT cookie for the browser;
retain explicit Authorization bearer sessions for non-browser API clients, whose
existing contract is independent of browser storage. Do not migrate old browser
tokens: remove them and require sign-in. No browser credential enters Web Storage,
URL, return state, logs or persisted draft. XSS can still act as the signed-in user;
HttpOnly is not an XSS cure. Hosting CSP and dependency review remain release work.

Browser clients negotiate X-Session-Transport: cookie on session issuance; their
response has user/session/expiry metadata and no token. The host-only cookie has
HttpOnly, SameSite=Lax, Path=/ and Secure in production. Browser JWTs have an
explicit purpose and cannot authenticate as bearer tokens. Cookie sessions last
one hour without silent refresh. API bearer expiry retains JWT_EXPIRY. The API
rechecks current eligibility, sessionVersion and role access on every request.
Logout increments sessionVersion transactionally and revokes all account sessions,
then clears the browser cookie. Failed logout must not falsely claim revocation.
Reset/correction keep their existing all-session revocation. No session model or
domain migration is necessary; a forward audit-allowlist migration records logout.

Every unsafe cookie request, including login/verification, requires a configured
exact Origin and X-CSRF-Protection: 1. No-Origin native clients use bearer mode.
Only explicitly allowed origins get credentialed CORS; wildcard development CORS
cannot issue/use cookie sessions. Reject ambiguous cookie+bearer credentials.
Proxy trust stays false. Production requires HTTPS browser/API on the same site;
same-origin ingress is recommended. Local development may use HTTP localhost on
different ports with explicit origins. No Domain cookie or third-party-site mode.

Bootstrap uses authenticated profile retrieval, never a readable cookie marker.
401 is application state, not a hard navigation. Already mounted forms remain
mounted behind an inert session-recovery dialog; successful reauthentication
refreshes current permissions before resuming. Nothing retries a mutation
automatically. Passwords and private unsaved form data are not persisted.
Other-tab logout broadcasts a nonsecret notification; the next request in every
tab/device independently rejects a revoked revision. Reload requires a server
profile check; no stale cached profile establishes eligibility.

Return destinations use a strict allowlist of implemented routes. Accept only
canonical relative paths without query, fragment, backslash, percent escapes or
credentials. Unsupported/encoded/external destinations fall back to /. A safe
returnTo query may carry only that validated path across login/email tabs; it
never carries session/link tokens or personal fields. Cross-device links without
context fall back to /. Verification strips its link secret from the visible URL
before use and requires explicit Continue. Onboarding server-owned intended-event
return remains ADR-013; application eligibility is rechecked separately.

Rollback must not revive browser localStorage tokens or revoked revisions. Ship
API/shared contracts/browser together; native bearer transport stays explicit.
Keep the expanded audit CHECK and immutable SESSION_REVOKED history on runtime
rollback; never delete audit rows or decrement account revisions to restore old code.
Full signup/invitation/recovery UI, real delivery, ingress/shared limits and fluent
language/screen-reader review retain their owning gates.
