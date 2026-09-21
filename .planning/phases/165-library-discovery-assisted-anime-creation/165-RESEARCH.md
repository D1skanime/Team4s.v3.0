# Phase 165: Library Discovery und Assisted Anime Creation (Serien) - Research

**Researched:** 2026-09-21
**Domain:** Admin-Anime-Intake (Go/Gin-Backend, Next.js-Admin-Frontend), Jellyfin-12-Discovery, AniSearch-Merge
**Confidence:** HIGH (alle Kernfragen sind an echtem Code mit Datei:Zeile belegt; ein Teil zusätzlich live gegen die reale Jellyfin-12-Instanz verifiziert)

## Summary

Der bestehende Jellyfin-Intake-Code ist bereits sehr weit vorgebaut: Es gibt eine batchfähige
Existenzprüfung (`FindExistingAnimeByJellyfinIntakeRefs`), eine fertige "Jellyfin-Serie auswählen →
Vorschau laden → in Create-Draft übernehmen"-Pipeline (`handleJellyfinCandidateAdopt`), eine fertige
AniSearch-Merge-Logik mit Feldschutz für bereits gesetzte Werte (`mergeCreateDraftPayload` /
`resolveCreateAniSearchDraftMergeInputs`), einen fertigen (aber nicht für Discovery genutzten)
Cursor-Pagination-Baustein (`release_cursor_pagination.go`) und einen fertigen, leichtgewichtigen
Metadaten-Schreibpfad für bestehende Anime (`ApplyAnimeMetadataFromJellyfin` →
`ApplyJellyfinSyncMetadata`). Phase 165 kann und soll auf all diesen Bausteinen aufsetzen, statt sie
neu zu bauen — das deckt sich mit D-12 (kein Provider-Framework, kein Source-Refactor).

Eine Live-Prüfung der echten Jellyfin-12-Instanz (`http://192.168.235.100:8098`, Bibliothek
"Fansubs", `CollectionType=tvshows`) widerlegt eine zentrale Annahme des Auftrags: Es existiert in
dieser Bibliothek **kein einziges Jellyfin-Item vom Typ `Movie`** — auch Filme sind, weil die
Bibliothek als "tvshows" eingerichtet ist, technisch vom Typ `Series` mit einem Ordner-`Path` (nicht
Datei-`Path`). Die Unterscheidung Serie/Film muss daher weiterhin über die bereits vorhandene
Pfad-/Namens-Heuristik (`buildJellyfinIntakeTypeHint`) erfolgen, nicht über Jellyfins `Type`-Feld
oder eine `IncludeItemTypes=Series,Movie`-Abfrage. Das bedeutet auch: die vom Auftraggeber
befürchtete Movie-Pfad-Semantik ("Pfad = Datei statt Ordner", D-03) tritt in der aktuellen Bibliothek
nicht auf — jedes Item, Serie wie "Film", hat einen Ordner-`Path`. Die bestehende
`folder_name`-Existenzprüfung funktioniert damit für beide Fälle strukturell gleich.

Zusätzlich wurde eine reale Fehlkonfiguration gefunden: `JELLYFIN_ALLOWED_LIBRARY_IDS=5` in der
Live-`.env` ist **keine gültige Jellyfin-12-Bibliotheks-GUID** und lässt jede
`ParentId=5`-Anfrage mit HTTP 400 scheitern (live verifiziert). Die reale Bibliotheks-ID lautet
`5f65d0c8bdd71b782fc98205814a0d76`. Dieser Punkt ist keine Aufgabe dieser Phase (§26/D-12: keine
Datenänderung durch den Agenten; `.env` ist Konfiguration, keine Code-Änderung dieser Phase), muss
aber dem Auftraggeber/Planner explizit gemeldet werden, weil Discovery ohne eine korrekte Library-ID
keine Ergebnisse liefern kann.

**Primäre Empfehlung:** Discovery als neue Route/neuen Modus auf der Create-Seite bauen, die (1) das
volle Bibliotheks-Snapshot aus Jellyfin serverseitig cached (ein Request je erlaubter Library, slim
Fields, `Type=Series` — `Movie` liefert nachweislich 0 Treffer), (2) Status ausschließlich über die
bestehende Batch-Query `FindExistingAnimeByJellyfinIntakeRefs` bestimmt, (3) bei Auswahl exakt die
bestehende `handleJellyfinCandidateAdopt`/`PreviewAnimeIntakeFromJellyfin`-Pipeline aufruft, und (4)
nach AniSearch-Auswahl die vorhandene `FindAnimeBySource`-Dublettenprüfung um eine echte
"Verbinden"-Option erweitert, die den bereits vorhandenen `ApplyAnimeMetadataFromJellyfin`-Endpunkt
nutzt (aktuell schreibt dieser Endpunkt nur `anime.source`/`anime.folder_name`, nicht
`anime_source_links` — für die Existenzprüfung reicht das, da diese `anime.source` ohnehin prüft).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Jellyfin-Library-Snapshot (Discovery-Datenquelle) | API/Backend (Go-Handler, `jellyfin_client_series.go`-Familie) | — | Jellyfin-HTTP-Zugriff ist bereits ausschließlich backend-seitig gekapselt (API-Key darf nie ins Frontend) |
| Existenzprüfung (offen/bereits vorhanden) | API/Backend (`AdminContentRepository`) | Database (Postgres, Batch-Query) | Bereits als Batch-SQL-Query implementiert; muss Backend-seitig bleiben (kein Fan-out) |
| Discovery-Cache (kurzlebig, TTL) | API/Backend (in-memory oder Redis) | — | Redis ist bereits im Stack vorhanden (`docker-compose.yml`); kein neuer Infrastrukturbaustein nötig |
| Discovery-Liste/-Filter/-Pagination-UI | Browser/Client (Next.js Client-Component) | Frontend-Server (Route/Layout) | Analog zur bestehenden Create-Seite (Client-Controller-Pattern `useAdminAnimeCreateController`) |
| Create-Draft-Übernahme (Jellyfin→Draft) | Browser/Client (bestehender Controller) | API/Backend (`PreviewAnimeIntakeFromJellyfin`) | Bereits vollständig implementiert (`handleJellyfinCandidateAdopt`); Discovery ruft dieselbe Pipeline auf |
| AniSearch-Suche/-Merge | API/Backend (`AnimeCreateEnrichmentService`) | Browser/Client (Anzeige/Bestätigung) | Fachliche Wahrheit bleibt AniSearch; Merge-Logik ist bereits serverseitig mit Feldschutz umgesetzt |
| Dubletten-Entscheidung ("verbinden"/"neu") | Browser/Client (neue UI) | API/Backend (bestehender Redirect + neuer/erweiterter "verbinden"-Call) | Backend liefert heute nur Redirect-Info; die Entscheidungs-UI selbst existiert noch nicht |
| Post-Create-Weiterleitung (Serie→Episoden, Film→Edit) | Browser/Client (Redirect-Logik in Create-Controller) | — | Bestehender Mechanismus (`buildManualCreateRedirectPath`) muss um einen Assisted-Zweig ergänzt werden |
| Discovery-Kontext-Erhalt (Filter/Suche/Cursor) | Browser/Client (URL-Query-Params) | Frontend-Server (Next.js `searchParams`) | Bestehendes Muster: `/admin/anime` liest bereits `searchParams.created` serverseitig (`frontend/src/app/admin/anime/page.tsx:17`) |

## Standard Stack

Diese Phase führt **keine neuen externen Pakete** ein (weder npm noch Go-Module). Alle benötigten
Bausteine (Jellyfin-HTTP-Client, Cursor-Pagination-Helfer, AniSearch-Enrichment-Service,
UI-Primitives) existieren bereits im Repository. Deshalb entfällt die Package-Legitimacy-Gate-Pflicht
für neue Registry-Pakete; siehe Abschnitt "Package Legitimacy Audit" unten für die explizite
Begründung.

### Wiederverwendete interne Bausteine (kein "Standard Stack" im npm/pip-Sinn, aber verbindlich für die Planung)

| Baustein | Datei | Zweck | Warum wiederverwenden |
|----------|-------|-------|------------------------|
| Batch-Existenzprüfung | `backend/internal/repository/admin_content_jellyfin_intake.go` | 1 Query für viele Series-IDs/Pfade | Erfüllt D-07 (≤1 DB-Query) bereits strukturell |
| Jellyfin-Serien-Suche/-Client | `backend/internal/handlers/jellyfin_client_series.go` | HTTP zu `/Items` | Auth/Fehlerklassifizierung bereits vorhanden (`classifyJellyfinUpstreamError`) |
| Cursor-Pagination-Helfer | `backend/internal/repository/release_cursor_pagination.go` | Base64-Seek-Cursor, `limit+1`-Overfetch, „stiller Neustart" bei ungültigem Cursor | Exakt das "bestehende Cursor-Muster" aus CONTEXT.md/§9; encode/decode-Helfer sind generisch (`encodeCursorPair`/`decodeCursorPair`) |
| Bild-Proxy-URL-Aufbau | `backend/internal/handlers/group_assets_jellyfin.go:586` (`buildGroupMediaImageURL`) | Reine String-Konstruktion, kein HTTP-Call | Bereits von `buildAdminJellyfinIntakeSearchItem` für Poster/Banner/Logo/Backdrop genutzt — 0 Requests beim Listenaufbau |
| AniSearch-Dubletten-Check | `backend/internal/services/anime_create_enrichment.go:1201-1212` (`Enrich`, `FindAnimeBySource`) | Prüft `anisearch:<id>` gegen `anime.source`/`anime_source_links` | Ist bereits die Quelle für D-02; muss nur um eine echte "trotzdem neu anlegen"-Option ergänzt werden |
| Jellyfin→Draft-Adoption | `frontend/.../useAdminAnimeCreateController.ts:904-941` (`handleJellyfinCandidateAdopt`) | Lädt Preview, hydriert Draft, setzt Asset-Slots | Ist bereits exakt D-08; Discovery muss nur denselben Preload mit vorausgewählter `candidateID` triggern |
| Leichtgewichtiger Metadaten-Schreiber für bestehenden Anime | `backend/internal/handlers/jellyfin_metadata_resync.go:134-296` (`ApplyAnimeMetadataFromJellyfin`) | Schreibt `source`/`folder_name` (+ optional Assets) ohne Episodenimport | Bester Kandidat für D-05 "Verbinden"; schützt bereits gesetzte Felder (`buildMetadataFieldPreview`, Aktion `protect`) |

