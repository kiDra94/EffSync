# Verzeichnisstruktur & Organisationsprinzipien

**Letzter Update:** 29. März 2026  
**Basis:** Enterprise-Standard Best Practices mit Anpassung für schulisches Umfeld

---

## 1. Überblick - Projektstruktur

```
diplom-arbeit/
├── backend/                 # NestJS REST API Server
├── frontend/                # Vue 3 Single Page Application
├── documents/               # Projektdokumentation
├── thesis/                  # LaTeX Diplomarbeit
├── logos/                   # Designelemente
└── *.csv / *.md / *.html   # Root-level Dokumentation & Daten
```

---

## 2. Frontend-Struktur

### 2.1 Hauptverzeichnisse

```
frontend/
├── src/                     # Produktionscode
├── tests/                   # Test-Dateien (zentrale Integration Tests)
├── cypress/                 # End-to-End Tests
├── public/                  # Statische Assets
├── node_modules/            # Dependencies (npm)
├── dist/                    # Build Output (production)
├── index.html               # Entry Point
├── vite.config.js           # Build Tool Config
├── vitest.setup.js          # Test Runner Config
├── package.json             # Abhängigkeitsmanifest
└── eslint.config.js         # Linting Regeln
```

### 2.2 Quellcode-Organisation (src/)

```
src/
├── main.js                  # Applikation Entry Point
├── App.vue                  # Root Component
├── style.css                # Globale Styles
│
├── api/
│   ├── httpClient.js        # Axios Konfiguration + Interceptoren
│   ├── authService.js       # Authentifizierung & Login
│   ├── taskMembers.js       # Task Member API Service
│   ├── tasksService.js      # Task CRUD API
│   ├── usersService.js      # User Management API
│   └── *.spec.js            # Unit Tests (co-located) ⭐
│
├── components/
│   ├── tasks/
│   │   ├── TaskForm.vue
│   │   ├── TaskForm.spec.js ⭐
│   │   ├── TaskMembersList.vue
│   │   ├── TaskMembersList.spec.js ⭐
│   │   ├── AddMemberDialog.vue
│   │   ├── AddMemberDialog.spec.js ⭐
│   │   └── TaskDetail.vue
│   ├── auth/
│   │   ├── LoginForm.vue
│   │   └── LoginForm.spec.js ⭐
│   └── (weitere Components...)
│
├── views/
│   ├── Dashboard.vue
│   ├── TasksView.vue
│   └── UsersView.vue
│
├── stores/
│   ├── auth.js              # Pinia Auth State
│   └── tasks.js             # Pinia Task State
│
├── router/
│   └── index.js             # Vue Router Konfiguration
│
├── composables/
│   └── (Custom Vue Hooks)
│
├── config/
│   └── (Applikationskonfiguration)
│
└── assets/
    └── (Bilder, Icons)
```

### 2.3 Test-Strategie im Frontend

#### **Unit Tests (Co-located) ⭐**
- **Location:** `src/` neben dem Code
- **Pattern:** `*.spec.js`
- **Zweck:** Isolierte Testung von Components und API Services
- **Umfang:** 
  - API Service Tests: `taskMembers.spec.js` (23 Tests)
  - Component Tests: `TaskMembersList.spec.js`, `AddMemberDialog.spec.js`, `TaskForm.spec.js`
  
**Beispiel strukturelle Dateien:**
```
src/api/taskMembers.js                 # Produktionscode
src/api/taskMembers.spec.js            # Unit Tests (Vitest)

src/components/tasks/TaskMembersList.vue
src/components/tasks/TaskMembersList.spec.js
```

#### **Integration Tests (Zentral organisiert) ⭐**
- **Location:** `tests/integration/`
- **Pattern:** `*.integration.spec.js`
- **Zweck:** Testung von Component-Workflows über mehrere Module
- **Umfang:** `TaskMembers.integration.spec.js` (19 Test-Suites, ~500 Zeilen)
  - Add Member Workflow
  - Remove Member Workflow
  - Dialog Integration
  - Permission Validation
  - Error Handling
  - UI State Management
  - Data Flow Consistency
  - Accessibility

