# ADR-007: Locale-independent feedback and shared validation

Date: 2026-10-24

Status: Accepted for Phase 1 implementation under the localization workstream.

The application needs equivalent feedback in Estonian, English and Russian,
including errors already visible when a user changes language. Translating server
sentences or changing a process-wide Zod locale per request would make behavior
fragile and could mix recipients/request locales.

## Decision

Keep the existing error/status envelope and add a closed semantic reason,
allowlisted numeric parameters, and structured issues with field paths and rule
IDs. Retain error prose/details for development compatibility; they are never
user-facing translation keys. Shared validationIssues converts Zod issues without
input values, messages or unknown-key lists. Custom domain refinements carry an
explicit reason. Unknown future/legacy reasons and technical failures render a
safe generic localized message. Success notices carry stable messageId values.

Keep descriptors in React state; one presenter translates at render time. Feature
clients decode unknown HTTP output through shared schemas, including before
storing sessions. Transport failures are structured too. Backend output-contract
failures produce 500; malformed client responses produce an invalidResponse error.

Retain the current dictionary and use native Intl plural/number rules. Infer keys
and placeholder arguments from the actual catalogue. Every locale must provide
nonempty values and every plural category used by that locale. Missing keys or
parameters have safe translated production fallbacks and diagnostic warnings.

Phase 1 locale precedence is valid explicit in-memory choice, valid browser
storage, first supported browser language, then Estonian. Unsupported persisted
values and unavailable storage must not break initialization. Language buttons
use native language names and aria-pressed. Account/email/link preference
precedence, document language and formatting remain I18N-PREFERENCES/FORMATTING.
No preference field, email locale or database migration is introduced here.

## Verification and limits

CI runs catalogue completeness/placeholder/plural checks, compile-time key/argument
checks, API/local validation parity, all-locale component renders and network/error
contract tests. A TypeScript AST detector rejects new literal JSX/accessible text;
the reviewed existing strings in i18n-hardcoded-baseline.json remain I18N-UI work.
User-authored names/content and internal diagnostics are deliberately outside the
catalogue. The source detector and static component renders are not browser,
keyboard/mobile, screen-reader or fluent-speaker review. Those remain release
checks for each delivered workflow; this decision does not close I18N-QA globally.

Existing authentication, invitation, upload and privacy security gates remain in
Phase 2. API contract stabilization does not authorize external release.
