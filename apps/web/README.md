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