**Beispiel:**
```
tests/
└── integration/
    └── TaskMembers.integration.spec.js  # Gesamtwerkflow Tests
```

#### **E2E Tests (Cypress)**
- **Location:** `cypress/e2e/`
- **Pattern:** `*.cy.js`
- **Zweck:** Vollständige User-Journeys im echten Browser
- **Tools:** Cypress für automatisierte Browser-Tests

```
cypress/
├── e2e/
│   ├── task-creation.cy.js
│   ├── auth.cy.js
│   └── member-management.cy.js
├── fixtures/
│   └── (Test-Daten)
└── support/
    └── (Test Utilities)
```

### 2.4 Warum diese Struktur?

| Aspekt | Grund |
|--------|-------|
| **Co-located Unit Tests** | Schnelle Navigation, Tests nah am Code, bessere DX |
| **Zentrale Integration Tests** | Klare Separation von Concerns, einfacher zu warten |
| **Separate E2E Tests** | Andere Tools (Cypress), andere Anforderungen, separate CI/CD Pipeline |
| **`src/api/`** | Alle Services an einer Stelle, leichte Wiederverwendung |
| **`src/components/`** | Komponenten-orientierte Architektur (Vue Standard) |
| **`src/views/`** | Page-level Komponenten, Router-Zuordnung klar |

---

## 3. Backend-Struktur

### 3.1 Hauptverzeichnisse

```
backend/
├── src/                     # Produktionscode (TypeScript)
├── test/                    # E2E Tests (Jest)
├── prisma/                  # ORM Schema und Migrationen
├── dist/                    # Kompiliertes JavaScript (nach build)
├── node_modules/            # Dependencies (npm)
├── nest-cli.json            # NestJS CLI Config
├── tsconfig.json            # TypeScript Config
├── package.json             # Abhängigkeitsmanifest
└── eslint.config.mjs        # Linting Regeln
```

### 3.2 Quellcode-Organisation (src/)

```
src/
├── main.ts                  # NestJS Applikation Entry Point
├── app.module.ts            # Root Module
├── app.controller.ts        # Root Routes
├── app.service.ts           # Root Service
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   ├── jwt.guard.ts
│   │   └── *.spec.ts        # Unit Tests
│   │
│   ├── tasks/
│   │   ├── tasks.module.ts
│   │   ├── tasks.controller.ts
│   │   ├── tasks.service.ts
│   │   ├── task-members.controller.ts
│   │   ├── task-members.service.ts
│   │   └── *.spec.ts        # Unit Tests
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── *.spec.ts        # Unit Tests
│   │
│   └── (weitere Module...)
│
├── common/
│   ├── guards/
│   │   └── jwt.guard.ts
│   ├── filters/
│   │   └── (Exception Handling)
│   ├── interceptors/
│   │   └── (Request/Response Processing)
│   ├── decorators/
│   │   └── (Custom Decorators)
│   └── dto/
│       └── (Data Transfer Objects)
│
└── prisma/
    └── (Prisma Client - auto-generated)
```

### 3.3 Prisma ORM Structure

```
prisma/
├── schema.prisma            # Datenbankschema Definition
├── prisma.config.ts         # Prisma Konfiguration
├── diplom_arbeit_postgres.sql  # SQL Dump (Backup)
├── seed.ts                  # Datenbankinitialisierung (Test-Daten)
│
└── migrations/
    ├── migration_lock.toml  # Lock-Datei für Konsistenz
    │
    ├── 20260210122829_init_postgres/
    │   └── migration.sql
    │
    ├── 20260210123149_set_autoincrement_all/
    │   └── migration.sql
    │
    ├── 20260222225142_add_email_preferences_and_logs/
    │   └── migration.sql
    │
    ├── 20260224110405_add_created_by_to_task_templates/
    │   └── migration.sql
    │
    ├── 20260307132244_completion_rule_and_autocomplete_for_task/
    │   └── migration.sql
    │
    ├── 20260308171649_add_permission_flags_and_time_limits/
    │   └── migration.sql
    │
    ├── 20260310163839_added_created_by_to_chat_rooms/
    │   └── migration.sql
    │
    ├── 20260311090055_added_left_at_to_chat_room_users/
    │   └── migration.sql
    │
    ├── 20260311094524_refactor_chat_schema_and_add_hash_for_1on1_chat/
    │   └── migration.sql
    │
    └── 20260325074542_add_task_members/
        └── migration.sql
```

