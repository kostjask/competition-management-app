# Environment Configuration Guide

## Overview

The API uses a centralized, type-safe environment configuration system with comprehensive validation. All environment variables are validated against a schema at startup, with helpful error messages if values are missing or invalid.

## Quick Start

1. **Copy the example file:**

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

2. **Fill in required variables:**

   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/database
   JWT_SECRET=your_very_long_secret_key_minimum_32_characters
   EMAIL_FROM=noreply@example.com
   ```

3. **Start the server:**
   ```bash
   pnpm dev
   ```

## Environment Variables

### Node Environment

| Variable   | Type                                  | Default       | Description           |
| ---------- | ------------------------------------- | ------------- | --------------------- |
| `NODE_ENV` | `development` \ `production` \ `test` | `development` | Node environment mode |

### Server Configuration

| Variable | Type   | Default   | Description              |
| -------- | ------ | --------- | ------------------------ |
| `PORT`   | number | `4000`    | Server port              |
| `HOST`   | string | `0.0.0.0` | Server host/bind address |

### Database

| Variable       | Type                    | Required | Description                  |
| -------------- | ----------------------- | -------- | ---------------------------- |
| `DATABASE_URL` | string (PostgreSQL URI) | Yes      | PostgreSQL connection string |

**Format:** `postgresql://username:password@hostname:port/database`

**Example:**

```
postgresql://postgres:mypassword@localhost:5432/dance_competition
```

### Authentication

| Variable     | Type               | Default | Required |
| ------------ | ------------------ | ------- | -------- |
| `JWT_SECRET` | string (≥32 chars) | -       | Yes      |
| `JWT_EXPIRY` | string             | `7d`    | No       |

**JWT_SECRET:** Generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**JWT_EXPIRY:** Token expiration (standard notation):

- `7d` - 7 days
- `30d` - 30 days
- `24h` - 24 hours
- `1h` - 1 hour

### Storage Configuration

| Variable       | Type                   | Default     | Description             |
| -------------- | ---------------------- | ----------- | ----------------------- |
| `STORAGE_TYPE` | `local` \ `s3` \ `gcs` | `local`     | Storage provider        |
| `STORAGE_PATH` | string                 | `./uploads` | Local storage directory |

#### AWS S3 Storage

Required if `STORAGE_TYPE=s3`:

| Variable                | Type   | Required |
| ----------------------- | ------ | -------- |
| `AWS_REGION`            | string | Yes      |
| `AWS_ACCESS_KEY_ID`     | string | Yes      |
| `AWS_SECRET_ACCESS_KEY` | string | Yes      |
| `AWS_S3_BUCKET`         | string | Yes      |

**Example:**

```env
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=my-dance-bucket
```

#### Google Cloud Storage

Required if `STORAGE_TYPE=gcs`:

| Variable         | Type   | Required |
| ---------------- | ------ | -------- |
| `GCS_PROJECT_ID` | string | Yes      |
| `GCS_BUCKET`     | string | Yes      |
| `GCS_KEY_FILE`   | string | Yes      |

**Example:**

```env
STORAGE_TYPE=gcs
GCS_PROJECT_ID=my-project-id
GCS_BUCKET=my-dance-bucket
GCS_KEY_FILE=/etc/gcp/service-account-key.json
```

### Email Configuration

| Variable         | Type                             | Default | Required       |
| ---------------- | -------------------------------- | ------- | -------------- |
| `EMAIL_PROVIDER` | `smtp` \| `resend` \| `sendgrid` | `smtp`  | Email provider |
| `EMAIL_FROM`     | string (email)                   | -       | Yes            |

#### SMTP Configuration

Required if `EMAIL_PROVIDER=smtp`:

| Variable        | Type   |
| --------------- | ------ |
| `SMTP_HOST`     | string |
| `SMTP_PORT`     | number |
| `SMTP_USER`     | string |
| `SMTP_PASSWORD` | string |

**Example (Gmail):**

```env
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

⚠️ **Note:** For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password.

#### Resend Configuration

Required if `EMAIL_PROVIDER=resend`:

| Variable         | Type   |
| ---------------- | ------ |
| `RESEND_API_KEY` | string |

**Example:**

```env
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@example.com
RESEND_API_KEY=re_xxxxxxxxxxxx
```

#### SendGrid Configuration

Required if `EMAIL_PROVIDER=sendgrid`:

| Variable           | Type   |
| ------------------ | ------ |
| `SENDGRID_API_KEY` | string |

**Example:**

```env
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@example.com
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
```

### Development Options

| Variable    | Type                                   | Default | Description                      |
| ----------- | -------------------------------------- | ------- | -------------------------------- |
| `DEV_AUTH`  | `true` \| `false`                      | `false` | Bypass authentication (dev only) |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` | `info`  | Logging level                    |

⚠️ **WARNING:** Never set `DEV_AUTH=true` in production!

### Security

