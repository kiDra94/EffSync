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
| Mitglieder zu Tasks hinzufügen, mit Rechten `READ`/`WRITE`/`EXECUTE` pro Task, die auch für seine Subtasks gelten | Ereny / Drazen | ✅ |
| Private Tasks: Lehrkräfte und Schüler:innen sehen nur die Tasks, an denen sie beteiligt sind, Admins sehen alle | Drazen | ✅ |
| Logische Verknüpfung von Subtasks (AND, OR, XOR, NOT) für automatisches Abschließen des Parent-Tasks | Drazen | ✅ |
| Abgaben nach Ablauf der Deadline sperren bzw. Deadline verlängern (nur durch den Ersteller) | Ereny | ✅ |
| Bewertung von Abgaben durch Lehrkräfte | Ereny | ✅ |
| Notenansicht für Schüler:innen, Bewertungsbemerkungen in der Task-Detailansicht | Ereny / Drazen | ✅ |
| Kommentare zu Tasks mit @Erwähnungen | Drazen | ✅ |
| Aktivitätsprotokoll für jede Task-Änderung, mit Audit-Log-Ansicht für Admins | Drazen | ✅ |
| Tasks in verpflichtende und optionale Teile einteilen | – | ❌ |
| Task schließt automatisch nach _n_ erfolgreichen Abgaben (z. B. Code-Challenge) | Ereny | ❌ |
| Unit-Testergebnisse automatisch als Fortschritt übernehmen | Drazen | ❌ |

### Dashboard & Kalender

| Feature | Verantwortlich | Status |
|---|---|---|
| Dashboard mit Projektmetriken (Statusverteilung, Fortschritt, überfällige Tasks) | Ereny | ✅ |
| Kalender mit Jahres-, Monats-, Wochen- und Tagesansicht inkl. Stundenplan | Ereny / Drazen | ✅ |
| Personalisierung der Oberfläche (aktuell: Dark Mode, pro User gespeichert, und Kalendereinstellungen; keine frei wählbaren Elemente) | Drazen | 🟡 |
| Globale Suche über Projekte, Tasks, Notizen, Templates und User, nach Kategorie gruppiert | Drazen | ✅ |

### Kommunikation & Benachrichtigungen

| Feature | Verantwortlich | Status |
|---|---|---|
| Live-Chat (privat und in Gruppen) über WebSockets | Drazen | ✅ |
| Chats, die mit einem Task oder einer Klasse verknüpft sind; zwei User haben immer genau einen Privatchat | Drazen | ✅ |
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
| Registrierung und Login (JWT mit Refresh-Tokens und Logout) | Ereny / Drazen | ✅ |
| Login mit Google (OAuth 2.0) und Passwort-Reset per E-Mail | Ereny / Drazen | ✅ |
| Profilverwaltung (Name, Benutzername, E-Mail), Passwort ändern und Profilbild | Ereny / Drazen | ✅ |
| Rollen und Berechtigungen (RBAC) inkl. Admin-Oberfläche | Ereny | ✅ |
| Benutzerverwaltung für Admins (anlegen, bearbeiten, löschen; gelöschte Konten werden DSGVO-konform anonymisiert) | Drazen | ✅ |
| Systemkonfiguration für den Superuser: welche Berechtigungen jede Rolle hat | Drazen | ✅ |
| Rate-Limiting und Security-Header (`@nestjs/throttler`, `helmet`) | Drazen / Ereny | ✅ |
| Zwei-Faktor-Authentifizierung (TOTP mit Authenticator-App, Zurücksetzen durch Admins) | Ereny | ✅ |

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
| CI | GitHub Actions bei jedem Push und PR: Lint, ungenutzter Code (`knip`), Abhängigkeitsregeln (`dependency-cruiser`), Unit-Tests mit Coverage-Schwellen, Build, Backend-E2E-Tests und die Restore-Probe |
| Diplomarbeit | LaTeX (`thesis/main.tex`) |

## Architektur

