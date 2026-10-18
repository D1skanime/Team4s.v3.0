---
status: fix applied, pending live re-check
trigger: >
  Live-UAT-Befund nach Verknuepfung von Anime 13 "Freezing" mit AniSearch 6465
  (Quick-Task 261018-l5r). Im Episoden-Import (/admin/anime/13/episodes/import):
  (1) Episode 1 zeigt "Freezing: Hajikechau! Dokidoki Trouble Freezing" statt der
  korrekten deutschen AniSearch-Episode-1 "Unantastbare Koenigin"; Episoden 2-4
  sind korrekt. (2) Das Sprach-Dropdown je Episode bietet nur "Deutsch" an,
  obwohl AniSearch fuer diesen Anime auch englische und japanische Episodentitel
  listet.
created: 2026-10-18
updated: 2026-10-18
---

# Debug Session: anisearch-episode-titles-wrong-and-no-language-select

## Symptoms

- **Expected:** Jede reguläre AniSearch-Episode zeigt ihren korrekten, zugeordneten
  Titel; Specials/OVAs überschreiben keine reguläre Episodennummer. Das
  Sprach-Dropdown zeigt alle für die Episode vorhandenen Sprachen.
- **Actual:** Episode 1 von Freezing (AniSearch 6465) zeigt einen Bonus-Episode-Titel
  statt des echten Episode-1-Titels. Das Sprach-Dropdown zeigt immer nur "Deutsch"
  als einzige Option, unabhängig vom Anime.
- **Reproduktion:** `/admin/anime/13/episodes/import` nach Verknüpfung mit AniSearch
  6465 öffnen.

## Evidence

### Befund 1 — Bonus-Episode "B1" überschreibt reguläre Episode 1

Echtes, aktuelles HTML von `https://www.anisearch.de/anime/6465,freezing/episodes`
abgerufen (nur lesend, `curl` mit demselben User-Agent wie
`AniSearchClient.fetchPageHTML`) und als Test-Fixture gespeichert:
`backend/internal/services/testdata/anisearch_6465_freezing_episodes.html`
(13184 Bytes, die echte `&lt;table&gt;` mit allen 13 `tr[data-episode="true"]`-Zeilen).
Zum Vergleich (bisher funktionierender Anime, keine Specials-Kollision):
`backend/internal/services/testdata/anisearch_9251_buddycomplex_episodes.html`
(Buddy Complex, alle 13 Zeilen rein numerisch 1-13).

Die letzte Zeile der Freezing-Tabelle:
```html
<tr data-episode="true" itemprop="episode" itemscope itemtype="https://schema.org/TVEpisode">
  <th scope="row" itemprop="episodeNumber"><b><a href="anime/7031">B1</a></b></th>
  ...
  <td data-title="Titel"><div lang="en">...<span itemprop="name" lang="en" class="grey italic">
    Freezing: Hajikechau! Dokidoki Trouble Freezing</span></div></td>
</tr>
```
Die Episodennummer-Zelle enthält **"B1"** (Bonus-Episode 1, verlinkt auf einen
ANDEREN Anime-Eintrag `anime/7031` — eine Crossover-OVA), keine reguläre
Episodennummer.

`parseAniSearchEpisodeNumber()` (`backend/internal/services/anisearch_episode_import.go:186-193`)
extrahiert die Episodennummer per `regexp.MustCompile(`\d+`).FindString(...)` — eine
UNVERANKERTE Ziffernsuche, die aus "B1" die Ziffer "1" herauszieht. Die Bonus-Zeile
wird dadurch fälschlich als Episode 1 interpretiert.

`parseAniSearchEpisodeListHTML()` sammelt Episoden in `episodesByNumber :=
map[int32]AniSearchEpisode{}`, befüllt per Dokument-Reihenfolge (`walk`). Da die
Bonus-Zeile die LETZTE Zeile im Dokument ist (nach der echten Episode 1), gewinnt sie
beim Map-Insert ("last write wins") und überschreibt den korrekten Eintrag für
Episode 1.

