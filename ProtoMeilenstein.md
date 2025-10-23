# Meilensteinplan für Diplomarbeit EffSync bis 10. April 2026

## Phase 1: Kickoff & Analyse (Okt 2025)
**Ziele:** Umfang präzisieren, Scope einfrieren, Rollen klären, Risikoliste anlegen.  
**Unterpunkte:**  
- Projektziele, Zielgruppe und Abgrenzungen schriftlich festhalten; Pflicht-/Kür-Features definieren.  
- Fragen an Betreuer vorbereiten: Hostingpflicht, Aufbewahrungsdauer von Tasks, Rechte-/Rollenmodell.  
- Architektur-Entscheidungen grob: Frontend (Vue3 + Bootstrap5), Backend (JS, REST), DB (Start json.db, Ziel PostgreSQL).  
- Sicherheitsziele festlegen: 2FA, Auth-Flow, Passwort-Policy, Datenaufbewahrung.  
- Projektplan und Kommunikationsregeln erstellen; Git-Branching-Strategie finalisieren.  

## Phase 2: UX/Architektur & Prototypen & API-Skelett (Nov 2025)
**Ziele:** Navigationskonzept, UI-Flows, Systemarchitektur und Datenmodell klar, Läuffähiges API-Skelet 
**Unterpunkte:**  
- Low-/Mid-Fidelity Wireframes für Start-Dashboard, Taskliste, Kalender (Jahr/Woche/Monat/Tag), Task-Detail, Profil, Chat.  
- Prototyp proto.html verfeinern; Komponentenbibliothek festlegen.  
- ERD-Entwurf: User, Rollen/Rechte, Groups/Teams, Tasks, Subtasks, Templates, Notifications, Files, ChatMessages, Audit. //TODO: Audit ergänzen!  
- API-Spezifikation (OpenAPI): Auth, Users, Tasks, Subtasks, Search, Templates, Notifications, Files, Chat.  
- Definition Ampelsystem (Priorität/Überfälligkeit) und Statusmodell.  
- Basis-Routen: Users, Profile, Teams/Groups, Tasks CRUD, Subtasks CRUD.  
- Unit-/API-Tests und CI-Checks einführen.  


## Phase 3a: Frontend Fundamentals (Dez 2025)
**Ziele:** Navigations-Frame, Auth-Flows, Grundseiten.  
**Unterpunkte:**  
- Vue3-Projekt-Setup: Routing, State-Management, API-Client, Komponentenstruktur, Theme.  
- Start-Dashboard Grundstruktur: Karten für Anzahl Aufgaben, Fortschritt, überfällig.  
- Auth-Views: Register, Login, Passwort ändern; Guarded Routes.  
- Taskliste mit Sortierung (Fälligkeit, Priorität), Filter, Suche (lokal).  
- Kalender-Layout: Jahr/Woche ersten Wurf; Monat/Tag Platzhalter.  

## Phase 3b: Kernfunktionen Tasks (Dez 2025)
**Ziele:** Basic Task-Workflow vollständig, Subtasks, Templates, Ampel.  
**Unterpunkte:**  
- Task erstellen/lesen/ändern/löschen; Pflichtfelder; Validierungen.  
- Priorität/Ampelsystem und Statuswechsel inkl. Ereignisse.  
- Templates erstellen/verwenden; beim Löschen Name bestätigen (Safety).
- Datenbank: Start mit json.db.
- Subtasks inkl. logischer Verknüpfungen AND/OR/XOR für automatisches Erledigen des Parent.  

## Phase 4: Backend Fundamentals & Usability-Tests (Jan 2026)
**Ziele:** Persistente Daten, Basis-Security, erfolgreiche Datenbankmigration, start von Usability-Tests
**Unterpunkte:**  
- Projekt-Setup Backend: Struktur, Settings, Logging, Env-Handling, Migrations.  
- Authentifizierung: Registrierung, Login.   
- Datenbank: PostgreSQL-Schema parallel vorbereiten; Migrationsskripte.
Sessions/Tokens; Passworthashing; Rate Limiting.
- Datei-Anhänge: Upload/Download/Öffnen; 25MB-Size-Limit; MIME-Checks.  
- Usability-Tests: mit Pilotnutzern (Schüler/Studierende und Lehrer).

## Phase 5a: Zusammenarbeit & Benachrichtigungen (Feb 2026)
**Ziele:** Teamwork nutzbar, Echtzeit-Feedback, Ereignisse.  
**Unterpunkte:**  
- Mitgliederverwaltung: Einladen, Rollenrechte (Owner, Manager, Member, Viewer).  
- In-App-Benachrichtigungen bei Änderungen, Kommentaren, Fälligkeit.  
- E-Mail-Benachrichtigungen: Fälligkeit, Erwähnungen, abgelaufene Tasks.  
- Automatisches Event nach Fälligkeit: Popup, E-Mail; Abgabe sperren/verlängern durch Ersteller.  
- Globale Suche über Tasks, Notes, Personen; Indexing-Strategie.  
- Automatisierung: Vorab definierte Abschlussregeln, Auto-Close bei Bedingungen.  
- Authentifizierung: Sessions/Tokens; Passworthashing; Rate Limiting.

