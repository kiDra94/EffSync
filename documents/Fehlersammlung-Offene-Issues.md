# 🐛 Fehlersammlung - Offene Issues & Bugs

**Datum:** 1. April 2026  
**Status:** In Bearbeitung  
**Priorität:** Vor Abgabe beheben!

---

## 🔴 KRITISCH (Sofort beheben)

### 1. **ClassListView - Zugriffskontrolle fehlt**
- **Problem:** ClassListView sollte nur von Admin & Superadmin sichtbar sein, ist aber als Link in der Sidebar für alle Benutzer zugänglich
- **Aktuell:** Jeder Benutzer (auch Schüler) können die Klassenübersicht öffnen
- **Sollte sein:** Nur Admin (role: "admin") und Superuser (role: "superuser") haben Zugriff
- **Dateien betroffen:**
  - `frontend/src/views/ClassListView.vue` - Permission-Check fehlt
  - `frontend/src/router/index.js` - Route-Guard implementieren
  - `frontend/src/views/LayoutView.vue` - Sidebar-Link verstecken (v-if mit Permission)
- **Lösung:**
  ```typescript
  // Im Router oder View:
  beforeEnter: (to, from, next) => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin' || userRole === 'superuser') {
      next();
    } else {
      next('/dashboard'); // Redirect
    }
  }
  ```

---

### 2. **Schüler sehen und laden ALLE Dateien herunter**
- **Problem:** Schüler können alle hochgeladenen Dokumente von anderen Schülern/Lehrern sehen und herunterladen
- **Aktuell:** `DocumentView.vue` zeigt alle Dokumente ohne Filterung
- **Sollte sein:** Nur Dokumente anzeigen, die dem Schüler gehören oder für ihn freigegeben wurden (via `document_shares` Tabelle)
- **Dateien betroffen:**
  - `frontend/src/views/DocumentView.vue` - Filter hinzufügen
  - `backend/src/modules/documents/documents.service.ts` - Query filtern nach Benutzer
  - `backend/src/modules/documents/documents.controller.ts` - Nur eigene Dokumente zurückgeben
- **Lösung:**
  ```typescript
  // Backend: Nur eigene oder geteilte Dokumente
  async getMyDocuments(userId: number) {
    return this.prisma.documents.findMany({
      where: {
        OR: [
          { added_by: userId },  // Eigene Dokumente
          { document_shares: { some: { user_id: userId } } }  // Geteilte
        ]
      }
    });
  }
  ```

---

### 3. **Notizen werden NICHT gespeichert**
- **Problem:** 
  - Notizen über Dashboard "Schnelle Notiz erfassen" funktionieren nicht
  - Notizen werden nicht in DB gespeichert (nur localStorage)
  - Notizen-Seite ist nicht implementiert
- **Aktuell:** 
  - `DashboardView.vue` speichert nur in localStorage
  - Keine echte Persistierung in der Datenbank
  - Keine NoteView zum Verwalten
- **Sollte sein:** 
  - Notizen über POST-Request in Datenbank speichern
  - NoteView zeigt alle gespeicherten Notizen
  - Notiz-Verwaltung (Edit, Delete)
- **Dateien betroffen:**
  - `frontend/src/views/DashboardView.vue` - API-Call statt localStorage
  - `frontend/src/api/notes.js` - createNote() implementieren
  - `frontend/src/views/NoteView.vue` - Liste & CRUD-Operationen
  - `backend/src/modules/notes/notes.controller.ts` - POST Endpoint
  - `backend/src/modules/notes/notes.service.ts` - create() Logik
- **Lösung:**
  ```javascript
  // Frontend - Notiz speichern
  const saveNote = async (title, content) => {
    await notesApi.createNote({
      title,
      description: content,
      created_by: userId
    });
  }
  
  // Backend - CREATE Endpoint
  @Post()
  async create(@Body() createNoteDto: CreateNoteDto, @Req() req) {
    return this.notesService.create({
      ...createNoteDto,
      created_by: req.user.sub
    });
  }
  ```