**Empirisch bestätigt** (eigenständiger Probe-Lauf, Logik 1:1 aus dem echten Code
kopiert, gegen beide Fixtures): für Freezing (6465) parst Zeile 0 korrekt
`number_cell_raw="1"`, `titles={de:"Unantastbare Königin", en:"Untouchable Queen",
ja:"Untouchable Queen"}` — aber Zeile 12 (die letzte) liefert `number_cell_raw="B1"`,
`titles={en:"Freezing: Hajikechau! Dokidoki Trouble Freezing"}`, die wegen der
fehlerhaften Nummer-Extraktion ebenfalls als Episode 1 gewertet wird und die echte
Episode 1 im Map überschreibt. Für Buddy Complex (9251) treten keine Bonus-Zeilen
auf — alle 13 Zeilen sind rein numerisch 1-13, keine Kollision, alle Titel korrekt
(Regressions-Gegenbeispiel).

### Befund 2 — Sprach-Dropdown ist fest verdrahteter Stub, keine Parser-Lücke

Der Backend-HTML-Parser extrahiert für JEDE reguläre Episode (beider Fixtures)
korrekt ALLE DREI Sprachen (de/en/ja) — empirisch bestätigt im selben Probe-Lauf
(`langs=[de en ja]` für alle 12 regulären Freezing-Episoden UND alle 13
Buddy-Complex-Episoden). `TitlesByLanguage` fließt korrekt bis in
`upsertImportEpisodeTitles()` (`backend/internal/repository/episode_import_repository_apply.go:328-351`),
die über `loadLanguageIDs()` (Zeile 204-224, Query `WHERE code = ANY(['de','en','ja'])`)
alle drei Sprachen in die `episode_titles`-Tabelle schreibt — kein Datenverlust auf
der Backend-Seite.

