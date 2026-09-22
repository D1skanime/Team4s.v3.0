---
phase: quick-260922-ikh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [backend/internal/services/anime_create_enrichment.go, backend/internal/services/anime_create_enrichment_test.go, backend/internal/services/asset_search_service.go, backend/internal/services/asset_search_tmdb.go, backend/internal/services/asset_search_tmdb_lookup.go, backend/internal/services/asset_search_tmdb_test.go, backend/internal/services/asset_search_fanarttv.go, backend/internal/services/asset_search_fanarttv_test.go, backend/internal/services/asset_search_anilist.go, backend/internal/services/asset_search_anilist_test.go, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts, .planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md]
autonomous: true
requirements: [GAP-17]

must_haves:
  truths:
    - "Cover-Bildsuche auf /admin/anime/create für einen Film-Anime wie „.hack//G.U. Trilogy“ liefert echte Treffer (AniList-Cover und/oder TMDB-Poster) statt „Keine passenden Assets gefunden“"
    - "TMDB-Suche findet sowohl TV-Serien (/search/tv) als auch Filme (/search/movie); Bilder werden je nach Treffertyp über /tv/{id}/images bzw. /movie/{id}/images geladen, die Quelllink-URL zeigt entsprechend auf /tv/... oder /movie/..."
    - "Fanart.tv liefert für Film-Treffer Logos/Banner/Hintergründe über den movies-Endpunkt (keyed by TMDB-Movie-ID), für Serien-Treffer unverändert über den bisherigen TVDB-Pfad"
    - "AniList liefert für den Cover-Slot ein Cover-Bild (coverImage.extraLarge, Fallback large), nicht mehr nur ein Banner"
    - "Der Cover-Slot fragt zusätzlich zu Zerochan auch AniList und TMDB ab; offizielle Poster (AniList/TMDB) stehen in der Ergebnisreihenfolge vor Zerochan-Fanart"
    - "Die Fehlermeldung bei leerer Asset-Suche verwendet ein echtes Umlaut („prüfe“ statt „pruefe“)"
    - "Jede Provider-Suche verursacht weiterhin nur eine feste, kleine Anzahl an HTTP-Aufrufen (kein N+1 pro Kandidat); einzelne Provider-Fehler werden geloggt statt die gesamte Suche stillschweigend abzubrechen"
    - "Keine neue oder umgebaute Provider-Datei überschreitet 450 Zeilen; anime_create_enrichment.go wird durch die Auslagerung kleiner, nicht größer"
  artifacts:
    - path: "backend/internal/services/asset_search_service.go"
      provides: "Provider-Interface, Orchestrator (AnimeAssetSearchService) und Cover-Slot-Quellenreihenfolge (AniList/TMDB vor Zerochan)"
      contains: "func defaultAssetSearchSourceOrder"
    - path: "backend/internal/services/asset_search_tmdb_lookup.go"
      provides: "geteilte TMDB tv/movie-Lookup-Hilfsfunktion für TMDB- und Fanart.tv-Provider"
      contains: "func lookupTMDBTVOrMovie"
    - path: "backend/internal/services/asset_search_tmdb.go"
      provides: "TMDB-Provider mit TV+Film-Dualsuche und medientyp-abhängigem Bilder-Endpunkt"
      contains: "movie/%d/images"
    - path: "backend/internal/services/asset_search_fanarttv.go"
      provides: "Fanart.tv-Provider mit Film-Endpunkt-Pfad (TMDB-Movie-ID statt TVDB)"
      contains: "moviebackground"
    - path: "backend/internal/services/asset_search_anilist.go"
      provides: "AniList-Provider mit Cover- UND Banner-Unterstützung"
      contains: "coverImage"
  key_links:
    - from: "backend/internal/services/asset_search_service.go"
      to: "backend/internal/services/asset_search_anilist.go"
      via: "defaultAssetSearchSourceOrder(\"cover\") listet AdminAnimeAssetSearchSourceAniList und AdminAnimeAssetSearchSourceTMDB vor Zerochan"
      pattern: "AdminAnimeAssetSearchSourceAniList"
    - from: "backend/internal/services/asset_search_fanarttv.go"
      to: "backend/internal/services/asset_search_tmdb_lookup.go"
      via: "SearchAssetCandidates ruft lookupTMDBTVOrMovie auf, um TV- vs. Film-Treffer zu unterscheiden"
      pattern: "lookupTMDBTVOrMovie\\("
    - from: "backend/internal/handlers/admin_content_handler.go"
      to: "backend/internal/services/asset_search_service.go"
      via: "services.NewAnimeAssetSearchService(...) bleibt unverändert verdrahtet (gleiche Konstruktor-Signaturen)"
      pattern: "services\\.NewAnimeAssetSearchService\\("
---

<objective>
GAP-17 (Phase 165 Live-UAT, 2026-09-22): Die Online-Bildersuche findet keine Poster für Film-Format-Anime
wie „.hack//G.U. Trilogy“ (Repro: /admin/anime/create → Cover „Online suchen“ → „Keine passenden Assets
gefunden. Bitte pruefe Titel oder Quelle.“ nach ~300ms, HTTP 200 mit leerem Array).

Vier verifizierte Ursachen in `backend/internal/services/anime_create_enrichment.go`:
1. `defaultAssetSearchSourceOrder("cover")` (Zeile 176-184) listet für den Cover-Slot ausschließlich
   TMDB + die Booru-Quellen (Zerochan/Konachan/Safebooru) — AniList wird für „cover“ nie abgefragt.
2. `TMDBAssetSearchProvider.searchTVShow` (Zeile 617-662) sucht ausschließlich `/search/tv`;
   `FanartTVAssetSearchProvider.resolveTVDBID` (Zeile 388-462) genauso. Live gegen die echte TMDB-API
   verifiziert: `/search/tv?query=.hack%2F%2FG.U.+Trilogy` liefert 0 Treffer,
   `/search/movie?query=.hack%2F%2FG.U.+Trilogy` liefert genau 1 Treffer (`id: 26595`,
   `title: ".hack//G.U. Trilogy"`). `/movie/26595/images` liefert live 4 Poster + 2 Backdrops.
   `https://webservice.fanart.tv/v3/movies/26595?api_key=...` liefert live ein Payload mit den Feldern
   `hdmovielogo`, `moviebanner`, `moviebackground`, `moviedisc`, `movieposter`, `moviesquare`,
   `moviethumb` — der Fanart.tv-movies-Endpunkt ist direkt über die TMDB-Movie-ID adressierbar, KEINE
   TVDB-Auflösung nötig.
3. `AniListAssetSearchProvider.SupportsAssetKind` (Zeile 1064-1066) liefert nur für „banner“ `true`.
   Live gegen die echte AniList-GraphQL-API verifiziert: Media-ID 3269 (".hack//G.U. Trilogy", format
   MOVIE) hat `bannerImage: null`, aber `coverImage.extraLarge`/`coverImage.large` sind beide gesetzt
   (echte `anilistcdn`-Bild-URLs).
4. Die Fehlermeldung in `frontend/.../useAdminAnimeCreateController.ts` (Zeile 1180) verwendet
   „pruefe“ statt „prüfe“ — Verstoß gegen die verbindliche Umlaut-Regel aus CLAUDE.md. Die Zeichenkette
   ist NICHT dupliziert (einziges Vorkommen im Repo, per Grep verifiziert); die beiden anderen
   „pruefe“-Stellen in derselben Datei (Zeile ~172, ~893) sind andere Meldungen und außerhalb des
   GAP-17-Scopes.

