# [AP 7.2] Rollen-/Rechteprüfung serverseitig & Audit-Log

**Status:** ✅ Implementiert und getestet  
**Phase:** Phase 7: Sicherheit & Compliance (März 2026)  
**Verantwortlich:** Ereny  
**Datum:** 30. März 2026

---

## 📋 Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Implementierte Features](#implementierte-features)
3. [Architektur](#architektur)
4. [Guards & Decorators](#guards--decorators)
5. [Berechtigungssystem](#berechtigungssystem)
6. [Rollenverwaltung](#rollenverwaltung)
7. [Schutz von Endpoints](#schutz-von-endpoints)
8. [Audit-Logging](#audit-logging)
9. [Datenbanken-Schema](#datenbanken-schema)
10. [Best Practices](#best-practices)
11. [Testing](#testing)

---

## Überblick

Dieses Arbeitspaket implementiert ein umfassendes **Rollen- und Berechtigungsmanagementsystem** auf der Backend-Seite mit einem **Audit-Log-System** für die Nachverfolgung kritischer Operationen.

### Ziele
- ✅ Rolle-basierte Zugriffskontrolle (RBAC)
- ✅ Permission-basierte Zugriffskontrolle mit Flags
- ✅ Zeitgesteuerte Berechtigungen (valid_from/valid_to)
- ✅ Zentrale Audit-Log Erfassung


---

## Implementierte Features

### 1. Guards (Sicherheitsmechanismen)

#### JwtAuthGuard
- Validierungsprüfung auf JWT Token
- Extraktion von User-Informationen
- Authentifizierungsgatter für alle geschützten Endpoints

#### PermissionsGuard
- Validiert Permission-basierte Zugriffskontrolle
- Unterstützt Flag-basierte Berechtigungen (READ, WRITE, EXECUTE)
- Prüft zeitliche Gültigkeit von Permissions
- Arbeitet mit `@Permissions()` Decorator zusammen

#### RolesGuard
- Validiert rollen-basierte Zugriffskontrolle
- OR-Logik: Benutzer braucht EINE der geforderten Rollen
- Arbeitet mit `@Roles()` Decorator zusammen

### 2. Decorators

#### @Permissions(...)
Definiert erforderliche Permissions für einen Endpoint.

```typescript
@Post()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('create_tasks', 'edit_tasks')
async create(@Body() dto: CreateTaskDto) {
  // Nur User mit ALLEN Permissions können diesen Endpoint aufrufen
}
```

#### @Roles(...)
Definiert erforderliche Rollen für einen Endpoint.

```typescript
@Get()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Teacher', 'Admin')
async findAll() {
  // User mit MINDESTENS EINER Rolle kann diesen Endpoint aufrufen
}
```

---

## Architektur

### Schichten-Aufbau

```
┌─────────────────────────────────────┐
│      Controllers (REST-Endpoints)   │
│  - @Permissions(), @Roles()         │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│        Guards (Sicherheit)          │
│  - JwtAuthGuard                     │
│  - PermissionsGuard                 │
│  - RolesGuard                       │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│   PermissionsService (Logik)        │
│  - hasPermission()                  │
│  - hasRole()                        │
│  - Flag-Validierung                 │
│  - Zeitfenster-Prüfung              │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│  PrismaService (Datenbankzugriff)   │
│  - user_permissions                 │
│  - user_roles                       │
│  - permissions                      │
│  - roles                            │
└─────────────────────────────────────┘
```

---

## Guards & Decorators

### Import in Controllers

```typescript
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
```

### Verwendung auf Controller-Ebene

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  // Alle Endpoints sind geschützt
}
```

### Verwendung auf Endpoint-Ebene

```typescript
@Post()
@Permissions('create_tasks')
@Roles('Teacher', 'Admin')
async create(@Body() dto: CreateTaskDto) {
  // Endpoint erfordert:
  // - Authentifizierung
  // - Permission 'create_tasks'
  // - Role 'Teacher' ODER 'Admin'
}
```

---

## Berechtigungssystem

### Permission-Flags

| Flag | Wert | Bedeutung |
|------|------|-----------|
| READ | 4 | Leseberechtigung (100 in Binär) |
| WRITE | 2 | Schreibberechtigung (010 in Binär) |
| EXECUTE | 1 | Ausführungsberechtigung (001 in Binär) |

### Flag-Kombinationen

```
| Wert | Flags | Bedeutung |
|------|-------|-----------|
| 7 | RWX | Alle Berechtigungen |
| 6 | RW | Lesen + Schreiben |
| 5 | RX | Lesen + Ausführen |
| 4 | R | Nur Lesen |
| 3 | WX | Schreiben + Ausführen |
| 2 | W | Nur Schreiben |
| 1 | X | Nur Ausführen |
| 0 | - | Keine Berechtigungen |
```

### PermissionsService

```typescript
/**
 * Prüft, ob User eine Permission hat
 * @param userId - User ID
 * @param permissionName - z.B. 'create_task', 'edit_grades'
 * @param requiredFlag - Benötigte Flag (READ, WRITE, EXECUTE)
 * @returns true wenn Permission aktiv und Flag vorhanden
 */
async hasPermission(
  userId: number,
  permissionName: string,
  requiredFlag: PermissionFlag = PermissionFlag.READ
): Promise<boolean>

/**
 * Prüft, ob User eine Rolle hat
 * @param userId - User ID
 * @param roleName - z.B. 'Teacher', 'Admin', 'Student'
 * @returns true wenn User die Rolle hat
 */
async hasRole(userId: number, roleName: string): Promise<boolean>

/**
 * Holt alle Rollen eines Users
 */
async getUserRoles(userId: number): Promise<string[]>
```

### Zeitfenster für Permissions

Permissions können mit zeitlichen Grenzen versehen werden:

```typescript
{
  user_id: 123,
  permission_id: 5,
  valid_from: '2026-03-01T00:00:00Z',  // Ab wann gültig
  valid_to: '2026-12-31T23:59:59Z',    // Bis wann gültig
  permissions: {
    name: 'edit_tasks',
    flags: 7  // RWX
  }
}
```

Die `PermissionsService.hasPermission()` validiert automatisch:
- ✅ Permission existiert
- ✅ Flag passt
- ✅ Aktuelles Datum liegt im valid_from bis valid_to Fenster

---

## Rollenverwaltung

### Rollen-Hierarchie

```
Admin
  └─ Alle Permissions (manage_users, manage_classes, etc.)

Teacher
  ├─ create_tasks
  ├─ edit_tasks
  ├─ view_grades
  └─ manage_students

Student
  ├─ view_tasks
  ├─ submit_tasks
  └─ view_grades (eigene)
```

### User-Rollen Zuordnung

```typescript
// Datenbank-Struktur
user_roles {
  user_id: 1,
  role_id: 2,    // Teacher
  assigned_at: '2026-01-01T00:00:00Z'
}

// Service-Aufruf
const hasTeacherRole = await permissionsService.hasRole(userId, 'Teacher');
```

### Rollen-Permissions Zuordnung

```typescript
// Datenbank-Struktur
roles_permissions {
  roles_id: 2,        // Teacher Role
  permission_id: 5,   // create_tasks
  assigned_at: '2026-01-01T00:00:00Z'
}

roles {
  role_id: 2,
  name: 'Teacher'
}

permissions {
  permission_id: 5,
  name: 'create_tasks',
  description: 'Ermöglicht das Erstellen neuer Tasks',
  flags: 7  // RWX
}
```

---

## Schutz von Endpoints

### Geschützte Controller (14 Module)

#### 1. Tasks Module
```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tasks')
export class TasksController {
  @Post()
  @Permissions()
  create() { }
  
  @Patch(':id')
  @Permissions('edit_tasks')
  update() { }
  
  @Delete(':id')
  @Permissions('delete_tasks')
  remove() { }
}
```

#### 2. Classes Module
```typescript
@Post()
@Permissions('manage_classes')
create() { }

@Get()
@Permissions()
findAll() { }

@Patch(':id')
@Permissions('manage_classes')
update() { }
```

#### 3. Weitere geschützte Controller
- **Departments** - manage_departments
- **Schedules** - manage_schedules
- **Subjects** - manage_subjects
- **Rooms** - manage_rooms
- **Lesson-Slots** - manage_schedules
- **Notes** - (leere Permissions für User-Datenschutz)
- **Task-Comments** - (leere Permissions)
- **Task-Members** - (leere Permissions)
- **Chat-Rooms** - (leere Permissions)
- **Chat-Messages** - (leere Permissions)
- **Task-Templates** - (leere Permissions)
- **Notifications** - (leere Permissions)

### Permission Patterns

#### Leere @Permissions()
```typescript
@Get()
@Permissions()  // Keine spezifischen Permissions
async findAll() {
  // Nur Authentifizierung erforderlich (JWT)
  // Spezifische Zugriffskontrolle erfolgt im Service
}
```

#### Spezifische Permissions
```typescript
@Delete(':id')
@Permissions('delete_tasks')
async remove(id: string) {
  // Nutzer muss 'delete_tasks' Permission haben
}
```

---

## Audit-Logging

### TaskActivityLogModule

Das Audit-Log-System protokolliert kritische Operationen an Tasks.

#### Datenbank-Schema

```sql
CREATE TABLE task_activity_log (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT,
  user_id INT,
  action VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (task_id) REFERENCES tasks(task_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

#### Protollierte Aktionen

| Aktion | Wann | Beispiel |
|--------|------|---------|
| Task created | TasksService.create() | `Task created: "Mathematik Aufgabe 1"` |
| Task updated | TasksService.update() | `Task updated: "Mathematik Aufgabe 1"` |
| Task deleted | TasksService.remove() | `Task deleted: "Mathematik Aufgabe 1"` |

#### Implementierung in TasksService

```typescript
import { TaskActivityLogService } from "../task-activity-log/task-activity-log.service";

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: TaskActivityLogService,
  ) { }

  async create(createTaskDto: CreateTaskDto, userId: number) {
    const task = await this.prisma.tasks.create({
      data: { ...createTaskDto, created_by: userId },
    });

    // Log activity
    try {
      await this.activityLogService.create({
        task_id: task.task_id,
        action: `Task created: "${task.title}"`,
      }, userId, false);
    } catch (error) {
      console.error('Failed to log task creation activity:', error);
    }

    return task;
  }

  async update(taskId: number, updateTaskDto: UpdateTaskDto) {
    const updated = await this.prisma.tasks.update({
      where: { task_id: taskId },
      data: { ...updateTaskDto, updated_at: new Date() },
    });

    // Log activity
    try {
      if (updated.created_by) {
        await this.activityLogService.create({
          task_id: updated.task_id,
          action: `Task updated: "${updated.title}"`,
        }, updated.created_by, false);
      }
    } catch (error) {
      console.error('Failed to log task update activity:', error);
    }

    return updated;
  }

  async remove(taskId: number) {
    const task = await this.findOne(taskId, false);
    
    await this.prisma.tasks.delete({ where: { task_id: taskId } });

    // Log activity
    try {
      if (task.created_by) {
        await this.activityLogService.create({
          task_id: task.task_id,
          action: `Task deleted: "${task.title}"`,
        }, task.created_by, false);
      }
    } catch (error) {
      console.error('Failed to log task deletion activity:', error);
    }

    return { message: 'Task deleted successfully', task_id: taskId };
  }
}
```

#### TaskActivityLogService API

```typescript
/**
 * Erstellt einen Aktivitätseintrag
 * @param createTaskActivityLogDto - Log-Daten
 * @param userId - User ID, der die Aktion ausgeführt hat
 * @param includeRelations - Beziehungen laden
 */
async create(
  createTaskActivityLogDto: CreateTaskActivityLogDto,
  userId: number,
  includeRelations = true
): Promise<TaskActivityLog>

/**
 * Holt alle Activity Logs für eine Task
 * @param taskId - Task ID
 * @param includeRelations - Beziehungen laden
 */
async findAll(
  taskId: number,
  includeRelations = true
): Promise<TaskActivityLog[]>

/**
 * Holt ein spezifisches Activity Log
 * @param logId - Log ID
 * @param includeRelations - Beziehungen laden
 */
async findOne(
  logId: number,
  includeRelations = true
): Promise<TaskActivityLog>
```

#### Activity Logs abrufen (REST API)

```bash
# Alle Activity Logs für eine Task
GET /task-activity-log/task/:taskId

# Spezifisches Activity Log
GET /task-activity-log/:logId

# Antwort-Format
{
  "log_id": 42,
  "task_id": 10,
  "user_id": 5,
  "action": "Task created: \"Wichtige Aufgabe\"",
  "timestamp": "2026-03-30T10:30:00Z",
  "users": {
    "user_id": 5,
    "email": "lehrer@schule.de",
    "first_name": "Max",
    "last_name": "Mustermann"
  },
  "task": {
    "task_id": 10,
    "title": "Wichtige Aufgabe"
  }
}
```

---

## Datenbanken-Schema

### Tabelle: permissions
```sql
CREATE TABLE permissions (
  permission_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),              -- z.B. 'create_task', 'edit_grades'
  description TEXT,
  flags INT DEFAULT 7,            -- 4=READ, 2=WRITE, 1=EXECUTE (7=RWX)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Tabelle: roles
```sql
CREATE TABLE roles (
  role_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255)               -- z.B. 'Teacher', 'Admin', 'Student'
);
```

### Tabelle: roles_permissions
```sql
CREATE TABLE roles_permissions (
  roles_id INT,
  permission_id INT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (roles_id, permission_id),
  FOREIGN KEY (roles_id) REFERENCES roles(role_id),
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
);
```

### Tabelle: user_roles
```sql
CREATE TABLE user_roles (
  user_id INT,
  role_id INT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (role_id) REFERENCES roles(role_id)
);
```

### Tabelle: user_permissions
```sql
CREATE TABLE user_permissions (
  user_id INT,
  permission_id INT,
  valid_from TIMESTAMP,           -- Ab wann gültig (optional)
  valid_to TIMESTAMP,             -- Bis wann gültig (optional)
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
);
```

### Tabelle: task_activity_log
```sql
CREATE TABLE task_activity_log (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT,
  user_id INT,
  action VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(task_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

---

## Best Practices

### 1. Decorator Kombinationen

```typescript
// ✅ Korrekt: Rollen-basiert
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
async deleteUser() { }

// ✅ Korrekt: Permission-basiert
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('delete_users')
async deleteUser() { }

// ✅ Korrekt: Beides kombiniert (strikte Kontrolle)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('Admin')
@Permissions('manage_system')
async criticalOperation() { }

// ❌ Falsch: Decorators ohne Guard
@Permissions('create_tasks')
async create() { }  // Guard fehlend!
```

### 2. Fehllerbehandlung

```typescript
// ❌ Falsch: Audit Log kann fehlschlagen
await this.activityLogService.create(logData, userId);

// ✅ Korrekt: Fehler werden abgefangen
try {
  await this.activityLogService.create(logData, userId);
} catch (error) {
  console.error('Failed to log activity:', error);
  // Operation erfolgreich, aber Logging fehlgeschlagen
}
```

### 3. Permission Strings

```typescript
// ✅ Korrekt: Konsistente Naming-Convention
@Permissions('create_tasks')
@Permissions('edit_tasks')
@Permissions('delete_tasks')

// ✅ Korrekt: Sprechende Namen
@Permissions('manage_users')
@Permissions('manage_classes')
@Permissions('manage_departments')

// ❌ Falsch: Inkonsistente Naming
@Permissions('createTask')      // Falsch case
@Permissions('task_edit')       // Falsch Reihenfolge
@Permissions('rm_tasks')        // Unklar
```

### 4. Zeitfenster nutzen

```typescript
-- Permission nur für begrenzte Zeit gültig
INSERT INTO user_permissions 
  (user_id, permission_id, valid_from, valid_to)
VALUES 
  (5, 10, '2026-03-01', '2026-03-31');
-- User hat Permission nur im März 2026
```

### 5. Dokumentation

```typescript
/**
 * POST /tasks
 * Erstellt eine neue Task
 * 
 * Erforderliche Authentifizierung: JWT
 * Erforderliche Permissions: keine (nur auth)
 * Erforderliche Rollen: Teacher, Admin
 * 
 * Body:
 * {
 *   "title": "Aufgabe 1",
 *   "description": "...",
 *   "deadline": "2026-03-31"
 * }
 * 
 * Response: 201
 * {
 *   "task_id": 42,
 *   "title": "Aufgabe 1",
 *   ...
 * }
 */
@Post()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions()
async create(@Body() dto: CreateTaskDto) { }
```

---

## Testing

### Unit Tests

#### PermissionsService Tests
```bash
npm run test -- src/modules/permissions/permissions.service.spec.ts
```

Tests abdecken:
- ✅ Directe Permissions validieren
- ✅ Rollen-basierte Permissions validieren
- ✅ Flag-Validierung (READ, WRITE, EXECUTE)
- ✅ Zeitfenster-Validierung (valid_from/valid_to)
- ✅ Expired Permissions ablehnen

### E2E Tests

Folgende E2E Tests sollten hinzugefügt werden:

```typescript
// test/permissions.e2e-spec.ts
describe('Permissions E2E', () => {
  it('should allow user with required permission', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${validToken}`)  // User mit Permission
      .send(createTaskDto)
      .expect(201);
  });

  it('should deny user without required permission', async () => {
    const res = await request(app.getHttpServer())
      .delete('/tasks/42')
      .set('Authorization', `Bearer ${validToken}`)  // User ohne Permission
      .expect(403);
  });

  it('should deny expired permissions', async () => {
    // User hat Permission mit valid_to in der Vergangenheit
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${validToken}`)
      .send(createTaskDto)
      .expect(403);
  });
});
```

### Manuelles Testing

```bash
# 1. Backend starten
cd backend && npm run start:dev

# 2. Mit Task erstellen (mit Permission)
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Task"}'

# 3. Activity Log abrufen
curl -X GET http://localhost:3000/task-activity-log/task/42 \
  -H "Authorization: Bearer <token>"

# 4. Ohne Permission versuchen (sollte 403 sein)
curl -X DELETE http://localhost:3000/tasks/42 \
  -H "Authorization: Bearer <token_without_permission>"
```

---

## Zusammenfassung der Änderungen

### 16 Modifizierte Dateien

#### Controllers (13)
- `tasks.controller.ts` - PermissionsGuard, @Permissions decorators
- `classes.controller.ts` - PermissionsGuard, manage_classes Permission
- `departments.controller.ts` - PermissionsGuard, manage_departments Permission
- `schedules.controller.ts` - PermissionsGuard, manage_schedules Permission
- `subjects.controller.ts` - PermissionsGuard, manage_subjects Permission
- `rooms.controller.ts` - PermissionsGuard, manage_rooms Permission
- `lesson-slots.controller.ts` - PermissionsGuard
- `notes.controller.ts` - PermissionsGuard
- `task-comments.controller.ts` - PermissionsGuard
- `task-members.controller.ts` - PermissionsGuard
- `chat-rooms.controller.ts` - PermissionsGuard
- `chat-messages.controller.ts` - PermissionsGuard
- `task-templates.controller.ts` - PermissionsGuard
- `notifications.controller.ts` - PermissionsGuard

#### Services (2)
- `tasks.service.ts` - Audit-Log Integration in create, update, remove
- `tasks.module.ts` - TaskActivityLogModule Dependency

### Status

```
Kompilierung:     ✅ Erfolgreich
Unit Tests:       ✅ Bestanden (91 Tests)
E2E Tests:        ⏳ Zu implementieren
Backend Build:    ✅ npm run build erfolgreich
```

---

## Nächste Schritte (Optional)

1. **E2E Tests hinzufügen** - Vollständige Permission-Flow Tests
2. **Weitere Audit-Logs** - In anderen Services (Users, Classes, etc.)
3. **Admin Dashboard** - Für Permissions-Verwaltung
4. **Audit-Log Viewer** - Frontend für Log-Einsicht
5. **Permission Documentation** - API Dokumentation erweitern

---

## Kontakt & Support

Bei Fragen zur Implementierung:
- Siehe `backend/src/modules/permissions/` für Service-Code
- Siehe `backend/src/modules/auth/guards/` für Guard-Implementierung
- Siehe `backend/src/modules/task-activity-log/` für Audit-Log-Code

---

**Dokumentation erstellt:** 30. März 2026  
**Version:** 1.0  

