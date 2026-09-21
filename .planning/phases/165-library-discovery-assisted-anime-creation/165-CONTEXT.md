# Phase 165: Library Discovery und Assisted Anime Creation (Serien) - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Auf `/admin/anime/create` kommt ein zusätzlicher Einstieg „Aus meiner Bibliothek“: eine schlanke, paginierte Liste der Jellyfin-Library-Einträge (Series UND Movie) mit Status, aus der ein Eintrag in den BESTEHENDEN Create-Draft übergeben wird (AniSearch-Suche vorbelegt, Auswahl immer durch den Benutzer). Nach dem Anlegen aus diesem Assisted-Flow geht es bei Serien direkt zu den Episoden, danach zurück zur Discovery mit erhaltenem Kontext.

Verbindlicher Auftrag: `165-USER-REQUEST.md`. In dieser Phase: §1–§16, §25–§31, §33–§36 (Serien-Teil). Filme erscheinen in der Discovery und können über den bestehenden Create-Flow angelegt werden (AniSearch → anime.type = film); der eigene Film-Content-Flow (§17–§24, §32: Movie-Unit, Zuordnung ohne EpisodeNumber, Extras, Titel-Fallback) ist **Phase 166**.

Nicht in dieser Phase: alles aus §34, Film-Content-Flow (→ 166).

</domain>

<decisions>
## Implementation Decisions

### Aufteilung
- **D-01:** Auftrag wird auf zwei Phasen verteilt (Auftraggeber-Entscheidung 2026-09-21). 165 = Discovery + Create-Handoff + Serien-Post-Create + Kontext-Rücksprung; Movies sind in der Discovery sichtbar und anlegbar. 166 = Film-Content-Flow. Übergangsregel für 165: Nach Assisted-Create eines Films geht es auf die bestehende Edit-/Episoden-Seite des Anime (kein eigener Movie-Flow vor 166).

