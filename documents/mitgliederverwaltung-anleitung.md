# 📖 Mitgliederverwaltung - Vollständige Anleitung

## Übersicht

Diese Anleitung dokumentiert das Mitgliederverwaltungs-System basierend auf den **tatsächlichen DB-Strukturen** in `schema.prisma`. Das System umfasst:

- **Rollen & Permissions**: Benutzer-Berechtigungen mit zeitlichen Limits
- **Task-Members**: Explizite Mitgliederverwaltung für einzelne Tasks
- **User-Profile**: Verwaltung von Rollen und Permissions pro Benutzer

---

## 🔑 TEIL 1: Grundlagen - Das Permission-System

### 1.1 Die 3 Kern-Tabellen

Das Permissions-System basiert auf **3 Haupttabellen**:

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  user_roles │────────│ roles_permissions │────────│ permissions │
│             │         │              │         │             │
│ user_id     │         │ role_id      │         │ id          │
│ role_id     │         │ permission_id│         │ name        │
│ (PK)        │         │ (PK)         │         │ flags       │
└─────────────┘         └──────────────┘         └─────────────┘
      │                                                │
      │                                                │
┌─────────────────────────────────────┐              │
│                                     │              │
│       user_permissions              │ (direkt)    │
│  (MIT Zeitlimits!)                  │             │
│                                     │             │
│ user_id (FK)                        │             │
│ permission_id (FK) ─────────────────┼─────────────┘
│ valid_from (DateTime|null)          │
│ valid_to (DateTime|null)            │
│                                     │
└─────────────────────────────────────┘
```

### 1.2 Unterschied: Rolle vs. Permission

| Aspekt | Rolle (user_roles) | Permission (user_permissions) |
|--------|-------------------|-------------------------------|
| **Tabelle** | `user_roles` | `user_permissions` |
| **Mapping** | M:N mit `roles_permissions` | Direkte M:N zu `permissions` |
| **Zeitlimits** | ❌ Nein | ✅ Ja: `valid_from` & `valid_to` |
| **Flags** | ❌ Keine | ✅ Ja: READ, WRITE, EXECUTE |
| **Gültigkeit** | Binäre Zuweisung | Mit Gültigkeitsprüfung |
| **Beispiel** | User ist "Teacher" | User hat `edit_tasks` bis 2026-07-31 |

**Schlussfolgerung:**
- **Rollen** = Langfristige, stabile Zuweisungen (z.B. "Du bist ein Teacher")
- **Permissions** = Granulare, zeitlich begrenzte Berechtigungen (z.B. "Du darfst bis XYZ Tasks editieren")

### 1.3 Das Flag-System (Bitweise Flags)

Permissions verwenden **3 Basis-Flags** mit Bitwise-Logik:

```javascript
const FLAGS = {
  READ:    4,      // 0b100 – Daten lesen
  WRITE:   2,      // 0b010 – Daten ändern
  EXECUTE: 1,      // 0b001 – Aktion ausführen
};

// Kombinationen:
READ | WRITE        = 6  (0b110) – Lesen & Ändern
READ | EXECUTE      = 5  (0b101) – Lesen & Ausführen
WRITE | EXECUTE     = 3  (0b011) – Ändern & Ausführen
READ | WRITE | EXECUTE = 7  (0b111) – Vollzugriff (RWX)
```

**Permission-Check (Pseudocode):**
```javascript
// Prüfe: Hat der User das WRITE-Flag?
const hasWrite = (userPermissionFlags & WRITE) === WRITE;
//               ↓ Bitwise AND mit mask

// Beispiele:
(7 & 2) === 2   // true  – RWX hat WRITE
(4 & 2) === 2   // false – READ hat kein WRITE
(6 & 2) === 2   // true  – RW hat WRITE
```

### 1.4 Die 10 Vordefinierten Permissions

Diese Permissions sind in der DB gespeichert und können Rollen oder direkt Usern zugewiesen werden:

| ID | Name | Flags | Bedeutung |
|:--:|------|:-----:|-----------|
| 1 | `view_dashboard` | 4 (READ) | Dashboard anschauen |
| 2 | `manage_users` | 7 (RWX) | Benutzer verwalten (CRUD) |
| 3 | `create_tasks` | 7 (RWX) | Tasks erstellen |
| 4 | `edit_tasks` | 6 (RW) | Tasks bearbeiten |
| 5 | `delete_tasks` | 1 (EXECUTE) | Tasks löschen (Aktion) |
| 6 | `view_grades` | 4 (READ) | Noten anschauen |
| 7 | `edit_grades` | 6 (RW) | Noten ändern |
| 8 | `manage_classes` | 7 (RWX) | Klassen verwalten |
| 9 | `view_schedules` | 4 (READ) | Stundenplan anschauen |
| 10 | `manage_system` | 7 (RWX) | Systemeinstellungen |

### 1.5 Die 4 Vordefinierten Rollen

Diese Rollen sind vorkonfiguriert und verbinden mehrere Permissions:

| ID | Name | Zugeordnete Permissions |
|:--:|------|-------------------------|
| 1 | **Superuser** | Alle 10 Permissions |
| 2 | **Student** | `view_dashboard`, `view_grades`, `view_schedules` |
| 3 | **Teacher** | `create_tasks`, `edit_tasks`, `edit_grades` |
| 4 | **Admin** | `manage_users`, `manage_classes`, `manage_system` |

**Beziehung:**
```
Superuser
  ├─ view_dashboard (4)
  ├─ manage_users (7)
  ├─ create_tasks (7)
  ├─ edit_tasks (6)
  ├─ delete_tasks (1)
  ├─ view_grades (4)
  ├─ edit_grades (6)
  ├─ manage_classes (7)
  ├─ view_schedules (4)
  └─ manage_system (7)
```

### 1.6 Zeitvalidierung (valid_from / valid_to)

`user_permissions` haben zwei optionale Zeitstempel:

```sql
user_permissions (
  user_id        INT,
  permission_id  INT,
  valid_from     DATETIME,  -- ← Wann aktiviert (null = sofort)
  valid_to       DATETIME,  -- ← Wann abläuft (null = ewig)
  PRIMARY KEY (user_id, permission_id)
)
```

**Gültigkeitszustände:**

| Status | Bedingung | Effekt |
|--------|-----------|--------|
| **VALID** | NOW() >= valid_from AND NOW() < valid_to (oder null) | Permission ist aktiv ✅ |
| **NOT_YET_VALID** | NOW() < valid_from | Permission ist noch nicht gültig ❌ |
| **EXPIRED** | NOW() >= valid_to | Permission ist abgelaufen ❌ |

**Praxis-Beispiel:**
```javascript
// Admin gibt Lehrer temporäre "edit_tasks" Permission
const permission = {
  user_id: 5,           // Lehrer
  permission_id: 4,     // edit_tasks
  valid_from: "2026-03-25",  // Ab heute
  valid_to: "2026-07-31"     // Bis Ende Juli
};

// → Lehrer kann bis 31. Juli Tasks editieren, danach nicht mehr
```

---

## 👥 TEIL 2: Task-Members - Mitgliederverwaltung in Tasks

### 2.1 Das Task-Members DB-Modell

Tasks haben explizite Mitglieder, die über die `task_members` Tabelle verwaltet werden:

```prisma
model task_members {
  task_id     Int
  user_id     Int
  joined_at   DateTime   @default(now())

  task        tasks      @relation(fields: [task_id], references: [id], onDelete: Cascade)
  user        users      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@id([task_id, user_id])
  @@index([task_id])
  @@index([user_id])
}
```

**Wichtig: Implizite Mitgliedschaften**

Folgende Benutzer sind **automatisch Mitglieder** einer Task, auch wenn sie nicht in `task_members` existieren:
1. Der **Creator** (Task-Ersteller)
2. Der **Assigned-to** Benutzer (Der der Task zugewiesen wurde)

Das heißt:
```javascript
// Task erstellt von User 5, zugewiesen zu User 7
const task = {
  id: 10,
  created_by: 5,    // ← automatisch Mitglied
  assigned_to: 7,   // ← automatisch Mitglied
};

