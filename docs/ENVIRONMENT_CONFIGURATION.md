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
| JWT_SECRET | Required, at least 32 characters | Signing/verification |
| JWT_EXPIRY | Positive compact duration, default 7d | JWT expiry; e.g. 1.5h, 30m; units ms/s/m/h/d/w/y |
| EMAIL_FROM | Required valid email | Resend verified sender; fake remains silent |
| EMAIL_PROVIDER | fake / resend; fake | Fake makes no delivery claim and refuses production delivery; resend queues transactionally and starts the worker |
| RESEND_API_KEY / EMAIL_QUEUE_KEY | Required for resend; key prefix re_ / dedicated 64 hexadecimal characters | HTTPS provider authentication / AES-256-GCM queue encryption; independent of JWT_SECRET |
| WEB_ORIGIN | URL; http://localhost:5173 | Real mail requires HTTPS origin without path/query/credentials; localized identity links |
| NODE_ENV | development / test / production; development | Mode; seed refuses production |
| PORT / HOST | Positive integer 4000 / 0.0.0.0 | Listener |
| DEV_AUTH | true / false; false | Skips bearer entry only in development; refuses startup in test/production when true. Uses a real active, verified account and its actual roles. Keep false for real login. |
| DEV_AUTH_EMAIL | Canonical email; admin@test.com | Development account selected when DEV_AUTH=true; explicit seed/provisioning required. Missing/ineligible accounts fail closed; no automatic activation, verification or role grants. |
| VITE_API_URL | Web setting; http://localhost:4000/api/v1 | API base, including version; restart Vite |
| STORAGE_PUBLIC_URL | Local provider reads directly; http://localhost:4000 | Public image URL origin; outside EnvSchema |
| APP_BASE_URL | Not consumed | Use WEB_ORIGIN for email links; safe session/return UI remains P2-SESSION |

Generate a new secret locally and put it directly in the environment file; do not
paste it into logs/reports. Never copy an example over an existing environment.

## Parsed configuration that does not enable a provider or policy

| Settings | Actual behavior / owning task |
| --- | --- |
| STORAGE_TYPE: local/s3/gcs; STORAGE_PATH: ./uploads | Startup always constructs LocalStorageService using cwd/uploads. Neither setting selects a provider/path today. P8-MEDIA. |
| AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET | Optional schema fields; no S3 implementation or conditional requirement checks. |
| GCS_PROJECT_ID / GCS_BUCKET / GCS_KEY_FILE | Optional schema fields; no GCS implementation or conditional requirement checks. |
| CORS_ORIGIN: * | App currently hardcodes *; setting is not enforced. P2-BOUNDARIES. |
| RATE_LIMIT_WINDOW_MS: 900000; RATE_LIMIT_MAX_REQUESTS: 100 | Positive integers; shared process-local IP window for the four public recovery operations. Other auth/invite/upload routes and distributed deployment limits remain P2-BOUNDARIES. |
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
  secrets or links. Production throws unavailable until P2-EMAIL integrates a
  provider. Recovery requests uniformly return 503 before account lookup when
  delivery is unavailable; transient send errors remain explicitly unconfirmed
  and roll back token/email changes. Test delivery via injected fakes; no external
  onboarding flow exists.
- Session rollout: apply the sessionVersion migration and replace all old API
  workers together before enabling password reset. Legacy JWTs require sign-in;
  older workers must not continue accepting revoked or unversioned sessions.
- Proxy trust is false. Recovery limits use the socket IP, ignoring forwarded IP
  headers; review deployment/shared limits under P2-BOUNDARIES before external use.
- Uploads: local files are publicly served from /uploads. Check
  [storage behavior](STORAGE.md); configuring a provider does not change that.

[Security gaps](SECURITY.md) · [Validation commands](TESTING.md)
