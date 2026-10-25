# Detailed roadmap

Status and next action: [DEVELOPMENT_PLAN](../../DEVELOPMENT_PLAN.md).
Read only the phase needed for the selected task. Checkboxes describe technical
scope; milestone and release gates still apply. Task IDs are stable.

## Phase 8 — Media and provider hardening (before dependent milestones)

Audit C3/C4 ownership and active-content protections for the already mounted image
API are P2-BOUNDARIES-UPLOADS/M1 requirements; they must not wait for music or
provider implementation. P8-MEDIA reuses and extends those protections. The
[audit correction map](../AUDIT_FOLLOWUP.md) defines regression and release evidence,
including M5's permanent security/browser tests with each owning feature task.

Core email provider/delivery is P2-EMAIL, not deferred here. Media must be ready
before M3 music upload, independently of Phase 6–7 progress.

- [ ] P8-UI-PROVIDERS: within P8-MEDIA/DELIVERY-HARDENING and consuming S11/S17 screens, expose actual upload/processing/replacement/delivery failure and retry states, upfront limits and accessible progress. UI exit requires narrow-layout ET/EN/RU, cancellation/uncertain-response recovery and retained previous media; no false sent/ready message. Extend existing feature UI rather than building a separate media interface.

- [ ] P8-MEDIA: after P2-PRIVACY and P3-MUSIC-MODEL, choose configured local/object storage with appropriate production/private access and signed URLs; verify MIME from content, limits/safe filenames, permissions, compensating replacement, and orphan cleanup using fakes/integration tests. Failure must retain the previous file and not leak private media. Validate provider-specific configuration at startup.
- [ ] P8-DELIVERY-HARDENING: expand email scheduling/retries/monitoring and schedule/correction templates as those features arrive; clean up expired tokens/files under retention policy. Existing P2-EMAIL behavior must remain functional throughout.

Exit: media replacement/private access and cleanup tests pass before P5-MUSIC;
production provider configuration fails safely. Delivery enhancements never defer
the basic verification/invitation/recovery email required by M2/M4.

## Phase 9 — Expanded quality and production operations

Baseline CI is P1-CI. Tests, localization/accessibility and privacy apply when each
feature is built, not first in Phase 9. Existing Node/API/PostgreSQL tests remain;
introduce new test libraries only for a concrete need.

- [ ] P9-UI-REGRESSION: start with P2-UI-FOUNDATION/SHELL and expand per feature: minimal interactive component/user-flow tests and reviewed screenshots for delivered S/F IDs at phone/portrait tablet/desktop in ET/EN/RU. Cover focus/error/empty/denied/locked/reconnect states with deterministic synthetic data; record manual screen-reader/keyboard/contrast/touch and fluent-language evidence. No blanket baseline acceptance. UI exit evidence is milestone-scoped and must exist before release, not after all phases finish. See [TESTING](../TESTING.md).

- [ ] P9-BROWSER (initial foundation slice implemented, 2026-10-25): Playwright/Chromium and CI cover synthetic ET/EN/RU foundation states at four widths, keyboard/focus, language preservation, overflow and palette checks. Full form/guard and journey evidence remains open; gate M2 on signup/verify/apply/approve/status, M3 on entries/corrections, M4 on staff acceptance/removal, and M5 on judging/results. Expand CI alongside each journey.
- [ ] P9-OBSERVABILITY: structured safe logging/correlation IDs, error monitoring, metrics, and health/readiness for database/storage/email as applicable. Redact tokens/contact/birth/billing data under P2-PRIVACY before external operation.
- [ ] P9-DEPLOY (user-requested local staging preparation added, 2026-10-25): [STAGING](../STAGING.md), container builds and isolated loopback-only Compose rehearsal are implemented; no hosted account/domain exists. Hosted protected ingress, production configuration, deployment architecture, staging release/migration checklist, and rollback rehearsal before the first external deployment; do not wait for scoring/results.
- [ ] P9-RECOVERY: backups, restore rehearsal, retention and incident/runbook procedures before production data use; expand manual competition fallback before M5. Review privacy/accessibility/localization against actual implemented journeys at each release.

Exit: automated checks gate the released scope, staging deployment/rollback and
restore are rehearsed, observability/runbooks cover external operations, and
keyboard/mobile/ET/EN/RU/privacy requirements pass for each released milestone.

## Deferred optional scope

CSV dancer import, copying previous performances, admin view previews, and broad
dynamic user/role administration are outside M2/M3 core delivery. Restore UI is
separately gated by P3-DATA-HYGIENE restore policy and authorization tests. Keep
these visible as backlog; do not implement them opportunistically or use them to
hold the first usable registration journey open.
