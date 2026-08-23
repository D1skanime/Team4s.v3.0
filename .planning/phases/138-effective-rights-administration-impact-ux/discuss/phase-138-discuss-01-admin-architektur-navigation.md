# Phase 138 – GSD Discuss Context 01
## Admin-Architektur, Navigation und kanonische Bearbeitungsorte

**Projekt:** Team4s  
**Phase:** 138  
**Status:** Diskussionsentscheidungen / Input für `/gsd:plan-phase 138`  
**Wichtig:** Kein Execute-Auftrag. Claude soll diesen Kontext zusammen mit den weiteren Phase-138-Discuss-Dateien und dem aktuellen Code auswerten.

---

## 1. Grundentscheidung

Phase 138 soll nicht nur zwei isolierte bestehende Rechte-Seiten modernisieren.

Die bestehende Administration soll bereits unter einer gemeinsamen Informationsarchitektur zusammengeführt werden.

Verbindliche Hauptnavigation:

```text
Benutzer | Gruppen | Rollen | Capabilities | Claims | Änderungen
```

Die Bereiche sind unterschiedliche Perspektiven auf dasselbe Identitäts-, Gruppen-, Rollen- und Berechtigungsmodell.

---

## 2. Zentrales Navigationsprinzip

Benutzer, Gruppen, Rollen und Capabilities dürfen keine getrennten Verwaltungswelten mehr sein.

Die Oberfläche muss bidirektional navigierbar sein.

Beispiele:

```text
Benutzer → Gruppe → Rolle → Recht
Rolle → Benutzer → Gruppe
Gruppe → Benutzer → Rolle
Capability → Rolle → betroffene Benutzer
Änderung → Benutzer / Gruppe / Rolle / Capability
```

Der Administrator soll nicht die technische Datenstruktur verstehen müssen.

---

## 3. Benutzer als administrative Personenakte

Benutzer-Detailnavigation:

```text
Übersicht | Rollen & Rechte | Beiträge | Claims | Streaming | Änderungen
```

### Übersicht

Die Übersicht bleibt kompakt.

Sie zeigt:

- Benutzername
- E-Mail
- Accountstatus
- globale Rolle
- Member-Profil
- Gruppenmitgliedschaften kompakt
- Rollen kompakt
- offene Claims
- relevante Auffälligkeiten
- letzte Aktivität

Keine großen Statistik-Karten für Werte wie:

- Anzahl effektiver Rechte
- Anzahl Overrides
- Anzahl Beiträge
- Anzahl Release-Arbeitsflächen
- Anzahl Media-Uploads

Grundregel:

> Zahlen nur dann prominent anzeigen, wenn sie direkt administrativen Nutzen oder Handlungsbedarf zeigen.

---

## 4. Benutzerliste

Die Benutzerliste ist eine Arbeitsliste.

Sinnvolle Spalten:

- Name
- E-Mail
- Status aktiv/deaktiviert
- globale Rolle
- Member-Profil aktiv/nicht aktiv
- Anzahl Gruppenmitgliedschaften
- offene Claims
- letzte Aktivität
- Aktionen

Nicht als Hauptspalten:

- Anzahl Beiträge
- Anzahl Release-Arbeitsflächen
- Anzahl Media-Uploads

---

## 5. Gruppenansicht

Beim Öffnen einer Gruppe gilt:

```text
Benutzer | Rollen | Claims | Änderungen
```

Standardtab:

```text
Benutzer
```

Pro Benutzer sollen sichtbar sein:

- Benutzer
- Rolle(n)
- Status
- relevante Rechteabweichungen
- letzte Aktivität
- direkte Navigation zum Benutzer-in-Gruppe-Kontext

Keine reine Rechteanzahl als Hauptinformation.

---

## 6. Rollenansicht

Beim Öffnen einer Rolle, z. B. `Co-Leitung`, steht zuerst die Frage im Vordergrund:

> Wer besitzt diese Rolle und in welcher Gruppe?

Standardansicht:

| Benutzer | Gruppe | Status | Rechte-Abweichungen | letzte Aktivität |
|---|---|---|---|---|

Benutzer und Gruppe sind direkt anklickbar.

Die Standard-Capabilities der Rolle sind ebenfalls erreichbar, aber nicht die erste Information.

---

## 7. Capabilities-Hauptansicht

Die heutige Darstellung mit großen Rollen-Cards soll ersetzt werden.

Verbindliche Struktur auf Desktop:

- links kompakte Rollenliste
- rechts Capability-Matrix der ausgewählten Rolle

Also Split-View.

Beispiel Rollenliste:

```text
Globale Rollen
- Plattform-Admin
- Content-Admin
- Benutzer

Gruppenrollen
- Fansub-Leitung
- Gründer
- Co-Leitung
- Technik-Admin
- Übersetzer
- Timer
- Typesetter
- Encoder
...
```

Auf Tablet/Mobile wird Split-View nicht zusammengedrückt, sondern in:

```text
Liste → Detailansicht
```

überführt.

---

## 8. Kanonischer Benutzer-in-Gruppe-Editor

Sehr wichtige Entscheidung:

Die eigentliche Bearbeitung eines konkreten Benutzers innerhalb einer konkreten Gruppe existiert nur einmal.

Folgende Einstiege führen alle zum selben Editor:

```text
Benutzer → Max → Rollen & Rechte → New-Subs
Gruppen → New-Subs → Benutzer → Max
Rollen → Co-Leitung → Benutzer → Max / New-Subs
```

Es dürfen keine getrennten Bearbeitungsoberflächen mit eigener Logik entstehen.

---

## 9. Kanonischer Rollen-Capability-Editor

Die Capability-Detailansicht ist primär Analyseperspektive.

Sie darf nicht zu einem zweiten unabhängigen Rollen-Capability-Editor werden.

Änderungen an:

```text
Rolle → Capability
```

erfolgen am kanonischen Rollen-Capability-Editor.

Die Capability-Perspektive kann dorthin verlinken.

Grundregel:

> Eine Sache darf aus mehreren Perspektiven analysiert werden, aber die eigentliche Bearbeitung soll möglichst nur an einem kanonischen Ort stattfinden.

---

## 10. Mobile / Tablet

Verbindlich:

- Desktop darf Split-Views verwenden.
- Tablet/Mobile nutzt gestapelte Navigation.
- Erst Liste, dann Detailansicht bzw. Drawer.
- Große Desktop-Tabellen werden als kompakte Cards oder Zeilen umgesetzt.
- Keine horizontale Desktop-Matrix auf kleinen Screens erzwingen.

---

## 11. Begriffe

Normale Admin-Oberfläche verwendet verständliche deutsche Fachbegriffe.

Hauptnavigation:

```text
Benutzer | Gruppen | Rollen | Capabilities | Claims | Änderungen
```

Benutzer:

```text
Übersicht | Rollen & Rechte | Beiträge | Claims | Streaming | Änderungen
```

Aktionen:

- Recht entziehen
- Recht zusätzlich erlauben
- Abweichung entfernen
- Rolle zuweisen
- Rolle entfernen
- Benutzer deaktivieren
- Benutzer reaktivieren

Technische Begriffe wie `Allow`, `Deny`, `Audit`, interne Reason-Codes usw. gehören nur in erweiterte technische Details, wenn nötig.

---

## 12. Benutzer löschen

Reguläre Admin-Aktion ist:

- deaktivieren
- reaktivieren

Löschen nur, wenn der bestehende Code bereits eine fachlich sichere Löschregel besitzt und keine Claims, Beiträge, Audit-/Änderungshistorie oder Referenzen unverständlich beschädigt werden.

Phase 138 soll keine neue komplexe Löscharchitektur erzwingen.

---

## 13. Streaming

Streaming erscheint bereits als vorbereiteter Benutzerbereich:

```text
Streaming
```

Aber:

- keine Fake-Daten
- keine Fake-Funktionen
- keine fachliche Streaming-Implementierung in Phase 138

Die Informationsarchitektur soll lediglich späteren Ausbau ermöglichen.

---

## 14. Beiträge

Beiträge bleiben als Benutzerbereich sichtbar.

Das vollständige skalierbare Beitrags-Redesign gehört weiterhin in die dafür vorgesehene Folgephase.

In Phase 138 wird der bekannte Darstellungsfehler berücksichtigt:

`release_version_id` darf nicht als fachliche Versionsnummer angezeigt werden.

Beispiel korrekt:

```text
Buddy Complex · Episode 1 · Version 1
Buddy Complex · Episode 2 · Version 1
...
```

---

## 15. Ziel dieser Datei

Claude soll diese Datei als verbindlichen UI-/Informationsarchitektur-Kontext für die Plan-Phase verwenden.

Sie ist zusammen mit den anderen Phase-138-Discuss-Dateien zu lesen.