### 3.4 Test-Organisation (Backend)

```
test/
├── jest-e2e.json            # Jest Config für E2E Tests
│
├── app.e2e-spec.ts          # API Integration Tests
├── auth-throttle.e2e-spec.ts # Auth Throttling Tests
├── mitgliederverwaltung.e2e-spec.ts  # Task Members E2E Tests
└── task-members.service.spec.ts      # Service Unit Tests
```

**Testtypen:**
- **Unit Tests:** `src/modules/*/service.spec.ts` (Mit Services collocated)
- **E2E Tests:** `test/*.e2e-spec.ts` (Volle API Request Cycles)

### 3.5 Warum diese Struktur?

| Aspekt | Grund |
|--------|-------|
| **Module pro Feature** | NestJS Standard, Kapselung, Wiederverwendbarkeit |
| **`common/` Ordner** | Shared Guards, Decorators, DTOs |
| **`prisma/migrations/`** | Versionskontrolle für Datenbankänderungen, Konsistenz zwischen Entwicklern |
| **`test/` statt `src/*.spec`** | Backend Standard, E2E Tests sind andere Art von Tests als Unit Tests |
| **Datitierte Migrationen** | Eindeutige Identifikation, sortierbar, keine Konflikte |

---

## 4. Prisma Migrationen (Database Evolution)

### 4.1 Migrationskonzept

