# Phase 186 — CONTEXT-Entwurf (Vorab-Recherche)

**Status:** Entwurf, kein offizielles GSD-`CONTEXT.md`-Artefakt. `/gsd:discuss-phase` und
`/gsd:plan-phase` wurden für Phase 186 bewusst **nicht** ausgeführt (Nutzerauftrag) — dies ist
reine Inventur + Recherche + eine Entscheidungsvorlage für den nächsten Schritt.

**Quelle des Auftrags:** `.planning/notes/2026-10-17-ux-findings-abgleich.md`, Bündelungsvorschlag
1 ("Episode-Import-Mapper nachschärfen", Findings #2, #3, #15), Paket A.

---

## 1. Ist-Zustand: Backend-Dateinamen-Parser

**Datei:** `backend/internal/handlers/admin_episode_import.go` — **783 Zeilen**, bereits über dem
450-Zeilen-Limit aus `CLAUDE.md` ("Übergroße Dateien beim Anfassen aufteilen"). Jede inhaltliche
Änderung an dieser Datei (hier: Parser-Austausch) löst die Aufteilungspflicht aus — als eigener,
verhaltensneutraler Umbau-Commit vor der inhaltlichen Änderung.

Drei Regex-Patterns, Zeilen 521-523:

```go
var episodeImportFilenameRangePattern        = regexp.MustCompile(`(?i)e(\d{1,4})-(\d{1,4})`)
var episodeImportFilenameSeasonEpisodePattern = regexp.MustCompile(`(?i)(?:^|[^a-z0-9])s(\d{1,3})e(\d{1,4})(?:[^0-9]|$)`)
var episodeImportFilenameEpisodePattern       = regexp.MustCompile(`(?i)(?:^|[^a-z0-9])e(\d{1,4})(?:[^0-9]|$)`)
```

Auflösungsreihenfolge in `episodeImportEvidenceEpisodeNumber()` (Zeilen 525-533): Jellyfin-Metadaten
→ `SxxExx`-Pattern → einfaches `Exx`-Fallback-Pattern (`parseEpisodeImportFilenameEpisode`, Zeilen
561-572).

**Bug #15 bestätigt:** Das `Exx`-Fallback (Zeile 523) hat keine Sonderbehandlung für CRC/Hash-Tags
in eckigen Klammern. `[E61CA0BA]` erfüllt das Pattern: `[` ist Nicht-alnum, `E` + `61` (Ziffern) +
`C` (Nicht-Ziffer) → Treffer, Episode wird fälschlich als **61** statt der echten Episodennummer
extrahiert. Empirisch geprüft:

```
'[SubsPlease] Some Anime - 01 (1080p) [E61CA0BA].mkv' -> matched "E61C", episode=61 (FALSCH)
```

Der Bug greift nur, wenn **weder** Jellyfin-Metadaten **noch** ein `SxxExx`-Pattern vorhanden sind
— also bei reinen Ordner-Scans ohne S/E-Schema bzw. ohne Jellyfin-Index (typisch für rohe,
unumbenannte Fansub-Release-Dateien).

Es gibt **keine** `ReleaseFilenameParser`-Interface-Abstraktion — die Logik liegt als freie
Funktionen direkt im Handler.

**Tests:** `admin_episode_import_test.go`, 867 Zeilen, 17 Testfunktionen. Ca. 6-8 davon nutzen
echte/realistische Dateinamen (z. B. `"Bleach S03E11.mkv"`, `"11eyes_01_[GroupA].mkv"`). **Keine**
Tests mit CRC/Hash-Tag-Dateinamen — die Fehlklassifizierung ist heute unabgedeckt.

## 2. Ist-Zustand: Frontend-Import-Mapper

**Route:** `frontend/src/app/admin/anime/[id]/episodes/import/`. Das Frontend parst selbst keine
Dateinamen per Regex — es konsumiert `suggested_episode_numbers` fertig vom Backend
(`frontend/src/types/episodeImport.ts`, `episodeImportMapping.ts:90-95`).

**"Ab hier" (Finding #2), heutiges Verhalten bestätigt** — `applyFansubGroupFromEpisodeDown()` in
`episodeImportMapping.ts:267-279`:

```js
export function applyFansubGroupFromEpisodeDown(rows, episodeNumber, fansubGroups) {
  const normalized = normalizeFansubGroups(fansubGroups)
  return rows.map((row) => {
    const suggestedEpisode = row.suggested_episode_numbers?.[0]
    return suggestedEpisode != null && suggestedEpisode >= episodeNumber
      ? applyFansubGroupsToRow(row, normalized)
      : row
  })
}
```

Überschreibt **unbedingt** `fansub_groups` auf jeder Zeile mit `suggested_episode_numbers[0] >=
episodeNumber`, unabhängig vom bisherigen Wert — exakt das vom Nutzer beschriebene Fehlverhalten.
Der bestehende Test `"applyFansubGroupFromEpisodeDown patches only the current episode and later
groups"` (`episodeImportMapping.test.ts:586-630`) asserted dieses Verhalten aktuell als *korrekt*
und muss bei der Umsetzung von D-01 (siehe unten) umgeschrieben werden.

Aufgerufen vom Button "Ab hier" in `EpisodeImportMappingRowGroupField.tsx:207`, verdrahtet über
`useEpisodeImportBuilder.ts:334`.

**Reale Knopfbeschriftungen** (Finding #3 zitiert KEINEN Ist-Zustand, sondern einen eigenen
Formulierungsvorschlag — die tatsächlichen Labels sind):

| Ort | Labels |
|---|---|
| Zeile | "Als Chip", "Ab hier", "Ab hier entfernen", "Bestätigen", "Übernehmen" / "Wird angewendet…" |
| Episodengruppe | "Alle bestätigen", "Alle überspringen" |
| Seite (Header) | "Alle Vorschläge überspringen", "Alle Vorschläge bestätigen", "Mapping anwenden" / "Wendet an…" |

Es gibt **kein** Label "Alle bestätigten übernehmen" oder "Nur diese Version" im Code — das sind
Vorschläge aus dem UX-Finding, keine Zitate.

**Tests:** 9 Dateien. Reine Logik-Tests (keine Render-Tests): `episodeImportMapping.test.ts`,
`episodeImportEinteilerTitle.test.ts`, `page.layout.test.ts`. 6 Render-Test-Dateien. Mehrere Tests
nutzen realistische Dateinamen (z. B. `"Vipers Creed. S01E01-CSubs.mkv"`), aber keine mit
CRC-Tags.

## 3. Echte Dateinamen aus der Datenbank (nur SELECT, `team4s_v2`, `release_variants.filename`)

15 verschiedene echte Werte:

```
Diamond no Ace 2.S02E51-L-S.mp4
07-Ghost.S01E22-ShiroiFansub.mkv
07-Ghost.S01E18-ShiroiFansub.mkv
07-Ghost.S01E03-ShiroiFansub.mkv
11eyes.S01E09-FlameHazeSubs.mp4
11eyes.S01E03-B-SH.mkv
Diamond no Ace 2.S02E42-L-S.mp4
11eyes.S01E01-FlameHazeSubs.mp4
11eyes.S01E11-Strawhat.mkv
Diamond no Ace 2.S02E36-L-S.mp4
Diamond no Ace 2.S02E43-L-S.mp4
Diamond no Ace 2.S02E07-L-S.mp4
Buddy Complex.S01E04-NEW-SUBS.mkv
Diamond no Ace 2.S02E35-L-S.mp4
Diamond no Ace 2.S02E23-L-S.mp4
```

**Wichtige Einschränkung:** Alle gespeicherten Werte folgen bereits dem kanonischen
`SxxExx`-Renaming-Schema ohne CRC-Hashtags — der DB-Bestand kann den #15-Bug nicht direkt
reproduzieren. Das Hash-Problem tritt bei **rohen** Fansub-Release-Dateinamen vor dem Renaming auf
(z. B. im SubsPlease-/Erai-raws-Stil: `"[SubsPlease] Show Name - 01 (1080p) [E61CA0BA].mkv"`).
Regressionstests für #15 brauchen deshalb händisch nachgebildete, stilecht-realistische
Roh-Dateinamen, keine 1:1-DB-Exporte.

## 4. Parser-Recherche: Go-Bibliotheken (Anitomy-Ports)

| | **anitogo** (nssteinbrenner) | **tanuki** (5rahim, Fork von anitogo) |
|---|---|---|
| Lizenz | MPL-2.0 | MPL-2.0 |
| Letzter Commit | 2023-12-22 | 2023-11-20 |
| Aktivität/Adoption | 13 Commits seit 2020, 26★ / 7 Forks | 9 Commits (Kurzprojekt Okt-Nov 2023), 1★ / 0 Forks |
| Go-Abhängigkeiten | `google/uuid v1.5.0`, `golang.org/x/text v0.14.0` | `google/uuid v1.3.1`, `golang.org/x/text v0.13.0` |
| Checksum-Handling | eigenes `FileChecksum`-Feld — Beispiel `"[1F56D642]"` wird korrekt als Checksum erkannt, nicht als Episode | identisch (ist Fork von anitogo) |

Beide Projekte sind seit ca. 3 Jahren ohne Aktivität — "gepflegt" ist für beide ein schwaches
Argument. Team4s' Backend hat `google/uuid` (aktuell v1.6.0) und `golang.org/x/text` (aktuell
v0.35.0) **bereits** als Abhängigkeit — eine Einbindung von anitogo/tanuki fügt dem
Abhängigkeitsgraph **keine neuen Pakete** hinzu, nur kompatible, bereits erfüllte Requires.

Zwischen den beiden: **anitogo** hat die deutlich längere Historie und breitere (wenn auch kleine)
Nutzerbasis; tanukis README-Verbesserungen (Titel-/Staffelerkennung) sind nicht durch nennenswerte
Adoption verifiziert.

## 5. Entscheidung D-01 — "Ab hier"-Gruppenübernahme (FESTGELEGT, keine offene Frage mehr)

**Nutzerentscheidung (2026-10-18), ersetzt Finding #2s ursprünglichen Lösungsvorschlag
("nur leere Zeilen füllen ODER Bestätigung bei Konflikt") durch eine präzisere Regel:**

Ab der Zeile, in der der Chip geändert wurde (inklusive, abwärts):

1. Zeilen mit dem **alten Gruppenwert** der Ausgangszeile → neuer Wert.
2. Zeilen **ohne Gruppe** (leer) → neuer Wert (unabhängig vom alten Wert — Begründung: bei
   Serien mit vielen Episoden ohne Auto-Zuordnung müsste man sonst jede Zeile einzeln befüllen).
3. Zeilen mit einer **anderen, abweichenden** Gruppe → unverändert.
4. **Sonderfall:** War die Ausgangszeile selbst leer (alter Wert = leer), fallen Regel 1 und 2
   zusammen — es werden alle leeren Zeilen ab hier gefüllt, alle Zeilen mit einer bereits
   gesetzten Gruppe bleiben unverändert.

**Als reine Funktion (Spezifikation für die Umsetzung, keine Render-Tests):**

```
applyGroupFromHere(rows, startIndex, oldValue, newValue) -> rows'

für jeden Index i >= startIndex:
  wenn rows[i].group == oldValue ODER rows[i].group ist leer:
    rows'[i].group = newValue
  sonst:
    rows'[i].group = rows[i].group   // unverändert

für jeden Index i < startIndex: unverändert (nicht im Scope von "ab hier")
```

**Testfälle (alle drei Zeilenarten + Sonderfall):**

| # | rows (vorher) | startIndex | oldValue | newValue | rows (nachher) | Prüft |
|---|---|---|---|---|---|---|
| 1 | `[F1, F2, F3, F3, F2, F3]` | 2 | `F3` | `F4` | `[F1, F2, F4, F4, F2, F4]` | Regel 1 (alter Wert) + Regel 3 (andere Gruppe `F2` bleibt), Zeilen vor `startIndex` unberührt |
| 2 | `["F5", "", "F3", "", "F2"]` | 0 | `"F5"` | `"F4"` | `["F4", "F4", "F3", "F4", "F2"]` | Regel 1 + Regel 2 (leer→gefüllt) + Regel 3 gleichzeitig |
| 3 | `["F1", "F2", "F3"]` | 1 | `"F2"` | `"F2b"` | `["F1", "F2b", "F3"]` | Regel 3 isoliert — `F3` bleibt, obwohl es nach `F2` kommt |
| 4 (Sonderfall) | `["", "F2", "", "F3", ""]` | 0 | `""` | `"F4"` | `["F4", "F2", "F4", "F3", "F4"]` | Ausgangszeile selbst leer → nur leere Zeilen werden gefüllt, gesetzte Gruppen bleiben |

## 6. Offene Fragen an den Nutzer

### Frage B — Knopfbeschriftungen im Import-Mapper (Finding #3)

Die reale Label-Liste (Abschnitt 2) deckt sich nicht wörtlich mit Finding #3s Formulierungsvorschlag
("Alle bestätigten übernehmen" / "Nur diese Version"). Zwei Optionen:

- **Option 1 (schmal):** Nur Finding #3 exakt wie im Fix-Vorschlag umsetzen — Header-Button
  `"Mapping anwenden"` → z. B. `"Alle bestätigten übernehmen"`; Zeilen-Button `"Übernehmen"` → z. B.
  `"Nur diese Version übernehmen"`. Die übrigen Labels (`"Bestätigen"`, `"Alle bestätigen"`,
  `"Alle Vorschläge bestätigen"`) bleiben unverändert.
- **Option 2 (breiter):** Zusätzlich das Begriffspaar *"Bestätigen"* (Vorschlag als geprüft
  markieren) vs. *"Übernehmen"/"Anwenden"* (tatsächlich in die Datenbank schreiben) grundsätzlich
  klären — beide Konzepte existieren auf Zeilen- UND Seiten-Ebene parallel, das ist die eigentliche
  mögliche Verwechslungsquelle, nicht nur zwei ähnlich benannte Buttons.

**Empfehlung:** Option 1. Finding #3 ist mit Priorität "niedrig" als reine Begleitkorrektur
eingestuft und passt zum engen Scope von Paket A. Eine vollständige Begriffsklärung
("Bestätigen" vs. "Übernehmen" systemweit) ist eine eigene UX-Spec-Runde wert, falls das
Begriffspaar insgesamt als verwirrend empfunden wird — nicht Teil dieses Pakets.

### Frage C — Parser-Wahl (Finding #15)

- **Option 1 — Bibliothek (anitogo)** hinter einem neuen `ReleaseFilenameParser`-Interface.
  *Vorteil:* löst #15 strukturell (Checksum-Feld ist bereits vom echten Episodenfeld getrennt),
  deckt zusätzlich Multi-Episode-/Batch-/Versions-Patterns ab, die die drei Handregexe heute gar
  nicht kennen; kein neuer Abhängigkeits-Fußabdruck (Abschnitt 4). *Nachteil:* externe, seit ~3
  Jahren unbetreute Bibliothek; MPL-2.0 (Datei-Copyleft — bei einem rein internen Admin-Tool ohne
  Distribution unkritisch, aber zu dokumentieren); Verhalten bei künftigen Edge-Cases nur per
  eigenem Fork beeinflussbar.
- **Option 2 — eigener verbesserter Parser:** das dritte Regex-Pattern (Zeile 523) um einen
  Checksum-Ausschluss erweitern (z. B. Negativ-Lookahead/Vorprüfung auf `[XXXXXXXX]`-Hex-Tags vor
  dem `Exx`-Fallback), ggf. weitere Patterns ergänzen. *Vorteil:* volle Kontrolle, kein
  Lizenz-/Abhängigkeitsthema, kleinerer Change. *Nachteil:* Team4s pflegt dauerhaft eine eigene,
  nie vollständige Nachbildung der sehr ausgefeilten Anitomy-Heuristiken; deckt nur die konkret
  bekannten Fälle ab, nicht die Bandbreite realer Fansub-Namenskonventionen.

**Empfehlung:** Option 1 (anitogo), gekapselt hinter einem `ReleaseFilenameParser`-Interface.
Begründung: #15 ist struktureller Natur (fehlende Checksum-Semantik lässt sich nicht durch eine
einzelne Regex-Korrektur dauerhaft schließen, ohne bei jedem neuen Edge-Case nachzubessern); eine
Bibliothek mit etablierter Heuristik ist robuster als drei Handregexe; der Abhängigkeits-Mehraufwand
ist praktisch null; die ohnehin fällige Aufteilung von `admin_episode_import.go` (Abschnitt 1) ist
ein natürlicher Anlass, die Parser-Logik hinter einem eigenen Interface in ein eigenes Modul zu
ziehen.

## 7. Jellyfin-Hinweis (Rahmenbedingung, keine offene Frage)

Der Ordnername ist die verlässliche Kennung; Jellyfin-Metadaten sind unzuverlässig. Das steht in
einem gewissen Spannungsverhältnis zur heutigen Auflösungsreihenfolge in
`episodeImportEvidenceEpisodeNumber()`, die Jellyfin-Metadaten an **erster** Stelle prüft, noch vor
den Dateinamen-Patterns (Abschnitt 1). Dieser Punkt ist nicht Teil von Paket A (keines der drei
gebündelten Findings #2/#3/#15 verlangt eine Änderung der Prioritätsreihenfolge) — wird hier nur als
bekannte Rahmenbedingung für die künftige Parser-Arbeit festgehalten, falls die Jellyfin-Priorität
bei Gelegenheit separat hinterfragt werden soll.
