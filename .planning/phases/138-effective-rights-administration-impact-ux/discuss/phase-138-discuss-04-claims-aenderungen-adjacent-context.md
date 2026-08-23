# Phase 138 – GSD Discuss Context 04
## Claims, Änderungen, Beiträge-Kontext und weitere Integrationsentscheidungen

**Projekt:** Team4s  
**Phase:** 138  
**Status:** Diskussionsentscheidungen / Input für `/gsd:plan-phase 138`

---

## 1. Claims werden in Phase 138 funktional integriert

Verbindliche Hauptnavigation enthält:

```text
Claims
```

Der zentrale Claims-Bereich ist eine Arbeitsqueue.

Standardmäßig sinnvolle Informationen:

- Status
- Benutzer
- Gruppe
- Claim-Typ
- beantragte Rolle bzw. Zielobjekt
- Datum
- direkte Aktion
- Navigation zu Benutzer
- Navigation zu Gruppe

Filter mindestens nach den real vorhandenen Feldern, insbesondere:

- offen
- genehmigt
- abgelehnt
- Claim-Typ
- Gruppe
- Benutzer
- Zeitraum

Reale Status aus dem Code verwenden.

---

## 2. Claims im Benutzerkontext

Im Benutzer existiert ebenfalls:

```text
Claims
```

Dort wird die Claim-Historie dieser Person gezeigt.

Offene Claims dürfen bereits auf der Benutzerübersicht als Handlungsbedarf erscheinen.

---

## 3. Claims im Gruppenkontext

Eine Gruppe besitzt den Tab:

```text
Claims
```

Dort erscheinen Claims im Kontext genau dieser Gruppe.

---

## 4. Claim-Entscheidungen mit Auswirkungs-Vorschau

Wenn das Genehmigen eines Claims eine Gruppenmitgliedschaft, Rolle oder sonstige berechtigungsrelevante Zuordnung erzeugt, muss vor der Bestätigung sichtbar sein:

- welche Zuordnung entsteht
- welche Rolle entsteht
- welche effektiven Rechte sich verändern
- welcher Benutzerzustand danach gilt

Keine Rechtewirkung verstecken.

Bei einer Ablehnung entsprechend zeigen, dass diese Zuordnung nicht entsteht.

---

## 5. Änderungen statt technischem Audit als primärer Begriff

Verbindlicher Navigationsbegriff:

```text
Änderungen
```

nicht primär:

```text
Audit
```

Technisch kann weiterhin das Audit-Log die Datenquelle sein.

Die Admin-Oberfläche soll Ereignisse fachlich verständlich übersetzen.

---

## 6. Zentraler Änderungen-Bereich

Filter nach:

- Benutzer
- Gruppe
- Rolle
- Capability
- Claim
- Zeitraum
- Akteur

Ein Eintrag soll verständlich zeigen:

```text
wer
→ was
→ in welchem Kontext
→ vorher
→ nachher
```

Beispiel:

```text
Admin X hat Benutzer Y in New-Subs
die Rolle Co-Leitung entzogen.

Vorher:
Co-Leitung
Release bearbeiten erlaubt

Nachher:
keine Co-Leitung
Release bearbeiten nicht mehr erlaubt
```

---

## 7. Rechte-/Override-Änderungen

Beispiel:

```text
Admin X hat Benutzer Y
„Release bearbeiten“
in New-Subs persönlich entzogen.

Vorher:
ERLAUBT durch Co-Leitung

Nachher:
NICHT ERLAUBT durch persönliche Abweichung
```

Soweit technisch verfügbar, soll der vorherige und nachherige effektive Zustand verständlich gezeigt werden.

---

## 8. Aktivität und Änderungen nicht vermischen

Unterscheidung:

### Aktivität

Was hat ein Benutzer fachlich getan?

Beispiele:

- Release bearbeitet
- Beitrag erstellt
- Projekt bearbeitet
- Claim gestellt

### Änderungen

Was wurde administrativ an Identität, Rollen, Rechten oder Claims verändert?

Beispiele:

- Rolle zugewiesen
- Rolle entfernt
- persönliches Recht entzogen
- Capability einer Rolle geändert
- Claim genehmigt
- Account deaktiviert

Die UI darf diese Konzepte nicht unklar vermischen.

---

## 9. Historie auch kontextbezogen

Änderungen sollen nicht nur global sichtbar sein.

Kontextbezogene Historie ist vorgesehen:

- Benutzer
- Gruppe
- Rolle
- Capability
- einzelnes Recht

Der zentrale Änderungen-Bereich bleibt trotzdem die Gesamtansicht.

---

## 10. Beiträge

Benutzer-Detailnavigation enthält:

```text
Beiträge
```

Das große skalierbare Beitrags-Redesign wird nicht vollständig in Phase 138 gezogen.

Bekannter Bug, der bei der Planung berücksichtigt werden soll:

Der aktuelle Code zeigt teilweise:

```text
Version {release_version_id}
```

Das ist eine technische ID und keine fachliche Versionsnummer.

Fachlich korrekt muss z. B. sein:

```text
Buddy Complex · Episode 1 · Version 1
Buddy Complex · Episode 2 · Version 1
...
Buddy Complex · Episode 13 · Version 1
```

Nicht:

```text
Version 1
Version 2
...
Version 13
```

nur weil interne Release-Version-Datensätze unterschiedliche IDs besitzen.

---

## 11. Streaming

Benutzer-Navigation enthält bereits:

```text
Streaming
```

Phase 138 implementiert keine Streaming-Funktion.

Ziel:

Die Informationsarchitektur soll späteren Streaming-Ausbau ohne erneuten grundlegenden Umbau der Benutzeransicht erlauben.

---

## 12. Bereichsspezifische Suche und Filter

Verbindliche Entscheidung:

Jeder Hauptbereich bekommt seine eigenen fachlich passenden Filter.

Beispiele:

### Benutzer

- Status
- Gruppe
- Rolle
- offene Claims
- globale Rolle

### Rollen

- Rollenart
- Scope

### Capabilities

- Bereich
- Scope
- Status, soweit real vorhanden

### Claims

- Status
- Typ
- Gruppe
- Benutzer
- Zeitraum

### Änderungen

- Zeitraum
- Benutzer
- Gruppe
- Rolle
- Capability
- Claim
- Akteur

Eine globale Suche kann später zusätzlich existieren, ist aber nicht die primäre Bedienlogik.

---

## 13. Beiträge und Claims nicht als bloße Zahlen

Keine nackten Hauptkennzahlen wie:

```text
13 Beiträge
4 Claims
```

ohne Kontext.

Stattdessen relevante fachliche Information und Handlungsbedarf.

Offene Claims dürfen prominent sein, weil daraus Arbeit entsteht.

Beiträge sind in der Übersicht nur als verständlicher Kontext anzuteasern.

---

## 14. Ziel dieser Datei

Diese Datei hält die zusätzlichen Phase-138-Entscheidungen zu Claims, Änderungen, Beitragskontext, Streaming-Vorbereitung sowie Filter-/Suchlogik fest.

Claude soll diese Datei zusammen mit Discuss 01–03 und dem aktuellen Code als Planungsgrundlage verwenden.