---

### 4. **Überfällige Tasks fehlen im Status-Kreisdiagramm**
- **Problem:** Im `StatusDistributionChart` werden überfällige Tasks nicht als separater Status angezeigt
- **Aktuell:** 
  ```
  Statuse: [TODO, IN_PROGRESS, IN_REVIEW, COMPLETED, ON_HOLD]
  Überfällige: ❌ Fehlt
  ```
- **Sollte sein:** 
  ```
  Statuse: [TODO, IN_PROGRESS, IN_REVIEW, COMPLETED, ON_HOLD, OVERDUE]
  ```
- **Dateien betroffen:**
  - `backend/src/modules/metrics/metrics.service.ts` - getStatusDistribution()
  - `frontend/src/components/dashboard/StatusDistributionChart.vue` - Chart-Labels aktualisieren
- **Lösung:**
  ```typescript
  // Backend: Überfällige separät zählen
  async getStatusDistribution() {
    const now = new Date();
    const tasks = await this.prisma.tasks.findMany({
      select: { status: true, deadline: true }
    });
    
    // Kategorisiere Überfällige
    tasks.forEach(task => {
      if (task.deadline && new Date(task.deadline) < now && task.status !== 'COMPLETED') {
        distribution.OVERDUE++;
      } else if (task.status in distribution) {
        distribution[task.status]++;
      }
    });
  }
  ```

---

## 🟠 HOCH (Sollte bald beheben)

### 5. **Gesamtaufgaben Counter ist falsch**
- **Problem:** In `TaskProgressChart` wird die Gesamtaufgaben-Anzahl nicht richtig gezählt
- **Aktuell:** Counter zeigt eine falsche Zahl (möglicherweise doppelt oder tripple gezählt)
- **Sollte sein:** `totalTasks` = Alle Tasks des Benutzers
- **Dateien betroffen:**
  - `backend/src/modules/metrics/metrics.service.ts` - getTaskProgress()
  - `frontend/src/components/dashboard/TaskProgressChart.vue` - Anzeige prüfen
- **Debug-Schritte:**
  1. Backend testen: `GET /api/metrics/task-progress` → `totalTasks` Wert prüfen
  2. Per User filtern?
  3. Duplikate durch Joins?

---

### 6. **Filterung in Fortschrittsmetriken funktioniert bei Schülern nicht**
- **Problem:** Wenn ein Schüler auf eine Status-Kategorie im Fortschritts-Chart klickt, wird er gefiltert, aber es funktioniert nicht richtig
- **Aktuell:** Click funktioniert teilweise, Filter wird falsch angewendet
- **Sollte sein:** Schüler sieht nur SEINE Tasks gefiltert nach Status
- **Dateien betroffen:**
  - `frontend/src/components/dashboard/TaskProgressChart.vue` - Filter-Click Handler
  - `backend/src/modules/metrics/metrics.service.ts` - Nur User-Tasks filtern
  - `frontend/src/api/metrics.js` - User-ID oder Filter-Parameter übergeben
- **Lösung:**
  ```typescript
  // Backend: Tasks nur für aktuellen User
  async getStatusDistribution(userId?: number) {
    const where = userId ? { assigned_to: userId } : {};
    const tasks = await this.prisma.tasks.findMany({
      where,
      select: { status: true }
    });
  }
  ```

---

### 7. **Heutigen Stundenplan klickt zur falschen Seite**
- **Problem:** Klick auf "Heutiger Stundenplan" (im Dashboard) navigiert zur falschen View
- **Aktuell:** (Route falsch oder nicht implementiert)
- **Sollte sein:** Zu CalendarView mit heutigen Datum hervorheben ODER zu SchedulesView mit Heute-Filter
- **Dateien betroffen:**
  - `frontend/src/views/DashboardView.vue` - onClick Handler
  - `frontend/src/router/index.js` - Prüfen ob CalendarView existiert
  - `frontend/src/views/CalendarView.vue` - Heute hervorheben (bzw. erstellen)
