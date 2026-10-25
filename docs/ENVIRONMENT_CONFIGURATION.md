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
| EMAIL_FROM | Required valid email | Validated; delivery is still a stub |
| NODE_ENV | development / test / production; development | Mode; seed refuses production |
| PORT / HOST | Positive integer 4000 / 0.0.0.0 | Listener |
| DEV_AUTH | true / false; false | Synthetic development identity; keep false for real login |
| VITE_API_URL | Web setting; http://localhost:4000/api/v1 | API base, including version; restart Vite |
| STORAGE_PUBLIC_URL | Local provider reads directly; http://localhost:4000 | Public image URL origin; outside EnvSchema |
| APP_BASE_URL | Email stub reads directly; http://localhost:5173 | Verification/invitation link origin; outside EnvSchema |

Generate a new secret locally and put it directly in the environment file; do not
paste it into logs/reports. Never copy an example over an existing environment.

## Parsed configuration that does not enable a provider or policy

| Settings | Actual behavior / owning task |
| --- | --- |
| STORAGE_TYPE: local/s3/gcs; STORAGE_PATH: ./uploads | Startup always constructs LocalStorageService using cwd/uploads. Neither setting selects a provider/path today. P8-MEDIA. |
| AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET | Optional schema fields; no S3 implementation or conditional requirement checks. |
| GCS_PROJECT_ID / GCS_BUCKET / GCS_KEY_FILE | Optional schema fields; no GCS implementation or conditional requirement checks. |
| EMAIL_PROVIDER: smtp/resend/sendgrid (smtp); SMTP_HOST/PORT/USER/PASSWORD; RESEND_API_KEY; SENDGRID_API_KEY | Parsed only; no real email adapter or provider-specific required-field validation. SMTP_PORT, when supplied, is coerced to an integer. P2-EMAIL. |
| CORS_ORIGIN: * | App currently hardcodes *; setting is not enforced. P2-BOUNDARIES. |
| RATE_LIMIT_WINDOW_MS: 900000; RATE_LIMIT_MAX_REQUESTS: 100 | Positive integers; no limiter installed/wired. P2-BOUNDARIES. |
| LOG_LEVEL: debug/info/warn/error (info) | Parsed config; no centralized logger enforcing it. P9-OBSERVABILITY. |

Use exported config/isDevelopment/isProduction/isTest in new backend code.
Current direct env reads are known consolidation work, not a pattern to copy.
Invalid EnvSchema input terminates startup; successful parsing does not prove
production readiness. Setting smtp or s3 will not make email or cloud storage work.

## Troubleshooting

- Database: start the checked-in Compose service; match its example URL/port.
- JWT expiry: use a positive number with an explicit lowercase compact unit;
  unitless, spaced, zero/negative and long-form durations fail validation.
- Email: the non-production stub is a silent fake; it never logs recipients,
  secrets or links. Production throws unavailable until P2-EMAIL integrates a
  provider. Test delivery via injected fakes; no external onboarding flow exists.
- Uploads: local files are publicly served from /uploads. Check
  [storage behavior](STORAGE.md); configuring a provider does not change that.

[Security gaps](SECURITY.md) · [Validation commands](TESTING.md)
