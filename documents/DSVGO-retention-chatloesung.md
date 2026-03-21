## 1. Strategie zur Speicherung des Chatverlaufs

Das relationale Datenmodell von EffSync speichert Chatverläufe in der Entität `chat_messages`. Diese Nachrichten sind über die `room_id` an spezifische `chat_rooms` gebunden. Um die vielseitigen Anwendungsfälle des Systems für Schulen und Firmen abzubilden, können diese Chaträume optional direkt an Aufgaben (`task_id`) oder ganze Klassen (`class_id`) gekoppelt werden. Die dynamische Mitgliedschaft in diesen Räumen wird über die Zwischen-Tabelle `chat_room_users` (inklusive Beitrittszeitpunkt `joined_at`) abgebildet.

**PostgreSQL** eignet sich für diese Architektur hervorragend: Es gewährleistet durch **ACID-Transaktionen** eine konsistente Reihenfolge der Nachrichten und unterstützt effiziente relationale Abfragen (z.B. das Laden eines kompletten Chatverlaufs für einen spezifischen Task).

Auf logischer Ebene wird der Zugriff durch strikte, rollenbasierte Kontrollen geschützt. Nur aktuelle Mitglieder eines `chat_room` dürfen Nachrichten lesen und schreiben. Dies verhindert unbefugten Zugriff durch externe Systemnutzer auf sensible Projekt- oder Klassenchats und wird den hohen Sicherheitsanforderungen der Zielgruppen gerecht. Das Löschen eines `chat_rooms` kann nur durch dessen Ersteller (`created_by`) oder einen Benutzer erfolgen, der über die entsprechenden Berechtigungen (z. B. `Permission to delete chat_room`) verfügt.

## 2. Retention-Policy (Löschfristen und DSGVO-konformes Löschkonzept)

