# Environment configuration

Setup: [root README](../README.md#local-setup). Sources:
[EnvSchema/config](../apps/api/src/config/env.ts),
[API example](../apps/api/.env.example), [web example](../apps/web/.env.example).
Read examples, never print existing .env files. Scoped API commands run from
apps/api; dotenv reads its .env and shell values take precedence.

## Required and active settings

| Variable | Validation/default | Runtime |
| --- | --- | --- |
| DATABASE_URL | Required PostgreSQL URL | Prisma connection |
| JWT_SECRET | Required, at least 32 characters; production rejects example/placeholder and low-diversity values | Signing/verification; generate an independent random secret |
| JWT_EXPIRY | Positive compact duration, default 7d | Native bearer expiry; browser cookie sessions are fixed at one hour; e.g. 1.5h, 30m; units ms/s/m/h/d/w/y |
| EMAIL_FROM | Required valid email | Resend verified sender; fake remains silent |
| EMAIL_PROVIDER | fake / resend; fake | Fake makes no delivery claim and refuses production delivery; resend queues transactionally and starts the worker |
| RESEND_API_KEY / EMAIL_QUEUE_KEY | Required for resend; key prefix re_ / dedicated 64 hexadecimal characters | HTTPS provider authentication / AES-256-GCM queue encryption; independent of JWT_SECRET |
| WEB_ORIGIN | URL; http://localhost:5173 | Real mail requires HTTPS origin without path/query/credentials; localized identity links |
| NODE_ENV | development / test / production; development | Mode; seed refuses production |
| PORT / HOST | Positive integer 4000 / 0.0.0.0 | Listener |
| DEV_AUTH | true / false; false | Skips bearer entry only in development; refuses startup in test/production when true. Uses a real active, verified account and its actual roles. Keep false for real login. |
| DEV_AUTH_EMAIL | Canonical email; admin@test.com | Development account selected when DEV_AUTH=true; explicit seed/provisioning required. Missing/ineligible accounts fail closed; no automatic activation, verification or role grants. |
| VITE_API_URL | Web setting; http://localhost:4000/api/v1 | API base, including version; restart Vite |
| STORAGE_PUBLIC_URL | Optional URL in EnvSchema; unset by default | Image URL base; use API origin for protected browser downloads. Unset returns /uploads/...; does not grant public access |
| STORAGE_TYPE | local only | Unsupported s3/gcs selections fail startup; providers remain P8-MEDIA |
| CORS_ORIGIN | Exact HTTP(S) origins separated by commas; development/test default http://localhost:5173,http://127.0.0.1:5173; production requires explicit origins | Allowlist enforced for requests and preflight; no credentials, path, query or trailing slash |
| RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX_REQUESTS | Positive integers; 900000 / 100 | Separate socket-IP buckets for recovery, signup/verification, invitations (all methods), and image uploads |
| LOGIN_RATE_LIMIT_MAX_REQUESTS | Positive integer; 20 | Separate login bucket using the same window |
| STORAGE_PATH | ./uploads | Local file root resolved against API working directory; used by read/write/delete |
| APP_BASE_URL | Not consumed | Use WEB_ORIGIN for email links; safe return policy is ADR-016 |

Browser sessions require exact allowed origins and credentialed requests. A wildcard
non-production policy cannot issue or read browser-cookie sessions. Production
uses a host-only Secure/HttpOnly/SameSite=Lax cookie: authenticated staging browser
checks require HTTPS. The loopback HTTP rehearsal still supports guest/health
checks; it is not evidence for authenticated production cookie behavior. Browser/API
must be same-site, preferably served through the same origin. There is no Domain
cookie, third-party cookie mode or proxy-trust expansion. Native bearer clients retain
JWT_EXPIRY. Apply the forward session audit migration before deploying logout.

Generate a new secret locally and put it directly in the environment file; do not
paste it into logs/reports. Never copy an example over an existing environment.

## Parsed configuration that does not enable a provider or policy

| Settings | Actual behavior / owning task |
| --- | --- |
| AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET | Optional schema fields; no S3 implementation or conditional requirement checks. |
| GCS_PROJECT_ID / GCS_BUCKET / GCS_KEY_FILE | Optional schema fields; no GCS implementation or conditional requirement checks. |
| LOG_LEVEL: debug/info/warn/error (info) | Parsed config; no centralized logger enforcing it. P9-OBSERVABILITY. |

Use exported config/isDevelopment/isProduction/isTest in new backend code.
Current direct env reads are known consolidation work, not a pattern to copy.
Invalid EnvSchema input terminates startup; successful parsing does not prove
production readiness. SMTP/SendGrid placeholders have been removed; existing local
configuration using EMAIL_PROVIDER=smtp must select fake or configure resend.
Application environment files are never rewritten by tests. Cloud storage remains
unimplemented. See [email dispatch ADR](adr/014-transactional-email-dispatch.md)
and [staging setup](STAGING.md) for queue key backup/rotation, retries and rollout.

## Troubleshooting

- Database: start the checked-in Compose service; match its example URL/port.
- JWT expiry: use a positive number with an explicit lowercase compact unit;
  unitless, spaced, zero/negative and long-form durations fail validation.
- Email: the non-production stub is a silent fake; it never logs recipients,
  secrets or links. Production fake refuses delivery; configured Resend uses the
  encrypted transactional queue. Recovery requests uniformly return 503 before
  account lookup when delivery is unavailable. Injected synchronous failures roll
  back domain/token changes; queued provider failures retry with unconfirmed
  delivery. Real staging inbox delivery and external onboarding remain gated.
- Session rollout: apply the sessionVersion migration and replace all old API
  workers together before enabling password reset. Legacy JWTs require sign-in;
  older workers must not continue accepting revoked or unversioned sessions.
- Proxy trust stays false. Limits ignore forwarded IP/protocol headers and use the
  socket IP. Each API instance owns bounded in-memory buckets (10,000 per category);
  excess/new buckets fail closed until capacity expires. Restart clears windows.
  Behind the local ingress clients share its socket IP. Before hosted/multi-instance
  use, review ingress limits and a topology-specific trusted-proxy/shared-store policy;
  never enable arbitrary proxy trust. OPTIONS preflight does not consume a bucket.
- Images: /uploads requires a current eligible bearer identity, a live reference
  and resource read permission. No static fallback or public publication is enabled.
  Check [storage behavior](STORAGE.md) before introducing any cloud/public provider.

The API disables X-Powered-By and sends no-store, nosniff, frame denial, a restrictive
API CSP, no-referrer and disabled camera/microphone/geolocation permissions on success
and error responses. Production adds one-year HSTS; HTTPS termination must still be
configured at ingress. These API headers do not configure the separate SPA host.
Requests without Origin remain supported for native/server clients; CORS is not authentication.

[Security gaps](SECURITY.md) · [Validation commands](TESTING.md)
