# 🔐 Permissions & Roles testen - Komplettes Admin-Tutorial

## 📋 Überblick: Was du machen wirst

1. **User erstellen** (als Admin)
2. **Ihm Roles zuweisen** (z.B. Teacher, Student)
3. **Ihm Permissions zuweisen** (z.B. `manage_users`, `create_task`)
4. **Die Auswirkungen testen** (Was kann der User jetzt?)

---

## 🚀 SCHRITT 1: Als Admin anmelden

### Via Website (Frontend):
```
http://localhost:3000 (oder deine Frontend-URL)
```

**Login mit Admin-User:**
- **Username:** `admin_user` (oder dein Admin aus seed.ts)
- **Password:** `password123`

### Oder via API (Postman/curl):
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin_user",
    "password": "password123"
  }'

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "user_id": 1, "username": "admin_user" }
}
```

**Speicher den Token - du brauchst ihn später!** 🔑

---

## ✨ SCHRITT 2: Neuen User erstellen

### Via API:
```bash
curl -X POST http://localhost:3001/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "Test",
    "lastname": "User",
    "username": "test_user_001",
    "email": "test@example.de",
    "password": "password123"
  }'

# Response:
{
  "user_id": 42,
  "firstname": "Test",
  "lastname": "User",
  "username": "test_user_001",
  "email": "test@example.de"
}
```

**Speichern Sie die `user_id`: 42** ✅

### Oder via Web-UI (falls implementiert):
- Admin Panel → Users → "Neuer User"
- Formular ausfüllen
- "Erstellen" klicken

---

## 👥 SCHRITT 3: Rolle dem User zuweisen

### Zunächst: Verfügbare Roles anschauen
```bash
curl -X GET http://localhost:3001/roles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Response (Beispiel):
[
  { "role_id": 1, "name": "Superuser" },
  { "role_id": 2, "name": "Admin" },
  { "role_id": 3, "name": "Teacher" },
  { "role_id": 4, "name": "Student" }
]
```

### Rolle zuweisen (z.B. Teacher mit ID 3):
```bash
curl -X POST http://localhost:3001/users/42/roles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": 3
  }'

# Response:
{
  "user_id": 42,
  "role_id": 3,
  "assigned_at": "2026-03-26T10:30:00Z",
  "roles": {
    "role_id": 3,
    "name": "Teacher",
    "roles_permissions": [
      {
        "permissions": {
          "permission_id": 1,
          "name": "create_task",
          "description": "Create tasks",
          "flags": 7
        }
      }
    ]
  }
}
```

✅ **User hat jetzt automatisch alle Permissions der Teacher-Rolle!**

---

## 🔑 SCHRITT 4: Zusätzliche Permissions zuweisen

Manche Permissions brauchen Sie nicht über Roles, sondern direkt:

### Verfügbare Permissions anschauen:
```bash
curl -X GET http://localhost:3001/permissions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Response:
[
  { "permission_id": 1, "name": "create_task", "flags": 7 },
  { "permission_id": 2, "name": "manage_users", "flags": 7 },
  { "permission_id": 3, "name": "edit_grades", "flags": 2 },
  ...
]
```

### Permission hinzufügen (ohne Zeitlimit):
```bash
curl -X POST http://localhost:3001/users/42/permissions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_id": 2
  }'

# Response:
{
  "user_id": 42,
  "permission_id": 2,
  "valid_from": null,
  "valid_to": null,
  "permissions": {
    "permission_id": 2,
    "name": "manage_users",
    "flags": 7
  }
}
```

### Permission mit ZEITLIMIT hinzufügen:
```bash
curl -X POST http://localhost:3001/users/42/permissions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_id": 5,
    "valid_from": "2026-03-26",
    "valid_to": "2026-06-30"
  }'
```

| Szenario | gültig? |
|----------|---------|
| Heute (26.3.26) zwischen 26.3 - 30.6 | ✅ Ja |
| Vor 26.3.26 | ❌ Nein (noch nicht gültig) |
| Nach 30.6.26 | ❌ Nein (abgelaufen) |

---

## 🧪 SCHRITT 5: Was der User jetzt kann - TESTEN

### 5a) Eigene Permissions ansehen:
**Nutzer sich selbst anmelden** mit:
- Username: `test_user_001`
- Password: `password123`

```bash
# Der User kann EIGENE Permissions immer sehen:
curl -X GET http://localhost:3001/users/me/permissions \
  -H "Authorization: Bearer TEST_USER_TOKEN"

# Response (TEST_USER kann sehen):
{
  "userId": 42,
  "directPermissions": [
    {
      "name": "manage_users",
      "flags": 7,
      "status": "VALID"
    }
  ],
  "roles": [
    {
      "name": "Teacher",
      "permissions": [...]
    }
  ],
  "rolePermissions": [...]
}
```

### 5b) Task erstellen (wenn er Permission hat):
```bash
curl -X POST http://localhost:3001/tasks \
  -H "Authorization: Bearer TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Meine erste Task",
    "description": "Test-Task"
  }'

