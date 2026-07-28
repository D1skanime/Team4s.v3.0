# Phase 117: Kara-Segment — Zeit-Override je Folge + entdoppelte Anzeige - Research

**Researched:** 2026-07-28
**Domain:** Bestandsanalyse Kara-/Theme-Segment-Subsystem (PostgreSQL-Schema, Go-Backend, Next.js-Admin/Public-Frontend)
**Confidence:** HIGH für Datenmodell/Backend-Codepfade (direkt gelesen, mit Datei:Zeile belegt); MEDIUM für Umsetzungsempfehlungen (abgeleitet, noch nicht mit Nutzer abgestimmt)

**WICHTIG:** Dies ist ein reiner Analysebericht. Es wurde **nichts gebaut** — keine Migration, keine
Codeänderung. Alle Aussagen sind gegen den tatsächlichen Code verifiziert und mit Datei:Zeile belegt.
Wo eine Vermutung nötig war, ist sie explizit als solche markiert.

## Summary

Das bestehende Kara-Segment-Modell (`theme_segments`) unterstützt bereits einen Episoden-**Bereich**
pro Datensatz (`start_episode`, `end_episode`, ein einzelnes `start_time`/`end_time`-Paar für den
gesamten Bereich) — die Datenbank-Spalten für "ein Segment gilt über Folge 1–12" existieren also
bereits seit Migration `0049_extend_theme_segments` (`database/migrations/0049_extend_theme_segments.up.sql:8-11`).
In der Praxis wird dieser Bereich aber **nicht** als geteilte Definition genutzt: Das Admin-Formular
zum Anlegen eines Segments setzt `start_episode` und `end_episode` standardmäßig auf **dieselbe**
aktuell offene Folge (`frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx:197-205`),
und der "Vorschläge übernehmen"-Mechanismus (`getAnimeSegmentSuggestions` / `adoptSuggestion`,
`SegmenteTab.tsx:269-286`) erzeugt bei Übernahme eines Segments aus einer Nachbar-Folge einen **neuen,
eigenen** `theme_segments`-Datensatz mit identischen Zeiten — statt eine Referenz auf denselben
Datensatz zu setzen. Das Ergebnis: In der Praxis existiert de facto **ein Segment-Datensatz pro
Folge**, nicht ein geteilter Bereichs-Datensatz. Das erklärt die vom Nutzer beobachtete "Anzeige für
jede Folge" — nicht als Bug in einer Anzeige-Logik, sondern als Konsequenz der Daten-Duplizierung bei
der Erfassung.

Zusätzlich zeigt die Analyse eine tiefere strukturelle Einschränkung: Die Playback-Bindung eines
Segments (`theme_segment_playback_sources`) ist **system-weit eindeutig pro Segment** (ein Segment →
genau eine `release_variant_id`, erzwungen durch `UNIQUE INDEX uq_theme_segment_playback_sources_segment`
in `database/migrations/0054_theme_segment_playback_sources.up.sql:36`). Selbst wenn man den
vorhandenen Bereichs-Mechanismus (`start_episode`/`end_episode`) tatsächlich für einen echten
Mehr-Folgen-Datensatz nutzen würde, könnte dieser eine Datensatz nur mit **einer einzigen** Folgen-
Variante (also einer einzigen Episode) für Rendering/Streaming verknüpft sein — die Auflösung, welche
Variante das ist, erfolgt zudem **ohne Filter auf die Episodennummer** innerhalb des Bereichs
(`backend/internal/repository/admin_content_anime_themes.go:1366-1391`, `resolved_variant`-CTE:
JOINs bis zu `episodes`, aber keine Bedingung, die `ep`-Episodennummer gegen `ts.start_episode`/
`ts.end_episode` prüft). Ein echter geteilter Bereichs-Datensatz ist mit der heutigen
Playback-Architektur also nicht praktikabel, ohne diese 1:1-Bindung aufzubrechen.

Positiv für Anliegen 1 (kein Re-Encode): Der "Render-Cache" (`theme_segment_render_cache`) ist ein
**abgeleiteter ffmpeg-Schnitt** aus dem Jellyfin-Stream der Episode (kurzer Clip, Start+Dauer aus
`start_time`/`end_time`), **nicht** eine Neucodierung der Episoden-Quelldatei/des Release-Variants.
Jede Zeitänderung an einem Segment löst heute bereits nur ein Verwerfen + Neu-Einreihen dieses
Cache-Clips aus (`backend/internal/handlers/segment_render_refresh.go:17-75`,
`admin_content_anime_theme_segments.go:471-482`) — die Episodendatei selbst wird nie angefasst. D-01
("kein Re-Encode bei Zeitkorrektur") ist damit für das *Timing* bereits erfüllt; die eigentliche
Fragestellung ist, **wie** eine Einzel-Folgen-Abweichung modelliert wird, ohne einen neuen
"Segment" im Sinne von Anliegen 1 zu erzeugen.

**Primäre Einschätzung:** Die Datenbank hat das *Vokabular* für Bereiche (`start_episode`/`end_episode`),
aber weder Erfassungs-Workflow noch Playback-Architektur nutzen es als geteilte Definition. Um D-01/D-02
sauber umzusetzen, muss zuerst entschieden werden, ob (a) die bestehende Bereichs-Spalte tatsächlich als
geteilter Master-Datensatz reaktiviert wird (inkl. Aufbrechen der 1:1-Playback-Bindung pro Folge) oder
(b) das aktuelle "ein Datensatz pro Folge"-Muster beibehalten und stattdessen eine explizite
Gruppierungs-/Identitäts-Kennung (z. B. "gehört zu Serien-Segment X") plus ein separates Override-Feld
für die abweichende Folge eingeführt wird. Variante (b) ist mit deutlich weniger strukturellem Risiko
umsetzbar, weil sie die bestehende 1:1-Playback-Bindung nicht anfassen muss.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Segment-Zeitdefinition (Start/Ende, Bereich) | API / Backend (`theme_segments`) | Database / Storage | Timing ist reine Metadaten-Persistenz, keine Medienverarbeitung |
| Zeit-Override je Folge (Anliegen 1) | Database / Storage (neues Feld/Tabelle) | API / Backend (Validierung, Fallback-Auflösung) | Muss dieselbe Kette wie bestehendes Timing durchlaufen (Render-Cache-Invalidierung) |
| Entdopplung der Anzeige (Anliegen 2) | API / Backend (Aggregation/Vergleich über Episoden hinweg) | Browser/Client (Rendering der bereits deduplizierten Liste) | Vergleich "gleiches Segment vs. echter Wechsel" erfordert Zugriff auf Nachbar-Episoden — das kann das Frontend nicht ohne zusätzliche API-Daten leisten |
| Render-Cache (Vorschau-Clip) | API / Backend (`theme_segment_render_cache`, ffmpeg-Worker) | — | Rein serverseitige, von der Quelldatei abgeleitete Cache-Infrastruktur, nie client-seitig |
| Öffentliche Kara-Anzeige (Timeline) | Frontend Server (SSR-Datenabruf `releaseDetailPageData.tsx`) | Browser/Client (`ThemeTimeline.tsx` Rendering) | Datenaggregation passiert im Backend-Read (`loadReleaseSegments`), Client rendert nur das gelieferte Array |

