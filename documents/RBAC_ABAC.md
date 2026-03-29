# Zugriffskontrollmodelle: RBAC und ABAC in der Mitgliederverwaltung

In der modernen Softwareentwicklung ist die Steuerung von Zugriffsrechten (Authorization) ein kritischer Sicherheitsaspekt. In diesem Projekt wurde ein hybrider Ansatz gewählt, der die rollenbasierte Zugriffskontrolle (RBAC) mit Elementen der attributbasierten Zugriffskontrolle (ABAC) kombiniert.

## 1. Role-Based Access Control (RBAC)

### Was ist das?
RBAC ist ein Modell, bei dem Berechtigungen nicht direkt an einzelne Benutzer, sondern an Rollen vergeben werden. Benutzer erhalten Rechte indirekt, indem sie einer oder mehreren Rollen zugewiesen werden.

### Vor- und Nachteile

**Vorteile:**
* **Einfache Verwaltung:** Rechte für hunderte Nutzer können durch die Anpassung einer einzigen Rolle geändert werden.
* **Übersichtlichkeit:** Es ist klar definiert, welche Funktion (z. B. "Lehrer") welche Befugnisse hat.
* **Geringe Fehleranfälligkeit:** Neue Nutzer müssen lediglich einer Rolle zugewiesen werden, um sofort arbeitsfähig zu sein.

**Nachteile:**
* **Starrheit:** Es ist schwierig, Ausnahmen für einzelne Nutzer innerhalb einer Rolle zu machen, ohne eine neue Rolle zu erstellen ("Role Explosion").

### Implementierung im Projekt
Im vorliegenden System ist RBAC die Basis für die grobe Rechteverteilung. Es wurden vier Standardrollen definiert: Superuser, Admin, Teacher und Student. Jede dieser Rollen verknüpft eine Gruppe von Berechtigungen (z. B. `view_dashboard`, `manage_users`), die über die Tabelle `roles_permissions` gesteuert werden.

---

## 2. Attribute-Based Access Control (ABAC)

### Was ist das?
ABAC ist ein feingranulares Modell, bei dem der Zugriff basierend auf Attributen (Eigenschaften) gewährt wird. Diese Attribute können den Benutzer (z. B. Alter), die Ressource (z. B. Ersteller einer Datei) oder die Umgebung (z. B. Uhrzeit) betreffen.

### Vor- und Nachteile

**Vorteile:**
* **Hohe Flexibilität:** Erlaubt sehr spezifische Bedingungen (z. B. "Darf nur zwischen 8:00 und 16:00 Uhr zugreifen").
* **Kontextsensitivität:** Erkennt Beziehungen zwischen Nutzer und Daten (z. B. "Darf nur eigene Tasks bearbeiten").

**Nachteile:**
* **Komplexität:** Die Regelsätze können bei großen Systemen sehr schwer zu durchschauen und zu testen sein.

### Implementierung im Projekt
ABAC wird hier genutzt, um die Starrheit von RBAC zu durchbrechen:

* **Zeitliche Validierung:** Berechtigungen können mit den Attributen `valid_from` und `valid_to` versehen werden. So kann ein Nutzer ein Recht besitzen, das aber erst ab einem bestimmten Datum aktiv wird oder abläuft.
* **Ressourcen-Beziehung (Task-Members):** Der Zugriff auf eine spezifische Aufgabe wird nicht nur über die globale Rolle "Teacher" bestimmt, sondern über das Attribut der Mitgliedschaft (Ist der Nutzer Ersteller oder explizites Mitglied der Task?).
* **Bitwise Flags:** Durch die Flags (`READ`, `WRITE`, `EXECUTE`) wird die Art des Zugriffs pro Permission fein gesteuert.

---

## 3. Begründung des hybriden Ansatzes

### Warum nutze ich das hier?
Die Entscheidung für eine Kombination aus RBAC und ABAC in dieser Arbeit hat drei wesentliche Gründe:

1. **Sicherheit und Skalierbarkeit:** Durch RBAC bleibt das System für die Masse der Nutzer (Studenten/Lehrer) einfach wartbar. Ein Admin muss nicht jedes Recht einzeln vergeben.
2. **Praxisnahe Flexibilität:** In einer Schulumgebung gibt es oft temporäre Anforderungen (z. B. ein Lehrer benötigt nur für die Dauer eines Projekts Admin-Rechte). Durch die ABAC-Zeitlimits (`valid_to`) wird verhindert, dass veraltete Rechte im System verbleiben.
3. **Datenschutz auf Task-Ebene:** In der Aufgabenverwaltung reicht eine globale Rolle nicht aus. ABAC stellt sicher, dass Nutzer nur die Tasks sehen und bearbeiten können, für die sie tatsächlich verantwortlich oder als Mitglied eingetragen sind.

**Zusammenfassend bietet der hybride Ansatz die administrative Effizienz von Rollen bei gleichzeitiger präziser Kontrolle über individuelle Ausnahmen und zeitliche Begrenzungen.**