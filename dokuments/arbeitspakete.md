# 🛠️ Arbeitspaketplan EffSync (Work Breakdown Structure)

Die Arbeitspakete sind direkt aus den `Unterpunkten` Ihrer Meilensteine abgeleitet und den Verantwortlichen zugeordnet.

---

## Phase 1: Kickoff & Analyse (Okt 2025) - **Gemeinsam**

| AP-ID | Arbeitspaket (AP) | Verantwortlich |
| :--- | :--- | :--- |
| AP 1.1 | Finalisierung Projekt-Scope (Ziele, Pflicht/Kür, Abgrenzungen) | Gemeinsam |
| AP 1.2 | Vorbereitung & Durchführung Betreuer-Gespräch (Hosting, Retention, Rollen) | Gemeinsam |
| AP 1.3 | Grobarchitektur-Entscheidungen festhalten (Vue3, Python-Backend, PostgreSQL) | Gemeinsam |
| AP 1.4 | Sicherheitsziele definieren (2FA, Auth-Flow, Policy, Datenaufbewahrung) | Gemeinsam |
| AP 1.5 | Projektplan, Kommunikationsregeln & Git-Strategie finalisieren | Gemeinsam |

---

## Phase 2: UX/Architektur & API-Skelett (Nov 2025) - **Gemeinsam**

| AP-ID | Arbeitspaket (AP) | Verantwortlich |
| :--- | :--- | :--- |
| AP 2.1 | Low-/Mid-Fidelity Wireframes erstellen (Dashboard, Taskliste, Kalender, Chat, Detail) | Gemeinsam |
| AP 2.2 | Prototyp proto.html verfeinern (mit Komponentenbibliothek) | Gemeinsam |
| AP 2.3 | **ERD-Entwurf** (User, Rollen, Tasks, Templates, Chat, Files, **Audit**) | Gemeinsam |
| AP 2.4 | API-Spezifikation (OpenAPI) entwerfen (Auth, Tasks, Users, Files, Chat) | Gemeinsam |
| AP 2.5 | Ampelsystem (Priorität) und Statusmodell definieren | Gemeinsam |
| AP 2.6 | Backend-Setup und Basis-Routen erstellen (Skelett für Users, Tasks, Groups) | Gemeinsam |
| AP 2.7 | Unit-/API-Tests und CI-Checks (Basisstruktur) einführen | Gemeinsam |

---

## Phase 3: Fundamentals (Dez 2025)

| AP-ID | Arbeitspaket (AP) | Verantwortlich |
| :--- | :--- | :--- |
| **3a - FE** | Vue3-Projekt-Setup (Routing, State, API-Client, Struktur, Theme) | Gemeinsam |
| **3a - FE** | Auth-Views & Guarded Routes implementieren (Register, Login, PW ändern) | Ereny |
| **3a - FE** | Start-Dashboard Grundstruktur (Karten für Metriken) | Ereny |
| **3a - FE** | Taskliste mit Sortierung/Filter/Suche (lokal) & Basis-Kalenderlayout (Jahr/Woche) | Ereny |
| **3b - Tasks** | Task-CRUD implementieren (Erstellen, Lesen, Ändern, Löschen) & Validierungen | Drazen |
| **3b - Tasks** | Task-Templates erstellen/verwenden; Löschbestätigung (Name) implementieren | Drazen |
| **3b - Tasks** | Priorität/Ampelsystem und Statuswechsel inkl. Ereignisse implementieren | Drazen |
| **3b - Tasks** | Subtasks inkl. logischer Verknüpfungen (AND/OR/XOR) | Drazen |
| **3b - DB** | Datenbank: Initialer Task-Workflow mit json.db realisieren | Drazen |

---

## Phase 4: Backend Fundamentals & Usability-Tests (Jan 2026)

| AP-ID | Arbeitspaket (AP) | Verantwortlich |
| :--- | :--- | :--- |
| **4.1 - BE** | Backend-Setup (Struktur, Settings, Logging, Env-Handling, Migrations) | Gemeinsam |
| **4.2 - Auth** | Authentifizierung (Registrierung/Login), Sessions/Tokens, Passworthashing | Ereny |
| **4.3 - DB** | PostgreSQL-Schema finalisieren und Migrationsskripte erstellen | Gemeinsam |
| **4.4 - Files** | Datei-Anhänge (Upload, Download, Öffnen, Limit: 25MB, MIME-Checks) | Ereny |
| **4.5 - Security** | Rate Limiting und grundlegende Sicherheitsmechanismen implementieren | Ereny |
| **4.6 - Test** | Konzeption & Start der Usability-Tests mit Pilotnutzern | Gemeinsam |

---

## Phase 5: Zusammenarbeit & Realtime (Feb 2026)