## Datenmodell (verifiziert)

### Tabelle `theme_segments` (aktueller Stand, zusammengesetzt aus Migrationshistorie)

Ursprung: `database/migrations/0044_add_db_schema_v2_target_tables.up.sql:86-96` (Basistabelle:
`id`, `theme_id`, `start_episode_id`, `end_episode_id` als FKs auf `episodes`, `created_at`).

Migration `0049_extend_theme_segments.up.sql:5-17` ersetzt die episode-FK-Spalten durch reine
Integer-Bereiche und fügt Zeit-/Quellspalten hinzu:
- `fansub_group_id bigint` (FK `fansub_groups`, Zeile 6)
- `version varchar(20) DEFAULT 'v1'` (Zeile 7)
- `start_episode integer`, `end_episode integer` (Zeilen 8-9) — **Bereich**, kein Einzel-Episoden-Feld
- `start_time interval`, `end_time interval` (Zeilen 10-11) — **ein** Zeit-Paar für den **gesamten**
  Bereich, kein Per-Folge-Feld
- `source_jellyfin_item_id text` (Zeile 12, legacy)
- Constraint `chk_episode_range`: `end_episode >= start_episode` (Zeilen 19-33)
- Constraint `chk_time_range`: `end_time > start_time` (Zeilen 35-48)
- Alte FK-Spalten `start_episode_id`/`end_episode_id` gedroppt (Zeilen 15-17)

Migration `0051_extend_theme_segments_source.up.sql:5-9` fügt strukturierte Quellfelder hinzu:
`source_type` (`none`|`jellyfin_theme`|`release_asset`), `source_ref`, `source_label`.

Migration `0058_rename_theme_types_kara.up.sql:1-5` benennt nur `theme_types.name`-Werte um
(OP → "OP Kara" etc.), keine Schemaänderung an `theme_segments`.

**Es gibt keine weiteren `ALTER TABLE theme_segments`-Migrationen** (verifiziert per Grep über
`database/migrations/*.sql`). Der aktuelle Go-Struct-Spiegel ist
`backend/internal/models/admin_anime_themes.go:35-77` (`AdminThemeSegment`), Felder decken exakt
die oben genannten Spalten ab — **kein** Feld für eine Einzel-Folgen-Override-Zeit existiert.

**Fazit Frage 1 (Segment-Datenmodell):** Start/Ende sind bereits Bereichsfelder
(`start_episode`/`end_episode`), aber die Zeit (`start_time`/`end_time`) ist **ein einziges Paar für
den gesamten Bereich** — es gibt keine Spalte, keine Zusatztabelle und kein JSON-Feld für "Folge N
im Bereich hat eine andere Startzeit". `[VERIFIED: Migrationsdateien + admin_anime_themes.go]`

### Verwandte Tabellen (Kontext, nicht Kernmodell)

- `theme_segment_playback_sources` (`0054_theme_segment_playback_sources.up.sql:5-34`): **eine**
  Zeile pro Segment (`UNIQUE INDEX uq_theme_segment_playback_sources_segment`, Zeile 36-37), bindet
  das Segment an genau **eine** von drei Quellen (`release_variant_id` XOR `jellyfin_item_id` XOR
  `media_asset_id`, erzwungen durch `chk_theme_segment_playback_target`, Zeilen 20-27) plus
  Offset-Sekunden (`start_offset_seconds`, `end_offset_seconds`, aus `start_time`/`end_time`
  abgeleitet, s. u.).
- `theme_segment_render_cache` (`0122_theme_segment_render_cache.up.sql:4-56`): abgeleiteter
  ffmpeg-Clip-Cache, ein oder mehrere historische Cache-Einträge pro Segment, referenziert
  `playback_source_id`.
- `segment_library_definitions`/`segment_library_assets`/`segment_library_assignments`
  (`0053_segment_library_identity.up.sql:5-82`, Migrationsnummer im Dateinamen "0052" im
  Kommentar, tatsächliche Datei `0053_*`): reusable-Segment-Identität über AniSearch-Quelle +
  Fansub-Gruppe + Segment-Art, für Wiederverwendung/Reimport — betrifft **welche Datei** abgespielt
  wird, nicht **wann** (Timing).
- `release_version_media` (`0059_release_version_media_schema.up.sql:5-23`): unabhängiges Modell für
  Screenshot/Karaoke-Bildupload, **kein** Bezug zu `theme_segments`-Timing (unterschiedliche
  Kategorie "typesetting_karaoke" ist reine Bild-Kategorie).

## Geltungsbereich / Sharing (Frage 2)

**Datenbank-Ebene:** Ein `theme_segments`-Datensatz **kann** laut Schema mehrere Folgen abdecken
(`start_episode <= end_episode`). Das ist die vorgesehene Konstruktion für "OP gilt Folge 1–12
gleich".

**Erfassungs-Ebene (Admin-UI):** In der Praxis wird dieser Bereich nicht als geteilte Definition
befüllt:
- Beim Anlegen eines neuen Segments setzt `openAddPanel()` sowohl `startEpisode` als auch
  `endEpisode` auf die aktuell geöffnete Episode
  (`frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx:194-209`,
  konkret Zeile 201-202: `startEpisode: defaultEpisode, endEpisode: defaultEpisode`).
- Der einzige Mechanismus, der eine Wiederverwendung über Folgen hinweg *anbietet*, ist der
  "Vorschläge"-Bereich (`getAnimeSegmentSuggestions`, aufgerufen mit der aktuellen `episodeNumber`,
  `SegmenteTab.tsx:181-192`, Backend-Query `ListAnimeSegmentSuggestions` in
  `backend/internal/repository/admin_content_anime_themes.go:1704-1807`, die per
  `ts.start_episode <= $2 AND ts.end_episode >= $2` nach Segmenten sucht, deren Bereich die aktuelle
  Folge **bereits** abdeckt, aber aus einer **anderen** Gruppe/Version stammen — Zeilen 1745-1746,
  1751-1763). "Übernehmen" (`adoptSuggestion`, `SegmenteTab.tsx:269-286`) legt aber einen **neuen**
  `theme_segments`-Datensatz per `CreateAnimeSegment` an (Zeile 284: `await create(input)`), mit den
  kopierten Zeiten der Vorlage — es entsteht **kein** Verweis auf den Original-Datensatz.

**Fazit:** "Dasselbe Segment über Folge 1–12" wird heute **dupliziert pro Folge** angelegt, nicht als
geteilte Definition + Referenzen. Der Bereichsmechanismus (`start_episode`/`end_episode` > 1 Folge)
existiert im Schema, wird aber vom Standard-Workflow nicht genutzt. `[VERIFIED: SegmenteTab.tsx,
admin_content_anime_themes.go]`

