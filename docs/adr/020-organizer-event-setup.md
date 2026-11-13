# ADR-020: Organizer setup readiness and concurrent editing

Accepted for local P4-CORE implementation, 2026-11-10. Extends the accepted M2
lifecycle and authored-content contracts in [ADR-003](003-registration-lifecycle.md)
and [ADR-019](019-m2-authored-content.md); adds no lifecycle stage or scoring gate.

Opening registration requires a saved venue, city, country and organizer email.
An existing unclassified description must be assigned a source language or
explicitly cleared. Description, image, numeric limits and scoring configuration
are otherwise optional. Missing fields are returned as structured validation
issues and are linked from the shared UI checklist. The same check runs for
creation in REGISTRATION_OPEN and for the resulting configuration while open.
Draft PRE_REGISTRATION events may remain incomplete. ADR-003 deliberately allows
applications during PRE_REGISTRATION; the setup checklist does not silently
change that window. Null deadline means no automatic cutoff, not missing setup.

The UI requires an explicit timezone and cutoff/no-cutoff choice at creation,
shows the stored zone during editing and converts local wall times to UTC.
Nonexistent DST times are refused; repeated times require choosing a displayed
UTC offset. The API accepts only offset-bearing instants, validates IANA zones
and resulting start/end/deadline ordering, and never guesses a browser zone.
Business organizer contacts are visible only through authenticated event reads.
Numeric limits are configuration, not newly implemented capacity enforcement.

Every event PATCH requires expectedRevision. Stage changes additionally require
expectedStage. A serializable transaction updates the revision once and appends
immutable audit; stale conflicting writes return 409. The immediately preceding
matching retry returns the saved record without another write/audit. UI edits
are retained across failures/session recovery. Reconciliation displays all server
fields before explicitly replacing or rebasing the local form. No automatic
mutation replay follows login, reconnect or read refresh.

Creation accepts a UUID operationId. A private digest binds the normalized
request and actor to that unique operation. Matching retries return the same
resource; changed input/identity conflicts. The UI retains the request during
uncertain responses. Callers omitting operationId must reconcile before retrying.
No retry metadata, private image path or relation is serialized.

Migration 31 adds nullable contacts/source locale, translation JSON, revision and
creation retry metadata. It retains existing descriptions verbatim with unknown
language, preserving identity and history without inferred translations. A
classified description is stored as source text plus locale and supported optional
translations; the canonical API description is AuthoredContent or null, with
unclassifiedDescription explicitly carrying retained unknown-language text.
New writes cannot create unclassified text. Database checks protect source/
translation shape, supported locales, retry pairing and positive revisions.

Apply this additive migration before the matching API/client rollout. Older API
binaries may read retained source text but cannot express translation semantics
or revision guards; do not run old and new writers concurrently. Rollback should
retain/export new contact/content/retry metadata and audit history, not drop it.
No applied migration history is rewritten, event data deleted or database reset.
Image changes keep their separate authenticated, validated, audited upload path.

The Cobalt app-screen direction in [DESIGN](../../DESIGN.md) implements this
owning UI slice. Whole-application redesign, human visual/language/assistive review,
real mail and hosted rollout remain separate open gates.