Verbindliche Auftraggeber-Entscheidungen (nicht neu verhandeln):
- Cover-Slot fragt zusätzlich AniList (coverImage) und TMDB (poster) ab, Zerochan bleibt als
  Zusatzquelle; offizielle Poster (AniList/TMDB) sollen in der Ergebnisreihenfolge vor Zerochan-Fanart
  stehen.
- TMDB durchsucht für ALLE Slots sowohl TV-Serien als auch Filme; Bilder kommen je nach Treffertyp aus
  `/tv/{id}/images` bzw. `/movie/{id}/images`, die zurückgegebene `source_url` zeigt entsprechend auf
  `/tv/...` bzw. `/movie/...`.
- Fanart.tv nutzt bei Film-Treffern den movies-Endpunkt (TMDB-Movie-ID), Serien-Treffer bleiben
  unverändert auf dem TV/TVDB-Pfad.
- AniList `SupportsAssetKind` liefert zusätzlich für „cover“ `true` (Banner-Verhalten unverändert);
  `coverImage.extraLarge` mit Fallback `coverImage.large` als Bild-URL.
- Kein N+1: jede Provider-Suche verursacht eine feste, kleine Anzahl an HTTP-Aufrufen. Einzelne
  Provider-Fehler werden geloggt, nicht stillschweigend verschluckt — die Suche liefert weiterhin die
  Treffer der übrigen Provider (Teilergebnis statt Hardfail).
- Fehlermeldung: echtes Umlaut, kurzer nicht-technischer Ton (Formulierung: Claude's Discretion
  innerhalb der Umlaut-Regel).
- 450-Zeilen-Limit gilt für alle NEUEN/umgebauten Provider-Dateien; `anime_create_enrichment.go` ist
  bereits Altlast über dem Limit — darf durch diesen Plan NICHT wachsen (wird durch die Auslagerung
  tatsächlich kleiner).
- Direkt auf `main`, inkrementelle fokussierte Commits, kein `git stash`, kein Push, keine
  `team4s_v2`-Datenänderung, `.env` unangetastet.

Purpose: Movie-Format-Anime bekommen dieselbe funktionierende Online-Bildersuche wie TV-Serien; die
Cover-Suche nutzt echte offizielle Quellen statt ausschließlich Fan-Art.
Output: TMDB-, Fanart.tv- und AniList-Provider in neuen, unter 450 Zeilen liegenden Dateien mit TV/Film-
Dualsuche bzw. Cover-Unterstützung; Cover-Slot-Reihenfolge inkl. AniList/TMDB; korrigierte Fehlermeldung;
Provider-Tests mit gefakten HTTP-Antworten; Live-Beweis (Treffer pro Quelle) für „.hack//G.U. Trilogy“;
neu gebauter, gesunder Backend-Container; GAP-17-Eintrag in 165-UAT.md.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@backend/internal/services/anime_create_enrichment.go
@backend/internal/services/anime_create_enrichment_test.go
@backend/internal/models/admin_content.go
@backend/internal/handlers/admin_content_anime_asset_search.go
@frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
@.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md

<interfaces>
<!-- Aktueller Stand (vor diesem Plan), Zeilennummern beziehen sich auf den aktuellen HEAD von
anime_create_enrichment.go. Nach Task 1 verschieben sich Zeilennummern für die restlichen Blöcke —
vor jedem Löschen den exakten aktuellen Bereich per grep -n neu bestimmen. -->

Interface + Orchestrator (Zeile 65-175, WIRD NACH asset_search_service.go VERSCHOBEN):
  type AdminAnimeAssetSearchProvider interface {
      Source() models.AdminAnimeAssetSearchSource
      SupportsAssetKind(assetKind string) bool
      SearchAssetCandidates(ctx context.Context, req models.AdminAnimeAssetSearchRequest) ([]models.AdminAnimeAssetSearchCandidate, error)
  }
  type AnimeAssetSearchService struct { providers map[...]AdminAnimeAssetSearchProvider }
  func NewAnimeAssetSearchService(providers ...AdminAnimeAssetSearchProvider) *AnimeAssetSearchService
  func (s *AnimeAssetSearchService) SearchAssetCandidates(ctx, req) (...) — Zeile 158-161 aktuell:
      candidates, err := provider.SearchAssetCandidates(ctx, providerReq)
      if err != nil {
          continue   // <- HIER fehlt Logging, muss ergänzt werden (log.Printf vor continue)
      }

Cover-Slot-Reihenfolge (Zeile 176-209, WIRD in asset_search_service.go GEÄNDERT):
  case "cover":
      return []models.AdminAnimeAssetSearchSource{
          models.AdminAnimeAssetSearchSourceTMDB,
          models.AdminAnimeAssetSearchSourceZerochan,
          models.AdminAnimeAssetSearchSourceKonachan,
          models.AdminAnimeAssetSearchSourceSafebooru,
      }
  Neu: TMDB, AniList, Zerochan, Konachan, Safebooru (AniList NEU an Position 2 — offizielle Poster vor
  Zerochan-Fanart).

TMDB-Provider (Zeile 564-762, WIRD NACH asset_search_tmdb.go VERSCHOBEN + umgebaut):
  searchTVShow(ctx, query) baut GET {baseURL}/search/tv?query=...&page=1, Bearer-Auth, parst
  {results:[{id}]}, gibt results[0].id oder 0 zurück. fetchImages(ctx, tvID, req) baut GET
  {baseURL}/tv/{tvID}/images, parst {posters:[...], backdrops:[...]}, sourceURL
  "https://www.themoviedb.org/tv/{tvID}/images".
  LIVE VERIFIZIERT: /search/tv für ".hack//G.U. Trilogy" → 0 Treffer. /search/movie?query=.hack%2F%2FG.U.+Trilogy
  → 1 Treffer {"id": 26595, "title": ".hack//G.U. Trilogy", ...}. /movie/26595/images → {"backdrops":[...2 items],
  "id":26595,"posters":[...4 items]} — gleiche Struktur wie /tv/{id}/images (posters[].file_path/width/height,
  backdrops[] analog).

Fanart.tv-Provider (Zeile 334-556, WIRD NACH asset_search_fanarttv.go VERSCHOBEN + erweitert):
  type FanartTVAssetSearchProvider struct { apiKey, tmdbAPIKey, baseURL string; httpClient *http.Client }
  resolveTVDBID(ctx, query) sucht hart codiert "https://api.themoviedb.org/3/search/tv" (Bearer
  tmdbAPIKey), dann "https://api.themoviedb.org/3/tv/{tmdbID}/external_ids" → tvdb_id. fetchImages(ctx,
  tvdbID, req) baut GET {baseURL}/tv/{tvdbID}?api_key={apiKey}, parst {hdtvlogo,clearlogo,tvlogo,
  tvbanner,seasonbanner,showbackground}, sourceURL "https://fanart.tv/series/{tvdbID}".
  LIVE VERIFIZIERT: GET https://webservice.fanart.tv/v3/movies/26595?api_key=... (200) liefert u.a.
  {"hdmovielogo":[{"id":"423538","lang":"en","likes":"2","url":"https://assets.fanart.tv/..."}],
  "imdb_id":"tt1164545","moviebackground":[{...}],"moviebanner":[{...}],"moviedisc":[{...}],
  "movieposter":[...],"moviesquare":[...],"moviethumb":[...],"name":"...","tmdb_id":"26595"} — direkt
  per TMDB-Movie-ID adressierbar, KEIN TVDB-Umweg. Feld `movielogo` (nicht-HD) taucht in dieser
  konkreten Antwort nicht auf, existiert laut Fanart.tv-API aber grundsätzlich als optionales Feld.