**Zusätzlicher Befund (Playback-Bindung verhindert echten Bereich):** Selbst falls ein Admin
`start_episode=1, end_episode=12` mit gemeinsamer Zeit manuell anlegen würde, kann
`theme_segment_playback_sources` (1:1 pro Segment, s. o.) nur **eine** `release_variant_id` (= eine
konkrete Episoden-Datei) referenzieren. Die Auflösung dieser einen Variante erfolgt in
`loadThemeSegmentPlaybackSnapshotTx` (`admin_content_anime_themes.go:1363-1440`), CTE
`resolved_variant` (Zeilen 1366-1391): Es wird über `release_version_groups`, `release_versions`
(gefiltert auf `ts.fansub_group_id` + `ts.version`), `fansub_releases`, `episodes` (nur
`ep.anime_id = t.anime_id`, **keine** Bedingung auf die Episodennummer relativ zu
`ts.start_episode`/`ts.end_episode`) und `release_variants` gejoint, mit
`ORDER BY (Jellyfin-Stream vorhanden?), rv.id ASC LIMIT 1` (Zeilen 1387-1390) — die erste passende
Variante irgendeiner Folge im Anime gewinnt, unabhängig von der tatsächlichen Bereichszugehörigkeit.
Für ein echtes Mehr-Folgen-Segment würde das bedeuten: Render-Cache und öffentliches Streaming
hängen an einer einzigen, arbiträr gewählten Folge — die übrigen Folgen des Bereichs hätten gar
keine funktionierende Wiedergabe. `[VERIFIED: admin_content_anime_themes.go:1366-1391]`

## Timing (Frage 3)

Zeit wird als PostgreSQL `interval` gespeichert (`start_time interval`, `end_time interval`,
`0049_extend_theme_segments.up.sql:10-11`), im Go-Layer als `HH:MM:SS`-String transportiert
(`AdminThemeSegment.StartTime *string`, Kommentar "Interval als HH:MM:SS-String",
`admin_anime_themes.go:45-46`). Es ist **absolute** Zeit relativ zum Start der jeweils aufgelösten
Episoden-Variante (nicht relativ zu irgendeinem Bereichsanfang) — `parseSegmentClockSeconds`
(`admin_content_anime_themes.go:131-158`) rechnet den String in Sekunden um, die dann 1:1 als
`start_offset_seconds`/`end_offset_seconds` in `theme_segment_playback_sources` übernommen werden
(`syncThemeSegmentPlaybackSourceTx`, Zeilen 1240-1241, 1335-1355).

