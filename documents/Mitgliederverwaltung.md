# Mitgliederverwaltung für Tasks - Konzept und Implementierung

## Überblick

Die Mitgliederverwaltung ermöglicht es, Benutzer zu Tasks hinzuzufügen und ihnen damit Zugriff auf diese Tasks zu geben. **Wichtig**: Die eigentlichen **Berechtigungen (Permissions)** sind **global pro Benutzer** und werden durch das existierende `user_permissions` und `user_roles` System gesteuert, nicht durch Task-spezifische Rollen.

### Konzeptueller Aufbau

```
┌─────────────────────────────────────────────────┐
│              USER-PERMISSIONS SYSTEM             │
│  (Global, zeitlich unbegrenzt oder datiert)    │
├─────────────────────────────────────────────────┤
│ user_permissions: USER_ID → PERMISSION_ID      │
│ Flags: READ (4) | WRITE (2) | EXECUTE (1)      │
│ Beispiel: User.123 hat Permission.5 (EDIT)    │
└─────────────────────────────────────────────────┘
           ↑
           │ wird geprüft für
           │
┌─────────────────────────────────────────────────┐
│        TASK-MEMBERSHIP MAPPING                   │
├─────────────────────────────────────────────────┤
│ task_members: TASK_ID ↔ USER_ID                 │
│ Nur: task_id, user_id, joined_at               │
│ → "User.123 ist Mitglied von Task.42"          │
└─────────────────────────────────────────────────┘
```

---

## Datenstruktur

### `task_members` Model (neu)

```prisma
model task_members {
  task_id    Int
  user_id    Int
  joined_at  DateTime   @default(now()) @db.Timestamp(6)
  
  tasks      tasks      @relation(fields: [task_id], references: [task_id], onDelete: Cascade)
  users      users      @relation(fields: [user_id], references: [user_id], onDelete: Cascade)
  
  @@id([task_id, user_id])
}
```

**Aufgabe**: Bildet eine Viele-zu-Viele-Beziehung zwischen Tasks und Users. Der Task-Creator inkl. `assigned_to` User ist implizit auch Mitglied.

**Zeitstempel**: `joined_at` dokumentiert, wann der Benutzer hinzugefügt wurde.

---

## Permission-Checks

### Bitweise Flags (rwx-Modell)

Die `permissions.flags` verwenden bitweise Operationen:

```
READ:    0b100 = 4   (Daten lesen)
WRITE:   0b010 = 2   (Daten ändern)
EXECUTE: 0b001 = 1   (Aktion ausführen, z.B. abschließen)

Kombinationen:
R + W + X = 0b111 = 7 (Vollzugriff)
R + W     = 0b110 = 6 (Lesen + Schreiben)
R         = 0b100 = 4 (Nur Lesen)
X         = 0b001 = 1 (Nur Ausführen)
```

### Guard-Logik

Für jeden Task-Zugriff wird geprüft:

1. **Ist der User Mitglied der Task?** (task_members Abfrage)
2. **Hat der User die nötige Permission?** (bitwise Flag-Check)

```typescript
// Pseudo-Code für WRITE-Check auf Task.42
const user = getCurrentUser();
const task = await getTask(42);

// 1. Membership-Check
const isMember = await task_members.exists(task.id, user.id);
if (!isMember) throw ForbiddenException();

// 2. Permission-Check
const perm = await user_permissions.find(user.id, 'edit_task');
const hasWrite = (perm.flags & 2) !== 0; // Bit 2 = WRITE
if (!hasWrite) throw ForbiddenException();
```

---

## API-Endpoints

### Erstelle Task-Member (Owner/Manager)

```http
POST /api/tasks/:taskId/members
Content-Type: application/json
Authorization: Bearer <token>

{
  "user_id": 123,
  "invited_by": 456  // Current User
}
```

**Guard-Checks**:
- ✓ Requester ist Task-Owner ODER hat WRITE-Permission
- ✓ Ziel-User existiert

**Response**:
```json
{
  "task_id": 42,
  "user_id": 123,
  "joined_at": "2026-03-25T10:30:00Z"
}
```

---

### Liste Task-Members

```http
GET /api/tasks/:taskId/members
Authorization: Bearer <token>
```

**Guard-Checks**:
- ✓ Requester ist Mitglied der Task ODER hat READ-Permission

