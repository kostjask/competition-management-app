# Web application

React 19 / Vite 8 / Tailwind 4 / React Router 7. Root
[setup](../../README.md#local-setup) starts API and web together. API reads remain
authenticated. The admin workspace owns event setup and application review;
the representative section opens owned applications. Judge/moderator dashboards
remain placeholders. [Current checkpoint](../../DEVELOPMENT_PLAN.md).

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

Organizer routes: `/admin`, `/events/new`, `/events/:id/edit`,
`/admin/events/:eventId/setup`, `/admin/events/:eventId/applications`.
Setup covers event-local dates, explicit DST choices, contact, description source
language/translations/previews and protected image upload. Review uses URL filters
and studio selection, independent revisioned decisions, minimal history and
truthful notification states. Neither screen retries an uncertain decision blindly.
See [organizer validation](../../docs/ORGANIZER_VALIDATION.md) for automated/browser
evidence and the completed local database/runtime handoff.

Applicant routes: role-independent `/applications`, `/events/:id/register`,
`/events/:id/studio` and canonical `/studios/:studioId`. They continue an exact
verified owner draft, keep the creation operation/payload through uncertain
responses, and show independent approvals plus permitted revisioned profile/contact,
cancel/reapply actions. Event discovery remains authenticated. No private form
data or operation payload is written to browser storage; mounted input survives
language changes and same-account session recovery. Reload/closing warns about
unsaved work; saved onboarding and owned application status are the durable recovery
paths. [Application validation](../../docs/APPLICATION_VALIDATION.md).
