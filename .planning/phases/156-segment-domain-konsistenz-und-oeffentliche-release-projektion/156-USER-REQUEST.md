# Phase 156 – Segment Domain Consistency & Public Release Projection

**Quelle:** Nutzerauftrag vom 2026-09-11, wörtlich übernommen. Verbindliche Auftragsquelle für
Planung, Ausführung und Abnahme dieser Phase.

## Ausgangslage

Die Segment-/Karaoke-Funktion ist bereits vorhanden, aber die fachliche Semantik ist aktuell nicht überall konsistent.

Relevante Ebenen:

1. Segment anlegen / bearbeiten
2. Segment → Release-Version Assignments
3. Fansubprojektseite
4. Release-Detailseite
5. segmentbezogene Credits / Beteiligte

Aktuell verwenden Projektseite und Release-Seite teilweise unterschiedliche Wahrheiten:

- Release-Seite basiert bereits stärker auf `theme_segment_assignments`
- Projektseite leitet Segmente teilweise direkt aus `start_episode`/`end_episode` ab
- Assignment-Synchronisation ist derzeit additiv
- zukünftige Releases werden nicht zuverlässig automatisch in bestehende Segmentbereiche aufgenommen
- Credits werden derzeit teilweise über heuristisches Rollenlabel-Matching wie `kara` / `typeset` abgeleitet

Phase 156 soll diese Drift beseitigen.

---

## Zentrale Fachentscheidung

`theme_segment_assignments` wird die kanonische Wahrheit dafür, welche Release-Version welches Segment tatsächlich verwendet.

`start_episode`/`end_episode` beschreibt den gewünschten beziehungsweise fachlichen Gültigkeitsbereich eines Segments.

Die Assignments müssen mit diesem Bereich konsistent gehalten werden.

Projektseite und Release-Seite dürfen nicht unterschiedliche Ableitungsregeln verwenden.

---

## 1. Segment-Gültigkeit und Assignments synchronisieren

### Problem

Wenn ein Segment beispielsweise gilt:

"Folge 1–10"

werden Assignments für bereits vorhandene Releases erzeugt.

Wird der Bereich später auf:

"Folge 1–5"

verkürzt, bleiben bestehende Assignments 6–10 aktuell möglicherweise erhalten.

Damit entsteht Drift:

"Segment Range != tatsächliche Assignments"

### Ziel

Bei jeder relevanten Bereichsänderung eine Soll-Menge der Assignments bestimmen.

Beispiel:

Segment: "1–5"

Soll:

- Release 1
- Release 2
- Release 3
- Release 4
- Release 5

Bestehende Assignments außerhalb dieses Bereichs müssen kontrolliert entfernt werden.

Nicht nur additiv synchronisieren.

---

## 2. Bestehende Overrides / Sonderzuweisungen berücksichtigen

Vor einer automatischen Entfernung prüfen, ob `theme_segment_assignments` bereits manuelle oder fachlich relevante Overrides unterstützt.

Keine legitimen Overrides blind löschen.

Falls es bisher keine eindeutige Unterscheidung zwischen:

- automatisch aus Range erzeugtem Assignment
- manuell gesetztem Assignment

gibt, zuerst analysieren, ob diese Unterscheidung benötigt wird.

Keine neue Komplexität ohne realen Bedarf einführen.

Der Zielzustand muss aber eindeutig und testbar sein.

---

## 3. Neue Releases automatisch passenden Segmenten zuweisen

### Problem

Beispiel:

Segment A gilt Folge 1–10.

Zum Zeitpunkt der Segmentanlage existieren nur Releases 1–3.

Dann entstehen nur Assignments für 1–3.

Wird Release 4 später angelegt, darf es nicht dauerhaft ohne Segment bleiben.

### Ziel

Beim Erstellen einer neuen relevanten Release-Version:

1. Anime / Gruppe / Version / Episode bestimmen
2. passende bestehende Segmente suchen
3. Range prüfen
4. benötigte Assignments automatisch erzeugen

Beispiel:

"Release Folge 4 erstellt" → Segment A gilt 1–10 → Assignment Segment A → Release 4 automatisch anlegen.

Das muss auch funktionieren, wenn:

- Segment zuerst existiert
- Release später existiert

und umgekehrt.

---

## 4. Eine kanonische Segment-Identität verwenden

Entscheidend für „neues Karaoke" ist die Segmentidentität.

Regel:

"gleiche theme_segment_id = dasselbe Karaoke / Theme"

Eine Änderung an:

- beteiligten Members
- Release Credits
- Timing Offset
- Rendering
- Caption
- technischen Metadaten

macht kein neues Segment.

Ein neues historisches Karaoke-Ereignis entsteht nur durch ein neues fachliches Segment.

Beispiel:

Segment 17: "OP A, Folge 1–10"

Segment 28: "OP B, Folge 11–20"

Nur der Wechsel "17 → 28" ist ein neues Karaoke-Ereignis.

---

## 5. Projektseite: Karaoke nur beim ersten Auftreten / Wechsel zeigen

Die Fansubprojektseite soll eine Karaoke-/Theme-Historie zeigen, keine Wiederholung pro Episode.

Beispiel:

Segment A gilt Folge 1–10.

Projektseite:

- Folge 1: "OP A – gilt Folge 1–10"
- Folge 2–10: kein neuer Karaoke-Eintrag.

Folge 11 bekommt Segment B: "OP B – gilt Folge 11–20"

Dann wird bei Folge 11 wieder ein Eintrag angezeigt.

### Wichtig

Die Entscheidung darf ausschließlich auf kanonischer Segmentidentität und Assignments beruhen.

Nicht auf:

- Memberänderungen
- Rollenänderungen
- Creditänderungen
- Timingänderungen

---

## 6. Projektseite nicht mehr direkt aus Range ableiten

Aktuell darf die Projektseite nicht länger nur anhand:

"start_episode <= episode <= end_episode"

entscheiden, dass ein Segment in einem Release existiert.

Stattdessen `theme_segment_assignments` verwenden.

Damit können Projektseite und Release-Seite nicht mehr zu unterschiedlichen Ergebnissen kommen.

---

## 7. Release-Seite zeigt alle tatsächlich verwendeten Segmente

Die Release-Detailseite verfolgt einen anderen Zweck als die Projekt-Historie.

Auf einer konkreten Release-Seite soll sichtbar sein, welche Segmente dieses Release tatsächlich verwendet.

Beispiel:

Release Folge 5 verwendet weiterhin Segment A, das seit Folge 1 gilt.

Release-Seite Folge 5 soll daher Segment A anzeigen.

Nicht vollständig unterdrücken.

Stattdessen beispielsweise fachlich kennzeichnen:

- "OP A"
- "verwendet seit Folge 1"
- "gültig bis Folge 10"

Projektseite und Release-Seite haben damit unterschiedliche Darstellung, aber dieselbe Datenquelle.

---

## 8. Segment-Origin einführen oder bestehende Origin-Semantik nutzen

Für Credits muss eindeutig bekannt sein, bei welchem Release ein Segment ursprünglich entstanden ist.

Nicht automatisch immer "MIN(Episode)" verwenden.

Grund: Ein Archiv ist lebend.

Beispiel:

- Segment gilt 1–10
- zunächst existieren nur Releases 3–10
- später wird Release 1 nachgetragen

Die Credit-Quelle darf dadurch nicht unkontrolliert wechseln.

### Ziel

Eine stabile fachliche Origin-Referenz besitzen.

Bevorzugt beispielsweise `origin_release_version_id` oder eine bereits existierende gleichwertige Relation.

Diese Referenz bedeutet:

«Dieses Release ist der fachliche Ursprung dieses Segments.»

Sie bedeutet ausdrücklich nicht:

«Kopiere seine Credits dauerhaft ins Segment.»

---

## 9. Origin muss korrigierbar sein

Das System ist lebend.

Wenn später festgestellt wird, dass die Origin-Release-Version falsch gewählt wurde, muss sie administrativ korrigierbar sein.