### Alternativen Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Leichter Metadaten-Apply für "Verbinden" (D-05) | Voller `SyncAnimeFromJellyfin`-Endpunkt (`jellyfin_sync.go`) | Voller Sync erzwingt zusätzlich einen kompletten Episodenimport (schlägt fehl, wenn 0 Episoden akzeptiert werden, `jellyfin_sync.go:116-121`) — für ein reines "Referenz setzen" unnötig schwergewichtig |
| Neue Discovery-Cursor-Codierung | Bestehendes `encodeCursorPair`/`decodeCursorPair` aus `release_cursor_pagination.go` wiederverwenden, aber mit eigenem Schlüssel (z. B. `(name, jellyfin_item_id)`) | Discovery sortiert eine im Speicher aufgebaute/gecachte Liste, keine SQL-`ORDER BY`-Sequenz — die Kodierungs-/Overfetch-Mechanik ist reif, der Seek-Schlüssel selbst muss neu definiert werden |
| `IncludeItemTypes=Series,Movie` (laut §4/§17 des Auftrags) | `IncludeItemTypes=Series` (unverändert) + bestehende Pfad/Namens-Heuristik für die Typanzeige | Live verifiziert: `Movie` liefert 0 Treffer in der gesamten Instanz (siehe unten); `Series,Movie` liefert exakt dieselben 2111 Treffer wie `Series` allein |

## Package Legitimacy Audit

Diese Phase installiert keine neuen externen Pakete (weder `npm install` noch `go get`). Alle in
"Standard Stack" gelisteten Bausteine sind bereits im Repository vorhanden und in Produktion. Die
Package-Legitimacy-Gate-Pflicht (slopcheck etc.) entfällt daher; sollte der Planner im Rahmen dieser
Phase doch eine neue Abhängigkeit für nötig halten, muss die Gate-Prüfung zu diesem Zeitpunkt
nachgeholt werden.

**Packages removed due to slopcheck [SLOP] verdict:** keine (keine neuen Pakete)
**Packages flagged as suspicious [SUS]:** keine (keine neuen Pakete)

## §1 — source / source_links / folder_name / Jellyfin Path: vollständige Lese-/Schreib-/Vergleichs-Map

### `anime.source` (Spalte, Freitext, kein UNIQUE-Constraint — nur Index `idx_anime_anisearch_id` auf `anisearch_id`, nicht auf `source`)

| Aktion | Ort | Bedingung | Beleg |
|--------|-----|-----------|-------|
| WRITE (Create) | `createAnimeV2` (INSERT `anime.source`) | Beim manuellen/assisted Create, wenn `input.Source` gesetzt ist | `backend/internal/repository/admin_content_anime_create_v2.go:182-185` |
| WRITE (Create, Legacy-Schema) | `createAnimeLegacy` | Schema ohne `slug`-Spalte (Altbestand) | `backend/internal/repository/admin_content_anime_create_v2.go:33-38` |
| WRITE (Resync/Edit, bedingt) | `ApplyJellyfinSyncMetadata` (UPDATE) | Nur wenn (a) `forceSourceUpdate=true` **und** neuer Wert nicht leer, **oder** (b) aktueller Wert leer/NULL **und** neuer Wert nicht leer — sonst bleibt der Wert unverändert (kein Overwrite) | `backend/internal/repository/admin_content_sync.go:212-219` |
| WRITE-Trigger 1 (voller Episodensync) | `SyncAnimeFromJellyfin` | `forceSourceUpdate := (JellyfinSeriesID explizit übergeben)`; schreibt erst NACH erfolgreichem Episodenimport | `backend/internal/handlers/jellyfin_sync.go:136-139` |
| WRITE-Trigger 2 (reiner Metadaten-Apply, kein Episodenimport nötig) | `ApplyAnimeMetadataFromJellyfin` | `forceSourceUpdate := (explicitSeriesID != "")`; schreibt sofort, ohne Episoden zu importieren | `backend/internal/handlers/jellyfin_metadata_resync.go:195-204` |
| READ (Existenzprüfung, Legacy) | `findExistingAnimeByJellyfinIntakeRefsLegacy` | `anime.source = ANY($1::text[])` mit `$1` = `["jellyfin:<id>", ...]` | `backend/internal/repository/admin_content_jellyfin_intake.go:42-53` |
| READ (Existenzprüfung, V2-Schema) | `findExistingAnimeByJellyfinIntakeRefsV2` | Gleiche Semantik, plus Fallback über `anime_media`/`media_external`, falls `anime.source`-Spalte im Schema fehlt (`schema.HasSource == false`) | `backend/internal/repository/admin_content_jellyfin_intake.go:85-103` |
| READ (AniSearch-Dublette) | `FindAnimeBySource(ctx, "anisearch:<id>")` | Exakter String-Vergleich gegen `anime.source`/`anime_source_links.source` | `backend/internal/services/anime_create_enrichment.go:1201-1212`; Repo-Implementierung liegt außerhalb dieser Datei (Interface `AnimeCreateEnrichmentRepository`, `anime_create_enrichment.go:25`) |
| READ (Jellyfin-Kontext-Anzeige) | `jellyfinSeriesIDFromAnimeSource` | Extrahiert `jellyfin:`-Präfix aus `source` **oder** `source_links` fürs Edit-Panel | `backend/internal/handlers/jellyfin_metadata_resync.go:305` (Aufruf), Implementierung in `jellyfin_helpers.go`-Familie |
| COMPARE-Semantik | Exakter String-Vergleich `"jellyfin:" + trim(ItemID)` (case-sensitiv, kein Trimming von Sonderzeichen) | — | `buildJellyfinSourceTags`, `admin_content_jellyfin_intake.go:142-152` |

