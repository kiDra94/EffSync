# EffSync Backend

The REST and WebSocket API of EffSync, built with **NestJS 11**, **Prisma 7** and **PostgreSQL 17**. Setup, production operation (HTTPS, backups, 2FA) and the feature list are in the [main README](../README.md); this file covers what you need when working on the backend itself.

## Requirements

- Node.js 22
- PostgreSQL 17 (for development; the E2E tests bring their own in Docker)
- Docker, for the E2E test database

## Getting started

```bash
npm install
cp .env.example .env      # then set at least DATABASE_URL, JWT_SECRET and TWO_FACTOR_ENCRYPTION_KEY
npx prisma migrate dev    # create the database and apply the migrations
npm run seed              # demo data, for development only
npm run start:dev
```

The API runs at `http://localhost:3000/api`. The Swagger documentation of every endpoint is served at the same address, and the OpenAPI document at `http://localhost:3000/api-json`.

The backend refuses to start without `DATABASE_URL`, `JWT_SECRET` or a valid `TWO_FACTOR_ENCRYPTION_KEY` (64 hex characters), and in production without an `https://` `PUBLIC_URL` (`src/shared/infrastructure/config/env.validation.ts`). All variables are described in [`.env.example`](.env.example).

## Architecture

The code is organized in **bounded contexts**, one folder per business domain:

```
src/
├── main.ts, app.setup.ts, app.module.ts   entry point, global setup, root module
├── contexts/
│   ├── identity-access/        login, tokens, 2FA, users, roles, permissions, guards
│   ├── task-management/        tasks, members, templates, comments, grade remarks, activity log
│   ├── communication/          chat rooms, messages, the chat part of the WebSocket gateway
│   ├── documents-notes/        documents (incl. grading), notes
│   ├── school-organization/    classes, departments, subjects, rooms, schedules, lesson slots
│   ├── notifications/          in-app notifications, e-mail, preferences, cron jobs
│   └── reporting/              dashboard metrics
└── shared/                     Prisma client, unit of work, config validation, Socket.io transport,
                                re-exported security decorators
```

Each context has the same four layers, plus its NestJS module at the context root:

| Layer | Contains | May import |
|---|---|---|
| `domain/` | entities, aggregates, value objects, repository interfaces | its own `domain/` and `shared/domain/`, no NestJS or Prisma |
| `application/` | use cases and their transaction (`UnitOfWork`); `index.ts` is the only entry point for other contexts | `domain/` |
| `infrastructure/` | Prisma repositories and adapters (mail, realtime) that implement the ports | `application/`, `domain/` |
| `presentation/` | controllers, DTOs, gateway handlers | `application/` |

Contexts talk to each other only through `application/index.ts`, `identity-access` depends on no other context, and there are no cycles between contexts. A task use case saves the task and its activity-log entry in one transaction. These rules are checked by [`dependency-cruiser`](.dependency-cruiser.cjs) and fail the CI on any violation; [`src/contexts/README.md`](src/contexts/README.md) explains them in detail.

## Main routes

All routes are under `/api`. Swagger lists every endpoint with its request and response shapes.

| Context | Routes |
|---|---|
| `identity-access` | `/auth` (login, register, refresh, logout, Google, password reset and change), `/auth/2fa`, `/users` (incl. `/users/me/settings` and avatars), `/roles`, `/permissions` |
| `task-management` | `/tasks`, with task-scoped sub-routes: `/tasks/:id/members`, `/tasks/:id/comments`, `/tasks/:id/grade-remarks`, `/tasks/:id/activity`, `/tasks/activity`, `/tasks/templates` |
| `communication` | `/chat-rooms`, incl. `/chat-rooms/:id/messages`; live messages over Socket.io |
| `documents-notes` | `/documents` (upload, download, grading, `my-grades`), `/notes` |
| `school-organization` | `/classes`, `/departments`, `/subjects`, `/rooms`, `/schedules`, `/lesson-slots` |
| `notifications` | `/notifications`, `/email-preferences` |
| `reporting` | `/metrics` |

Every request needs a JWT in `Authorization: Bearer …`, except login, registration, token refresh, password reset and Google sign-in. Access is checked in the order token → role (`@Roles`) → permission (`@Permissions`), and on a task additionally by the member's `READ`/`WRITE`/`EXECUTE` rights.

## Scripts

| Script | What it does |
|---|---|
| `npm run start:dev` | start with watch mode |
| `npm run start:debug` | start with the inspector and watch mode |
| `npm run build` / `npm run start:prod` | build to `dist/` and run the build |
| `npm run seed` | fill the database from `prisma/seed.ts` |
| `npm run db:reset` | reset the database, apply all migrations and seed it again |
| `npm test` / `npm run test:watch` | unit tests (Jest) |
| `npm run test:coverage` | unit tests with the coverage thresholds from `package.json` |
| `npm run test:e2e` | E2E tests against the test database (see below) |
| `npm run lint` / `npm run lint:check` | ESLint with autofix / without, failing on any warning (as in CI) |
| `npm run format` | Prettier |
| `npm run knip` | report unused files, exports and dependencies |
| `npm run depcruise` | check the dependency rules |
| `npm run depcruise:contexts` | check for cycles between contexts |
| `npm run load-test` | load test of the main endpoints (`scripts/load-test.mjs`, see its header) |

`scripts/` also holds `backup.sh`, `restore.sh` and `restore-drill.sh`; how to use them is in the [main README](../README.md#backup-and-restore-runbook).

## Tests

- **Unit tests** (`src/**/*.spec.ts`) mock the database. CI enforces at least 90 % coverage for `auth.service.ts`, the JWT and local auth guards and `task.service.ts`, and 75 % for `users.service.ts` and `permissions.service.ts`.
- **E2E tests** (`test/*.e2e-spec.ts`) run the whole app with Supertest against a disposable PostgreSQL database. They cover every endpoint documented in the thesis with its happy path and its 400/401/403/404 cases.

```bash
docker compose -f docker-compose.test.yml up -d   # test database on port 5433
npm run test:e2e
docker compose -f docker-compose.test.yml down
```

Before the suite starts, the database from `.env.test` is reset with `prisma migrate reset --force` and filled from `prisma/test-seed.ts`. The setup refuses to run against a database whose name doesn't end in `_test`, so it never touches the one in `.env`.

## Database

- Schema: `prisma/schema.prisma`; migrations: `prisma/migrations/`.
- New migration: change the schema, then `npx prisma migrate dev --name <name>`.
- Production: `npx prisma migrate deploy`. Never run `npm run seed` there: the seed data and its demo logins are for development, demos and tests only.
- Browse the data: `npx prisma studio`.

## Contributors

- **Dražen Plavšić**
- **Ereny Micail**

## License

MIT, see [`LICENSE`](../LICENSE).
