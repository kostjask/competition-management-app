# Repository audit correction plan

Source findings: [repository audit, 2026-10-25](REPOSITORY_AUDIT.md).
This map owns finding IDs → task owners and regression acceptance, not a second
status tracker. [Checkpoint](../DEVELOPMENT_PLAN.md) owns priority/gates; linked
roadmaps own checkboxes. Original correction order/status narrative is preserved
in [history](DEVELOPMENT_HISTORY.md#audit-correction-narrative-archived-2026-11-10).

## Order and release gates

Follow the [checkpoint queue](../DEVELOPMENT_PLAN.md#implementation-order) and
[development/release distinction](../DEVELOPMENT_PLAN.md#development-and-release-gates).
Concrete security regressions take priority. Mounted API identity/scope/upload
boundaries cannot wait for UI, music or full staff workflows. Do not reopen
completed contract slices because independent release evidence remains open.

Preserve every M1–M5 prerequisite and delivered-scope ET/EN/RU, browser,
accessibility, real-mail and operational gate. Passing DTO/unit tests or hiding
an unsafe action never authorizes external release. Finding codes M1–M5 below
are audit severity IDs; the Gate column uses milestone names.

## Finding-to-task acceptance map

| Finding | Owning roadmap task(s) | Required correction and evidence | Gate |
| --- | --- | --- | --- |
| C1: existing-account invitation login | [Foundation](roadmap/foundation.md): P2-INVITE-IDENTITY, P2-AUTH; full management P2-INVITE | Existing accounts require authenticated intended-account identity; arbitrary password, wrong/no session and inactive invitee fail without session issuance, credential change, reactivation, role write or link consumption. Successful acceptance is atomic; replay/concurrent losers preserve data. | M1 identity boundary; full workflow M4 |
| C2: inactive accounts retain access | Foundation: P2-AUTH, P2-SESSION | Disable after JWT issuance and verify the next protected request fails, including admin operations. Missing users and inactive verification/invitation cannot issue usable sessions. Explicit verified/roleless onboarding policy has allowed and denied tests. | M1 |
| C3: unrelated image replacement | Foundation: P2-BOUNDARIES-UPLOADS | All four endpoints check actor/resource ownership, stored event scope and active parents before storage/write. Roleless, cross-user/event/studio, removed membership and archived-parent requests fail with unchanged records/files; permitted uploads still pass. | M1 |
| C4: public HTML through image upload | Foundation: P2-BOUNDARIES-UPLOADS; broader provider work P8-MEDIA | Verify allowed raster content, derive safe filenames/extensions and use safe serving headers/isolation. Reject disguised HTML/SVG, invalid bytes and MIME/extension/content mismatch; verify HTTP retrieval cannot publish active content through accepted image uploads. Test genuine allowed images and preservation on failure. | M1; not deferred to music |
| H1: scoped admin becomes global | Foundation: P2-ROLES-ADMIN-SCOPE, P2-STAFF-MODEL/INVITE, P2-SCOPE-DEPLOY | Define and enforce global-admin semantics; event-scoped admin must not obtain the global bypass. Reject unsupported assignment/invitation scopes, test direct admin-only operations outside scope and review legacy assignment provenance without inferred repair. | M1 |
| H2: token lifecycle/log exposure | Foundation: P2-IDENTITY-TOKENS | Digests, purpose, expiry, rotation/revoke and atomic consumption; wrong-purpose, expired, replayed and concurrent verification/invitation tests. Capture logs using synthetic secrets and assert absence; audit collisions and preserve account/ownership history during transition. | M1 |
| H3: false production email success | Foundation: P2-EMAIL, P2-UI-AUTH; I18N-PREFERENCES | Provider/fake interface and validated production config; no silent no-op delivery. Distinguish accepted request from delivery outcome, test failure/retry without duplicate accounts/roles/invitations, and verify ET/EN/RU templates plus real staging delivery. | External M2/M4 |
| H4: nonexistent action destinations | Foundation: P2-UI-SHELL/UI-AUTH/INVITE; [Studio](roadmap/studio.md): P5-APPLICATION | Every visible link resolves to a supported screen or is truthfully unavailable; unknown routes have translated not-found recovery. After backend gates, implement application/studio and acceptance destinations and test direct navigation, intended-event return, guest/roleless/denied access and expired links. Removing a link is containment, not completion of the workflow. | Delivered shell; M2/M4 journeys |
| H5: unused security configuration | Foundation: P2-BOUNDARIES, P2-AUDIT | Wire configured CORS, security headers and route-appropriate auth/invitation/upload throttling. Test allowed/denied origins and bounded requests; document trusted-proxy/IP policy and distinguish application controls from unverified hosting controls. | M1 |
| M1: inconsistent frontend roles | Foundation: P2-ROLES, P2-UI-SHELL | One stable-key/event/global/admin policy for hooks, guards and navigation. Test seeded and renamed display names, similarly named unrelated roles, roleless/multi-role users, direct navigation and wrong-event/global assignments. Backend remains authoritative. | M1 role contract; delivered UI |
| M2: cancellation blocks reapplication | [Registration](roadmap/registration.md): P3-REGISTRATION-REAPPLY within P3-REGISTRATION; P5-APPLICATION | Define and implement authorized same-studio cancel/reapply using a canonical operation; preserve studio identity/members/history and current name constraints. PostgreSQL/API and browser checks cover same-name reapply, retry/concurrency, wrong owner/event, closed stage and no duplicate studio/membership/role. | M2 |
| M3: oversized JSON returns 500 | Foundation: P2-BOUNDARIES-ERRORS | Oversized and supported parser/encoding failures return appropriate shared 4xx envelopes and semantic ET/EN/RU feedback. HTTP tests cover limits, malformed JSON, no raw input leakage and no mutation; unrelated exceptions still produce private 500 responses. | M1 boundary hardening |
| M4: untranslated/inaccessible UI | Foundation: P2-UI-FOUNDATION/SHELL/AUTH; [Localization](roadmap/localization.md): I18N-UI/FORMATTING/QA | Translate delivered text, semantic forms/fields and named controls; implement correct menu/disclosure keyboard/focus behavior. Test all locales, loading/error/empty/success/disabled states, preserved input on locale change, keyboard/Escape/focus restoration and phone/tablet/desktop; record human language/accessibility review. | Each delivered workflow |
| M5: missing security/browser regressions | Owning security tasks; [Operations](roadmap/operations.md): P9-BROWSER/UI-REGRESSION; I18N-QA | Convert audit probes into permanent failing-before-fix regressions where practical, then add interactive form/guard/navigation/journey coverage. Keep HTTP/database denial and rollback tests independent of browser visibility. CI runs the delivered scope; record runtime revision and limitations. | Every correction; milestone-scoped browser gates |
| L1: inert profile Edit | Foundation: P2-UI-SHELL | Remove/disable the unsupported Edit action with truthful translated wording; label read-only profile navigation accordingly. Only add editing after its backend contract exists. Test visible actions and keyboard navigation. | Delivered shell |

## Closure and preservation

Current development rows are disposable under the user-confirmed
[database policy](TESTING.md#development-database-and-disposable-data). Preservation
and transition criteria here apply to domain invariants and retained/non-disposable
data, not mandatory retention of current fixtures. Reset/reseed and replace
fixtures when that yields the better model; avoid unnecessary legacy machinery.
The policy governs the applied-history restriction below; it does not permit
weakening security/history behavior or discarding source work to pass tests.

Use [TESTING](TESTING.md#audit-correction-evidence) for evidence requirements.
A finding closes only after implementation, applicable regression/validation and
documentation are complete. Update its owning task and this mapping with the
fix revision/evidence; keep the dated audit's original observations intact.
Containment, fixtures and planned acceptance criteria must be labelled separately
from a verified correction and from an externally releasable journey.

Migration work must preserve IDs, credentials, memberships, assignments, tokens'
history and private data under the reviewed policy. Do not merge identities,
reactivate accounts, delete ambiguous scope records, loosen name constraints or
rewrite applied migrations to make tests pass. Actual deployment provenance,
backup/restore and provider/browser evidence remain explicit open gates.
