# Localization foundations

Phase 1 implements ET/EN/RU feedback contracts and the dictionary core under
[ADR-007](adr/007-localized-feedback-contracts.md). General UI migration, formatting,
account/email preferences and organizer-authored translations remain separate.

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
reconciliation with accounts, background email locale, link locale, document lang,
page titles and broader date/number formatting belong to Phase 2. Never infer a
recipient's language from an administrator's session or translate authored names.

## Checks and outstanding review

pnpm test runs the source guard, API tests and frontend localization/transport
component tests. pnpm typecheck checks interpolation contracts. The source guard
uses the TypeScript parser, ignores authored expressions, and allows only the
reviewed 95 existing literal text/attribute entries in
[i18n-hardcoded-baseline.json](i18n-hardcoded-baseline.json). New literals fail CI;
remove exceptions as I18N-UI migrates existing screens. This baseline is not a claim
that the application is fully translated.

All-locale static React rendering verifies error switching and selected-language
semantics. Browser interactions, focus preservation, mobile/long-text layout,
screen-reader announcements and fluent ET/EN/RU terminology review remain
I18N-QA/P9-BROWSER release evidence. No human review is claimed in this checkpoint.
