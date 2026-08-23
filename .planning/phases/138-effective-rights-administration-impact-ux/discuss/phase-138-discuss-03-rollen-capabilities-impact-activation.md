# Phase 138 – GSD Discuss Context 03
## Rollen, Capabilities, Impact Preview und Aktivierungsstatus

**Projekt:** Team4s  
**Phase:** 138  
**Status:** Diskussionsentscheidungen / Input für `/gsd:plan-phase 138`

---

## 1. Rollenansicht

Beim Öffnen einer Rolle, z. B. `Co-Leitung`, steht zunächst im Vordergrund:

> Wer besitzt diese Rolle?

Anzeigen:

- Benutzer
- Gruppe
- Status
- Rechte-Abweichungen
- letzte Aktivität

Der konkrete Eintrag `Benutzer + Gruppe` führt zum kanonischen Benutzer-in-Gruppe-Editor.

---

## 2. Rollen-Capability-Definition

Die globale Standarddefinition einer Rolle wird nur im kanonischen Rollen-Capability-Editor bearbeitet.

Frage dieser Oberfläche:

> Was darf diese Rolle standardmäßig?

Beispiel:

```text
Co-Leitung

Gruppenrechte
✓ Gruppe bearbeiten
✓ Mitglieder verwalten
✓ Rollen vergeben

Release-Rechte
✓ Release erstellen
✓ Release bearbeiten
✕ Release löschen

Review
✓ Review durchführen
...
```

---

## 3. Split-View

Desktop:

- links Rollenliste
- rechts Capability-Matrix

Die heutigen großen Rollen-Cards sollen nicht beibehalten werden.

Tablet/Mobile:

- Liste
- danach Detailansicht
- keine zusammengedrückte Desktop-Matrix

---

## 4. Capability-Detail als Analyseperspektive

Öffnet man eine einzelne Capability, z. B.:

```text
release.edit
```

steht im Vordergrund:

- welche Rollen gewähren diese Capability?
- welche Benutzer besitzen sie effektiv?
- in welchem Gruppen-/Kontext gilt sie?
- welche persönlichen Allows/Denies existieren?
- welche Änderungshistorie existiert?

Für die eigentliche Rollen-Capability-Änderung wird zum kanonischen Rollen-Capability-Editor navigiert.

Kein zweiter Editor.

---

## 5. Kein sofortiges Speichern eines Switches

Der heutige Ablauf:

```text
Switch → sofort PUT/DELETE → fertig
```

ist nicht ausreichend.

Neue Logik:

```text
Switch ändern
→ Impact Preview
→ Auswirkungen prüfen
→ bestätigen
→ persistieren
→ Aktivierungsstatus verfolgen
```

---

## 6. Impact Preview als Dialog

Verbindliche Entscheidung:

Impact Preview erscheint als Modal/Dialog über der Matrix.

Der Admin bleibt im Kontext der ausgewählten Rolle.

Der Dialog zeigt kompakt:

- Anzahl Rolleninhaber
- Anzahl Benutzer, die das Recht effektiv verlieren
- Anzahl Benutzer, die das Recht gewinnen
- Anzahl Benutzer, die das Recht durch andere Rollen behalten
- Anzahl Benutzer, die es durch persönliche Abweichungen behalten

Darunter eine aufklappbare Detailtabelle.

---

## 7. Detailtabelle der Auswirkungen

Beispiel:

| Benutzer | Gruppe | vorher | nachher | Grund |
|---|---|---|---|---|
| Sorata | Anime no Sekai | erlaubt | erlaubt | Webmaster gewährt ebenfalls |
| Mika | Anime no Sekai | erlaubt | nicht erlaubt | keine weitere Quelle |
| Kenji | Moonlight Subs | erlaubt | erlaubt | persönliche zusätzliche Erlaubnis |

Die Vorschau muss den **effektiven** Zustand zeigen, nicht nur Rollenmitgliedschaften zählen.

---

## 8. Resolver als Grundlage

Die Impact-Berechnung muss auf dem bestehenden Permission-/Effective-Rights-Modell beruhen.

Keine zweite vereinfachte Berechnungslogik nur für die UI.

Wenn dafür eine kleine Backend-Projektion / Preview-API fehlt, darf Phase 138 eine gezielte Vertragserweiterung planen.

Keine neue Permission-Engine.

---

## 9. Aktivierungsstatus nach der Änderung

Nach Bestätigung bleibt der Dialog offen.

Verbindlicher Ablauf:

```text
gespeichert
→ wird aktiviert
→ aktiv
```

Fehlerzustand:

```text
fehlgeschlagen
```

Ein endgültiger Erfolg darf erst angezeigt werden, wenn die Änderung tatsächlich im aktiven Permission-Zustand angekommen ist.

---

## 10. Persistiert ist nicht automatisch aktiv

Die UI muss explizit zwischen folgenden fachlichen Zuständen unterscheiden können:

- persistiert / gespeichert
- Aktivierung oder Cache-Reload läuft
- aktiv
- fehlgeschlagen

Die genauen technischen Statuswerte sollen aus dem realen Backendvertrag abgeleitet werden.

Keine Erfolgsmeldung nur deshalb, weil die Datenbankmutation HTTP 200 geliefert hat.

---

## 11. Rollenänderung eines einzelnen Benutzers

Auch `Rolle zuweisen` / `Rolle entfernen` bekommt eine Impact Preview.

Vorher/Nachher zeigen:

- effektive Rechte
- Rechte, die trotz Rollenentzug bestehen bleiben
- persönliche Abweichungen
- resultierenden Gesamtzustand

Das gleiche Sicherheitsprinzip gilt für globale und individuelle Rechteänderungen.

---

## 12. Capability-Kategorien

Die Matrix wird nach realen Capability-Bereichen gegliedert.

Beispiele nur als Struktur:

- Gruppe
- Projekt
- Release
- Review
- Medien
- Claims
- Beiträge

Die konkrete Registry im Code ist maßgeblich.

---

## 13. Ziel dieser Datei

Diese Datei definiert die Phase-138-Entscheidungen für Rollen-/Capability-Verwaltung, Impact Preview und echten Aktivierungsstatus.