Keine unveränderliche historische Momentaufnahme erzeugen.

Änderungen sollen sauber validiert werden.

---

## 10. Segment-Credits nicht duplizieren

Keine neue Tabelle für kopierte Segment-Credits einführen, solange die benötigte Semantik aus bestehenden Release-Credits ableitbar ist.

Source of Truth für Beteiligte bleibt:

- bestehende Release-/Member-Rollen
- bestehende Contributions

Das Segment referenziert nur seine Origin.

Anzeige:

"Segment" → "origin release version" → "aktuelle Credits dieses Releases" → "segmentrelevante Rollen filtern"

Dadurch bleiben Korrekturen live.

---

## 11. Dynamische Credit-Ableitung

Beispiel:

Origin Release enthält:

- Anna → Translation
- Ben → Timing
- Chris → Karaoke FX
- Daniel → Typesetting
- Eva → Encoding
- Fabio → QC

Segmentdarstellung soll ableiten:

- Anna → Karaoke Translation
- Ben → Karaoke Timing
- Chris → Karaoke FX
- Daniel → Typesetting / Logo

Nicht anzeigen:

- Encoding
- QC

---

## 12. Keine Rollenlabel-Heuristik

Aktuell existiert problematische Logik in Richtung:

"role label contains `kara`" oder "contains `typeset`"

Diese muss entfernt werden.

Keine fachliche Semantik aus UI-Labels oder Strings ableiten.

Stattdessen stabile Rollen-Codes beziehungsweise zentrale Domain-Semantik verwenden.

Beispiel:

- `translator` → segment translation
- `timer` → segment timing
- `karaoke_fx` → segment karaoke_fx
- `typesetter` → segment typesetting

Die genaue technische Implementierung soll bestehende Rollen-/Capability-Strukturen verwenden und keine parallele Mapping-Welt erzeugen.

---

## 13. Zentrale Segment-Credit-Semantik

Segmentrelevante Rollen an genau einer zentralen Stelle definieren.

Nicht mehrfach in:

- Repository
- Handler
- Frontend
- ThemeTimeline
- Project Page

hartcodieren.

Frontend erhält bereits semantisch fertige Credits.

---

## 14. Lebende Daten korrekt behandeln

Wichtige Reihenfolgefälle testen.

### Fall A – Segment zuerst

Montag: Segment A, Folge 1–10 wird angelegt. Noch keine Credits.

Anzeige: "Credits noch nicht erfasst"

Dienstag: Release 1 bekommt Translation, Timing, Karaoke FX.

Anzeige aktualisiert sich automatisch.

### Fall B – Credits zuerst

Release 1 hat bereits alle Beteiligten.

Später wird Segment A angelegt und Origin Release 1 zugeordnet.

Credits erscheinen sofort.

### Fall C – Credit korrigiert

Ben war fälschlich Timer.

Später: Ben entfernt, Peter als Timer ergänzt.

Segmentdarstellung muss ohne Segmentbearbeitung automatisch Peter anzeigen.

### Fall D – Member ergänzt

Typesetter wird später nachgetragen.

Segmentdarstellung muss automatisch erweitert werden.

---

## 15. Keine neue Segmenthistorie durch Creditänderungen

Beispiel:

Segment A gilt Folge 1–10.

Folge 1: Anna / Ben / Chris

Später wird Ben durch Peter ersetzt.

Das bleibt weiterhin "Segment A".

Die Projektseite darf deshalb nicht bei einer späteren Episode einen neuen Karaoke-Eintrag erzeugen.

Segmentidentität und Creditidentität strikt trennen.

---

## 16. Neues Segment bei echter Änderung

Wenn ab Folge 11 ein neues Opening existiert:

Segment B: "Folge 11–20" mit eigener Origin.

Dann:

- Projektseite zeigt bei Folge 11 einen neuen Eintrag.
- Release-Seiten 11–20 zeigen Segment B.
- Die Credits werden aus der Origin von Segment B abgeleitet.

---

## 17. ThemeTimeline überprüfen

`ThemeTimeline` und verwandte Komponenten auf parallele Domainlogik prüfen.