- **Lösung:**
  ```javascript
  // Im Dashboard:
  const goToTodaySchedule = () => {
    router.push({
      name: 'CalendarView', // oder 'SchedulesView'
      query: { date: new Date().toISOString().split('T')[0] }
    });
  }
  ```

---

### 8. **Stundenplan Kachel bei Schülern - Falsche Ansicht**
- **Problem:** "Stundenplan" Kachel im Dashboard zeigt für Schüler nicht die richtige View
- **Aktuell:** Klick führt zu falscher Route oder zeigt Monatsansicht
- **Sollte sein:** Schüler sehen **Wochenansicht oder Tagesansicht** mit ihren Stunden
- **Dateien betroffen:**
  - `frontend/src/views/DashboardView.vue` - Stundenplan-Kachel Button
  - `frontend/src/views/SchedulesView.vue` - View-Mode für Schüler setzen
  - `frontend/src/router/index.js` - Query-Parameter für View-Type
- **Lösung:**
  ```javascript
  // Dashboard - Schüler zur Wochenansicht
  const goToStudentSchedule = () => {
    router.push({
      name: 'SchedulesView',
      query: { view: 'week', date: new Date().toISOString() }
    });
  }
  
  // SchedulesView - Für Schüler: Nur Woche/Tag
  const viewMode = userRole === 'student' ? 'week' : 'month';
  ```

---

### 9. **Stundenplan Management für Admin/Superadmin**
- **Problem:** Admin und Superadmin können Stundenpläne nicht für alle Klassen und Lehrer bearbeiten
- **Aktuell:** Entweder kein Edit-Feature oder nur für die eigene Klasse
- **Sollte sein:** 
  - Admin/Superadmin sehen **Stundenpläne aller Klassen**
  - Admin/Superadmin sehen **Stundenpläne aller Lehrer**
  - Admin/Superadmin können diese **erstellen, editieren, löschen**
  - UI sollte Filter nach Klasse/Lehrer haben
- **Dateien betroffen:**
  - `backend/src/modules/schedules/schedules.controller.ts` - getAllSchedules() für Admin
  - `backend/src/modules/schedules/schedules.service.ts` - Query ohne User-Filter für Admin
  - `frontend/src/views/SchedulesView.vue` - Admin-UI mit Edit/Delete Buttons
  - `frontend/src/components/schedules/ScheduleForm.vue` - Admin kann Klasse/Lehrer wählen
- **Lösung:**
  ```typescript
  // Backend: Nur Admin sieht alle, Schüler sieht nur seine
  async getAllSchedules(userId: number, userRole: string) {
    if (userRole === 'admin' || userRole === 'superuser') {
      // ALLE Stundenpläne
      return this.prisma.schedules.findMany({
        include: { 
          classes: true,
          lesson_slots: { include: { teachers: true } }
        }
      });
    } else {
      // Nur meine Stundenpläne
      return this.prisma.schedules.findMany({
        where: { /* filter by user */ }
      });
    }
  }
  ```

---

### 10. **Offene Aufgaben Counter im Dashboard falsch**
- **Problem:** Die "Offene Aufgaben" Kachel im Dashboard zeigt eine falsche Zahl
- **Aktuell:** Counter ist wahrscheinlich nicht gefiltert nach User oder zählt alles doppelt
- **Sollte sein:** 
  - **Schüler**: Nur IHM zugewiesene Tasks mit Status "TODO" oder "IN_PROGRESS"
  - **Lehrer/Admin**: Tasks, die ER erstellt hat und noch offen sind (optional: + Tasks von seinen Klassen)
- **Dateien betroffen:**
  - `frontend/src/views/DashboardView.vue` - getStorageCount('tasks') ist Static!
  - `frontend/src/api/metrics.js` - Neuer Endpoint: getOpenTasksCount()
  - `backend/src/modules/metrics/metrics.service.ts` - getOpenTasksCount() implementieren