Das Backend ist nach fachlichen Domänen aufgebaut, nicht nach Datenbanktabellen: Jeder **Bounded Context** liegt in `backend/src/contexts/<context>/`, und `backend/src/shared/` enthält, was alle gemeinsam nutzen (Prisma-Client, Unit of Work, Konfigurationsprüfung, Socket.io-Transport).

| Context | Zuständig für |
|---|---|
| `identity-access` | Login, Tokens, 2FA, User, Rollen und Berechtigungen, Guards |
| `task-management` | Tasks, Mitglieder und ihre Rechte, Templates, Kommentare, Bewertungsbemerkungen, Aktivitätsprotokoll |
| `communication` | Chaträume und Nachrichten |
| `documents-notes` | Dokumente (inkl. Bewertung) und Notizen |
| `school-organization` | Klassen, Abteilungen, Fächer, Räume, Stundenpläne, Unterrichtseinheiten |
| `notifications` | In-App-Benachrichtigungen, E-Mail und ihre Einstellungen, Cronjobs |
| `reporting` | Dashboard-Metriken |

Jeder Context hat die Schichten `domain/`, `application/`, `infrastructure/` und `presentation/`. Ein anderer Context wird nur über seine `application/index.ts` angesprochen, und eine Task-Änderung wird mit ihrem Eintrag im Aktivitätsprotokoll in einer Transaktion gespeichert. `dependency-cruiser` prüft diese Regeln in der CI. Details (Englisch): [`backend/src/contexts/README.md`](backend/src/contexts/README.md).

Das Frontend hält die Daten in Pinia-Stores (`frontend/src/stores/`), die den einzigen HTTP-Client in `frontend/src/api/` nutzen; Views und Komponenten rufen die API nie direkt auf, was eine ESLint-Regel sicherstellt.

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
- `JWT_SECRET` (Pflicht: Ohne ihn und ohne `DATABASE_URL` startet das Backend nicht)
- `TWO_FACTOR_ENCRYPTION_KEY` (Pflicht): 64 Hex-Zeichen, z. B. von `openssl rand -hex 32`; es verschlüsselt die 2FA-Geheimnisse
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

Das Frontend läuft unter `http://localhost:5173`. Nach dem Seed kann man sich z. B. als Superuser mit dem Benutzernamen `adminadmin` und dem Passwort `password123` anmelden.

> Die Seed-Daten (`backend/prisma/seed.ts` und `backend/prisma/test-seed.ts`), samt dem Demo-Login oben, sind nur für Entwicklung, Demos und Tests gedacht. Eine Produktivdatenbank nie damit befüllen.

### Authentifizierung und CSRF

Die API authentifiziert mit einem JWT, den das Frontend im Header `Authorization: Bearer …` mitschickt. Kein Endpunkt setzt ein Auth-Cookie, daher kann eine Anfrage von einer fremden Seite die Zugangsdaten des Users nicht mitsenden; das ist der CSRF-Schutz (by design, CSRF-Tokens sind nicht nötig). CORS lässt nur den Origin aus `FRONTEND_URL` zu. Der Login akzeptiert den Benutzernamen oder die E-Mail-Adresse. Nach dem Google-Login kommt der Token im URL-Fragment an (`/auth-callback#token=…`), das Browser nie an einen Server schicken; das Frontend entfernt ihn aus der Adressleiste und lädt den User über `GET /api/auth/profile`.

### Produktion: HTTPS hinter einem Reverse Proxy

Im Produktivbetrieb (`NODE_ENV=production`) erwartet das Backend einen vorgeschalteten Reverse Proxy (z. B. nginx oder Traefik), der TLS terminiert und `X-Forwarded-Proto` setzt. Die App vertraut dem ersten Proxy, leitet jede Anfrage, die über unverschlüsseltes HTTP kam, mit `308` (Methode und Body bleiben erhalten) auf denselben Pfad unter `PUBLIC_URL` um, die öffentliche `https://`-Adresse des Backends, die im Produktivbetrieb Pflicht ist, und sendet HSTS-Header. Ohne einen solchen Proxy gilt jede Anfrage als HTTP und wird umgeleitet. Weil die App den Headern `X-Forwarded-For` und `X-Forwarded-Proto` des Proxys vertraut, darf der Backend-Port (3000) nur über den Proxy erreichbar sein, nicht veröffentlicht oder im Netz offen: sonst kann ein Client seine IP-Adresse am Rate Limit vorbei fälschen und die Umleitung umgehen. `THROTTLE_LIMIT` legt fest, wie viele Anfragen eine IP-Adresse pro Minute stellen darf (Standard 10); teilen sich die Benutzer eine öffentliche Adresse, etwa hinter dem NAT einer Schule, muss der Wert entsprechend höher sein.

