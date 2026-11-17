# 🗂️ Projektstruktur - Detaillierte Erklärung aller Ordner und Dateien

## 📦 Top-Level Struktur

```
diplom-arbeit/
├── backend/              # NestJS REST-API Server
├── frontend/             # Vue.js 3 Web-UI
├── documents/            # Projektdokumentation
├── thesis/               # LaTeX Diplomarbeit
├── logos/                # Grafiken & Logos
├── proto.html            # Prototyp (veraltet)
└── README.md             # Projekt-Übersicht
```

---

## 🔧 BACKEND - `/backend`

Der Backend-Server ist das Herzstück der API und Geschäftslogik.

### **1. Root-Konfiguration**

```
backend/
├── .env                      # Umgebungsvariablen (NICHT versioniert)
│   ├── DATABASE_URL         # PostgreSQL Verbindung
│   ├── JWT_SECRET           # Token-Signing Key
│   ├── NODE_ENV             # development / production
│   ├── PORT                 # Server Port (default 3000)
│   └── EMAIL_*              # Email-Konfiguration
│
├── .env.example              # Template für .env (versioniert)
├── .gitignore                # Dateien ignorieren (node_modules, .env, dist)
├── .prettierrc                # Code-Formatierungs-Regeln
├── eslint.config.mjs          # Linting-Regeln
├── package.json               # NPM Dependencies & Scripts
├── tsconfig.json              # TypeScript Compiler Optionen
├── tsconfig.build.json        # TypeScript Build-Konfiguration
├── nest-cli.json              # NestJS CLI Konfiguration
├── prisma.config.ts           # Prisma Konfiguration
└── README.md                  # Backend-Dokumentation
```

---

### **2. Quellcode: `/backend/src`**

Alle TypeScript-Code für Server-Logik.

#### **Einstiegspunkt: `main.ts`**
```typescript
// Bootet die NestJS Anwendung
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(helmet());              // Security HTTP Headers
  app.enableCors();               // Cross-Origin Resources
  app.setGlobalPrefix('api');     // /api/... Routes
  
  await app.listen(3000);         // Server starten
}
```

#### **App-Modul: `app.module.ts`**
```typescript
// Zentrale Modul-Deklaration
// Importiert ALLE 32+ Feature-Module:
imports: [
  AuthModule,
  TasksModule,
  ChatRoomsModule,
  NotificationsModule,
  // ... und 28 weitere
]
```

#### **App-Controller/Service: `app.controller.ts` + `app.service.ts`**
- Root-Endpoints der API
- Health-Checks, Info, Status

---

### **3. Module - Die Feature-Architektur**

Jedes Modul ist **selbstständig** und besteht aus:
```
modulname/
├── modulname.module.ts        # Modul-Deklaration
├── modulname.controller.ts     # HTTP-Endpoints
├── modulname.service.ts        # Business-Logik
├── modulname.service.spec.ts   # Unit-Tests
├── dto/                        # Data Transfer Objects
│   ├── create-X.dto.ts         # POST Request Datentypen
│   └── update-X.dto.ts         # PUT Request Datentypen
├── entities/                   # Database Entities (Prisma Models)
└── [weitere Dateien]           # z.B. Guards, Validators
```

#### **Alle 32+ Backend-Module:**