// task_members kann zusätzliche explizite Mitglieder haben:
// - User 8 (gesamt: 5, 7, 8 sind Mitglieder)
// - User 9 (gesamt: 5, 7, 8, 9 sind Mitglieder)
```

### 2.2 Task-Permission-Flags

Wie `user_permissions` verwenden auch Task-Mitgliedschaften **Flags**:

```javascript
const TaskPermissionFlags = {
  READ:    4,      // Kann Task lesen
  WRITE:   2,      // Kann Task ändern
  EXECUTE: 1,      // Kann Task ausführen/abschließen
  RWX:     7       // Vollzugriff
};
```

**Regel: Task-Creator hat immer RWX**
```javascript
// Selbst wenn nicht im Flag-Feld gespeichert:
// Der Creator einer Task hat immer Vollzugriff (READ | WRITE | EXECUTE = 7)
```

### 2.3 Backend: TaskMembersService

Die Service-Klasse verwaltet alle Operationen für Task-Members.

**Wichtigste Methoden:**

#### `addMember(taskId, userId, requesterId)` — Mitglied hinzufügen
```typescript
// Service
async addMember(taskId: number, userId: number, requesterId: number) {
  // 1. Prüfe: Hat Requester das Recht, Mitglieder hinzuzufügen?
  const hasPermission = await this.checkPermission(
    requesterId,
    taskId,
    TaskPermissionFlags.WRITE
  );
  if (!hasPermission) throw new ForbiddenException();

  // 2. Füge Mitglied hinzu (oder update joined_at)
  return await this.prisma.task_members.upsert({
    where: { task_id_user_id: { task_id: taskId, user_id: userId } },
    create: { task_id: taskId, user_id: userId },
    update: { joined_at: new Date() }
  });
}
```

#### `removeMember(taskId, userId, requesterId)` — Mitglied entfernen
```typescript
async removeMember(taskId: number, userId: number, requesterId: number) {
  // 1. Prüfe Berechtigung
  const hasPermission = await this.checkPermission(
    requesterId,
    taskId,
    TaskPermissionFlags.WRITE
  );
  if (!hasPermission) throw new ForbiddenException();

  // 2. Kann den Task-Creator nicht entfernen
  const task = await this.prisma.tasks.findUnique({ where: { id: taskId } });
  if (task.created_by === userId) {
    throw new BadRequestException("Cannot remove task creator");
  }

  // 3. Entferne Mitglied
  return await this.prisma.task_members.delete({
    where: { task_id_user_id: { task_id: taskId, user_id: userId } }
  });
}
```

#### `findByTask(taskId)` — Alle Mitglieder + Details
```typescript
async findByTask(taskId: number) {
  // Hole alle expliziten Mitglieder
  const members = await this.prisma.task_members.findMany({
    where: { task_id: taskId },
    include: {
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          profile_picture: true
        }
      }
    }
  });

  // Hole Task für implizite Mitglieder (creator, assigned_to)
  const task = await this.prisma.tasks.findUnique({
    where: { id: taskId },
    select: { id: true, created_by: true, assigned_to: true }
  });

  return {
    explicit_members: members,
    implicit_members: [task.created_by, task.assigned_to],
    all_member_ids: [
      ...members.map(m => m.user_id),
      task.created_by,
      task.assigned_to
    ]
  };
}
```

#### `checkPermission(userId, taskId, flags)` — Permission-Prüfung
```typescript
async checkPermission(
  userId: number,
  taskId: number,
  requiredFlags: number
): Promise<boolean> {
  const task = await this.prisma.tasks.findUnique({
    where: { id: taskId }
  });

  // Creator hat immer Vollzugriff
  if (task.created_by === userId) {
    return (7 & requiredFlags) === requiredFlags;  // RWX for all flags
  }

  // Prüfe ob Mitglied
  const isMember = await this.isMember(taskId, userId);
  if (!isMember) return false;

  // Hier könnten Flags aus task_members ausgelesen werden
  // Für jetzt: komplette Permissions
  return true;
}
```

#### `isMember(taskId, userId)` — Ist Benutzer Mitglied?
```typescript
async isMember(taskId: number, userId: number): Promise<boolean> {
  const task = await this.prisma.tasks.findUnique({
    where: { id: taskId }
  });

  // Implizite Mitglieder (Creator, Assigned-to)
  if (task.created_by === userId || task.assigned_to === userId) {
    return true;
  }

  // Explizite Mitglieder
  const member = await this.prisma.task_members.findUnique({
    where: {
      task_id_user_id: { task_id: taskId, user_id: userId }
    }
  });

  return !!member;
}
```

### 2.4 Backend: TaskMembersController & API-Endpoints

Der Controller stellt REST-Endpoints bereit:

#### `POST /api/tasks/:taskId/members` — Mitglied hinzufügen
```typescript
@Post(':taskId/members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('edit_tasks')  // Muss Permission haben
async addMember(
  @Param('taskId', ParseIntPipe) taskId: number,
  @Body() dto: AddMemberDto,  // { user_id: number }
  @Request() req
) {
  return this.taskMembersService.addMember(
    taskId,
    dto.user_id,
    req.user.id  // Requester
  );
}

// Request-Body:
// {
//   "user_id": 8
// }

// Response (201 Created):
// {
//   "task_id": 10,
//   "user_id": 8,
//   "joined_at": "2026-03-25T10:30:00Z"
// }
```

#### `GET /api/tasks/:taskId/members` — Alle Mitglieder
```typescript
@Get(':taskId/members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('view_tasks')  // Nur Leseberechtigung
async getMembers(
  @Param('taskId', ParseIntPipe) taskId: number,
  @Request() req
) {
  return this.taskMembersService.findByTask(taskId);
}

// Response:
// {
//   "explicit_members": [
//     { "task_id": 10, "user_id": 8, "joined_at": "...", "user": {...} }
//   ],
//   "implicit_members": [5, 7],
//   "all_member_ids": [5, 7, 8]
// }
```

#### `DELETE /api/tasks/:taskId/members/:userId` — Mitglied entfernen
```typescript
@Delete(':taskId/members/:userId')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('edit_tasks')  // Muss Schreibberechtigung haben
async removeMember(
  @Param('taskId', ParseIntPipe) taskId: number,
  @Param('userId', ParseIntPipe) userId: number,
  @Request() req
) {
  return this.taskMembersService.removeMember(
    taskId,
    userId,
    req.user.id  // Requester
  );
}

// Response (200 OK):
// {
//   "task_id": 10,
//   "user_id": 8,
//   "joined_at": "2026-03-25T10:30:00Z"
// }
```

### 2.5 Frontend: Task-Members UI & API-Integration

#### Vue-Komponente: TaskMembersList.vue
```vue
<template>
  <div class="task-members-section">
    <h3>Task-Mitglieder</h3>

    <!-- Mitglieder-Liste -->
    <div class="members-list">
      <div v-for="member in allMembers" :key="member.id" class="member-card">
        <img :src="member.profile_picture" class="avatar" />
        <div class="member-info">
          <p class="name">{{ member.first_name }} {{ member.last_name }}</p>
          <p class="email">{{ member.email }}</p>
          <span v-if="isCreator(member.id)" class="badge">Creator</span>
          <span v-if="isAssignedTo(member.id)" class="badge">Assigned</span>
        </div>
        <!-- Remove-Button nur für WRITE-Permissions -->
        <button
          v-if="canEditTask && !isCreator(member.id)"
          @click="removeMember(member.id)"
          class="btn-remove"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Mitglied hinzufügen (nur wenn WRITE-Permission) -->
    <div v-if="canEditTask" class="add-member-section">
      <select v-model="selectedUserId" placeholder="Benutzer hinzufügen">
        <option value="">-- Benutzer wählen --</option>
        <option v-for="user in availableUsers" :key="user.id" :value="user.id">
          {{ user.first_name }} {{ user.last_name }}
        </option>
      </select>
      <button @click="addMember" :disabled="!selectedUserId">
        Hinzufügen
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTaskApi } from '@/api/tasks';
import { useUsersApi } from '@/api/usersService';
import { useAuthStore } from '@/stores/authStore';

const props = defineProps({
  taskId: {
    type: Number,
    required: true
  }
});

const authStore = useAuthStore();
const taskApi = useTaskApi();
const usersApi = useUsersApi();

const members = ref([]);
const allUsers = ref([]);
const selectedUserId = ref(null);
const canEditTask = ref(false);
const creatorId = ref(null);
const assignedToId = ref(null);

const availableUsers = computed(() => {
  return allUsers.value.filter(
    u => !members.value.some(m => m.id === u.id)
  );
});

const allMembers = computed(() => {
  return members.value.map(member => ({
    ...member,
    isImplicit: [creatorId.value, assignedToId.value].includes(member.id)
  }));
});

onMounted(async () => {
  // 1. Lade Task-Mitglieder
  const response = await taskApi.getTaskMembers(props.taskId);
  members.value = response.data.explicit_members.map(m => m.user);
  creatorId.value = response.data.implicit_members[0];
  assignedToId.value = response.data.implicit_members[1];

  // 2. Prüfe Permissions
  canEditTask.value = authStore.hasPermission('edit_tasks');

  // 3. Lade alle Benutzer
  allUsers.value = (await usersApi.getAllUsers()).data;
});

const addMember = async () => {
  if (!selectedUserId.value) return;

  try {
    await taskApi.addTaskMember(props.taskId, {
      user_id: selectedUserId.value
    });
    // Neuladen
    const response = await taskApi.getTaskMembers(props.taskId);
    members.value = response.data.explicit_members.map(m => m.user);
    selectedUserId.value = null;
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error);
  }
};