```
Timeline der Datenbankevolution:
┌─────────────────────────────────────────────────────────────┐
│ 20260210122829: init_postgres                               │ ← Basis Schema (Users, Tasks, etc.)
├─────────────────────────────────────────────────────────────┤
│ 20260210123149: set_autoincrement_all                       │ ← Auto-Increment für Primary Keys
├─────────────────────────────────────────────────────────────┤
│ 20260222225142: add_email_preferences_and_logs              │ ← User Preferences & Audit Logs
├─────────────────────────────────────────────────────────────┤
│ 20260224110405: add_created_by_to_task_templates           │ ← Task Template Attribution
├─────────────────────────────────────────────────────────────┤
│ 20260307132244: completion_rule_and_autocomplete_for_task   │ ← Task Automation Features
├─────────────────────────────────────────────────────────────┤
│ 20260308171649: add_permission_flags_and_time_limits        │ ← RBAC Erweiterung
├─────────────────────────────────────────────────────────────┤
│ 20260310163839: added_created_by_to_chat_rooms             │ ← Chat Feature
├─────────────────────────────────────────────────────────────┤
│ 20260311090055: added_left_at_to_chat_room_users           │ ← Chat Timestamp
├─────────────────────────────────────────────────────────────┤
│ 20260311094524: refactor_chat_schema_and_add_hash_for_1on1  │ ← Chat Optimierung
├─────────────────────────────────────────────────────────────┤
│ 20260325074542: add_task_members                            │ ← Phase 5a: Mitgliederverwaltung ⭐
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Migrationskonvention

**Dateiformat:** `YYYYMMDDhhmmss_beschreibung/`

```
20260325074542_add_task_members/
├── migration.sql            # Ausführbare SQL-Änderungen
└── modification.ts (optional) # Typescript Migrations-Logik
```

**Warum Zeitstempel?**
- Eindeutig und sortierbar
- Vermeidet Konflikte in Git
- Chronologische Reihenfolge garantiert
- Standard in Migrationstools (Prisma, Alembic, Flyway)

---

## 5. Dokumentation (documents/)

```
documents/
├── verzeichnisstruktur.md           # Diese Datei! ⭐
├── git-flow.md                      # Git Workflow Dokumentation
├── gitworkflow.md                   # Erweiterte Git Praktiken
├── RBAC_ABAC.md                     # Role-Based Access Control
├── task-assignment-model.md         # Aufgabenverteilungsmodell
├── mitgliederverwaltung-anleitung.md # Phase 5a Benutzerhandbuch
├── ProtoMeilenstein.md              # Prototyp Spezifikation
├── Arbeitspakete.md                 # Work Breakdown Structure
├── erd.dbml                         # Entity Relationship Diagram
├── api.csv                          # API Endpunkte Übersicht
├── arbeitspakete.md                 # Projektphasen
├── dipl.md                          # Diplomarbeit Notizen
├── aba-drazen.md                    # Arbeitsfortschritt Drazen
└── aba-ereny.md                     # Arbeitsfortschritt Ereny
```

**Warum zentral dokumentieren?**
- Projektkontext
- Entscheidungsbegründungen
- Team-Onboarding
- Versionskontrolle von Dokumentation

---

## 6. Thesis LaTeX (thesis/)

```
thesis/
├── main.tex                 # Master-Dokument
├── env.sty                  # LaTeX Umgebung & Styles
│
├── content/
│   ├── Abgabe.tex          # Einreichung
│   ├── Anhang.tex          # Appendix
│   ├── ApiEndpoints.tex     # API Dokumentation
│   ├── Arbeitspakete.tex    # Arbeitsstruktur
│   ├── Einleitung.tex       # Introduction
│   ├── Mitgliederverwaltung.md    # Phase 5a Content
│   ├── Projektorganisation.tex    # Organization
│   ├── Projektplanung.tex         # Planning
│   ├── Randbedingungen.tex        # Constraints
│   ├── Titel.tex                  # Title Page
│   ├── Unterschriften.tex         # Signatures
│   ├── Ziel.tex                   # Goals
│   ├── Temp.tex                   # Drafts
│   │
│   └── bilder/              # Eingefügte Grafiken
│       └── *.png/jpg
│
├── figures/                 # Zusätzliche Figuren
│   └── Titel/               # Cover Materials
│
└── csv/                     # Datentabellen für Thesis
```

---

## 7. Konfigurationsdateien (Root-Level)

```
diplom-arbeit/
├── .git/                    # Git Repository
├── .gitignore               # Ignorierte Dateien/Ordner
│
├── proto.html               # HTML Prototyp
├── README.md                # Projekt Overview
│
├── working_time_records_drazen.csv   # Zeittracking Drazen
└── working_time_records_ereny.csv    # Zeittracking Ereny
```

---

## 8. Build & Deployment Struktur

### Frontend (Vite)

```
npm run dev          →  Development Server (localhost:5173)
npm run build        →  Production Build → dist/
npm run preview      →  Vorschau des Builds
npm run test         →  Vitest Unit/Integration Tests
npm run test:ui      →  Test UI Dashboard
```

### Backend (NestJS)

```
npm run start        →  Production Server (localhost:3000)
npm run dev          →  Development mit Auto-reload
npm run build        →  TypeScript → dist/
npm run test         →  Jest Unit Tests
npm run test:e2e     →  E2E Tests
```

---

## 9. Dependency Management

### Frontend (package.json)

**Produktions-Dependencies:**
- `vue@3` - Framework
- `axios` - HTTP Client
- `pinia` - State Management
- `vue-router` - Routing

**Dev-Dependencies:**
- `vitest` - Unit/Integration Testing
- `@vue/test-utils` - Component Testing
- `cypress` - E2E Testing
- `vite` - Build Tool
- `eslint` - Linting

### Backend (package.json)

**Produktions-Dependencies:**
- `@nestjs/core` - Framework
- `@prisma/client` - ORM
- `jsonwebtoken` - JWT
- `pg` - PostgreSQL Driver

**Dev-Dependencies:**
- `@types/node` - TypeScript Types
- `jest` - Testing
- `ts-node` - TypeScript Runner

---

## 10. Umgebungskonfiguration

### Frontend (.env)

```env
# API Configuration
VITE_API_URL=http://localhost:3000/api

