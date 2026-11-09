# EffSync: webbasiertes Taskmanagementsystem zur effizienten Organisation und Zusammenarbeit in Teams
![CI Status](https://github.com/kiDra94/diplom-arbeit/actions/workflows/ci.yml/badge.svg?branch=development)

🇬🇧 [English](README.md) · 🇩🇪 **Deutsch**

Software, die Einzelpersonen und Teams hilft, Aufgaben zu planen, zu organisieren, zu delegieren, zu verfolgen und abzuschließen, um Projekte und Arbeitsabläufe effizienter zu gestalten.

EffSync ist im Rahmen einer Diplomarbeit an der HTL BULME Graz entstanden. Die schriftliche Arbeit liegt im Ordner [`thesis/`](thesis/).

> [!NOTE]
> EffSync befindet sich noch in Entwicklung. Die Kernfunktionen laufen, weitere Features sind geplant – siehe die Status-Spalte in der [Feature-Liste](#features).

![Dashboard](documents/screenshots/dashboard.png)

## Screenshots

| Kalender | Chat |
|---|---|
| ![Kalender](documents/screenshots/calendar.png) | ![Chat](documents/screenshots/chat.png) |
| **Dokumente** | **Login** |
| ![Dokumente](documents/screenshots/documents.png) | ![Login](documents/screenshots/login.png) |

## Zielgruppe

- **Schule:** Schüler:innen und Lehrkräfte. Lehrkräfte erstellen Tasks für Klassen, Schüler:innen reichen Abgaben ein und werden bewertet.
- **Ausblick:** eine firmenorientierte Variante, in der Vorgesetzte Tasks bzw. Tickets für Mitarbeitende erzeugen. Der Hauptunterschied liegt darin, dass die Datenbank die Firmenstruktur abbilden muss.

## Features

Legende: ✅ umgesetzt · 🟡 teilweise umgesetzt · ❌ nicht umgesetzt

### Tasks

| Feature | Verantwortlich | Status |
|---|---|---|
| Tasks erstellen, bearbeiten, löschen | Drazen | ✅ |
| Subtasks in beliebiger Tiefe (mit Schutz vor Zirkelbezügen) | Drazen | ✅ |
| Sortieren nach Fälligkeit und Priorität, Filtern nach Status | Drazen | ✅ |
| Löschen nur nach Eingabe des Task-Titels (wie bei GitHub) | Drazen | ✅ |
| Task-Templates | Drazen | ✅ |
| Mitglieder zu Tasks hinzufügen (Rechte `READ`/`WRITE`/`EXECUTE`) | Ereny | ✅ |
| Logische Verknüpfung von Subtasks (AND, OR, XOR, NOT) für automatisches Abschließen des Parent-Tasks | Drazen | ✅ |
| Abgaben nach Ablauf der Deadline sperren bzw. Deadline verlängern (nur durch den Ersteller) | Ereny | ✅ |
| Bewertung von Abgaben durch Lehrkräfte | Ereny | ✅ |
| Tasks in verpflichtende und optionale Teile einteilen | – | ❌ |
| Task schließt automatisch nach _n_ erfolgreichen Abgaben (z. B. Code-Challenge) | Ereny | ❌ |
| Unit-Testergebnisse automatisch als Fortschritt übernehmen | Drazen | ❌ |

### Dashboard & Kalender

| Feature | Verantwortlich | Status |
|---|---|---|
| Dashboard mit Projektmetriken (Statusverteilung, Fortschritt, überfällige Tasks) | Ereny | ✅ |
| Kalender mit Jahres-, Monats-, Wochen- und Tagesansicht inkl. Stundenplan | Ereny / Drazen | ✅ |
| Personalisierung der Oberfläche (aktuell: Dark Mode und Kalendereinstellungen, keine frei wählbaren Elemente) | Drazen | 🟡 |
| Globale Suche (aktuell: Tasks, Notizen und Templates, noch keine Personen) | Drazen | 🟡 |

### Kommunikation & Benachrichtigungen

| Feature | Verantwortlich | Status |
|---|---|---|
| Live-Chat (privat und in Gruppen) über WebSockets | Drazen | ✅ |
| In-App-Benachrichtigungen bei Deadlines, überfälligen Tasks, Kommentaren und Erwähnungen | Ereny | ✅ |
| E-Mail-Benachrichtigungen (tägliche Deadline-Erinnerung, Erwähnungen, Kommentare) mit Einstellungen pro User | Ereny | ✅ |
| Eigene E-Mails bzw. Fragen an alle Mitglieder oder an selbst definierte Gruppen schicken | Ereny | ❌ |

### Dokumente

| Feature | Verantwortlich | Status |
|---|---|---|
| Dateien hochladen, an Tasks anhängen, im Browser öffnen, herunterladen | Ereny | ✅ |
| Dateigröße auf 25 MB begrenzt (Frontend und Backend) | Ereny | ✅ |
| Dokumente mit anderen Usern teilen | Ereny | ❌ |

### Benutzer & Sicherheit

| Feature | Verantwortlich | Status |
|---|---|---|
| Registrierung und Login (JWT) | Ereny | ✅ |
| Login mit Google (OAuth 2.0) und Passwort-Reset | Ereny | ✅ |
| Profilverwaltung (Name, Benutzername, E-Mail) | Ereny | ✅ |
| Rollen und Berechtigungen (RBAC) inkl. Admin-Oberfläche | Ereny | ✅ |
| Rate-Limiting und Security-Header (`@nestjs/throttler`, `helmet`) | Drazen / Ereny | ✅ |
| Zwei-Faktor-Authentifizierung (aktuell nur ein Button in den Einstellungen, ohne Funktion dahinter) | Ereny | ❌ |

### Schulverwaltung

| Feature | Verantwortlich | Status |
|---|---|---|
| Klassen, Abteilungen und Stundenpläne verwalten | Drazen / Ereny | ✅ |
| Notizen | Drazen / Ereny | ✅ |

## Tech-Stack

| Bereich | Technologien |
|---|---|
| Frontend | Vue 3, Vite, Pinia, Vue Router, Bootstrap 5, Chart.js, Socket.io-Client |
| Backend | NestJS 11 (TypeScript), Passport (JWT, Google OAuth 2.0), Socket.io, Nodemailer, Swagger |
| Datenbank | PostgreSQL mit Prisma 7 (Migrationen und Seed unter `backend/prisma/`) |
| Tests | Vitest und Cypress (Frontend), Jest inkl. E2E-Tests (Backend) |
| CI | GitHub Actions (Tests für Frontend und Backend bei jedem Push und PR) |
| Diplomarbeit | LaTeX (`thesis/main.tex`) |

## Projekt lokal starten

Voraussetzungen: Node.js 22 und eine laufende PostgreSQL-Datenbank.

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

In der `.env` mindestens diese Werte setzen:

- `DATABASE_URL`: z. B. `postgresql://postgres:postgres@localhost:5432/effsync?schema=public`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID` und `GOOGLE_CLIENT_SECRET`: nur für den Google-Login nötig, siehe [`documents/GOOGLE_OAUTH_SETUP.md`](documents/GOOGLE_OAUTH_SETUP.md)

Danach Datenbank anlegen, mit Testdaten befüllen und den Server starten:

```bash
npx prisma migrate dev
npm run seed
npm run start:dev
```

Die API läuft unter `http://localhost:3000/api`, die Swagger-Dokumentation ebenfalls unter `http://localhost:3000/api`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run frontend
```

Das Frontend läuft unter `http://localhost:5173`. Nach dem Seed kann man sich z. B. als Admin mit dem Benutzernamen `adminadmin` und dem Passwort `password123` anmelden.

### Produktion: HTTPS hinter einem Reverse Proxy

Im Produktivbetrieb (`NODE_ENV=production`) erwartet das Backend einen vorgeschalteten Reverse Proxy (z. B. nginx oder Traefik), der TLS terminiert und `X-Forwarded-Proto` setzt. Die App vertraut dem ersten Proxy, leitet jede Anfrage, die über unverschlüsseltes HTTP kam, mit `308` (Methode und Body bleiben erhalten) auf denselben Pfad unter `PUBLIC_URL` um, die öffentliche `https://`-Adresse des Backends, die im Produktivbetrieb Pflicht ist, und sendet HSTS-Header. Ohne einen solchen Proxy gilt jede Anfrage als HTTP und wird umgeleitet. Weil die App den Headern `X-Forwarded-For` und `X-Forwarded-Proto` des Proxys vertraut, darf der Backend-Port (3000) nur über den Proxy erreichbar sein, nicht veröffentlicht oder im Netz offen: sonst kann ein Client seine IP-Adresse am Rate Limit vorbei fälschen und die Umleitung umgehen. `THROTTLE_LIMIT` legt fest, wie viele Anfragen eine IP-Adresse pro Minute stellen darf (Standard 10); teilen sich die Benutzer eine öffentliche Adresse, etwa hinter dem NAT einer Schule, muss der Wert entsprechend höher sein.

### Tests

```bash
(cd backend  && npm test && npm run test:e2e)
(cd frontend && npm test && npm run test:e2e)
```

Weitere Details zum Backend stehen in [`backend/README.md`](backend/README.md).

## Dokumentation

- [Projektübersicht](documents/Projekt-Uebersicht.md)
- [Git-Workflow](documents/git-flow.md)
- [Rollen und Berechtigungen](documents/RBAC_ABAC.md)
- [ERD (dbdiagram.io)](https://dbdiagram.io/d/685e55b0f413ba3508290b48)

## Vergleichbare Systeme

- [Smartsheet](https://www.smartsheet.com/)
- [Quickbase](https://www.quickbase.com/)
- [Jira](https://www.atlassian.com/de/software/jira)