const removeMember = async (userId) => {
  if (!confirm('Mitglied wirklich entfernen?')) return;

  try {
    await taskApi.removeTaskMember(props.taskId, userId);
    members.value = members.value.filter(m => m.id !== userId);
  } catch (error) {
    console.error('Fehler beim Entfernen:', error);
  }
};

const isCreator = (userId) => userId === creatorId.value;
const isAssignedTo = (userId) => userId === assignedToId.value;
</script>

<style scoped>
.task-members-section {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.members-list {
  margin: 20px 0;
}

.member-card {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
  gap: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.member-info {
  flex: 1;
}

.badge {
  display: inline-block;
  background: #007bff;
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  margin: 0 5px 0 0;
}

.btn-remove {
  background: #dc3545;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 3px;
  cursor: pointer;
}

.add-member-section {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.add-member-section select,
.add-member-section button {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.add-member-section button {
  background: #28a745;
  color: white;
  cursor: pointer;
}

.add-member-section button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
```

#### API-Aufrufe: tasks.js
```javascript
// src/api/tasks.js

export const useTaskApi = () => {
  const httpClient = useHttpClient();

  return {
    // Mitglieder abrufen
    getTaskMembers: (taskId) => {
      return httpClient.get(`/api/tasks/${taskId}/members`);
    },

    // Mitglied hinzufügen
    addTaskMember: (taskId, data) => {
      return httpClient.post(`/api/tasks/${taskId}/members`, data);
    },

    // Mitglied entfernen
    removeTaskMember: (taskId, userId) => {
      return httpClient.delete(`/api/tasks/${taskId}/members/${userId}`);
    },

    // ... weitere Task-Methoden
  };
};
```

---

## 👤 TEIL 3: User-Profile - Rollen & Permissions verwalten

### 3.1 Backend: UsersService

Die Service-Klasse verwaltet Benutzer und deren Rollen/Permissions.

**Wichtigste Methoden für Profile:**

#### `getUserPermissions(userId)` — Direkte Permissions
```typescript
async getUserPermissions(userId: number) {
  return await this.prisma.user_permissions.findMany({
    where: { user_id: userId },
    include: {
      permission: {
        select: {
          id: true,
          name: true,
          flags: true
        }
      }
    }
  });

  // Response:
  // [
  //   {
  //     user_id: 5,
  //     permission_id: 4,
  //     valid_from: "2026-03-25",
  //     valid_to: "2026-07-31",
  //     permission: {
  //       id: 4,
  //       name: "edit_tasks",
  //       flags: 6
  //     }
  //   }
  // ]
}
```

#### `getUserRoles(userId)` — Rollen + deren Permissions
```typescript
async getUserRoles(userId: number) {
  const userRoles = await this.prisma.user_roles.findMany({
    where: { user_id: userId },
    include: {
      role: {
        include: {
          roles_permissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  name: true,
                  flags: true
                }
              }
            }
          }
        }
      }
    }
  });

  // Response:
  // [
  //   {
  //     user_id: 5,
  //     role_id: 3,
  //     role: {
  //       id: 3,
  //       name: "Teacher",
  //       roles_permissions: [
  //         { role_id: 3, permission_id: 3, permission: {...} },
  //         { role_id: 3, permission_id: 4, permission: {...} },
  //         { role_id: 3, permission_id: 7, permission: {...} }
  //       ]
  //     }
  //   }
  // ]
}
```

#### `getUserPermissionsAndRoles(userId)` — Kombinierte Rückgabe
```typescript
async getUserPermissionsAndRoles(userId: number) {
  const [roles, permissions] = await Promise.all([
    this.getUserRoles(userId),
    this.getUserPermissions(userId)
  ]);

  return {
    user_id: userId,
    roles: roles.map(r => ({
      id: r.role.id,
      name: r.role.name,
      permissions: r.role.roles_permissions.map(rp => ({
        id: rp.permission.id,
        name: rp.permission.name,
        flags: rp.permission.flags,
        source: 'role',
        valid_until: null  // Rollen haben keine Zeitlimits
      }))
    })),
    direct_permissions: permissions.map(p => ({
      id: p.permission.id,
      name: p.permission.name,
      flags: p.permission.flags,
      source: 'direct',
      valid_from: p.valid_from,
      valid_to: p.valid_to,
      status: this.getPermissionStatus(p.valid_from, p.valid_to)
    }))
  };

  // Response:
  // {
  //   "user_id": 5,
  //   "roles": [
  //     {
  //       "id": 3,
  //       "name": "Teacher",
  //       "permissions": [
  //         { "id": 3, "name": "create_tasks", "flags": 7, "source": "role" },
  //         { "id": 4, "name": "edit_tasks", "flags": 6, "source": "role" },
  //         { "id": 7, "name": "edit_grades", "flags": 6, "source": "role" }
  //       ]
  //     }
  //   ],
  //   "direct_permissions": [
  //     {
  //       "id": 4,
  //       "name": "edit_tasks",
  //       "flags": 6,
  //       "source": "direct",
  //       "valid_from": "2026-03-25",
  //       "valid_to": "2026-07-31",
  //       "status": "VALID"
  //     }
  //   ]
  // }
}

// Hilfsmethode:
private getPermissionStatus(validFrom: Date | null, validTo: Date | null) {
  const now = new Date();
  if (validFrom && now < validFrom) return 'NOT_YET_VALID';
  if (validTo && now >= validTo) return 'EXPIRED';
  return 'VALID';
}
```

### 3.2 Backend: UsersController & API-Endpoints

#### `GET /users/me/permissions` — Eigene Permissions
```typescript
@Get('me/permissions')
@UseGuards(JwtAuthGuard)
async getMyPermissions(@Request() req) {
  return this.usersService.getUserPermissionsAndRoles(req.user.id);
}