**Response**:
```json
[
  {
    "task_id": 42,
    "user_id": 123,
    "user": {
      "user_id": 123,
      "firstname": "Max",
      "lastname": "Müller",
      "email": "max@example.com"
    },
    "joined_at": "2026-03-25T10:30:00Z"
  }
]
```

---

### Entferne Task-Member (Owner/Manager)

```http
DELETE /api/tasks/:taskId/members/:userId
Authorization: Bearer <token>
```

**Guard-Checks**:
- ✓ Requester ist Task-Owner ODER hat WRITE-Permission
- ✓ Nicht der Task-Creator selbst (implizit Mitglied)

**Response**:
```json
{ "success": true, "message": "Member removed" }
```

---

### Überprüfe Permission für Task

```http
GET /api/tasks/:taskId/members/check-permission?flag=2
Authorization: Bearer <token>
```

**Parameter**:
- `flag`: Bitwise Flag (1=EXECUTE, 2=WRITE, 4=READ)

**Response**:
```json
{
  "task_id": 42,
  "user_id": 456,
  "has_read": true,
  "has_write": true,
  "has_execute": true,
  "permission_flags": 7
}
```

---

## Service-Implementierung

### `TaskMembersService`

**Hauptmethoden**:

```typescript
// Füge User zur Task hinzu
addMember(taskId: number, userId: number): Promise<task_members>

// Entferne User von Task
removeMember(taskId: number, userId: number): Promise<void>

// Finde alle Mitglieder einer Task
findByTask(taskId: number): Promise<task_members[]>

// Prüfe Membership + Permission
async checkPermission(
  userId: number, 
  taskId: number, 
  requiredFlags: number
): Promise<boolean>

// Extrahiere rwx aus Flags
extractPermissions(flags: number): { read: boolean, write: boolean, execute: boolean }
```

---

## Guard-Implementierung

### `TaskPermissionsGuard`

Prüft automatisch:

1. **Task existiert?**
2. **User ist authentifiziert?**
3. **User ist Mitglied?** (optional, je nach Route)
4. **User hat Permissions?** (optional, je nach Flag-Anforderung)

```typescript
export class TaskPermissionsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { taskId } = request.params;
    const userId = request.user.id;
    
    const task = await this.tasksService.findOne(taskId);
    const isMember = await this.taskMembersService.isMember(taskId, userId);
    const hasPermission = await this.taskMembersService.checkPermission(
      userId, 
      taskId, 
      TaskPermissionFlag.READ // Mindestens READ
    );
    
    return isMember && hasPermission;
  }
}
```

---

## Test-Strategie (rwx-Modell)

Tests folgen dem bestehenden Permission-Test-Modell mit bitweisen Flags:

### Test-Szenarien

```typescript
describe('TaskMembersService - Bitwise Permission Checks', () => {
  
  // Scenario 1: User kann nur LESEN (flag=4)
  test('User mit READ-Flag kann Task ansehen, nicht ändern', async () => {
    const userId = 1;
    const taskId = 1;
    
    // Setup: User hat nur READ-Permission
    await setupUserPermission(userId, taskId, 0b100); // 4
    
    // ✓ READ sollte funktionieren
    expect(await checkPermission(userId, taskId, 0b100)).toBe(true);
    
    // ✗ WRITE sollte fehlschlagen
    expect(await checkPermission(userId, taskId, 0b010)).toBe(false);
  });
  
  // Scenario 2: User kann LESEN + SCHREIBEN (flag=6)
  test('User mit READ+WRITE kann Task ändern', async () => {
    const userId = 2;
    const taskId = 1;
    
    await setupUserPermission(userId, taskId, 0b110); // 6
    
    expect(await checkPermission(userId, taskId, 0b100)).toBe(true); // READ
    expect(await checkPermission(userId, taskId, 0b010)).toBe(true); // WRITE
    expect(await checkPermission(userId, taskId, 0b001)).toBe(false); // EXECUTE
  });
  
  // Scenario 3: Full Access (flag=7)
  test('Task-Owner hat vollständigen Zugriff', async () => {
    const ownerId = 3;
    const taskId = 1;
    
    await setupUserPermission(ownerId, taskId, 0b111); // 7 (RWX)
    
    expect(await checkPermission(ownerId, taskId, 0b100)).toBe(true); // READ
    expect(await checkPermission(ownerId, taskId, 0b010)).toBe(true); // WRITE
    expect(await checkPermission(ownerId, taskId, 0b001)).toBe(true); // EXECUTE
  });

  // Scenario 4: Permission vorbei (valid_to überschritten)
  test('Ablaufene Permission wird ignoriert', async () => {
    const userId = 4;
    const taskId = 1;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await setupUserPermissionWithDates(
      userId, 
      taskId, 
      0b110,                // Flags
      new Date(),          // valid_from
      yesterday            // valid_to (abgelaufen!)
    );
    
    // ✓ Mit abgelaufenem valid_to sollte Permission nicht mehr gelten
    expect(await checkValidPermission(userId, taskId, 0b010)).toBe(false);
  });
});
```

