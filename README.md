# EffSync: webbasiertes Taskmanagementsystem zur effizienten Organisation und Zusammenarbeit in Teams
![CI Status](https://github.com/kiDra94/diplom-arbeit/actions/workflows/ci.yml/badge.svg?branch=dev)

Software, die Einzelpersonen und Teams hilft, Aufgaben zu planen, zu organisieren, zu delegieren, zu verfolgen und abzuschließen, um Projekte und Arbeitsabläufe effizienter zu gestalten.


### TODOs

- ABA Portal ausfüllen

### Terminisierung für Tasks beherrscht:
- Eintragen
- Verwalten
- Teilen
- Deadline/Statusabfrage
	- Ampelsystem

### Features:
- Kalenderansicht für das ganze Jahr/Woche (Ereny), Monat/Tag (Drazen)
- Personalisierung der Oberfläche - User kann selber bestimmen, welche Elemente/Features er sieht (Drazen)
- Start Dashboard (siehe proto.html) (Ereny)
- Dashboard mit wichtigen Projektmetriken
	- Anzahl der Aufgaben
	- Fortschritt (entweder in % oder planned/in-progress/complete/overdue)
	- überfällige Aufgaben usw.
- Dashboard für Task Übersicht 
	- Task kreieren/löschen/update usw.
	- Subtasks erstellen
	- sortierbar nach Fälligkeitsdatum/sortierbar nach Priorität (Ampelsystem)
	- Button/Dropdown für abgelaufene Tasks Event 
- Registrierung und Login (Ereny)
- Tasks erstellen (Drazen)
- Mitarbeiter/Mitglieder zur Arbeitsgruppe hinzufügen (Drazen)
- Event nach Ablauf der Fälligkeit (Frontendimplementierung) (Ereny)
- Subtasks erstellen (Drazen)
- Event für abgelaufene Tasks (Logik) (Benachrichtigung per Email, Popup, Abgabe sperren bzw. verlängern (nur der Taskerzeuger) usw.) (Ereny)
- LIVE-CHAT mit Mitarbeitenden (private und Gruppe) (Drazen)
- globale Suche für Task, Notes, Personen (Drazen)
- in App Benachrichtigung bei Änderung, Kommentaren, Fälligkeitserinnerungen (Ereny)
- Emails bzw. Fragen/Tasks direkt an alle Mitglieder schicken oder eigene Gruppe machen, an wen Benachrichtigungen gehen sollen (Ereny)
- Profilverwaltung - Möglichkeit Benutzername, Passwort, Email zu ändern (Ereny)
- Task Templates erstellen können (Drazen)
- Beim Löschen von Task muss der User den Namen eingeben (wie bei GitHub, Typst) (Drazen)
- PDFs einbinden: (Ereny)
	- Anhängen
	- Teilen
	- Öffnen
	- Downloaden/Speichern
- Begrenzung von Dateigröße auf 25MB (Ereny)
- Task erzeugen automatisch TODOs, die nicht gelöscht werden können, bis sie nicht abgearbeitet werden (Lehrer/Vorgesetzter kann auch Task für Schüler/Studenten/Angestellte) (Ereny)
- Automatisierung der Tasks ermöglichen (im Vorhinein festlegen, wann er abgeschlossen ist) (Drazen)
- Tasks in required und optional Teile einteilen 
- Unit-Testergebnisse automatisch als Fortschritt hinterlegen (Drazen)
- Den Usern ermöglichen festzustellen, wie viele Tasks erledigt werden müssen (Bsp. Codechallenge für eine Klasse, die ersten 3, die 100% erreichen, bekommen einen Plus, der Task schließt sich automatisch, wenn diese eingereicht sind) (Ereny)
- logische Verknüpfungen von Subtasks (AND, OR, XOR) für automatisiertes "Erledigen" vom Parenttask (Drazen)
- Security für Users 2-Faktoren-Authentifizierung (Ereny)
- Restliche Security muss noch gelernt werden! (Drazen/Ereny)

### Datenbank:
- einfache Version zum Testen der Funktionalität - json.db
- komplexere Version - PostgreSQL

### Zielgruppe:
- für die einfache Version, Schüler/Studenten und Lehrer
- für die komplexere Version, firmenorientiert. Vorgesetzter kann Task/Tickets für Angestellte erzeugen. (Hauptunterschied zu einfach in der Komplexität, DB muss die "Firmenstruktur" abbilden)

### Tools:
- Vue.js - Frontend
- Python - Backend
- PostgreSQL - Datenbank
- Overleaf (LateX) - Diplomarbeit
- GitHub
- Deployen auf einen Server JA/NEIN
- Genaues Abklären von Speichern von Chatverlauf und Dateien (BLUB)
- App soll plattformunabhängig funktionieren

# Links
- [GoogleDrive](https://drive.google.com/drive/folders/1koGcU5nC9IoJOC8z_dFQ5cg5l6DJhoOW?usp=sharing)
- [Whiteboard](https://bulme-my.sharepoint.com/:wb:/g/personal/ereny_micail_ms_bulme_at/Ecvgf1ltpHxInoDluEBSUVABcsdYiQofwrcgncf9a9IdMQ?e=v6FwbE)
- [ERD](https://dbdiagram.io/d/685e55b0f413ba3508290b48)
- [overleaf](https://www.overleaf.com/read/scspjhkggcjr#4dc8a0)
## Andere Taskmanagementsysteme APP
- [Smartsheet](https://www.smartsheet.com/s/task-software?s=370&c=49&m=1200&utm_medium=affiliate&utm_source=dpm&utm_campaign=dg-cpc-task-management-software)
- [Quickbase](https://www.quickbase.com/solutions/project-management-software?utm_source=MVF&utm_medium=Affiliate-Marketing&utm_campaign=ualeeZI3SGljic8QKuHL&aclid=ualeeZI3SGljic8QKuHL&apid=OVFBUw&asid=NO_SESSION_COOKIE&aref=https%3A%2F%2Fappwiki.nl&atemp=default)
- [Jira](https://www.atlassian.com/de/software/jira)
## Youtube Tutorials
- [Vue3+Bootstrap3](https://www.youtube.com/watch?v=oZ9zlS5V5WU)
- [Vue3](https://www.youtube.com/playlist?list=PLrWwW3q8kJD51lY2vTZ_Ii3PfX7W4PF_m)