### Backup und Wiederherstellung (Runbook)

Backup und Wiederherstellung (UC-41) sind Aufgabe des Superusers: Er führt diese Skripte als Betreiber des Servers aus; eine Backup-Funktion in der App gibt es nicht (Entscheidung Q7). Die Skripte erstellen einen vollständigen logischen Dump im Custom-Format von PostgreSQL (`documents/AP7-6.md`). Sie brauchen die PostgreSQL-Client-Werkzeuge mindestens in der Hauptversion des Servers (17); `PG_BINDIR` zeigt auf sie, falls eine andere Version zuerst im `PATH` steht. `DATABASE_URL` ist die des Backends.

**Sichern** (täglich, z. B. mit einem systemd-Timer oder cron):

```bash
cd backend
DATABASE_URL=postgresql://… BACKUP_DIR=/var/backups/effsync BACKUP_KEEP_DAYS=14 scripts/backup.sh
```

Es schreibt `effsync-<UTC-Zeit>.dump` (standardmäßig nach `backend/backups`, das git ignoriert), nur für den Eigentümer lesbar, liest das ganze Archiv zur Prüfung wieder, löscht die Dumps in diesem Ordner, die älter als `BACKUP_KEEP_DAYS` Tage sind, und gibt den Dateinamen aus. Das Passwort aus `DATABASE_URL` geht als `PGPASSWORD` an die PostgreSQL-Werkzeuge, nicht über die Kommandozeile. Die Dumps zusätzlich vom Server wegkopieren (z. B. mit `rclone`); ein Dump auf derselben Platte übersteht deren Ausfall nicht. Bei einem Dump pro Tag gehen höchstens die Daten eines Tages verloren (RPO 24 h).

**Wiederherstellen:**

1. Das Backend stoppen, damit während der Wiederherstellung niemand schreibt.
2. `DATABASE_URL=postgresql://… scripts/restore.sh /var/backups/effsync/effsync-<Zeit>.dump` ausführen; es zeigt Datenbank und Server und verlangt zur Bestätigung den Datenbanknamen. Das Schema `public` wird mit allem darin gelöscht, auch Tabellen späterer Migrationen, und aus dem Dump neu angelegt, in einer Transaktion: Entweder ist die Datenbank danach der Dump, oder nichts ändert sich.
3. Das Backend in der Version des Backups starten (seine Migrationen müssen zum Dump passen), dann anmelden und einige Aufgaben prüfen.

**Probe:** Die CI führt `scripts/restore-drill.sh` bei jedem Pull Request und Push auf `main` und `development` aus: Es sichert die befüllte Testdatenbank, stellt sie in einer frischen wieder her und vergleicht Schema, Daten (samt Sequenzen) und die Zeilenzahl jeder Tabelle, prüft, dass eine Wiederherstellung ohne Bestätigung nichts schreibt, und stellt sie noch einmal über geänderte Daten und eine neuere Tabelle her. Es läuft nur auf einer Datenbank, deren Name auf `_test` endet. Lokal: `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/effsync_test scripts/restore-drill.sh` bei laufender Testdatenbank.

### Zwei-Faktor-Authentifizierung