Insbesondere:

- OP
- ED
- IN
- MIDDLE
- KARA
- Kombinationen / Varianten

Keine eigene fachliche Typwelt im Frontend behalten, wenn Backend/Domain bereits kanonische Typen liefern kann.

Ziel: Frontend rendert. Backend/Domain entscheidet Semantik.

---

## 18. Projektseite und Release-Seite gleiche Datenbasis

Nach Phase 156 soll gelten:

**Projektseite** — Quelle: `theme_segment_assignments`; Darstellung: nur erstes Auftreten / Wechsel eines Segments.

**Release-Seite** — Quelle: `theme_segment_assignments`; Darstellung: alle Segmente dieses konkreten Releases.

Keine parallelen Range-basierten Wahrheiten.

---

## 19. Release-Seite – Member Navigation

Wenn segmentbezogene Credits klickbar sind, sollen Member innerhalb des Projektkontexts primär zur Project-Member Route führen:

`/fansubs/[groupSlug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]`

Nicht direkt zum globalen Public Member Profile.

Das hält den Benutzer im aktuellen Projektkontext.

---

## 20. Performance

Die neue Segmentlogik darf kein N+1 erzeugen.

Insbesondere nicht:

- Query pro Segment
- Query pro Member
- Query pro Release
- Query pro Credit

Segmentdaten + Origin Credits möglichst bounded/batched laden.

Query Budget messen.

---

## 21. Indizes

Prüfen, ob passende Indizes vorhanden sind für:

- `theme_segment_assignments.release_version_id`
- `theme_segment_assignments.theme_segment_id`
- Segment Range / Anime / Gruppe / Version
- Origin Release Version
- Release Member Roles / Contributions

Keine Indizes blind hinzufügen.

Query Plans prüfen, wenn relevant.

---

## 22. Migration / Backfill

Falls `origin_release_version_id` neu eingeführt wird: bestehende Segmente sauber backfillen.

Nicht blind die früheste Episode wählen, wenn eine bessere bestehende fachliche Information vorhanden ist.

Backfill-Strategie dokumentieren.

Wenn keine eindeutige Origin ableitbar ist:

- deterministischen konservativen Fallback verwenden
- betroffene Fälle dokumentieren
- keine falsche Präzision vortäuschen

---

## 23. Admin-Segmentverwaltung

Beim Segment-Anlegen/Bearbeiten prüfen, ob die UI beziehungsweise API Origin sauber setzen kann.

Ziel — Segment erfassen:

- Typ
- Name
- Range
- Start-/Endzeit
- Origin Release Version

Origin kann entweder automatisch sinnvoll vorgeschlagen oder bewusst gewählt werden.

Keine unnötige zusätzliche Pflichtinteraktion, wenn sie eindeutig ableitbar ist.

---

## 24. Keine UI-Neugestaltung

Phase 156 soll keine große visuelle Neugestaltung durchführen.

Bestehende Komponenten weiterverwenden.

Nur dort UI anpassen, wo neue fachliche Semantik sichtbar gemacht werden muss, zum Beispiel:

- „gilt Folge 1–10"
- „seit Folge 1"
- Credits
- Origin

Design-Politur kommt später.

---

## 25. Tests – Segment Lifecycle

Mindestens testen:

- Segment 1–10 anlegen bei vorhandenen Releases 1–3
- Release 4 später hinzufügen → Assignment entsteht automatisch
- Range 1–10 → 1–5 verkürzen
- Range 1–5 → 1–10 erweitern
- Segment löschen
- neue Release-Version innerhalb bestehender Range
- Release außerhalb Range
- mehrere Segmente
- Segmentwechsel
- Segment mit gleicher Range, aber anderer ID

---

## 26. Tests – Projektseite

Mindestens:

Segment A gilt 1–10. Erwartung:

- Folge 1 → sichtbar
- Folge 2–10 → nicht erneut sichtbar

Segment B beginnt Folge 11. Erwartung:

- Folge 11 → sichtbar

Creditänderung innerhalb Segment A. Erwartung:

