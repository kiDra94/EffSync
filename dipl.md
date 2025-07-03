
# SYP

## Wasserfallmodell – Projektmanagement

- Entwurf → Pflichtenheft (entspricht einem Vertrag)

Bei Softwareprojekten kann es zu **Überschneidungen oder Gegensätzen** kommen. In solchen Fällen bin ich verpflichtet, **Unwissende darauf hinzuweisen**, dass **Widersprüche existieren** oder **Überschneidungen vorliegen**.

---

## Inhaltsverzeichnis für die Diplomarbeit

1. **Anforderungsanalyse**
<<<<<<< HEAD
- Funktionale Anforderungen (z. B. Buttons mit bestimmten Funktionen)
- Nicht-funktionale Anforderungen (z. B. intuitive Bedienung)
- Machbarkeitsstudie
- Warum wollen wir diese Software?
- Was unterscheidet sie von anderen?
→ Unterscheidungsmerkmale → Pflichtenheft
=======
   - Funktionale Anforderungen (z. B. Buttons mit bestimmten Funktionen)
   - Nicht-funktionale Anforderungen (z. B. intuitive Bedienung)
   - Machbarkeitsstudie
   - Barrierefreiheit 
   - Warum wollen wir diese Software?
   - Was unterscheidet sie von anderen?
     → Unterscheidungsmerkmale → Pflichtenheft
>>>>>>> c6594d7e85fb5e326c6eb4ab2d6a474a67518e33

2. **Entwurfserstellung (ERD) Frontend Layout**
- https://dbdiagram.io/d/685e55b0f413ba3508290b48
- Task Frontend exampels
  - https://dribbble.com/tags/task-dashboard
  - https://www.freepik.com/premium-vector/eps-task-management-dashboard-website-templtae-full-editable-vector-light-mode_60243597.htm

3. **Entwurfsimplementierung (CreateTable)**

4. **Testdurchführung (Think-Aloud-Test)**

5. **Inbetriebnahme / Ergebnisse**
   - Wurden die Anforderungen erfüllt?
   - Begründung und Argumentation → ISO-Standards für Software-Ergonomie (DIN EN ISO 9241)

---

## Argumentation

### Alleinstellungsmerkmal

- Kombination von **Chat** und **Task-Erledigung** mit `UND` / `ODER`-Logik
- Chat in **Echtzeit** durch Einsatz von **WebSockets**

---

## Gunnis Erfahrungen

Schüler tendieren dazu, Seiten in der Arbeit wie folgt zu füllen:

- **Theorie**: Normalformen beschreiben
- **Tabellen**: z. B. Tasks → Vererbung erklären und Begründung, warum diese Struktur gewählt wurde  
  *(immer mit Bezug zur eigenen Arbeit)*
- **Notes**: ebenfalls Erklärung von Vererbungsentscheidungen und deren Auswirkungen

---

## Vererbung in relationalen Datenbanken

**Hinweis:** In relationalen Datenbanken wird Vererbung normalerweise *nicht verwendet* – es gibt jedoch drei gängige Ansätze:

### 1. Eine Tabelle pro Klasse

- Für jede Klasse (inkl. Oberklasse und Unterklassen) wird eine eigene Tabelle erstellt.
- Unterklassen-Tabellen enthalten geerbte und eigene Attribute.
- Fremdschlüssel bilden die Beziehungen ab.
- **Vorteil:** klare Trennung  
- **Nachteil:** komplexe Abfragen

### 2. Eine Tabelle für die gesamte Hierarchie (breite Tabelle)

- Eine Tabelle enthält alle Attribute aller Klassen.
- Nicht benötigte Felder werden mit NULL-Werten gefüllt.
- **Vorteil:** effiziente Abfragen  
- **Nachteil:** viele NULL-Werte, erschwerte Datenintegrität

### 3. Eine Tabelle pro konkreter Klasse

- Nur konkrete Klassen (ohne Unterklassen) erhalten eine eigene Tabelle.
- Attribute der Oberklassen sind integriert.
- Kombination aus den Vorteilen der anderen beiden Methoden.
- **Fazit:** Oft ein guter Kompromiss

> Die Wahl des Ansatzes hängt von den Anforderungen und der Struktur der Anwendung ab. Die Vor- und Nachteile sollten sorgfältig abgewogen werden.

---

## Umsetzung der eigenen Arbeit

- **Relationale Datenbank:**
  - Welcher Vererbungsansatz wurde gewählt und warum?
  - Welche Normalformen wurden verwendet und warum?

- **Zwischentabelle:** nicht notwendig

- **Beispiele:** immer mit **Projektbezug**

- **Abbildungen erstellen zu:**
  - Benutzerverwaltung
  - Sections mit Beschreibung



# Berechtigungen (Permissions mittels Regelengine)

- **Taskcreator**
- **Sysadmin**


# [Workflows](https://workflowengine.io/documentation/workflowengine/)
- **Abhängige Tasks** wie zu handeln
- **Taskzuweisungen** mit `UND` / `ODER`  
  → Ein Task gilt als erledigt, wenn **eine oder mehrere Bedingungen erfüllt** sind.

---

# Dashboard

- Wann bekomme ich einen Task?
  - Nach Zuweisung?
  - Oder sobald ich eingetragen bin (Arbeitsphasen-Abhängigkeit->sobald xy fertig ist)
- Was passiert mit **WH-Tasks**---> Templates 
- (Work in Progress)?
- [Issue Tracking suchen ](https://de.wikipedia.org/wiki/Issue-Tracking-System)
- Gibt es ein vorhandenes **Issue-Tracking-System**?
- **Abgrenzungen** finden für SW danach Alleinstellungsmerkmale?

---

# Features

- Ziel: möglichst viele **kleine, übersichtliche Features**

---

# Funktionslogik

- Wann gilt ein **Task als erledigt**?
  - Bei Abhängigkeit: Gilt als abgeschlossen, wenn die verknüpften Tasks fertig sind?
- Muss der Task **freigegeben oder abgesegnet** werden?
- Gibt es **Subtasks**?

---

# Projektlogik

- Der Ersteller kann bei einem **Projekt** auswählen, ob ein Task bei Erfüllung mit `UND` / `ODER`-Verknüpfung gewertet wird.
- `proj_id` soll bei **Subtasks** ergänzt werden.

---

# Datenmodell (MongoDB)

- **MongoDB** hat von Haus aus **hierarchische Eigenschaften**:
  - z. B. ein `supervisor`-Feld → referenziert übergeordneten Supervisor

---

# Tasks - Users

- **tasks - users**-Verknüpfung entfernen?
  - → **Warum?** Um **Konsistenz** zu wahren?

