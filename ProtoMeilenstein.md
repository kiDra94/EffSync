# Meilensteinplan für Diplomarbeit WorkSync bis 1. Mai 2026

## Phase 1: Kickoff & Analyse (Okt 2025)
**Ziele:** Umfang präzisieren, Scope einfrieren, Rollen klären, Risikoliste anlegen.  
**Unterpunkte:**  
- Projektziele, Zielgruppe und Abgrenzungen schriftlich festhalten; Pflicht-/Kür-Features definieren.  
- Fragen an Betreuer vorbereiten: Hostingpflicht, Aufbewahrungsdauer von Tasks, Rechte-/Rollenmodell.  
- Architektur-Entscheidungen grob: Frontend (Vue3 + Bootstrap5), Backend (Python, REST), DB (Start json.db, Ziel PostgreSQL).  
- Sicherheitsziele festlegen: 2FA, Auth-Flow, Passwort-Policy, Datenaufbewahrung.  
- Projektplan und Kommunikationsregeln erstellen; Git-Branching-Strategie finalisieren.  

## Phase 2: UX/Architektur & Prototypen (Nov 2025)
**Ziele:** Navigationskonzept, UI-Flows, Systemarchitektur und Datenmodell klar.  
**Unterpunkte:**  
- Low-/Mid-Fidelity Wireframes für Start-Dashboard, Taskliste, Kalender (Jahr/Woche/Monat/Tag), Task-Detail, Profil, Chat.  
- Prototyp proto.html verfeinern; Komponentenbibliothek festlegen.  
- ERD-Entwurf: User, Rollen/Rechte, Groups/Teams, Tasks, Subtasks, Templates, Notifications, Files, ChatMessages, Audit.  
- API-Spezifikation (OpenAPI): Auth, Users, Tasks, Subtasks, Search, Templates, Notifications, Files, Chat.  
- Definition Ampelsystem (Priorität/Überfälligkeit) und Statusmodell.  

## Phase 3: Backend Fundamentals (Dez 2025)
**Ziele:** Läuffähiges API-Skelett, persistente Daten, Basis-Security.  
**Unterpunkte:**  
- Projekt-Setup Backend: Struktur, Settings, Logging, Env-Handling, Migrations.  
- Authentifizierung: Registrierung, Login, Sessions/Tokens; Passworthashing; Rate Limiting.  
- Datenbank: Start mit json.db für schnelle Iteration; PostgreSQL-Schema parallel vorbereiten; Migrationsskripte.  
- Basis-Routen: Users, Profile, Teams/Groups, Tasks CRUD, Subtasks CRUD.  
- Unit-/API-Tests und CI-Checks einführen.  

## Phase 4: Frontend Fundamentals (Jan 2026)
**Ziele:** Navigations-Frame, Auth-Flows, Grundseiten.  
**Unterpunkte:**  
- Vue3-Projekt-Setup: Routing, State-Management, API-Client, Komponentenstruktur, Theme.  
- Auth-Views: Register, Login, Passwort ändern; Guarded Routes.  
- Start-Dashboard Grundstruktur: Karten für Anzahl Aufgaben, Fortschritt, überfällig.  
- Taskliste mit Sortierung (Fälligkeit, Priorität), Filter, Suche (lokal).  
- Kalender-Layout: Jahr/Woche ersten Wurf; Monat/Tag Platzhalter.  

## Phase 5: Kernfunktionen Tasks (Feb 2026)
**Ziele:** Task-Workflow vollständig, Subtasks, Templates, Ampel.  
**Unterpunkte:**  
- Task erstellen/lesen/ändern/löschen; Pflichtfelder; Validierungen.  
- Subtasks inkl. logischer Verknüpfungen AND/OR/XOR für automatisches Erledigen des Parent.  
- Priorität/Ampelsystem und Statuswechsel inkl. Ereignisse.  
- Templates erstellen/verwenden; beim Löschen Name bestätigen (Safety).  
- Datei-Anhänge: Upload/Download/Öffnen; 25MB-Size-Limit; MIME-Checks.  

## Phase 6: Zusammenarbeit & Benachrichtigungen (Mär 2026)
**Ziele:** Teamwork nutzbar, Echtzeit-Feedback, Ereignisse.  
**Unterpunkte:**  
- Mitgliederverwaltung: Einladen, Rollenrechte (Owner, Manager, Member, Viewer).  
- In-App-Benachrichtigungen bei Änderungen, Kommentaren, Fälligkeit.  
- E-Mail-Benachrichtigungen: Fälligkeit, Erwähnungen, abgelaufene Tasks.  
- Automatisches Event nach Fälligkeit: Popup, E-Mail; Abgabe sperren/verlängern durch Ersteller.  
- Globale Suche über Tasks, Notes, Personen; Indexing-Strategie.  
- Automatisierung: Vorab definierte Abschlussregeln, Auto-Close bei Bedingungen.  

