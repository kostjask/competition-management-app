# Environment Setup Guide

## Quick Setup (3 Steps)

### 1. Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Create .env File

```bash
cp apps/api/.env.example apps/api/.env
```

### 3. Edit .env with Your Values

```env
# Required variables
DATABASE_URL=postgresql://user:password@localhost:5432/dance_competition
JWT_SECRET=<paste the generated secret from step 1>
EMAIL_FROM=noreply@example.com

# Optional for production
STORAGE_TYPE=local
EMAIL_PROVIDER=smtp
```

## Development Setup

Complete `.env` for local development:

```env
# Environment
NODE_ENV=development

# Server
PORT=4000
HOST=0.0.0.0

# Database (local PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dance_development

# Authentication
JWT_SECRET=<generated_secret>
JWT_EXPIRY=7d

# Storage (local file system)
STORAGE_TYPE=local
STORAGE_PATH=./uploads

# Email (local SMTP for testing)
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test@example.com
SMTP_PASSWORD=test
EMAIL_FROM=noreply@localhost

# Development
DEV_AUTH=false
LOG_LEVEL=debug
CORS_ORIGIN=*
```

**To receive emails locally during development:**

Option 1: Use Mailhog (recommended for testing)

```bash
# Install Mailhog
# macOS: brew install mailhog
# Linux: Download from https://github.com/mailhog/MailHog
# Windows: Download from https://github.com/mailhog/MailHog

# Start Mailhog
mailhog

# Access UI at http://localhost:1025
```

Then set:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
```

Option 2: Use real email with credentials

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<app-specific-password>
```

## Production Setup

### Environment Variables

```env
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

DATABASE_URL=postgresql://produser:securepass@db.example.com:5432/dance_prod

JWT_SECRET=<very-long-random-secret-from-crypto>
JWT_EXPIRY=7d

STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_S3_BUCKET=dance-production-uploads

EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<your-sendgrid-api-key>
EMAIL_FROM=noreply@dance-competition.com

CORS_ORIGIN=https://app.example.com
RATE_LIMIT_MAX_REQUESTS=1000
DEV_AUTH=false
LOG_LEVEL=warn
```

### Database Setup

1. **Create PostgreSQL database:**

```sql
CREATE DATABASE dance_competition;
CREATE USER api_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE dance_competition TO api_user;
```

2. **Run migrations:**

```bash
pnpm prisma migrate deploy
```

3. **Seed initial data:**

```bash
pnpm seed
```

### AWS S3 Setup

1. **Create S3 bucket:**

```bash
aws s3api create-bucket \
  --bucket dance-production-uploads \
  --region us-east-1
```

2. **Create IAM user with S3 access:**

```bash
# Via AWS console or CLI
# Permissions needed:
# - s3:GetObject
# - s3:PutObject
# - s3:DeleteObject
```

3. **Add credentials to .env:**

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

### SendGrid Setup

1. **Create SendGrid account:** https://sendgrid.com
2. **Create API key:** Settings → API Keys → Create API Key
3. **Add to .env:**

```env
SENDGRID_API_KEY=SG....
```

## Docker Setup

### Local Development with Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN cd apps/api && pnpm build

EXPOSE 4000

CMD ["node", "apps/api/dist/src/index.js"]
```

```yaml
# docker-compose.yml
version: "3.8"

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dance_development
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/dance_development
      JWT_SECRET: dev-secret-at-least-32-characters-long
      EMAIL_FROM: noreply@localhost
      STORAGE_TYPE: local
      EMAIL_PROVIDER: smtp
      SMTP_HOST: localhost
      SMTP_PORT: 1025
    ports:
      - "4000:4000"
    depends_on:
      - db
    volumes:
      - ./apps/api/uploads:/app/apps/api/uploads

volumes:
  postgres_data:
```

Run with:

```bash
docker-compose up
```

## Environment Variables by Provider

### Email Providers

#### SMTP

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@example.com
```

#### SendGrid

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxx...
EMAIL_FROM=noreply@example.com
```

#### Resend

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxx...
EMAIL_FROM=noreply@example.com
```

### Storage Providers

#### Local File System

```env
STORAGE_TYPE=local
STORAGE_PATH=./uploads
```

#### AWS S3

```env
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=my-bucket
```

#### Google Cloud Storage

```env
STORAGE_TYPE=gcs
GCS_PROJECT_ID=my-project
GCS_BUCKET=my-bucket
GCS_KEY_FILE=/etc/secrets/gcp-key.json
```

## Common Issues & Solutions

### Database Connection Failed

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**

```bash
# Check PostgreSQL is running
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Start PostgreSQL if not running
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux
```

### Invalid JWT_SECRET

**Problem:** `JWT_SECRET must be at least 32 characters`

**Solution:**

```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env
JWT_SECRET=<new-secret>
```

### Email Not Sending

**Problem:** `Error: Invalid login: 534, 1:0 - Please log in via your web browser`

**Solution for Gmail:**

- Create [App Password](https://support.google.com/accounts/answer/185833)
- Use app password instead of account password
- Check "Less secure apps" setting

```env
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<app-password-not-account-password>
```

### CORS Errors

**Problem:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**

```env
# Development (allow all)
CORS_ORIGIN=*

# Production (specific origin)
CORS_ORIGIN=https://app.example.com

# Multiple origins (comma-separated)
CORS_ORIGIN=https://app.example.com,https://staging.example.com
```

## Validation at Startup

All environment variables are validated when the server starts:

```
✨ API running at http://0.0.0.0:4000
📊 Environment: production
🔐 Auth bypass: disabled
```

If validation fails, you'll see:

```
❌ Environment variable validation failed:
  JWT_SECRET: String must contain at least 32 character(s)
  EMAIL_FROM: Invalid email
```

## Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] JWT_SECRET is minimum 32 characters
- [ ] Database password is strong
- [ ] No test credentials in production
- [ ] Email provider credentials are valid
- [ ] `DEV_AUTH` is `false` in production
- [ ] `CORS_ORIGIN` is restricted in production
- [ ] AWS/GCS keys have minimal required permissions
- [ ] SSL/TLS certificates are valid
- [ ] Rate limiting is configured

## Reference

- [Full Documentation: ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md)
- [Config Source Code: apps/api/src/config/env.ts](../apps/api/src/config/env.ts)
- [Example: apps/api/.env.example](../apps/api/.env.example)