| Modul | Ordner | **Zweck** |
|-------|--------|----------|
| **Authentication** | `auth/` | Login, Register, JWT-Token, Passport-Strategien |
| **Benutzer** | `users/` | Benutzerverwaltung, Profile, User-Details |
| **Aufgaben** | `tasks/` | CRUD Task-Operationen, Status-Updates, Prioritäten |
| **Task-Kommentare** | `task-comments/` | Kommentarfunktion auf Tasks |
| **Task-Activity** | `task-activity/` | Was wurde bei einer Task geändert |
| **Task-Activity-Log** | `task-activity-log/` | Audit-Trail aller Task-Änderungen |
| **Task-Dokumente** | `task-documents/` | Dokumente zu Tasks zuordnen |
| **Task-Mitglieder** | `task-members/` | Team-Mitglieder von Aufgaben (Many-to-Many) |
| **Task-Templates** | `task-templates/` | Aufgaben-Vorlagen zum Wiederverwenden |
| **ChatRooms** | `chat-rooms/` | Chat-Räume erstellen, verwalten |
| **Chat-Nachrichten** | `chat-messages/` | Nachrichten senden, abrufen |
| **Notifizierungen** | `notifications/` | Event-basierte Benachrichtigungen |
| **Email** | `email/` | E-Mail Versand (Nodemailer) |
| **Noten** | `notes/` | Lehrerlose Benotungen & Evaluierung |
| **Note-Dokumente** | `note-documents/` | Dokumente zu Noten |
| **Note-Benutzer** | `notes-users/` | Benutzer von Noten (Many-to-Many) |
| **Klassen** | `classes/` | Schulklassen verwalten |
| **Klassen-Lehrer** | `classes-teachers/` | Lehrer → Klassen Zuordnung (Many-to-Many) |
| **Abteilungen** | `departments/` | Schulabteilungen (z.B. IT, Elektrotechnik) |
| **Schüler** | `students/` | Schülerverwaltung |
| **Lehrer** | `teachers/` | Lehrkraftverwaltung |
| **Stundenplan** | `schedules/` | Stundenplan-Verwaltung |
| **Unterrichtsstunden** | `lesson-slots/` | Einzelne Stunden (Tag, Zeit, Raum) |
| **Räume** | `rooms/` | Klassenzimmer/Schulräume |
| **Fächer** | `subjects/` | Schulfächer (Mathe, Deutsch, etc.) |
| **Prioritäten** | `priorities/` | Task-Prioritän-Definition |
| **Rollen** | `roles/` | Benutzrollen (Admin, Teacher, Student) |
| **Berechtigungen** | `permissions/` | Einzelne Rechte/Capabilities |
| **Rollen-Berechtigungen** | `roles-permissions/` | Zuordnung Rolle ↔ Berechtigung |
| **Benutzer-Rollen** | `user-roles/` | Zuordnung Benutzer ↔ Rolle |
| **Benutzer-Berechtigungen** | `user-permissions/` | Individuelle Rechte pro Benutzer |
| **Dokumente** | `documents/` | Dateiupload/-verwaltung |
| **Dokumentenfreigabe** | `document-shares/` | Wer hat Zugriff auf welches Dokument |
| **WebSocket** | `websocket/` | Socket.io Real-Time Events |
| **Metriken** | `metrics/` | Dashboard-Statistiken & Analytics |

---

### **4. Prisma - Datenbank-Schicht: `/backend/prisma`**

```
backend/prisma/
├── schema.prisma               # DATABASE SCHEMA (definiert alle Tabellen & Relations)
│   ├── model users { ... }
│   ├── model tasks { ... }
│   ├── model chat_rooms { ... }
│   ├── model roles { ... }
│   └── ... (insgesamt ~30-40 Models)
│
├── seed.ts                      # Test-Daten einfügen
│   └── Erstellt Demo-Benutzer, -Aufgaben, -Klassen beim Starten
│
├── migrations/                  # Schema-Versions-Geschichte
│   ├── migration_lock.toml      # Lock für Datenbank-Versioning
│   ├── 20260210122829_init_postgres/
│   │   └── migration.sql        # Initiale DB-Struktur
│   ├── 20260211100856_make_user_fields_required/
│   │   └── migration.sql        # Benutzerfelder nullable → required
│   ├── 20260222225142_add_email_preferences_and_logs/
│   │   └── migration.sql        # Email-Einstellungen hinzugefügt
│   ├── 20260307132244_completion_rule_and_autocomplete_for_task/
│   │   └── migration.sql        # Auto-Completion für Tasks
│   ├── 20260325075951_add_task_members_to_tasks/
│   │   └── migration.sql        # Task-Mitglieder-Feature
│   ├── 20260329194459_add_task_locking_fields/
│   │   └── migration.sql        # Task-Locking für Bearbeitung
│   ├── 20260331123819_add_task_id_to_notes_for_teacher_grading/
│   │   └── migration.sql        # Noten mit Task-Bezug
│   └── ... (weitere ~15+ Migrationen)
│

```

