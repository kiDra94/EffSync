# Frontend Tests - Task Members Module

Umfassende Test-Suite für die Task Members Verwaltungs-Komponenten und API Services.

## 📋 Test-Übersicht

### Unit Tests

#### 1. **TaskMembersList.spec.js** (17 Tests)
Tests für die Hauptkomponente zur Mitgliederverwaltung.

**Getestete Features:**
- ✅ Laden und Anzeigen von Task-Mitgliedern
- ✅ Hinzufügen neuer Mitglieder
- ✅ Entfernen von Mitgliedern
- ✅ Creator/Assigned-to Schutz
- ✅ Permission-Checks (READ/WRITE)
- ✅ Badge-Anzeige (Creator, Assigned)
- ✅ Fehlerverwaltung & Toast-Meldungen
- ✅ Avatar-Initialen-Generierung

**Beispiel-Test:**
```javascript
it('should allow adding a member to a task', async () => {
  const wrapper = mount(TaskMembersList, {...});
  const select = wrapper.find('.member-select');
  await select.setValue(4);
  const addButton = wrapper.find('.btn-add');
  await addButton.trigger('click');
  expect(taskMembersApi.addTaskMember).toHaveBeenCalled();
});
```

---

#### 2. **TaskForm.spec.js** (19 Tests)
Tests für die Task-Details-Form mit integrierter TaskMembersList.

**Getestete Features:**
- ✅ Form-Initialisierung (neu/bearbeiten)
- ✅ TaskMembersList Integration
- ✅ Form-Field Validierung
- ✅ Deadline & Priority Handling
- ✅ Subtask-Integration
- ✅ Form-Submission
- ✅ Error Summary

**Beispiel-Test:**
```javascript
it('should show TaskMembersList for existing task', async () => {
  const wrapper = mount(TaskForm, {
    props: { task: mockExistingTask }
  });
  expect(wrapper.html()).toContain('task-members');
});
```

---

#### 3. **taskMembers.js (API Service Tests)** (20+ Tests)
Tests für die API Service Funktionen.

**Getestete Features:**
- ✅ `getTaskMembers()` - Mitglieder laden
- ✅ `addTaskMember()` - Mitglied hinzufügen
- ✅ `removeTaskMember()` - Mitglied entfernen
- ✅ `checkPermission()` - Berechtigungen prüfen
- ✅ Endpoint-Konsistenz
- ✅ Error-Handling (Timeout, Server-Fehler)

**Beispiel-Test:**
```javascript
it('calls correct endpoint', async () => {
  const result = await taskMembersApi.getTaskMembers(42);
  expect(apiClient.get).toHaveBeenCalledWith('/api/tasks/42/members');
});
```

---

### Integration Tests

#### 4. **TaskMembers.integration.spec.js** (15+ Integration Tests)
End-to-End Test für komplette Workflows.

**Getestete Workflows:**
- ✅ **Add Member Flow:** Dialog → Select → Add → Success Message
- ✅ **Remove Member Flow:** Click Remove → Confirm → Success
- ✅ **Permission Protection:** Creator/Assigned-to nicht entfernbar
- ✅ **Error Handling:** Graceful error recovery
- ✅ **UI State:** Message timeouts, loading states
- ✅ **Data Integrity:** Member list consistency
- ✅ **Accessibility:** Labels & titles

**Beispiel-Test:**
```javascript
it('should allow adding a member to a task', async () => {
  const wrapper = mount(TaskMembersList, {...});
  const select = wrapper.find('.member-select');
  await select.setValue(3);
  const addButton = wrapper.find('.btn-add');
  await addButton.trigger('click');
  expect(taskMembersApi.addTaskMember).toHaveBeenCalled();
});
```

---

## 🚀 Tests ausführen

### Alle Tests starten
```bash
cd frontend
npm run test
```

### Mit UI View
```bash
npm run test:ui
```

### Coverage Report
```bash
npm run test:coverage
```

### Spezifische Test-Datei
```bash
npm run test -- TaskMembersList.spec.js
```

### Watch Mode (automatisches Neuladen)
```bash
npm run test -- --watch
```

---

## 📊 Test-Struktur

```
frontend/src/
├── components/tasks/
│   ├── TaskMembersList.spec.js          (17 Tests)
│   ├── TaskForm.spec.js                 (19 Tests)
│   └── TaskMembers.integration.spec.js  (15+ Tests)
└── api/
    └── taskMembers.spec.js              (20+ Tests)
```

**Total: 71+ Tests**

---

## 🔬 Mock-Strategie

### API Mocking
```javascript
vi.mock('@/api/taskMembers');
vi.mock('@/api/usersService');

// Mock im Test
taskMembersApi.getTaskMembers.mockResolvedValue({ 
  data: mockMembers 
});
```