Benutzer schalten 2FA in ihrem Profil (Reiter Sicherheit) ein: Das Backend erzeugt ein TOTP-Geheimnis und zeigt es als QR-Code für eine Authenticator-App (z. B. Google Authenticator); der erste 6-stellige Code schaltet es ein. Danach beantwortet `POST /api/auth/login` ein richtiges Passwort mit `{ two_factor_required: true, challenge_token }` statt mit Tokens, und `POST /api/auth/2fa/verify` mit der Challenge und dem aktuellen Code liefert Access- und Refresh-Token; ein falscher Code ergibt `401`, nach 5 Minuten verfällt die Challenge (neu anmelden). Jeder Code gilt einmal, und nach fünf falschen Codes hintereinander ist die Prüfung 15 Minuten gesperrt. Die Anmeldung mit Google fragt den Code genauso ab. Das Einschalten von 2FA beendet die anderen Sitzungen des Benutzers.

Die Geheimnisse werden mit `TWO_FACTOR_ENCRYPTION_KEY` verschlüsselt gespeichert (AES-256-GCM). Den Schlüssel getrennt von den Datenbank-Dumps sichern: Ohne ihn lässt sich die 2FA einer wiederhergestellten Datenbank nicht lesen, und jeder Benutzer muss sie zurücksetzen lassen.

**Zurücksetzen durch einen Admin** (Handy verloren, Wiederherstellungscodes gibt es nicht): Ein Admin mit `manage_users` ruft `DELETE /api/users/<id>/two-factor` auf; der Benutzer meldet sich dann nur mit dem Passwort an und kann 2FA neu einrichten. Ohne die API kann der Betreiber dasselbe in der Datenbank tun: `DELETE FROM user_two_factor WHERE user_id = <id>;`.

### Tests

```bash
(cd backend  && npm test)
(cd frontend && npm test && npm run test:e2e)
```

Die Backend-E2E-Tests laufen gegen eine eigene, wegwerfbare PostgreSQL-Datenbank, nie gegen die aus `backend/.env`. Vor dem Start setzen sie diese Datenbank mit `prisma migrate reset --force` zurück und befüllen sie aus `prisma/test-seed.ts`:

```bash
cd backend
docker compose -f docker-compose.test.yml up -d   # Testdatenbank auf Port 5433
npm run test:e2e
docker compose -f docker-compose.test.yml down
```

Die Verbindung steht in `backend/.env.test`. Das Setup verweigert den Lauf gegen eine Datenbank, deren Name nicht auf `_test` endet.

Weitere Details zum Backend stehen in [`backend/README.md`](backend/README.md).

## Dokumentation

- [Projektübersicht](documents/Projekt-Uebersicht.md)
- [Git-Workflow](documents/git-flow.md)
- [Rollen und Berechtigungen](documents/RBAC_ABAC.md)
- [ERD (dbdiagram.io)](https://dbdiagram.io/d/685e55b0f413ba3508290b48)

Das Backend-Refactoring, das den Code an die Diplomarbeit angeglichen hat, ist auf Englisch dokumentiert:

- [GOALS.md](GOALS.md): Zielarchitektur, Meilensteine und Entscheidungen
- [PROGRESS.md](PROGRESS.md): was jeder Meilenstein geändert hat und wie es geprüft wurde
- [THESIS_ALIGNMENT.md](THESIS_ALIGNMENT.md): jede Aussage der Diplomarbeit mit ihrem Stand im Code
- [UNUSED_CODE.md](UNUSED_CODE.md): ungenutzter Code, der entfernt oder umgesetzt wurde

## Vergleichbare Systeme

- [Smartsheet](https://www.smartsheet.com/)
- [Quickbase](https://www.quickbase.com/)
- [Jira](https://www.atlassian.com/de/software/jira)

## Lizenz

Copyright © 2025–2026 Dražen Plavšić, Ereny Micail

- **Quellcode** (`backend/`, `frontend/` und alles, was unten nicht genannt ist): [MIT](LICENSE)
- **Diplomarbeit, Dokumentation und Logos** (`thesis/`, `documents/`, `logos/`): [CC BY-NC-ND 4.0](LICENSE-CC-BY-NC-ND-4.0.txt). Weitergabe mit Namensnennung ist erlaubt, aber nicht kommerziell und nicht in veränderter Form.