# Development Mode
VITE_DEV_MODE=false
VITE_DEV_USERNAME=adminadmin
VITE_DEV_PASSWORD=password123
```

**Wichtig:** `VITE_API_URL` muss `/api` Suffix enthalten!

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/diplom_arbeit

# JWT
JWT_SECRET=xxx_geheim_xxx_
JWT_EXPIRATION=24h

# Server
PORT=3000
NODE_ENV=development
```

---

## 11. Best Practices & Konventionen

### 11.1 Dateibenennung

| Typ | Pattern | Beispiel |
|-----|---------|----------|
| Vue Component | PascalCase | `TaskMembersList.vue` |
| JavaScript Service | camelCase | `taskMembers.js` |
| Unit Test | `*.spec.js` | `taskMembers.spec.js` |
| Integration Test | `*.integration.spec.js` | `TaskMembers.integration.spec.js` |
| E2E Test | `*.cy.js` | `task-creation.cy.js` |
| TypeScript Module | PascalCase | `TasksModule.ts` |
| Database Migration | `YYYYMMDDHHMMSS_description` | `20260325074542_add_task_members` |

### 11.2 Code Organization Regeln

✅ **DO:**
- Tests nah am Code halten (Unit Tests co-located)
- Größere Workflows zentral testen (Integration Tests in `/tests/`)
- Ein Feature = ein Modul (Backend)
- Verwandte Components in Ordnern gruppieren (Frontend)
- Prisma Migrations für jede Schemaänderung
- Aussagekräftige Commit Messages

❌ **DON'T:**
- Tests in root speichern
- Chaos in `src/` - keine Top-Level Components
- Migrations manuell umbenennen/löschen
- Feature-Branches direkt auf main mergen ohne Review
- Hardcoded API URLs (immer über Environment)

### 11.3 Import-Pfade

```javascript
// ✅ Relative Imports (für nahe Dateien)
import { tasks } from '../services/tasks.js'

// ✅ Alias Imports (für Projekt-generische Pfade)
import { TaskMembersList } from '@/components/tasks/TaskMembersList.vue'
import { taskMembersApi } from '@/api/taskMembers.js'

// ❌ Lange relative Imports vermeiden
import { foo } from '../../../../utils/foo.js'
```

---

## 12. Typische Entwicklungsabläufe

### Feature Implementation

```
1. Branch erstellen (mit Issue-Nummer)
   git checkout -b feature-42-neue-feature

2. Frontend-Komponente erstellen
   src/components/Feature/Feature.vue
   + Co-located Unit Test: Feature.spec.js
   → commit: "#42 Create Feature component"

3. API Service erweitern
   src/api/featureService.js
   + Unit Test: featureService.spec.js
   → commit: "#42 Add FeatureService API integration"

4. Backend-Modul implementieren
   src/modules/feature/
   ├── feature.module.ts
   ├── feature.controller.ts
   ├── feature.service.ts
   └── feature.service.spec.ts
   → commit: "#42 Implement Feature backend module"

5. Datenbankänderungen
   Schema ändern in prisma/schema.prisma
   → npm run migrate
   → Neue Migration unter prisma/migrations/
   → commit: "#42 Add database schema for Feature"

6. Integration testen
   tests/integration/Feature.integration.spec.js
   → commit: "#42 Add Feature integration tests"

7. E2E testen
   cypress/e2e/feature.cy.js
   → commit: "#42 Add Feature E2E tests"

8. Dokumentation aktualisieren
   documents/feature-anleitung.md
   → commit: "#42 Document Feature usage and architecture"

9. Pull Request erstellen
   → Code Review
   → Merge in main (alle #42-Commits zusammen)
```

---

## 13. Git Struktur & Conventions