| Variable                  | Type   | Default  | Description             |
| ------------------------- | ------ | -------- | ----------------------- |
| `CORS_ORIGIN`             | string | `*`      | CORS allowed origins    |
| `RATE_LIMIT_WINDOW_MS`    | number | `900000` | Rate limit window (ms)  |
| `RATE_LIMIT_MAX_REQUESTS` | number | `100`    | Max requests per window |

**CORS_ORIGIN examples:**

```env
# Allow all origins (development only)
CORS_ORIGIN=*

# Single origin
CORS_ORIGIN=https://example.com

# Multiple origins
CORS_ORIGIN=https://example.com,https://app.example.com
```

## Using Configuration in Code

### Direct Import

```typescript
import { config, env } from "./config/env";

// Access typed configuration
const port = config.server.port;
const jwtSecret = config.auth.jwtSecret;
const emailProvider = config.email.provider;
```

### Type-Safe Access

The configuration is fully typed, so your IDE will provide autocomplete:

```typescript
import { config } from "./config/env";

if (config.storage.s3.enabled) {
  // S3 credentials are available
  const bucket = config.storage.s3.bucket;
  const region = config.storage.s3.region;
}
```

### Environment Helpers

```typescript
import { isDevelopment, isProduction, isTest } from "./config/env";

if (isDevelopment()) {
  // Development-only code
}

if (isProduction()) {
  // Production-specific configuration
}
```

## Configuration Objects

### Server Config

```typescript
config.server = {
  host: string;
  port: number;
  isDev: boolean;
}
```

### Database Config

```typescript
config.database = {
  url: string;
}
```

### Auth Config

```typescript
config.auth = {
  jwtSecret: string;
  jwtExpiry: string;
}
```

### Storage Config

```typescript
config.storage = {
  type: "local" | "s3" | "gcs";
  local: { path: string };
  s3: { region?: string; bucket?: string; ... enabled: boolean };
  gcs: { projectId?: string; bucket?: string; enabled: boolean };
}
```

### Email Config

```typescript
config.email = {
  provider: "smtp" | "resend" | "sendgrid";
  from: string;
  smtp: { enabled: boolean; host?: string; ... };
  resend: { enabled: boolean; apiKey?: string };
  sendgrid: { enabled: boolean; apiKey?: string };
}
```

### Dev Config

```typescript
config.dev = {
  authBypass: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}
```

### Security Config

```typescript
config.security = {
  corsOrigin: string;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}
```

## Environment-Specific Setup

### Development

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/dance_dev
JWT_SECRET=dev-secret-key-at-least-32-chars-long
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
DEV_AUTH=false
```

### Staging

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/dance_staging
JWT_SECRET=<generate with crypto>
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<your key>
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_S3_BUCKET=dance-staging-uploads
```

### Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/dance_prod
JWT_SECRET=<generate with crypto>
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<your key>
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_S3_BUCKET=dance-prod-uploads
CORS_ORIGIN=https://app.example.com
RATE_LIMIT_MAX_REQUESTS=1000
DEV_AUTH=false
```

## Validation

All environment variables are validated at startup using Zod. If validation fails, you'll see helpful error messages:

```
❌ Environment variable validation failed:
  DATABASE_URL: Invalid url
  JWT_SECRET: String must contain at least 32 character(s)
```

**Never ignore validation errors** - they indicate misconfiguration that will cause runtime failures.

## Security Best Practices

✅ **DO:**

- Use strong, random JWT_SECRET (minimum 32 characters)
- Store `.env` securely (never commit to version control)
- Use environment-specific values for different deployments
- Rotate secrets periodically
- Use `.env.example` to document required variables
- Enable HTTPS in production
- Set `DEV_AUTH=false` in production

❌ **DON'T:**

- Commit `.env` files to git
- Use the same secret across environments
- Use weak or predictable secrets
- Share `.env` files in chat or email
- Set `DEV_AUTH=true` in production
- Log sensitive values
- Use hardcoded secrets in code

## Troubleshooting

### "JWT_SECRET is not defined"

- Check that `JWT_SECRET` is set in `.env`
- Verify it's at least 32 characters
- Reload your terminal/IDE

### "Invalid DATABASE_URL"

- Ensure it's a valid PostgreSQL connection string
- Check for typos in hostname, port, database name
- Verify database is running and accessible

### "CORS origin not allowed"

- Check `CORS_ORIGIN` matches your frontend URL
- For development, use `*` (single origin only)
- Multiple origins require comma-separated list

### Email not sending

- Verify `EMAIL_PROVIDER` is configured
- Check email credentials (especially app passwords for Gmail)
- Verify `EMAIL_FROM` is a valid email
- Check email service provider status

## References

- [Environment Variables in Node.js](https://nodejs.org/en/knowledge/file-system/how-to-store-local-configuration-data/)
- [Zod Documentation](https://zod.dev/)
- [JWT.io](https://jwt.io/)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
