# Staging preparation and rollout

2026-10-25: no hosting/provider account or confirmed custom domain exists. The
user currently has a Wix site. Keep that site separate; determine whether it uses
an owned custom domain before choosing a staging subdomain and email sender.
No cloud resource, DNS record, provider account or real email has been created.
A local rehearsal is running at http://127.0.0.1:8080 with production fake mail,
26 applied migrations and healthy API/PostgreSQL; SPA/guest/mail-unavailable smoke
checks pass. Independent generated secrets stay in ignored deploy/staging.env.
No application development database was changed.

The checked-in Docker setup is a **local staging rehearsal**, not a public release.
It builds Node 24 API and Vite assets, serves the SPA/API through one origin, runs
migrations as a one-shot dependency, and keeps PostgreSQL private. The only host
port is 127.0.0.1:8080. Persistent database/upload volumes are separate from the
development Compose project. Do not change that binding to a public interface.
The unfinished invitation identity/upload/boundary/session workflows still block
public access. Fake production mail refuses requests; it never claims delivery.

## Rehearse locally

1. Copy deploy/staging.env.example to ignored deploy/staging.env without replacing
   any existing environment. Generate three independent 32-byte hexadecimal
   secrets locally and place them directly in the file. Never paste them into
   chat/logs. This creates a new empty database; it does not import development data.
2. From the root, run:

   ```text
   docker compose --env-file deploy/staging.env -f docker/docker-compose.staging.yml build
   docker compose --env-file deploy/staging.env -f docker/docker-compose.staging.yml up -d --wait
   ```

3. Check http://127.0.0.1:8080/health and the app. The demonstration seed is
   intentionally unavailable in production. Do not copy seed passwords/users to
   staging. Controlled administrator provisioning remains an operational task;
   roleless account creation alone grants no administration.
4. Stop with `docker compose --env-file deploy/staging.env -f docker/docker-compose.staging.yml down`.
   Keep the volumes. Never add --volumes against retained environments casually.

## Provision protected hosted staging

Choose a hosting account, region, budget and owner before creating paid resources.
Prefer a managed application/PostgreSQL service for a novice operator; the Docker
images are also deployable to a private Linux host behind a TLS/access gateway.
Use synthetic accounts only until privacy/backup review. Configure an access
gateway or private tunnel before ingress, independent staging secrets, database
backups and upload persistence. Do not expose PostgreSQL or trust arbitrary proxy
headers. P9-DEPLOY owns the provider-specific deployment and rollback rehearsal.

For real email, create the Resend account, verify a controlled sending subdomain
using its supplied DNS records, configure EMAIL_FROM and a restricted API key in
the hosting secret manager, and disable link/open tracking for identity messages.
Set STAGING_EMAIL_PROVIDER=resend, HTTPS STAGING_WEB_ORIGIN and the queue key.
No credentials belong in Git. Verify ET/EN/RU verification, resend, invite and
reset messages using controlled recipients. Confirm provider acceptance separately
from inbox receipt, expiry/replay, delivery retries and no secret-bearing logs.
Invitation/reset UI links are still gated by P2-UI-AUTH; template tests do not
prove those journeys. Record revision, environment, timestamps and safe outcomes.

## Scope audit, backups and rollout gates

Before a retained target's first migration, identify the host/database/schema
without revealing credentials. Run scripts/audit-scope-integrity.sql and
scripts/audit-email-identity.sql through authorized access; review provenance of
global/scoped roles and unclassified historical invitations. Resolve ambiguities
explicitly. Never infer global authority, merge accounts or delete history.

Take a database backup and upload snapshot, and rehearse restoring them into an
isolated target. Restore the queue key through secret management; queue retries
must remain inside their 23-hour lifetime. Stop writers/workers before coordinated
migration, deploy the matching API/web revision, check migration parity and health,
then permitted/denied scope workflows. Roll back application code only if its
schema compatibility is established; otherwise restore the reviewed backup under
stopped writers. Additive migrations are not automatically safe for older clients
after response contracts or token/session policies change.

P2-SCOPE-DEPLOY, real staging mail and P9 deploy/restore evidence remain open until
the intended target exists and these actions actually pass. Local fixture success
does not close them.