# ✅ Erfolgreich wenn Permission "create_task" hat
# ❌ 403 Forbidden wenn Permission fehlt
```

### 5c) Andere User sehen (nur mit `manage_users`):
```bash
curl -X GET http://localhost:3001/users \
  -H "Authorization: Bearer TEST_USER_TOKEN"

# ✅ Erfolgreich wenn "manage_users" Permission hat
# ❌ 403 Forbidden wenn nicht
```

---

## 🎯 PERMISSION FLAGS erklärt (Bitweise)

Jede Permission hat **Flags**, die angeben WAS der User tun kann:

```
READ    = 4 (0b100)  → Daten LESEN
WRITE   = 2 (0b010)  → Daten ÄNDERN
EXECUTE = 1 (0b001)  → Aktion AUSFÜHREN
RWX     = 7 (0b111)  → ALLES (lesbar | schreibbar | ausführbar)
```

**Beispiele:**
- Flag `4` = nur Lesen (z.B. read_reports)
- Flag `2` = nur Schreiben (z.B. edit_grades)
- Flag `7` = Vollzugriff (z.B. manage_users)

### Bitweise Operationen:
```javascript
// Prüfen ob ein Flag gesetzt ist:
if ((flags & READ) === READ) {
  // User kann lesen
}

// Mehrere Flags kombinieren:
const READ_WRITE = READ | WRITE;  // 4 | 2 = 6

// Flags kombinieren für Tests:
const HAS_RWX = (flags & 7) === 7;  // RWX?
```

---

## 📊 Workflow-Beispiel KOMPLETT

### Szenario: "Neuer Lehrer soll Aufgaben erstellen, aber nicht User verwalten"

```bash
# 1. User erstellen
POST /users
Body: { firstname: "John", lastname: "Doe", ... }
Response: user_id = 50

# 2. Teacher-Rolle zuweisen (gibt ihm create_task + other task perms)
POST /users/50/roles
Body: { role_id: 3 }

# 3. Zusätzliche Permissions noch hinzufügen? Nein, Teacher-Rolle reicht

# 4. NEGATIV-Test: Versuchen, User zu verwalten
GET /users (mit John's Token)
→ 403 Forbidden (John hat keine "manage_users"!)

# 5. POSITIV-Test: Task erstellen
POST /tasks
Body: { title: "Neue Aufgabe", ... }
→ 201 Created ✅
```

---

## 🌐 Wenn du es über Web-UI machen möchtest:

Es gibt eine **UserProfile.vue** Komponente im Frontend, die alles kann:

```
/frontend/src/components/UserProfile.vue
```

**Features:**
- ✅ User editieren
- ✅ Permissions hinzufügen/entfernen
- ✅ Zeitlimits für Permissions setzen
- ✅ Rollen zuweisen
- ✅ Alle Rechte eines Users ansehen

**Zugang:** Frontend → Admin Panel → Users → User auswählen → "Profile bearbeiten"

---

## ⚙️ DEBUGGING: Wenn was nicht funktioniert

### 1. Ist der Admin-User registriert?
```bash
curl -X GET http://localhost:3001/users \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 2. Hat der Admin USER "manage_users" Permission?
```bash
curl -X GET http://localhost:3001/users/1/permissions \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Suche nach "manage_users" in der Response
```

### 3. Seeds laufen lassen:
```bash
npx prisma db seed
# Erzeugt Demo-Daten mit Permissions & Roles
```

---

## 📝 Zusammenfassung

| Schritt | Aktion | API-Endpoint |
|---------|--------|--------------|
| 1 | Login als Admin | `POST /auth/login` |
| 2 | User erstellen | `POST /users` |
| 3 | Rolle zuweisen | `POST /users/{id}/roles` |
| 4 | Permission zuweisen | `POST /users/{id}/permissions` |
| 5 | Rechte testen | Verschiedene Endpoints mit User-Token |

---

## 🔗 Relevante API-Endpoints

### User Management
- `POST /users` - Neuen User erstellen
- `GET /users` - Alle Users auflisten
- `GET /users/:id` - User-Details
- `GET /users/me/permissions` - Eigene Permissions
- `GET /users/:id/permissions` - Permissions eines Users

### Permission Management
- `POST /users/:id/permissions` - Permission hinzufügen
- `DELETE /users/:id/permissions/:permissionId` - Permission entfernen
- `GET /permissions` - Alle Permissions auflisten

### Role Management
- `POST /users/:id/roles` - Rolle zuweisen
- `DELETE /users/:id/roles/:roleId` - Rolle entfernen
- `GET /roles` - Alle Roles auflisten

---

## 📚 Weitere Ressourcen

- [Task-Assignment-Model Documentation](./task-assignment-model.md)
- [Mitgliederverwaltung Anleitung](./mitgliederverwaltung-anleitung.md)
- Backend: `/src/modules/users/users.service.ts`
- Backend: `/src/modules/permissions/permissions.service.ts`
- Frontend: `/src/api/usersService.js`

---

**Viel Spaß beim Testen!** 🎉
