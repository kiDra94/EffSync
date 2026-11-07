# EffSync: web-based task management system for efficient organization and collaboration in teams
![CI Status](https://github.com/kiDra94/diplom-arbeit/actions/workflows/ci.yml/badge.svg?branch=development)

🇬🇧 **English** · 🇩🇪 [Deutsch](README.de.md)

Software that helps individuals and teams plan, organize, delegate, track and complete tasks, making projects and workflows more efficient.

EffSync was built as a diploma thesis project at HTL BULME Graz (Austria). The written thesis (in German) is located in [`thesis/`](thesis/).

> [!NOTE]
> EffSync is still under active development. The core features are working, others are still planned – see the status column in the [feature list](#features).

![Dashboard](documents/screenshots/dashboard.png)

## Screenshots

| Calendar | Chat |
|---|---|
| ![Calendar](documents/screenshots/calendar.png) | ![Chat](documents/screenshots/chat.png) |
| **Documents** | **Login** |
| ![Documents](documents/screenshots/documents.png) | ![Login](documents/screenshots/login.png) |

## Target audience

- **Schools:** students and teachers. Teachers create tasks for classes, students hand in submissions and get graded.
- **Outlook:** a company-oriented version in which managers create tasks or tickets for employees. The main difference is that the database has to represent the company structure.

## Features

Legend: ✅ implemented · 🟡 partially implemented · ❌ not implemented

### Tasks

| Feature | Responsible | Status |
|---|---|---|
| Create, edit and delete tasks | Drazen | ✅ |
| Subtasks of arbitrary depth (with protection against circular references) | Drazen | ✅ |
| Sort by due date and priority, filter by status | Drazen | ✅ |
| Deleting requires typing the task title (like on GitHub) | Drazen | ✅ |
| Task templates | Drazen | ✅ |
| Add members to tasks (permissions `READ`/`WRITE`/`EXECUTE`) | Ereny | ✅ |
| Logical combination of subtasks (AND, OR, XOR, NOT) to automatically complete the parent task | Drazen | ✅ |
| Lock submissions after the deadline or extend the deadline (creator only) | Ereny | ✅ |
| Grading of submissions by teachers | Ereny | ✅ |
| Split tasks into required and optional parts | – | ❌ |
| Task closes automatically after _n_ successful submissions (e.g. coding challenge) | Ereny | ❌ |
| Automatically use unit test results as progress | Drazen | ❌ |

### Dashboard & calendar

| Feature | Responsible | Status |
|---|---|---|
| Dashboard with project metrics (status distribution, progress, overdue tasks) | Ereny | ✅ |
| Calendar with year, month, week and day view incl. timetable | Ereny / Drazen | ✅ |
| UI personalization (currently: dark mode and calendar settings, no freely selectable elements) | Drazen | 🟡 |
| Global search (currently: tasks, notes and templates, no people yet) | Drazen | 🟡 |

### Communication & notifications

| Feature | Responsible | Status |
|---|---|---|
| Live chat (direct and group) via WebSockets | Drazen | ✅ |
| In-app notifications for deadlines, overdue tasks, comments and mentions | Ereny | ✅ |
| Email notifications (daily deadline reminder, mentions, comments) with per-user settings | Ereny | ✅ |
| Send custom emails or questions to all members or to self-defined groups | Ereny | ❌ |

### Documents

| Feature | Responsible | Status |
|---|---|---|
| Upload files, attach them to tasks, open them in the browser, download | Ereny | ✅ |
| File size limited to 25 MB (frontend and backend) | Ereny | ✅ |
| Share documents with other users | Ereny | ❌ |

### Users & security

| Feature | Responsible | Status |
|---|---|---|
| Registration and login (JWT) | Ereny | ✅ |
| Sign in with Google (OAuth 2.0) and password reset | Ereny | ✅ |
| Profile management (name, username, email) | Ereny | ✅ |
| Roles and permissions (RBAC) incl. admin interface | Ereny | ✅ |
| Rate limiting and security headers (`@nestjs/throttler`, `helmet`) | Drazen / Ereny | ✅ |
| Two-factor authentication (currently only a button in the settings, with no functionality behind it) | Ereny | ❌ |

### School administration

| Feature | Responsible | Status |
|---|---|---|
| Manage classes, departments and timetables | Drazen / Ereny | ✅ |
| Notes | Drazen / Ereny | ✅ |

## Tech stack

| Area | Technologies |
|---|---|
| Frontend | Vue 3, Vite, Pinia, Vue Router, Bootstrap 5, Chart.js, Socket.io client |
| Backend | NestJS 11 (TypeScript), Passport (JWT, Google OAuth 2.0), Socket.io, Nodemailer, Swagger |
| Database | PostgreSQL with Prisma 7 (migrations and seed in `backend/prisma/`) |
| Testing | Vitest and Cypress (frontend), Jest incl. E2E tests (backend) |
| CI | GitHub Actions (frontend and backend tests on every push and PR) |
| Thesis | LaTeX (`thesis/main.tex`) |

## Running the project locally

Requirements: Node.js 22 and a running PostgreSQL database.

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Set at least these values in `.env`:

- `DATABASE_URL`: e.g. `postgresql://postgres:postgres@localhost:5432/effsync?schema=public`
- `JWT_SECRET` (required: the backend refuses to start without it and without `DATABASE_URL`)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: only needed for Google sign-in, see [`documents/GOOGLE_OAUTH_SETUP.md`](documents/GOOGLE_OAUTH_SETUP.md)

Then create the database, fill it with test data and start the server:

```bash
npx prisma migrate dev
npm run seed
npm run start:dev
```

The API runs at `http://localhost:3000/api`, and the Swagger documentation is served at the same URL.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run frontend
```

The frontend runs at `http://localhost:5173`. After seeding you can log in, for example as admin with the username `adminadmin` and the password `password123`.

> The seed data (`backend/prisma/seed.ts` and `backend/prisma/test-seed.ts`), including the demo login above, is for development, demos and tests only. Never seed a production database with it.

### Authentication and CSRF

The API authenticates with a JWT that the frontend sends in the `Authorization: Bearer …` header. No endpoint sets an auth cookie, so a request from another site can't carry the user's credentials; this is the CSRF protection (by design, no CSRF tokens needed). CORS only allows the origin in `FRONTEND_URL`. Login accepts the username or the e-mail address. After Google sign-in, the token arrives in the URL fragment (`/auth-callback#token=…`), which browsers never send to a server; the frontend removes it from the address bar and loads the user from `GET /api/auth/profile`.

### Tests

```bash
(cd backend  && npm test)
(cd frontend && npm test && npm run test:e2e)
```

The backend E2E tests run against their own disposable PostgreSQL database, never against the one in `backend/.env`. Before the suite starts, they reset that database with `prisma migrate reset --force` and fill it from `prisma/test-seed.ts`:

```bash
cd backend
docker compose -f docker-compose.test.yml up -d   # test database on port 5433
npm run test:e2e
docker compose -f docker-compose.test.yml down
```

The connection is configured in `backend/.env.test`. The setup refuses to run against a database whose name doesn't end in `_test`.

More details on the backend can be found in [`backend/README.md`](backend/README.md).

## Documentation

The project documentation in `documents/` is written in German.

- [Project overview](documents/Projekt-Uebersicht.md)
- [Git workflow](documents/git-flow.md)
- [Roles and permissions](documents/RBAC_ABAC.md)
- [ERD (dbdiagram.io)](https://dbdiagram.io/d/685e55b0f413ba3508290b48)

## Similar systems

- [Smartsheet](https://www.smartsheet.com/)
- [Quickbase](https://www.quickbase.com/)
- [Jira](https://www.atlassian.com/de/software/jira)