## Phase 7: Kalender & Dashboard Reifegrad (spätes Mär – frühes Apr 2026)
**Ziele:** Produktive Kalenderansichten, aussagekräftiges Dashboard.  
**Unterpunkte:**  
- Kalender Vollausbau: Jahr/Woche (Ereny), Monat/Tag (Drazen) mit Drag&Drop, Schnellaktionen.  
- Dashboard-Metriken: Gesamtanzahl, Statusverteilung, Fortschritt in %, überfällige Liste, Trends.  
- Events/Reminders konfigurieren; individuelle Sichtbarkeit (Personalization).  

## Phase 8: Chat & Realtime (Anfang Apr 2026)
**Ziele:** Interne Kommunikation, private und Gruppen-Chats.  
**Unterpunkte:**  
- Realtime-Layer (WebSockets/SSE): Chat, Live-Notifications.  
- Private und Gruppenchat; Lesestatus, einfache Moderation.  
- Speicherung Chatverlauf: Retention-Policy definieren; DSGVO-Konzept; Export/Opt-Out.  

## Phase 9: Sicherheit & Compliance (Apr 2026 – KW 14/15)
**Ziele:** Absicherung, Datenschutz, Rechteverwaltung final.  
**Unterpunkte:**  
- 2FA-Implementierung (TOTP/App-basiert); Recovery-Codes.  
- Rollen-/Rechteprüfung serverseitig durchgängig; Audit-Log (wer/was/wann).  
- Input-Validierung, CSRF/CORS/Headers, Datei-Scanning, sichere Links (pre-signed URLs).  
- Secrets-Management, HTTPS-Vorgaben, Content Security Policy.  
- Datenaufbewahrung: Task-Lebensdauer nach Abschluss (z. B. 1–2 Jahre) konfigurierbar.  
- Backup-/Restore-Strategie; Monitoring/Health-Checks.  

## Phase 10: Tests, Qualität, Migration (Apr 2026 – KW 15/16)
**Ziele:** Stabilität, messbare Qualität, PostgreSQL-Umstieg.  
**Unterpunkte:**  
- Testpyramide: Unit, API, E2E; Coverage-Ziele; Performance-Benchmarks (Suche, Kalender).  
- Usability-Tests mit Pilotnutzern (Schüler/Studierende; Firmen-Use-Case Light).  
- Fehlerbudget und Bug-Triage; Release-Kriterien festlegen.  
- Migration von json.db auf PostgreSQL; Daten-Migrationstests und Rollback-Plan.  
- Accessibility-Checks (WCAG Basics), Internationalisierung Grundstruktur.  

## Phase 11: Deployment & Doku (bis 25. Apr 2026)
**Ziele:** Vorführbares System, vollständige Unterlagen.  
**Unterpunkte:**  
- Deployment-Option klären: Schulserver/Cloud/VPS; CI/CD Pipeline; Env-Config pro Umgebung.  
- Betriebsdoku: Setup, Env-Variablen, Start/Stop, Backup, Logs, Security-Hinweise.  
- Benutzerhandbuch: Kurzanleitung, Rollen, häufige Workflows, Troubleshooting.  
- Entwicklerdoku: Architektur, ERD, API (OpenAPI), Coding-Guidelines, Git-Workflow.  

## Phase 12: Abnahme & Präsentation (26. Apr – 1. Mai 2026)
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

## Verantwortlichkeiten (gemäß euren Notizen)  
**Ereny:** Kalender Jahr/Woche, Start-Dashboard, Registrierung/Login, Events nach Fälligkeit (Frontend), In-App-Notifications, E-Mail-Events, Datei-Features, 2FA, Security-Doku.  
**Drazen:** Kalender Monat/Tag, Tasks/Subtasks/Logik, globale Suche, Chat, Templates, Delete-Bestätigung, Automatisierungen, Unit-Test-Fortschritt, DB-Optimierungen.  
**Gemeinsam:** Architektur/ERD/API, PostgreSQL-Umstieg, Rollen-/Rechte, Deployment, Tests, Diplomarbeit.  