Validierung erfolgt serverseitig gegen die **Laufzeit der aktuell aufgelösten Release-Variante**
(`GetSegmentReleaseDuration`, `admin_content_anime_themes.go:1809-1842` — dieselbe "irgendeine
passende Variante"-Logik wie oben, `ORDER BY rv.duration_seconds IS NOT NULL DESC, rv.id ASC LIMIT 1`)
sowie clientseitig (`validateSegmentTimes`,
`backend/internal/handlers/admin_content_anime_theme_segments.go:33-57`, inkl. 4-Minuten-Fenster-
Limit `maxSegmentWindowSeconds = 240`, Zeile 24).

**Wo könnte ein Per-Folge-Offset sitzen, ohne das Quellvideo zu berühren?** Rein strukturell böte
sich ein zusätzliches, optionales Feld/eine Zusatztabelle an, die für **eine konkrete Folge**
innerhalb des Bereichs eines "Master"-Segments eine abweichende `start_time`/`end_time` hinterlegt
(z. B. `theme_segment_episode_overrides(theme_segment_id, episode_number, start_time, end_time)`).
Das wäre rein additiv zu `theme_segments` und würde denselben ffmpeg-Cache-Invalidierungspfad
(`segmentRenderInputsChanged`) nutzen können, sofern dieser Pfad auf die aufgelöste
Folge/Playback-Quelle statt auf das Master-Segment umgestellt wird. **Das ist eine Bauempfehlung,
keine bestehende Implementierung — `[ASSUMED]`, muss vor Umsetzung mit dem Nutzer und in der
Planungsphase gegen die 1:1-Playback-Bindung (s. o.) abgeglichen werden.**

## Render-Cache vs. Encode (Frage 4)

**Render-Cache = abgeleiteter ffmpeg-Ausschnitt, kein Re-Encode der Quelldatei.**

Beleg: `executeSegmentRender` (`backend/internal/handlers/segment_render_worker.go:114-192`) ruft
ffmpeg mit `-ss <StartOffsetSeconds> -t <DurationSeconds>` gegen die **Stream-URL der Episode**
(`source.StreamURL`, Jellyfin-Stream, aufgelöst über `theme_segment_playback_sources.release_variant_id`
→ `release_streams`/`stream_sources`) auf, schreibt das Ergebnis als eigene `.mp4`-Datei
(`outputRel := cache.CacheKey + ".mp4"`, Zeile 129) in `h.segmentRenderDir` — ein **komplett separates
Verzeichnis** von der eigentlichen Episoden-/Release-Datei (`h.mediaStorageDir`, vgl.
`StreamSegment`, `segment_stream.go:310-316`, das für `uploaded_asset`-Quellen stattdessen direkt aus
`h.mediaStorageDir` liefert). Die Episoden-Quelldatei bzw. der `release_variants`-Datensatz wird an
keiner Stelle in diesem Pfad verändert, neu geschrieben oder neu codiert.

**"Re-Render" (was heute bei Zeitänderung passiert):** `segmentRenderInputsChanged`
(`backend/internal/handlers/segment_render_refresh.go:17-30`) vergleicht u. a. `StartTime`/`EndTime`
vor/nach einem Patch. Bei Änderung wird über `resetAndQueueSegmentRenderAfterChange`
(Zeilen 32-75) der **alte Cache-Eintrag gelöscht** (`DeleteThemeSegmentRenderCaches`) und ein
**neuer Cache-Eintrag mit Status `queued`** angelegt (`UpsertThemeSegmentRenderCacheQueued`), den
der Hintergrund-Worker (`StartSegmentRenderWorker`, `segment_render_worker.go:43-80`) abarbeitet.
Das ist ein **kurzer ffmpeg-Schnitt-Vorgang** (Sekunden bis wenige Minuten, abhängig vom
Quell-Stream), **kein** Neucodieren der kompletten Episode.

**"Re-Encode" (was NICHT passiert und wovor der Nutzer sich sorgt):** Es gibt im gesamten
Segment-Subsystem **keinen** Codepfad, der `release_variants`, `media_assets` oder die
Episoden-Videodatei selbst verändert. Jede Zeitänderung berührt ausschließlich
`theme_segments`/`theme_segment_playback_sources`/`theme_segment_render_cache`.

**Fazit Frage 4:** Anliegen 1 ("kein Re-Encode") ist für reine Zeitänderungen an einem Segment
**bereits heute erfüllt** — der bestehende Mechanismus invalidiert nur den abgeleiteten
Vorschau-Clip. Die eigentliche Herausforderung von D-01 ist nicht "kein Re-Encode", sondern "keine
Verdopplung der Segment-Identität" bei einer Einzel-Folgen-Korrektur — dafür gibt es aktuell **keinen**
Mechanismus (jede Korrektur einer einzelnen Folge bedeutet heute zwangsläufig ein neues
`theme_segments`-Row, weil jede Folge ohnehin schon ihr eigenes Row hat, s. o.).
`[VERIFIED: segment_render_worker.go, segment_render_refresh.go, segment_stream.go]`

## Anzeige-Herkunft (Frage 5)

### Admin (`SegmenteTab.tsx`)

Die Admin-Tabelle lädt **alle** Segmente eines Anime, gefiltert nach `group_id`+`version` (nicht
nach Episode!): `getAnimeSegments(animeId, groupId, version, ...)` in
`useReleaseSegments.ts:112` → Backend `ListAnimeSegments`
(`admin_content_anime_themes.go:371-467`), Query filtert nur `t.anime_id = $1` plus optional
`ts.fansub_group_id`/`ts.version` (Zeilen 407-421) — **keine** Filterung nach `start_episode`/
`end_episode` gegenüber der aktuell geöffneten Folge. Stattdessen markiert die UI die Zeile nur
visuell als "aktiv" (`isSegmentActiveForEpisode`, `SegmenteTab.helpers.tsx:174-181`,
`styles.tableRowActive`, `SegmenteTab.tsx:574-578`). Das heißt: Wer die Editor-Seite für Folge 1
öffnet, sieht dieselbe (identisch benannte, aber technisch eigenständige) "OP Kara"-Zeile wie beim
Öffnen für Folge 2 — weil, wie oben belegt, für jede Folge ein **eigener** Datensatz existiert.

### Öffentlich (Release-Detailseite, Phasen 103/105)

`ThemeTimeline` (`frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx`)
rendert exakt die Segmente, die ihm als Prop übergeben werden
(`releaseDetailPageData.tsx:95-98`: `segments={detail.segments}`), ohne jede Vergleichslogik zu
Nachbar-Episoden. Die Quelle ist `GetPublicReleaseDetail` →
`loadReleaseSegments(releaseVersionID, ...)`
(`backend/internal/repository/release_detail_public_repository_helpers.go:84-107`):

```sql
FROM theme_segment_playback_sources src
JOIN release_variants rv ON rv.id = src.release_variant_id
JOIN theme_segments ts ON ts.id = src.theme_segment_id
...
WHERE rv.release_version_id = $1
```

Diese Query liefert **nur** Segmente, deren (einzige) Playback-Bindung auf eine `release_variant_id`
zeigt, die zu **genau dieser** `release_version_id` (= genau dieser Folge) gehört. Weil in der Praxis
pro Folge ein eigenständiges `theme_segments`-Row mit eigener Playback-Bindung existiert (s. o.),
zeigt jede Folge "ihr eigenes" (aber inhaltlich identisches) OP/ED — das ist die vom Nutzer
beobachtete Wiederholung. **Es gibt keine Logik, die prüft, ob das Segment der Vorfolge inhaltlich
identisch war**, um die Anzeige zu unterdrücken.

`[VERIFIED: SegmenteTab.tsx, useReleaseSegments.ts, admin_content_anime_themes.go,
release_detail_public_repository_helpers.go, ThemeTimeline.tsx, releaseDetailPageData.tsx]`

## "Anderes Segment" vs. "andere Zeit" (Frage 6)

Im heutigen Datenmodell gibt es **keine explizite Kennung**, die zwei `theme_segments`-Rows als
"dasselbe konzeptuelle Segment, nur andere Zeit" markiert. Die einzige indirekte Näherung:

- `theme_id` — verweist auf `themes` (`anime_id` + `theme_type_id` + optionaler `title`,
  `database/migrations/0044_add_db_schema_v2_target_tables.up.sql:60-66`). Die Theme-Auflösung beim
  Anlegen eines Segments (`ensureThemeFromSelection`, `useReleaseSegments.ts:131-162`) sucht
  nach einem **existierenden** Theme mit passendem Typ + normalisiertem Titel und **wiederverwendet**
  dessen `theme_id`, statt immer ein neues Theme anzulegen (Zeilen 141-149). In der Praxis ist
  `theme_id` also meist **stabil** für "die eine OP dieses Anime".
- `fansub_group_id` + `version` — engt weiter auf "diese OP-Version dieser Gruppe" ein.

**Ableitung (kein bestehender Mechanismus, sondern Schlussfolgerung aus den Daten):** Zwei
`theme_segments`-Rows mit identischem Tripel `(theme_id, fansub_group_id, version)` sind mit hoher
Wahrscheinlichkeit "dasselbe" Segment über mehrere Folgen hinweg, auch wenn sie aktuell als getrennte
Rows existieren. Unterscheiden sich `start_time`/`end_time` zwischen zwei benachbarten Folgen bei
gleichem Tripel, ist das der gesuchte Fall "gleiches Segment, andere Zeit" (Kandidat für Override).
Ändert sich dagegen das Tripel (neues `theme_id`, andere Gruppe/Version) oder handelt es sich um ein
strukturell anderes Segment (z. B. andere `theme_type_id`, ED statt OP), ist das ein **echter
Segment-Wechsel**.

Dieses Tripel ist aber **keine erzwungene Datenbank-Garantie** — nichts hindert einen Admin daran,
zwei unterschiedliche `theme_id`s für dasselbe inhaltliche OP anzulegen (z. B. durch abweichenden
Titel-Text), was die Ableitung brechen würde. `[ASSUMED — funktional plausibel aus Code-Verhalten
abgeleitet, aber nicht durch einen DB-Constraint erzwungen; muss vor Planung bestätigt werden]`.

**Bestehendes Präzedenzbeispiel für "ein Bereich, ein Anker":**
`HasReleaseAssetSegmentUploadBlockedForRelease`
(`admin_content_anime_themes.go:2149-2188`) sperrt das Hochladen einer `release_asset`-Segmentdatei
für alle Folgen eines Bereichs **außer** der Start-Folge (`ts.start_episode <> rc.episode_anchor`,
Zeile 2181) — das ist im Code bereits eine funktionierende Konvention "ein Bereich hat genau einen
kanonischen Anker (die Start-Folge), alle übrigen Folgen des Bereichs sind davon abgeleitet". Diese
Konvention existiert aber nur für den `release_asset`-Quelltyp, nicht generisch für Timing.

## Bestehende Write-Pfade für Segment-Timing (Frage 7)

| Pfad | Datei:Zeile | Löst Re-Render aus? | Löst Re-Encode aus? |
|------|-------------|----------------------|----------------------|
| `PATCH /api/v1/admin/anime/:id/segments/:segmentId` (`UpdateAnimeSegment`) | `admin_content_anime_theme_segments.go:330-486` | Ja, wenn `segmentRenderInputsChanged` true (Zeile 471) | Nein |
| `POST /api/v1/admin/anime/:id/segments` (`CreateAnimeSegment`) | `admin_content_anime_theme_segments.go:246-326` | Nein (neuer Cache wird erst bei explizitem "Vorbereiten"/`RenderSegment` erzeugt) | Nein |
| "Vorschlag übernehmen" (`adoptSuggestion`) | `SegmenteTab.tsx:269-286` | Ruft intern `create()` auf → wie oben, kein automatischer Render | Nein |
| Segment-Library-Reuse (`AttachSegmentLibraryAsset`) | `admin_content_anime_themes.go:797-941` | Löst `syncThemeSegmentPlaybackSourceTx` aus, aber **nicht** den Render-Refresh-Vergleich (der sitzt nur im HTTP-Handler-Pfad von `UpdateAnimeSegment`) | Nein |
| Datei-Upload als Segment-Quelle (`UploadSegmentAsset`/`BindUploadedSegmentAsset`) | `admin_content_anime_theme_segments.go:662-788`, `admin_content_anime_themes.go:1509-1656` | Nein (uploaded_asset braucht keinen Render-Cache, s. `resetAndQueueSegmentRenderAfterChange`, Zeile 60-62) | Nein |
| Manueller Render-Trigger (`RenderSegment`) | `segment_stream.go:186-274` | Ja (enqueue-only, Worker rendert asynchron) | Nein |

**Auffälligkeit:** `AttachSegmentLibraryAsset` ändert die Playback-Quelle (und damit potenziell die
Segment-Länge/den Fingerprint) über `syncThemeSegmentPlaybackSourceTx`, ruft aber **nicht** den
gleichen `segmentRenderInputsChanged`-Vergleich wie `UpdateAnimeSegment` auf — dort könnte ein
veralteter Render-Cache bestehen bleiben. Das ist ein bestehendes Risiko unabhängig von Phase 117,
aber relevant, falls ein künftiger Per-Folge-Override ebenfalls über einen Nicht-Handler-Pfad
geschrieben werden sollte.

## Öffentliche Seite — genaue Fundstelle (Frage 8)

Die Kara-Anzeige auf der öffentlichen Release-Detailseite (`/anime/[id]/group/[groupId]/releases/[releaseVersionId]`)
ist:

1. **Datenabruf (Backend):** `loadReleaseSegments`
   (`backend/internal/repository/release_detail_public_repository_helpers.go:84-107`) — liefert
   `PublicReleaseSegment[]` für **genau eine** `release_version_id`.
2. **Aggregation:** `GetPublicReleaseDetail` (Struktur `PublicReleaseDetail.Segments`,
   `release_detail_public_repository.go:127`) — reine Passthrough-Aggregation, keine
   Vorfolge-Vergleichslogik.
3. **SSR-Fetch:** `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx:95-98`
   übergibt `detail.segments` unverändert an die Client-Komponente.
4. **Rendering:** `ThemeTimeline.tsx:191-388` — zeigt Timeline-Balken + Karten für jedes Element im
   Array, ohne Kenntnis der Nachbar-Episode.

Für D-02 ("nur einmal am Spann-Beginn zeigen, erst bei echtem Wechsel erneut") müsste die
Entdopplungs-Entscheidung **vor** Schritt 1/2 getroffen werden (im Backend-Read, mit Zugriff auf die
Nachbar-Episode über den bereits vorhandenen `loadAdjacentReleases`-Mechanismus,
`release_detail_public_repository_helpers.go:109-134`, der schon Previous/Next-Release-Versionen für
die Navigation auflöst) — der Client (`ThemeTimeline.tsx`) müsste dafür nicht geändert werden, sofern
das Backend bereits ein bereinigtes Array liefert. Alternativ könnte das Frontend selbst bei
`ThemeTimeline` einen "erstes Auftreten"-Filter erhalten, wenn ihm zusätzlich die Segmente der
Vorfolge übergeben würden — das würde aber eine neue Prop und einen zusätzlichen serverseitigen Read
erfordern.

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen nutzen | Warum |
|---------|--------------------|---------------------|-------|
| ffmpeg-Schnitt/Cache-Invalidierung | Eigene Render-Queue-Logik | Bestehender `theme_segment_render_cache` + `segmentRenderInputsChanged`-Mechanismus (`segment_render_refresh.go`) erweitern | Race-Condition-Schutz (Einzel-Worker-Goroutine, `StartSegmentRenderWorker`) ist bereits gelöst; ein Parallelmechanismus würde dieses Schutzniveau unterlaufen |
| Segment-Identität über Episoden hinweg | Neue Fuzzy-Matching-Heuristik "ist das dasselbe Segment" | Bestehendes `(theme_id, fansub_group_id, version)`-Tripel als Ausgangspunkt, ggf. um explizites Gruppen-/Serien-Feld ergänzen | Vermeidet Rate-Fehler bei Textvergleichen; nutzt die bereits vorhandene, teilweise stabile Theme-Wiederverwendung (`ensureThemeFromSelection`) |
| Episoden-Navigation/Adjazenz | Eigene "vorherige Folge"-Query | Bestehendes `loadAdjacentReleases` (`release_detail_public_repository_helpers.go:109-134`) | Bereits korrekt sortiert nach `sort_index`/`number_decimal`, inkl. Edge Cases für lückenhafte Episodennummerierung |

**Key insight:** Die größten Umsetzungsrisiken liegen nicht im Fehlen von Bausteinen, sondern darin,
dass zwei bestehende Bausteine (Bereichs-Spalten vs. 1:1-Playback-Bindung) sich aktuell
**gegenseitig widersprechen**: Der eine erlaubt "ein Segment über viele Folgen", der andere erzwingt
"eine Playback-Quelle pro Segment". Jede Umsetzung muss diesen Widerspruch explizit auflösen, bevor
neue Felder ergänzt werden.

## Risiken

1. **Render-Cache-Invalidierung bei geteilten Segmenten:** Wenn künftig ein Master-Segment mehrere
   Folgen mit unterschiedlichen Overrides bedient, muss der Cache-Schlüssel
   (`services.BuildSegmentRenderCacheKey`, referenziert in `segment_render_refresh.go:122-129`)
   pro **aufgelöster Folge** eindeutig sein — aktuell ist der Cache 1:1 an `theme_segment_id`
   gebunden (kein Folgen-Diskriminator). Ohne Anpassung würde ein Override für Folge 7 denselben
   Cache-Eintrag wie Folge 1 überschreiben oder kollidieren.
2. **1:1-Playback-Bindung:** Wie oben belegt, verträgt `theme_segment_playback_sources` aktuell nur
   eine Variante pro Segment. Jede Lösung für D-01 muss entweder (a) pro Folge weiterhin ein eigenes
   Segment-Row führen (aktuelles Muster, additiv um ein Gruppen-Merkmal + Override-Feld erweitert)
   oder (b) die Playback-Bindung auf "eine Bindung pro (Segment, Folge)" umbauen — Option (b) ist ein
   deutlich größerer Eingriff mit Migrationsbedarf für `theme_segment_playback_sources` und alle
   Konsumenten (`segment_stream.go`, `segment_render_worker.go`, `release_detail_public_repository_helpers.go`).
3. **Fehlende Bereichsfilterung in `resolved_variant`:** Die bestehende Variantenauflösung
   (`admin_content_anime_themes.go:1366-1391`) prüft nicht, ob die gefundene Episode überhaupt im
   Bereich `start_episode..end_episode` liegt. Das ist unabhängig von Phase 117 bereits ein
   Korrektheitsrisiko, das bei jeder Weiterentwicklung des Bereichs-Konzepts mit behandelt werden
   sollte.
4. **Test-Abdeckung ist oberflächlich:** Die vorhandenen Tests zu Playback-Auflösung
   (`backend/internal/repository/segment_playback_resolution_test.go:64-105`) prüfen nur, ob
   bestimmte SQL-Fragmente **als String** im Quellcode vorkommen (z. B.
   `TestLoadThemeSegmentPlaybackSnapshotTx_ContainsReleaseVariantJoins`) — es gibt **keine**
   Integrationstests gegen eine echte Datenbank, die das tatsächliche Auflösungsverhalten bei
   mehreren Folgen im selben Bereich verifizieren. Jede Umsetzung von D-01/D-02 sollte echte
   DB-Integrationstests für Mehr-Folgen-Szenarien einführen.
5. **Inkonsistenter Render-Refresh-Trigger:** `AttachSegmentLibraryAsset` ändert die Playback-Quelle,
   löst aber nicht denselben Render-Invalidierungspfad wie `UpdateAnimeSegment` aus (s. Frage 7) —
   ein Override-Mechanismus, der über einen ähnlichen Nicht-Handler-Pfad schreibt, würde denselben
   Fehler wiederholen, wenn er nicht explizit dagegen abgesichert wird.
6. **Titel-basierte Theme-Wiederverwendung ist nicht garantiert stabil:** Die einzige Näherung für
   "Segment-Identität" (`theme_id` + `fansub_group_id` + `version`) hängt von exaktem
   Titel-Textabgleich beim Anlegen ab (`ensureThemeFromSelection`, normalisiert nur Groß/Klein +
   Trim, `useReleaseSegments.ts:50-52, 141-149`). Tippfehler oder bewusst unterschiedliche Titel
   (z. B. "OP1" vs. "OP 1") würden die Ableitung "gleiches Segment" fälschlich brechen.

## Umsetzungsumfang (Einschätzung, keine Entscheidung)

Zwei grundsätzlich unterschiedliche Stoßrichtungen sind mit dem bestehenden Modell vereinbar; beide
erfordern eine Entscheidung, die laut CONTEXT.md **Claude's Discretion nach Analyse** ist, aber
NICHT in dieser Analysephase getroffen wird:

**Option A — additiv, ohne Playback-Architektur anzufassen (geringeres Risiko):**
Bestehendes "ein Row pro Folge"-Muster beibehalten. Ergänzen um:
- Ein Gruppierungs-Merkmal, das mehrere Segment-Rows explizit als "dieselbe Serie" markiert
  (z. B. eine neue, nullable `segment_group_key`-Spalte oder Wiederverwendung von
  `(theme_id, fansub_group_id, version)` als impliziter Schlüssel ohne Schemaänderung).
- Ein Override-Feld, das eine Folge als "zeitlich abweichend, aber gleiche Gruppe" markiert (z. B.
  `is_time_override boolean` oder schlicht: abweichende `start_time`/`end_time` bei sonst gleichem
  Gruppierungsschlüssel wird automatisch als Override interpretiert, ohne neues Feld).
- Backend-Anpassung an `loadReleaseSegments`/`GetPublicReleaseDetail`, um bei identischem
  Gruppierungsschlüssel zur Vorfolge (via `loadAdjacentReleases`) die Anzeige zu unterdrücken.
- Kein Eingriff in `theme_segment_playback_sources` nötig, da jede Folge weiterhin ihre eigene
  Playback-Bindung behält.

**Option B — struktureller Umbau auf echten Bereichs-Datensatz (höheres Risiko):**
Ein `theme_segments`-Row deckt tatsächlich mehrere Folgen ab; pro Folge existiert optional eine
Override-Zeile (neue Tabelle `theme_segment_episode_overrides` o. ä.). Erfordert:
- Umbau von `theme_segment_playback_sources` von 1:1-pro-Segment auf 1:1-pro-(Segment, Folge).
- Anpassung von `resolved_variant`/`syncThemeSegmentPlaybackSourceTx`,
  `GetSegmentReleaseDuration`, `segmentRenderInputsChanged`, Render-Cache-Schlüsselbildung,
  `StreamSegment`, `loadReleaseSegments` — praktisch der gesamte in diesem Bericht dokumentierte
  Codepfad.
- Datenmigration bestehender Segmente (Bestandsdaten vermutlich bereits "ein Row pro Folge" —
  müsste vor Umsetzung durch eine echte Datenabfrage der Produktionsdatenbank verifiziert werden,
  was außerhalb des Rahmens dieser Analyse liegt).

**Empfehlung (unverbindlich, zur Diskussion in der Planungsphase):** Option A erreicht D-01/D-02
ohne die riskante 1:1-Playback-Umstellung und passt zum bestehenden "ein Row pro Folge"-Verhalten,
das der Erfassungs-Workflow ohnehin produziert. Option B wäre nur gerechtfertigt, wenn tatsächlich
Speicherplatz/Konsistenz-Duplizierung als eigenständiges Problem gelöst werden soll — das ist laut
CONTEXT.md nicht explizit gefordert (D-01/D-02 sprechen von Anzeige und Einzel-Zeit-Korrektur, nicht
von Datenmodell-Normalisierung als Selbstzweck).

## Sinnvolle Teilphasen (Vorschlag für die Planungsphase)

1. **Teilphase A — Entdopplungs-Logik (öffentlich):** Backend-Read `loadReleaseSegments`/
   `loadAdjacentReleases` um Vorfolgen-Vergleich erweitern; Anzeige unterdrücken bei identischem
   Gruppierungsschlüssel + identischer Zeit gegenüber der Vorfolge. Kein Schema-Eingriff nötig,
   nutzt nur Lesepfade.
2. **Teilphase B — Zeit-Override-Feld:** Neues, additives Feld/Tabelle für Einzel-Folgen-Override;
   Anpassung von `UpdateAnimeSegment`/`segmentRenderInputsChanged`, damit ein Override denselben
   Render-Invalidierungspfad wie eine normale Zeitänderung durchläuft.
3. **Teilphase C — Admin-UI für Override + Entdopplungs-Indikator:** `SegmenteTab.tsx`/
   `SegmentEditPanel.tsx` um eine Override-Eingabe und eine visuelle Kennzeichnung "Teil eines
   geteilten Segments, Zeit hier überschrieben" erweitern.
4. **(Optional, nur falls Option B gewählt wird) Teilphase D — Playback-Bindung pro Folge:**
   Struktureller Umbau von `theme_segment_playback_sources` — deutlich größerer, eigenständig zu
   planender Aufwand mit eigenem Research-Bedarf (insbesondere Datenmigration bestehender
   Produktionsdaten).

Die genaue Reihenfolge/Bündelung ist Sache der Planungsphase; diese Analyse liefert nur die
technische Grundlage für diese Entscheidung.

## Project Constraints (from CLAUDE.md)

Diese Phase ist reine Analyse — es wurden keine Dateien verändert. Für die **folgende**
Umsetzungsphase gelten laut `./CLAUDE.md` insbesondere:

- **Modularität:** Produktionsdateien ≤ 450 Zeilen. `admin_content_anime_themes.go` ist bereits sehr
  groß (2259 Zeilen als eine Datei gelesen) — jede Erweiterung um Override-Logik sollte in eine neue,
  fokussierte Datei ausgelagert werden (Konvention: bestehende Aufteilung in
  `admin_content_anime_theme_segments.go` (Handler) vs. `admin_content_anime_themes.go`
  (Repository) fortsetzen, ggf. weiter in z. B. `theme_segment_overrides.go` auftrennen).
- **Globales UI-System:** Jede neue Admin-UI (Override-Eingabe, Entdopplungs-Indikator) MUSS
  `@/components/ui`-Primitives nutzen (`SegmenteTab.tsx` nutzt bereits `Table`/`TableBody`/etc. aus
  `@/components/ui`, Zeilen 30-37 — dieses Muster fortsetzen, keine neuen nativen `<select>`/
  `<input>` einführen).
- **Sprachqualität:** Neue deutsche UI-Strings müssen korrekte Umlaute verwenden (bestehender Code
  hält sich bereits daran, z. B. "Bitte einen Typ auswählen." in `SegmenteTab.tsx:294`).
- **Data ownership / Workflow:** Jellyfin-Import-Konsistenz-Constraint gilt sinngemäß auch hier:
  Ein Zeit-Override darf niemals automatisch/unsichtbar geschehen — jede Änderung muss weiterhin
  über die bestehende explizite Admin-Formular-Bestätigung laufen (kein Automatismus, der Zeiten
  ohne Admin-Aktion überschreibt).
- **Brownfield/Kompatibilität:** Bestehende Segmente (aktuell "ein Row pro Folge") dürfen durch eine
  künftige Migration nicht brechen — jede Schemaänderung muss additiv/rückwärtskompatibel sein
  (Konvention: append-only SQL-Migrationen unter `database/migrations/`).

## Package Legitimacy Audit

Nicht anwendbar — diese Analysephase installiert keine Pakete und ändert keinen Code. Für eine
etwaige Umsetzungsphase sind mit hoher Wahrscheinlichkeit **keine neuen externen Abhängigkeiten**
nötig (ffmpeg-Aufruf, PostgreSQL-Migrationen und Go/TypeScript-Standardbibliothek genügen für beide
Optionen A und B).

## Validation Architecture

`workflow.nyquist_validation` ist in `.planning/config.json:19` `true` (nicht abwesend) — der
Abschnitt wird daher grundsätzlich erwartet. Da diese Phase jedoch **keinen Code** produziert, gibt
es keine Testkommandos zu dokumentieren. Für die Test-Infrastruktur relevant für eine künftige
Umsetzungsphase:

| Property | Value |
|----------|-------|
| Backend-Testframework | Go `testing` + `github.com/stretchr/testify` (`backend/go.mod`) |
| Bestehende Segment-Tests | `backend/internal/handlers/segment_stream_test.go`, `segment_render_worker_test.go`, `segment_render_refresh_test.go`, `segment_validation_test.go`, `backend/internal/repository/theme_segment_render_cache_test.go`, `segment_playback_resolution_test.go` (**Achtung:** überwiegend String-Pattern-Checks gegen Quellcode, keine DB-Integrationstests, s. Risiko 4) |
| Frontend-Testframework | Vitest 3 (`frontend/vitest.config.ts`) |
| Bestehende Segment-Tests (Frontend) | `SegmenteTab.test.tsx`, `ThemeTimeline.test.tsx` |
| Quick-Run-Befehl (Frontend) | `npm test` (in `frontend/`, gemäß Projekt-Konvention) |
| Quick-Run-Befehl (Backend) | `go test ./internal/...` (in `backend/`, gemäß Projekt-Konvention) |

### Wave 0 Gaps (für die Umsetzungsphase, nicht für diese Analyse)

- [ ] Echte DB-Integrationstests für `resolved_variant`/`GetSegmentReleaseDuration` bei
      Mehr-Folgen-Bereichen fehlen — aktuell nur String-Pattern-Tests.
- [ ] Test für Entdopplungs-Logik (Vorfolge identisch → keine erneute Anzeige) existiert noch nicht.
- [ ] Test für Override-Feld (Folge weicht ab → wird trotzdem als "gleiches Segment" erkannt)
      existiert noch nicht.

## Security Domain

`security_enforcement` ist in `.planning/config.json` nicht gesetzt (Default: aktiv). Für diese
reine Analysephase gibt es keinen Code-Angriffsvektor. Für eine künftige Umsetzungsphase relevant:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V4 Access Control | Ja | Bestehende Capability `release_version.segments.manage` (`database/migrations/0119_release_version_segments_manage_capability.up.sql:4-15`) muss auch für neue Override-Endpunkte gelten — bestehendes Muster `requireSegmentManage`/`authorizeSegmentManage` (`admin_content_anime_theme_segments.go:159-186`, `segment_stream.go:51-81`) wiederverwenden, nicht neu erfinden. |
| V5 Input Validation | Ja | Bestehende `validateSegmentTimes`/`parseClockToSeconds`-Validierung (`admin_content_anime_theme_segments.go:33-85`) muss auch für Override-Zeiten greifen (max. 4-Minuten-Fenster, Start < Ende, Laufzeit-Grenze). |
| V6 Cryptography | Nein | Kein neuer Kryptografie-Bedarf; bestehende Segment-Stream-Grants (`auth.CreateSegmentStreamGrant`/`CreatePublicSegmentStreamGrant`) unverändert weiterverwenden. |

### Bekannte Threat-Pattern für diesen Stack

| Pattern | STRIDE | Standard-Mitigation |
|---------|--------|------------------------|
| Pfad-Traversal bei Render-Cache-Dateien | Tampering | Bestehendes Muster `resolveControlledFilePath` (`segment_stream.go:91`, `segment_render_worker.go:130`) für jede neue Dateipfad-Operation weiterverwenden. |
| Unautorisierte Zeit-Manipulation ohne Berechtigungsprüfung | Elevation of Privilege | Bestehendes Capability-Gate (`requireSegmentManage`) für jeden neuen Override-Schreibpfad zwingend übernehmen — nicht nur für den Hauptpfad. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | `(theme_id, fansub_group_id, version)` ist in der Praxis eine stabile, aber nicht erzwungene Näherung für "dasselbe konzeptuelle Segment über Folgen hinweg" | "Anderes Segment vs. andere Zeit" | Falls Titel-Varianten/Tippfehler häufig unterschiedliche `theme_id`s erzeugen, würde eine darauf aufbauende Entdopplungs-/Override-Logik fälschlich neue Segmente erkennen oder umgekehrt zusammenlegen |
| A2 | Ein additiver Per-Folge-Override (Option A) lässt sich ohne Umbau von `theme_segment_playback_sources` sauber umsetzen | Umsetzungsumfang, Option A | Falls sich beim Planen herausstellt, dass Override-Zeiten doch eine eigene Render-Cache-Identität pro Folge brauchen, wäre auch Option A umfangreicher als hier eingeschätzt |
| A3 | Bestandsdaten (Produktions-DB) folgen überwiegend dem "ein Row pro Folge"-Muster, nicht dem theoretisch möglichen Bereichs-Muster | Umsetzungsumfang, Option B | Diese Analyse hat **keine** Produktionsdatenbank abgefragt (nur Code/Migrationen) — falls es doch nennenswerte bestehende Mehr-Folgen-Bereichs-Segmente gibt, müsste eine Migration deren Sonderfall behandeln |

## Open Questions

1. **Wie soll die Gruppierungs-Kennung für "dasselbe Segment" konkret aussehen (Option A)?**
   - Was wir wissen: `(theme_id, fansub_group_id, version)` ist die einzige heute verfügbare Näherung.
   - Was unklar ist: Ob das für den Nutzer ausreichend robust ist, oder ob eine explizite,
     admin-gesetzte Gruppierung (z. B. "gehört zu Serie X") gewünscht ist.
   - Empfehlung: In der Planungsphase/Diskussion mit Nutzer klären, bevor Schema-Entscheidung fällt.
2. **Gibt es in der Produktionsdatenbank bereits echte Mehr-Folgen-Bereichs-Segmente
   (`start_episode < end_episode`)?**
   - Was wir wissen: Das Schema erlaubt es, der Standard-UI-Workflow erzeugt es aber nicht aktiv.
   - Was unklar ist: Ob vereinzelt manuell (z. B. direkt per API) solche Segmente bereits existieren,
     die von einer künftigen Migration/Logik nicht überrascht werden dürfen.
   - Empfehlung: Vor Umsetzung eine schreibgeschützte Datenbank-Abfrage (`SELECT COUNT(*) FROM
     theme_segments WHERE end_episode > start_episode`) durchführen — außerhalb des Rahmens dieser
     Codebasis-Analyse.
3. **Soll die Entdopplungs-Regel auch rückwärts (vorherige Folge fehlt/wurde gelöscht) robust sein?**
   - Was wir wissen: `loadAdjacentReleases` liefert `nil`, wenn keine Vorfolge existiert
     (`release_detail_public_repository_helpers.go:109-134`).
   - Was unklar ist: Gewünschtes Verhalten am Anime-Anfang oder bei Lücken in der Episodenfolge.
   - Empfehlung: In der Planungsphase als expliziten Edge Case aufnehmen.

## Sources

### Primary (HIGH confidence — direkt gelesener Code/Migrationen)

- `database/migrations/0044_add_db_schema_v2_target_tables.up.sql` — Basistabellen `theme_types`,
  `themes`, `theme_segments`, `episode_theme_overrides`
- `database/migrations/0049_extend_theme_segments.up.sql` — Bereichs-/Zeitspalten
- `database/migrations/0051_extend_theme_segments_source.up.sql` — Quellfelder
- `database/migrations/0053_segment_library_identity.up.sql` — Reusable-Segment-Identität
- `database/migrations/0054_theme_segment_playback_sources.up.sql` — 1:1-Playback-Bindung
- `database/migrations/0058_rename_theme_types_kara.up.sql` — Umbenennung Theme-Typen
- `database/migrations/0059_release_version_media_schema.up.sql` — unabhängiges Medien-Schema
- `database/migrations/0119_release_version_segments_manage_capability.up.sql` — Capability-Gate
- `database/migrations/0122_theme_segment_render_cache.up.sql` — Render-Cache-Tabelle
- `backend/internal/models/admin_anime_themes.go`
- `backend/internal/repository/admin_content_anime_themes.go`
- `backend/internal/handlers/admin_content_anime_theme_segments.go`
- `backend/internal/handlers/segment_stream.go`
- `backend/internal/handlers/segment_render_worker.go`
- `backend/internal/handlers/segment_render_refresh.go`
- `backend/internal/models/theme_segment_render_cache.go`
- `backend/internal/repository/release_detail_public_repository.go`
- `backend/internal/repository/release_detail_public_repository_helpers.go`
- `backend/internal/repository/segment_playback_resolution_test.go`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx`
- `frontend/src/types/releaseDetail.ts`
- `.planning/phases/117-kara-segment-zeit-override-anzeige/117-CONTEXT.md`
- `./CLAUDE.md`

### Secondary (MEDIUM confidence)

- Keine — diese Analyse stützt sich ausschließlich auf direkt gelesenen Code/Migrationen der
  eigenen Codebasis, keine externen Quellen/Frameworks waren nötig.

### Tertiary (LOW confidence)

- Keine.

## Metadata

**Confidence breakdown:**
- Datenmodell: HIGH — vollständig aus Migrationsdateien + Go-Structs rekonstruiert, keine Annahmen
  nötig.
- Anzeige-Herkunft (Admin + öffentlich): HIGH — Codepfad von SQL-Query bis React-Komponente
  vollständig nachverfolgt.
- Umsetzungsempfehlung (Option A/B, Teilphasen): MEDIUM — technisch fundiert, aber eine Entscheidung
  des Nutzers/der Planungsphase, keine verifizierte Tatsache.
- Produktionsdaten-Realität (wie viele echte Mehr-Folgen-Segmente existieren bereits): LOW —
  außerhalb des Analyse-Zugriffs (keine DB-Abfrage durchgeführt), als offene Frage markiert.

**Research date:** 2026-07-28
**Valid until:** Diese Analyse ist codebasiert und ändert sich nur, wenn sich `theme_segments`/
`theme_segment_playback_sources`/die betroffenen Admin- oder Public-Dateien ändern — keine
zeitliche Verfallsfrist im klassischen Sinn, aber vor Planungsbeginn erneut gegen `git log` auf
Änderungen an den oben gelisteten Dateien prüfen.
