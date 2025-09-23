# Brainstorming Funktionsbeschreibung:

## Managmentsystem das alle CRUD-operations beherscht und mit verschiedenen Rollen umgehen kann (gruppen für Task, Master-Slave usw.)

### Terminisierung für Tasks beherscht:
- Eintragen
- Verwalten
- Teilen
- Deadline/Statusabfrage
	- Ampelsystem

### Features:
- Kalenderansicht für das ganze Jahr/Woche (Ereny), Woche/Tag(Drazen)
- Personalisierung der Oberfläche - User kann selber bestimmen welche Eelemente/Features er sieht (Drazen)
- Start Dashboard (sihe proto.html)
- Dashboard mit wichtigen Projektmetriken
	- Anzahl der Aufgaben
	- Fortschritt (entweder in % oder planed/in-progress/complete/overdue)
	- überfällige Aufgaben
- Dashboard für Task übersicht 
	- Task kreieren/löschen/update usw.
	- Subtasks erstellen
	- sortierbar nach Fälligkeitsdatum/sortierbar nach Priorität (Ampelsystem)
	- Button/Dropdown für Abgelaufene Tasks Event 
- Registrierung und Login 
- Tasks erstellen
- Mitarbeiter/Mitglieder hinzufügen
- Event nach ablauf der Fälligkeit
- Subtasks erstellen
- Event für abgelaufene Tasks (benachritigung per Email, Popup, Abgabe sperren bzw. Verlängern (nur der Taskerzeuger) usw.)
- LIVE-CHAT mit Mitarbeitendern (private und groupe)
- globale Suche für Task, Notes, Personen
- in app Benachrichtigung bei Änderung, Kommentaren, Fälligkeitserinnerungen
- emails bzw. fragen/tasks direkt an alle mitglieder schicken, oder eigene gruppe machen an wenn Benachrichtigungen gehen sollen
- Profilverwaltung - möglichkeit Benutzername, Passwort, Email zu ändern
- Tasks Templates erstellen können
- Beim löschen von Task muss der User den Namen eingeben (wie bei GitHub, Typst)
- PDFs einbinden:
	- Anhängen
	- Teilen
	- Öffnen
- Task erzeugen automatisch TODOs die nicht gelöscht werden können bis sie nicht abgearbeitet werden (Leherer/Vorgesetzeter kann auch Task für Schüler/Studenten/Angestellter)
- Email Benachrichtigung bei Änderung, Kommentaren, Fälligkeitserinnerungen
- Automatisierung der Tasks ermöglichen (in vorhinein festlegen wann er abgeschlossen ist)
- Tasks in required und optional Teilein
- Unitestsergebnisse automatisch als Fortschritt hinterlegen
- Den User ermöglichen festzustellen wie viel Task erledigt werden müssen (Bsp. Codechalleng für eine Klasse die ersten 3 die 100% erreichen bekommen einen Plus, der Task schließt sich automatisch wenn diese eingereicht sind)
- logische Verknüpfungen von Subtasks (AND, OR, XOR) für automatisiertes "Erledigen" vom Parenttask

### Datenbank:
- einfache Version zum Testen der Funktionalität - json.db
- komplexere Version - PostgreSQL

### Zielgruppe:
- für die einfache Version, Schüler/Studenten und Lehrer
- für die komplexere Version, Firmenorienteiert. Vorgesetzter kann task/tickets für Angestellte erzeugen. (Hauptunteschied zu einfach in der Komplexität, DB muss die "Firemstruktur" abbilden)

### Tools:
- Vue.js - Frontend
- python - Backend
- PostgreSQL - Datenbank
- Overleaf (LateX) - Diplomarbeit
- Deployen auf einen Server JA/NEIN
- Genaues Abklären von Speichern von Chatverlauf und Dateien (BLUB)

### Links
- https://drive.google.com/drive/folders/1koGcU5nC9IoJOC8z_dFQ5cg5l6DJhoOW?usp=sharing
- https://bulme-my.sharepoint.com/:wb:/g/personal/ereny_micail_ms_bulme_at/Ecvgf1ltpHxInoDluEBSUVABcsdYiQofwrcgncf9a9IdMQ?e=v6FwbE
- https://dbdiagram.io/d/685e55b0f413ba3508290b48

# Fragen an GU:
1. In gitHub mit 2 branches und einer main arbeiten, oder soll einer in der main arbeiten und die zweite Person Fork, bzw. was die beste Option wäre
2. Rahmen was die App genau machen kann. 
	- Der Umfang
	- Zielgruppe
	- Features
	- bzw. generelle Anforderungen

3. Tools welche wir verwenden sollen, müssen, wollen
4. Diplomarbeit (das schrifftliche), jeder nur einene/seinen Teil machen
5. Über den Sommerferien, eventuell schon vorarbeiten, falls ja tipps was zum anschauen wäre bzw. was zum anlerenen gut ist
6. Die PDFs die angehängt werden, sollen gespeichert werden. In der praxis ist es ja Serverseitig, wie wir das simulieren sollen. Einen Ordnere auf dem Laptop ??
7. Besteht die möglichkeit das wir es auf einen Server laufenlassen können, bwz, ob es für die Diplomarbeit auf einen echten Server laufen muss.
8. Wie mach man die Rechtewerwaltung in der DB, wer auf was zugriff hat, wer was weiterleiten und erzeugen kann usw. (Premissions)