### Zustände und Existing Detection
- **D-02 (Auftraggeber-Entscheidung):** Zustand B („Anime existiert vielleicht schon, Jellyfin-Verbindung fehlt“) wird NICHT in der Liste per Titel-/Pfad-/Fuzzy-Abgleich erkannt, sondern erst **nach der AniSearch-Auswahl** über die vorhandene Dubletten-Prüfung (`services/anime_create_enrichment.go` → `FindAnimeBySource("anisearch:<id>")`, liefert `ExistingAnimeID`/`ExistingTitle`). Dort bekommt der Benutzer die Wahl „Mit bestehendem Anime verbinden“ / „Als neuen Anime anlegen“. Kein automatischer Create, keine automatische Verbindung.
- **D-03:** In der Liste gibt es damit zwei belastbare Zustände: „bereits vorhanden“ (exakte technische Referenz) und „offen“. Grundlage ist die vorhandene Batch-Abfrage `repository/admin_content_jellyfin_intake.go` `FindExistingAnimeByJellyfinIntakeRefs(seriesIDs, paths)`: Treffer über `jellyfin:<ItemId>` in `anime.source` oder `anime_source_links.source`, oder exakt gleiches `anime.folder_name`. Research muss belegen, ob die Pfad-Semantik für Movie-Items (Pfad = Datei statt Ordner) trägt; bis dahin zählt für Movies nur die Jellyfin-ID als sichere Referenz. Keine neue Path-Semantik ohne Writer/Reader-Analyse (§1).
- **D-04:** Filter: „Offen“ (Standard, enthält auch „teilweise“ aus D-15), „Bereits vorhanden“, „Ignoriert“ (D-17), „Alle“. Ein Filter „Zuordnung prüfen“ entfällt in der Liste (siehe D-02); intern bleibt nachvollziehbar, warum ein Eintrag „bereits vorhanden“ ist (welche Referenz gegriffen hat, z. B. als Hinweistext mit Link zum Anime).
- **D-05 (überarbeitet 2026-09-21 nach Auftraggeber-Szenario, ersetzt die erste Fassung):** Ein Anime kann **mehrere** Jellyfin-Ordner haben (Praxisfall: Anime zuerst über den deutschen Ordner mit den Quellen von Gruppe A angelegt; später, ohne es zu wissen, einen zweiten Ordner mit japanischem Namen und den Quellen von Gruppe B angelegt). „Mit bestehendem Anime verbinden“ **ergänzt** den neuen Ordner als zusätzliches `jellyfin:<ItemId>` in `anime_source_links`. `anime.source` und `anime.folder_name` (erster/Haupt-Ordner) werden **nie** überschrieben (kein forceSourceUpdate). AniSearch-Metadaten des bestehenden Anime bleiben unberührt. Research-Befund dazu: `ApplyAnimeMetadataFromJellyfin` schreibt heute nur `source`/`folder_name` und nur wenn leer – für D-05 ist deshalb ein additiver Schreibpfad nach `anime_source_links` nötig (UNIQUE(anime_id, source), ON CONFLICT DO NOTHING). Danach erkennt die bestehende Existenzprüfung (liest `anime_source_links`) den zweiten Ordner als „bereits vorhanden“; die Liste zeigt dazu, zu welchem Anime er gehört („zusätzlicher Ordner von …“).
- **D-14 (Auftraggeber-Entscheidung 2026-09-21):** Der Episoden-Import bekommt in Phase 165 eine Ordner-Auswahl, wenn ein Anime mehrere verbundene Jellyfin-Ordner hat (Haupt-Ordner vorausgewählt), damit die Dateien der zweiten Gruppe importierbar sind. Das Backend nimmt `JellyfinSeriesID` im Import-Request bereits an (`admin_episode_import.go:73`); ergänzt wird die Auswahl in der Oberfläche plus eine serverseitige Prüfung, dass nur mit diesem Anime verbundene Jellyfin-IDs angenommen werden (fail closed). Ohne weitere Ordner bleibt der Import unverändert.
- **D-15 (Auftraggeber-Entscheidung 2026-09-21):** Mehrstaffel-Ordner: Enthält ein Jellyfin-Series-Eintrag mehrere Staffeln, die bei AniSearch getrennte Anime sein können, bekommt er in der Liste den Status „teilweise“, solange nicht jede Jellyfin-Staffel einem Anime zugeordnet ist; aus demselben Ordner können weitere Anime angelegt/verbunden werden, die Zuordnung Staffel → Anime wählt immer der Benutzer (keine Automatik). Team4s speichert heute keine Staffel→Anime-Zuordnung. Research muss (a) klären, ob der Episoden-Import die Jellyfin-Staffel pro Episode bereits kennt/speichert und daraus ableitbar ist, und (b) sonst die kleinstmögliche additive Speicherung vorschlagen. Staffeldaten nur gebündelt abrufen (z. B. ein Items-Request mit IncludeItemTypes=Season je Library), nie ein Request pro Serie. **Erfordert die Lösung eine neue Tabelle/Migration oder eine neue Semantik in `anime_source_links.source`, wird der Entwurf dem Auftraggeber vor der Ausführung vorgelegt** (Plan mit Checkpoint).
- **D-17 (Auftraggeber-Entscheidung 2026-09-21):** „Ignorieren“ pro Bibliothekseintrag, rückgängig machbar. Ignorierte Einträge verschwinden aus „Offen“ und stehen im eigenen Filter „Ignoriert“ (dort „Nicht mehr ignorieren“). Speicherung additiv in einer kleinen neuen Tabelle (Jellyfin-Item-ID, ignoriert von user_id, Zeitpunkt), Migration nötig. Status-Priorität: bereits vorhanden > ignoriert > teilweise > offen.
- **D-18 (Auftraggeber-Entscheidung 2026-09-21):** Auf der Anime-Bearbeitungsseite werden alle verbundenen Jellyfin-Ordner angezeigt (Haupt-Ordner aus `anime.source`/`folder_name` plus zusätzliche aus `anime_source_links`, mit Name/Pfad, soweit ohne Einzelrequests ermittelbar – sonst nur ID). Zusätzliche Ordner lassen sich lösen (Eintrag aus `anime_source_links` entfernen, danach in der Bibliothek wieder „offen“). Der Haupt-Ordner wird hier nicht gelöst; er bleibt über den bestehenden Weg verwaltet. AniSearch-Links werden hier nicht angefasst.
- **D-19 (Auftraggeber-Entscheidung 2026-09-21):** Bibliotheksliste mit kurzem serverseitigen Cache (einige Minuten, begründen) plus Button „Aktualisieren“, der sofort neu von Jellyfin lädt. Nach Anlegen/Verbinden/Ignorieren/Lösen ist der Status des betroffenen Eintrags sofort korrekt (Status kommt aus der DB-Batch-Prüfung, nicht aus dem Jellyfin-Cache).
- **D-20 (Auftraggeber-Entscheidung 2026-09-21):** Unmittelbar vor dem Anlegen wird serverseitig erneut auf ein bestehendes Anime mit derselben `anisearch:<id>` geprüft. Bei Treffer kein stilles Doppelanlegen, sondern dieselbe Wahl „Mit bestehendem Anime verbinden“ / „Trotzdem neu anlegen“ (bewusste Bestätigung).
- **D-21 (Standard):** Verbinden, zusätzlichen Ordner lösen, Ignorieren und Nicht-mehr-ignorieren sind Admin-Aktionen mit Audit-Attribution per user_id (Projekt-Constraint „Observability“), über den bestehenden Audit-Mechanismus.
- **D-16:** Ein Ordner mit neuer Jellyfin-ID nach Umbenennen/Verschieben ist über denselben Weg lösbar (AniSearch-Auswahl → Dublette → zusätzlich verbinden). Das Aufräumen verwaister alter Verbindungen ist nicht Teil von 165 (deferred).

