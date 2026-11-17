# Automatische Permissions bei Rollen-Zuweisung

## Problem
Wenn ein Benutzer eine Rolle (z.B. "Student", "Teacher") zugewiesen bekam, erhielt er **nicht automatisch** die dazugehörigen Permissions. Diese mussten manuell hinzugefügt werden - was fehleranfällig ist und zu Inkonsistenzen führt.

## Lösung
Die Lösung implementiert **automatische Standard-Permissions**, die eine Rolle mitbringt:

### 1. **Zentrale Konfiguration** (`src/contexts/identity-access/domain/role-permissions.ts`)
Definiert, welche Permissions jede Rolle standardmäßig haben soll:

```typescript
export const ROLE_PERMISSIONS_CONFIG = {
  'Student': ['view_dashboard', 'view_grades', 'view_schedules'],
  'Teacher': ['view_dashboard', 'create_tasks', 'edit_tasks', 'edit_grades', 'view_schedules'],
  'Admin': ['view_dashboard', 'manage_users', 'manage_classes', 'manage_system', 'view_grades'],
  'Superuser': [alle Permissions],
}
```

### 2. **RolePermissionsService** (`src/modules/roles/role-permissions.service.ts`)
Neue Service, die:
- Permissions nach Name sucht
- Standard-Permissions für eine Rolle zuweist
- Prüft, ob Permissions bereits existieren (Duplikate vermeiden)
- Intelligentes Entfernen von Permissions, wenn Rollen entfernt werden

### 3. **Automatische Ausführung in UsersService**
Die Methode `addRoleToUser()` wurde erweitert:

```typescript
async addRoleToUser(userId: number, roleId: number) {
  // 1. Rolle zuweisen
  const result = await this.prisma.user_roles.create({...});
  
  // 2. ✨ AUTOMATISCH: Standard-Permissions hinzufügen
  await this.rolePermissionsService.assignDefaultPermissionsForRole(
    userId,
    roleId,
    role.name
  );
  
  return result;
}
```

## Feature-Übersicht

| Rolle | Standard-Permissions |
|-------|----------------------|
| **Student** | `view_dashboard`<br>`view_grades`<br>`view_schedules` |
| **Teacher** | + `create_tasks`<br>+ `edit_tasks`<br>+ `delete_tasks`<br>+ `edit_grades` |
| **Admin** | + `manage_users`<br>+ `manage_classes`<br>+ `manage_system` |
| **Superuser** | ✓ Alle Permissions |

## Beispiel: Workflow

### Vorher (Manuell):
```
1. Wähle User "Max Müller"
2. Klicke "Rolle zuweisen"
3. Wähle "Student" → Role zugewiesen ✓
4. Gehe zu Permissions
5. Klicke "+ Permission hinzufügen"
6. Wähle "view_dashboard" → hinzufügt ✓
7. Wähle "view_grades" → hinzufügt ✓
8. Wähle "view_schedules" → hinzufügt ✓
9. Speichern
```

### Nachher (Automatisch):
```
1. Wähle User "Max Müller"
2. Klicke "Rolle zuweisen"
3. Wähle "Student"
4. ✨ FERTIG! Alle Student-Permissions wurden automatisch hinzugefügt
```

## Modifikation der Standard-Permissions

Wenn du die Permissions einer Rolle ändern möchtest, bearbeite [role-permissions.ts](../backend/src/contexts/identity-access/domain/role-permissions.ts):

```typescript
[RoleName.TEACHER]: [
  'view_dashboard',
  'create_tasks',
  'edit_tasks',
  'delete_tasks',      // ← Hinzufügen
  'view_grades',
  'edit_grades',
  'view_schedules',
  'edit_schedules',    // ← NEU: Neue Permission
]
```

**Wichtig:** Diese Änderung gilt nur für NEUE Rollen-Zuweisungen. Bestehende User werden nicht automatisch angepasst.

## API-Endpunkte (Keine Änderung erforderlich)

```http
POST /users/{id}/roles
Content-Type: application/json

{
  "role_id": 3
}
```

**Response:** User erhält automatisch alle Standard-Permissions der Rolle.

```json
{
  "user_id": 5,
  "role_id": 3,
  "assigned_at": "2026-05-13T10:30:00Z"
}
```

## Logging

Die Lösung gibt ausführliches Logging aus:

```
📋 Weisen automatisch Permissions für Rolle "Student" zu User 5 zu
  ✓ Permission "view_dashboard" zugewiesen
  ✓ Permission "view_grades" zugewiesen
  ⊘ Permission "view_schedules" existiert bereits, überspringe
  📊 Zusammenfassung: 2 neu zugewiesen, 1 übersprungen
```

## Technische Details

### Im Backend:
- **UsersService.addRoleToUser()** - Löst Zuweisung aus
- **RolePermissionsService.assignDefaultPermissionsForRole()** - Fügt Permissions zu
- **role-permissions.ts** (`contexts/identity-access/domain/`) - Zentrale Konfiguration

### In der Datenbank (Prisma):
```prisma
// Tabelle: user_roles
user_id: 5
role_id: 3
assigned_at: NOW()

// Tabelle: user_permissions (wird automatisch gefüllt)
user_id: 5, permission_id: 1 (view_dashboard)
user_id: 5, permission_id: 6 (view_grades)
user_id: 5, permission_id: 9 (view_schedules)
```

## Häufige Fragen (FAQ)

### F: Was passiert, wenn ich eine Permission manuell entferne?
A: Sie bleibt entfernt. Die automatische Zuweisung läuft nur bei neuer **Rollen-Zuweisung**.

### F: Was passiert, wenn ich zwei Rollen zuweise?
A: Der User erhält alle Permissions von beiden Rollen. Duplikate werden automatisch erkannt.

### F: Kann ich Custom-Permissions hinzufügen?
A: Ja, du kannst jederzeit Permissions manuell mit `POST /users/{id}/permissions` hinzufügen.

### F: Müssen alte Users aktualisiert werden?
A: Nein, die Lösung gilt nur für neue Rollen-Zuweisungen. Alte Zuweisungen behalten ihre aktuellen Permissions.

## Testen

Zum Testen in Postman:

```http
### Student-Rolle zuweisen
POST http://localhost:3000/users/5/roles
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "role_id": 2
}

### Überprüfe der Permissions
GET http://localhost:3000/users/5/permissions
Authorization: Bearer YOUR_TOKEN
```

Expected Response:
```json
{
  "roles": [
    {
      "role_id": 2,
      "name": "Student",
      "permissions": [
        { "name": "view_dashboard", "flags": 4 },
        { "name": "view_grades", "flags": 4 },
        { "name": "view_schedules", "flags": 4 }
      ]
    }
  ]
}
```

---


**Datum:** 13. Mai 2026
**Status:** ✅ Implementiert und getestet
