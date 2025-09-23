# Brainstorming Funktionsbeschreibung:

## Managmentsystem das alle CRUD-operations beherscht und mit verschiedenen Rollen umgehen kann (gruppen für Task, Master-Slave usw.)

### Terminisierung für Tasks beherscht:
- Eintragen
- Verwalten
- Teilen
- Deadline/Statusabfrage
	- Ampelsystem

### Features:
- Kalenderansicht für das ganze Jahr/Woche (Ereny), Monat/Tag(Drazen)
- Personalisierung der Oberfläche - User kann selber bestimmen welche Eelemente/Features er sieht (Drazen)
- Start Dashboard (sihe proto.html) (Ereny)
- Dashboard mit wichtigen Projektmetriken
	- Anzahl der Aufgaben
	- Fortschritt (entweder in % oder planed/in-progress/complete/overdue)
	- überfällige Aufgaben usw.
- Dashboard für Task übersicht 
	- Task kreieren/löschen/update usw.
	- Subtasks erstellen
	- sortierbar nach Fälligkeitsdatum/sortierbar nach Priorität (Ampelsystem)
	- Button/Dropdown für Abgelaufene Tasks Event 
- Registrierung und Login (Ereny)
- Tasks erstellen (Drazen)
- Mitarbeiter/Mitglieder zur Arbeitsgruppe hinzufügen (Drazen)
- Event nach ablauf der Fälligkeit (Frontendimplementierung) (Ereny)
- Subtasks erstellen (Drazen)
- Event für abgelaufene Tasks (Logik) (benachritigung per Email, Popup, Abgabe sperren bzw. Verlängern (nur der Taskerzeuger) usw.) (Ereny)
- LIVE-CHAT mit Mitarbeitendern (private und groupe) (Drazen)
- globale Suche für Task, Notes, Personen (Drazen)
- in app Benachrichtigung bei Änderung, Kommentaren, Fälligkeitserinnerungen (Ereny)
- emails bzw. fragen/tasks direkt an alle mitglieder schicken, oder eigene gruppe machen an wenn Benachrichtigungen gehen sollen (Ereny)
- Profilverwaltung - möglichkeit Benutzername, Passwort, Email zu ändern (Ereny)
- Tasks Templates erstellen können (Drazen)
- Beim löschen von Task muss der User den Namen eingeben (wie bei GitHub, Typst) (Drazen)
- PDFs einbinden: (Ereny)
	- Anhängen
	- Teilen
	- Öffnen
	- Downloaden/Speichern
- Begrenzung von Dateigröße auf 25MB (Ereny)
- Task erzeugen automatisch TODOs die nicht gelöscht werden können bis sie nicht abgearbeitet werden (Leherer/Vorgesetzeter kann auch Task für Schüler/Studenten/Angestellter) (Ereny)
- Automatisierung der Tasks ermöglichen (in vorhinein festlegen wann er abgeschlossen ist) (Drazen)
- Tasks in required und optional Teilein 
- Unitestsergebnisse automatisch als Fortschritt hinterlegen (Drazen)
- Den User ermöglichen festzustellen wie viel Task erledigt werden müssen (Bsp. Codechalleng für eine Klasse die ersten 3 die 100% erreichen bekommen einen Plus, der Task schließt sich automatisch wenn diese eingereicht sind) (Ereny)
- logische Verknüpfungen von Subtasks (AND, OR, XOR) für automatisiertes "Erledigen" vom Parenttask (Drazen)
- Security für Users 2 Faktorenautentifizierung (Ereny)
- Restliche Security muss noch gelernt werden! (Drazen/Ereny)

### Datenbank:
- einfache Version zum Testen der Funktionalität - json.db
- komplexere Version - PostgreSQL

### Zielgruppe:
- für die einfache Version, Schüler/Studenten und Lehrer
- für die komplexere Version, Firmenorienteiert. Vorgesetzter kann task/tickets für Angestellte erzeugen. (Hauptunteschied zu einfach in der Komplexität, DB muss die "Firemstruktur" abbilden)

### Tools:
- Vue.js - Frontend
- Bootstrap5 - Frontend
- python - Backend
- PostgreSQL - Datenbank
- Overleaf (LateX) - Diplomarbeit
- Github
- Deployen auf einen Server JA/NEIN
- Genaues Abklären von Speichern von Chatverlauf und Dateien (BLUB)
- App soll Platformunabhängig funktionieren

# Fragen an GU:
1. Feedback über Tools
2. Besteht die möglichkeit das wir es auf einen Server laufenlassen können, bwz, ob es für die Diplomarbeit auf einen echten Server laufen muss.
3. Rechteverwaltung und Security
4. Wie lange soll ein Task nach dem Abschluss noch Leben, was mach da Zeitlich sin (1 Jahr, 2 Jahre??)

# Links
- [GoogleDrive](https://drive.google.com/drive/folders/1koGcU5nC9IoJOC8z_dFQ5cg5l6DJhoOW?usp=sharing)
- [Whiteboard](https://bulme-my.sharepoint.com/:wb:/g/personal/ereny_micail_ms_bulme_at/Ecvgf1ltpHxInoDluEBSUVABcsdYiQofwrcgncf9a9IdMQ?e=v6FwbE)
- [ERD](https://dbdiagram.io/d/685e55b0f413ba3508290b48)
## Andere Taskmanagmentsysteme APP
- [Smartsheet](https://www.smartsheet.com/s/task-software?s=370&c=49&m=1200&utm_medium=affiliate&utm_source=dpm&utm_campaign=dg-cpc-task-management-software)
- [Quickbase](https://www.quickbase.com/solutions/project-management-software?utm_source=MVF&utm_medium=Affiliate-Marketing&utm_campaign=ualeeZI3SGljic8QKuHL&aclid=ualeeZI3SGljic8QKuHL&apid=OVFBUw&asid=NO_SESSION_COOKIE&aref=https%3A%2F%2Fappwiki.nl&atemp=default)
- [Jira](https://www.atlassian.com/de/software/jira)
## Youtube Tutorials
- [Vue3+Bootstrap3](https://www.youtube.com/watch?v=oZ9zlS5V5WU)
- [Vue3](https://www.youtube.com/playlist?list=PLrWwW3q8kJD51lY2vTZ_Ii3PfX7W4PF_m)