**Was macht `schema.prisma`?**
- Definiert **alle Datenbank-Tabellen** (Models)
- Definiert **Relationen zwischen Tabellen** (User ↔ Tasks)
- Generiert **Prisma Client** automatisch
- Wird zur **Migration** genutzt

**Beispiel eines Models:**
```prisma
model tasks {
  task_id       Int            @id @default(autoincrement())
  title         String
  description   String?
  status        String         @default("todo")
  assigned_to   Int?
  
  // Relationen
  assigned_user users?         @relation(fields: [assigned_to], references: [user_id])
  task_members  task_members[] // Viele Task-Mitglieder
  comments      task_comments[]
  documents     task_documents[]
  
  created_at    DateTime       @default(now())
  updated_at    DateTime       @updatedAt
}
```

---

### **5. Tests: `/backend/test`**

```
backend/test/
├── jest-e2e.json                    # Jest Konfiguration für E2E Tests
├── app.e2e-spec.ts                  # API Endpoints testen
├── auth-throttle.e2e-spec.ts         # Rate-Limiting Test
├── mitgliederverwaltung.e2e-spec.ts # Integration Test für User-Verwaltung
└── task-members.service.spec.ts     # Unit-Test für Task-Mitglieder
```

---

### **6. Upload-Verzeichnis: `/backend/uploads`**

```
backend/uploads/
└── [dynamisch erstellt]
    ├── documents/      # Hochgeladene Dokumente
    ├── avatars/        # Benutzer-Profilbilder
    └── [weitere Dateien]
```

---

## 🎨 FRONTEND - `/frontend`

Vue.js 3 + Vite Webanwendung für Benutzerinterface.

### **1. Root-Konfiguration**

```
frontend/
├── .env                         # Frontend Env-Vars (API URL, etc.)
├── .env.development.example     # Development Konfiguration
├── .env.production.example      # Production Konfiguration
├── .gitignore                   # Ignorieren (node_modules, dist, .env)
├── package.json                 # NPM Dependencies
├── vite.config.js               # Vite Build-Tool Konfiguration
│   ├── @vitejs/plugin-vue       # Vue 3 Plugin
│   └── dev server auf :5173
│
├── vitest.setup.js              # Unit-Test Setup
├── index.html                   # HTML Entry Point
├── cypress.config.js            # E2E Test Konfiguration
├── eslint.config.js             # Linting-Regeln für Frontend
└── mockdb.json                  # Mock-Datenbank für Offline-Testing
```

---

### **2. Quellcode: `/frontend/src`**