### Datenabruf und Performance
- **D-06 (Claude-Empfehlung, vom Auftraggeber nicht widersprochen):** Jellyfin kennt den Team4s-Status nicht, deshalb kann „nur offene, 50 pro Seite“ nicht direkt gegen Jellyfin geblättert werden. Vorgehen: schlanke Liste (Id, Name, Type, ProductionYear, Path, Bild-Tag) aus Jellyfin mit Series+Movie je erlaubter Library holen (wenige Requests, keine Detailrequests), Status mit EINER Batch-DB-Abfrage bestimmen, im Backend filtern, suchen und mit dem bestehenden Cursor-Muster paginieren. Kurzlebiger serverseitiger Cache ist erlaubt (Größe/TTL begründen). Poster über den bestehenden Bild-Proxy-URL-Aufbau, kein Request pro Item beim Rendern der Liste im Backend. Detaildaten (Preview) erst nach Auswahl.
- **D-07:** Budget als Gate: pro Discovery-Seite ≤ 1 DB-Query für die Existenz-Prüfung, Jellyfin-Requests unabhängig von der Seitenzahl (nur beim Cache-Aufbau, je Library), 0 Detailrequests vor Auswahl. Muss per Test belegt werden.

### Create-Handoff und AniSearch
- **D-08:** Auswahl übergibt in den BESTEHENDEN Create-Draft (kein zweiter Create-Flow). Übernommen: Jellyfin Item ID, Name, Path, Typ-Hint, Jahr, Poster/Assets wie heute bei der Jellyfin-Übernahme.
- **D-09:** AniSearch-Suche vorbelegt mit dem Jellyfin-Namen (Jahr/Ordnername nur als Hilfe). Nie automatische Auswahl, auch nicht bei genau einem Treffer (§13). AniSearch bleibt fachlich maßgeblich, bestehendes Merge-Verhalten bleibt.

### Post-Create und Kontext
- **D-10:** Nur der Assisted-/Discovery-Flow leitet nach erfolgreichem Create weiter (Serie → Episoden-Import/-Tab des neuen Anime; Film → bestehende Edit-/Episoden-Seite bis 166). Manuelle/direkte Create-Wege behalten ihr heutiges Verhalten.
- **D-11:** Discovery-Kontext (Filter, Suchbegriff, Seite/Cursor) über die URL erhalten und als Rücksprung-Link („Zurück zur Bibliothek“) durch Create und Episoden-Schritt mitgeben, damit der nächste offene Eintrag ohne neue Suche erreichbar ist.

### Constraints
- **D-12:** Kein Provider-Framework (§25), kein Source-Domain-Refactor (§26), keine neue Kopplung von Fansub-Releases an Jellyfin (§27). Bestehende Flows (§28) dürfen nicht regressieren (Tests J/K).
- **D-13:** Globale UI-Primitives aus `@/components/ui` und globale Design-Tokens Pflicht; keine nativen `<button>/<input>/<select>` im Feature-Code; deutsche Texte mit echten Umlauten; Produktionsdateien ≤ 450 Zeilen; kein N+1.