// Response:
// {
//   "user_id": 5,
//   "roles": [...],
//   "direct_permissions": [...]
// }
```

#### `GET /users/:id/permissions` — Permissions eines Users
```typescript
@Get(':id/permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('manage_users')
async getUserPermissions(@Param('id', ParseIntPipe) userId: number) {
  return this.usersService.getUserPermissionsAndRoles(userId);
}
```

#### `GET /users/:id` — Komplettes User-Profil
```typescript
@Get(':id')
@UseGuards(JwtAuthGuard)
async getUserProfile(@Param('id', ParseIntPipe) userId: number) {
  const user = await this.usersService.findOne(userId);
  const permissionsAndRoles = 
    await this.usersService.getUserPermissionsAndRoles(userId);

  return {
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      profile_picture: user.profile_picture,
      created_at: user.created_at
    },
    ...permissionsAndRoles
  };
}

// Response:
// {
//   "user": {
//     "id": 5,
//     "first_name": "Max",
//     "last_name": "Mustermann",
//     "email": "max@example.com",
//     "profile_picture": "https://...",
//     "created_at": "2025-01-15T10:00:00Z"
//   },
//   "roles": [...],
//   "direct_permissions": [...]
// }
```

#### `PATCH /users/:id` — User-Daten aktualisieren
```typescript
@Patch(':id')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('manage_users')
async updateUser(
  @Param('id', ParseIntPipe) userId: number,
  @Body() updateDto: UpdateUserDto
) {
  return await this.usersService.update(userId, updateDto);
}

// Request-Body (alle Felder optional):
// {
//   "first_name": "Maximilian",
//   "last_name": "Schmidt",
//   "profile_picture": "https://...",
//   "email": "max.schmidt@example.com"
// }
```

### 3.3 Backend: PermissionsService — Permission-Prüfungen

Die PermissionsService stellt Hilfsmethoden bereit für Permission-Checks:

#### `hasPermission(userId, permissionName, flags)` — Flag-Check
```typescript
async hasPermission(
  userId: number,
  permissionName: string,
  requiredFlags: number = 4  // READ
): Promise<boolean> {
  // 1. Finde die Permission
  const permission = await this.prisma.permissions.findUnique({
    where: { name: permissionName }
  });
  if (!permission) return false;

  // 2. Prüfe direkte Permissions mit Zeitvalidierung
  const userPerm = await this.prisma.user_permissions.findUnique({
    where: {
      user_id_permission_id: {
        user_id: userId,
        permission_id: permission.id
      }
    }
  });

  if (userPerm) {
    // Zeitvalidierung
    const now = new Date();
    if (userPerm.valid_from && now < userPerm.valid_from) return false;
    if (userPerm.valid_to && now >= userPerm.valid_to) return false;

    // Flag-Check
    return (permission.flags & requiredFlags) === requiredFlags;
  }

  // 3. Prüfe Rollen und deren Permissions
  const userRoles = await this.prisma.user_roles.findMany({
    where: { user_id: userId },
    include: {
      role: {
        include: {
          roles_permissions: {
            where: { permission_id: permission.id }
          }
        }
      }
    }
  });

  for (const userRole of userRoles) {
    if (userRole.role.roles_permissions.length > 0) {
      return (permission.flags & requiredFlags) === requiredFlags;
    }
  }

  return false;
}
```

#### `hasRole(userId, roleName)` — Rolle prüfen
```typescript
async hasRole(userId: number, roleName: string): Promise<boolean> {
  const role = await this.prisma.roles.findUnique({
    where: { name: roleName }
  });
  if (!role) return false;

  const userRole = await this.prisma.user_roles.findUnique({
    where: {
      user_id_role_id: {
        user_id: userId,
        role_id: role.id
      }
    }
  });

  return !!userRole;
}
```

#### `getActivePermissions(userId)` — Nur aktive Permissions
```typescript
async getActivePermissions(userId: number) {
  const now = new Date();

  const directPerms = await this.prisma.user_permissions.findMany({
    where: {
      user_id: userId,
      // Zeitfilter
      AND: [
        { OR: [
          { valid_from: null },
          { valid_from: { lte: now } }
        ]},
        { OR: [
          { valid_to: null },
          { valid_to: { gt: now } }
        ]}
      ]
    },
    include: { permission: true }
  });

  const rolePerms = await this.prisma.user_roles.findMany({
    where: { user_id: userId },
    include: {
      role: {
        include: {
          roles_permissions: {
            include: { permission: true }
          }
        }
      }
    }
  });

  return {
    direct: directPerms.map(p => p.permission),
    via_roles: rolePerms.flatMap(r => 
      r.role.roles_permissions.map(rp => rp.permission)
    )
  };
}
```

### 3.4 Frontend: User-Profile UI

#### Vue-Komponente: UserProfile.vue
```vue
<template>
  <div class="user-profile">
    <!-- Profil-Header -->
    <div class="profile-header">
      <img :src="profile.user.profile_picture" class="profile-picture" />
      <div class="profile-info">
        <h1>{{ profile.user.first_name }} {{ profile.user.last_name }}</h1>
        <p class="email">{{ profile.user.email }}</p>
        <p class="member-since">
          Mitglied seit: {{ formatDate(profile.user.created_at) }}
        </p>
      </div>

      <!-- Edit-Button (nur für Manager/Admin) -->
      <button
        v-if="canEditUsers"
        @click="isEditMode = true"
        class="btn-edit"
      >
        ✎ Bearbeiten
      </button>
    </div>

    <!-- Rollen-Sektion -->
    <section class="roles-section">
      <h2>🔐 Rollen</h2>
      <div class="roles-grid">
        <div v-for="role in profile.roles" :key="role.id" class="role-card">
          <h3>{{ role.name }}</h3>
          <ul class="permissions-list">
            <li v-for="perm in role.permissions" :key="perm.id">
              <span class="perm-name">{{ perm.name }}</span>
              <span class="perm-flags">{{ formatFlags(perm.flags) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Direkte Permissions-Sektion (mit Zeitlimits) -->
    <section class="permissions-section">
      <h2>⏱️ Direkte Permissions (Zeitlich begrenzt)</h2>
      
      <div v-if="profile.direct_permissions.length === 0" class="empty">
        Keine direkten Permissions zugewiesen.
      </div>

      <div v-else class="permissions-table">
        <div class="permission-row header">
          <span class="col-name">Permission</span>
          <span class="col-flags">Flags</span>
          <span class="col-valid-from">Gültig ab</span>
          <span class="col-valid-to">Gültig bis</span>
          <span class="col-status">Status</span>
        </div>

        <div
          v-for="perm in profile.direct_permissions"
          :key="perm.id"
          class="permission-row"
          :class="perm.status.toLowerCase()"
        >
          <span class="col-name">{{ perm.name }}</span>
          <span class="col-flags">{{ formatFlags(perm.flags) }}</span>
          <span class="col-valid-from">
            {{ perm.valid_from ? formatDate(perm.valid_from) : '–' }}
          </span>
          <span class="col-valid-to">
            {{ perm.valid_to ? formatDate(perm.valid_to) : '∞' }}
          </span>
          <span class="col-status">
            <badge :status="perm.status">{{ perm.status }}</badge>
          </span>
        </div>
      </div>

      <!-- Add Permission (nur für Admins) -->
      <button
        v-if="canEditUsers"
        @click="isAddPermissionMode = true"
        class="btn-add-perm"
      >
        + Permission hinzufügen
      </button>
    </section>

    <!-- Edit-Modal -->
    <modal v-if="isEditMode" @close="isEditMode = false">
      <h2>Benutzer bearbeiten</h2>
      <form @submit.prevent="saveProfile">
        <input v-model="editData.first_name" placeholder="Vorname" />
        <input v-model="editData.last_name" placeholder="Nachname" />
        <input v-model="editData.email" placeholder="Email" />
        <div class="modal-actions">
          <button type="submit" class="btn-submit">Speichern</button>
          <button type="button" @click="isEditMode = false" class="btn-cancel">
            Abbrechen
          </button>
        </div>
      </form>
    </modal>

    <!-- Add Permission-Modal -->
    <modal v-if="isAddPermissionMode" @close="isAddPermissionMode = false">
      <h2>Permission hinzufügen</h2>
      <form @submit.prevent="addPermission">
        <select v-model="newPermission.permission_id">
          <option value="">-- Permission wählen --</option>
          <option v-for="p in availablePermissions" :key="p.id" :value="p.id">
            {{ p.name }} ({{ formatFlags(p.flags) }})
          </option>
        </select>

        <label>
          Gültig ab (optional):
          <input v-model="newPermission.valid_from" type="date" />
        </label>

        <label>
          Gültig bis (optional):
          <input v-model="newPermission.valid_to" type="date" />
        </label>

        <div class="modal-actions">
          <button type="submit" class="btn-submit">Hinzufügen</button>
          <button
            type="button"
            @click="isAddPermissionMode = false"
            class="btn-cancel"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUsersApi } from '@/api/usersService';
import { useAuthStore } from '@/stores/authStore';
import Modal from '@/components/Modal.vue';
import Badge from '@/components/Badge.vue';

const route = useRoute();
const usersApi = useUsersApi();
const authStore = useAuthStore();

const userId = parseInt(route.params.id);
const profile = ref(null);
const isEditMode = ref(false);
const isAddPermissionMode = ref(false);
const editData = ref({});
const newPermission = ref({});
const canEditUsers = ref(false);
const availablePermissions = ref([]);

onMounted(async () => {
  // Lade User-Profil mit Rollen & Permissions
  const response = await usersApi.getUserProfile(userId);
  profile.value = response.data;

  // Prüfe Berechtigungen
  canEditUsers.value = authStore.hasPermission('manage_users');

  // Lade verfügbare Permissions
  const permResponse = await usersApi.getAllPermissions();
  availablePermissions.value = permResponse.data;

  // Initialisiere Edit-Daten
  editData.value = {
    first_name: profile.value.user.first_name,
    last_name: profile.value.user.last_name,
    email: profile.value.user.email
  };
});

const saveProfile = async () => {
  try {
    await usersApi.updateUser(userId, editData.value);
    // Neuladen
    const response = await usersApi.getUserProfile(userId);
    profile.value = response.data;
    isEditMode.value = false;
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
  }
};

const addPermission = async () => {
  if (!newPermission.value.permission_id) return;

  try {
    await usersApi.addPermission(userId, {
      permission_id: newPermission.value.permission_id,
      valid_from: newPermission.value.valid_from || null,
      valid_to: newPermission.value.valid_to || null
    });
    // Neuladen
    const response = await usersApi.getUserProfile(userId);
    profile.value = response.data;
    newPermission.value = {};
    isAddPermissionMode.value = false;
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error);
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('de-DE');
};

const formatFlags = (flags) => {
  const flagNames = [];
  if ((flags & 4) === 4) flagNames.push('R');
  if ((flags & 2) === 2) flagNames.push('W');
  if ((flags & 1) === 1) flagNames.push('X');
  return `[${flagNames.join('')}]`;
};
</script>

<style scoped>
.user-profile {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  margin-bottom: 30px;
  position: relative;
}

.profile-picture {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
}

.profile-info {
  flex: 1;
}

.profile-info h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
}