```
frontend/src/
├── main.js                      # App-Einstiegspunkt
│   ├── Creates Vue App
│   ├── Loads Stores (Pinia)
│   ├── Loads Router
│   └── Mounts zu #app
│
├── App.vue                      # Root-Component
│   └── <RouterView /> (dynamischer Content)
│
├── style.css                    # Globale Styles
│
├── api/                         # API-Service-Layer
│   ├── httpClient.js            # Axios HTTP-Wrapper
│   ├── authService.js           # Login/Logout
│   ├── tasks.js                 # Task CRUD Endpoints
│   ├── chat.js                  # Chat API Funktionen
│   ├── notes.js                 # Notizen API
│   ├── taskMembers.js           # Task-Mitglieder API
│   ├── taskMembers.spec.js      # Unit-Tests für taskMembers
│   ├── tasks.test.js            # Unit-Tests für Tasks
│   ├── usersService.js          # Benutzer API
│   ├── adminService.js          # Admin-Panel API
│   ├── emailPreferences.js       # Email-Einstellungen API
│   ├── notification.js           # Benachrichtigungen API
│   ├── metrics.js               # Dashboard-Metriken API
│   └── index.js                 # API-Services aggregieren
│
├── components/                  # Wiederverwendbare UI-Komponenten
│   │
│   ├── chat/                    # Chat-Komponenten
│   │   ├── ChatInput.vue        # Nachricht-Eingabe
│   │   ├── ChatMessage.vue      # Einzelne Nachricht
│   │   ├── ChatRoomItem.vue     # Chat-Raum Liste
│   │   ├── ChatRoomList.vue     # Alle Räume
│   │   ├── ChatWindow.vue       # Chat-Fenster
│   │   └── modals/              # Chat-Dialoge
│   │
│   ├── tasks/                   # Task-Komponenten
│   │   ├── TaskList.vue         # Task-Listendarstellung
│   │   ├── TaskCard.vue         # Einzelne Task-Karte
│   │   ├── TaskDetail.vue       # Detail-Ansicht
│   │   ├── TaskForm.vue         # Erstellung/Bearbeitung
│   │   ├── TaskFilter.vue       # Filter & Suche
│   │   └── [weitere Task-Control-Komponenten]
│   │
│   ├── classes/                 # Klassen-Verwaltung
│   │   ├── ClassListView.vue
│   │   ├── ClassDetail.vue
│   │   ├── ClassForm.vue
│   │   └── ClassDeleteDialog.vue
│   │
│   ├── dashboard/               # Dashboard-Komponenten
│   │   ├── StatusDistributionChart.vue  # Pie-Chart für Task-Status
│   │   └── TaskProgressChart.vue        # Progress Bar
│   │
│   ├── departments/             # Abteilungs-Verwaltung
│   │
│   ├── notes/                   # Noten & Beurteilung
│   │   ├── NoteForm.vue
│   │   ├── NoteDeleteDialog.vue
│   │
│   ├── notifications/           # Benachrichtigungen
│   │   ├── NotificationsList.vue    # Liste aller Notifications
│   │   └── DeadlineToast.vue        # Deadline-Benachrichtigungen
│   │
│   ├── schedules/               # Stundenplan
│   │   ├── ScheduleForm.vue
│   │   ├── ScheduleDeleteDialog.vue
│   │
│   ├── templates/               # Task-Vorlagen
│   │
│   └── [weitere Component-Ordner ...]
│
├── views/                       # Seiten/Ansichten (auch Vue-Components)
│   ├── AdminView.vue            # Admin-Panel Seite
│   ├── CalendarView.vue         # Kalender-Ansicht
│   ├── ChatView.vue             # Chat-Seite
│   ├── ClassDetail.vue          # Klassen-Detail-Seite
│   ├── ClassListView.vue        # Klassen-Übersicht
│   ├── DashboardView.vue        # Haupt-Dashboard
│   ├── DepartmentView.vue       # Abteilungs-Verwaltung
│   ├── DocumentView.vue         # Dokument-Manager
│   ├── ForgotPasswordView.vue    # Passwort-Zurücksetzen
│   ├── LayoutView.vue           # Layout-Wrapper
│   ├── LoginView.vue            # Login-Seite
│   ├── NoteView.vue             # Noten-Seite
│   ├── NotFoundView.vue         # 404 Error Page
│   ├── PermissionsDetailView.vue # Berechtigungen-Details
│   ├── RegisterView.vue         # Registrierungs-Seite
│   ├── SchedulesView.vue        # Stundenplan-Seite
│   ├── TaskView.vue             # Task-Listing-Seite
│   ├── TemplateView.vue         # Task-Vorlagen-Seite
│   └── UserProfileView.vue      # Benutzer-Profil-Seite
│
├── stores/                      # Pinia Global State Management
│   ├── authStore.js             # Auth-State (user, token, isAuthenticated)
│   ├── notificationStore.js      # Notifications State
│   ├── searchStore.js            # Suchverlauf & Filter
│   ├── useSocket.js             # WebSocket Connection State
│   └── entities/                # Pinia Stores für Models
│       ├── taskStore.js         # Tasks State
│       ├── chatStore.js         # Chat State
│       └── [weitere Entity Stores]
│
├── composables/                 # Vue 3 Composition API Funktionen
│   ├── useChat.js               # Chat-Logik (reusable)
│   ├── useTaskFilters.js        # Task-Filterung (reusable)
│   └── useTaskValidation.js     # Task-Validierung (reusable)
│
├── router/                      # Vue Router Konfiguration
│   └── index.js                 # Route Definitionen
│       ├── /login               → LoginView
│       ├── /register            → RegisterView
│       ├── /dashboard           → DashboardView
│       ├── /tasks               → TaskView
│       ├── /tasks/:id           → TaskDetailView
│       ├── /chat                → ChatView
│       ├── /classes             → ClassListView
│       ├── /admin               → AdminView
│       ├── /documents           → DocumentView
│       └── [weitere Routes ...]
│
├── config/                      # Konfigurationsdateien
│   └── api.config.js            # API Base-URL, Endpoints
│
└── assets/                      # Statische Assets
    └── css/
        └── normalize.css         # CSS Reset
```