### Claude's Discretion
- Cache-Mechanik und Cursor-Format, Seitengröße (Richtwert 50).
- Ob Discovery als eigene Route unter /admin/anime/create/… oder als Tab/Modus der Create-Seite umgesetzt wird – solange die bestehenden Wege unverändert bleiben.
- Genaues UI der Verbinden/Neu-Entscheidung nach AniSearch-Auswahl, auf Basis der vorhandenen Duplicate-Anzeige.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/phases/165-library-discovery-assisted-anime-creation/165-USER-REQUEST.md` — vollständiger Auftrag (gilt für 165 und 166)
- `CLAUDE.md` — UI-Primitives, Umlaute, 450-Zeilen-Limit, GSD-auf-main
- `.planning/phases/161-jellyfin-12-kompatibilitaet-und-mediasource-import/161-CONTEXT.md` — Jellyfin-12-Transport, Quellenbindung (D-08: Release-Titel ≠ Dateiname)
- `.planning/phases/164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll/164-UAT.md` — GAP-12: Episodentyp aus anime.type (Enum `film` → episode_type `movie`)

### Code (Scout-Befund 2026-09-21)
- `backend/internal/handlers/jellyfin_client_series.go` — Jellyfin-Suche nur `IncludeItemTypes=Series`, je erlaubter Library ein Request (`jellyfinAllowedLibraryIDs`)
- `backend/internal/handlers/jellyfin_search.go` — nutzt `FindExistingAnimeByJellyfinIntakeRefs` bereits für die Direktsuche
- `backend/internal/repository/admin_content_jellyfin_intake.go` — Batch-Existenzprüfung (source / anime_source_links / folder_name)
- `backend/internal/handlers/jellyfin_intake_helpers.go` — `AlreadyImported` / `ExistingAnimeID`
- `backend/internal/services/anime_create_enrichment.go` — AniSearch-Dubletten-Prüfung `FindAnimeBySource`, Typ-Mapping movie/film
- `backend/internal/repository/admin_content_anime_create_v2.go` — Create inkl. anisearch-Source
- `backend/internal/repository/episode_import_repository_apply.go` — film→movie im Import
- `frontend/src/app/admin/anime/create/` — bestehender Create-Flow

### Bestand (read-only, 2026-09-21)
- 4 Anime, alle mit `source = jellyfin:<id>`, `folder_name` = Serienordner (z. B. `/media/Anime/Serie/Anime.TV.Sub/Naruto`), je ein `anisearch:<id>`-Link in `anime_source_links`. anime_type-Enum: tv, film, ova, ona, special, bonus.

</canonical_refs>

<code_context>
## Existing Code Insights

- Existenzprüfung ist bereits batchfähig (eine Query für viele IDs/Pfade) – für D-03 wiederverwenden.
- Jellyfin-Client unterstützt `Limit`/`StartIndex` (jellyfin_client.go) und pro Library Requests mit Dedup – für die Discovery-Liste um `Movie` erweitern, ohne die Direktsuche zu verändern.
- AniSearch-Dubletten-Prüfung existiert (enrichment) – Basis für D-02.

</code_context>

<specifics>
## Specific Ideas

- UI schlicht: Poster, Name, Typ, Jahr, Pfad, Status, Aktion. Keine Reporting-Oberfläche.
- Ziel: ~1500 Einträge zügig abarbeiten, „nächster offener Anime“ ohne neue Suche.

</specifics>

<deferred>
## Deferred Ideas

- Phase 166: Film-Content-Flow (§17–§24, §32).
- Aufräumen verwaister Jellyfin-Verbindungen (Ordner umbenannt/gelöscht → alte ID zeigt ins Leere), siehe D-16.
- Filesystem-Discovery, eigener Streaming-Pfad, source-unabhängiges Fansub-Release-Mapping (§34/§36) – später.

</deferred>

---

*Phase: 165-library-discovery-assisted-anime-creation*
*Context gathered: 2026-09-21*
