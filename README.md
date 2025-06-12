# Brainstorming Funktionsbeschreibung:

## Managmentsystem das alle CRUD-operations becherscht und mit verschiedenen Rollen umgehen kann (gruppen für Task, Master-Slave usw.)

### Terminisierung für Tasks beherscht:
- Eintragen
- Verwalten
- Teilen
- Deadline/Statusabfrage
	- Ampelsystem

### Features:
- Kalenderansicht für das ganze Jahr, Monat, Woche, Tag
- Task erzeugen automatisch TODOs die nicht gelöscht werden können bis sie nicht abgearbeitet werden (Leherer/Vorgesetzeter kann auch Task für Schüler/Studenten/Angestellter)
- Personalisierung der Oberfläche ?
- Projecte erstellen, und Mitarbeiter/Mitglieder hinzufügen
- CHAT mit Mitarbeitenden starten
- emails bzw. fragen/tasks direkt an alle mitglieder schicken, oder eigene gruppe machen an wenn Benachrichtigungen gehen sollen

### PDFs einbinden:
- Anhängen
- Teilen
- Öffnen

### Datenbank:
- einfache Version - json.db
- komplexere Version - sqlite3 oder eine andere (postgres?)

### Zielgruppe:
- für die einfache Version, Schüler/Studenten und Lehrer
- für die komplexere Version, Firmenorienteiert. Vorgesetzter kann task/tickets für Angestellte erzeugen. (Hauptunteschied zu einfach in der Komplexität)

### Tools:
- Vue.js
- Datenbank auf einen extra server ?

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