---

### **3. Tests: `/frontend/tests` + `/frontend/cypress`**

```
frontend/tests/
└── integration/
    └── TaskMembers.integration.spec.js  # Integration Tests

frontend/cypress/
├── cypress.config.js             # Cypress Konfiguration
├── e2e/                          # End-to-End Tests
│   ├── create-task.cy.js         # Task-Erstellung Test
│   ├── email-preferences.cy.js    # Email-Optionen Test
│   └── notifications.cy.js       # Benachrichtigungen Test
├── fixtures/                     # Test-Daten
│   └── mockdb-seed.json          # Mock-Datenbank Seed
├── support/                      # Test-Helpers
│   ├── commands.js               # Custom Cypress Commands
│   └── e2e.js                    # E2E Test Setup
└── screenshots/                  # Fehler-Screenshots
```

---

### **4. Public Assets: `/frontend/public`**

```
frontend/public/
├── favicon.ico
├── images/
├── fonts/
└── [andere statische Dateien]
```

---

## 📚 DOKUMENTATION - `/documents`

Alle Projektdokumentationen in Markdown:

```
documents/
├── Projekt-Uebersicht.md           # (NEU!) Technischer Überblick
├── RBAC_ABAC.md                    # Zugriffskontroll-Modelle
├── task-assignment-model.md        # Task-Zuweisungs-Modell
├── mitgliederverwaltung-anleitung.md # User-Management Anleitung
├── Phase5a-Mitgliederverwaltung-Implementation.md # Implementation-Phase
├── arbeitspakete.md                # Work Packages
├── aba-drazen.md                   # ABA Drazen
├── aba-ereny.md                    # ABA Ereny
├── dipl.md                         # Diplom-Richtlinien
├── erd.dbml                        # Entity-Relationship Diagram
├── git-flow.md                     # Git-Workflow
├── gitworkflow.md                  # Git Strategien
├── ProtoMeilenstein.md             # Prototyp-Meilenstein
├── Randbedingungen.md              # Anforderungen
├── AP7_2-Rollen-Rechteprüfung-AuditLog.md # AP 7.2
├── verzeichnisstruktur.md          # Verzeichnis-Dokumentation
├── api.csv                         # API Endpoints (CSV)
└── Usability-Test-Fragebogen.pdf   # Usability-Tests
```

---

## 📖 LATEX-DIPLOMARBEIT - `/thesis`