```
Branches:
├── main                        # Production-ready Code
├── feature-NN-beschreibung     # Aktive Feature Entwicklung (NN = Issue #)
├── bugfix-NN-beschreibung      # Bug Fixes (NN = Issue #)
└── docs-NN-beschreibung        # Dokumentation nur (NN = Issue #)

Commits:
✅ "#24 Task member feature implementation"
✅ "#24 Implement TaskMembersList component"
✅ "#24 Add integration tests for members"
✅ "#24 Update member management documentation"
✅ "#18 Fix API URL configuration"
✅ "#18 Correct E2E test endpoints"

❌ "feat: Add task member feature"
❌ "fix: Correct API URL configuration"
❌ "update stuff"
❌ "fix everything"
```

**Konvention erklärt:**
- `#NN` am Anfang = Issue/Branch Nummer
- Beschreibender Text = Was wurde gemacht
- Verlinkt automatisch zur GitHub Issue
- Alle Commits zu einer Issue bekommen die gleiche `#NN` Nummer

---

## 14. Warum diese Architektur für unser Projekt?

### Kontext: Diplomarbeit im schulischen Umfeld

**Anforderungen:**
1. ✅ Wartbar - auch für Nachfolger
2. ✅ Skalierbar - wächst mit Anforderungen
3. ✅ Professionell - enterprise standards
4. ✅ Dokumentiert - Verständnis für Lehrkräfte
5. ✅ Testbar - Qualitätssicherung

**Unsere Lösung:**
- **Modular** - Jede Komponente hat klare Verantwortung
- **Separiert** - Frontend/Backend getrennt aber koordiniert
- **Dokumentiert** - Jede Schicht erklärbar
- **Getestet** - Unit → Integration → E2E Pipeline
- **Versioniert** - Git + Prisma Migrations für reproduzierbarkeit

### Beispiel: Mitgliederverwaltung (Phase 5a)

```
Feature: Task-Mitglieder hinzufügen/entfernen

Frontend Implementation:
  ├── src/components/tasks/TaskMembersList.vue
  ├── src/components/tasks/AddMemberDialog.vue
  ├── src/api/taskMembers.js
  └── Tests:
      ├── TaskMembersList.spec.js
      ├── AddMemberDialog.spec.js
      └── tests/integration/TaskMembers.integration.spec.js

Backend Implementation:
  ├── src/modules/tasks/task-members.controller.ts
  ├── src/modules/tasks/task-members.service.ts
  ├── test/mitgliederverwaltung.e2e-spec.ts
  └── prisma/migrations/20260325074542_add_task_members/

Database:
  ├── Users Table
  ├── Tasks Table
  └── task_members Table (neu)

Documentation:
  └── documents/mitgliederverwaltung-anleitung.md
```

---

## 15. Checkliste für neue Features

Vor dem Merge:
- [ ] Feature Branch erstellt
- [ ] Frontend Unit Tests geschrieben & passing
- [ ] Backend Unit Tests geschrieben & passing
- [ ] Integration Tests (falls multi-module)
- [ ] E2E Tests für User-Journey
- [ ] Datenbankmigrationen (falls notwendig)
- [ ] `.env` Beispiel aktualisiert
- [ ] Dokumentation aktualisiert
- [ ] Code Review bestanden
- [ ] Branch in main gemergt
- [ ] Branch gelöscht

---

## 16. Weitere Ressourcen

**Dokumentation im Projekt:**
- [Git Workflow Guide](git-flow.md)
- [RBAC Implementierung](RBAC_ABAC.md)
- [Task Assignment Model](task-assignment-model.md)
- [Mitgliederverwaltung Anleitung](mitgliederverwaltung-anleitung.md)

**Externe Standards:**
- [Vue.js Style Guide](https://vuejs.org/guide/scaling-up/sfc.html)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Migrations](https://www.prisma.io/docs/orm/prisma-migrate)
- [Jest Testing](https://jestjs.io/docs/getting-started)

---

**Version:** 1.0  
**Erstellt:** 29.03.2026  
**Status:** ✅ Phase 5a Complete