**Tatsächliche Semantik heute:** `anime.source` ist ein einzelnes "primäres Provenienz-Tag"
(`jellyfin:<id>` ODER `anisearch:<id>`, nie beides gleichzeitig in dieser Spalte — die AniSearch-ID
überschreibt beim Create das Jellyfin-Source-Tag in derselben Spalte, siehe
`buildAniSearchDraftPayload`: `Source: "anisearch:" + anime.AniSearchID`,
`anime_create_enrichment.go:1357`). Die Jellyfin-Referenz eines Anime, der über AniSearch angelegt
wurde, landet dann **nicht** in `anime.source`, sondern (falls beim Create als `SourceLinks`
übergeben) in `anime_source_links`. Das ist konsistent mit dem Bestand (`165-CONTEXT.md`: "4 Anime,
alle mit `source = jellyfin:<id>`, ... je ein `anisearch:<id>`-Link in `anime_source_links`" — hier
ist es umgekehrt gelagert, aber das Prinzip "eine Provenienz in `source`, weitere in
`anime_source_links`" ist dasselbe).

### `anime_source_links` (Tabelle, `UNIQUE(anime_id, source)` via `ON CONFLICT DO NOTHING`)

| Aktion | Ort | Bedingung | Beleg |
|--------|-----|-----------|-------|
| WRITE | `syncAnimeSourceLinks` | Nur beim Create (`createAnimeV2`), fügt `input.Source` (primär) + `input.SourceLinks` (Liste) ein, dedupliziert case-insensitiv über `normalizeDistinctStrings` | `backend/internal/repository/anime_source_links.go:15-46` |
| READ | `loadAnimeSourceLinks` | Sortiert nach `source ASC`, für Edit-/Kontext-Anzeige | `backend/internal/repository/anime_source_links.go:48-68` |
| READ (Existenzprüfung) | s.o. (`admin_content_jellyfin_intake.go:44`, `:96-102`) | `EXISTS (... asl.source = ANY($1))` | s.o. |
| **Kein WRITE bei Resync/Connect** | `ApplyJellyfinSyncMetadata`/`ApplyAnimeMetadataFromJellyfin` schreiben NUR `anime.source`/`anime.folder_name`, NICHT `anime_source_links` | — | `admin_content_sync.go:212-230` (kein `INSERT INTO anime_source_links` in diesem Pfad) |

**Konsequenz für D-05:** Wenn Discovery einen bestehenden Anime über
`ApplyAnimeMetadataFromJellyfin` "verbindet", landet die Jellyfin-Referenz in `anime.source` (sofern
dort noch leer) — nicht zusätzlich in `anime_source_links`. Für die künftige
Existenzprüfung reicht das (sie prüft beide Orte), aber falls der Anime bereits eine
`anisearch:`-Referenz in `anime.source` trägt (aus dem AniSearch-Create), wird `anime.source` durch
`ApplyJellyfinSyncMetadata` **nicht** überschrieben, außer `forceSourceUpdate=true` — genau das
tritt ein, wenn die Discovery-UI die Jellyfin-Serien-ID explizit mitgibt (`explicitSeriesID != ""`,
`jellyfin_metadata_resync.go:203`). Das würde die vorhandene `anisearch:`-Referenz in `anime.source`
mit `jellyfin:<id>` überschreiben. **Das ist ein Constraint, das der Planner explizit beachten
muss**: entweder die Anwendung schreibt die Jellyfin-Referenz stattdessen in `anime_source_links`
(neuer, aber minimaler Codepfad), oder D-05 wird bewusst so verstanden, dass `anime.source` bei
AniSearch-Anime unverändert bleiben soll und die Jellyfin-Referenz ausschließlich über
`anime_source_links` läuft. **[ASSUMED]** Dies ist keine im Code vorgefundene Tatsache, sondern eine
Lücke, die die Planung schließen muss (siehe Assumptions Log A1).

### `anime.folder_name` (Spalte)

| Aktion | Ort | Bedingung | Beleg |
|--------|-----|-----------|-------|
| WRITE (Create) | `createAnimeV2`/`createAnimeLegacy` | `input.FolderName` aus dem Draft (z. B. `appendJellyfinLinkageToCreatePayload` setzt `folder_name = preview.jellyfin_series_path`) | `admin_content_anime_create_v2.go:196-197`; Frontend: `frontend/.../create/createPageHelpers.ts:82-98` |
| WRITE (Resync/Connect, bedingt) | `ApplyJellyfinSyncMetadata` | Gleiche CASE-Logik wie `source`: nur wenn leer ODER `forceSourceUpdate=true` | `admin_content_sync.go:220-224` |
| WRITE (Edit-Merge, AniSearch) | `mergeAniSearchEditDraft` | `applyString("folder_name", &next.FolderName, incoming.FolderName)` — AniSearch liefert i. d. R. keinen `folder_name`, daher meist No-Op | `backend/internal/handlers/admin_content_anime_enrichment_edit.go:144` |
| READ (Existenzprüfung) | `anime.folder_name = ANY($2::text[])` | Exakter, case-sensitiver String-Vergleich, **keine** Normalisierung (kein Trailing-Slash-Trim, kein Path-Separator-Fold) | `admin_content_jellyfin_intake.go:51`, `:117` |
| READ (Anzeige/Fallback) | Episode-Version-Ordnerauflösung (`resolveEpisodeVersionFolderPath`, laut STATE.md-Eintrag 260915-dws) | Fallback, wenn Jellyfin nicht erreichbar ist | `.planning/STATE.md:1475` (Kontext, nicht Code) |

**Tatsächliche Semantik heute:** `folder_name` speichert exakt den Jellyfin-`Path`-String der Serie
zum Zeitpunkt des Create/Sync (kein eigenständiges, normalisiertes Konzept). Der Name ist irreführend
— es ist keine reine "Ordner-Bezeichnung" (z. B. `"Naruto"`), sondern ein **voller Pfad**
(z. B. `/media/Anime/Serie/Anime.TV.Sub/Naruto`, siehe Bestandshinweis in `165-CONTEXT.md:73`).

### Jellyfin `Path` (aus der Jellyfin-API, kein DB-Feld)

Live-Befund (siehe §2 unten): In der aktuell konfigurierten Bibliothek (`CollectionType=tvshows`)
ist `Path` für **jedes** Item — Serie oder "Film" — ein **Ordnerpfad**, niemals ein Dateipfad. Das
gilt auch für Items unter dem Movie-Unterordner (`/media/Anime/Movie/Anime.Film.Sub/...`). Die
Datei selbst liegt eine Ebene tiefer und ist nur über `/Shows/{id}/Episodes` → `MediaSources[].Path`
sichtbar, niemals über `Items[].Path` der Serie/des "Films" selbst.

## §2 — Movie-Pfade vs. `folder_name`-Existenzcheck (live verifiziert)

**Live-Prüfung durchgeführt** gegen `http://192.168.235.100:8098` (Jellyfin, aus `.env` via
`docker compose ps` bestätigt erreichbar, HTTP 200 auf `/System/Info` in 90 ms).

1. `Library/VirtualFolders` liefert genau **eine** relevante Bibliothek:
   `Name="Fansubs"`, `ItemId=5f65d0c8bdd71b782fc98205814a0d76`, `CollectionType=tvshows`, mit 8
   Ordner-Locations, darunter `/media/Anime/Movie/Anime.Film.Sub`.
2. `GET /Items?IncludeItemTypes=Movie&Recursive=true` (serverweit, ohne `ParentId`) liefert
   `TotalRecordCount: 0` — **es existiert kein einziges Jellyfin-Item vom Typ `Movie`** in dieser
   Instanz.
3. `GET /Items?IncludeItemTypes=Series,Movie&Recursive=true&ParentId=5f65d0c8bdd71b782fc98205814a0d76`
   liefert `TotalRecordCount: 2111`, alle mit `"Type": "Series"` — identisch zur reinen
   `IncludeItemTypes=Series`-Abfrage.
4. Von diesen 2111 Items liegen 78 unter `/media/Anime/Movie/Anime.Film.Sub/...` (z. B.
   `"009 Re:Cyborg"`, Id `bcdb7937656625bcc3b59a6e3e45403b`, `Path:
   "/media/Anime/Movie/Anime.Film.Sub/009 ReCyborg (2012)"`, `IsFolder: true`, `Type: "Series"`).
5. Detailabfrage der Episoden dieses "Films" (`GET /Shows/{id}/Episodes`) liefert genau **eine**
   Episode mit `MediaSources[0].Path =
   ".../009 ReCyborg (2012)/009 ReCyborg (2012)-NanaOne.mkv"`, `IndexNumber: 9`,
   `ParentIndexNumber: 0`. Jellyfins eigener Metadaten-Abgleich hat den Dateinamen ("009 ReCyborg")
   fälschlich als Episodennummer 9 einer Season-0-Folge interpretiert und einen Titel
   ("Cyborg 009 x Nittele \"ZIP!\"") aus einer Fremd-Metadatenquelle zugeordnet — ein konkretes,
   live beobachtetes Beispiel für die in §21–§24 des Auftrags beschriebene Fehlerklasse (relevant
   für Phase 166, hier nur dokumentiert, nicht behandelt).

**Schlussfolgerung für D-03:** Die befürchtete Situation ("Movie-`Path` = Datei statt Ordner")
**tritt in der aktuellen Konfiguration nicht auf**, weil die gesamte Bibliothek als `tvshows`
eingerichtet ist und Jellyfin deshalb jeden Titel — Serie wie Film — als `Series`-Item mit
Ordner-`Path` behandelt. Der bestehende `anime.folder_name = ANY($2::text[])`-Vergleich
(`admin_content_jellyfin_intake.go:51`) funktioniert für "Film"-Einträge strukturell **genauso** wie
für Serien: exakter String-Vergleich zweier Ordnerpfade. Das entkräftet D-03s Sonderregel ("bis
dahin zählt für Movies nur die Jellyfin-ID als sichere Referenz") **für diese konkrete Instanz** —
sie bleibt aber als Absicherung sinnvoll, falls jemals eine zweite, als `movies` typisierte
Jellyfin-Bibliothek hinzukommt (dort wäre `Type=Movie` real und `Path` typischerweise ein
Dateipfad). **[VERIFIED: reale Jellyfin-12-Instanz, Live-Abfrage 2026-09-21]**

**Praktische Konsequenz für D-06/§4/§17:** Eine Abfrage mit `IncludeItemTypes=Series,Movie` bringt in
dieser Instanz keinen Mehrwert gegenüber der bestehenden `IncludeItemTypes=Series`-Abfrage — sie
liefert nachweislich dieselben Treffer. Der Plan sollte trotzdem `Series,Movie` anfragen (kostet
nichts, ist zukunftssicher, falls je eine echte Movie-Bibliothek hinzukommt), darf sich aber **nicht**
darauf verlassen, dass Jellyfins `Type`-Feld zwischen Serie und Film unterscheidet. Die
Typ-Anzeige/-Filterung in der Discovery-Liste muss die bestehende Heuristik
`buildJellyfinIntakeTypeHint` (`jellyfin_intake_helpers.go:202-239`, Pfad-/Namens-Token wie
"movie"/"film"/"ova"/"special") wiederverwenden.

## §3 — Create-Seite: Post-Save-Navigation heute

**Aktuelles Verhalten (gilt für JEDEN erfolgreichen Create — manuell, Jellyfin-Direktflow,
AniSearch-Direktflow — es gibt heute keine Verzweigung):**

```
handleCreateSubmit() [useAdminAnimeCreateController.ts:671-784]
  → createManualAnimeAndRedirect(payload, { createAdminAnime, setLocationHref: () => undefined })
  → POST /api/v1/admin/anime  (oder .../anime/jellyfin-draft-Variante)
  → uploadCreatedAnimeAssets(response.data.id, ...)
  → setSuccessMessage(...)
  → window.setTimeout(() => {
        window.location.href = buildManualCreateRedirectPath(response.data.id)
     }, CREATE_REDIRECT_DELAY_MS)   // 1600 ms Verzögerung
```

`buildManualCreateRedirectPath(id)` liefert **immer** `/admin/anime?created=${id}#anime-${id}` —
die Admin-Anime-**Übersichtsliste**, mit dem neuen Eintrag hervorgehoben (Beleg:
`frontend/src/app/admin/anime/create/createPageHelpers.ts:21-29`, Aufruf in
`useAdminAnimeCreateController.ts:774-776`). Das entspricht exakt der im Auftrag (§15) beschriebenen
Ist-Situation ("Anime speichern → Liste → Anime erneut suchen → Edit → Episoden").

**Es gibt heute keinen Verzweigungspunkt** nach Anime-Typ oder nach Herkunft (Discovery vs. manuell).
Die Zielrouten für D-10 existieren als eigenständige Seiten:
- `/admin/anime/{id}/edit` (Editor, inkl. Jellyfin-Resync-Panel `AnimeJellyfinMetadataSection.tsx`)
- `/admin/anime/{id}/episodes` (Episoden-Übersicht, mit Link auf `/admin/anime/{id}/episodes/import`
  für den eigentlichen Jellyfin-Episodenimport — Beleg:
  `frontend/src/app/admin/anime/[id]/episodes/page.tsx:249-260`)

**Für D-10 nötig:** Der Create-Controller muss (a) wissen, dass der aktuelle Create-Vorgang aus
Discovery stammt (z. B. über einen Query-Param wie `?from=discovery` beim Aufruf der Create-Seite,
konsistent mit D-11), und (b) je nach `anime.type` nach dem Create entweder zu
`/admin/anime/{id}/episodes` (Serie) oder `/admin/anime/{id}/edit` (Film, bis Phase 166) statt zu
`/admin/anime?created=...` weiterleiten. Der bestehende Redirect für den manuellen/direkten Flow darf
dabei **nicht verändert** werden (D-10 explizit: "Nur der Assisted-/Discovery-Flow ... Manuelle/
direkte Create-Wege behalten ihr heutiges Verhalten").

**Offene Detailfrage für den Planer:** Soll das Ziel für Serien `/admin/anime/{id}/episodes`
(Übersicht, wörtlich "Episoden-Tab") oder direkt `/admin/anime/{id}/episodes/import` (der Jellyfin-
Importbildschirm, der die Serien-ID aus der Discovery direkt weiterverwenden könnte) sein? Beide
Routen existieren bereits; siehe Open Questions.

## §4 — Jellyfin-Draft-Aufbau und AniSearch-Merge (bestehende Pipeline, wiederzuverwenden)

**Schritt 1 — Jellyfin-Auswahl → Draft (bereits vollständig implementiert):**

`handleJellyfinCandidateAdopt(candidateID)` (`useAdminAnimeCreateController.ts:904-941`):
1. `jellyfinIntake.loadPreview(candidateID)` → `POST /admin/jellyfin/intake/preview`
   (`PreviewAnimeIntakeFromJellyfin`, Route: `admin_routes.go:90`) → liefert
   `AdminJellyfinIntakePreviewResult` mit `JellyfinSeriesID`, `JellyfinSeriesName`,
   `JellyfinSeriesPath`, `FolderNameTitleSeed`, `Year`, `Genre`, `Tags`, `AniDBID`, `TypeHint`,
   `AssetSlots` (Cover/Logo/Banner/Backgrounds/BackgroundVideo als Proxy-URLs) — Beleg:
   `jellyfin_intake_helpers.go:119-150`.
2. `hydrateManualDraftFromJellyfinPreview(manualDraftValues, preview, ...)` übernimmt diese Felder
   in den bestehenden manuellen Draft-State (derselbe State wie beim manuellen Anlegen).
3. `setJellyfinAssetSlots(hydrated.assetSlots)` — Assets werden separat gehalten (Cover/Banner/…).
4. `setHasAdoptedJellyfinPreview(true)`.

**Genau dieser Ablauf ist D-08.** Discovery muss keine neue Datenstruktur erfinden — sie muss
lediglich (a) dieselbe `candidateID` (Jellyfin Item-ID) an dieselbe Adopt-Funktion übergeben, entweder
direkt beim Laden der Create-Seite (Query-Param `?jellyfin_id=<id>`) oder über einen In-Page-Zustand,
wenn Discovery als Modus derselben Seite implementiert wird.

**Schritt 2 — AniSearch-Suche (D-09, aktuell NICHT vorbelegt):**

Recherchebefund: Der AniSearch-Suchbegriff-State `createAniSearchSearchQuery`
(`useAdminAnimeCreateController.ts:223`) wird **nicht automatisch** aus dem Jellyfin-Namen befüllt.
`buildAssetSearchSeedQuery()` (Zeilen 604-612) nutzt zwar `jellyfinPreview?.jellyfin_series_name` als
Fallback-Quelle, aber **nur für die Asset-Bildsuche**, nicht für das AniSearch-Suchfeld selbst. D-09
("AniSearch-Suche vorbelegt mit dem Jellyfin-Namen") ist damit ein **neues** Verhalten, das ergänzt
werden muss (z. B.: nach `handleJellyfinCandidateAdopt`, wenn `createAniSearchSearchQuery` noch leer
ist, `setCreateAniSearchSearchQuery(preview.jellyfin_series_name)` aufrufen — reine Vorbelegung,
keine automatische Suche/Auswahl).

**Schritt 3 — AniSearch-Auswahl → Merge (bereits vollständig implementiert, D-14/§14):**

`AnimeCreateEnrichmentService.Enrich()` (`anime_create_enrichment.go:1192-1268`):
1. Dublettencheck `FindAnimeBySource("anisearch:<id>")` (§7 unten).
2. `buildAniSearchDraftPayload(aniSearchAnime)` baut den AniSearch-Feld-Datensatz
   (`anime_create_enrichment.go:1345-1363`): Titel, Typ (`mapAniSearchFormatToAnimeType`, u. a.
   `"movie"/"film" → "film"`), Jahr, MaxEpisodes, Genre, Beschreibung, Source
   (`"anisearch:<id>"`), AltTitles, Tags.
3. `mergeCreateDraftPayload(&draft, aniSearchDraft, ...)` (`anime_create_enrichment.go:1405+`):
   AniSearch füllt **nur leere** Zielfelder; bereits gesetzte (Jellyfin- oder manuelle) Werte bleiben
   erhalten und werden in `manualFieldsKept` protokolliert (sichtbar in der UI-Zusammenfassung).
4. Frontend-seitig existiert eine zweite, gleichwertige Schutzschicht:
   `resolveCreateAniSearchDraftMergeInputs` (`createPageHelpers.ts:273-300`) markiert jedes Feld, das
   vom Jellyfin-Ausgangszustand (`jellyfinSnapshot`) abweicht, als `protectedFields` — diese werden in
   `hydrateManualDraftFromAniSearchDraft` (`useManualAnimeDraft.ts:132-139`) beim AniSearch-Merge
   **nicht** überschrieben.

**Ergebnis:** Jellyfin bleibt technische Quelle für `Path`/Assets, AniSearch überschreibt nur leere
oder AniSearch-eigene Felder — exakt der in §14 des Auftrags geforderte Zustand ist bereits
Code-Realität und darf **nicht verändert** werden (D-09: "bestehendes Merge-Verhalten bleibt").

## §5 — Jellyfin-`/Items`-Abfrage für Discovery: reale Messung (read-only, live)

**Umgebung:** `.env` → `JELLYFIN_BASE_URL=http://192.168.235.100:8098`,
`JELLYFIN_ALLOWED_LIBRARY_IDS=5` (fehlerhaft, siehe unten). Reale Instanz über
`docker compose ps` bestätigt erreichbar; Backend-Container läuft im selben Netzwerksegment.

**a) Anzahl konfigurierter/erlaubter Library-IDs:** `.env` enthält genau eine ID (`"5"`), aber diese
ist **keine gültige Jellyfin-GUID**. Live-Test:

```
GET /Items?IncludeItemTypes=Series&Recursive=true&ParentId=5&Limit=3
→ HTTP 400 {"errors":{"parentId":["The value '5' is not valid."]}}
```

Die reale Bibliotheks-ID (aus `GET /Library/VirtualFolders`) lautet
`5f65d0c8bdd71b782fc98205814a0d76` (Name "Fansubs", `CollectionType=tvshows`). **Mit dieser
korrekten GUID funktioniert der bestehende Code (`jellyfin_client_series.go:78-103`,
Filtered-Branch) einwandfrei** — das Problem liegt ausschließlich in der Konfigurationswert
`JELLYFIN_ALLOWED_LIBRARY_IDS=5`, nicht im Anwendungscode. **[VERIFIED: reale Jellyfin-12-Instanz,
Live-Abfrage 2026-09-21]** — dies ist keine Aufgabe dieser Phase, muss aber im Abschlussbericht als
Blocker für den produktiven Einsatz von Discovery vermerkt werden (siehe Open Questions).

**b) Anzahl HTTP-Requests für einen vollständigen Discovery-Cache-Aufbau:** Mit korrekter GUID
genügt **ein** Request für die gesamte Bibliothek (kein Requests-pro-Item, kein Requests-pro-Seite):

```
GET /Items?IncludeItemTypes=Series,Movie&Recursive=true&ParentId=5f65d0c8bdd71b782fc98205814a0d76
    &Fields=Path&EnableTotalRecordCount=true
→ HTTP 200, TotalRecordCount=2111, Items.length=2111
```

Bei mehreren erlaubten Libraries ergibt sich (analog zum bestehenden Muster in
`jellyfin_client_series.go:78-103`) **ein Request je Library** — unabhängig von der späteren
Seitenzahl der Discovery-Liste. Das erfüllt D-07 wörtlich ("Jellyfin-Requests unabhängig von der
Seitenzahl, nur beim Cache-Aufbau, je Library").

**c) Payload-Größe:** 1.456.865 Bytes (≈ 1,46 MB) für 2111 Items mit `Fields=Path` (zusätzlich
Standardfelder wie `ImageTags`, `BackdropImageTags`, `PremiereDate` etc., die Jellyfin immer
mitliefert). Für ein noch schlankeres Payload sollten nur wirklich benötigte `Fields` angefragt
werden (`Id,Name,Path,ProductionYear` reichen für D-06 — `Fields=Path` ist das Minimum, das zusätzlich
zu Default-Feldern nötig ist).

**d) Latenz:** 2,39 s für den vollständigen Bibliotheks-Fetch (2111 Items), 0,58 s für eine
`Limit=1`-Abfrage mit `EnableTotalRecordCount=true` (Netzwerk-Overhead + Jellyfin-interne
Aufbereitung). Für ein TTL-basiertes Caching (D-06 "Kurzlebiger serverseitiger Cache ist erlaubt")
ist das unkritisch, sollte aber asynchron/außerhalb des Request-Zyklus einer einzelnen
Discovery-Seite passieren (Cache-Warmup, nicht Cache-on-demand pro Seitenaufruf).

