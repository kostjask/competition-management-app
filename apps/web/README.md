# Web application

React 19 / Vite 8 / Tailwind 4 / React Router 7. Root
[setup](../../README.md#local-setup) starts API and web together. API reads remain
authenticated; the organizer setup dashboard is delivered; other role dashboards remain placeholders. [Current checkpoint](../../DEVELOPMENT_PLAN.md).

For frontend-only development from the root: pnpm --filter web dev (port 5173).
[Test commands and scope](../../docs/TESTING.md) own build/typecheck/lint, Node/static
React tests and maintained Playwright Chromium coverage for delivered workflows.
Human language and assistive review remain separate release evidence.

VITE_API_URL must include /api/v1 (local http://localhost:4000/api/v1).
Restart Vite after environment changes. Shared @dance/schemas emits runtime JS;
build it and restart the API after contract changes.

## Where to work

The target includes public studio/festival sites and shared content administration;
[product scope](../../docs/PRODUCT_SCOPE.md) and
[ADR-026](../../docs/adr/026-studio-and-festival-platform.md) distinguish these
from the current app. CMS/public JSON and separate local public HTML entries are
implemented; the private SPA still has no `/app` base. Public rendering lives in
`packages/public-site`, not the authenticated browser bundle.
[Public entry/routing](../../docs/api/public-pages.md) documents explicit local
origins and the still-required cohosting/identity-link transition. Do not mount
public HTML over existing workspace routes based on target addresses alone.
Public screens are S18–S20/F11–F12; existing application contracts stay valid.

| Concern | Source / guide |
| --- | --- |
| Mounted pages | src/routes/index.tsx; proposed routes are in [UI_UX](../../docs/UI_UX.md) |
| HTTP and DTO decoding | src/api; [client conventions](src/api/README.md) |
| Session / route gates | src/auth; [access gates](ROLE_SYSTEM.md) |
| Translation / feedback | src/i18n, ErrorFeedback; [LOCALIZATION](../../docs/LOCALIZATION.md) |
| Shared layout / future controls | src/components; [DESIGN_SYSTEM](../../docs/DESIGN_SYSTEM.md) |

Use shared clients/schemas, semantic forms, complete feedback/loading/empty/denied
states, keyboard/focus access and responsive ET/EN/RU text. Backend authorizes
every operation. Read only the relevant screen/flow sections before feature work;
their targets do not mean the corresponding route/API already exists.
Do not add a UI/state library without a concrete need.

## P4-CORE event setup

Organizer setup is mounted at /admin/events/:eventId/setup, retaining
/events/:id/edit. /admin prioritizes incomplete event setup. Creation explicitly
selects an IANA timezone and cutoff/no-cutoff policy; local times reject DST gaps
and require offset choice for folds. Editors cover contact/location, authored
source-language description/translations/fallback preview, optional limits and
separately saved private images. Readiness links missing fields and M2 lifecycle
changes require confirmation. Setup PATCH sends expectedRevision; stale/unknown
outcomes retain input and require an explicit same-request retry or server
comparison. Creation retains its UUID operationId across uncertain responses.
See [event contract](../../docs/api/events.md) and
[design baseline](../../DESIGN.md).

## M2 review and applications

The organizer performance register/editor is at
`/admin/events/:eventId/performances?studio=:studioId`, linked from event details.
It shows saved performance titles, explicit studio applications and participant
counts, including zero, plus draft creation, details/history, configuration,
checkpoint review and retained withdrawal/restore. URL filters, error/retry,
loading/empty states and session recovery use Cobalt and ET/EN/RU. Representative
entry/music/submission UI retains its M3 gates.
[Current recovery evidence](../../docs/ENTRY_RECOVERY_VALIDATION.md).

Global admins review independent decisions at /admin/events/:eventId/applications;
dashboard counts link into each pending queue. All verified members can use
/applications and /events/:id/register or /events/:id/studio?studio=:studioId
without a representative role. The short form consumes a verified onboarding
draft atomically when supplied. Status shows both approvals, reason, next actor,
cutoff/contact, history and truthful mail state. Profile/self-contact edits,
confirmed pending cancellation and same-studio reapply retain revisions/history.
Frozen commands survive uncertain responses/session recovery; explicit server
comparison preserves local input until replacement. Private form data stays in
mounted state. [Contracts/evidence](../../docs/APPLICATION_REVIEW_VALIDATION.md)
record limits; entry/billing-editor extensions and external release gates remain.

## Shared content administration

Global administrators use `/content/studio`, `/content/festivals` and
`/content/editions/:editionId` for structured ET/EN/RU content, saved private
preview, exact-revision publication/unpublication and reviewed document media.
Initialize missing singletons explicitly. Unsaved/conflicting/uncertain writes
remain mounted; reconcile receipts/current state before explicit retry. Selective
edition copy excludes images and operational data. Linked Event facts are read-only.
The `/app` transition and public HTML pages remain separate tasks. [Contracts](../../docs/api/content.md)
and [local validation](../../docs/CONTENT_EDITOR_VALIDATION.md) own exact boundaries.
