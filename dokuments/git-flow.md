# WorkSync Git-Flow Strategie

Ich empfehle eine **adaptierte Git-Flow-Strategie** mit klaren, hierarchischen Benennungskonventionen, die sich an Ihren Projektphasen und Themenstellungen orientieren.

---

## 1. Haupt-Branches (Main Branches)

Diese Branches bilden die Basis und bleiben dauerhaft bestehen.

| Branch Name | Zweck |
| :--- | :--- |
| **`main`** | Enthält immer den **stabilen, abgenommenen Code** (entspricht dem aktuellen Stand nach einer Phase oder dem finalen Abgabetstand). Merges erfolgen nur von `release`-Branches. |
| **`develop`** | Der Hauptentwicklungs-Branch. Er repräsentiert den **aktuellen Stand der integrierten Arbeit** und ist die Basis für alle neuen Features. Alle Feature-Branches werden hier hinein gemergt. |

---

## 2. Feature-/Task-Branches (Funktionsentwicklung)

Dies ist der wichtigste Branch-Typ für Ihre tägliche Arbeit. Jeder Entwickler erstellt einen neuen Branch von `develop`, sobald er mit einer neuen Aufgabe beginnt.

### Naming Convention:

**`feature/<thema>/<kurzbeschreibung>`**

| Teil | Beispiel | Erklärung |
| :--- | :--- | :--- |
| **`feature/`** | `feature/` | Standard-Präfix für neue Funktionen. |
| **`<thema>`** | `frontend` oder `backend` oder `user` | Bezieht sich auf Ihre Haupt-Themenstellung (z.B. Frontendentwicklung, Backendentwicklung, Userverwaltung). |
| **`<kurzbeschreibung>`**| `calendar-view` oder `2fa-implementation`| Eine kurze, prägnante Beschreibung der spezifischen Aufgabe (verwenden Sie hier am besten englische Begriffe für Konsistenz). |

### Beispiele für Branch-Namen:

| Themengebiet | Name (Ereny) | Name (Drazen) |
| :--- | :--- | :--- |
| **Userverwaltung** | `feature/user/login-registration` | (entfällt) |
| **Frontendentwicklung** | `feature/frontend/start-dashboard` | `feature/frontend/tasks-create` |
| **Backendentwicklung** | `feature/backend/event-logic-mail` | `feature/backend/live-chat-logic` |
| **Dokument Management** | `feature/document/pdf-handling` | (entfällt) |
| **Sicherheit** | `feature/security/two-factor-auth` | (entfällt) |

---

## 3. Spezial-Branches

Diese Branches werden nur bei Bedarf verwendet.

| Branch Name | Zweck | Naming Convention |
| :--- | :--- | :--- |
| **`bugfix/`** | Für schnelle Fehlerbehebungen auf dem `develop`-Branch. | **`bugfix/<fehler-beschreibung>`** (z.B. `bugfix/task-sorting-issue`) |
| **`release/`** | Vorbereitung einer **offiziellen Abgabe oder Präsentation**. Hier finden letzte Tests und Dokumentationen statt. Wird von `develop` erstellt und in `main` und `develop` zurückgemergt. | **`release/phase-4-abnahme`** oder **`release/v1.0-final`** |
| **`hotfix/`** | Für **kritische Fehlerbehebungen** direkt auf dem `main`-Branch, die sofort ausgerollt werden müssen. | **`hotfix/<kritischer-fehler>`** (z.B. `hotfix/login-bug-prod`) |

---

## 💡 Best Practices für die Umsetzung

1.  **Regelmäßiges Mergen:** Jede Person sollte ihren `feature`-Branch täglich mit dem aktuellen `develop`-Branch synchronisieren (`git pull origin develop`), um Merge-Konflikte so klein wie möglich zu halten.
2.  **Kleine Commits:** Machen Sie kleine, aussagekräftige Commits. Der Commit-Text sollte erklären, *was* und *warum* Sie es geändert haben.
3.  **Merge Requests (Pull Requests):** Verwenden Sie immer einen Merge Request (MR) oder Pull Request (PR), um einen `feature`-Branch in `develop` zu mergen. Der andere Entwickler sollte den Code vor dem Merge kurz prüfen.