**e) Detailrequests:** Bestätigt 0 Detailrequests vor Auswahl — `buildAdminJellyfinIntakeSearchItem`
nutzt für Poster/Banner/Logo/Backdrop ausschließlich `buildGroupMediaImageURL` (reine
String-Konstruktion, `group_assets_jellyfin.go:586-595`), keinen zusätzlichen Jellyfin-HTTP-Call.
Der einzige "Detail"-Call (`getJellyfinSeriesIntakeDetail`, mit `ProviderIds,Genres,Tags`) passiert
ausschließlich beim `PreviewAnimeIntakeFromJellyfin`-Endpunkt, also erst nach Nutzerauswahl.

**f) Existenzprüfung pro Discovery-Seite:** `FindExistingAnimeByJellyfinIntakeRefs(seriesIDs, paths)`
ist bereits eine einzelne Batch-Query für beliebig viele IDs/Pfade
(`admin_content_jellyfin_intake.go:42-53`/`105-119`) — ≤ 1 DB-Query pro Seite ist strukturell
gegeben, solange Discovery sie einmal pro angeforderter Seite (mit den IDs/Pfaden dieser Seite)
aufruft.

## §6 — Bestehendes Cursor-/Pagination-Muster

**Fundort:** `backend/internal/repository/release_cursor_pagination.go` (vollständig gelesen).
Kernkomponenten:
- `DefaultCursorPageLimit = 24`, `MaxCursorPageLimit = 100` (Konstanten, Discovery kann eigene
  Werte definieren, Richtwert laut CONTEXT.md 50).
