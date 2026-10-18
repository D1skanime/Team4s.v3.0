# Phase 186: Episoden-Import nachschärfen (Paket A aus UX-Abgleich) — CONTEXT

**Quelle des Auftrags:** `.planning/notes/2026-10-17-ux-findings-abgleich.md`, Bündelungsvorschlag
1 ("Episode-Import-Mapper nachschärfen", Findings #2, #3, #15), Paket A.

## Ziel

Der Episoden-Import-Mapper (`/admin/anime/[id]/episodes/import`) erkennt Episodennummern aus
Dateinamen zuverlässig auch bei CRC-Checksum-Tags, überschreibt bei "Ab hier" keine bewusst
abweichenden Gruppenzuordnungen mehr, und hat eindeutige Knopfbeschriftungen für
"alle übernehmen" vs. "nur diese Zeile übernehmen". Keine sichtbare Verhaltensänderung für bereits
korrekt erkannte, kanonisch benannte Dateien (Regressionsschutz).

## Nutzerentscheidungen (final, verbindlich)

### D-01 — "Ab hier"-Gruppenübernahme (Finding #2)

Ersetzt den heutigen `applyFansubGroupFromEpisodeDown()`-Blanko-Überschreib (siehe Ist-Zustand)
durch eine gezielte Ersetzung. Ab der Zeile, in der der Chip geändert wurde (inklusive, abwärts):

1. Zeilen mit dem **alten Gruppenwert** der Ausgangszeile → neuer Wert.
2. Zeilen **ohne Gruppe** (leer) → neuer Wert (unabhängig vom alten Wert — Begründung: bei
   Serien mit vielen Episoden ohne Auto-Zuordnung müsste man sonst jede Zeile einzeln befüllen).
3. Zeilen mit einer **anderen, abweichenden** Gruppe → unverändert.
4. **Sonderfall:** War die Ausgangszeile selbst leer (alter Wert = leer), fallen Regel 1 und 2
   zusammen — es werden alle leeren Zeilen ab hier gefüllt, alle Zeilen mit einer bereits
   gesetzten Gruppe bleiben unverändert.

**Als reine Funktion (Pflicht-Spezifikation, Logik-Tests, keine Render-Tests für diese Regel):**

```
applyGroupFromHere(rows, startIndex, oldValue, newValue) -> rows'

für jeden Index i >= startIndex:
  wenn rows[i].group == oldValue ODER rows[i].group ist leer:
    rows'[i].group = newValue
  sonst:
    rows'[i].group = rows[i].group   // unverändert

für jeden Index i < startIndex: unverändert (nicht im Scope von "ab hier")
```

**Pflicht-Testfälle (alle drei Zeilenarten + Sonderfall):**

| # | rows (vorher) | startIndex | oldValue | newValue | rows (nachher) | Prüft |
|---|---|---|---|---|---|---|
| 1 | `[F1, F2, F3, F3, F2, F3]` | 2 | `F3` | `F4` | `[F1, F2, F4, F4, F2, F4]` | Regel 1 (alter Wert) + Regel 3 (andere Gruppe `F2` bleibt), Zeilen vor `startIndex` unberührt |
| 2 | `["F5", "", "F3", "", "F2"]` | 0 | `"F5"` | `"F4"` | `["F4", "F4", "F3", "F4", "F2"]` | Regel 1 + Regel 2 (leer→gefüllt) + Regel 3 gleichzeitig |
| 3 | `["F1", "F2", "F3"]` | 1 | `"F2"` | `"F2b"` | `["F1", "F2b", "F3"]` | Regel 3 isoliert — `F3` bleibt, obwohl es nach `F2` kommt |
| 4 (Sonderfall) | `["", "F2", "", "F3", ""]` | 0 | `""` | `"F4"` | `["F4", "F2", "F4", "F3", "F4"]` | Ausgangszeile selbst leer → nur leere Zeilen werden gefüllt, gesetzte Gruppen bleiben |

Der bestehende Test `"applyFansubGroupFromEpisodeDown patches only the current episode and later
groups"` (`episodeImportMapping.test.ts:586-630`) fixiert heute das alte (blanke) Verhalten als
korrekt und **muss** auf die neue Regel umgeschrieben werden.

### D-02 — Knopfbeschriftungen (Finding #3)

Schmale Umsetzung (nicht die größere Begriffsklärung "Bestätigen" vs. "Übernehmen" insgesamt):

- Header-Button `"Mapping anwenden"` (`page.tsx:209`) → **"Alle bestätigten übernehmen"**.
- Zeilen-Button `"Übernehmen"` (`EpisodeImportMappingRow.tsx:150`) → **"Nur diese Version
  übernehmen"**.
- Alle übrigen Labels (`"Bestätigen"`, `"Alle bestätigen"`, `"Alle überspringen"`,
  `"Alle Vorschläge überspringen"`, `"Alle Vorschläge bestätigen"`, `"Als Chip"`,
  `"Ab hier"`/`"Ab hier entfernen"`) bleiben unverändert.
- Alle betroffenen Labels gehen über die `Button`-Primitive aus `@/components/ui`, mit echten
  Umlauten (ü/ä/ö), keine ASCII-Ersetzungen.

**Scope-Konsequenz (kein neuer Entscheidungspunkt, sondern direkte Folge des globalen
Design-System-Zwangs aus `CLAUDE.md`):** Die drei Header-Buttons in `page.tsx` (Zeilen 187, 195,
203 — "Alle Vorschläge überspringen", "Alle Vorschläge bestätigen", "Mapping anwenden") sind heute
**native `<button>`-Elemente**, kein `@/components/ui`-`Button`. Da der Header-Button
("Mapping anwenden" → "Alle bestätigten übernehmen") ohnehin inhaltlich geändert wird, müssen bei
dieser Gelegenheit alle drei nativen Buttons in diesem Cluster auf die `Button`-Primitive
migriert werden (nicht nur der umbenannte). Der Zeilen-Button `"Übernehmen"` nutzt bereits
`Button` (`EpisodeImportMappingRow.tsx`, Import `{ Button, FormField, Input } from
'@/components/ui'`) — dort ist nur der Label-Text zu ändern.

**Bewusst außerhalb des Scopes:** `EpisodeImportEpisodeGroup.tsx` hat ebenfalls zwei native
`<button>`-Elemente ("Alle bestätigen"/"Alle überspringen", Zeilen 184/191) — diese werden von
D-02 nicht umbenannt und nicht migriert, da diese Phase sie inhaltlich nicht anfasst. Bekannte,
unverändert bestehende Design-System-Abweichung, dokumentiert hier zur Transparenz, kein
Nachziehen in dieser Phase.

### D-03 — Parser-Wahl (Finding #15)

**anitogo** (`github.com/nssteinbrenner/anitogo`, MPL-2.0) hinter einem neuen,
**austauschbaren** `ReleaseFilenameParser`-Interface einbinden, statt die drei Handregex-Patterns
in `admin_episode_import.go` nachzubessern.

- **Austauschbarkeit:** Interface so schneiden, dass ein späterer Wechsel (z. B. zu `tanuki` oder
  einem eigenen Parser) ohne Call-Site-Umbau möglich ist — anitogo-spezifische Typen
  (`anitogo.Elements` etc.) bleiben hinter der Interface-Grenze, nicht in der Handler-Schicht
  sichtbar.
- **Go-Abhängigkeit:** `go get github.com/nssteinbrenner/anitogo` — benötigt `google/uuid` (im
  Backend bereits v1.6.0, anitogo verlangt nur v1.5.0+) und `golang.org/x/text` (bereits v0.35.0,
  anitogo verlangt nur v0.14.0+). Minimal Version Selection zieht die bereits vorhandenen,
  neueren Versionen — keine neuen indirekten Pakete. Modul-Proxy ist vom Host aus erreichbar
  (`https://proxy.golang.org/.../anitogo/@v/list` → HTTP 200, geprüft 2026-10-18); sollte der
  Backend-Build-Container keinen Netzzugriff haben, Modul-Cache/Vendoring als Fallback einplanen.
- **Lizenzhinweis (MPL-2.0):** wo im Repo für Drittabhängigkeiten mit abweichender Lizenz üblich
  dokumentieren (z. B. falls eine `NOTICE`/Abhängigkeits-Übersicht existiert; andernfalls
  mindestens ein kurzer Kommentar an der Integrationsstelle/im Modul-Verzeichnis). Für ein rein
  internes, nicht verteiltes Admin-Tool ist der Datei-Copyleft-Charakter von MPL-2.0 unkritisch,
  aber zu benennen.
- **Tests — zwei Gruppen, beide Pflicht:**
  1. **Rohe Fansub-Dateinamen** (neue Testfälle, da DB-Realdaten das nicht abdecken — siehe
     Ist-Zustand Abschnitt 3): CRC-Klammern wie `[E61CA0BA]`/`[1F56D642]`, SubsPlease-/Erai-Stil
     (`"[SubsPlease] Show Name - 01 (1080p) [ABCD1234].mkv"`,
     `"[Erai-raws] Show Name - 01 [1080p][Multiple Subtitle][XXXXXXXX].mkv"`), Batch-/Versions-
     Suffixe (`v2`, `v3`), Specials/OVA (`"OVA"`, `"SP01"`, `"S00E01"`). Erwartung: Checksum landet
     im Checksum-Feld, NICHT in der Episodennummer.
  2. **Regressionstests mit bereits kanonisch benannten Dateien** (die 15 echten
     `release_variants.filename`-Werte aus Abschnitt 3, z. B. `"07-Ghost.S01E22-ShiroiFansub.mkv"`,
     `"Diamond no Ace 2.S02E51-L-S.mp4"`): Episodennummer/Ergebnis darf sich gegenüber dem
     heutigen Drei-Regex-Verhalten **nicht verschlechtern** — 1:1-Vergleich altes vs. neues
     Ergebnis für alle 15 Werte.
- **Jellyfin-Hinweis bleibt Rahmenbedingung, keine Scope-Änderung:** Der Ordnername ist die
  verlässliche Kennung, Jellyfin-Metadaten sind unzuverlässig. Die heutige Prioritätsreihenfolge in
  `episodeImportEvidenceEpisodeNumber()` (Jellyfin-Metadaten vor Dateinamen-Patterns) wird durch
  D-03 **nicht** verändert — nur das `Exx`-Fallback-Pattern wird durch den neuen Parser ersetzt.

### D-04 — Datei-Längen-Regel

`CLAUDE.md`-Pflicht "Übergroße Dateien beim Anfassen aufteilen" gilt: Jede inhaltlich berührte
Produktionsdatei über 450 Zeilen wird vorher per reinem Umbau-Commit (ohne Verhaltensänderung,
Tests/Typecheck grün) aufgeteilt, danach erst inhaltlich geändert.

**Datei-Längen-Inventur (Stand 2026-10-18, `wc -l`):**

| Datei | Zeilen | Betroffen durch | Aufteilung nötig? |
|---|---|---|---|
| `backend/internal/handlers/admin_episode_import.go` | 783 | D-03 (Parser-Austausch) | **Ja** — vor der inhaltlichen Änderung aufteilen |
| `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` | 442 | D-01 (neue `applyGroupFromHere`-Logik) | Knapp unter dem Limit — nach Einbau der D-01-Logik erneut zählen; bei Überschreitung aufteilen |
| `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` | 435 | D-01 (Verdrahtung) | Knapp unter dem Limit — nach Änderung erneut zählen |
| `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` | 375 | D-02 (Button-Migration + Label) | Unkritisch |
| `EpisodeImportMappingRowGroupField.tsx` | 250 | D-01 (Button-Verdrahtung "Ab hier") | Unkritisch |
| `EpisodeImportMappingRow.tsx` | 171 | D-02 (Label) | Unkritisch |
| `backend/internal/handlers/admin_episode_import_test.go` | 867 | D-03 (neue Testfälle) | Testdatei, nicht von der Produktionscode-Zeilenregel erfasst — ggf. aber sinnvoll in eine `_parser_test.go`-Datei auslagern, wenn der neue Parser in ein eigenes Modul wandert |
| `episodeImportMapping.test.ts` | 866 | D-01 (neue Testfälle) | Testdatei, nicht von der Zeilenregel erfasst |

## Ist-Zustand (Code-Inventur, nur lesend geprüft am Code vom 2026-10-18)

### Backend: Dateinamen-Parser

Drei Regex-Patterns in `backend/internal/handlers/admin_episode_import.go`, Zeilen 521-523:

```go
var episodeImportFilenameRangePattern        = regexp.MustCompile(`(?i)e(\d{1,4})-(\d{1,4})`)
var episodeImportFilenameSeasonEpisodePattern = regexp.MustCompile(`(?i)(?:^|[^a-z0-9])s(\d{1,3})e(\d{1,4})(?:[^0-9]|$)`)
var episodeImportFilenameEpisodePattern       = regexp.MustCompile(`(?i)(?:^|[^a-z0-9])e(\d{1,4})(?:[^0-9]|$)`)
```

Auflösungsreihenfolge in `episodeImportEvidenceEpisodeNumber()` (Zeilen 525-533): Jellyfin-Metadaten
→ `SxxExx`-Pattern → einfaches `Exx`-Fallback-Pattern (`parseEpisodeImportFilenameEpisode`, Zeilen
561-572).

**Bug #15 bestätigt:** Das `Exx`-Fallback (Zeile 523) hat keine CRC/Hash-Sonderbehandlung.
`[E61CA0BA]` erfüllt das Pattern (`[` = Nicht-alnum, `E`+`61` Ziffern, `C` = Nicht-Ziffer) →
Episode wird fälschlich als **61** statt der echten Episode extrahiert. Empirisch geprüft:
`'[SubsPlease] Some Anime - 01 (1080p) [E61CA0BA].mkv' -> matched "E61C", episode=61 (FALSCH)`.
Greift nur, wenn weder Jellyfin-Metadaten noch `SxxExx` vorhanden sind.

Keine `ReleaseFilenameParser`-Interface-Abstraktion vorhanden — freie Funktionen direkt im Handler.

**Tests:** `admin_episode_import_test.go`, 867 Zeilen, 17 Testfunktionen, ca. 6-8 mit echten
Dateinamen (`"Bleach S03E11.mkv"`, `"11eyes_01_[GroupA].mkv"`). Keine Tests mit CRC-Tags.

### Frontend: Import-Mapper

Route: `frontend/src/app/admin/anime/[id]/episodes/import/`. Parst selbst nichts per Regex —
konsumiert `suggested_episode_numbers` vom Backend.

**"Ab hier" (Finding #2), heutiges Verhalten:** `applyFansubGroupFromEpisodeDown()`
(`episodeImportMapping.ts:267-279`) überschreibt unbedingt `fansub_groups` auf jeder Zeile mit
`suggested_episode_numbers[0] >= episodeNumber`, unabhängig vom bisherigen Wert:

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

Aufgerufen vom Button "Ab hier" in `EpisodeImportMappingRowGroupField.tsx:207`, verdrahtet über
`useEpisodeImportBuilder.ts:334`.

**Reale Knopfbeschriftungen** (Finding #3 zitiert keinen Ist-Zustand, sondern einen eigenen
Formulierungsvorschlag):

| Ort | Labels | Primitive? |
|---|---|---|
| Zeile | "Als Chip", "Ab hier", "Ab hier entfernen", "Bestätigen", "Übernehmen"/"Wird angewendet…" | `Button` (bereits korrekt) |
| Episodengruppe | "Alle bestätigen", "Alle überspringen" | **nativ `<button>`** (außerhalb Scope D-02) |
| Seite (Header) | "Alle Vorschläge überspringen", "Alle Vorschläge bestätigen", "Mapping anwenden"/"Wendet an…" | **nativ `<button>`** (in Scope D-02 — siehe oben) |

**Tests:** 9 Dateien. Reine Logik-Tests: `episodeImportMapping.test.ts`,
`episodeImportEinteilerTitle.test.ts`, `page.layout.test.ts`. 6 Render-Test-Dateien. Mehrere Tests
nutzen realistische Dateinamen, keine mit CRC-Tags.

### Datenbank (nur SELECT, `team4s_v2`, `release_variants.filename`)

15 echte Werte, Beispiele: `"07-Ghost.S01E22-ShiroiFansub.mkv"`,
`"11eyes.S01E09-FlameHazeSubs.mp4"`, `"Diamond no Ace 2.S02E51-L-S.mp4"`,
`"Buddy Complex.S01E04-NEW-SUBS.mkv"`. **Einschränkung:** Alle Werte folgen bereits dem
kanonischen `SxxExx`-Schema ohne CRC-Hashtags — der DB-Bestand kann den #15-Bug nicht direkt
reproduzieren. Für D-03s Checksum-Tests sind deshalb handgefertigte, stilecht-realistische
Roh-Dateinamen nötig (siehe D-03 oben), die 15 echten Werte dienen als Regressionsbasis.

### Parser-Recherche: anitogo vs. tanuki

| | **anitogo** (gewählt, D-03) | tanuki (Fork, verworfen) |
|---|---|---|
| Lizenz | MPL-2.0 | MPL-2.0 |
| Letzter Commit | 2023-12-22 | 2023-11-20 |
| Aktivität/Adoption | 13 Commits seit 2020, 26★/7 Forks | 9 Commits (Kurzprojekt Okt-Nov 2023), 1★/0 Forks |
| Go-Abhängigkeiten | `google/uuid v1.5.0+`, `golang.org/x/text v0.14.0+` (beide im Backend bereits höher vorhanden) | identisch (Fork) |
| Checksum-Handling | eigenes `FileChecksum`-Feld, von `EpisodeNumber` getrennt | identisch (Fork) |

Beide seit ~3 Jahren ohne Aktivität; anitogo hat die deutlich längere Historie und breitere (wenn
auch kleine) Nutzerbasis — tanukis Verbesserungsansprüche sind nicht durch Adoption verifiziert.

## Offene Fragen

Keine mehr — D-01 bis D-04 sind abschließend entschieden.