- erzeugt keinen neuen Project-Timeline-Eintrag

---

## 27. Tests – Release-Seite

Release 5 verwendet Segment A. Erwartung:

- Segment A sichtbar
- Kennzeichnung Range/Origin sinnvoll
- aktuelle Credits der Origin sichtbar

Release 11 verwendet Segment B. Erwartung:

- Segment B sichtbar
- Segment A nicht sichtbar, falls nicht zugewiesen

---

## 28. Tests – Credits

Mindestens:

- Translation wird korrekt projiziert
- Timing wird korrekt projiziert
- Karaoke FX wird korrekt projiziert
- Typesetting wird korrekt projiziert
- Encoding wird nicht als Segmentcredit angezeigt
- QC wird nicht als Segmentcredit angezeigt
- Creditänderung wird live sichtbar
- keine Label-Substring-Heuristik

---

## 29. Security / Visibility

Bestehende Public-Visibility Regeln erhalten.

Keine privaten Memberdaten über Segment-Credits exponieren.

Nur öffentlich zulässige Member Identity, Rollen und Credits verwenden.

---

## 30. Vorher/Nachher-Verifikation

Im Abschluss dokumentieren:

**Vorher**

- unterschiedliche Projekt-/Release-Ableitung
- additive Assignment-Synchronisation
- Verhalten bei zukünftigen Releases
- Rollenlabel-Heuristik
- Query Budget

**Nachher**

- kanonische Assignment-Wahrheit
- Range-Synchronisation
- Auto-Assignment neuer Releases
- stabile Origin-Semantik
- dynamische Credit-Projektion
- Projektseiten-Regel
- Release-Seiten-Regel
- Query Budget

---

## Nicht-Ziele

Phase 156 soll NICHT:

- die Fansubprojektseite komplett redesignen
- die Release-Seite komplett redesignen
- Credits dauerhaft in Segmenttabellen kopieren
- neue Rollen erfinden
- neue parallele Rollen-Mappings im Frontend anlegen
- alle Media-/Release-Probleme außerhalb Segmenten lösen
- Phase 155 erneut durchführen
- RCA-04 untersuchen

---

## Abnahmekriterien

Phase 156 ist erst abgeschlossen, wenn:

- `theme_segment_assignments` kanonische Wahrheit für Release↔Segment ist
- Range-Verkleinerung keine veralteten Assignments zurücklässt
- Range-Erweiterung passende Assignments ergänzt
- später erstellte Releases automatisch passende bestehende Segmente erhalten
- Projektseite dasselbe Segment nur beim ersten Auftreten beziehungsweise Segmentwechsel zeigt
- Creditänderungen keinen neuen Karaoke-Eintrag erzeugen
- Release-Seite alle tatsächlich zugewiesenen Segmente ihres Releases zeigt
- Segment-Origin stabil definiert ist
- Segment-Credits dynamisch aus aktuellen Origin-Release-Credits projiziert werden
- Translation, Timing, Karaoke FX und Typesetting fachlich korrekt berücksichtigt werden
- Encoding/QC nicht fälschlich Segmentcredits werden
- keine Rollenlabel-Substring-Heuristik mehr notwendig ist
- Projekt- und Release-Seite dieselbe Segment-Wahrheit verwenden
- kein N+1 eingeführt wurde
- Tests grün sind
- Migration/Backfill geprüft ist
- Working Tree sauber ist
- Abschlussbericht Vorher/Nachher belegt

---

## Leitprinzip

Ein Segment ist ein wiederverwendetes fachliches Arbeitsergebnis.

Beispiel: "Opening A", "gilt Folge 1–10"

Die Arbeit an diesem Karaoke wird nicht bei jeder Episode erneut erzeugt.

Deshalb:

"Segmentidentität" ≠ "Episode"

und:

"Creditänderung" ≠ "neues Segment"

Projektseite zeigt die historische Änderung eines Segments.

Release-Seite zeigt, welche Segmente ein konkretes Release tatsächlich verwendet.

Credits bleiben lebend und werden aus der aktuellen fachlichen Source of Truth abgeleitet.