- `clampCursorLimit(limit)` — erzwingt gültigen Limit-Bereich.
- `trimCursorPage[T any](items, limit, cursorFn)` — generische "Limit+1-Overfetch"-Regel: Repository
  fragt `LIMIT limit+1` an; wenn mehr als `limit` Elemente zurückkommen, wird `has_more=true`
  gesetzt, das Element `limit+1` abgeschnitten und `next_cursor` aus dem letzten verbleibenden
  Element gebildet.
- `encodeCursorPair`/`decodeCursorPair` — Base64(`part1|part2`), generisch für zwei String-Teile.
- Spezialisierungen `encodeInt32Int64Cursor`, `encodeTimeInt64Cursor`,
  `encodeMixedReleaseCursor` (versioniert, z. B. `"release-v2|..."`) als Vorbild für einen eigenen,
  versionierten Discovery-Cursor.
- **Verhalten bei ungültigem/leerem Cursor:** "stiller Neustart" bei Seite 1, kein 400-Fehler
  (Kommentarblock `release_cursor_pagination.go:1-9`).

**Wichtige Einschränkung für Discovery:** Alle bisherigen Cursor-Verwender paginieren über eine
SQL-`ORDER BY`-Sequenz direkt in Postgres. Discovery hingegen baut die Grundmenge aus einem
gecachten Jellyfin-Snapshot (Application-Memory oder Redis) und reichert sie mit einer DB-Batch-Query
an — die Cursor-Position muss also gegen die **sortierte In-Memory-/Cache-Liste** aufgelöst werden
(z. B. Schlüssel `(Name, JellyfinItemID)` oder `(SortIndex)`), nicht gegen eine SQL-`WHERE`-Klausel.
Die Kodierungs-Bausteine (`encodeCursorPair` & Co.) sind trotzdem 1:1 wiederverwendbar; nur der
Seek-Vergleich muss neu geschrieben werden.

**Frontend-Pendant:** Kein fertiger "Cursor-Consumer-Hook" gefunden; `useNearViewportActivation`
(`frontend/src/hooks/useNearViewportActivation.ts:5`) ist ein reiner Intersection-Observer-Hook für
verzögertes Nachladen bei Sichtbarkeit — nutzbar für "Mehr laden"/Infinite-Scroll-UI, aber kein
State-Management für Cursor/Filter selbst. Letzteres existiert in der Codebasis nicht generisch und
müsste für Discovery neu (aber einfach) gebaut werden.

## §7 — AniSearch-Dedup/"Verbinden"-Flow (bestehend vs. für D-02 fehlend)

**Was heute existiert (Backend):**
- `Enrich()` prüft `FindAnimeBySource("anisearch:<id>")` **vor** dem eigentlichen AniSearch-Fetch.
  Bei Treffer wird **kein Draft** aufgebaut, sondern ein `AdminAnimeAniSearchEnrichmentRedirectResult`
  mit `Mode: "redirect"`, `ExistingAnimeID`, `ExistingTitle`, `RedirectPath` zurückgegeben
  (`anime_create_enrichment.go:1201-1212`, `RedirectPath` via `buildAdminAnimeEditPath(id)` =
  `/admin/anime/{id}/edit`, `anime_create_enrichment.go:1692` / gleichnamige Funktion auch in
  `admin_content_anime_enrichment_edit.go:210-212`).
- Der Edit-Flow (`LoadAnimeAniSearchEnrichment`, für einen bereits existierenden Anime, der eine
  AniSearch-ID nachträglich zugewiesen bekommt) macht denselben Check, gibt bei Konflikt aber HTTP
  409 mit `Mode: "conflict"` zurück (`admin_content_anime_enrichment_edit.go:39-58`).

**Was heute existiert (Frontend):**
- `CreateAniSearchIntakeCard.tsx:150-164` rendert bei `conflict` **ausschließlich** einen Link "Zum
  vorhandenen Anime wechseln" (`<Link href={conflict.redirectPath}>`). **Es gibt keine
  "Als neuen Anime anlegen"-Option in der bestehenden UI.** D-02s "Dort bekommt der Benutzer die
  Wahl 'Mit bestehendem Anime verbinden' / 'Als neuen Anime anlegen'" ist damit **kein reiner
  UI-Wrapper um Bestehendes**, sondern erfordert eine **neue** UI-Entscheidung plus (mindestens für
  "trotzdem neu anlegen") einen Weg, den bestehenden Backend-Block zu umgehen.
- DB-seitig gibt es **keinen UNIQUE-Constraint** auf `anime.source`/`anisearch_id` (nur ein
  Non-Unique-Index, `database/migrations/0008_expand_anime_episode_columns.up.sql:13`,
  `0045_reconcile_db_schema_v2_columns.up.sql:21`) — ein "trotzdem neu anlegen" ist auf DB-Ebene
  unkritisch möglich, es ist eine reine Backend-/Frontend-Entscheidung, ob/wie sie zugelassen wird.

