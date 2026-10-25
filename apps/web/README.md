# Web application

React 19 / Vite 8 / Tailwind 4 / React Router 7. Root
[setup](../../README.md#local-setup) starts API and web together. API reads remain
authenticated; role dashboards are placeholders. [Current checkpoint](../../DEVELOPMENT_PLAN.md).

From the repository root: pnpm --filter web dev (port 5173), build, typecheck,
lint or test. Tests use tsx/Node plus static React rendering; interactive browser
coverage remains planned. [Test commands and scope](../../docs/TESTING.md).

VITE_API_URL must include /api/v1 (local http://localhost:4000/api/v1).
Restart Vite after environment changes. Shared @dance/schemas emits runtime JS;
build it and restart the API after contract changes.

## Where to work

| Concern | Source / guide |
| --- | --- |
| Mounted pages | src/routes/index.tsx; proposed routes are in [UI_UX](../../docs/UI_UX.md) |
| HTTP and DTO decoding | src/api; [client conventions](src/api/README.md) |
| Session / route gates | src/auth; [known role issues](ROLE_SYSTEM.md) |
| Translation / feedback | src/i18n, ErrorFeedback; [LOCALIZATION](../../docs/LOCALIZATION.md) |
| Shared layout / future controls | src/components; [DESIGN_SYSTEM](../../docs/DESIGN_SYSTEM.md) |

Use shared clients/schemas, semantic forms, complete feedback/loading/empty/denied
states, keyboard/focus access and responsive ET/EN/RU text. Backend authorizes
every operation. Read only the relevant screen/flow sections before feature work;
their targets do not mean the corresponding route/API already exists.
Do not add a UI/state library without a concrete need.