### Store Mocking
```javascript
vi.mock('@/stores/entities/taskStore', () => ({
  useTaskStore: vi.fn(() => ({
    getSubtasks: vi.fn(() => [])
  }))
}));
```

---

## 📝 Test-Daten

### Mock Members
```javascript
const mockMembers = [
  {
    user_id: 2,
    task_id: 1,
    joined_at: '2025-01-01T10:00:00Z',
    users: {
      user_id: 2,
      firstname: 'John',
      lastname: 'Doe',
      email: 'john@example.com'
    }
  }
];
```

### Mock Users
```javascript
const mockAllUsers = [
  { user_id: 1, firstname: 'Admin', lastname: 'User', email: 'admin@example.com' },
  { user_id: 2, firstname: 'John', lastname: 'Doe', email: 'john@example.com' },
  // ...
];
```

---

## ✅ Getestete Szenarien

### Positive Cases ✓
- [x] Member hinzufügen (erfolgreich)
- [x] Member entfernen (erfolgreich)
- [x] Permissions prüfen
- [x] Members laden & anzeigen
- [x] User-Auswahl & Preview
- [x] Success Messages
- [x] Form Submission

### Negative Cases ✓
- [x] Member bereits existierend
- [x] User nicht gefunden
- [x] Keine Berechtigung
- [x] Creator Schutz
- [x] API-Fehler
- [x] Timeout-Fehler
- [x] Server-Fehler (500)

### Edge Cases ✓
- [x] Leere Member-Liste
- [x] Keine verfügbaren Users
- [x] Spezial-Zeichen in Namen
- [x] lange Email-Adressen
- [x] Berechtigungen während Loading
- [x] Dialog während Loading
- [x] Mehrfaches Add/Remove

---

## 🎯 Coverage-Ziele

| Komponente | Status | Coverage |
|-----------|--------|----------|
| TaskMembersList.vue | ✅ | ~95% |
| TaskForm.vue | ✅ | 85% |
| taskMembers.js | ✅ | ~99% |
| Integration | ✅ | ~90% |

---

## 🔄 Continuous Integration

Tests laufen automatisch auf:
- Commits
- Pull Requests
- Push zu main/develop Branches

```bash
# In CI Pipeline
npm run test -- --coverage
npm run test:coverage
```

---

## 📚 Best Practices in Tests

1. **Descriptive Names**
   ```javascript
   it('should add member when button clicked', async () => {
     // ✅ Clear intent
   });
   ```

2. **Arrange-Act-Assert**
   ```javascript
   // Arrange
   const wrapper = mount(Component, {...});
   
   // Act
   await wrapper.find('.btn').trigger('click');
   
   // Assert
   expect(wrapper.emitted('event')).toBeTruthy();
   ```

3. **Isolate Tests**
   ```javascript
   beforeEach(() => {
     vi.clearAllMocks();
   });
   ```

4. **Test User Behavior**
   ```javascript
   // Not testing implementation details
   // Testing what users do: select, click, see results
   ```

---

## 🐛 Debugging Tests

### Mit Console-Logs
```javascript
it('should debug component', () => {
  const wrapper = mount(Component, {...});
  console.log(wrapper.html()); // Show rendered HTML
  console.log(wrapper.vm.someData); // Show component data
});
```

### Mit Vitest UI
```bash
npm run test:ui
# Opens the interactive dashboard in the browser
```

### Mit Browser DevTools
```javascript
import { flushPromises } from '@vue/test-utils';

// Wait for all promises
await flushPromises();
```

---

## 📋 Checkliste für neue Tests

- [ ] Component/Function imported
- [ ] Mocks setup in beforeEach
- [ ] Component mounted with props
- [ ] User actions simulated (click, setValue, etc.)
- [ ] API calls verified
- [ ] Events emitted checked
- [ ] Error cases tested
- [ ] Loading states verified
- [ ] Success messages checked
- [ ] Test name is descriptive

---

## 🚨 Common Issues

### Issue: "Cannot find module"
```javascript
// ✅ Use aliases from vite.config.js
import Component from '@/components/tasks/Component.vue';

// ❌ Avoid relative paths
import Component from '../../../components/tasks/Component.vue';
```

### Issue: "Timeout waiting for element"
```javascript
// ✅ Use proper waits
await wrapper.vm.$nextTick();
await new Promise(resolve => setTimeout(resolve, 100));

// ❌ Don't just use setTimeout alone
```

### Issue: "Mock not working"
```javascript
// ✅ Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## 📞 Support

Für Fragen zu Tests:
1. Schau die Comments in den Test-Dateien
2. Siehe Vitest Dokumentation: https://vitest.dev/
3. Vue Test Utils: https://test-utils.vuejs.org/

---

**Letztes Update:** 29. März 2026
**Test Suite Version:** 1.0
**Framework:** Vitest 4.0.17 + Vue Test Utils