Das Sprach-Dropdown selbst
(`frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx:119-128`)
ist jedoch fest verdrahtet, keine echte UI:
```tsx
<Select
  className={styles.episodeTitleLanguageSelect}
  value="de"
  aria-label={`Sprache für Episodentitel ${group.episodeNumber}`}
  onChange={() => undefined}
>
  <option value="de">Deutsch</option>
</Select>
```
`value="de"` ist eine Konstante, es gibt nur die eine `&lt;option&gt;`, und
`onChange={() => undefined}` ist ein No-op. Das `group`-Objekt, das diese Komponente
als Prop bekommt (`EpisodeGroupProps.group`, `EpisodeImportEpisodeGroup.tsx:19-28`),
trägt gar kein `titlesByLanguage`-Feld — nur den bereits vorab aufgelösten
`title: string | null` (immer Deutsch bevorzugt, siehe
`resolveEpisodeDisplayTitle()` in `episodeImportMapping.ts:356-363`, mit explizitem
Kommentar "the import UI intentionally shows only the German title ... other
language variants are still persisted on apply, but not surfaced here"). Das
Dropdown ist also ein nie fertiggestellter Platzhalter, keine Parser- oder
Backend-Lücke.

## Eliminated

- hypothesis: Der Backend-HTML-Parser extrahiert andere Sprachen gar nicht.
  Eliminiert durch direkten Probe-Lauf gegen beide echten Fixtures — alle drei
  Sprachen werden für jede reguläre Episode korrekt extrahiert.
- hypothesis: `loadLanguageIDs()`/`upsertImportEpisodeTitles()` verlieren en/ja beim
  Schreiben. Eliminiert durch Code-Lektüre — die Funktion fragt explizit alle drei
  Codes ab und schreibt jede vorhandene Sprache in `episode_titles`.

## Resolution

**Root Cause 1 (kritisch, Datenfehler):** `parseAniSearchEpisodeNumber()`s
unverankerte `\d+`-Suche verwechselt Bonus-/Special-/OVA-Episodennummern (z. B.
"B1", vermutlich auch "OVA1"/"SP2"/Ähnliches in anderen Animes) mit regulären
Episodennummern, wodurch solche Zeilen reguläre Episoden im
`episodesByNumber`-Map überschreiben können (Dokument-Reihenfolge entscheidet,
welche Zeile "gewinnt").

**Root Cause 2 (unvollständige UI, kein Datenfehler):** Das Sprach-Dropdown in
`EpisodeImportEpisodeGroup.tsx` ist ein nie verdrahteter Platzhalter; die Daten
(alle Sprachen) sind backend-seitig vollständig vorhanden, werden aber im
Import-Mapper nur für Deutsch angezeigt, by Design (siehe Kommentar), aber ohne
echte Auswahlmöglichkeit.

**Fix (wird jetzt umgesetzt):**
1. `parseAniSearchEpisodeNumber()` verankern (`^\d+$` nach Trim statt `\d+`-Teilsuche)
   — Zeilen mit nicht-rein-numerischer Episodennummer (B1, OVA-Präfixe etc.) werden
   wie bisher bei ungültiger Nummer (`number &lt;= 0`) komplett verworfen, nicht in
   `episodesByNumber` aufgenommen — können damit keine reguläre Episode mehr
   überschreiben.
2. Sprach-Dropdown in `EpisodeImportEpisodeGroup.tsx` echt verdrahten: `group`
   bekommt die vorhandenen Sprachen, Dropdown zeigt alle an, Standard Deutsch falls
   vorhanden, Auswahl wechselt die angezeigte/bearbeitete Titel-Sprache.
3. Tests gegen beide echten Fixtures (6465 defekter Fall, 9251 Regressions-Gegenbeispiel).
4. Prüfen: wird derselbe Parser auch beim Anlegen (Create-Flow) und bei der
   AniSearch-Datenübernahme (Quick-Task 261018-l5r Teil B) verwendet — dort
   gleiches, jetzt korrigiertes Verhalten sicherstellen.

Bestandsdaten (Anime 13 Freezing) werden dabei nicht verändert — der Fix betrifft
nur den Parser/die UI, nicht vorhandene DB-Zeilen.

## Resolution-Bestätigung (umgesetzt, 2026-10-18)

Beide Fixes sind implementiert, getestet und committed; Backend neu gebaut und
neu gestartet, Frontend neu gestartet (kein `npm run build` im Container).
Bestandsdaten (Anime 13 "Freezing") wurden dabei nicht verändert.

1. **Backend (`67cb7936b`)** — `parseAniSearchEpisodeNumber()` verankert jetzt
   auf `^\d+$` (ganze getrimmte Zellenzeichenkette), statt einer unverankerten
   `\d+`-Teilsuche. Die "B1"-Bonus-Zeile wird dadurch komplett verworfen
   (`number <= 0`-Pfad) statt als Episode 1 interpretiert zu werden. Neue Tests:
   ein fokussierter Inline-Fixture-Test, ein Integrationstest gegen die echte
   Freezing-6465-Fixture (12 reguläre Episoden, Episode 1 behält
   "Unantastbare Königin", Bonus-Titel taucht nirgends auf) und ein
   Regressionstest gegen die echte Buddy-Complex-9251-Fixture (alle 13
   rein-numerischen Episoden parsen unverändert). Alle 8 Tests in
   `anisearch_episode_import_test.go` grün, `go build`/`go vet` fehlerfrei.

2. **Frontend (`5f8979bb1`)** — Das Sprach-Dropdown in
   `EpisodeImportEpisodeGroup.tsx` ist jetzt echt verdrahtet: `useEpisodeImportBuilder.ts`
   leitet `titlesByLanguage`/`availableLanguages` pro Episode aus
   `canonical_episodes[].titles_by_language` ab (de/en/ja-Reihenfolge); das
   Dropdown zeigt nur tatsächlich vorhandene Sprachen, Standardauswahl Deutsch
   falls vorhanden. Auswahlwechsel zeigt/bearbeitet die Titel-Zelle der
   gewählten Sprache; fehlt ein Titel für eine Sprache, bleibt das Feld leer
   (kein stiller Fallback auf Deutsch). `setEpisodeTitle` schreibt jetzt in den
   aktuell gewählten Sprach-Slot statt immer `de` zu überschreiben (Standard
   `"de"` für die Covered-Episodes-Liste ohne eigenes Dropdown, unverändertes
   Altverhalten dort). Kein Eingriff in den Apply/Persist-Pfad
   (`episode_import_repository_apply.go` unverändert) — der Übernahme-Mechanismus
   schrieb alle Sprachen bereits korrekt. Typecheck/Lint fehlerfrei (4
   Lint-Fehler + diverse Warnungen sind vorbestehend, in unberührten Dateien),
   118 Tests im Import-Verzeichnis grün (davon 5 neue Verhaltenstests für das
   Dropdown).

Backend neu gebaut (`docker compose build team4sv30-backend && docker compose
up -d team4sv30-backend`) — `/health` liefert `{"status":"ok"}`. Frontend neu
gestartet (`docker restart team4sv30-frontend`) — `/admin/anime/13/episodes/import`
liefert 200, kompiliert fehlerfrei. Dieses Dokument bleibt bis zur
Live-Nachprüfung durch den Nutzer in `.planning/debug/` (nicht nach
`resolved/` verschoben).