**Für D-05 der bessere Schreibpfad (statt eines neuen Endpunkts):**
`POST /admin/anime/:id/jellyfin/metadata/apply` (`ApplyAnimeMetadataFromJellyfin`,
`jellyfin_metadata_resync.go:134-296`, Route `admin_routes.go:83`) — schreibt `source`/`folder_name`
(force, wenn `jellyfin_series_id` explizit mitgegeben wird) **ohne** einen Episodenimport zu
verlangen, und schützt bereits abweichende Werte (`buildMetadataFieldPreview`, Aktion `"protect"`,
`jellyfin_metadata_resync.go:433-446`). Die zugehörige UI existiert bereits im Editor
(`AnimeJellyfinMetadataSection.tsx`) und kann als Vorlage für einen Discovery-seitigen "Verbinden"-
Dialog dienen, der Backend-seitig denselben Endpunkt mit vorausgefüllter `jellyfin_series_id` aufruft.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────┐        ┌──────────────────────────────────────────────┐
│  Admin-Browser           │        │  Go-Backend (Gin)                             │
│  /admin/anime/create      │        │                                                │
│                          │        │  ┌──────────────────────────────────────────┐  │
│  [Neu] "Aus meiner        │  GET   │  │ GET /admin/jellyfin/discovery (NEU)      │  │
│   Bibliothek" Tab/Route  │───────▶│  │  1. Cache-Hit? → Snapshot aus Cache/Redis │  │
│                          │        │  │  2. Cache-Miss? → je erlaubter Library    │  │
│                          │        │  │     1x GET /Items (Series, slim Fields)   │  │
│                          │        │  │     zu Jellyfin (§5: 1 Request/Library)   │  │
│                          │        │  │  3. Filter/Suche/Cursor IM BACKEND         │  │
│                          │        │  │     auf dem (gecachten) Snapshot          │  │
│                          │        │  │  4. FindExistingAnimeByJellyfinIntakeRefs  │  │
│                          │        │  │     (1 Batch-Query je Seite, §5f)          │  │
│                          │        │  │  5. Poster-URLs via buildGroupMediaImageURL│  │
│                          │        │  │     (0 Requests, reine URL-Konstruktion)   │  │
│                          │        │  └──────────────────────────────────────────┘  │
│  Liste: Poster/Name/Typ/  │◀───────│                                                │
│  Jahr/Path/Status         │  JSON  │                                                │
│                          │        └──────────────────────────────────────────────┘
│  [Anime anlegen] klicken │
│         │                │        ┌──────────────────────────────────────────────┐
│         ▼                │  POST  │ POST /admin/jellyfin/intake/preview (BESTEHEND)│
│  handleJellyfinCandidate  │───────▶│  getJellyfinSeriesIntakeDetail (1 Detailcall)  │
│  Adopt(candidateID)       │◀───────│  → AdminJellyfinIntakePreviewResult            │
│  (bestehende Pipeline,   │  JSON  └──────────────────────────────────────────────┘
│   §4 Schritt 1)          │
│         │                │
│         ▼                │
│  Draft hydriert; AniSearch-Suchfeld mit Jellyfin-Name vorbelegt (NEU, D-09)         │
│         │                │
│         ▼  Benutzer sucht + wählt AniSearch-Treffer aktiv aus (nie automatisch)     │
│         │                │        ┌──────────────────────────────────────────────┐
│         ▼                │  POST  │ POST /admin/anime/enrichment/anisearch          │
│  Enrich(aniSearchID,      │───────▶│  FindAnimeBySource("anisearch:<id>") (BESTEHEND)│
│  draft)                   │        │  Treffer? → redirect (BESTEHEND, nur "wechseln")│
│                          │◀───────│  kein Treffer? → mergeCreateDraftPayload        │
│                          │  JSON  │  (Jellyfin-Felder geschützt, BESTEHEND, §4.3)   │
│                          │        └──────────────────────────────────────────────┘
│  NEU: Bei Treffer zusätzlich "Trotzdem neu anlegen" ODER "Verbinden"                │
│  "Verbinden" → POST /admin/anime/:id/jellyfin/metadata/apply (BESTEHEND, §7)        │
│         │                │
│         ▼  Create-Submit (bestehender Endpunkt, unverändert)                        │
│  NEU: Redirect-Zweig nach Herkunft "discovery" + anime.type                          │
│    Serie → /admin/anime/{id}/episodes                                               │
│    Film  → /admin/anime/{id}/edit   (bis Phase 166)                                 │
│    (manueller/direkter Flow: bestehender Redirect zu /admin/anime?created=… bleibt) │
│         │                │
│         ▼                │
│  "Zurück zur Bibliothek" mit erhaltenem Filter/Suche/Cursor (URL-Query, NEU, D-11)  │
└─────────────────────────┘
```

### Recommended Project Structure

```
backend/internal/handlers/
├── jellyfin_discovery.go            # NEU: GET /admin/jellyfin/discovery Handler
├── jellyfin_discovery_cache.go       # NEU: Cache-Aufbau/TTL, wrapt bestehenden searchJellyfinSeries-Client
├── jellyfin_client_series.go         # BESTEHEND: um Series+Movie IncludeItemTypes erweitern (additiv)
├── jellyfin_metadata_resync.go       # BESTEHEND: ApplyAnimeMetadataFromJellyfin für "Verbinden" wiederverwenden
backend/internal/repository/
├── admin_content_jellyfin_intake.go  # BESTEHEND: FindExistingAnimeByJellyfinIntakeRefs wiederverwenden
├── jellyfin_discovery_cursor.go      # NEU: Discovery-eigener Cursor-Seek (nutzt encodeCursorPair-Muster)
frontend/src/app/admin/anime/create/
├── DiscoveryLibraryPanel.tsx         # NEU: Liste/Filter/Pagination
├── discoveryPageHelpers.ts           # NEU: URL-Query-Param-Handling (Filter/Suche/Cursor), D-11
├── useAdminAnimeCreateController.ts  # BESTEHEND: handleJellyfinCandidateAdopt wiederverwenden/parametrisieren
├── createPageHelpers.ts              # BESTEHEND: buildManualCreateRedirectPath um Assisted-Zweig ergänzen
```

### Pattern 1: Cache-first Discovery-Snapshot

**Was:** Ein serverseitiger, TTL-begrenzter Snapshot aller Series-Items je erlaubter Library, gegen
den Filter/Suche/Cursor rein im Speicher/Cache ausgewertet werden — Jellyfin wird nur beim
(seltenen) Cache-Miss/Ablauf erneut angefragt.
**When to use:** Immer für die Discovery-Liste, nie pro Seite/Request neu gegen Jellyfin.
**Beispiel (Muster aus bestehendem Code ableiten):**
```go
// Anlehnung an jellyfin_client_series.go:78-103 (Multi-Library-Fan-out),
// aber Snapshot statt Direktanfrage:
func (h *AdminContentHandler) buildJellyfinDiscoverySnapshot(ctx context.Context) ([]jellyfinSeriesItem, error) {
    // ein Request je h.jellyfinAllowedLibraryIDs, IncludeItemTypes=Series,Movie,
    // Fields=Path (slim), dedupliziert nach Item-ID — wie searchJellyfinSeries,
    // aber ohne SearchTerm und mit vollständigem Recursive-Fetch statt Limit.
}
```

### Pattern 2: Batch-Existenzprüfung pro Seite, nicht pro Item

**Was:** `FindExistingAnimeByJellyfinIntakeRefs(seriesIDs, paths)` einmal pro ausgelieferter
Discovery-Seite aufrufen (mit den IDs/Pfaden genau dieser Seite), nie pro Item einzeln.
**Beispiel:** siehe `jellyfin_search.go:77-92` (exakt dieses Muster, dort für die Direktsuche).

### Anti-Patterns to Avoid

- **Jellyfin-Detailrequest pro Listeneintrag:** `getJellyfinSeriesIntakeDetail` liefert
  `ProviderIds,Genres,Tags,Overview` — das braucht die Liste nicht, nur die Vorschau nach Auswahl.
- **`Type`-Feld von Jellyfin als Serie/Film-Unterscheidung verwenden:** liefert in dieser Instanz
  immer `"Series"` (§2) — führt zu falschen/inexistenten "Film"-Badges, wenn man sich darauf verlässt.
- **`anime.source` bei "Verbinden" blind force-überschreiben:** kann eine bestehende
  `anisearch:<id>`-Referenz zerstören (§1); vor dem Force-Write prüfen, ob `anime.source` bereits ein
  `anisearch:`-Tag trägt, und ggf. stattdessen `anime_source_links` nutzen (siehe Assumptions Log A1).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Serie/Film-Erkennung aus Jellyfin-Daten | Neue Klassifikationslogik basierend auf `Type` | `buildJellyfinIntakeTypeHint` (`jellyfin_intake_helpers.go:202-239`) | Bereits vorhanden, korrekt für diese Instanz (§2), gepflegte Pfad-/Namens-Heuristik |
| Jellyfin→Draft-Übernahme | Neue Handoff-Datenstruktur/neuer Draft-Endpunkt | `handleJellyfinCandidateAdopt` + `PreviewAnimeIntakeFromJellyfin` (§4) | D-08 ist bereits vollständig gebaut |
| AniSearch-Merge mit Feldschutz | Neue Merge-Logik | `mergeCreateDraftPayload`/`resolveCreateAniSearchDraftMergeInputs` (§4) | Exakt die im Auftrag (§14) geforderte Schutzlogik existiert schon |
| Existenzprüfung (Batch) | Neue N+1-taugliche Prüfung pro Item | `FindExistingAnimeByJellyfinIntakeRefs` (§7, §5f) | Bereits Batch-fähig, erfüllt D-07 direkt |
| Cursor-Kodierung | Eigenes Base64/JSON-Format | `encodeCursorPair`/`decodeCursorPair`-Muster (§6) | Konsistent mit bestehendem Konventions-Stil im Repo |
| Bestehenden-Anime-Metadaten-Schreiber für "Verbinden" | Neuer Endpunkt, der nur `source`/`folder_name` setzt | `ApplyAnimeMetadataFromJellyfin` (§7) | Bereits vorhanden, inkl. Feldschutzlogik |

**Key insight:** Der größte Risikofaktor dieser Phase ist nicht fehlender Code, sondern das
Zusammenführen mehrerer bereits bestehender, aber bisher unabhängiger Pfade (Direktsuche-Adoption,
AniSearch-Redirect, Metadaten-Resync) zu einem neuen, Discovery-gesteuerten Ablauf, ohne die
bestehenden drei Pfade selbst zu verändern (D-12/§28).

## Common Pitfalls

### Pitfall 1: `JELLYFIN_ALLOWED_LIBRARY_IDS` ist aktuell fehlkonfiguriert
**What goes wrong:** Jede library-gefilterte Jellyfin-Anfrage (Discovery **und** die bestehende
Direktsuche, sobald `jellyfinAllowedLibraryIDs` nicht leer ist) schlägt mit HTTP 400 fehl, weil `"5"`
keine gültige Jellyfin-12-GUID ist.
**Why it happens:** Vermutlich Altwert aus einer früheren Jellyfin-Version oder ein Platzhalter, der
nie gegen die reale Bibliotheks-GUID (`5f65d0c8bdd71b782fc98205814a0d76`) aktualisiert wurde.
**How to avoid:** Der Planer sollte dies dem Auftraggeber explizit als Blocker melden (Env-Wert
korrigieren ist eine Konfigurationsänderung, keine Code-Änderung dieser Phase — D-12 verbietet
Datenänderungen durch den Agenten, nicht die Meldung eines Konfigurationsfehlers). Tests/Fixtures für
Discovery sollten unabhängig von diesem Live-Wert mit einer korrekten Test-GUID arbeiten.
**Warning signs:** Jede Live-Jellyfin-Anfrage mit `ParentId` liefert HTTP 400 "The value ... is not
valid."

### Pitfall 2: Jellyfins `Type=Movie` existiert nicht in dieser Bibliothekskonfiguration
**What goes wrong:** Code, der sich auf `item.Type == "Movie"` verlässt, um Filme zu erkennen, zeigt
in der Discovery-Liste **nie** einen Film an — obwohl 78 "Film"-Ordner vorhanden sind.
**Why it happens:** Die Bibliothek ist als `CollectionType=tvshows` eingerichtet; Jellyfin typisiert
in einer solchen Bibliothek konsequent alles als `Series`.
**How to avoid:** Ausschließlich die bestehende Pfad-/Namens-Heuristik nutzen (§2/§4).
**Warning signs:** `IncludeItemTypes=Movie` liefert 0 Treffer trotz sichtbarer Filme im
Dateisystem/Jellyfin-Web-UI.

### Pitfall 3: `forceSourceUpdate=true` beim "Verbinden" kann eine `anisearch:`-Referenz überschreiben
**What goes wrong:** Ein bestehender Anime mit `anime.source = "anisearch:12345"` verliert diese
Referenz, wenn "Verbinden" naiv `ApplyAnimeMetadataFromJellyfin` mit expliziter Jellyfin-Serien-ID
aufruft (force-Pfad, §1).
**Why it happens:** `ApplyJellyfinSyncMetadata`s CASE-Logik unterscheidet nicht nach Provider-Präfix,
nur nach "leer vs. force".
**How to avoid:** Vor dem Force-Write prüfen, ob `anime.source` bereits ein `anisearch:`-Präfix
trägt; falls ja, Jellyfin-Referenz stattdessen in `anime_source_links` schreiben (kleine Erweiterung
nötig) statt `anime.source` zu überschreiben.
**Warning signs:** Nach "Verbinden" verschwindet die AniSearch-Zuordnung eines Anime aus
`anime.source` (sichtbar z. B. im Jellyfin-Kontext-Panel des Editors).

### Pitfall 4: Discovery-Cursor gegen einen gecachten Snapshot, nicht gegen SQL
**What goes wrong:** Naive Wiederverwendung von `encodeInt32Int64Cursor`/`decodeInt32Int64Cursor` als
SQL-Seek-Schlüssel funktioniert nicht, weil die Grundmenge nicht aus einer SQL-`ORDER BY`-Sequenz
stammt, sondern aus einem im Speicher/Cache sortierten Jellyfin-Snapshot.
**How to avoid:** Kodierungs-Helfer wiederverwenden, aber den Seek-Vergleich gegen die
Snapshot-Sortierreihenfolge (z. B. `(Name, JellyfinItemID)`) neu implementieren.

## Code Examples

### Batch-Existenzprüfung aufrufen (bestehendes Muster für Discovery-Seiten)
```go
// Source: backend/internal/handlers/jellyfin_search.go:77-92
seriesIDs := make([]string, 0, len(items))
paths := make([]string, 0, len(items))
for _, item := range items {
    if trimmed := strings.TrimSpace(item.ID); trimmed != "" {
        seriesIDs = append(seriesIDs, trimmed)
    }
    if path := strings.TrimSpace(item.Path); path != "" {
        paths = append(paths, path)
    }
}
existingMatches, err := h.repo.FindExistingAnimeByJellyfinIntakeRefs(c.Request.Context(), seriesIDs, paths)
```

### Cursor-Overfetch-Regel (wiederverwendbares Muster)
```go
// Source: backend/internal/repository/release_cursor_pagination.go:50-61
func trimCursorPage[T any](items []T, limit int, cursorFn func(item T) string) (page []T, nextCursor *string, hasMore bool) {
    page = items
    if len(page) > limit {
        hasMore = true
        page = page[:limit]
    }
    if hasMore && len(page) > 0 {
        c := cursorFn(page[len(page)-1])
        nextCursor = &c
    }
    return page, nextCursor, hasMore
}
```

### Poster-URL ohne Jellyfin-Request (reine String-Konstruktion)
```go
// Source: backend/internal/handlers/group_assets_jellyfin.go:586-595
func buildGroupMediaImageURL(itemID string, kind string, index *int) string {
    values := url.Values{}
    values.Set("provider", "jellyfin")
    values.Set("item_id", itemID)
    values.Set("kind", kind)
    if index != nil {
        values.Set("index", strconv.Itoa(*index))
    }
    return "/api/v1/media/image?" + values.Encode()
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `IncludeItemTypes=Series` (nur Serien) | Für Discovery: `IncludeItemTypes=Series,Movie` anfragen, aber Ergebnis-Typisierung via Pfad-Heuristik statt `Type`-Feld | Diese Phase (geplant) | Erweiterung ist additiv, ändert nichts am bestehenden Direktsuche-Verhalten (§2) |
| Kein Discovery-Einstieg auf `/admin/anime/create` | Neuer "Aus meiner Bibliothek"-Einstieg | Diese Phase (geplant) | Bestehende Einstiege (AniSearch direkt, Jellyfin direkt, manuell) bleiben unverändert (D-12/§28) |

**Deprecated/outdated:** Keine — es handelt sich um eine additive Erweiterung, keine Migration
bestehender Konzepte.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Für D-05 ("Verbinden") sollte die Jellyfin-Referenz bei Anime mit bestehender `anisearch:`-Quelle in `anime_source_links` geschrieben werden statt `anime.source` force-zu-überschreiben — dies ist eine Empfehlung, keine im Code vorgefundene Regel. | §1, §7, Pitfall 3 | Falls falsch/unerwünscht: Planer könnte stattdessen bewusst entscheiden, `anime.source` zu überschreiben (wenn AniSearch-Zuordnung ohnehin nur über `anisearch_id`-Spalte, nicht `source`, verfolgt wird — das wäre separat zu verifizieren) |
| A2 | Ziel-Route für D-10 bei Serien ist `/admin/anime/{id}/episodes` (Episodenübersicht), nicht direkt `/admin/anime/{id}/episodes/import`. | §3 | Falls Auftraggeber "Episoden-Tab" wörtlich als Importbildschirm meint, ist das Sprungziel eine andere (existierende) Route — geringes Risiko, beide Routen existieren bereits |
| A3 | `JELLYFIN_ALLOWED_LIBRARY_IDS=5` ist ein Konfigurationsfehler (Alt-ID) und keine absichtliche, in dieser Phase zu respektierende Einstellung. | §5 | Falls absichtlich (z. B. Test-Stub, der nie produktiv genutzt wird): kein Handlungsbedarf, aber dann liefert Discovery in Produktion aktuell 0 Ergebnisse — muss in jedem Fall gemeldet werden |

**Wenn diese Tabelle leer wäre, gäbe es keinen Klärungsbedarf** — hier bestehen drei Punkte, die der
Planer/Auftraggeber vor der endgültigen Aufgabenzuschnitt bestätigen sollte.

## Open Questions

1. **Sprungziel für Serien nach Assisted-Create: `/episodes` oder `/episodes/import`?**
   - What we know: Beide Routen existieren; `/episodes` ist die Übersicht mit Link auf `/episodes/import`.
   - What's unclear: Ob D-10 "Episoden-Tab" die Übersicht oder direkt den Importbildschirm meint.
   - Recommendation: `/admin/anime/{id}/episodes` ansteuern (wörtlichste Auslegung von "Episoden-Tab");
     dort einen bereits sichtbaren, prominenten Link/CTA zu `/episodes/import` mit vorausgefüllter
     Jellyfin-Serien-ID anbieten (spart einen Klick, ohne die Zielroute zu verändern).

2. **Wie soll "Verbinden" (D-05) mit einer bestehenden `anisearch:`-Quelle umgehen?**
   - What we know: `ApplyAnimeMetadataFromJellyfin` überschreibt `anime.source` bei explizitem
     `jellyfin_series_id` unabhängig vom aktuellen Provider-Präfix.
   - What's unclear: Ob das im konkreten Anwendungsfall (Discovery→"Verbinden") jemals einen bereits
     AniSearch-verknüpften Anime betrifft (laut D-02 wird "Verbinden" ja gerade für den Fall B genutzt,
     bei dem der Anime *noch keine* Jellyfin-Referenz hat — er kann aber sehr wohl schon eine
     `anisearch:`-Quelle haben).
   - Recommendation: Vor dem Planen dieses Tasks kurz mit dem Auftraggeber klären oder als expliziten
     Task "Provider-Präfix-Schutz beim Verbinden" einplanen (siehe A1).

3. **`JELLYFIN_ALLOWED_LIBRARY_IDS`-Korrektur — wer führt sie aus?**
   - What we know: Der aktuelle Wert (`"5"`) verhindert jede library-gefilterte Jellyfin-Anfrage.
   - What's unclear: Ob die Korrektur der `.env` Teil dieser Phase ist (Konfiguration, keine
     Code-/Datenänderung) oder separat vom Auftraggeber vorgenommen wird.
   - Recommendation: Im Abschlussbericht explizit als Blocker/Voraussetzung für den produktiven
     Discovery-Einsatz nennen; Tests dürfen nicht von diesem Live-Wert abhängen.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Jellyfin-12-Server | Discovery-Datenquelle, gesamte Phase | ✓ (live erreichbar, `System/Info` HTTP 200) | Jellyfin 12.x (Plugin-Liste zeigt aktive Installation, exakte Serverversion nicht separat abgefragt) | — |
