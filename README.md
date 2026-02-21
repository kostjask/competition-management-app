# Dance Competition Management System

A modern, type-safe platform for managing high-stakes dance competitions with real-time judge scoring, multi-role workflows, and international support.

## Features

- **Role-Based Access Control**: Admin (event config), Judge (live scoring), Moderator (stage flow), Studio Representative (dancer registration)
- **Real-Time Scoring**: Judges rapidly enter scores during 2-5 minute live performances with configurable rubrics (Technique, Artistry, Presentation, etc.)
- **Multi-Stage Workflow**: Enforced competition lifecycle (Pre-Registration → Registration Open → Data Review → Live Event → Finalized)
- **Type-Safe Architecture**: Shared TypeScript interfaces and Zod schemas across frontend and backend
- **Internationalization**: Full support for Estonian, English, and Russian with context-based i18n system
- **Studio Management**: Representatives register dancers, manage profiles, upload music, and track performance results
- **Scalable Schema**: Supports multiple concurrent events, custom scoring templates, dynamic age group calculation from birthdate

## Tech Stack

### Frontend
- **React 18** with TypeScript and Vite
- **Tailwind CSS v4** for styling
- **React Router v7** for navigation
- **Context API** for state management and i18n
- **Zod** for runtime validation

### Backend
- **Node.js** with Express.js
- **Prisma ORM** with PostgreSQL
- **JWT** for authentication
- **Zod** for input validation

### DevOps & Tooling
- **Turborepo** for monorepo management
- **pnpm** for workspaces
- **Docker Compose** for local development environment
- **TypeScript** for type safety across the stack

## Project Structure

```
dance-competition-app/
├── apps/
│   ├── api/                 # Express backend
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── services/    # Business logic
│   │   │   ├── middleware/  # Auth, errors
│   │   │   ├── controllers/ # Route handlers
│   │   │   └── db/          # Prisma client
│   │   └── prisma/          # Schema & migrations
│   └── web/                 # React frontend
│       └── src/
│           ├── pages/       # Route pages
│           ├── components/  # Reusable UI
│           ├── api/         # API client
│           ├── i18n/        # Translations
│           └── store/       # State management
├── packages/
│   ├── schemas/            # Shared Zod schemas
│   ├── types/              # Shared TypeScript types
│   └── constants/          # Shared constants & enums
└── docker-compose.yml      # Local dev environment

```

## Architecture Highlights

### Authentication & Authorization
- JWT-based authentication with Bearer tokens
- Role-based access control (RBAC) with event-level scoping
- Invitation system for judge/moderator/representative onboarding
- Soft deletes for audit trail integrity

### Type Safety
- Shared Zod schemas in `packages/schemas` consumed by both API (validation) and frontend (form handling)
- Shared TypeScript types in `packages/types` for API responses
- Path aliases for monorepo imports: `@dance/types`, `@dance/schemas`

### State Management
- **Server State**: API caching via React hooks
- **Auth State**: Context + localStorage for JWT persistence
- **UI State**: React component state (planned Zustand for complex flows)
- **Translations**: Context-based i18n with ET/EN/RU support

### Database
- Prisma models with relationships, soft deletes, and audit timestamps
- Event-scoped data isolation for multi-tenancy support
- Automatic age group calculation from dancer birthdate
- Performance scoring with configurable rubric templates

## Learning Goal

This project is built to learn modern full-stack development:
- Type-safe React applications with TypeScript
- REST API design with Express and Prisma ORM
- Monorepo architecture with shared packages
- Database design and migrations
- Authentication and authorization patterns
- Internationalization (i18n) in web apps
- Real-time data synchronization (WebSockets - future)

## Real-World Context

This system is being built to replace a completely manual actual dance competition workflow

**Current Process (Manual)**
- Event registration and dancer data entry via Google Sheets
- Judge scoring on paper forms during live performances
- Manual score aggregation and ranking calculations (error-prone, time-consuming)
- No real-time visibility into competition progress
- Paper trails and lost forms

**New System Benefits**
- **Digital Registration**: Studios register online, upload dancer info in bulk, no spreadsheets
- **Real-Time Scoring**: Judges enter scores directly into the app during performances (2-5 min per performance) on tablets/phones
- **Instant Rankings**: Scores auto-calculate, rankings update live, no manual aggregation
- **Stage Management**: Moderators control performance queue, prevent scheduling conflicts, enforce data integrity
- **Audit Trail**: All actions logged with timestamps for compliance and dispute resolution

## Roadmap

- [x] Core backend API (auth, CRUD, validation)
- [x] Frontend scaffolding (Vite, Tailwind, i18n)
- [ ] Judge scoring interface with live timer
- [ ] Admin event setup wizard
- [ ] Studio representative dashboard
- [ ] Moderator stage controls
- [ ] Real-time score broadcast (WebSocket)
- [ ] Performance rankings & leaderboard
- [ ] Email notifications
- [ ] Mobile-responsive UI polish
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Integration & E2E tests

## License

MIT

## Author

[Konstantin Skorohodov](https://github.com/kostjask)