## Phase 5b: Chat & Realtime (Feb 2026)
**Ziele:** Interne Kommunikation, private und Gruppen-Chats.  
**Unterpunkte:**  
- Realtime-Layer (WebSockets/SSE): Chat, Live-Notifications.  
- Private und Gruppenchat; Lesestatus, einfache Moderation.  
- Speicherung Chatverlauf: Retention-Policy definieren; DSGVO-Konzept; Export/Opt-Out.  

## Phase 6: Kalender & Dashboard Reifegrad (März 2026 - KW 10/11)
**Ziele:** Produktive Kalenderansichten, aussagekräftiges Dashboard.  
**Unterpunkte:**  
- Kalender Vollausbau: Jahr/Woche (Ereny), Monat/Tag (Drazen) mit Drag&Drop, Schnellaktionen.  
- Dashboard-Metriken: Gesamtanzahl, Statusverteilung, Fortschritt in %, überfällige Liste, Trends.  
- Events/Reminders konfigurieren; individuelle Sichtbarkeit (Personalization).  


## Phase 7: Sicherheit & Compliance (März 2026 – KW 11/12)
**Ziele:** Absicherung, Datenschutz, Rechteverwaltung final.  
**Unterpunkte:**  
- 2FA-Implementierung (TOTP/App-basiert); Recovery-Codes.  
- Rollen-/Rechteprüfung serverseitig durchgängig; Audit-Log (wer/was/wann).  
- Input-Validierung, CSRF/CORS/Headers, Datei-Scanning, sichere Links (pre-signed URLs).  
- Secrets-Management, HTTPS-Vorgaben, Content Security Policy.  
- Datenaufbewahrung: Task-Lebensdauer nach Abschluss (z. B. 1–2 Jahre) konfigurierbar.  
- Backup-/Restore-Strategie; Monitoring/Health-Checks.  

## Phase 8: Tests, Qualität, Migration (März 2026 – KW 13/14)
**Ziele:** Stabilität, messbare Qualität, PostgreSQL-Umstieg.  
**Unterpunkte:**  
- Testpyramide: Unit, API, E2E; Coverage-Ziele; Performance-Benchmarks (Suche, Kalender).  
- Usability-Tests: Auswertung.  
- Fehlerbudget und Bug-Triage; Release-Kriterien festlegen.  
- Migration von json.db auf PostgreSQL; Daten-Migrationstests und Rollback-Plan.  
- Accessibility-Checks (WCAG Basics), Internationalisierung Grundstruktur.  

## Phase 9: Deployment & Doku (bis 05. Apr 2026)
**Ziele:** Vorführbares System, vollständige Unterlagen.  
**Unterpunkte:**  
- Deployment-Option klären: Schulserver/Cloud/VPS; CI/CD Pipeline; Env-Config pro Umgebung.  
- Betriebsdoku: Setup, Env-Variablen, Start/Stop, Backup, Logs, Security-Hinweise.  
- Benutzerhandbuch: Kurzanleitung, Rollen, häufige Workflows, Troubleshooting.  
- Entwicklerdoku: Architektur, ERD, API (OpenAPI), Coding-Guidelines, Git-Workflow.  

## Phase 10: Abnahme & Präsentation (06. Apr – 10. Apr 2026)
**Ziele:** Freeze, Review, Demo, Abgabe.  
**Unterpunkte:**  
- Feature-Freeze, finaler Regressionstest, offene Punkte dokumentieren.  
- Abnahmeszenarien: Aufgabenanlage, Subtasks-Logik, Überfälligkeitsevents, Suche, Chat, 2FA, Datei-Limit.  
- Live-Demo-Skript mit realistischem Team-Case (Lehrer/Schüler und Firmen-Variante).  
- Diplomarbeit finalisieren (Overleaf): Abstract, Einleitung, Related Work (Jira, Smartsheet, Quickbase), Design/Architektur, Implementierung, Tests, Security, Diskussion, Fazit, Ausblick.  
- Pufferzeit für Betreuerfeedback vor Abgabe.  

## Laufende Querschnittsaufgaben
- Qualität: Code-Reviews, Linter/Formatter, CI bei jedem Merge.  
- Risiko-/Issue-Management: Wöchentliche Status-Meetings, Burndown, Scope-Guard.  
- Datenschutz: Minimierung personenbezogener Daten, klare Retention, Rechteauskunft.  
- Performance: Indizes, Pagination, Caching-Strategien für Suche/Kalender.  

## Verantwortlichkeiten
**Ereny:** Kalender Jahr/Woche, Start-Dashboard, Registrierung/Login, Events nach Fälligkeit (Frontend), In-App-Notifications, E-Mail-Events, Datei-Features, 2FA.  
**Drazen:** Kalender Monat/Tag, Tasks/Subtasks/Logik, globale Suche, Chat, Templates, Delete-Bestätigung, Automatisierungen, Unit-Test-Fortschritt, DB-Optimierungen.  
**Gemeinsam:** Architektur/ERD/API, PostgreSQL-Umstieg, Rollen-/Rechte, Deployment, Security-Doku, Tests, Diplomarbeit.  
