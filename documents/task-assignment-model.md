# Task Assignment Model - Dokumentation

## Überblick

Das Aufgaben-Zuweisungsmodell in diesem Projekt verwendet zwei unterschiedliche Konzepte zur Verwaltung von Benutzer-Aufgaben-Beziehungen:

1. **`assigned_to`** - Primärer Verantwortlicher
2. **`task_members`** - Team-Mitglieder/Kollaboratoren

---

## 1. `assigned_to` (One-to-Many)

### Definition
`assigned_to` ist ein direktes Feld im `tasks`-Modell, das einen einzelnen Benutzer als **primären Verantwortlichen** für eine Aufgabe definiert.

### Struktur
```prisma
model tasks {
  task_id       Int
  assigned_to   Int?
  
  users_tasks_assigned_toTousers users? @relation(
    "tasks_assigned_toTousers", 
    fields: [assigned_to], 
    references: [user_id]
  )
}
```

### Charakteristiken
- **Kardinalität**: One-to-Many (1 Benutzer → viele Aufgaben)
- **Bedeutung**: Der Benutzer ist **verantwortlich/zuständig** für diese Aufgabe
- **Eindeutigkeit**: Pro Aufgabe nur **ein** Verantwortlicher
- **Metadaten**: Keine zusätzlichen Informationen gespeichert
- **Nullable**: Kann null sein (Aufgabe ohne Zuständigen)

### Anwendungsfall
```
Aufgabe: "Projekt-Präsentation vorbereiten"
assigned_to: John (5) ← John ist der Hauptverantwortliche
```

---

## 2. `task_members` (Many-to-Many)

### Definition
`task_members` ist ein **Junction/Pivot-Modell**, das die Beziehung zwischen mehreren Benutzern und einer Aufgabe verwaltet. Es ermöglicht **Collaboration** zwischen Teamkollegen.

### Struktur
```prisma
model task_members {
  task_id   Int
  user_id   Int
  joined_at DateTime @default(now()) @db.Timestamp(6)

  tasks     tasks    @relation(fields: [task_id], references: [task_id], onDelete: Cascade)
  users     users    @relation(fields: [user_id], references: [user_id], onDelete: Cascade)

  @@id([task_id, user_id])
}
```

### Charakteristiken
- **Kardinalität**: Many-to-Many (viele Benutzer ↔ viele Aufgaben)
- **Bedeutung**: Alle Benutzer sind **Mitarbeiter/Kollaboratoren** an der Aufgabe
- **Eindeutigkeit**: Pro Aufgabe können **mehrere** Benutzer eingetragen sein
- **Metadaten**: Speichert `joined_at` - Zeitstempel, wann der Benutzer der Aufgabe beigetreten ist
- **Kaskadenlöschung**: Einträge werden gelöscht, wenn die Aufgabe oder der Benutzer gelöscht wird

### Anwendungsfall
```
Aufgabe: "Projekt-Präsentation vorbereiten"
task_members:
  - user_id: 5 (John, joined_at: 2026-03-20 10:00)
  - user_id: 8 (Sarah, joined_at: 2026-03-21 14:30)
  - user_id: 12 (Mike, joined_at: 2026-03-22 09:15)
```

---

## Vergleich

| Aspekt | `assigned_to` | `task_members` |
|--------|---------------|----------------|
| **Modelltyp** | Direktes Feld | Junction-Tabelle |
| **Kardinalität** | One-to-Many | Many-to-Many |
| **Benutzer pro Aufgabe** | 1 (oder null) | Unbegrenzt viele |
| **Aufgaben pro Benutzer** | Unbegrenzt viele | Unbegrenzt viele |
| **Bedeutung** | Hauptverantwortlicher | Mitarbeiter/Team |
| **Metadaten** | Keine | `joined_at` |
| **Löschen** | Einfaches Übergehen | Kaskadenlöschung |
| **Verwendung** | Verantwortung zuordnen | Team-Collaboration |

---

## Praktisches Szenario

### Szenario: Diplomarbeit-Projekt
```
Task: "Backend API implementieren"

assigned_to: 
  - John (ID: 5) ← John ist primär verantwortlich

task_members:
  - John (ID: 5, joined_at: 2026-01-15)      ← Auch im Team
  - Sarah (ID: 8, joined_at: 2026-01-16)     ← Hilft bei der Implementierung
  - Mike (ID: 12, joined_at: 2026-01-20)     ← Später hinzugekommen für Review
```

### Interpretation
- **John** ist der Hauptverantwortliche (`assigned_to`)
- **John, Sarah und Mike** arbeiten alle zusammen an der Aufgabe (`task_members`)
- Es ist dokumentiert, wann jedes Teammitglied beigetreten ist (`joined_at`)

---

## Implementierungsrichtlinien

### Wann `assigned_to` verwenden?
- Eine einzelne Person braucht **Verantwortung/Accountability**
- Für **Reporting und Tracking** des Hauptverantwortlichen
- Für **Eskalationen und Benachrichtigungen** an den Verantwortlichen
- Beispiele: Projektmanager, Teamleiter, Prüfer

### Wann `task_members` verwenden?
- **Mehrere Personen** arbeiten an einem Feature zusammen
- Du brauchst **Collaboration-Tracking** (wer arbeitet woran?)
- Dokumentation der **Team-Zusammensetzung** über die Zeit
- Für **Benachrichtigungen an alle Mitarbeiter**
- Beispiele: Feature-Teams, Code-Review-Teams, Projektgruppen

### Best Practice
```typescript
// Beide zusammen verwenden:
const task = await prisma.tasks.create({
  data: {
    title: "Frontend UI implementieren",
    assigned_to: 5,  // John ist verantwortlich
    task_members: {
      create: [
        { user_id: 5 },   // John
        { user_id: 8 },   // Sarah
        { user_id: 12 }   // Mike
      ]
    }
  }
});
```

---

## Datenbank-Struktur

### Beispiel-Daten

**Tasks-Tabelle:**
| task_id | title | assigned_to | ... |
|---------|-------|-------------|-----|
| 1 | Backend API | 5 | ... |
| 2 | Frontend UI | 8 | ... |

**task_members-Tabelle:**
| task_id | user_id | joined_at | 
|---------|---------|-----------|
| 1 | 5 | 2026-01-15 |
| 1 | 8 | 2026-01-16 |
| 1 | 12 | 2026-01-20 |
| 2 | 8 | 2026-01-15 |
| 2 | 10 | 2026-01-17 |

---

## Zusammenfassung

- **`assigned_to`** definiert den **Hauptverantwortlichen** einer Aufgabe
- **`task_members`** definiert das **komplette Team**, das an der Aufgabe arbeitet
- Sie sind **komplementär**, nicht ersetzbar
- Ein Aufgabenverwaltungssystem braucht **meist beide Konzepte**
