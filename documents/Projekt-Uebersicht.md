# EffSync - Projekt Übersicht: Funktionalität und Technische Konzepte

## 📋 Inhaltsverzeichnis

1. [Systemübersicht](#systemübersicht)
2. [Kernfunktionalitäten](#kernfunktionalitäten)
3. [Informatik-Konzepte](#informatik-konzepte)
4. [Medientechnik & Frontend-Technologien](#medientechnik--frontend-technologien)
5. [Datenbank-Technologie](#datenbank-technologie)
6. [Architektur & Design Patterns](#architektur--design-patterns)

---

## Systemübersicht

**EffSync** ist ein modernes Task-Management- und Zusammenarbeits-System, entwickelt für Schulumgebungen. Es besteht aus:

- **Backend**: NestJS REST-API mit WebSocket-Unterstützung
- **Frontend**: Vue 3 mit Vite-Build-Tool
- **Datenbank**: PostgreSQL mit Prisma ORM
- **Real-Time Features**: Socket.io für Live-Kommunikation

---

## Kernfunktionalitäten

### 1. **Benutzerverwaltung & Authentifizierung**
- Benutzerregistrierung und Login
- JWT-basierte Authentifizierung (Passport.js)
- Rollenbasierte Zugriffskontrolle (RBAC)
- Passwort-Hashing mit bcrypt
- Email-Preferences Management

### 2. **Aufgabenverwaltung (Task Management)**
- Erstellung und Verwaltung von Aufgaben
- Task-Status: Todo, In Progress, Done
- Task-Prioritäten: Low, Medium, High
- Zuweisen von Aufgaben an Benutzer (`assigned_to`)
- Team-Collaboration über Task-Members
- Aufgaben-Vorlagen für wiederkehrende Arbeiten
- Task-Locking: Verhindert unerwünschte Änderungen
- Automatische Completion-Regeln basierend auf Bedingungen

### 3. **Echtzeit-Chat-System**
- Privaträume für 1-zu-1 Kommunikation
- Gruppen-Chatrooms (Klasse, Task-bezogen)
- Dateifreigabe in Chats
- Live-Chat über WebSocket (Socket.io)
- Chat-Verlauf und Persistierung
- Benutzer-Verwaltung in Chatrooms (joined_at, left_at)

### 4. **Dokumentenverwaltung**
- Upload und Speicherung von Dateien
- Dokumentenfreigabe zwischen Benutzern
- MIME-Type Validierung
- Dateigrößen-Tracking
- Integration mit Notes und Tasks

### 5. **Notizen & Lehrerbenotung**
- Erstellung von Notizen zu Aufgaben
- Lehrerlose Benotung und Rückmeldung
- Dokumentenanhänge zu Notizen
- Task-spezifische Noten für Grading

### 6. **Benachrichtigungssystem**
- Event-basierte Benachrichtigungen
- Email-Benachrichtigungen (Nodemailer)
- In-App Notifications mit Toast-UI
- Deadline-Warnungen
- Konfigurierbare Email-Präferenzen

### 7. **Klassenverwaltung**
- Verwaltung von Schulklassen
- Zuordnung von Lehrern zu Klassen
- Zuweisung von Schülern
- Department-Zugehörigkeit
- Klassenleiterverwaltung

### 8. **Stundenplaning & Ressourcenverwaltung**
- Stundenplan-Verwaltung
- Unterrichtsfächer und Räume
- Lesson-Slots mit Zeit und Ressourcen
- Lehrer-Scheduling

### 9. **Dashboard & Metriken**
- Aufgabenverteilung und Status-Übersicht
- Fortschritts-Charts
- Aufgaben-Statistiken
- Task-Activity Logging
- Performance-Metriken

### 10. **Berechtigungssystem**
- Granulare Berechtigungen
- Limitierte Permissions (mit valid_from/valid_to)
- Bitwise Flags: READ, WRITE, EXECUTE
- Audit-Logging von Änderungen
- Attribute-Based Access Control (ABAC) Elemente

---

## Informatik-Konzepte

### 1. **Architektural Patterns**

#### **Model-View-Controller (MVC)**
- Backend: NestJS implementiert MVC mit Services, Controllers und Models
- Frontend: Vue.js nutzt Component-basierte Architektur

#### **Modular Architecture (Monolithic Modular)**
Das Backend ist in 32+ spezialisierte Module unterteilt:
- `auth/` - Authentifizierung & Login
- `tasks/` - Aufgabenverwaltung
- `chat-rooms/` - Chat-Infrastruktur
- `notifications/` - Benachrichtigungen
- `permissions/` - Zugriffskontrolle
- `documents/` - Dateihandling
- (und weitere...)

Jedes Modul ist in sich geschlossen und kann unabhängig getestet und deployed werden.

#### **Repository Pattern (über Prisma ORM)**
- Datenbank-Operationen sind abstrahiert
- Services kommunizieren über Prisma-Client, nicht direkt mit SQL
- Ermöglicht einfaches Mocking in Tests

### 2. **Sicherheitskonzepte**

#### **Role-Based Access Control (RBAC)**
```
Benutzer → Rolle → Berechtigungen
  │         │         │
Student ─ Student ─ read_tasks
  │         │         view_dashboard
           │         │
Teacher ──Teacher ─ manage_tasks
(Rolle)              edit_tasks
                     view_students
```

**4 Hauptrollen im System:**
- Superuser (volle Kontrolle)
- Admin (Administration)
- Teacher (Lehrkraft)
- Student (Schüler)

#### **Attribute-Based Access Control (ABAC)**
- **Zeitliche Attribute**: `valid_from`, `valid_to` für temporäre Rechte
- **Ressourcen-Attribute**: Ownership-Checks (darf nur eigene Ressourcen bearbeiten)
- **Kontext-Attribute**: Task-Members (nur Mitglieder dürfen Task bearbeiten)

#### **Authentifizierung & Authorization**
- **JWT (JSON Web Tokens)**: Stateless, sessionless Authentifizierung
- **Passport.js**: Flexible Authentication Middleware
- **bcrypt**: Sichere Passwort-Hashing mit Salt
- **Guards & Decorators**: NestJS Guards für Route-Protection

### 3. **Datenverwaltung & Normalisierung (Datenbankdesign)**

#### **Normalisierung**
Die Datenbank folgt der **3. Normalform (3NF)**:
- Keine Redundanzen in Spalten
- Keine partiellen Dependencies
- Keine transitiven Dependencies

#### **Many-to-Many Beziehungen**
Beispiele (über Junction-Tabellen):
```
users ←═══════→ tasks (via task_members)
users ←═══════→ chat_rooms (via chat_room_users)
users ←═══════→ documents (via document_shares)
roles ←═══════→ permissions (via roles_permissions)
```

#### **Kaskadierende Operationen**
- Verwendet `onDelete: NoAction` für Datenintegrität
- Verhindert versehentliche Datenlöschung

### 4. **API-Design**

#### **REST-Prinzipien**
- Standard HTTP Methods: GET, POST, PUT, DELETE
- Resource-oriented URLs: `/api/tasks`, `/api/users`, `/api/chat-rooms`
- Status Codes: 200 (erfolg), 201 (erstellt), 400 (Fehler), 401 (Auth), 404 (nicht gefunden)
- JSON Request/Response Format

#### **API-Documentation (Swagger/OpenAPI)**
- Automatische API-Dokumentation via @nestjs/swagger
- Interaktive Dokumentation unter `/api/docs`
- Vollständige Endpoint-Beschreibung

### 5. **WebSocket & Real-Time Communication**

#### **Socket.io Implementation**
- Live-Chat ohne Polling
- Event-basierte Kommunikation
- Bidirektionale Verbindung (Client ↔ Server)
- Namespace für räumliche Trennung
- Broadcasting zu bestimmten Räumen

### 6. **State Management (Frontend)**

#### **Pinia Store Pattern**
```
Vue Components
      ↓
   Pinia Stores (Reactive State)
      ↓
API Services (REST/WebSocket)
      ↓
  Backend
```

**Stores im Projekt:**
- `authStore` - Authentifizierung & Benutzer-Session
- `notificationStore` - Benachrichtigungen
- `searchStore` - Suchfunktionalität

### 7. **Fehlerbehandlung & Validierung**

#### **Backend-Validierung (class-validator)**
```typescript
class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsInt()
  priority: number;
}
```

#### **Globale Exception Handling**
- Custom Exception-Klassen
- Einheitliche Error Response Format
- Logging von Exceptions

### 8. **Testing-Strategien**

#### **Unit Tests (Jest)**
- Service-Tests mit Mocks
- DTO Validierungs-Tests
- Business Logic Tests

#### **Integration Tests (Jest + Supertest)**
- E2E API-Tests
- Datenbankintegration
- Auth-Tests

#### **E2E Tests (Cypress)**
- User-Journey Tests
- UI Interaktions-Tests
- Real-Browser Testing

### 9. **Performance & Caching**

#### **Throttling**
- API-Rate Limiting via @nestjs/throttler
- Verhindert Brute-Force Attacks
- Konfigurierbare Limits pro Endpoint

#### **Indexing in Datenbank**
- Primary Keys für schnelle Lookups
- Foreign Keys für effiziente Joins
- Optimierte Queries via Prisma

### 10. **Logging & Monitoring**

#### **Task Activity Logging**
- Audit-Trail für alle Task-Änderungen
- `task_activity_log` Modell
- Wer, Was, Wann Tracking

#### **User Permissions Logging**
- Tracking von Permissionsänderungen
- Compliance & Security Auditing

---

## Medientechnik & Frontend-Technologien

### 1. **Web Framework: Vue.js 3**

#### **Komponentenbasierte Architektur**
```
App.vue (Root-Component)
├── Header.vue
├── Navigation.vue
├── RouterView (Dynamic Content)
│   ├── TaskView.vue
│   ├── ChatView.vue
│   ├── DashboardView.vue
│   └── ...
└── Footer.vue
```

#### **Single File Components (SFCs)**
- Template, Script, Style in einer Datei
- Scoped CSS für Stil-Isolation
- Reactive Data Binding

#### **Lifecycle Hooks**
```javascript
onMounted() { /* nach Component-Mount */ }
onUnmounted() { /* vor Component-Unmount */ }
computed() { /* reaktive berechnete Werte */ }
watch() { /* Reaktion auf Datenänderungen */ }
```

### 2. **Build-Tool: Vite**

#### **Eigenschaften**
- Extrem schnelle Entwicklungs-Server (ESM-based)
- Zero-Config Setup für Vue 3
- Production-Build Optimierung
- Hot Module Replacement (HMR) für Live Updates

#### **Entwickler-Experience**
```bash
npm run frontend      # Vite Dev Server
npm run build         # Production Build
npm run preview       # Production Preview
```

### 3. **UI/Component Libraries**

#### **Bootstrap 5**
- CSS Grid & Flexbox basiert
- Pre-built Components (Buttons, Forms, Modals)
- Responsive Design (Mobile-First)
- Dark/Light Theme Support

#### **Chart.js + Vue-ChartJS**
- Datenvisualisierung
- Aufgaben-Status Distribution
- Progress Charts
- Task-Activity Graphen

### 4. **State Management: Pinia**

#### **Stores (Pseudo-Code)**
```javascript
// stores/authStore.js
const authStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    token: null
  }),
  actions: {
    async login(credentials) { /* ... */ },
    logout() { /* ... */ }
  },
  getters: {
    userRole: (state) => state.user?.role
  }
})
```

### 5. **Styling & CSS Preprocessing**

#### **Sass/SCSS**
```scss
$primary-color: #007bff;
$breakpoint-sm: 576px;

@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.button {
  background: $primary-color;
  @include flex-center;
  
  @media (max-width: $breakpoint-sm) {
    padding: 8px 12px;
  }
}
```

### 6. **Routing: Vue Router v4**

#### **Nested Routes & Lazy Loading**
```javascript
const routes = [
  {
    path: '/tasks',
    component: TaskView,
    children: [
      { path: ':id', component: TaskDetail }
    ]
  },
  {
    path: '/chat',
    component: () => import('./views/ChatView.vue') // Lazy Load
  }
]
```

#### **Navigation Guards (für Authentication)**
```javascript
router.beforeEach((to, from, next) => {
  if (to.requiresAuth && !isAuthenticated()) {
    next('/login')
  } else {
    next()
  }
})
```

### 7. **Real-Time Frontend Communication**

#### **Socket.io Client**
```javascript
// Frontend Connection
const socket = io('http://localhost:3000')

socket.on('chat:message', (msg) => {
  chatStore.addMessage(msg)
})

socket.emit('chat:send', { room: 'task-123', text: 'Hello' })
```

### 8. **Testing: Vitest & Cypress**

#### **Unit/Integration Tests (Vitest)**
```javascript
describe('TaskMembers', () => {
  it('should add member to task', async () => {
    const result = await taskMembersService.addMember(123, 456)
    expect(result.success).toBe(true)
  })
})
```

#### **E2E Tests (Cypress)**
```javascript
// cypress/e2e/create-task.cy.js
describe('Create Task', () => {
  it('should create a new task', () => {
    cy.login('dev', 'devuser')
    cy.visit('/tasks')
    cy.get('[data-cy=new-task-btn]').click()
    cy.get('[data-cy=task-title]').type('Buy Groceries')
    cy.get('[data-cy=submit]').click()
    cy.should('contain', 'Task created successfully')
  })
})
```

### 9. **Responsive Design**

#### **Mobile-First Approach**
```scss
// Base: Mobile
.task-list {
  display: flex;
  flex-direction: column;
}

// Tablet+
@media (min-width: 768px) {
  .task-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

// Desktop
@media (min-width: 1024px) {
  .task-list {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### 10. **Accessibility (A11y)**

#### **ARIA Labels & Semantic HTML**
```html
<button aria-label="Close modal" @click="closeModal">×</button>
<nav aria-label="Main navigation">...</nav>
<main role="main">...</main>
```

---

## Datenbank-Technologie

### 1. **PostgreSQL: Enterprise-Grade DBMS**

#### **Warum PostgreSQL?**
- ✅ **Open Source** & kostenlos
- ✅ **ACID-Compliance**: Garantierte Datenkonsistenz
- ✅ **Advanced Features**: JSON, UUID, Full-Text Search
- ✅ **Skalierbar**: Millionen Zeilen ohne Performance-Probleme
- ✅ **Security**: Built-in User Management & Encryption

#### **Verwendete Features**
```sql
-- 1. Foreign Keys & Constraints
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_users 
FOREIGN KEY (assigned_to) REFERENCES users(user_id);

-- 2. Indexes für Optimierung
CREATE INDEX idx_tasks_user_id ON tasks(assigned_to);

-- 3. Timestamps (Auditing)
CREATE TABLE tasks (
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Enums
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
```

### 2. **Prisma ORM: Modern Database Layer**

#### **Schema Definition**
```prisma
model tasks {
  task_id       Int         @id @default(autoincrement())
  title         String
  description   String?
  status        String      @default("todo")
  priority_id   Int?
  assigned_to   Int?
  created_at    DateTime    @default(now())
  updated_at    DateTime    @updatedAt
  
  // Relations
  assigned_user users?      @relation("tasks_assigned_toTousers", fields: [assigned_to], references: [user_id])
  task_members  task_members[]
  comments      task_comments[]
  documents     task_documents[]
}
```

#### **Query-Optimierung (Prisma)**
```typescript
// Eager Loading verhindert N+1 Problem
const tasks = await prisma.tasks.findMany({
  include: {
    assigned_user: true,        // JOIN users
    task_members: {
      include: { user: true }   // Nested JOIN
    },
    comments: true              // JOIN comments
  },
  where: { status: 'in_progress' }
})
```

### 3. **Datenbankscema: Entities & Relations**

#### **Core Entities**

**Users** (Benutzer)
```
user_id | email | name | role_id | created_at | ...
```

**Tasks** (Aufgaben)
```
task_id | title | assigned_to | status | priority | created_at | ...
```

**Roles & Permissions** (Zugriffskontrolle)
```
Role (Admin, Teacher, Student)
  ↓
RolePermission (Brücken-Tabelle)
  ↓
Permission (read_tasks, manage_users, ...)

// Mit ABAC Features:
- valid_from / valid_to (Zeitbeschränkung)
- flags: READ | WRITE | EXECUTE (Granular Permissions)
```

**Many-to-Many Beziehungen**

```
users ←─{many-to-many}─→ tasks
        (task_members)
        └─ created_at
        └─ role

users ←─{many-to-many}─→ chat_rooms
        (chat_room_users)
        └─ joined_at
        └─ left_at (wann verlassen)

users ←─{many-to-many}─→ documents
        (document_shares)
        └─ created_at
```

### 4. **Datenbank-Migrationen**

#### **Schema Evolution mit Prisma Migrate**
```bash
# Änderung im schema.prisma vornehmen
# Dann:
prisma migrate dev --name "add_task_priority"

# Dieser Prozess:
1. Erstellt Migrationsdatei (timestamp_beschreibung.sql)
2. Führt Migration aus (DB Schema aktualisiert)
3. Regeneriert Prisma Client
```

#### **Migrations im Projekt (Beispiele)**
- `20260210122829_init_postgres` - Initialisierung
- `20260211100856_make_user_fields_required` - Schema Refactor
- `20260222225142_add_email_preferences_and_logs` - Neue Features
- `20260325075951_add_task_members_to_tasks` - RBAC-Verbesserung
- `20260329194459_add_task_locking_fields` - Task-Locking Feature

### 5. **Data Integrity & Constraints**

#### **Referentielle Integrität**
```sql
-- Verhindert, dass Aufgaben auf nicht-existierende Benutzer verweisen
CREATE TABLE tasks (
  assigned_to INT REFERENCES users(user_id)
)
```

#### **Cascade & No Action**
```prisma
// onDelete: NoAction (verhindert Löschung mit Abhängigen)
// onDelete: Cascade (löscht automatisch abhängige Datensätze)
// onDelete: SetNull (setzt auf NULL, wenn Parent gelöscht)

assigned_user users? @relation(..., onDelete: SetNull)
```

#### **Unique Constraints**
```sql
-- E-Mail muss unique sein
ALTER TABLE users ADD UNIQUE(email);

-- Composite Unique für 1-zu-1 Chat Hashes
ALTER TABLE chat_rooms ADD UNIQUE(direct_chat_hash);
```

### 6. **Query-Performance**

#### **Indexing**
```sql
-- Index für häufige Queries
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_members_user ON task_members(user_id);
```

#### **Normalisierung für Speed**
- Vermeidung von denormalisierten Daten
- Junction-Tabellen statt JSON Arrays
- Foreign Keys statt redundanten Kopien

### 7. **Seed Data & Test Fixtures**

#### **Prisma Seed Script**
```typescript
// prisma/seed.ts
async function main() {
  // Erstelle Test-Benutzer
  const teacher = await prisma.users.create({
    data: { email: 'teacher@example.com', ... }
  })
  
  // Erstelle Test-Aufgaben
  await prisma.tasks.createMany({
    data: [
      { title: 'Task 1', assigned_to: teacher.user_id },
      { title: 'Task 2', assigned_to: teacher.user_id }
    ]
  })
}
```

### 8. **SQL Features & Advanced Queries**

#### **Aggregation & Grouping**
```sql
-- Z.B. für Dashboard-Metriken
SELECT 
  status,
  COUNT(*) as count,
  AVG(priority) as avg_priority
FROM tasks
GROUP BY status;
```

#### **Joins für Complex Data**
```sql
-- Task mit allen Infos
SELECT t.*, u.name as assigned_user, p.name as priority
FROM tasks t
LEFT JOIN users u ON t.assigned_to = u.user_id
LEFT JOIN priorities p ON t.priority_id = p.priority_id
WHERE t.status = 'in_progress';
```

---

## Architektur & Design Patterns

### 1. **Layered Architecture**

```
┌─────────────────────────────────────┐
│      Presentation (Vue.js)          │
│  UI Components, Forms, Charts       │
└─────────────────────────────────────┘
              ↓ HTTP/WebSocket
┌─────────────────────────────────────┐
│    Control (Express/NestJS)         │
│  Routes, Controllers, Validation    │
└─────────────────────────────────────┘
              ↓ Service Calls
┌─────────────────────────────────────┐
│ Business Logic (Services)           │
│  Auth, Tasks, Chat, Notifications   │
└─────────────────────────────────────┘
              ↓ ORM Queries
┌─────────────────────────────────────┐
│   Data Access (Prisma ORM)          │
│  Database Abstraction               │
└─────────────────────────────────────┘
              ↓ SQL
┌─────────────────────────────────────┐
│    Database (PostgreSQL)            │
│  Persistent Storage                 │
└─────────────────────────────────────┘
```

### 2. **Dependency Injection**

#### **NestJS IoC Container**
```typescript
@Module({
  providers: [
    TasksService,
    TaskMembersService,
    NotificationsService
  ],
  controllers: [TasksController]
})
export class TasksModule {}

// Im Controller:
@Controller('tasks')
export class TasksController {
  constructor(
    private tasksService: TasksService,
    private notificationService: NotificationsService
  ) {}
}
```

### 3. **Middleware & Pipes**

#### **Authentication Middleware**
```typescript
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  // Nur authentifizierte Benutzer können zugreifen
  @Get()
  getTasks() { }
}
```

#### **Validation Pipes**
```typescript
@Post()
createTask(@Body(new ValidationPipe()) createTaskDto: CreateTaskDto) {
  // DTO wird automatisch validiert
}
```

### 4. **Event-Driven Architecture (mit WebSocket)**

```
User Action → Event Emit → Server Handler → Broadcast to Room
   │ Chat        │ socket.emit   │ chat:send      │socket.to()
   │ senden      │ 'chat:send'   │ Event Handler  │ alle Clients
```

### 5. **Design Patterns Used**

| Pattern | Verwendung | Beispiel |
|---------|-----------|----------|
| **Singleton** | Services, Logger | TasksService (instanz pro App) |
| **Factory** | Factory Functions | UserFactory, TaskFactory |
| **Observer** | Vue Reaktivität | Pinia Stores, @Watch |
| **Strategy** | Permission Checks | RBAC Strategy, ABAC Strategy |
| **Decorator** | Validation, Guards | @IsEmail(), @UseGuards() |
| **Proxy** | Prisma Client | ORM abstrahiert SQL |
| **Adapter** | Passport Strategies | LocalStrategy, JwtStrategy |
| **Repository** | Data Access | TaskRepository (via Prisma) |
| **DTO (Data Transfer Object)** | API Contracts | CreateTaskDto, UpdateTaskDto |

---

## 🎓 Fazit: Wichtigste Konzepte zusammengefasst

### **Informatik**
1. ✅ **Architektur**: Layered MVC + Modular Design
2. ✅ **Security**: JWT Auth, RBAC/ABAC, Bcrypt Hashing
3. ✅ **Design Patterns**: Dependency Injection, Singleton, Observer, Strategy
4. ✅ **Testing**: Unit-, Integration-, E2E Tests
5. ✅ **Error Handling**: Exception Filters, Validation
6. ✅ **Performance**: Indexing, Caching, Rate Limiting

### **Medientechnik**
1. ✅ **Frontend Framework**: Vue 3 mit Component Architecture
2. ✅ **Build Tool**: Vite (ESM-based, schnell)
3. ✅ **Styling**: Sass/SCSS mit Responsives Design
4. ✅ **State Management**: Pinia für globale Zustandsverwaltung
5. ✅ **Real-Time**: Socket.io für Live-Chat
6. ✅ **Data Visualization**: Chart.js für Metriken
7. ✅ **Testing**: Vitest + Cypress

### **Datenbanken**
1. ✅ **DBMS**: PostgreSQL (ACID, Relational)
2. ✅ **ORM**: Prisma (Type-safe, Auto-Generated)
3. ✅ **Normalisierung**: 3NF mit vielen Many-to-Many Relations
4. ✅ **Integrität**: Foreign Keys, Constraints, Cascades
5. ✅ **Migrationen**: Version-kontrollierte Schema-Evolution
6. ✅ **Queries**: Eager Loading, Indexing für Performance

---

**Projekt-Status**: Beta/Evaluation Phase (Feature-Branch: `feature-35-dashboard-metriken-ausbau`)  
**Version**: 0.0.1  
**Last Updated**: März 2026