```
thesis/
├── main.tex                        # Haupt-Datei
├── env.sty                         # Custom LaTeX Package
└── content/
    ├── Abgabe.tex                  # Submission Instructions
    ├── Anhang.tex                  # Anhang
    ├── ApiEndpoints.tex            # API-Dokumentation
    ├── Arbeitspakete.tex           # Arbeitspakete
    ├── Einleitung.tex              # Einleitung
    ├── Projektorganisation.tex      # Org-Struktur
    ├── Projektplanung.tex          # Timeline
    ├── Randbedingungen.tex         # Requirements
    ├── Titel.tex                   # Titelseite
    ├── Unterschriften.tex          # Signatur-Seite
    ├── Ziel.tex                    # Ziele
    ├── Mitgliederverwaltung.md     # (Markdown, wird zu LaTeX konvertiert)
    ├── Temp.tex                    # Temporärer Content
    ├── bilder/                     # Bilder für Thesis
    └── csv/                        # Daten-Tabellen
```

---

## 📊 Übersicht: Welcher Code macht was?

### **Beispiel 1: Task erstellen**

```
Browser (Frontend)
  ↓
Vue Component: TaskForm.vue (frontend/src/components/tasks/TaskForm.vue)
  ↓ (Benutzer klickt "Speichern")
API Service: tasks.js (frontend/src/api/tasks.js)
  ↓ HTTP POST /api/tasks (JSON: {title, description, ...})
Backend: tasks.controller.ts (backend/src/modules/tasks/tasks.controller.ts)
  ↓ @Post()
Backend: tasks.service.ts (backend/src/modules/tasks/tasks.service.ts)
  ↓ prisma.tasks.create({ data: {...} })
Prisma Client (auto-generated)
  ↓ SQL Befehl
PostgreSQL Database (backend/prisma/schema.prisma)
  ↓ INSERT INTO tasks (title, description, ...)
Datenbankrow erstellt ✅
```

---

### **Beispiel 2: Chat-Nachricht senden (Real-Time)**

```
Browser (Frontend)
  ↓
Vue Component: ChatInput.vue (frontend/src/components/chat/ChatInput.vue)
  ↓ (Benutzer sendet Nachricht)
Composable: useChat.js (frontend/src/composables/useChat.js)
  ↓ socket.emit('chat:send', {...})
Socket.io Client (WebSocket)
  ↓
Backend: websocket.gateway.ts (backend/src/modules/websocket/websocket.gateway.ts)
  ↓ @SubscribeMessage('chat:send')
Backend: chat-messages.service.ts (backend/src/modules/chat-messages/)
  ↓ prisma.chat_messages.create()
PostgreSQL (speichern)
  ↓
Backend sendet zurück via Socket.io
  ↓ socket.to('room-123').emit('chat:message', newMessage)
Browser: WebSocket empfängt
  ↓ Pinia Store: chatStore (frontend/src/stores/entities/chatStore.js)
  ↓ UI aktualisiert sich (Reaktiv)
Chat zeigt neue Nachricht ✅
```

---

### **Beispiel 3: Task-Mitglied hinzufügen (Permission Check)**

```
Browser: TaskDetail.vue (frontend/src/components/tasks/TaskDetail.vue)
  ↓ [Klick: "Mitglied hinzufügen"]
Komponente: TaskMembersList.vue (frontend/src/components/tasks/TaskMembersList.vue, Abschnitt "Mitglieder hinzufügen")
  ↓ API POST /api/task-members
Backend: task-members.controller.ts (backend/src/modules/task-members/)
  ↓ @Post()
Guard: JwtAuthGuard (NestJS)
  ↓ Überprüfen: Ist Benutzer authentifiziert?
Guard: PermissionsGuard (custom)
  ↓ Überprüfen: Hat Benutzer "manage_tasks" Permission?
Service: task-members.service.ts (backend/src/modules/task-members/)
  ↓ prisma.task_members.create({user_id, task_id})
✅ Mitglied hinzugefügt ODER ❌ Fehler: "Permission denied"
```