| AP-ID | Arbeitspaket (AP) | Verantwortlich |
| :--- | :--- | :--- |
| **5a - Team** | Mitgliederverwaltung (Einladen, Rollenrechte: Owner, Manager, Member, Viewer) | Gemeinsam |
| **5a - Noti** | In-App-Benachrichtigungen (Änderungen, Kommentare, Fälligkeit) | Ereny |
| **5a - Mail** | E-Mail-Benachrichtigungen (Fälligkeit, Erwähnungen, abgelaufene Tasks) | Ereny |
| **5a - Event** | Automatisches Event bei Fälligkeit (Logik: Popup, E-Mail, Sperren/Verlängern) | Ereny |
| **5a - Search**| Globale Suche (Tasks, Notes, Personen) & Indexing-Strategie | Drazen |
| **5a - Auto** | Task-Automatisierung (Vorab definierte Abschlussregeln, Auto-Close) | Drazen |
| **5b - RT** | Realtime-Layer (WebSockets/SSE) für Chat und Live-Notifications implementieren | Drazen |
| **5b - Chat** | Private und Gruppenchats implementieren | Drazen |
| **5b - Data** | Speicherung Chatverlauf, Retention-Policy, DSGVO-Konzept definieren | Gemeinsam |

---

## Phase 6: Kalender & Dashboard Reifegrad (März 2026 - KW 10/11)

| AP-ID | Arbeitspaket (AP) | Verantwortlich |
| :--- | :--- | :--- |
| AP 6.1 | Kalender Vollausbau: Jahr/Woche (mit Drag&Drop, Schnellaktionen) | Ereny |
| AP 6.2 | Kalender Vollausbau: Monat/Tag (mit Drag&Drop, Schnellaktionen) | Drazen |
| AP 6.3 | Dashboard-Metriken Vollausbau (Statusverteilung, Fortschritt in %, Trends) | Ereny |
| AP 6.4 | Events/Reminders konfigurieren und individuelle Sichtbarkeit implementieren | Drazen |

---

## Phase 7: Sicherheit & Compliance (März 2026 – KW 11/12)

| AP-ID | Arbeitspaket (AP) | Verantwortlich |
| :--- | :--- | :--- |
| AP 7.1 | **2FA-Implementierung** (TOTP/App-basiert) und Recovery-Codes | Ereny |
| AP 7.2 | Rollen-/Rechteprüfung serverseitig durchgängig & Audit-Log | Gemeinsam |
| AP 7.3 | Security-Härtung (Input-Validierung, CSRF/CORS/Headers, sichere Links) | Gemeinsam |
| AP 7.4 | Secrets-Management und HTTPS/CSP-Vorgaben umsetzen | Gemeinsam |
| AP 7.5 | Datenaufbewahrung (Task-Lebensdauer) konfigurierbar machen | Gemeinsam |
| AP 7.6 | Backup-/Restore-Strategie und Monitoring-Ansatz definieren | Gemeinsam |

---

## Phase 8: Tests, Qualität, Migration (März 2026 – KW 13/14)

| AP-ID | Arbeitspaket (AP) | Verantwortlich |
| :--- | :--- | :--- |
| AP 8.1 | Testpyramide finalisieren (Unit/API/E2E Coverage, Performance-Benchmarks) | Gemeinsam |
| AP 8.2 | Auswertung und Einarbeitung der Usability-Tests | Gemeinsam |
| AP 8.3 | Fehlerbudget, Bug-Triage und finale Release-Kriterien festlegen | Gemeinsam |
| AP 8.4 | **Migration von json.db auf PostgreSQL** (inkl. Migrationstests) | Gemeinsam |
| AP 8.5 | Accessibility-Checks (WCAG Basics) und Internationalisierung | Gemeinsam |

---

## Phase 9: Deployment & Doku (bis 05. Apr 2026) - **Gemeinsam**

| AP-ID | Arbeitspaket (AP) | Verantwortlich |
| :--- | :--- | :--- |
| AP 9.1 | Deployment-Option klären (Serverwahl) und CI/CD Pipeline aufsetzen | Gemeinsam |
| AP 9.2 | Betriebsdokumentation erstellen (Setup, Start/Stop, Backup, Security) | Gemeinsam |
| AP 9.3 | Benutzerhandbuch erstellen (Kurzanleitung, Workflows, Troubleshooting) | Gemeinsam |
| AP 9.4 | Entwicklerdokumentation finalisieren (Architektur, ERD, API, Code-Guidelines) | Gemeinsam |

---

## Phase 10: Abnahme & Präsentation (06. Apr – 10. Apr 2026) - **Gemeinsam**

| AP-ID | Arbeitspaket (AP) | Verantwortlich |
| :--- | :--- | :--- |
| AP 10.1 | Feature-Freeze, finaler Regressionstest und Dokumentation offener Punkte | Gemeinsam |
| AP 10.2 | Erstellung Live-Demo-Skript und Abnahmeszenarien | Gemeinsam |
| AP 10.3 | Diplomarbeit finalisieren (Inhalte: Related Work, Architektur, Implementierung, Tests, Diskussion, Fazit) | Gemeinsam |
| AP 10.4 | Pufferzeit für Betreuerfeedback und finale Abgabe nutzen | Gemeinsam |