AniList-Provider (Zeile 1041-1169, WIRD NACH asset_search_anilist.go VERSCHOBEN + erweitert):
  GraphQL: query($search,$page,$perPage){ Page(...){ media(search:$search,type:ANIME){ id
  title{romaji english} bannerImage format } } }. SupportsAssetKind nur "banner". Kandidat nutzt
  media.BannerImage als PreviewURL/ImageURL.
  LIVE VERIFIZIERT (Query um coverImage{extraLarge large} erweitert): Media id 3269
  (".hack//G.U. Trilogy", format MOVIE) → "bannerImage": null, "coverImage": {"extraLarge":
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx3269-8LX2zM2vgr4f.jpg", "large":
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx3269-8LX2zM2vgr4f.jpg"}.

Fehlermeldung (useAdminAnimeCreateController.ts, aktuell Zeile ~1180):
  setAssetSearchErrorMessage(
    "Keine passenden Assets gefunden. Bitte pruefe Titel oder Quelle.",
  );
  → "Keine passenden Assets gefunden. Bitte prüfe Titel oder Quelle." (nur dieses eine Vorkommen).

Handler-Einstiegspunkt (unverändert, NICHT anfassen):
  handler.assetSearchService = services.NewAnimeAssetSearchService(
      services.NewTMDBAssetSearchProvider(assetSearchCfg.TMDBAPIKey, handler.httpClient),
      services.NewFanartTVAssetSearchProvider(assetSearchCfg.FanartAPIKey, assetSearchCfg.TMDBAPIKey, handler.httpClient),
      services.NewAniListAssetSearchProvider(handler.httpClient),
      services.NewZerochanAssetSearchProvider(handler.httpClient),
      services.NewKonachanAssetSearchProvider(handler.httpClient),
      services.NewSafebooruAssetSearchProvider(handler.httpClient),
  )
  (admin_content_handler.go:302-309) — alle Konstruktor-Signaturen bleiben identisch, da nur die
  Paketzuordnung (welche .go-Datei), nicht die exportierten Namen/Signaturen sich ändert.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Orchestrator auslagern, Cover-Reihenfolge (AniList+TMDB vor Zerochan), TMDB TV/Film-Dualsuche</name>
  <files>backend/internal/services/anime_create_enrichment.go, backend/internal/services/asset_search_service.go, backend/internal/services/asset_search_tmdb_lookup.go, backend/internal/services/asset_search_tmdb.go, backend/internal/services/asset_search_tmdb_test.go, backend/internal/services/anime_create_enrichment_test.go</files>
  <behavior>
    - Test 1 (asset_search_tmdb_test.go, neu): httptest-Fake-Server mit zwei Routen: `/search/tv` liefert
      `{"results":[]}`, `/search/movie` liefert `{"results":[{"id":26595}]}`, `/movie/26595/images`
      liefert `{"posters":[{"file_path":"/poster.jpg","width":2000,"height":3000}],"backdrops":[]}`.
      `TMDBAssetSearchProvider{apiKey:"test",baseURL:server.URL,imageBase:"https://image.tmdb.org/t/p",
      httpClient:server.Client()}.SearchAssetCandidates(ctx, {AssetKind:"cover", Query:".hack//G.U. Trilogy",
      Limit:5})` liefert genau 1 Kandidat, `SourceURL` enthält `/movie/26595`, `ID` beginnt mit
      `tmdb-movie-26595-`. Der Test zählt Aufrufe pro Pfad und beweist: `/search/tv` WURDE aufgerufen
      (genau 1x) UND `/search/movie` WURDE danach aufgerufen (genau 1x) — Film wird nur über
      `/search/movie` gefunden.
    - Test 2 (Regression, gleiche Datei): Fake-Server `/search/tv` liefert `{"results":[{"id":1234}]}`,
      `/tv/1234/images` liefert Poster-Fixture. Provider liefert 1 Kandidaten mit `SourceURL` enthält
      `/tv/1234`, `ID` beginnt mit `tmdb-tv-1234-`. `/search/movie` wird dabei NICHT aufgerufen
      (Aufrufzähler bleibt 0) — Serien-Verhalten bleibt exakt wie bisher, kein unnötiger zweiter Call.
    - Test 3 (anime_create_enrichment_test.go, neuer Test analog
      `TestAnimeAssetSearchService_UsesSlotAwareSourceOrderingAndAggregatesResults`): drei
      `stubAssetSearchProvider` für TMDB, AniList, Zerochan (jeweils `supports: map[string]bool{"cover":
      true}`), Aufruf mit `AssetKind:"cover"`. Erwartete Aufrufreihenfolge: TMDB, AniList, Zerochan (in
      dieser Reihenfolge) — beweist, dass `defaultAssetSearchSourceOrder("cover")` jetzt AniList und
      TMDB vor Zerochan listet.
  </behavior>
  <action>
In `backend/internal/services/anime_create_enrichment.go`: das Interface `AdminAnimeAssetSearchProvider`,
den Typ `AnimeAssetSearchService` samt Konstruktor `NewAnimeAssetSearchService` und Methode
`SearchAssetCandidates`, sowie die Funktion `defaultAssetSearchSourceOrder` (aktuell Zeile 65-209,
exakten Bereich per `grep -n "^type AdminAnimeAssetSearchProvider\|^func defaultAssetSearchSourceOrder"`
neu bestimmen — Block endet mit der schließenden Klammer von `defaultAssetSearchSourceOrder`, direkt vor
`func normalizeBooruSearchTags`) vollständig entfernen. `normalizeBooruSearchTags` und alles danach
(Zerochan/Konachan/Safebooru-Provider, Hilfsfunktionen) bleiben unverändert an Ort und Stelle.

Ebenso den gesamten `TMDBAssetSearchProvider`-Block (Kommentar, Typ, Konstruktor, `Source`,
`SupportsAssetKind`, `SearchAssetCandidates`, `searchTVShow`, `fetchImages`) samt dem `tmdbImage`-Struct
(aktuell Zeile 564-762, per `grep -n "TMDBAssetSearchProvider searches TMDB\|^type tmdbImage"` neu
verifizieren) vollständig entfernen.

Neue Datei `backend/internal/services/asset_search_service.go` anlegen: exakt den entfernten
Interface/Orchestrator-Block hinein verschieben (Paket `services`, Imports `context`, `fmt`, `log`,
`strings`, `team4s.v3/backend/internal/models`). Zwei inhaltliche Änderungen dabei:
1. In `defaultAssetSearchSourceOrder`, `case "cover":` die Quellenliste auf
   `models.AdminAnimeAssetSearchSourceTMDB, models.AdminAnimeAssetSearchSourceAniList,
   models.AdminAnimeAssetSearchSourceZerochan, models.AdminAnimeAssetSearchSourceKonachan,
   models.AdminAnimeAssetSearchSourceSafebooru` erweitern (AniList neu an zweiter Stelle — offizielle
   Poster vor Zerochan-Fanart, per Auftraggeber-Entscheidung). Doc-Kommentar der Funktion kurz um diesen
   Hinweis ergänzen.
2. In `(s *AnimeAssetSearchService) SearchAssetCandidates`, an der Stelle `candidates, err :=
   provider.SearchAssetCandidates(ctx, providerReq); if err != nil { continue }`: VOR dem `continue`
   eine Zeile `log.Printf("asset_search_service: provider %s lieferte einen Fehler (asset_kind=%s,
   query=%q): %v", provider.Source(), assetKind, query, err)` einfügen — einzelne Provider-Fehler
   werden jetzt geloggt statt stillschweigend verschluckt, die Suche liefert weiterhin die Treffer der
   übrigen Provider (Teilergebnis, kein Hardfail). `"log"` zum Import-Block hinzufügen.

Neue Datei `backend/internal/services/asset_search_tmdb_lookup.go` anlegen (Paket `services`, geteilte
Hilfsfunktion für TMDB- UND Fanart.tv-Provider): Typ `tmdbLookupResult struct { MediaType string; ID
int64 }` (`MediaType` ist `"tv"` oder `"movie"`). Funktion `lookupTMDBTVOrMovie(ctx context.Context,
httpClient *http.Client, baseURL, apiKey, query string) (tmdbLookupResult, bool, error)`: ruft zuerst
`tmdbSearchFirstID(ctx, httpClient, baseURL, apiKey, "/search/tv", query)` auf; liefert dieser Aufruf
einen Fehler, sofort `tmdbLookupResult{}, false, err` zurückgeben (kein zweiter Versuch bei echtem
API-Fehler); liefert er eine ID ungleich 0, `tmdbLookupResult{MediaType:"tv", ID:id}, true, nil`
zurückgeben. Sonst (ID==0, kein Fehler) denselben Aufruf mit Pfad `"/search/movie"` wiederholen — Treffer
analog als `MediaType:"movie"`. Liefert auch die Filmsuche 0, `tmdbLookupResult{}, false, nil`
zurückgeben (kein Fehler — exakt das bisherige "kein Treffer"-Verhalten). Funktion
`tmdbSearchFirstID(ctx context.Context, httpClient *http.Client, baseURL, apiKey, path, query string)
(int64, error)`: verallgemeinert die bisherige `TMDBAssetSearchProvider.searchTVShow`-Logik (Query-Param
`query`+`page=1`, Header `Accept: application/json` + `Authorization: Bearer {apiKey}`, HTTP-Fehler
(Status >=400) als `error` zurückgeben, Antwort als `{results:[{id int64}]}` parsen, `results[0].ID`
oder `0` wenn leer zurückgeben) — WIRD sowohl für `/search/tv` als auch `/search/movie` verwendet, da
beide Endpunkte identische Response-Struktur liefern (live gegen beide Endpunkte verifiziert).

Neue Datei `backend/internal/services/asset_search_tmdb.go` anlegen: den entfernten
`TMDBAssetSearchProvider`-Block + `tmdbImage`-Struct hinein verschieben, mit folgendem Umbau:
`SearchAssetCandidates` ruft `lookupTMDBTVOrMovie(ctx, p.httpClient, p.baseURL, p.apiKey, req.Query)`
auf; bei `!ok` `nil, nil` zurückgeben (wie bisher bei `tvID==0`); bei Fehler den Fehler durchreichen;
sonst `p.fetchImages(ctx, match.MediaType, match.ID, req)` aufrufen. `fetchImages` bekommt eine neue
Signatur `fetchImages(ctx context.Context, mediaType string, id int64, req
models.AdminAnimeAssetSearchRequest) ([]models.AdminAnimeAssetSearchCandidate, error)`: Pfad wird
`fmt.Sprintf("%s/tv/%d/images", p.baseURL, id)` wenn `mediaType=="tv"`, sonst
`fmt.Sprintf("%s/movie/%d/images", p.baseURL, id)`. Restliche Logik (Header, `{posters, backdrops}`
parsen, Paginierung, `previewURL`/`imageURL` aus `imageBase` + `file_path`) bleibt inhaltlich identisch.
`sourceURL` wird `fmt.Sprintf("https://www.themoviedb.org/tv/%d", id)` bzw.
`fmt.Sprintf("https://www.themoviedb.org/movie/%d", id)` (Pfadsegment `/images` entfällt — die reine
TMDB-Detailseite ist als Quelllink sinnvoller als vorher, da jetzt zwei mögliche Medientypen existieren).
`candidate.ID` wird `fmt.Sprintf("tmdb-%s-%d-%s", mediaType, id, strings.TrimPrefix(img.FilePath, "/"))`
(Medientyp im ID-Präfix verhindert Kollisionen zwischen TV- und Film-Bild-IDs). `Source()` und
`SupportsAssetKind` (weiterhin nur "cover"/"background") bleiben unverändert.

`backend/internal/services/asset_search_tmdb_test.go` anlegen mit Test 1 und Test 2 aus `<behavior>`.

In `backend/internal/services/anime_create_enrichment_test.go`: Test 3 aus `<behavior>` als neuen
`func TestAnimeAssetSearchService_CoverSlotQueriesTMDBThenAniListThenZerochan(t *testing.T)` direkt nach
`TestAnimeAssetSearchService_PrefersFanartForLogoAndBanner` ergänzen, nach demselben Muster
(`stubAssetSearchProvider`, `callOrder`-Slice, `NewAnimeAssetSearchService(...)`,
`service.SearchAssetCandidates(context.Background(), models.AdminAnimeAssetSearchRequest{AssetKind:
"cover", Query: "...", Limit: 5})`).
  </action>
  <verify>
    <automated>docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test ./internal/services/... -run 'TestAnimeAssetSearchService_CoverSlotQueriesTMDBThenAniListThenZerochan|TestTMDBAssetSearchProvider' -v" 2>&1 | tail -100</automated>
  </verify>
  <done>
`asset_search_service.go`, `asset_search_tmdb_lookup.go`, `asset_search_tmdb.go` existen und sind unter
450 Zeilen. `anime_create_enrichment.go` ist kürzer als vorher (Orchestrator + TMDB-Block entfernt).
`go build ./...` und `go vet ./...` sind fehlerfrei. Alle drei neuen/erweiterten Tests sind grün; die
bestehenden `TestAnimeAssetSearchService_*`-Tests bleiben unverändert grün.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Fanart.tv Film-Endpunkt (TMDB-Movie-ID statt TVDB-Umweg)</name>
  <files>backend/internal/services/anime_create_enrichment.go, backend/internal/services/asset_search_fanarttv.go, backend/internal/services/asset_search_fanarttv_test.go</files>
  <behavior>
    - Test 1 (neu, TV-Regression): Fake-TMDB-Server `/search/tv` → `{"results":[{"id":555}]}`,
      `/tv/555/external_ids` → `{"tvdb_id":777}`. Fake-Fanart.tv-Server `/tv/777` → JSON mit
      `hdtvlogo:[{...}]`. `FanartTVAssetSearchProvider{apiKey:"fkey", tmdbAPIKey:"tkey",
      tmdbBaseURL:tmdbFake.URL, baseURL:fanartFake.URL, httpClient:...}.SearchAssetCandidates(ctx,
      {AssetKind:"logo", Query:"Some Series", Limit:5})` liefert 1 Kandidaten, `SourceURL` enthält
      `/series/777`. Der Fake-Fanart.tv-Server wird NIE unter `/movies/` aufgerufen (Pfad-Zähler bleibt
      0) — beweist unverändertes Serien-Verhalten.
    - Test 2 (neu, Film-Pfad, deckt Testfall (e) aus dem Auftrag ab): Fake-TMDB-Server `/search/tv` →
      `{"results":[]}`, `/search/movie` → `{"results":[{"id":26595}]}`. Fake-Fanart.tv-Server
      `/movies/26595` → JSON mit `hdmovielogo:[{"id":"423538","url":"https://assets.fanart.tv/fanart/hackgu-trilogy.png"}]`
      (Fixture aus der live verifizierten Antwort). Provider liefert 1 Kandidaten mit `ImageURL` gleich
      der Fixture-URL, `SourceURL` enthält `/movie/26595`. Der Fake-Fanart.tv-Server wird NIE unter
      `/tv/` aufgerufen — beweist, dass der Film-Treffer direkt über die TMDB-Movie-ID geht, kein
      TVDB-Umweg. `/tv/{id}/external_ids` wird auf dem Fake-TMDB-Server ebenfalls NIE aufgerufen.
  </behavior>
  <action>
Aktuellen Bereich des `FanartTVAssetSearchProvider`-Blocks (Kommentar, Typ, Konstruktor, `Source`,
`SupportsAssetKind`, `SearchAssetCandidates`, `resolveTVDBID`, `fetchImages`) samt `fanartImage`-Struct in
`backend/internal/services/anime_create_enrichment.go` per `grep -n "FanartTVAssetSearchProvider fetches
logos\|^type fanartImage"` lokalisieren (Zeilennummern haben sich seit Task 1 verschoben) und vollständig
entfernen.

Neue Datei `backend/internal/services/asset_search_fanarttv.go` anlegen: den entfernten Block hinein
verschieben, mit folgendem Umbau. Struct `FanartTVAssetSearchProvider` bekommt ein neues unexportiertes
Feld `tmdbBaseURL string`; `NewFanartTVAssetSearchProvider(apiKey, tmdbAPIKey string, httpClient
*http.Client) *FanartTVAssetSearchProvider` (Signatur UNVERÄNDERT — wird bereits in
`admin_content_handler.go:304` mit genau diesen 3 Argumenten aufgerufen) setzt `tmdbBaseURL:
"https://api.themoviedb.org/3"` intern (in Tests per Struct-Literal überschreibbar, da gleiches Paket).

`SearchAssetCandidates` ruft `lookupTMDBTVOrMovie(ctx, p.httpClient, p.tmdbBaseURL, p.tmdbAPIKey,
req.Query)` auf (dieselbe Hilfsfunktion aus `asset_search_tmdb_lookup.go`, die Task 1 bereits angelegt
hat); bei `!ok` `nil, nil` zurückgeben (identisch zum bisherigen `tvdbID==0`-Verhalten), bei Fehler den
Fehler durchreichen. Bei `match.MediaType=="tv"`: den bisherigen TVDB-Auflösungsschritt als eigene
Methode `resolveTVDBIDFromTMDBTVID(ctx context.Context, tmdbTVID int64) (int64, error)` beibehalten
(inhaltlich unverändert — GET `{p.tmdbBaseURL}/tv/{tmdbTVID}/external_ids` mit Bearer-Auth, `tvdb_id`
extrahieren), danach `p.fetchTVImages(ctx, tvdbID, req)` aufrufen — `fetchTVImages` ist die bisherige
`fetchImages`-Methode, nur umbenannt, inhaltlich 1:1 identisch (`{baseURL}/tv/{tvdbID}?api_key=...`,
`hdtvlogo/clearlogo/tvlogo/tvbanner/seasonbanner/showbackground`, `sourceURL
"https://fanart.tv/series/%d"`).

Bei `match.MediaType=="movie"`: neue Methode `fetchMovieImages(ctx context.Context, tmdbMovieID int64,
req models.AdminAnimeAssetSearchRequest) ([]models.AdminAnimeAssetSearchCandidate, error)` aufrufen (KEIN
TVDB-Schritt, direkt die TMDB-Movie-ID verwenden). Baut GET `{p.baseURL}/movies/{tmdbMovieID}?api_key=
{p.apiKey}`. Payload-Struct mit den live verifizierten Feldern: `HDMovieLogos []fanartImage
json:"hdmovielogo"`, `MovieLogos []fanartImage json:"movielogo"` (optional, darf leer/fehlend sein),
`MovieBanners []fanartImage json:"moviebanner"`, `MovieBackgrounds []fanartImage
json:"moviebackground"`. Bildauswahl je `req.AssetKind`: `"logo"` → `HDMovieLogos` gefolgt von
`MovieLogos` (gleiche Fallback-Reihenfolge wie beim TV-Pfad hdtvlogo→clearlogo), `"banner"` →
`MovieBanners`, `"background"` → `MovieBackgrounds`. Restliche Logik (Paginierung, Kandidat-ID
`fmt.Sprintf("fanart-%s", img.ID)`, `PreviewURL`/`ImageURL` beide `img.URL`) identisch zu
`fetchTVImages` — beide Methoden dürfen die Paginierungs-/Kandidat-Bau-Logik teilen (z. B. über eine
kleine private Hilfsfunktion `buildFanartCandidates(images []fanartImage, sourceURL string, req
models.AdminAnimeAssetSearchRequest) []models.AdminAnimeAssetSearchCandidate`, um Duplikation zu
vermeiden). `sourceURL` für den Film-Pfad ist `fmt.Sprintf("https://fanart.tv/movie/%d", tmdbMovieID)`.

SICHERHEITSHINWEIS (T-quick-260922-ikh-02, siehe `<threat_model>`): Die Fanart.tv-Request-URL enthält
`api_key` als Query-Parameter. Falls in dieser Datei Fehler geloggt werden (z. B. bei Status >= 400),
NIEMALS `imagesURL.String()` oder die volle Request-URL loggen — nur HTTP-Status-Code und die numerische
TVDB-/TMDB-Movie-ID. Bestehender Code loggt hier ohnehin nichts (Fehler werden als `error` durchgereicht,
nicht selbst geloggt) — beim Umbau darauf achten, dass das so bleibt bzw. jeder neu hinzugefügte Log-Call
diese Regel einhält.

`backend/internal/services/asset_search_fanarttv_test.go` anlegen mit Test 1 und Test 2 aus `<behavior>`
(je ein eigener `httptest.NewServer` für die TMDB-Fake-API und die Fanart.tv-Fake-API, mit
`http.ServeMux`-Routing und einem Pfad-Aufrufzähler pro Route, um die "wird NIE aufgerufen"-Assertions zu
belegen).
  </action>
  <verify>
    <automated>docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test ./internal/services/... -run TestFanartTVAssetSearchProvider -v" 2>&1 | tail -100</automated>
  </verify>
  <done>
`asset_search_fanarttv.go` existiert, ist unter 450 Zeilen, enthält sowohl den unveränderten TV/TVDB-Pfad
als auch den neuen Film/TMDB-Movie-ID-Pfad. Beide neuen Tests grün, inklusive der Negativ-Assertions
(Fake-Fanart.tv-Server nie unter dem jeweils falschen Präfix aufgerufen). Kein neuer Log-Aufruf enthält
die volle Request-URL mit `api_key`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: AniList Cover-Unterstützung + Fehlermeldungs-Umlaut-Fix</name>
  <files>backend/internal/services/anime_create_enrichment.go, backend/internal/services/asset_search_anilist.go, backend/internal/services/asset_search_anilist_test.go, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts</files>
  <behavior>
    - Test 1 (neu, deckt Testfall (d) aus dem Auftrag ab): Fake-AniList-GraphQL-Server liefert die live
      verifizierte Fixture für Media-ID 3269 (`bannerImage: null`, `coverImage.extraLarge` und
      `coverImage.large` beide gesetzt auf echte `anilistcdn`-URLs). `SupportsAssetKind("cover")`
      liefert `true`. `SearchAssetCandidates(ctx, {AssetKind:"cover", Query:".hack//G.U. Trilogy",
      Limit:5})` liefert 1 Kandidaten mit `ImageURL` == `coverImage.extraLarge`-Wert.
    - Test 2 (Fallback): Fixture mit `coverImage.extraLarge: ""` aber `coverImage.large` gesetzt →
      Kandidat nutzt den `large`-Wert.
    - Test 3 (Regression, Banner-Pfad unverändert): Fixture mit `bannerImage` gesetzt,
      `AssetKind:"banner"` → Kandidat nutzt weiterhin `bannerImage` (nicht `coverImage`), identisch zum
      bisherigen Verhalten.
  </behavior>
  <action>
Aktuellen Bereich des `AniListAssetSearchProvider`-Blocks (Kommentar, Typ, Konstruktor, `Source`,
`SupportsAssetKind`, `SearchAssetCandidates`) in `backend/internal/services/anime_create_enrichment.go`
per `grep -n "AniListAssetSearchProvider fetches banner"` lokalisieren (Zeilennummern haben sich seit
Task 1/2 verschoben) und vollständig entfernen (`zerochanMatchesAssetKind` direkt danach bleibt
unverändert an Ort und Stelle).

Neue Datei `backend/internal/services/asset_search_anilist.go` anlegen: den entfernten Block hinein
verschieben, mit folgendem Umbau. `SupportsAssetKind(assetKind string) bool` liefert `true` für
`"banner"` ODER `"cover"` (bisher nur `"banner"`). Die GraphQL-Konstante `gql` um das Feld
`coverImage{extraLarge large}` innerhalb der `media{...}`-Selektion erweitern (neben den bestehenden
Feldern `id title{romaji english} bannerImage format`). Den Antwort-Struct um `CoverImage struct {
ExtraLarge string \`json:"extraLarge"\`; Large string \`json:"large"\` } \`json:"coverImage"\`` auf
`Media` erweitern. In der Kandidat-Bau-Schleife: wenn `req.AssetKind == "cover"`, die Bild-URL aus
`media.CoverImage.ExtraLarge` bestimmen, bei leerem Wert auf `media.CoverImage.Large` zurückfallen; ist
auch das leer, diesen `media`-Eintrag überspringen (kein Kandidat). Sonst (Pfad für `"banner"`,
unverändert): weiterhin `media.BannerImage` verwenden, bei leerem Wert überspringen — exakt wie bisher.
`PreviewURL`/`ImageURL` beide auf den gewählten Wert setzen (gleiches Muster wie bisher beim Banner).
`candidate.ID` bleibt `fmt.Sprintf("anilist-%d", media.ID)`.

`backend/internal/services/asset_search_anilist_test.go` anlegen mit Test 1, 2, 3 aus `<behavior>` (Fake-
`httptest.NewServer`, `AniListAssetSearchProvider{baseURL:server.URL, httpClient:server.Client()}` per
Struct-Literal).

In `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts`: die Zeichenkette an der
aktuellen Stelle (per Grep `"Keine passenden Assets gefunden. Bitte pruefe Titel oder Quelle."`
verifizieren, aktuell Zeile ~1180) von "Keine passenden Assets gefunden. Bitte pruefe Titel oder Quelle."
zu "Keine passenden Assets gefunden. Bitte prüfe Titel oder Quelle." ändern — NUR dieses eine Vorkommen,
die beiden anderen "pruefe"-Stellen in dieser Datei (AniSearch-Fehlermeldung, Jellyfin-Suchhinweis) NICHT
anfassen (andere Meldungen, außerhalb des GAP-17-Scopes).

In `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts`: im bestehenden
`describe("useAdminAnimeCreateController (hook execution)", ...)`-Block (nutzt bereits `apiMocks`/
`intakeMocks` mit `beforeEach`-Resets, siehe `handlers.openAssetSearch`/`handlers.setAssetSearchQuery`/
`handlers.handleAssetCandidateSearch` sowie `assetSearch.errorMessage` im Rückgabeobjekt des Hooks) einen
neuen Test ergänzen: `intakeMocks.searchAdminAnimeCreateAssetCandidates.mockResolvedValueOnce({data:[]})`,
`result.current.handlers.openAssetSearch("cover")`,
`result.current.handlers.setAssetSearchQuery(".hack//G.U. Trilogy")`, `await act(async () => {
await result.current.handlers.handleAssetCandidateSearch() })`, dann
`expect(result.current.assetSearch.errorMessage).toBe("Keine passenden Assets gefunden. Bitte prüfe
Titel oder Quelle.")`. Existierenden Testaufbau (Auth-Token-Mocking, `renderHook`) aus einem
benachbarten, bereits funktionierenden Test in derselben Datei als Vorlage nehmen.
  </action>
  <verify>
    <automated>docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test ./internal/services/... -run TestAniListAssetSearchProvider -v" 2>&1 | tail -80; docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/create/useAdminAnimeCreateController.test.ts" 2>&1 | tail -80</automated>
  </verify>
  <done>
`asset_search_anilist.go` existiert, ist unter 450 Zeilen, `SupportsAssetKind` deckt "cover" und "banner"
ab. Alle drei neuen Go-Tests grün. Die Fehlermeldung im Frontend verwendet "prüfe" (echtes Umlaut); der
neue Frontend-Regressionstest ist grün; alle bestehenden Tests in
`useAdminAnimeCreateController.test.ts` bleiben grün.
  </done>
</task>

<task type="auto">
  <name>Task 4: Live-Beweis gegen echte APIs für „.hack//G.U. Trilogy“ + GAP-17-Eintrag in 165-UAT.md</name>
  <files>.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md</files>
  <action>
Temporäres, NICHT zu committendes Programm `backend/cmd/gap17probe/main.go` anlegen (`package main`,
Modulpfad `team4s.v3/backend/cmd/gap17probe`, darf `team4s.v3/backend/internal/services` importieren, da
es innerhalb desselben Moduls unter `backend/` liegt): liest `TMDB_API_KEY` und `FANART_API_KEY` aus den
Umgebungsvariablen (per `os.Getenv`, NIEMALS den Wert selbst ausgeben), baut einen
`&http.Client{Timeout: 20 * time.Second}`, konstruiert `services.NewTMDBAssetSearchProvider(tmdbKey,
httpClient)`, `services.NewAniListAssetSearchProvider(httpClient)`,
`services.NewZerochanAssetSearchProvider(httpClient)`,
`services.NewFanartTVAssetSearchProvider(fanartKey, tmdbKey, httpClient)`. Für jede Kombination
(TMDB,"cover"), (AniList,"cover"), (Zerochan,"cover"), (FanartTV,"logo") `SearchAssetCandidates(ctx,
models.AdminAnimeAssetSearchRequest{AssetKind: kind, Query: ".hack//G.U. Trilogy", Limit: 10})` aufrufen
und `fmt.Printf("%-10s %-10s hits=%d err=%v\n", sourceLabel, kind, len(candidates), err)` ausgeben — KEINE
API-Keys, KEINE vollständigen Request-URLs ausgeben, nur Quelle/Slot/Trefferanzahl/Fehler. Programm endet
mit Exit-Code 0 unabhängig von einzelnen Provider-Fehlern (Teilergebnisse sind erwartet und ok).

Ausführen: `docker exec team4sv30-backend sh -c "cd /app && go run ./cmd/gap17probe"`, die komplette
Ausgabe wörtlich für SUMMARY.md sichern (dies ist der geforderte Nachweis "Treffer pro Quelle" für
".hack//G.U. Trilogy"). Erwartung basierend auf den in diesem Plan live verifizierten API-Antworten:
TMDB(cover) und AniList(cover) hits > 0; FanartTV(logo) hits > 0 (Movie-Endpunkt-Pfad); Zerochan(cover)
kann 0 oder mehr sein (unveränderte Booru-Suche, nicht Teil der GAP-17-Fix-Logik).

Danach das gesamte Verzeichnis `backend/cmd/gap17probe/` löschen (`rm -rf backend/cmd/gap17probe`) und
mit `git status --short` bestätigen, dass es weder als untracked noch als staged auftaucht (nie
committet, sauber entfernt — "cleaned up afterward" laut Auftrag).

In `.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md`: vor dem Bearbeiten mit
`file 165-UAT.md` und `cat -A 165-UAT.md | tail -5` bestätigen, dass die Datei reine LF-Zeilenenden
verwendet (kein `^M`). Am Ende der `## Gaps`-Liste (nach dem bestehenden GAP-16-Eintrag) einen neuen
Eintrag im exakt gleichen Format wie die bestehenden `status: resolved`-Einträge (siehe GAP-01..04-Eintrag
weiter oben in derselben Datei) anhängen:

  - truth: "GAP-17 (Live-UAT, 2026-09-22): Online-Bildersuche findet keine Poster für Film-Format-Anime
    (z. B. „.hack//G.U. Trilogy“) — TMDB/Fanart.tv suchten nur TV-Serien, AniList lieferte nur Banner,
    der Cover-Slot fragte nur Zerochan ab"
    status: resolved
    reason: "Quick-Task 260922-ikh: TMDB durchsucht jetzt /search/tv UND /search/movie (Bilder je nach
    Treffer über /tv/{id}/images bzw. /movie/{id}/images); Fanart.tv nutzt bei Film-Treffern den
    movies-Endpunkt (TMDB-Movie-ID statt TVDB); AniList liefert jetzt auch coverImage (nicht mehr nur
    bannerImage); Cover-Slot fragt zusätzlich AniList + TMDB ab (offizielle Poster vor Zerochan-Fanart);
    Fehlermeldung korrigiert (\"prüfe\" statt \"pruefe\"). Live gegen echte APIs für
    \".hack//G.U. Trilogy\" verifiziert (TMDB movie id 26595, AniList media id 3269, Fanart.tv movies-
    Endpunkt keyed by 26595)."
    severity: major
    test: 1
    root_cause: "siehe .planning/quick/260922-ikh-gap-17-online-bildersuche-findet-keine-f/260922-ikh-SUMMARY.md"
    artifacts: []
    missing: []

Nach dem Edit erneut `cat -A 165-UAT.md | tail -20` prüfen — keine `^M`-Zeichen, LF bleibt erhalten
(Write/Edit-Tool verwenden, kein Bash-Heredoc).
  </action>
  <verify>
    <automated>grep -c "GAP-17" /home/d1sk/team4s/.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md; file /home/d1sk/team4s/.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md; ls backend/cmd/gap17probe 2>&1 || echo "gap17probe cleaned up"</automated>
  </verify>
  <done>
Live-Probe-Ausgabe mit Treffer-Anzahl pro Quelle (TMDB, AniList, Zerochan, Fanart.tv) für
".hack//G.U. Trilogy" liegt vor und wird wörtlich in SUMMARY.md dokumentiert. `backend/cmd/gap17probe/`
existiert nicht mehr, taucht nicht in `git status` auf. 165-UAT.md enthält den neuen GAP-17-Eintrag mit
`status: resolved`, Datei bleibt LF-only.
  </done>
</task>

<task type="auto">
  <name>Task 5: Gesamtverifikation, Backend-Container-Rebuild, gezielter Commit</name>
  <files>backend/internal/services/anime_create_enrichment.go, backend/internal/services/anime_create_enrichment_test.go, backend/internal/services/asset_search_service.go, backend/internal/services/asset_search_tmdb.go, backend/internal/services/asset_search_tmdb_lookup.go, backend/internal/services/asset_search_tmdb_test.go, backend/internal/services/asset_search_fanarttv.go, backend/internal/services/asset_search_fanarttv_test.go, backend/internal/services/asset_search_anilist.go, backend/internal/services/asset_search_anilist_test.go, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts, frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts, .planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md</files>
  <action>
1. Vollständige Verifikation im laufenden (noch nicht neu gebauten) Container:
   `docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test
   ./internal/services/... ./internal/handlers/... -v 2>&1 | tail -200"`. Alle in diesem Plan neuen/
   geänderten Tests müssen grün sein; bestehende, vorbestehend unabhängige Fehlschläge (falls vorhanden)
   NICHT als Regression werten, aber im SUMMARY.md namentlich auflisten.
2. Zeilenzahl-Kontrolle: `wc -l backend/internal/services/asset_search_*.go
   backend/internal/services/anime_create_enrichment.go` — keine der neuen/umgebauten
   `asset_search_*.go`-Dateien überschreitet 450 Zeilen; `anime_create_enrichment.go` ist kürzer als der
   Ausgangsstand (Referenzwert: 1765 Zeilen vor diesem Plan).
3. Backend-Container gemäß Auftrag NEU BAUEN (NICHT `docker cp`):
   `docker compose up -d --build team4sv30-backend`. Danach Health-Check:
   `docker compose ps team4sv30-backend` zeigt "Up"/gesund, sowie
   `curl -sf http://192.168.235.196:8092/health -o /dev/null -w "%{http_code}\n"` (oder
   `http://127.0.0.1:8092/health`) liefert 200.
4. Nach dem Rebuild die Kern-Tests im NEUEN Container erneut ausführen, um zu bestätigen, dass der
   Rebuild denselben Code enthält:
   `docker exec team4sv30-backend sh -c "cd /app && go test ./internal/services/... -run
   'TestTMDBAssetSearchProvider|TestFanartTVAssetSearchProvider|TestAniListAssetSearchProvider|TestAnimeAssetSearchService_CoverSlot' -v"`.
5. Gezielt committen (kein `git add -A`/`.`): alle in `files_modified` gelisteten Pfade explizit per
   Pfad zu `git add` hinzufügen (die Datei `backend/cmd/gap17probe/` existiert zu diesem Zeitpunkt
   bereits nicht mehr und darf nicht auftauchen), dann `git commit` mit einer Commit-Message, die auf
   GAP-17 (Phase 165 Live-UAT) verweist. Kein `git push`, kein `git stash`.
  </action>
  <verify>
    <automated>docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./..." 2>&1 | tail -30 && docker compose ps team4sv30-backend</automated>
  </verify>
  <done>
`go build`/`go vet` fehlerfrei, alle betroffenen Go-Tests grün (vor UND nach dem Rebuild). Keine
`asset_search_*.go`-Datei über 450 Zeilen; `anime_create_enrichment.go` netto kleiner als vorher.
Backend-Container per `docker compose up -d --build` neu gebaut und gesund (`/health` liefert 200).
Änderungen gezielt committet (kein `git add -A`), kein Push. `backend/cmd/gap17probe/` existiert nicht
mehr und ist nicht Teil des Commits.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Admin-Browser → Backend Admin-API | `GET /api/v1/admin/anime/assets/search` (bereits admin-only geschützt, unverändert durch diesen Plan). Eingabe: `slot`/`q`/`limit`/`page`/`sources`-Query-Parameter — bestehende Eingabeklasse, keine neue. |
| Backend → TMDB/AniList/Fanart.tv/Zerochan (Upstream) | Neu: TMDB und Fanart.tv werden jetzt mit bis zu 2 statt 1 Suchanfrage pro Nutzeranfrage kontaktiert (`/search/tv` dann ggf. `/search/movie`); AniList-GraphQL-Query um ein zusätzliches Feld erweitert. Der von Admins eingegebene Freitext-Suchbegriff wird weiterhin als URL-Query-Parameter bzw. GraphQL-Variable an alle vier Drittanbieter-APIs weitergereicht. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-260922-ikh-01 | Tampering | `asset_search_tmdb_lookup.go` `tmdbSearchFirstID` (Query-Parameter an TMDB) | accept | Der Suchbegriff wird über `url.Values.Encode()` korrekt escaped (bestehendes, unverändertes Muster aus dem alten `searchTVShow`); kein String-Concatenation-Risiko. TMDB/AniList/Fanart.tv sind reine GET/POST-JSON-APIs ohne serverseitige Query-Ausführung — kein Injection-Vektor. |
| T-quick-260922-ikh-02 | Information Disclosure | `asset_search_fanarttv.go` (Fanart.tv-Request enthält `api_key` als Query-Parameter) | mitigate | Beim Umbau des Movie-Pfads (Task 2) explizit sicherstellen, dass kein neuer `log.Printf`/Fehlerstring die volle Request-URL (`imagesURL.String()`) ausgibt — nur Status-Code + numerische ID. Bestehender Code loggt hier ohnehin nichts; die Mitigation ist, dies beim Hinzufügen neuer Codepfade nicht zu brechen. Ebenso: das neue `gap17probe`-Live-Probe-Programm (Task 4) gibt explizit KEINE API-Keys und KEINE vollständigen Request-URLs aus, nur Trefferanzahlen. |
| T-quick-260922-ikh-03 | Denial of Service | `asset_search_service.go` `SearchAssetCandidates` (Orchestrator, jetzt bis zu 2 statt 1 TMDB/Fanart.tv-Aufrufe pro Provider) | accept | Fest begrenzte, kleine Anzahl an Aufrufen pro Suchanfrage (max. 2 TMDB-Suchaufrufe + 1 Bilder-Aufruf pro Provider, kein N+1 über Kandidaten); unverändertes Nutzer-getriggertes Rate-Limit-Verhalten der bestehenden Admin-Auth. Kein extern kontrollierbarer Multiplikator. |
| T-quick-260922-ikh-04 | Denial of Service | `asset_search_service.go` Fehler-Logging (neu: `log.Printf` bei Provider-Fehlern) | accept | Logging ist an die Anzahl der Provider gebunden (max. 6 Log-Zeilen pro Suchanfrage), kein User-kontrollierbares Log-Flooding; Query-String wird zwar geloggt, aber ist bereits Teil der Request-Eingabe eines bereits admin-authentifizierten Nutzers (kein neues Vertrauensproblem). |
</threat_model>

<verification>
1. `docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test ./internal/services/... -v"` — alle grün, inklusive aller in Task 1-3 neu hinzugefügten Tests.
2. `wc -l backend/internal/services/asset_search_*.go` — jede Datei unter 450 Zeilen.
3. `wc -l backend/internal/services/anime_create_enrichment.go` — kleiner als 1765 (Ausgangswert vor diesem Plan).
4. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/create/useAdminAnimeCreateController.test.ts"` — grün, inklusive des neuen Umlaut-Regressionstests.
5. `docker compose up -d --build team4sv30-backend` gefolgt von `curl` gegen `/health` — 200, Container gesund.
6. Live-Probe-Ausgabe (Task 4) zeigt Treffer > 0 für TMDB(cover) und AniList(cover) bei Query ".hack//G.U. Trilogy".
7. `backend/cmd/gap17probe/` existiert nach Task 4/5 nicht mehr; `git status --short` zeigt es nicht.
8. `.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md` enthält den neuen GAP-17-Eintrag (`status: resolved`), Datei bleibt LF-only.
9. `git diff --stat` zeigt ausschließlich die in `files_modified` gelisteten Pfade — kein `git add -A`, kein Push.
</verification>

<success_criteria>
- Cover-Bildsuche für Film-Format-Anime (z. B. „.hack//G.U. Trilogy“) liefert echte Treffer statt einer
  leeren Ergebnisliste.
- TMDB und Fanart.tv finden sowohl TV-Serien als auch Filme; AniList liefert für den Cover-Slot ein
  echtes Cover-Bild.
- Der Cover-Slot fragt AniList, TMDB und Zerochan ab, mit offiziellen Postern (AniList/TMDB) vor
  Zerochan-Fanart in der Ergebnisreihenfolge.
- Kein Provider verursacht N+1-Anfragen; einzelne Provider-Fehler werden geloggt statt die gesamte Suche
  stillschweigend abzubrechen.
- Die Fehlermeldung bei leerer Asset-Suche verwendet ein echtes Umlaut.
- Alle neuen/umgebauten Provider-Dateien liegen unter 450 Zeilen; `anime_create_enrichment.go` ist netto
  kleiner als vor diesem Plan.
- Provider-Level-Tests mit gefakten HTTP-Antworten decken alle fünf im Auftrag geforderten Testfälle ab;
  alle bestehenden Tests bleiben grün.
- Ein Live-Probe-Nachweis (Treffer pro Quelle, keine Secrets im Output) für „.hack//G.U. Trilogy“ liegt
  vor und ist nach Gebrauch aus dem Repository entfernt.
- Backend-Container per `docker compose up -d --build` neu gebaut und gesund.
- GAP-17 ist in 165-UAT.md als `status: resolved` dokumentiert. Kein `git push`, kein `git stash`, keine
  `.env`- oder `team4s_v2`-Datenänderung.
</success_criteria>

<output>
Create `.planning/quick/260922-ikh-gap-17-online-bildersuche-findet-keine-f/260922-ikh-SUMMARY.md` when done
</output>