- **Lösung:**
  ```typescript
  // Backend: Offene Tasks zählen (User-spezifisch)
  async getOpenTasksCount(userId: number, userRole: string) {
    if (userRole === 'student') {
      // Nur zugewiesene Tasks
      return this.prisma.tasks.count({
        where: {
          assigned_to: userId,
          status: { in: ['TODO', 'IN_PROGRESS'] }
        }
      });
    } else {
      // Lehrer: Seine Tasks + seine Klassen
      return this.prisma.tasks.count({
        where: {
          OR: [
            { created_by: userId, status: { in: ['TODO', 'IN_PROGRESS'] } }
          ]
        }
      });
    }
  }
  
  // Frontend: Echte API-Call statt localStorage
  const openTasks = await fetchMetrics('open-tasks-count');
  ```

---

### 11. **Registrierung - Keine minimalen Rechte für neue User**
- **Problem:** Neue User, die sich registrieren, bekommen automatisch KEINE Role zugewiesen
- **Aktuell:** `auth.service.ts` register() Methode erstellt User ohne user_roles Eintrag
- **Sollte sein:** Jeder neue User bekommt automatisch **Student-Rolle** mit minimalen Rechten zugewiesen
- **Datei betroffen:**
  - `backend/src/modules/auth/auth.service.ts` - register() Methode erweitern
- **Lösung:**
  ```typescript
  // In auth.service.ts register() Methode:
  async register(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const newUser = await this.prisma.users.create({
      data: {
        ...createUserDto,
        password_hash: hashedPassword,
      },
    });

    // Student-Rolle automatisch zuweisen
    const studentRole = await this.prisma.roles.findFirst({
      where: { name: 'Student' },
    });

    if (studentRole) {
      await this.prisma.user_roles.create({
        data: {
          user_id: newUser.user_id,
          role_id: studentRole.role_id,
        },
      });
    }

    return newUser;
  }
  ```
- **DSGVO-Konform:** ✅ Ja - Admin behält Kontrolle über Role-Management via Admin-Panel, keine automatische Rechtesteigerung

---

## 📋 Zusammenfassung nach Priorität

| # | Fehler | Priorität | Auswirkung | Est. Zeit |
|---|--------|-----------|-----------|-----------|
| 1 | ClassListView Zugriffskontrolle | 🔴 Kritisch | Security-Risiko | 30 Min |
| 2 | Schüler sehen alle Dateien | 🔴 Kritisch | Data-Leak | 45 Min |
| 3 | Notizen nicht gespeichert | 🔴 Kritisch | Feature nicht funktional | 90 Min |
| 4 | Überfällige im Diagram fehlen | 🔴 Kritisch | Metrik incomplete | 30 Min |
| 5 | Gesamtaufgaben Counter falsch | 🟠 Hoch | Falsche Statistik | 20 Min |
| 6 | Filterung bei Schülern | 🟠 Hoch | UX-Problem | 45 Min |
| 7 | Stundenplan-Link falsch | 🟠 Hoch | Navigation falsch | 20 Min |
| 8 | Stundenplan Schüler-View | 🟠 Hoch | Falsche Ansicht | 40 Min |
| 9 | Stundenplan Admin-Management | 🟠 Hoch | Feature fehlt | 90 Min |
| 10 | Offene Aufgaben Counter | 🟠 Hoch | Falsche Statistik | 30 Min |
| 11 | Registrierung - Keine Rollen | 🟠 Hoch | Rechteverwaltung | 20 Min |

---

## ✅ Testing-Checkliste

Vor Abgabe folgende User-Workflows testen:

