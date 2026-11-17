# EffSync Frontend

The web app of EffSync, built with **Vue 3**, **Vite**, **Pinia**, **Vue Router** and **Bootstrap 5**. How to run the whole project is in the [main README](../README.md).

## Getting started

```bash
npm install
cp .env.example .env
npm run frontend          # http://localhost:5173, needs the backend on port 3000
```

After the backend's seed you can log in, for example, as Superuser `adminadmin` with the password `password123` (development only).

`VITE_API_URL` and `VITE_WS_URL` in `.env` point to the backend. Without them the app talks to its own origin, as behind a reverse proxy or through Vite's dev proxy (`vite.config.js` forwards `/api` and `/socket.io`). `src/config/urls.js` is the only module that knows these addresses.

**Without a backend:** `npm run dev` starts a `json-server` mock API (`mockdb.json`, port 3001) next to Vite. Set `VITE_DEV_MODE=true` in `.env` for it.

## Structure

```
src/
├── api/           the HTTP client (httpClient.js) and one module per backend area
├── stores/        Pinia stores: global ones (auth, settings, search, notifications, metrics)
│   └── entities/  entity stores (tasks, chats, documents, notes, users, ...)
├── views/         one component per route
├── components/    UI components, grouped by feature (tasks, chat, calendar, admin, ...)
├── composables/   shared logic (calendar, chat, task filters and validation)
├── router/        routes and the auth/role guards
└── config/        backend URLs, priorities
```

Data flows **view/component → store → `api/` → backend**. Views and components only render and call stores; they never import from `@/api/` or call `fetch` directly, which an ESLint `no-restricted-imports` rule enforces. There is exactly one axios instance (`src/api/httpClient.js`), which attaches the access token and refreshes it when it expires.

## Scripts

| Script | What it does |
|---|---|
| `npm run frontend` | Vite dev server on port 5173 |
| `npm run dev` | dev server plus the `json-server` mock API |
| `npm run build` / `npm run preview` | production build to `dist/` and a local preview of it |
| `npm test` / `npm run test:ui` | Vitest in watch mode / with its browser UI |
| `npm run test:coverage` | Vitest once, with the coverage thresholds from `vite.config.js` |
| `npm run test:e2e` / `npm run test:e2e:open` | Cypress headless / interactive, against the running dev server |
| `npm run lint` / `npm run lint:fix` | ESLint without / with autofix |
| `npm run knip` | report unused files, exports and dependencies |

## Tests

- **Component and store tests** (Vitest, `*.spec.js` next to the code). CI enforces at least 90 % coverage for `authStore.js`, `taskStore.js` and `httpClient.js`, and 75 % for the router guards.
- **Cypress** (`cypress/e2e/`): task creation, documents, notifications, e-mail preferences and the Google sign-in callback; most specs stub the API with `cy.intercept`. Start `npm run frontend` first.

## License

MIT, see [`LICENSE`](../LICENSE).
