# Localization foundations

Phase 1 implements ET/EN/RU feedback contracts and the dictionary core under
[ADR-007](adr/007-localized-feedback-contracts.md). Remaining UI migration,
account/email preferences are now delivered locally; organizer-authored
translations and human workflow review remain separate.

## Transport

All business errors use error, code, statusCode, timestamp and optional details,
plus reason, params and issues. reason is a stable semantic identifier independent
of locale and generic HTTP code. params currently accepts only finite numeric
minimum/maximum/count values. Each issue has a path (string/index segments), a
stable rule and the same allowlisted parameter shape. Messages, submitted values
and unknown property lists are excluded from issues. details.fields remains a
legacy diagnostic map; the UI never renders its prose or the error string.

Custom schema refinements use params.reason (dateOrder, participantRange, ageRange,
nonemptyPatch, duplicate). Calendar dates use calendarDate; built-in rules retain
their Zod rule IDs. Unknown custom rules fall back to invalid. API and local forms
share validationIssues, preserving root and nested paths. No server-global locale
is changed per request. ErrorFeedback supplies a localized live summary with links
to known field IDs; EventForm also links inline field errors with aria-describedby.

Auth registration/verification, invitation create/accept and upload responses carry
messageId. Present these through formatSuccess rather than rendering message prose.
Success DTOs without notices and 204 responses do not need an invented notice.

ApiError preserves status, code, reason, params and issues. parseApiError accepts
unknown/legacy identifiers safely with the unexpected fallback. Network failures
use network; non-JSON successful output and response-schema failures use
invalidResponse. Components keep UiError objects in state; ErrorFeedback translates
at render time, so switching locale does not issue another request. Never save
translated strings in error state or match diagnostic English to infer reasons.

## Dictionary and locale policy

translations.ts is the source of valid keys. getTranslation and useTranslation
infer valid placeholders and reject unknown keys or missing/extra parameters.
Plural values provide all categories required by Intl.PluralRules for each locale,
with other as a fallback. Counts use Intl.NumberFormat. Feedback catalogues are
exhaustive over the shared reason/rule/success enums. Missing keys/values/parameters
produce a safe localized fallback and developer diagnostics.

A valid explicit choice takes effect immediately and is saved when storage is
available. Initialization uses supported saved locale, then supported browser
languages, then et. Unsupported storage is ignored; unavailable storage is tolerated.
Native language names and aria-pressed expose the selector state. Preference
reconciliation now follows ADR-013: explicit choice in the mounted session,
account preference, saved browser choice, supported browser languages, then et.
Account preference is read on profile load/login/verification/recovery. Logout
returns to browser fallback unless a session choice exists. Account reconciliation
does not overwrite browser storage; only explicit selector clicks save it.
Profile offers an explicit save/clear control for account/email language, preserving
inputs on failure and reporting success only after acknowledgement/profile refresh.
Other devices/tabs read the preference on their next profile load; saving does not
broadcast session expiry or silently replace work. URL locale parameters are ignored;
verification/invitation links retain the session choice or use the same account/browser
fallback. Mail resolves its recipient locale independently and invitations keep
their frozen locale. No browser inference writes account preferences. Document lang/titles, semantic loading names, profile and event
dates and numeric feedback now use the Phase 2 shared formatting foundation.
All displayed event instants and datetime editors explicitly use UTC until a
separately reviewed event-zone model is introduced. Calendar date helpers do not
shift days across browser zones. Future feature durations/currency retain their
own delivered-scope formatting gates. Never infer a
recipient's language from an administrator's session or translate authored names.

## Checks and outstanding review

pnpm test runs the source guard, API tests and frontend localization/transport
component tests. pnpm typecheck checks interpolation contracts. The source guard
uses the TypeScript parser, ignores authored expressions, and allows only the
reviewed internal event-form aria identifier exceptions in
[i18n-hardcoded-baseline.json](i18n-hardcoded-baseline.json). New literals fail CI;
remove exceptions as I18N-UI migrates existing screens. This baseline is not a claim
that the application is fully translated.

All-locale static React rendering verifies error switching and selected-language
semantics. Chromium now covers the delivered shell/session/profile at four widths,
keyboard focus and input preservation across language changes. Remaining full-journey
screen-reader announcements and fluent ET/EN/RU terminology review remain
I18N-QA/P9-BROWSER release evidence. Fluent-language and screen-reader review are not claimed; screenshot spot review
of the delivered scope is recorded in [session/shell evidence](SESSION_SHELL_VALIDATION.md).

The 2026-11-05 auth migration removes all legacy registration text exceptions.
Eight internal event-form aria identifiers remain reviewed scan exceptions; they
are not user-facing copy. Signup, draft/recovery, acceptance and invitation
management use complete ET/EN/RU dictionaries. Recipient mail language is explicit
or account/ET fallback, never inferred from inviter UI; preference/link reconciliation is delivered under I18N-PREFERENCES. See onboarding/invitation validation.

M2 authored-content policy/contracts: [ADR-019](adr/019-m2-authored-content.md).
AuthoredContentSchema/resolveAuthoredContent return actual lang and explicit
source fallback; Registration catalogue keys cover ET/EN/RU statuses, reasons,
next actors and fallback notice. Existing description storage remains single-text
until P4 assigns its source language explicitly. I18N-CONTENT remains open for
workflow implementations and later content; the M2 policy/contracts slice is complete.