- [ ] **Als Schüler:** Kann ClassListView NICHT zugreifen
- [ ] **Als Schüler:** Sieht nur SEINE Dokumente oder die für ihn freigegebenen
- [ ] **Als Schüler:** Schnelle Notiz speichern & in NoteView sehen
- [ ] **Als Schüler:** Offene Aufgaben Counter zeigt nur SEINE offenen Tasks
- [ ] **Als Schüler:** Stundenplan-Kachel führt zu Wochenansicht mit seinen Stunden
- [ ] **Als Lehrer:** Sieht alle Metriken OHNE Filterung
- [ ] **Als Admin:** Kann Stundenpläne aller Klassen und Lehrer bearbeiten
- [ ] **Als Admin:** Stundenplan-Kachel zeigt Übersicht aller Klassen/Lehrer
- [ ] **Alle:** Fortschritts-Metriken zeigen richtige Zahlen
- [ ] **Alle:** Klick auf "Stundenplan" geht zur Kalender-Seite mit Heute
- [ ] **Alle:** Überfällige Tasks zeigen sich im Status-Diagramm

---

## 🚀 Nächste Schritte

1. **Sofort implementieren:** Issues 1-4
2. **Danach**: Issues 5-7
3. **Testen:** Alle Szenarien durchpishen
4. **Code Review:** Vor Merge zu `main`
5. **Release:** Feature-Branch in main mergen

---

**Zuletzt aktualisiert:** 1. April 2026  
**Verantwortlich:** Ereny



______________________________________________________________________________________________

# 🛠️ Bugfix-Status – Feature-Branch

**Datum:** 01.04.2026  
**Repository:** `kiDra94/diplom-arbeit`  
**Branch:** `feature-35-dashboard-metriken-ausbau`  
**Basis-Branch:** `main`  
**Verantwortlich:** _<Name eintragen>_  
**Gesamtstatus:** 🟡 In Arbeit

---

## 📌 Kurzstatus (Stand heute)

- **Offen:** _<Anzahl>_
- **In Arbeit:** _<Anzahl>_
- **Erledigt:** _<Anzahl>_
- **Blockiert:** _<Anzahl>_

---

## ✅ Erledigte Bugfixes

- [x] _<Issue/Bugtitel #1>_  
  - Datei(en): `_path_`
  - Fix: _Kurzbeschreibung_
  - Getestet: _ja/nein_

- [x] _<Issue/Bugtitel #2>_  
  - Datei(en): `_path_`
  - Fix: _Kurzbeschreibung_
  - Getestet: _ja/nein_

---

## 🔧 In Arbeit

- [ ] _<Issue/Bugtitel #1>_  
  - Datei(en): `_path_`
  - Nächster Schritt: _Kurzbeschreibung_
  - ETA: _<Datum/Uhrzeit>_

- [ ] _<Issue/Bugtitel #2>_  
  - Datei(en): `_path_`
  - Nächster Schritt: _Kurzbeschreibung_
  - ETA: _<Datum/Uhrzeit>_

---

## ⛔ Blocker / Risiken

- [ ] _<Blocker #1>_  
  - Ursache: _..._
  - Benötigt von: _..._
  - Workaround: _..._

---

## 🧪 Teststatus

- [ ] Unit Tests laufen lokal
- [ ] Backend-API manuell geprüft
- [ ] Frontend-Flows manuell geprüft
- [ ] Rollen-/Rechteprüfung (Schüler/Lehrer/Admin)
- [ ] Regressionstest Kernfunktionen

---

## 📂 Betroffene Bereiche

- [ ] Auth
- [ ] Dashboard/Metriken
- [ ] Dokumente
- [ ] Notizen
- [ ] Stundenplan
- [ ] Rollen & Berechtigungen

---

## 🚀 Nächste Schritte (morgen/nächster Slot)

1. _<Task 1>_
2. _<Task 2>_
3. _<Task 3>_

---

## 🔁 Merge-Readiness

- [ ] Alle kritischen Bugs (Prio 🔴) behoben
- [ ] Keine offenen Security-Issues
- [ ] CI grün / Tests grün
- [ ] Code Review durchgeführt
- [ ] Bereit für PR gegen `main`

---

## 📝 Notizen

_<Freitext für Entscheidungen, offene Fragen, Links zu Commits/PRs>_