---

## 🔄 Datenbankfluss: Schema → Migrations → Datenbank

```
1. Developer ändert schema.prisma
   backend/prisma/schema.prisma
   ├── Neues Model hinzufügen
   └── oder Feld hinzufügen
   
2. Befehl ausführen:
   npx prisma migrate dev --name "add_new_feature"
   
3. Prisma erstellt:
   - SQL Migration-Datei:
     backend/prisma/migrations/[timestamp]_add_new_feature/migration.sql
   - Führt SQL aus auf Entwicklungs-DB
   - Aktualisiert schema.prisma.lock
   - Regeneriert Prisma Client (TypeScript)
   
4. Ergebnis:
   - Datenbank hat neue Struktur ✅
   - TypeScript Services haben neue Types ✅
   - Git Commit speichert Migration ✅
```

---

## 🚀 Zusammenfassung: Quellcode-Verteilung

| Bereich | Ordner | Dateien | Zweck |
|---------|--------|---------|-------|
| **Backend API** | `/backend/src/modules/*` | 32+ Module | REST-API Endpoints |
| **Geschäftslogik** | `/backend/src/modules/*/service.ts` | 32+ Services | Business Logic |
| **HTTP-Routes** | `/backend/src/modules/*/controller.ts` | 32+ Controllers | Route-Handler |
| **Datenbank-Schema** | `/backend/prisma/schema.prisma` | 1 Datei | Tabellen-Definition |
| **Datenbank-Migrationen** | `/backend/prisma/migrations/` | 15+ SQL-Dateien | Schema-Versionierung |
| **Frontend UI** | `/frontend/src/components/` | 50+ Vue-Komponenten | Benutzer-Interface |
| **Frontend Pages** | `/frontend/src/views/` | 17+ Views | Seiten-Struktur |
| **API-Clients** | `/frontend/src/api/*.js` | 10+ Services | HTTP/Socket-Kommunikation |
| **State Management** | `/frontend/src/stores/` | 5+ Stores | Globaler State (Pinia) |
| **Routing** | `/frontend/src/router/index.js` | 1 Datei | Route-Definitionen |
| **Tests (Backend)** | `/backend/test/` | 4+ Dateien | E2E Tests |
| **Tests (Frontend)** | `/frontend/tests/`, `/frontend/cypress/` | 5+ Dateien | Unit/E2E Tests |

---

## 📝 Lesehilfe: Wie man Code findet

**"Ich möchte ändern wie Aufgaben erstellt werden"**
→ Schau hier:
1. Frontend: `/frontend/src/components/tasks/TaskForm.vue` (UI)
2. API: `/frontend/src/api/tasks.js` (HTTP Call)
3. Backend: `/backend/src/modules/tasks/tasks.controller.ts` (HTTP Endpoint)
4. Backend: `/backend/src/modules/tasks/tasks.service.ts` (Logik)
5. Datenbank: `/backend/prisma/schema.prisma` (Model: `tasks`)

**"Ich möchte neue Email-Einstellungen speichern"**
→ Schau hier:
1. Frontend: `/frontend/src/views/UserProfileView.vue` (Seite)
2. API: `/frontend/src/api/emailPreferences.js` (HTTP)
3. Backend: `/backend/src/modules/email/email.controller.ts` (Endpoint)
4. Backend: `/backend/src/modules/email/email.service.ts` (Logik)
5. Datenbank: `schema.prisma` (Model: `email_preferences`)

**"Ich möchte Chat-Nachrichten schneller machen"**
→ Schau hier:
1. Frontend WebSocket: `/frontend/src/stores/useSocket.js`
2. Backend WebSocket: `/backend/src/modules/websocket/websocket.gateway.ts`
3. Backend Service: `/backend/src/modules/chat-messages/chat-messages.service.ts`
4. Datenbank Query Optimierung: Schema-Indexes in `schema.prisma`

---

**Projekt-struktur Ende** ✅