---

## Implementierungs-Roadmap

### Phase 1: Datenbank (Migrationsdatei)

- [x] Prisma Schema: `task_members` Model
- [x] Migration erstellen und ausführen

### Phase 2: Backend Core

- [ ] DTOs (`CreateTaskMemberDto`, `UpdateTaskMemberDto`, `TaskMemberEntity`)
- [ ] Service (`TaskMembersService`) mit Permission-Checks
- [ ] Guards (`TaskPermissionsGuard`)
- [ ] Controller mit Endpoints

### Phase 3: Tests

- [ ] Unit-Tests mit bitweisen Flags
- [ ] Integration-Tests für Guards
- [ ] Permission-Validierungstests

### Phase 4: Frontend (optional)

- [ ] **Task-Details**: Members-Abschnitt (Liste)
- [ ] **Task-Actions**: "Member hinzufügen"-Dialog
- [ ] **Member-Card**: Mit Permission-Anzeige (rwx-Symbole)

---

## Sicherheitsüberlegungen

### 1. **Cascade Delete**
```
- Task wird gelöscht → Alle task_members werden gelöscht
- User wird gelöscht → Alle task_members werden gelöscht
```

### 2. **Implizite Mitgliedschaften**
- **Task-Creator** ist automatisch (implizit) Mitglied
- **assigned_to User** (falls gesetzt) ist automatisch Mitglied
- → Diese brauchen nicht in `task_members` zu stehen, können aber

### 3. **Permission-Caching**
- Permissions sollten **nicht** gegenüber werden (performance)
- Zeitliche Gürtigkeit (valid_from/valid_to) muss bei jedem Check eingebunden werden

### 4. **Audit Trail**
- `TaskMembersService` Log aufruf dokumentieren (wer, wann, welche Action)
- `task_activity_log` erweitern mit Member-Changes

---

## Beispiel - Kompletter Flow

### User A (Teacher) lädt User B (Student) zu Task ein

```
1. Teacher A (user_id=10) erstellt Task.5
   → A ist automatisch Owner/Creator

2. Teacher A ruft auf: POST /api/tasks/5/members
   {
     "user_id": 20  // Student B
   }

3. Backend prüft:
   ✓ Requester (A) ist Task-Owner
   ✓ Student B existiert
   ✓ B ist nicht bereits Mitglied

4. Datensatz wird erstellt:
   task_members(5, 20, now())

5. Frontend zeigt: "Student B wurde hinzugefügt"

6. Später: Student B öffnet Task.5
   ✓ Membership-Check: B ist in task_members(5, 20)
   ✓ Permission-Check: B hat user_permissions mit Flags ≥ READ

7. Student B kann Task anschauen (je nach Permission-Flags)
```

---

## Zusammenfassung der Unterschiede

| Aspekt | Alte Idee | Neue Idee |
|--------|-----------|-----------|
| **Rollen pro Task** | Task-spezifische Rollen (Owner, Member, Viewer) | ❌ Nicht nötig |
| **Rechte pro Task** | Task-spezifische Permissions | ❌ Nicht nötig |
| **task_members** | Rollen speichern | ✅ Nur Membership |
| **Permissions** | Task-Level | ✅ Global (user_permissions) |
| **Prüfung** | Rollen auslesen | ✅ Bitwise Flags prüfen |
| **Datenschutz** | Komplexer (Task × Rollen) | ✅ Einfacher, zentral |
| **Skalierbarkeit** | K×N Schema | ✅ Lineare Komplexität |

---

## Verwandte Systeme

- `user_permissions`: Globale Permissions mit zeitlicher Gültig
- `user_roles`: Rollen-Zuordnung (Superuser, Admin, Teacher, Student)
- `roles_permissions`: Verknüpfung zwischen Rollen und Permissions
- `task_activity_log`: Bereits vorhanden für Audit-Trail