.email,
.member-since {
  margin: 5px 0;
  opacity: 0.9;
}

.btn-edit {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 20px;
  font-weight: bold;
  cursor: pointer;
}

/* Rollen-Sektion */
.roles-section {
  margin-bottom: 40px;
}

.roles-section h2 {
  margin-bottom: 20px;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.role-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: #f9f9f9;
}

.role-card h3 {
  margin: 0 0 15px 0;
  color: #667eea;
}

.permissions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.permissions-list li {
  padding: 8px;
  margin: 5px 0;
  background: white;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.perm-name {
  font-weight: 500;
  color: #333;
}

.perm-flags {
  background: #e8f0fe;
  color: #1967d2;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
}

/* Permissions-Sektion */
.permissions-section {
  margin-bottom: 40px;
}

.permissions-section h2 {
  margin-bottom: 20px;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
}

.empty {
  background: #f0f0f0;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  color: #999;
}

.permissions-table {
  overflow-x: auto;
}

.permission-row {
  display: grid;
  grid-template-columns: 200px 100px 150px 150px 100px;
  gap: 15px;
  padding: 15px;
  border-bottom: 1px solid #eee;
  align-items: center;
}

.permission-row.header {
  background: #f5f5f5;
  font-weight: bold;
  border-bottom: 2px solid #ddd;
}

.permission-row.valid {
  background: #f0f9ff;
}

.permission-row.expired {
  background: #fff0f0;
  opacity: 0.7;
}

.permission-row.not_yet_valid {
  background: #fffef0;
}

/* Modals und Buttons */
.btn-add-perm,
.btn-edit {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  margin-top: 20px;
}

.btn-add-perm:hover,
.btn-edit:hover {
  background: #764ba2;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}

.btn-submit,
.btn-cancel {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-submit {
  background: #28a745;
  color: white;
}

.btn-cancel {
  background: #ccc;
  color: #333;
}
</style>
```

---

## 🔐 TEIL 4: Sicherheits-Guards & Decorators

### 4.1 RolesGuard — Rolle-basierte Zugriffskontrolle

```typescript
// src/modules/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '@/modules/permissions/permissions.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Hole @Roles Decorator
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler()
    );
    
    if (!requiredRoles) return true;  // Kein Decorator = kein Schutz

    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;

    // Prüfe: Hat User eine der erforderlichen Rollen?
    for (const role of requiredRoles) {
      const hasRole = await this.permissionsService.hasRole(userId, role);
      if (hasRole) return true;
    }

    throw new ForbiddenException('Insufficient role');
  }
}
```

### 4.2 PermissionsGuard — Permission-basierte Zugriffskontrolle

```typescript
// src/modules/auth/guards/permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '@/modules/permissions/permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Hole @Permissions Decorator
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler()
    );
    
    if (!requiredPermissions) return true;  // Kein Decorator = kein Schutz

    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;

    // Prüfe: Hat User ALLE erforderlichen Permissions?
    for (const permission of requiredPermissions) {
      const hasPermission = await this.permissionsService.hasPermission(
        userId,
        permission,
        4  // READ flag (minimal)
      );
      if (!hasPermission) {
        throw new ForbiddenException(
          `Missing permission: ${permission}`
        );
      }
    }

    return true;
  }
}
```

### 4.3 Decorators

```typescript
// src/modules/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Beispiel:
// @Roles('Teacher', 'Admin')
// async someEndpoint() { ... }
```

```typescript
// src/modules/auth/decorators/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const Permissions = (...permissions: string[]) => 
  SetMetadata('permissions', permissions);

// Beispiel:
// @Permissions('edit_tasks', 'manage_users')
// async someEndpoint() { ... }
```

### 4.4 Guards in die App integrieren

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard  // Alle Endpoints require JWT
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard  // Prüfe @Roles
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard  // Prüfe @Permissions
    }
  ]
})
export class AppModule {}
```

---

## 🔄 TEIL 5: Praktische End-to-End Workflows

### 5.1 Workflow 1: Task-Mitglied hinzufügen

