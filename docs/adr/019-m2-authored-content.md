# ADR-019: M2 authored content and language fallback

Accepted 2026-11-09. Owns I18N-CONTENT's M2 policy/contracts only. Later category,
rubric, announcement and export implementations remain with their workflows.

Names, event titles, addresses, personal/contact details and studio names are
authored identity/display values, never translation keys. Do not automatically
translate them or use translated labels as identity. Interface statuses, actions,
validation and M2 review reason codes belong to the ET/EN/RU application catalogue.
M2 reasons use CONTACT_ORGANIZER, INCOMPLETE_DETAILS, INELIGIBLE or CAPACITY;
they contain no free text or private evidence.

Organizer-authored event description/instructions will use an explicit sourceLocale
(et/en/ru) and a nonempty sourceText, with optional nonempty translations for the
other supported locales. A translation cannot replace the source locale entry.
Only the source language is required for M2 publication. Resolution uses the
requested translation when present, otherwise the source text. The result includes
the actual lang and fallback boolean: the UI labels fallback using a translated
notice and marks prose with the actual HTML lang. Never silently substitute an
unrelated interface language, emit a blank field or expose a translation key.

Editors must label the source language, distinguish translations, allow clearing
optional translations, and preview all three language/fallback outcomes before
saving/publishing. Existing description text is retained verbatim; migration must
require an explicit organizer source-language choice, never infer it from names,
browser locale or account preference. Migration 31 and the P4-CORE editor now implement this policy; retained text stays explicitly unclassified until the organizer chooses its source language.
The original policy task added no database model. P4-CORE now implements event storage/editors under [ADR-020](020-organizer-event-setup.md), retaining unknown-language prose without inference.

The shared AuthoredContentSchema and resolveAuthoredContent function define the
payload/resolution contract consumed by P4 event storage/editors. Publication/export must carry stable resource
IDs, source and authored translations and apply the same resolution rule; do not
include review evidence, billing or private contact data in public content.
Category/age/format names retain stable IDs; later multilingual labels follow a
separate reviewed extension before those editors change storage.