Für das Taskmanagement-System EffSync wird eine differenzierte, kontextbasierte Retention-Policy implementiert, die den Grundsatz der Speicherbegrenzung ([Art. 5 Abs. 1 lit. e DSGVO](https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:32016R0679#d1e1800-1-1)) mit der notwendigen Dokumentation von Arbeitsprozessen in Einklang bringt. Dabei wird strikt zwischen informellen Kommunikationskanälen und aufgabenbezogenen Projekt-Chats unterschieden:

### Allgemeine und inaktive Chats (Löschung nach sechs Monaten)
Für Chats ohne direkte Aufgabenbindung (z. B. allgemeine Räume oder direkte private Nachrichten) gilt eine Löschfrist von sechs Monaten ab der letzten Aktivität (letzte Nachricht im `chat_rooms`).

- **Begründung**: Sobald ein informeller Chat über ein halbes Jahr inaktiv ist, ist der ursprüngliche Zweck der Kommunikation entfallen. Die Frist von sechs Monaten deckt sich zudem mit gängigen juristischen Rahmenbedingungen ([Gleichbehandlungsgesetz (GlBG)](https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20003395)), wonach es keinen legitimen Grund mehr gibt, diese Daten aufzubewahren.

- **Rechtsgrundlage:** [Art. 5 Abs. 1 lit. e DSGVO (Speicherbegrenzung)](https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:32016R0679#d1e1800-1-1).

### Aufgabenbezogene Chats (Löschung vierundzwanzig Monate nach Projektabschluss)
Für Chaträume, die explizit an eine Aufgabe (`task_id`) gebunden sind, greift die Löschfrist erst nach zwei Jahren, nachdem der zugehörige Task den Status **`COMPLETED`** erreicht hat. Der Startzeitpunkt ("Trigger-Event") für die Frist ist hierbei zwingend der Abschluss der Aufgabe, nicht das Erstellungsdatum der einzelnen Nachricht.

- **Begründung**: Bei der Erledigung von Aufgaben dient der Chat der essenziellen Dokumentation des Arbeitsergebnisses. Ein Puffer von vierundzwanzig Monaten nach Projektabschluss ist notwendig, um bei Rückfragen, Gewährleistungsthemen oder internen Revisionen den Projektverlauf und getroffene Entscheidungen lückenlos nachvollziehen zu können.

- **Rechtsgrundlage:** Berechtigtes Interesse des Unternehmens oder der Bildungseinrichtung an der Qualitätssicherung und Nachvollziehbarkeit von Arbeitsprozessen gem. [Art. 6 Abs. 1 lit. f DSGVO](https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:32016R0679#d1e1888-1-1).

### Technische Umsetzung und Architekturvorteil
Die meisten marktüblichen Standard-Tools (wie [Slack](https://slack.com/intl/de-de/help/articles/203457187-Datenaufbewahrung-in-Slack-anpassen) oder [MS Teams](https://learn.microsoft.com/de-de/microsoftteams/retention-policies)) bieten oftmals nur pauschale Löschintervalle pro Kanal (z. B. "Lösche alle Nachrichten älter als 180 Tage"), was bei langlaufenden Projekten zu einem unerwünschten Verlust der Historie führt. EffSync löst dieses Problem durch seine tiefe Integration nativ: Ein automatisierter Hintergrunddienst (Cronjob im Backend) prüft periodisch den Status der Entität `tasks`. Sobald ein Task als abgeschlossen markiert ist, beginnt der Timer für den verknüpften `chat_rooms`. Dies ermöglicht eine präzise, automatisierte Löschung ohne manuelle Archivierungsaufwände durch die Nutzer.

*Organisatorischer Hinweis für den Produktiveinsatz:* Für die firmenorientierte Zielgruppe von EffSync ist zwingend vorgesehen, dass diese automatisierten Fristen transparent in einer Betriebsvereinbarung oder den internen Datenschutzhinweisen verankert werden.

## 3. DSGVO-Konzept und Umgang mit Betroffenenrechten

Gemäß dem Grundsatz der Datenminimierung gem. [Art. 5 Abs. 1 lit. c DSGVO](https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:32016R0679#d1e1800-1-1) priorisiert EffSync die Speicherung absoluter Kernmetadaten. In der Entität `chat_messages` werden ausschließlich die eigentliche Nachricht (`message`), der Autor (`user_id`), die Raumzuordnung (`room_id`) sowie der Zeitstempel (`created_at`) erfasst. Auf die Protokollierung von IP-Adressen oder exakten Lese-Zeitstempeln pro Nutzer wird bewusst verzichtet, um die Privatsphäre zu schützen und Profiling auszuschließen.

Im Falle einer Account-Löschung (Recht auf Löschung bzw. „Vergessenwerden“ gem. [Art. 17 DSGVO](https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:32016R0679#d1e2606-1-1)) verfolgt EffSync den Ansatz der Anonymisierung statt des harten Löschens. Diese Architekturentscheidung ist essenziell, um die zuvor definierten Aufbewahrungsfristen für aufgabenbezogene Chats zu unterstützen: Würden Nachrichten eines ausscheidenden Nutzers restlos aus der Datenbank entfernt, entstünden in geteilten Projekt-Chats inhaltliche Lücken. Dies würde den Lesefluss zerstören und die wichtige Nachvollziehbarkeit von Arbeitsprozessen für rechtliche Zwecke (z. B. Gewährleistungsdokumentation) zunichtemachen. 

Stattdessen werden die Nachrichten vom realen Nutzer entkoppelt. Da die `user_id` in der aktuellen Datenbankarchitektur ein Pflichtfeld ist, um referenzielle Integrität zu gewährleisten, werden die Nachrichten systemintern einem designierten „**Ghost-User**“-Account (z.B. Ghost-User mit `user_id 0`) zugewiesen. Technisch ist hierbei zu beachten, dass PostgreSQL bei automatisch inkrementierenden Primärschlüsseln (`autoincrement`) standardmäßig bei 1 zu zählen beginnt. Um referenzielle Integritätsfehler zu vermeiden, muss dieser designierte System-Nutzer mit der **``user_id 0``** daher bei der Initialisierung der Datenbank (z. B. via Seed-Script) einmalig manuell angelegt werden. Dieser Kompromiss erhält die zwingend benötigte Kollaborationshistorie für das verbleibende Team und das Unternehmen, während die personenbezogenen Daten des gelöschten Nutzers unwiderruflich und DSGVO-konform anonymisiert werden.