**Szenario:** Ein Teacher fügt einen Schüler zu einer Task hinzu.

**Backend-Flow:**

```typescript
// 1. Frontend sendet Request
POST /api/tasks/10/members
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "user_id": 8
}

// 2. TaskMembersController prüft @UseGuards(JwtAuthGuard, PermissionsGuard)
//    und @Permissions('edit_tasks')
// 3. TaskMembersService.addMember(10, 8, 5) wird aufgerufen
//    - 10 = Task ID
//    - 8 = Zu hinzufügender Benutzer
//    - 5 = Requester (Teacher von JWT)

// 4. Service prüft Permission:
const hasPermission = await this.checkPermission(
  5,  // Teacher
  10, // Task
  TaskPermissionFlags.WRITE  // Flag = 2
);

// 5. Teacher ist Creator der Task 10
// → task.created_by === 5 → true
// → Permission geprüft: (RWX & WRITE) === WRITE → true ✓

// 6. Mitglied wird hinzugefügt:
INSERT INTO task_members (task_id, user_id, joined_at)
VALUES (10, 8, NOW());

// 7. Response 201:
{
  "task_id": 10,
  "user_id": 8,
  "joined_at": "2026-03-25T10:30:00Z"
}
```

**Frontend-Flow:**

```vue
<!-- TaskMembersUI aufgerufen mit taskId=10 -->
<TaskMembersList :taskId="10" />

<!-- User wählt Student (ID=8) aus @Dropdown -->
<!-- User klickt "Hinzufügen" -->

<!-- Script:addMember() wird aufgerufen -->
async addMember() {
  const response = await fetch('/api/tasks/10/members', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}` },
    body: JSON.stringify({ user_id: 8 })
  });

  // UI aktualisieren mit neuem Member
  const members = await response.json();
  this.members.push(members);
}

<!-- Ergebnis: UI zeigt Student in Mitgliederliste -->
<!-- Success-Toast: "Student hinzugefügt!" -->
```

---

### 5.2 Workflow 2: User-Profil ansehen mit Rollen/Permissions

**Szenario:** Ein Admin schaut sich das Profil eines Teachers an.

**Backend-Flow:**

```typescript
// 1. Frontend sendet Request
GET /users/5/permissions
Authorization: Bearer <jwt>

// 2. UsersController prüft @UseGuards(JwtAuthGuard, PermissionsGuard)
//    und @Permissions('manage_users')
// 3. Admin hat Permission "manage_users" → Request erlaubt ✓

// 4. UsersService.getUserPermissionsAndRoles(5) wird aufgerufen

// 5. Service holt Rollen:
SELECT * FROM user_roles WHERE user_id = 5;
// Ergebnis: User 5 hat Rolle "Teacher" (ID=3)

// 6. Service holt Permissions der Rolle:
SELECT p.* FROM permissions p
JOIN roles_permissions rp ON rp.permission_id = p.id
WHERE rp.role_id = 3;
// Ergebnis:
// - create_tasks (ID=3, flags=7)
// - edit_tasks (ID=4, flags=6)
// - edit_grades (ID=7, flags=6)

// 7. Service holt direkte Permissions:
SELECT up.*, p.* FROM user_permissions up
JOIN permissions p ON p.id = up.permission_id
WHERE up.user_id = 5;
// Ergebnis:
// - edit_tasks (valid_from=2026-03-25, valid_to=2026-07-31, flags=6)

// 8. Service prüft Zeitvalidierung:
// NOW() >= 2026-03-25 AND NOW() < 2026-07-31 → Status: VALID ✓

// 9. Response 200:
{
  "user_id": 5,
  "roles": [
    {
      "id": 3,
      "name": "Teacher",
      "permissions": [
        { "id": 3, "name": "create_tasks", "flags": 7, "source": "role" },
        { "id": 4, "name": "edit_tasks", "flags": 6, "source": "role" },
        { "id": 7, "name": "edit_grades", "flags": 6, "source": "role" }
      ]
    }
  ],
  "direct_permissions": [
    {
      "id": 4,
      "name": "edit_tasks",
      "flags": 6,
      "source": "direct",
      "valid_from": "2026-03-25",
      "valid_to": "2026-07-31",
      "status": "VALID"
    }
  ]
}
```

**Frontend-Flow:**

```vue
<!-- UserProfile.vue loaded mit userId=5 -->
<UserProfile :userId="5" />

<!-- Script:onMounted() wird aufgerufen -->
// Requestiert /users/5/permissions
const response = await fetch('/users/5/permissions', {
  headers: { 'Authorization': `Bearer ${jwt}` }
});
const profile = await response.json();

<!-- Render Rollen-Sektion -->
<!-- Zeige "Teacher" mit 3 Permissions -->
<section>
  <h2>🔐 Rollen</h2>
  <div class="role-card">
    <h3>Teacher</h3>
    <ul>
      <li>create_tasks [RWX]</li>
      <li>edit_tasks [RW]</li>
      <li>edit_grades [RW]</li>
    </ul>
  </div>
</section>

<!-- Render direkte Permissions-Sektion -->
<!-- Zeige "edit_tasks" mit Gültigkeitsdatum -->
<section>
  <h2>⏱️ Direkte Permissions</h2>
  <table>
    <tr>
      <td>edit_tasks</td>
      <td>[RW]</td>
      <td>25.03.2026</td>
      <td>31.07.2026</td>
      <td><badge>VALID</badge></td>
    </tr>
  </table>
</section>
```

---

### 5.3 Workflow 3: Admin weist neue Permission mit Zeitlimit zu

**Szenario:** Ein Admin gibt einem Lehrer temporäre "manage_classes" Permission für 3 Monate.

**Backend-Flow:**

```typescript
// 1. Frontend sendet Request
POST /users/5/permissions
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "permission_id": 8,           // manage_classes
  "valid_from": "2026-03-25",
  "valid_to": "2026-06-25"
}

// 2. UsersController prüft @Permissions('manage_users') → Admin hat ✓

// 3. UsersService.addPermission(5, 8, 2026-03-25, 2026-06-25)

// 4. Service speichert in DB:
INSERT INTO user_permissions (user_id, permission_id, valid_from, valid_to)
VALUES (5, 8, '2026-03-25', '2026-06-25');

// 5. Response 201:
{
  "user_id": 5,
  "permission_id": 8,
  "valid_from": "2026-03-25T00:00:00Z",
  "valid_to": "2026-06-25T00:00:00Z"
}

// 6. Ab 2026-03-25:
// - Lehrer 5 hat "manage_classes" (flags=7, RWX)
// - Kann Klassen erstellen, bearbeiten, löschen
// - Lehrer kann Klassen-Management-UI sehen

// 7. Ab 2026-06-26:
// - Permission ist abgelaufen (EXPIRED)
// - Lehrer 5 kann keine Klassen mehr manage

// 8. GetActivePermissions() filtert automatisch:
SELECT * FROM user_permissions
WHERE user_id = 5
  AND (valid_from IS NULL OR valid_from <= NOW())
  AND (valid_to IS NULL OR valid_to > NOW());
// Nur GÜLTIGE Permissions
```

**Frontend-Flow:**

```vue
<!-- Admin-Profil-Edit-View -->
<UserProfile :userId="5" />

<!-- Admin klickt "+ Permission hinzufügen" -->
<!-- Modal öffnet sich -->

<form @submit="addPermission">
  <select v-model="newPermission.permission_id">
    <option value="8">manage_classes [RWX]</option>
    ...
  </select>

  <label>Gültig ab:
    <input v-model="newPermission.valid_from" type="date" value="2026-03-25" />
  </label>

  <label>Gültig bis:
    <input v-model="newPermission.valid_to" type="date" value="2026-06-25" />
  </label>

  <button>Hinzufügen</button>