| Jellyfin `JELLYFIN_ALLOWED_LIBRARY_IDS` korrekt konfiguriert | Library-gefilterte Discovery-Abfrage | ✗ (Wert `"5"` ist ungültig, s. §5/Pitfall 1) | — | Ohne Filter (leere Liste) funktioniert der unfiltered-Fallback-Pfad (`jellyfin_client_series.go:62-76`), liefert aber ggf. auch Non-Anime-Bibliotheken (Musikvideos, Groups) |
| PostgreSQL | Existenzprüfung, Anime-CRUD | ✓ (`docker compose ps`: `team4sv30-db` healthy) | Postgres 16 | — |
| Redis | Optionaler Discovery-Cache (Claude's Discretion) | ✓ (`docker compose ps`: `team4sv30-redis` up) | Redis 7 | In-Memory-Cache im Backend-Prozess, falls Redis nicht genutzt werden soll |
| Go-Backend/Next.js-Frontend | Gesamte Umsetzung | ✓ (beide Container laufen) | Go 1.25 / Next.js 16 | — |

**Missing dependencies with no fallback:**
- Korrekt konfigurierte `JELLYFIN_ALLOWED_LIBRARY_IDS` — ohne Korrektur liefert die
  library-gefilterte Discovery-Abfrage in Produktion HTTP 400 (s. o.). Dies blockiert die
  *gefilterte* Abfrage, nicht die App insgesamt (Fallback: ungefilterte Abfrage möglich, aber fachlich
  unerwünscht, da sie auch Nicht-Anime-Bibliotheken einschließt).

**Missing dependencies with fallback:**
- Redis für den Discovery-Cache (In-Memory-Cache im Backend-Prozess ist eine valide Alternative für
  eine Single-Instance-Deployment wie hier).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend-Framework | Go `testing` + `github.com/stretchr/testify` (siehe `backend/internal/repository/admin_content_test.go`, `backend/internal/handlers/jellyfin_*_test.go`) |
| Frontend-Framework | Vitest 3 (`frontend/package.json:10`, `"test": "vitest run"`) |
| Config-Dateien | `frontend/vitest.config.ts`; Go-Tests laufen ohne separate Config über `go test ./...` |
| Quick run command (Backend, gezielt) | `cd backend && go test ./internal/handlers/... ./internal/repository/... -run Jellyfin` |
| Quick run command (Frontend, gezielt) | `cd frontend && npx vitest run src/app/admin/anime/create` |
| Full suite command (Backend) | `cd backend && go test ./...` |
| Full suite command (Frontend) | `cd frontend && npm test` |

### Phase Requirements → Test Map

> Requirement-IDs sind noch nicht final vergeben (ROADMAP.md: "Requirements TBD, in plan-phase aus
> 165-USER-REQUEST.md und 165-CONTEXT.md D-01..D-13 abzuleiten"). Die folgende Tabelle mappt daher auf
> die im Auftrag bereits benannten Pflicht-Tests (§29–§32), die der Planer 1:1 in Requirement-IDs
> überführen sollte.

| Auftrags-Test | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| A (unbekannte Series → offen) | Discovery zeigt "offen" für Item ohne DB-Treffer | unit/integration (Handler + Fake-Repo) | `go test ./internal/handlers/... -run TestJellyfinDiscovery` | ❌ Wave 0 |
| B (bekannte Series → bereits vorhanden) | `FindExistingAnimeByJellyfinIntakeRefs`-Treffer über `source` | unit | bereits abgedeckt für Direktsuche, neu für Discovery-Handler | ❌ Wave 0 (Discovery-spezifisch) |
| C (kein Fuzzy-Match) | Naruto ≠ Naruto Shippuden bleibt "offen" | unit | Testdaten mit ähnlichen, aber nicht identischen Titeln/IDs | ❌ Wave 0 |
| D (Zuordnung-prüfen-Fall, jetzt via D-02 erst nach AniSearch) | Kein automatischer Create bei Namensähnlichkeit ohne technische Referenz | unit (AniSearch-Enrich-Service) | bereits als `Enrich()`-Redirect-Test-Muster vorhanden (`anime_create_enrichment_test.go`, falls existent — zu verifizieren) | ⚠️ prüfen |
| E (Movie-Discovery sichtbar) | "Film"-Items (Pfad-Heuristik) erscheinen in der Liste | unit | Testdaten mit `/Movie/`-Pfad-Fixture | ❌ Wave 0 |
| F (Pagination korrekt, kein Fan-out) | Cursor liefert keine Duplikate, 1 DB-Query/Seite, kein Requests-pro-Item | integration + Query-Zähler-Test (Muster: bestehende N+1-Guard-Tests im Repo, z. B. `jellyfin_source_batch_test.go`) | `go test ./internal/repository/... -run TestJellyfinDiscoveryCursor` | ❌ Wave 0 |
| G (Discovery→Draft vollständig) | Übernahme von ID/Name/Path/Typ-Hint/Jahr/Assets | Frontend-Unit (Vitest, Muster `CreateAniSearchIntakeCard.test.tsx`) | `npx vitest run src/app/admin/anime/create/DiscoveryLibraryPanel.test.tsx` | ❌ Wave 0 |
| H (keine Auto-Auswahl bei 1 Treffer) | AniSearch-Suche wählt nie automatisch aus | Frontend-Unit | Muster bereits vorhanden für den Direktflow, zu erweitern | ⚠️ prüfen ob bereits getestet |
| I (AniSearch bleibt maßgeblich beim Merge) | `mergeCreateDraftPayload`/`resolveCreateAniSearchDraftMergeInputs` unverändert | bereits bestehende Tests, Regressionscheck | `go test ./internal/services/... -run TestMergeCreateDraft`, `npx vitest run createPageHelpers.test.ts` | ✓ bereits vorhanden (Regressionsschutz) |
| J/K (alte Flows unverändert) | Direkter AniSearch-/Jellyfin-Flow bleibt funktional | Regression, bestehende Testsuiten grün halten | `go test ./... && npm test` | ✓ bereits vorhanden |
| L (Assisted Series → direkt Episoden) | Redirect-Zweig nach Create | Frontend-Unit (Redirect-Pfad-Test, Muster `createPageHelpers.test.ts` für `buildManualCreateRedirectPath`) | `npx vitest run createPageHelpers.test.ts` | ❌ Wave 0 (neuer Zweig) |
| M (Discovery-Kontext erhalten) | Filter/Suche/Cursor via URL erhalten | Frontend-Unit + evtl. E2E | neue Testdatei | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** gezielte `go test`/`vitest run` auf den betroffenen Paketen/Dateien
- **Per wave merge:** `go test ./...` (Backend) + `npm test` (Frontend)
- **Phase gate:** Beide vollständigen Suiten grün, plus `go vet ./...`, `tsc --noEmit`, ESLint, bevor
  `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Backend-Testdatei für den neuen Discovery-Handler (`jellyfin_discovery_test.go`) — Fake-Jellyfin-
      HTTP-Server nach Muster `jellyfin_source_batch_test.go:31-40` (httptest-Server, keine echten
      Jellyfin-Calls in Unit-Tests)
- [ ] Backend-Testdatei für den Discovery-Cursor (`jellyfin_discovery_cursor_test.go`) — Muster
      `release_cursor_pagination.go` samt zugehöriger `_test.go` (falls vorhanden, prüfen)
- [ ] Frontend-Testdatei für `DiscoveryLibraryPanel.tsx` — Muster `CreateAniSearchIntakeCard.test.tsx`
- [ ] Query-Zähler-/N+1-Guard-Test für Discovery-Seiten (Anzahl `FindExistingAnimeByJellyfinIntakeRefs`-
      Aufrufe pro Seite = 1)
- [ ] Regressionstest, der beweist, dass `handleJellyfinCandidateAdopt` (Direktflow) nach der
      Discovery-Integration weiterhin identisch funktioniert (keine Signaturänderung ohne Test)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | ja (indirekt) | Bestehende Admin-Auth bleibt unverändert; jeder neue Endpunkt nutzt `h.requireAdmin(c)` wie alle bestehenden Admin-Content-Handler (z. B. `jellyfin_search.go:36-39`) |
| V3 Session Management | nein (keine neue Session-Logik) | — |
| V4 Access Control | ja | Discovery-Endpunkt muss identisch zu bestehenden Jellyfin-Admin-Endpunkten hinter `auth`-Middleware liegen (`admin_routes.go:78-91`, gleiche Route-Gruppe) |
| V5 Input Validation | ja | Filter-/Suchparameter/Cursor müssen wie bestehende Endpunkte serverseitig validiert werden (Muster: `badRequest(c, "...")` in `jellyfin_search.go:47-64`); ungültiger Cursor → "stiller Neustart" statt 400 (Konvention aus `release_cursor_pagination.go`) |
| V6 Cryptography | nein | Kein neuer kryptografischer Code; Cursor ist Base64-kodiert (kein Secret, keine Verschlüsselung nötig — bestehende Konvention) |

### Known Threat Patterns for {Go/Gin + Next.js Admin}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Jellyfin-API-Key-Leak (URL/Log/Response) | Information Disclosure | Bereits durch Phase 161 abgesichert (`Authorization: MediaBrowser Token`, kein `api_key` in URL — D-08 aus 161-CONTEXT.md); neuer Discovery-Code muss denselben `fetchJellyfinJSON`-Wrapper nutzen, keinen eigenen HTTP-Client |
| IDOR über `anime_id`/`jellyfin_series_id` beim "Verbinden" | Tampering/Elevation of Privilege | Bestehende `requireAdmin`-Prüfung + serverseitige Existenzprüfung (`GetAnimeSyncSource` wirft `ErrNotFound`) wie in `ApplyAnimeMetadataFromJellyfin` bereits umgesetzt |
| Cursor-Manipulation (Client baut beliebigen Cursor) | Tampering | Unkritisch, da Cursor nur Sortier-/Seek-Position kodiert, keine Zugriffsrechte; ungültiger Cursor führt zu "stillem Neustart", nicht zu Datenlecks (bestehende Konvention) |
| Massenhafte Discovery-Anfragen als DoS-Vektor gegen Jellyfin | Denial of Service | TTL-Cache (D-06) verhindert, dass jede Seiten-/Filteränderung einen neuen Jellyfin-Request auslöst |

## Sources

### Primary (HIGH confidence — Code gelesen, Datei:Zeile zitiert)
- `backend/internal/repository/admin_content_jellyfin_intake.go` — Batch-Existenzprüfung
- `backend/internal/handlers/jellyfin_intake_helpers.go` — TypeHint, Match-Resolution, Asset-Slots
- `backend/internal/handlers/jellyfin_search.go`, `jellyfin_client_series.go` — Direktsuche, Multi-Library-Fan-out
- `backend/internal/handlers/jellyfin_sync.go`, `jellyfin_sync_flow_helpers.go`, `jellyfin_metadata_resync.go` — Sync-/Metadaten-Schreibpfade
- `backend/internal/repository/admin_content_sync.go` — `ApplyJellyfinSyncMetadata` SQL
- `backend/internal/repository/admin_content_anime_create_v2.go`, `anime_source_links.go` — Create-Schreibpfad
- `backend/internal/services/anime_create_enrichment.go` — AniSearch-Enrichment, Merge, Dedup
- `backend/internal/handlers/admin_content_anime_enrichment_edit.go` — Edit-Flow-Konflikt (409)
- `backend/internal/repository/release_cursor_pagination.go` — Cursor-Pattern
- `backend/internal/repository/episode_import_repository_apply.go` — `mapAnimeTypeToEpisodeType`
- `backend/cmd/server/admin_routes.go` — Route-Liste
- `backend/internal/config/config.go` — Jellyfin-Env-Konfiguration
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts`, `createPageHelpers.ts`, `createAniSearchControllerHelpers.ts`, `CreateAniSearchIntakeCard.tsx` — Create-Controller, Redirect, Konflikt-UI
- `frontend/src/app/admin/anime/[id]/episodes/page.tsx` — Episoden-Route/Import-Link
- `frontend/src/app/admin/anime/page.tsx` — bestehendes `searchParams`-Muster
- `database/migrations/0008_expand_anime_episode_columns.up.sql`, `0045_reconcile_db_schema_v2_columns.up.sql` — kein UNIQUE auf `source`/`anisearch_id`

### Secondary (MEDIUM confidence — live gegen reale Instanz verifiziert, 2026-09-21)
- Reale Jellyfin-12-Instanz (`http://192.168.235.100:8098`): `/System/Info`, `/Library/VirtualFolders`,
  `/Items` (mehrere Parametrisierungen), `/Shows/{id}/Episodes` — alle Requests read-only, keine
  Schreiboperation gegen Jellyfin ausgeführt.

### Tertiary (LOW confidence)
- Keine — alle Kernaussagen sind entweder code-belegt oder live verifiziert.

## Metadata

**Confidence breakdown:**
- Standard Stack (interne Wiederverwendung): HIGH — jede Komponente wurde im Quellcode gelesen und zitiert
- Architektur/Merge-/Dedup-Flows: HIGH — vollständige Ablauf-Nachverfolgung von UI-Handler bis SQL
- Jellyfin-Datenmodell (Series/Movie, Pfad-Semantik, Requestzahlen): HIGH — live gegen reale Instanz verifiziert
- Pitfalls (Env-Fehlkonfiguration, Provider-Präfix-Kollision): HIGH (Env-Bug live reproduziert) / MEDIUM (Provider-Präfix-Risiko ist aus Code-Logik abgeleitet, nicht live mit echtem AniSearch-Anime reproduziert)

**Research date:** 2026-09-21
**Valid until:** 30 Tage (Code-Struktur stabil, Jellyfin-Instanz-Zustand kann sich durch neue Importe/Bibliothekstyp-Änderungen ändern — vor Umsetzung erneut `/Library/VirtualFolders` prüfen, falls sich seither Zeit vergangen ist)
