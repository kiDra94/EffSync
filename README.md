# Brainstorming Funktionsbeschreibung:

## Managmentsystem das alle CRUD-operations beherscht und mit verschiedenen Rollen umgehen kann (gruppen für Task, Master-Slave usw.)

### Terminisierung für Tasks beherscht:
- Eintragen
- Verwalten
- Teilen
- Deadline/Statusabfrage
	- Ampelsystem

### Features:
- Kalenderansicht für das ganze Jahr, Monat, Woche, Tag
- Personalisierung der Oberfläche
- Dashboard mit wichtigen Projektmetriken (Anzahl der Aufgaben, Fortschritt, überfällige Aufgaben).
- Dashboard für Task übersicht (sortierbar nach Fälligkeitsdatum, Priorität usw.)
- Registrierung und Login 
- Tasks erstellen, und Mitarbeiter/Mitglieder hinzufügen
- LIVE-CHAT mit Mitarbeitenden starten
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

### Datenbank:
- einfache Version - json.db
- komplexere Version - sqlite3 oder eine andere (postgres?), eventuell MongoDB (wegen hierarchischer Struktur der Tasks und Teachers)

### Zielgruppe:
- für die einfache Version, Schüler/Studenten und Lehrer
- für die komplexere Version, Firmenorienteiert. Vorgesetzter kann task/tickets für Angestellte erzeugen. (Hauptunteschied zu einfach in der Komplexität, DB muss die "Firemstruktur" abbilden)

### Tools:
- Vue.js
- Datenbank auf einen extra server ?

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