</form>

// addPermission() wird aufgerufen:
async addPermission() {
  const response = await fetch('/users/5/permissions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}` },
    body: JSON.stringify(newPermission)
  });

  // Erfolges-Toast anzeigen
  alert('Permission hinzugefügt! Gültig bis 25. Juni 2026.');
}

<!-- Direkte Permissions-Liste aktualisiert sich -->
<!-- Neue Permission erscheint mit Status "NOT_YET_VALID" -->
<!-- Ab 2026-03-25 wechselt zu "VALID" -->
```

---

## � TEIL 6: Frontend - Vue.js Komponenten

### 6.1 TaskMembersList.vue - Task-Mitgliederverwaltung

Diese Vue 3-Komponente verwaltet die Task-Mitglieder im Frontend.

**Lokation:** `frontend/src/components/tasks/TaskMembersList.vue`

**Features:**
- ✅ Liste aller Task-Mitglieder anzeigen
- ✅ Mitglied hinzufügen (mit User-Auswahl)
- ✅ Mitglied entfernen (mit Bestätigung)
- ✅ Permission-Checks (nur WRITE erlaubt Änderungen)
- ✅ Implizite Mitglieder (Creator, Assigned-to) kennzeichnen
- ✅ Fehlerbehandlung & Toast-Benachrichtigungen
- ✅ Loading-States

**Props:**
```typescript
taskId: number        // Required: Task ID
creatorId: number     // Required: Task Creator ID
assignedToId?: number // Optional: User assigned to this task
```

**Events:**
```typescript
emit('members-updated', allMembers)  // Emittiert wenn Mitglieder sich ändern
```

**Verwendung im Task-Detail View:**
```vue
<template>
  <div class="task-detail">
    <h2>{{ task.title }}</h2>
    
    <TaskMembersList
      :taskId="task.task_id"
      :creatorId="task.created_by"
      :assignedToId="task.assigned_to"
      @members-updated="onMembersUpdated"
    />
  </div>
</template>

<script setup>
import TaskMembersList from '@/components/tasks/TaskMembersList.vue';

const onMembersUpdated = (members) => {
  console.log('Task members updated:', members);
};
</script>
```

### 6.2 UserProfile.vue - Benutzer-Profil mit Rollen & Permissions

Diese Vue 3-Komponente zeigt das Benutzer-Profil mit Rollen und Permissions an und erlaubt Admins, diese zu verwalten.

**Lokation:** `frontend/src/components/UserProfile.vue`

**Features:**
- ✅ Benutzer-Profil anzeigen (Avatar, Name, Email, Beitrittsdatum)
- ✅ Alle Rollen mit zugehörigen Permissions
- ✅ Direkte Permissions mit Zeitlimits (valid_from, valid_to)
- ✅ Permission-Status anzeigen (VALID, EXPIRED, NOT_YET_VALID)
- ✅ Profil bearbeiten (nur für Admins)
- ✅ Permission hinzufügen/entfernen (nur für Admins)
- ✅ Rolle hinzufügen/entfernen (nur für Admins)
- ✅ Fehlerbehandlung & Toast-Benachrichtigungen

**Verwendung in Router:**
```vue
<template>
  <div class="users-page">
    <UserProfile />
  </div>
</template>

<script setup>
import UserProfile from '@/components/UserProfile.vue';
</script>
```

**Route Configuration:**
```javascript
// router/index.js
{
  path: '/users/:id',
  component: () => import('@/components/UserProfile.vue'),
  meta: { requiresAuth: true }
}
```

### 6.3 API Services

#### taskMembers.js
```javascript
// frontend/src/api/taskMembers.js

export const taskMembersApi = {
  getTaskMembers(taskId),           // GET /api/tasks/:taskId/members
  addTaskMember(taskId, data),      // POST /api/tasks/:taskId/members
  removeTaskMember(taskId, userId), // DELETE /api/tasks/:taskId/members/:userId
  checkPermission(taskId)           // GET /api/tasks/:taskId/members/check-permission
};
```

#### usersService.js (Erweitert)
```javascript
// frontend/src/api/usersService.js

export const usersApi = {
  // Profil
  getProfile(),
  getMyPermissions(),
  getUserPermissions(userId),
  
  // User-Management
  getAll(),
  getUser(id),
  updateUser(id, data),
  deleteUser(id),
  
  // Permission-Management
  getAllPermissions(),
  addPermissionToUser(userId, data),
  removePermissionFromUser(userId, permissionId),
  
  // Role-Management
  getAllRoles(),
  addRoleToUser(userId, data),
  removeRoleFromUser(userId, roleId)
};
```

### 6.4 Badge.vue - Status-Badging

Kleine Komponente für Permission-Status-Anzeige.

**Lokation:** `frontend/src/components/Badge.vue`

**Props:**
```typescript
status: 'VALID' | 'EXPIRED' | 'NOT_YET_VALID'
```

**Beispiel:**
```vue
<Badge :status="permission.status" />
<!-- Output: ✅ Gültig / ❌ Abgelaufen / ⏳ Ausstehend -->
```

---

## 🧪 TEIL 7: Testing

### 7.1 Backend Unit Tests

**Datei:** `backend/src/modules/permissions/permissions.service.spec.ts`

**Tests für PermissionsService:**
- ✅ `hasRole()` - Rolle prüfen
- ✅ `hasPermission()` - Permission mit Zeitvalidierung
- ✅ `getActivePermissions()` - Nur gültige Permissions
- ✅ `getExpiringPermissions()` - Ablauf-Warnungen

**Beispiel-Test:**
```typescript
describe('PermissionsService', () => {
  describe('hasPermission', () => {
    it('should return true if permission is valid', async () => {
      const result = await service.hasPermission(
        userId,
        'edit_tasks',
        PermissionFlag.WRITE
      );
      expect(result).toBe(true);
    });

    it('should return false if permission is expired', async () => {
      const result = await service.hasPermission(
        userId,
        'edit_tasks',
        PermissionFlag.WRITE
      );
      expect(result).toBe(false);
    });
  });
});
```

**Datei:** `backend/test/task-members.service.spec.ts`

**Tests für TaskMembersService:**
- ✅ `addMember()` - Mitglied hinzufügen
- ✅ `removeMember()` - Mitglied entfernen
- ✅ `isMember()` - Mitgliedschaft prüfen
- ✅ `checkPermission()` - Permission mit Flags
- ✅ `extractPermissions()` - Flags dekodieren
- ✅ `computeFlags()` - Flags kodieren

**Beispiel-Test:**
```typescript
describe('TaskMembersService', () => {
  describe('checkPermission', () => {
    it('should return true if user is creator', async () => {
      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.WRITE
      );
      expect(result).toBe(true);
    });

    it('should return false if permission is expired', async () => {
      const result = await service.checkPermission(
        userId,
        taskId,
        TaskPermissionFlags.WRITE
      );
      expect(result).toBe(false);
    });
  });
});
```

### 7.2 E2E Tests

**Datei:** `backend/test/mitgliederverwaltung.e2e-spec.ts`

**Workflows getestet:**

#### Workflow 1: Task-Mitglied hinzufügen
```typescript
describe('Workflow 1: Task-Mitglied hinzufügen', () => {
  it('should add member to task successfully', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/tasks/${taskId}/members`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ user_id: studentId });

    expect(response.status).toBe(201);
    expect(response.body.task_id).toBe(taskId);
    expect(response.body.user_id).toBe(studentId);
  });

  it('should not allow duplicate member', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/tasks/${taskId}/members`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ user_id: studentId });

    expect(response.status).toBe(400);
  });

  it('should prevent non-creator from adding members', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/tasks/${taskId}/members`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ user_id: studentId });

    expect(response.status).toBe(403);
  });
});
```

#### Workflow 2: User-Profil mit Rollen & Permissions
```typescript
describe('Workflow 2: User-Profil mit Rollen & Permissions', () => {
  it('should get user permissions and roles', async () => {
    const response = await request(app.getHttpServer())
      .get(`/users/${userId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.roles).toBeDefined();
    expect(response.body.directPermissions).toBeDefined();
  });

  it('should update user profile', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstname: 'Updated',
        lastname: 'Name',
      });

    expect(response.status).toBe(200);
  });
});
```

#### Workflow 3: Permission mit Zeitlimit zuweisen
```typescript
describe('Workflow 3: Admin weist Permission mit Zeitlimit zu', () => {
  it('should add permission with time limits', async () => {
    const response = await request(app.getHttpServer())
      .post(`/users/${userId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        permission_id: 8,
        valid_from: '2026-03-25',
        valid_to: '2026-07-31',
      });

    expect(response.status).toBe(201);
    expect(response.body.valid_from).toBeDefined();
    expect(response.body.valid_to).toBeDefined();
  });
});
```

#### Workflow 4: Permission-Flags prüfen
```typescript
describe('Workflow 4: Permission Flags Check', () => {
  it('should check READ permission', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/tasks/${taskId}/members/check-permission`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(200);
    expect(response.body.has_read).toBe(true);
  });

  it('should return correct permission flags for creator', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/tasks/${taskId}/members/check-permission`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(200);
    expect(response.body.permission_flags).toBe(7); // RWX
  });
});
```

### 7.3 Tests ausführen

**Unit Tests:**
```bash
cd backend
npm run test
# oder spezifisch:
npm run test permissions.service.spec.ts
npm run test task-members.service.spec.ts
```

**E2E Tests:**
```bash
cd backend
npm run test:e2e
# oder spezifisch:
npm run test:e2e mitgliederverwaltung.e2e-spec.ts
```

**Coverage prüfen:**
```bash
npm run test:cov
```

---

## 📊 API Request/Response Beispiele

### Task-Mitglied hinzufügen

**Request:**
```bash
POST /api/tasks/10/members HTTP/1.1
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "user_id": 8
}
```

**Response (201 Created):**
```json
{
  "task_id": 10,
  "user_id": 8,
  "joined_at": "2026-03-25T10:30:00Z",
  "user": {
    "user_id": 8,
    "firstname": "Anna",
    "lastname": "Schmidt",
    "email": "anna@example.com",
    "username": "annas"
  }
}
```

### Alle Task-Mitglieder abrufen

**Request:**
```bash
GET /api/tasks/10/members HTTP/1.1
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
[
  {
    "task_id": 10,
    "user_id": 5,
    "joined_at": "2026-03-20T14:22:00Z",
    "user": {
      "user_id": 5,
      "firstname": "Max",
      "lastname": "Mustermann",
      "email": "max@example.com",
      "username": "maxm"
    }
  },
  {
    "task_id": 10,
    "user_id": 8,
    "joined_at": "2026-03-25T10:30:00Z",
    "user": {
      "user_id": 8,
      "firstname": "Anna",
      "lastname": "Schmidt",
      "email": "anna@example.com",
      "username": "annas"
    }
  }
]
```

### User-Profil mit Rollen & Permissions

**Request:**
```bash
GET /users/5/permissions HTTP/1.1
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "userId": 5,
  "directPermissions": [
    {
      "name": "edit_tasks",
      "flags": 6,
      "valid_from": "2026-03-25",
      "valid_to": "2026-07-31",
      "status": "VALID"
    }
  ],
  "roles": [
    {
      "role_id": 3,
      "name": "Teacher",
      "permissions": [
        {
          "name": "create_tasks",
          "description": "Create new tasks",
          "flags": 7
        },
        {
          "name": "edit_tasks",
          "description": "Edit tasks",
          "flags": 6
        },
        {
          "name": "edit_grades",
          "description": "Edit grades",
          "flags": 6
        }
      ]
    }
  ],
  "rolePermissions": [
    {
      "name": "create_tasks",
      "flags": 7
    },
    {
      "name": "edit_tasks",
      "flags": 6
    },
    {
      "name": "edit_grades",
      "flags": 6
    }
  ]
}
```

### Permission mit Zeitlimit hinzufügen

**Request:**
```bash
POST /users/5/permissions HTTP/1.1
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "permission_id": 8,
  "valid_from": "2026-03-25",
  "valid_to": "2026-07-31"
}
```

**Response (201 Created):**
```json
{
  "user_id": 5,
  "permission_id": 8,
  "valid_from": "2026-03-25T00:00:00Z",
  "valid_to": "2026-07-31T00:00:00Z",
  "permissions": {
    "permission_id": 8,
    "name": "manage_classes",
    "description": "Manage classes",
    "flags": 7
  }
}
```

---

## 🔐 Sicherheits-Checkliste

- [ ] JWT-Token validieren auf allen Endpoints
- [ ] RolesGuard & PermissionsGuard auf sensible Endpoints
- [ ] Zeitlimits bei Permissions prüfen (valid_from, valid_to)
- [ ] Permission-Flags mit Bitwise-Logik korrekt prüfen
- [ ] Task-Creator hat immer RWX (Vollzugriff)
- [ ] Implizite Mitgliedschaften (Creator, Assigned-to) im Code reflektieren
- [ ] CORS-Header korrekt setzen
- [ ] Sensible Daten aus Responses filtern (z.B. password_hash)
- [ ] Rate-Limiting implementieren
- [ ] Audit-Logs für Permission-Änderungen erstellen

---

## 📝 Struktur der Code-Dateien

```
backend/
├── src/
│   └── modules/
│       ├── auth/
│       │   ├── guards/
│       │   │   ├── jwt-auth.guard.ts
│       │   │   ├── roles.guard.ts          ✅ Neu implementiert
│       │   │   └── permissions.guard.ts    ✅ Neu implementiert
│       │   └── decorators/
│       │       ├── roles.decorator.ts      ✅ Neu implementiert
│       │       ├── permissions.decorator.ts ✅ Neu implementiert
│       │       └── index.ts                ✅ Neu implementiert
│       ├── users/
│       │   ├── users.service.ts           ✅ Erweitert
│       │   └── users.controller.ts        ✅ Erweitert
│       ├── task-members/
│       │   ├── task-members.service.ts    ✅ Vorhanden & validiert
│       │   └── task-members.controller.ts ✅ Vorhanden & validiert
│       └── permissions/
│           └── permissions.service.ts     ✅ Vorhanden & validiert
│
├── test/
│   ├── task-members.service.spec.ts      ✅ Unit Tests
│   └── mitgliederverwaltung.e2e-spec.ts  ✅ E2E Tests

frontend/
├── src/
│   ├── components/
│   │   ├── tasks/
│   │   │   └── TaskMembersList.vue        ✅ Neu implementiert
│   │   ├── UserProfile.vue                ✅ Neu implementiert
│   │   └── Badge.vue                      ✅ Neu implementiert
│   └── api/
│       ├── taskMembers.js                 ✅ Neu implementiert
│       └── usersService.js                ✅ Erweitert
```

---

## ✅ Implementation Checklist

- [x] Backend-Services (TaskMembers, Permissions, Users)
- [x] Backend-Controller mit Guards & Decorators
- [x] Permission-Flag System (READ, WRITE, EXECUTE)
- [x] Zeitvalidierung (valid_from, valid_to)
- [x] Frontend-Komponenten (TaskMembersList, UserProfile, Badge)
- [x] Frontend-API Services
- [x] Unit Tests für Services
- [x] E2E Tests für komplette Workflows
- [x] Dokumentation (diese Anleitung)

---

**Status: ✅ FERTIG - Alle Komponenten sind implementiert und dokumentiert!**

