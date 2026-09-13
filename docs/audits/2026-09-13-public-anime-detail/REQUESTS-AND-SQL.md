# Öffentliche Anime-Detailseite: Requests und SQL

**Audit:** 2026-09-13, ausschließlich lesend. **Repository:** `/home/d1sk/team4s` über `ssh team4s-linux`.
**Snapshot:** `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`. Untracked `frontend/scripts/shot2.mjs` unverändert.
**Scope:** `frontend/src/app/anime/[id]/page.tsx`, seine gerenderten Kinder, Netzwerk-/SQL-Seams und Navigation zur Projekt-/Streaming-Grenze.
Keine Implementierung, Migration, Datenmutation, Secrets-Lektüre, Commits, Stats-Resets oder aktiviertes SQL-Tracing. Zahlen zu SQL sind ausdrücklich **statisch abgeleitete erfolgreiche Callchains**, keine Laufzeitmessungen. Browser-/HTTP-Messwerte gehören zum Hauptaudit.

## 1. Verbindliche Architektur und Quellenlage

- `AGENTS.md`, `AI-HANDOFF.md`, `docs/api/api-contracts.md` und `docs/frontend/auth-api-client.md` verlangen Wiederverwendung, explizite Verträge und zentrale Refresh-Seams. Public-UI darf Refresh-only-Sessions nicht als ausgeloggt behandeln.
- `docs/architecture/db-schema-fansub-domain.md`: Anime/Episoden neutral; Projektzuordnung über `anime_fansub_groups`; Versionen über `fansub_releases -> release_versions -> release_version_groups.fansub_group_id`. Der alte Stand des Dokuments ersetzt keine aktuelle Codeprüfung.
- `.planning/STATE.md:1` / `.planning/ROADMAP.md`: v1.4 Coverage, Phase 157 ausführungsseitig 10/10, menschlicher Sign-off offen. `157-VERIFICATION.md` hat `gaps_found`; nicht als vollständige Abnahme interpretiert.
- Phase 152: `.planning/phases/152-public-fansub-gruppenseite-konsolidierung-und-modernisierung/152-CONTEXT.md` D07 trennt Public-Profil und Domain-Projektion fachlich. Kein pauschales Zusammenlegen mehrerer Endpunkte. Verifikation liegt vor.
- Phase 153: `.planning/phases/153-public-member-clientlast-und-speicherretention/153-01-SUMMARY.md` und `153-VERIFICATION.md` belegen begrenzte Bild-/Retention-Arbeit am Memberprofil. Kein `153-CONTEXT.md` im Phasenordner gefunden. Befunde anderer Seiten sind kein Messergebnis für Anime.
- Phase 154: `.planning/phases/154-aggregator-duplikate-bildbudget-und-viewer-aufloesung/154-CONTEXT.md` / `154-VERIFICATION.md`: unnötige Vollprofile für Viewer vermeiden; Public-/Owner-Semantik getrennt; unreproduzierter Browserabsturz bleibt offen.
- Phase 155: `.planning/phases/155-fansub-projektseite-read-model-und-query-budget/155-CONTEXT.md`, `155-VERIFICATION.md`: schlanker Resolver gilt für die **drei Pretty-Routen**, Contributor-Summary, Latest/History/Counts getrennt, keine initialen ungerenderten Themes/Media. Numerische Route teilt Loader und bleibt Compatibility; sie ist nicht automatisch gelöscht oder redirectpflichtig.
- Phase 156: `.planning/phases/156-segment-domain-konsistenz-und-oeffentliche-release-projektion/156-CONTEXT.md`, `156-07-SUMMARY.md`, `156-13-SUMMARY.md`, `156-15-SUMMARY.md`: `theme_segment_assignments` ist Release-Zugehörigkeitswahrheit; Release-Detail zeigt jedes zugewiesene Segment; Projekt-Timeline darf Wiederholungen vermeiden. Credits = aktuelle Origin-Beiträge ∩ relevante Rollen ∩ explizite `theme_segment_contributors`. Aktuelles Budget der Segmentprojektion nach Plan 13: vier Queries, nicht die drei aus Plan 09.
- `DECISIONS.md:869` ersetzt die frühere Release-Detail-Unterdrückung bereits gesehener Segmente; `DECISIONS.md:928` erlaubt Banner/Cover im schlanken Resolver ohne zusätzliche Query. `DECISIONS.md:39` verlangt begrenztes Public-Segmentplayback, ist keine Autorisierung für Full-Episode-Playback.
- **Prüflücke:** kein `156-VERIFICATION.md` im Phasenordner. `156-15-SUMMARY.md` dokumentiert GAP-02 Live-UAT ausdrücklich offen. Dieser Audit schließt ihn nicht.

## 2. Ablauf und Budget

`page.tsx:52` liest SSR-Cookies; `page.tsx:74` lädt zuerst Anime. Erst nach dessen Erfolg startet `page.tsx:106` fünf unabhängige Zweige per `Promise.allSettled`. Fehler eines Nebenzweigs zerstören die Seite nicht.
Nach Hydration starten `AnimeMediaProvider` und `AnimeContributionsSection` ihre Effects. Aufklappen von Episoden, Fansub-Wechsel oder Versionsbeiträgen löst keine neuen Datenrequests aus.

| Phase | Erfolgreiche fachliche Backend-Requests | SQL-Statements, statisch |
|---|---:|---:|
| SSR anonym, alle Daten ungecacht | 5: Anime + Fansubs + grouped Episodes + Comments + Relations | 7 + 2 + 4 + 3 + 8 = **24** |
| Clientinitial anonym | Backdrops + Contributions | 8 + 3 = **11** |
| Summe fachliche initiale Daten | **7** | **35** |
| SSR Watchlist bei Accesscookie/Fallbacktoken | +1 | +1 Repository-SELECT; Auth-Middleware separat |
| Edge-Nachbarn nach Interaktion | +1 bis +3 Listenrequests | je 3 im aktuellen Schema |
| Physische Medien, AppShell, Framework-RSC/HMR | separat | nicht im Datenbudget |

Voraussetzungen: erfolgreiche aktuelle v2-Schemawege, Assets-Repository verdrahtet, keine Netzwerk-Retries, keine Next-Cachehits. Schema-Queries sind **mitgezählt**: es gibt in `anime_schema.go:26` keinen Cache. SQL-`LATERAL`/Unterabfragen zählen zum jeweiligen Statement, nicht als zusätzliche Netzwerk-Roundtrips.
`cookies()` macht die Seitenantwort dynamisch; das entfernt nicht automatisch die expliziten Fetch-Revalidierungsoptionen. Das Live-System läuft im Dev-Modus; Fetchoptionen sind keine Behauptung über tatsächliche Cachehits.

## 3. Vollständige Requestmatrix

Alle Pfade unter `/api/v1`, sofern nicht anders benannt. Die primären Public-Handler setzen keinen eigenen JSON-`Cache-Control`-Header; keine Redis-Readcache-Nutzung in diesen Callchains gefunden.

| Request/Trigger | Caller und Helper | Handler/Repository, SQL | Datenkonsum / Cache / Auth |
|---|---|---|---|
| GET `/anime/:id`, SSR zuerst | `page.tsx:74`; `api.ts:1568 getAnimeByID` | `handlers/anime.go:175 GetByID -> repository/anime.go:89 -> anime_v2.go:107`; 7 | Titel/Typ/Status/Jahr/Genres/Beschreibung/Cover/Views/max_episodes; `episodes` nur Fehlerfallback; `next.revalidate=30`, plain fetch, public |
| GET `/anime/:id/fansubs`, SSR parallel | `page.tsx:106`; `api.ts:2064` | `handlers/fansub_group_anime.go:15 -> fansub_repository.go:1274 ListAnimeFansubs`; 2 | Chips, Auswahl, Gruppenkurzgeschichte. `cache:no-store`, authorizedFetch, Route public |
| GET `/anime/:id/episodes`, SSR parallel | `page.tsx:106`; `api.ts:2136 getGroupedEpisodes` | `handlers/episode_version_reads.go:14 -> episode_version_repository.go:30 ListGroupedByAnimeID`; 4 | Alle Varianten für lokal aufklappbare Liste; defaults `includeVersions=true, includeFansubs=true`; `no-store`, Route public |
| GET `/anime/:id/comments?page=1&per_page=10`, SSR parallel | `page.tsx:106`; `api.ts:2928` | `handlers/comment.go:36 -> repository/comment.go:22`; 3 | Text/Autor/Datum/ID, total; übrige Pagination-Meta unbenutzt. Plain fetch `no-store`, public |
| GET `/watchlist/:id`, SSR nur mit Accesscookie/Fallbacktoken | `page.tsx:53,110`; `api.ts:3040` | `handlers/watchlist.go GetByUserAndAnimeID -> repository/watchlist.go:136`; 1 + Auth | Seite nutzt nur Erfolgsboolean, nicht Titel/Cover/etc. `no-store`; Authpflicht. Fehler werden wie „nicht enthalten“ behandelt |
| GET `/anime/:id/relations`, SSR parallel | `page.tsx:111`; `api.ts:1634` | `handlers/anime.go:212 -> GetByID` 7 + `anime_relations.go:21` 1 =8 | Related-ID/Titel/Typ/Relation/Cover/Jahr. `next.revalidate=60`, authorizedFetch; 404 →[] |
| GET `/anime/:id/backdrops`, Client-Mount | `AnimeMediaProvider.tsx:13,31`; `api.ts:1606` | `handlers/anime_backdrops_handler.go:15 -> AnimeAssetRepository.GetResolvedAssets + AnimeRepository.GetMediaLookupByID`; 8 + optionale Jellyfin-HTTP | Ein Manifest für Rotator/Logo/Banner; `no-store`, authorizedFetch. Shared Promise Map, ohne TTL/Eviction; public Handler |
| GET `/anime/:id/contributions`, Client-Mount | `AnimeContributionsSection.tsx:21`; `api.ts:9753` | `handlers/contributions_public_handler.go:55 -> anime_contributions_public_repository.go:68`; 3 | Gruppen + erste3 allgemeine Personen + komplette zunächst eingeklappte Versionsaufschlüsselung für spätere Anzeige. Plain fetch; `next.revalidate=60` im Browser erzeugt **keinen Next-Servercache** |
| GET `/anime?<grid_query>`, Hover/Focus/Touch/Klick | `AnimeEdgeNavigation.tsx:58,75,89,100`; `api.ts:1532 getAnimeList` | `handlers/anime.go List -> repository/anime.go:29 -> anime_v2.go:17`;3 je Page | Ganzer aktueller Ausschnitt, evtl vorige/nächste Page für nur zwei Nachbarn; API-Pagination limitiert; Client speichert zwei Treffer; keine Initialabfrage |
| POST `/anime/:id/comments`, Absenden | `CommentForm.tsx:64`; `api.ts:2952` | `handlers/comment.go:97 -> repository/comment.go:91`; Existenz+INSERT RETURNING (nur gelesen, nicht ausgeführt) | Auth + Rate-Limit; Text bis4000. Lokaler prepend max10 und anschließend `router.refresh()` bei `CommentForm.tsx:71`: SSR-Requests erneut möglich |
| POST `/watchlist` / DELETE `/watchlist/:id`, Button | `WatchlistAddButton.tsx:34`; `api.ts:3008,3068` | `watchlist.go CreateByUser/DeleteByUser`; POST2 bei existierendem Eintrag,4 bei neuem; DELETE1 + Auth | Keine Ausführung im Audit; zentraler Transport; UI blockiert derzeit Refresh-only vor Transport |
| GET `/api/releases/:id/stream`, Play-Link | `FansubVersionBrowser.tsx:258` → Next `app/api/releases/[id]/stream/route.ts:40` | Relay → optional POST grant → GET Backend stream; siehe Abschnitt6 | Benutzerinteraktion, kein initialer Play-/Permissionrequest, kein Playback im Audit |
| GET Medien-URL / `/_next/image` | Poster/CSS-Cover, Rotator, Gruppenlogos, Relations-/Edge-Bilder | statische/Datei-/Providerseams, Abschnitt7 | browsergesteuert, getrennt von JSON; Video `preload=auto`; keine feste Payloadzahl aus Code ableitbar |

**Nicht vorhanden:** initiales `getGroupReleases`, `getGroupThemes`, Release-Detail, Release-Media, Member-Vollprofil oder Contributor-Request pro Person auf der Anime-Seite. Diese gehören zu anderen Routen. Kein API-Polling beim Fansub-Wechsel.

## 4. SQL je Datenrequest

### 4.1 Anime-Detail — 7

1. `anime_schema.go:26`: `information_schema.columns` für aktuelle Schema-`anime`; erkennt u.a. slug/status.
2. `anime_v2.go:145`: Basisrow `anime WHERE id=$1 AND status<>'disabled'`; `anime_types`, priorisierter Titel aus `anime_titles/languages/title_types LIMIT1`, Poster/Banner via `anime_media/media_assets/media_types` und original/ready `media_files LIMIT1`.
3. `anime.go:207 loadAnimeEpisodes`: alle `episodes WHERE anime_id=$1`; kein LIMIT, keine Statusfilterung; Sortierung Go. Felder inkl. stream_links/filename.
4. `anime_source_links.go:52`: alle Sources des Anime, alphabetisch.
5.–7. `anime_metadata.go:38,67,98`: normalisierte Titel + Genres + Tags, jeweils anime-scoped, ohne Pagination.
`anime_v2.go:245` setzt `ViewCount=0` statt Datenbankzählung. Die Seite rendert dieses Feld als Views. Keine Zähleraktualisierung beim GET.

### 4.2 Fansubs — 2

`fansub_repository.go:1274,1430`: Existenz `SELECT EXISTS FROM anime WHERE id=$1` **ohne disabled-Gate**; anschließend `anime_fansub_groups JOIN fansub_groups WHERE anime_id=$1 ORDER BY is_primary DESC,name`. Keine hydrateFansubGroup-Counts/Links, kein Gruppen-N+1.
`notes,created_at,anime_id,fansub_group_id` zusätzlich zum Summary; Kurzgeschichte verwendet Gründungs-/Auflösungsjahr, Land und Status über `frontend/src/lib/fansub-summary.ts`.

### 4.3 Gruppierte Episoden — 4

- `episode_version_repository.go:30`: Existenzquery; neutraler Episodentitelmap-Load.
- `episode_version_repository_read_helpers.go:22`: `episodes WHERE anime_id=$1 AND episode_number ~ '^[0-9]+$'`; Go ignoriert <=0.
- `...read_helpers.go:63`: `episodes -> release_variant_episodes -> release_variants -> release_versions -> fansub_releases`; `COUNT(DISTINCT rv.id)` gruppiert nach Integer-Episodennummer.
- `...read_helpers.go:97`: Varianten über **primäre** Episode `fansub_releases.episode_id`; coverage über `release_variant_episodes`; Streaminfos über `release_streams/stream_sources`; Gruppen via `release_version_groups.fansub_group_id`.
- `...read_helpers.go:155`: zusätzlich korrelierter Segment-LATERAL mit Anime, Gruppe, Versionslabel und Start-/Endepisode; **kein `theme_segment_assignments`**.
- Kein globales LIMIT, Cursor oder Status-/Public-Predicate. `includeVersions=false` hat drei Statements; der tatsächliche Consumer ruft defaults=true.
- `...read_helpers.go:249`: bei geladenen Varianten wird count aus `len(group.Versions)` berechnet; die separate Countquery nutzt nur Counts-/Leerfallback. Bei nichtleerer Variantenliste werden rein neutrale Episoden ohne Variante nicht hinzugemerged.
- `version.id` ist **release_variants.id**. `release_version` ist Label, nicht kanonische ID.
- UI liest ID/Titel/Gruppen/Qualität/Untertiteltyp/Datum und Episode-/Default-/Countfelder. Nicht gerendert: `media_provider,media_item_id,covered_episode_numbers,release_version,production_started_on,crc32,stream_url,segment_count,has_segment_asset,duration_seconds,created_at,updated_at`.
- Keine Query in `rows.Next()`; SQL-LATERAL ist kein Application-N+1. Kreuzprodukte zwischen coverage/groups sind statisch möglich, aber in den aktuellen Daten nicht als Duplikat nachgewiesen; kein bestätigter Bug.

### 4.4 Comments — 3

`repository/comment.go:22`: enabled-Anime-Existenz, COUNT aller Kommentare, Rows mit `ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`. Handler begrenzt per_page auf100, Seite nutzt10.
`CommentSection.tsx` besitzt keinen Nachladebutton/keinen Client-GET. >10 ältere Kommentare sind über API paginierbar, in dieser UI nicht erreichbar. Kein aktueller >10-Datensatz im Audit hergestellt.

### 4.5 Relations — 8

`handlers/anime.go:221` verwirft Ergebnis des kompletten `GetByID` nach Existenzprüfung: dessen alle sieben Queries einschließlich Episode-/Source-/Tagdaten laufen.
`anime_relations.go:24`: UNION-artige bidirektionale CASE-Projektion aus `anime_relations`, `relation_types`, Ziel-`anime`; aktive Ziele; `DISTINCT ON(anime_id)`, kein LIMIT. Liefert Legacy-`a.title,a.cover_image,a.type` statt derselben normalisierten Auswahl wie Anime-Detail. Unterschied der Quellen belegt, kein falscher Live-Titel nachgewiesen.

### 4.6 Backdrops — 8, externe HTTP separat

`anime_assets.go:51,1704,1718`: Schema-Prüfung `information_schema.tables` auf anime_media =1; enabled-unabhängige Existenz =1; anime_media/media_assets/media_types mit je `LATERAL media_files LIMIT1` und `media_external LIMIT1` =1.
`anime.go:263 GetMediaLookupByID`: Schema=1 + `anime_v2.go:282` Lookup=1 + normalisierte Titel/Genres/Tags=3. Letzte beiden Metadaten-Sets werden vom Lookup nicht genutzt.
Persistierte Dateien werden bevorzugt. Lookup läuft dennoch; bei vollständig gefülltem Manifest sind Providerprobes weitgehend übersprungen, Lookup nicht.
Falls Provider konfiguriert und Serie nicht direkt im Sourcefeld: `anime_backdrops_resolution.go:12` Suchbegriffe aus Titeln/Folder, je `/Items?IncludeItemTypes=Series&Recursive=true&SearchTerm=...&Limit=10`.
Fehlende Videos: `/Items/:id/ThemeVideos` einmal; Backdrops bis12 + optional Index0; Logo/Banner je Probe. `anime_backdrops_probe.go:12,51,83,97`, `anime_backdrops_urls.go:9`.
Keine Repo-Writes in diesem Handler/Resolver; externe GETs sind keine Import-/Asset-Persistierung. Keine globale Query-Zeitbehauptung, Provider ist zusätzliche Latenzquelle nur bei tatsächlich aktivem Zweig.
Persistierte Medien behalten Anime-Ownership. Diese Route lädt keine release_version_media/theme_segment_assignments.

### 4.7 Contributions — 3

`anime_contributions_public_repository.go:68`: Anime-Default-Beiträge `release_version_id IS NULL`, historische Membership+Member+Gruppe+Rollen. Öffentlich nur `ac.is_public_on_anime_page=true AND hfgm.visibility='public'`. Publicslug ausschließlich bei öffentlichem Memberprofil; Name kann als historischer Credit dennoch erscheinen.
`...:175 attachHiddenCounts`: gruppierter COUNT DISTINCT member über nichtöffentliche Beiträge/Memberships.
`anime_contributions_public_versions_repository.go:38`: Versionsbeiträge `IS NOT NULL` mit denselben Publicflags plus release_versions/fansub_releases/episodes; Rolearrays gruppiert, Reihenfolge episode sort_index/id/version.
Keine Notes, Galerien, Badges, Viewerberechtigungen; alle Beiträge/Versionen ohne LIMIT geladen. `ReleaseVersionBreakdown.tsx:19` startet geschlossen, bekommt aber Daten sofort.
**Zusätzliche statische Ecke:** hiddenCounts werden vor ensureVersionGroup angefügt. Nur durch Versionsbeiträge neu entstehende Gruppe bekommt so keinen zuvor berechneten hiddenCount. Nicht als aktueller Livefehler bewertet, da kein entsprechender Datensatz nachgewiesen.

## 5. Cache, Viewer und Fehler

- `api.ts:1416 authorizedFetch`: zentraler Preflight-Refresh, Bearerattach, einmaliger authbezogener401-Replay; zusätzlich begrenzte Netzwerk-Retries idempotenter Requests. Diese sind Ausnahmewege, keine Baseline-Duplikate.
- Public `getAnimeBackdrops` benutzt diese Authseam unnötig auch als anonymer Datenbedarf. Bei vorhandener erneuerbarer Session kann dadurch zusätzlich Refresh + `/me` entstehen. Keine Permissionprüfung für das öffentliche Manifest.
- `AnimeMediaProvider.tsx:11` cached Promise pro Anime-ID für gesamte geladene JS-Modullebensdauer. Kein TTL/Größenlimit; Fehler löschen den Eintrag. Drei Consumers teilen Request korrekt. Änderung von Assets während derselben SPA-Sitzung wird dadurch nicht neu angefragt. Speicherwachstum ist statisch plausibel, aber keine Heap-Messung/Crashursache behauptet.
- `ActiveFansubStory.tsx:73`: alle200ms localStorage lesen/JSON parsen; **keine HTTP-Requests**. Cleanup entfernt Timer/Listener. Rotator-Timer ist Anzeigewechsel.
- `WatchlistAddButton.tsx:31,38` und `CommentForm.tsx:29,38` verwenden `hasRuntimeAuthToken`; `api.ts:1139` prüft allein Access. Beide mounten ohne Authbroadcast-Subscription.
- Refresh-only ⇒ Button disabled/„Anmeldung erforderlich“, obwohl APIclient erneuern könnte. Lädt z.B. Backdrop-Preflight später einen AccessToken nach, aktualisiert das diese lokalen Booleans nicht automatisch.
- SSR Watchlist prüft ebenfalls nur Access/Fallback; fehlende/ungültige Antwort wird false; `useState(initiallyInWatchlist)` führt keinen GET-Recheck aus. Daraus folgen belegte falsche Zustandsableitungen für erneuerbare Sessionpfade, keine Behauptung einer unautorisierten Mutation.
- No-store bei Watchlist verhindert Teilen von Zuschauerzustand. Daten-Endpoints tragen keine Viewer-ID/Permissions im DTO. AppShell-/globale User-Auflösung ist im Hauptaudit separat zu zählen.

## 6. Play-Link, IDs und Projekt-Navigation

### ID-Abgleich ohne Playback

UI `FansubVersionBrowser.tsx:258`: `/api/releases/${version.id}/stream`.
Next-Relay `app/api/releases/[id]/stream/route.ts:40` liest Access/Refresh, reicht Range/User-Agent weiter, baut grant/stream Ziel mit derselben Zahl. `lib/server/streamRelayAuth.ts:110` fordert grant erst mit Access an; Refresh-/401-Recovery getrennt vom normalen Browserclient.
Backend `episode_version_grants.go:19,70` verlangt Auth/Entitlement bzw. validierten signierten Grant. `release_playback_access.go:13` delegiert zentrale Berechtigung.
`release_playback_entitlement_repository.go:40` löst **release_version_id** über `authz_permissions.go:72` auf. Normaler Actor:1 Kontextquery + G Gruppenrollenqueries +1–2 Contributionroles +1 Rulesquery = **G+3 bis G+4**; Admin nur Kontext=1. Dazu stream source=1 je erfolgtem Grant/Stream. Authmiddleware nicht eingerechnet. Dieser belegte G-Loop ist nur im interaktiven Playbackpfad, nicht im Animeinitialload.
`episode_version_repository.go:417`: Sourcequery akzeptiert `WHERE rev.id=$1 OR rv.id=$1 ORDER BY rs.id ASC LIMIT1`; rev/variant werden polymorph behandelt. Quelle `release_versions -> fansub_releases -> episodes -> release_variants -> release_streams -> stream_sources`.
**Read-only Livebeleg:** alle13 Varianten des Anime1: IDs27,28,29,40–49; jeweils variant.id = zugehörige release_version_id = von Sourcequery tatsächlich ausgewählte Version. Globale Kollisionsquery lieferte0Rows. Keine falsche Livezuordnung, kein Stream abgespielt.
Die Identitätsunschärfe ist eine bestehende Compatibility-Seam, nicht durch Gleichheit der heutigen IDs generell sicher bewiesen. Weitere Fixtures würden Schreib-/Testscope brauchen.

### Primärer Gruppenlink

`FansubVersionBrowser.tsx:179` führt zur numerischen `/anime/:id/group/:groupId`.
`app/anime/[id]/group/[groupId]/page.tsx:17,34` rendert diese Route weiterhin und setzt canonical via Metadata.
`projectPageData.ts:109` ermittelt canonical über group detail + Vollprofil; Loader `...:190` startet eigenes profilePromise, falls keine precomputed Pretty-Auflösung mitgegeben wird. Next Requestmemoization kann gleiche GETs in einem Render deduplizieren; zwei Callstellen sind nicht automatisch zwei gemessene HTTP-Requests.
Prettyroute `app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx:25` verwendet Phase155-Resolver und reicht canonical/navigation vorab weiter.
**Bewusste Compatibility:** Numerische Route nicht defekt/nicht tot. **Modernisierungslücke:** primäre Anime-Navigation erreicht weiterhin den teureren Compatibility-Ladezweig; dessen Vollprofil enthält Gruppenhistory/-media/-projects, die nicht allein zur Projektauflösung erforderlich sind. Resolver braucht beide Slugs; AnimeDetail liefert aktuell keinen anime_slug — kein Ersatzlink darf geraten werden.

## 7. Medienrequests und Ownership

- `AnimeMediaProvider.tsx:59,83`: Logo und Banner `next/image unoptimized`. `FansubVersionBrowser.tsx:170,233`: Gruppenlogos ebenfalls unoptimized. Poster `page.tsx:171` plus CSS-Hintergrund verwenden dieselbe Coverquelle; Browsercache/Optimizer bestimmen reale doppelte Transfers.
- `AnimeBackdropRotator.tsx:126`: Video `preload=auto`; Manifest-Videos sind neutrale Anime-Hintergrundmedien, keine release-version-spezifischen Segmentcredits/-Assets.
- `app/media/[...path]/route.ts:65`: Filesystem,0SQL; Range206 mit read stream, sonst whole-file readFile; `public,max-age=31536000,immutable`, Pfadvalidierung. HTTP-Range-Fix existiert bereits, nicht als fehlend melden.
- Backend `cmd/server/main.go:61`: eigener `/media` StaticFS-Pfad,0SQL, `private,no-transform`.
- `handlers/fansub_media_serve.go:17`: `/api/v1/media/files/:filename` → `media_repository.go:222`1Query file_path exakt/oder Suffix LIKE, id DESC LIMIT1 + Dateilieferung; `public,max-age=31536000,immutable`.
- `handlers/episode_version_media_image.go:22`: Providerproxy mit provider/item_id/kind/width/quality/index,0SQL+1HTTP; max-age3600.
- `handlers/episode_version_media_video.go:13`: Providerproxy0SQL+1HTTP, Range durchgereicht, fallback max-age600. Kein release play grant in dieser neutralen Proxyroute. Keine Aussage über ein ausgenutztes Leck ohne gezielte Prüfung.
- Kein Initialrequest für `release_media`, `release_version_media`, deren Upload-/Delete-/Approvalseams. Keine neue Medienownership im Audit.

## 8. Priorisierte, belegte Befunde

| ID | Priorität / Konfidenz | Trigger und Beweis | Konkrete Wirkung / sichere Zielrichtung |
|---|---|---|---|
| A-SQL-01 | P2 / hoch | Jeder ungecachte Relationsrequest; `handlers/anime.go:221` vollständiger GetByID | 7SQL statt schmaler Existenzprüfung, ungenutzte ganze Episoden-/Metadaten geladen. Existenz/Visibility-Seam wiederverwenden, keine Public-Freigabe abschwächen |
| A-AUTH-01 | P2 / hoch, statisch | Refresh-only, `CommentForm.tsx:29,38`, `WatchlistAddButton.tsx:31,38`, `api.ts:1139` | Aktionen vor zentralem Refresh blockiert; lokale Snapshot-Booleans stale. Auf vorhandene useAuthSession-Seam und aktives Sessiongate ausrichten; Auth-Testfälle nötig |
| A-DATA-01 | P2 / hoch | SSR grouped defaults=true, `read_helpers.go:97,155` | unbounded Varianteninventar samt ungenutzten Stream-/Timing-/Segmentfeldern; Legacy-Rangeprojektion trotz Assignment-Wahrheit. Aktuell Segmentcounts identisch, daher kein falsches Segment behauptet; lesespezifischen Bedarf begrenzen |
| A-NAV-01 | P2 / hoch | Gruppenbereich-CTA `FansubVersionBrowser.tsx:179` | primärer Einstieg nutzt numerischen Compatibilitypfad mit Vollprofil statt Phase155-Resolver; kanonische Metadaten nicht mit Redirect verwechseln |
| A-CACHE-01 | P2 / hoch, keine Heapmessung | mehrere Anime-Navigationen/Assetänderung; `AnimeMediaProvider.tsx:11` | Promise Map ohne Ablauf/Limit liefert während SPA dauerhaft alten Manifestwert, hält pro besuchtem Anime Daten fest; begrenzte/invaliderbare gemeinsame Readseam prüfen |
| A-CONTRACT-01 | P2 / hoch | `openapi.yaml:13666` vs `read_helpers.go:142` und `types/episodeVersion.ts` | OpenAPI beschreibt singular `fansub_group`, Runtime/TS plural `fansub_groups`, wichtige Zusatzfelder fehlen; ID als Variante nicht erklärt. Vertrag aktualisierungsbedürftig |
| A-DATA-02 | P3 / hoch | Client-Mount `AnimeContributionsSection.tsx:21` | gesamte Versionsbeitragsliste schon geladen, obwohl `ReleaseVersionBreakdown.tsx:19` geschlossen;3 gebündelteSQL, **kein N+1**; lazy/bounded Bedarf prüfen ohne Summary/Details zu vermischen |
| A-SQL-02 | P3 / hoch | Backdrop-Mount `anime.go:263 -> anime_metadata.go` | Medienlookup lädt Genres/Tags ungenutzt;8SQL auch bei persistierten Assets. Keine gemessene Latenzreduktion behauptet |
| A-VIEW-01 | P3 / hoch | v2 `anime_v2.go:245` | sichtbare Views stets0 durch Mapper; keine echte Metrik, Seite zeigt sie dennoch als Datenwert |

## 9. Negative Befunde und Grenzen

- Keine initialen API-/SQL-Fan-outs pro Episode/Contributor in den sieben Datenrequests; Zahl bleibt konstant, **Rows/JSON wachsen trotzdem**.
- Kein API-Nachladen beim Expandieren/Filtern; kein API-Polling alle200ms.
- Keine doppelte Manifest-Anfrage pro Logo/Banner/Rotator im erfolgreichen Shared-Promise-Pfad.
- ID-Kollisionen:0 aktuell; keine falsche Playbackentität belegt.
- Segmentrange-Count vs Assignments: aktuelle13Versionen identisch (27→2;29/40/41→1; andere→0). Altprojektion belegt, Livefehler nicht.
- Anime1 hat13neutrale Episoden und0ohne Variante. Der Codepfad „teilweise unveröffentlichte Episoden verschwinden aus grouped“ ist daher aktuell nicht reproduziert.
- Kein Datenbankwrite in den auditierten Public-GET-Seams. POST/DELETE/Playback nicht ausgeführt. Authmiddleware-Identity-Synchronisation ist als separate globale Seam nicht in Repositorybudgets eingerechnet.
- Keine Lastfixture erstellt, kein EXPLAIN/Heap-/SQL-Tracing durchgeführt, keine Queryzahlen gemessen. Kein Vorher/Nachher-Effekt ohne Umsetzung.
- Produktions-/Dev-Cacheverhalten, authentifizierte Refresh-only-Liveprobe, weitere Animegrößen, Permission-Middleware-Budget und komplette navigierte Projekt-/Release-Detailbäume bleiben getrennte Prüfflächen.
- Vorhandene Tests lediglich als Evidenz gelesen; keine schreibenden Integrationstests gestartet. Dokumentenänderung mit `git diff --check` geprüft.

## 10. Reproduzierbare lesende Datenproben

Ausgeführt über `docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -X -v ON_ERROR_STOP=1`, jede Probe in `BEGIN READ ONLY; ... COMMIT;`.

```sql
-- Tatsächlich aktive Schemafamilie
SELECT column_name FROM information_schema.columns
WHERE table_name='anime' AND column_name IN ('slug','status');

-- Existiert eine Variante, deren öffentliche Zahl eine fremde Version trifft?
SELECT rv.id AS variant_id, rv.release_version_id AS intended_version,
       other.id AS colliding_version
FROM release_variants rv
JOIN release_versions other ON other.id=rv.id
WHERE rv.release_version_id<>other.id;

-- Tatsächlich ausgewählte Stream-Version ohne Abruf einer Source-URL/Datei
SELECT rv.id AS variant_id, rv.release_version_id,
 (SELECT COALESCE(rev2.id,rv2.id)
  FROM release_versions rev2
  JOIN release_variants rv2 ON rv2.release_version_id=rev2.id
  JOIN release_streams rs ON rs.variant_id=rv2.id
  JOIN stream_sources ss ON ss.id=rs.stream_source_id
  WHERE rev2.id=rv.id OR rv2.id=rv.id ORDER BY rs.id LIMIT 1) AS chosen_version
FROM release_variants rv
JOIN release_versions rev ON rev.id=rv.release_version_id
JOIN fansub_releases fr ON fr.id=rev.release_id
JOIN episodes e ON e.id=fr.episode_id
WHERE e.anime_id=1 ORDER BY rv.id;
```

Resultate: Schema slug/status; Kollisionsquery0Rows; Auswahl13Rows mit durchgehend gleicher Variante/Version/Auswahl. Keine Provider-URLs, Tokens oder Secrets ausgegeben.

## 11. Nachtrag Bildparameter (Backendbeleg)

`backend/internal/handlers/fansub_admin.go:239` / `:301` setzt Jellyfin `maxWidth` ausschließlich bei vorhandenem `width`-Queryparameter, `quality` ebenfalls nur optional. `/api/v1/media/image?...` ohne width fordert deshalb keine serverseitige Größenbegrenzung an. `backend/cmd/server/main.go:61` liefert `/media/**` per StaticFS; Queryparameter wie `width=1920` werden dort nicht zu Bildtransformationen. Auch `frontend/src/app/media/[...path]/route.ts:65` wertet außer Range keinen width-/quality-Parameter aus und liefert dieselbe Quelldatei. Die im Hauptaudit gemessenen Originaltransfers sind damit durch den Codepfad erklärbar; konkrete Bytes werden hier nicht als eigene Messung dupliziert.


## 12. Vollständiger Initialbaum: Root-Layout, AppShell und Session-Auflösung

Dieser Nachtrag ergänzt das Anime-Kernbudget ausdrücklich um die globalen Initialrequests. Alle folgenden Counts sind **statische erfolgreiche Callchains**, keine Messung. Öffentliches frisches Dokument ohne Session: **10 fachliche API-Requests und 38 SQL-Statements** = Animekern 7/35 plus Root-Layout 3/3. Framework-/Medienübertragungen bleiben separat; ein persistierendes Next-Layout muss bei einer späteren SPA-Navigation nicht erneut ausgeführt werden.

### 12.1 Zusätzliche Requestmatrix

| Caller und Trigger | Helper → Endpoint → Backend | SQL / Payload / Cache |
|---|---|---|
| RootLayout, jeder neue serverseitige Layoutaufbau, drei parallele feste Kontexte | `frontend/src/app/layout.tsx:22` / `:30` → `listRoleDefinitions`, `frontend/src/lib/api.ts:10561` → GET `/api/v1/role-definitions?context=fansub_group`, entsprechend `anime_contribution` und `group_history` → `backend/internal/handlers/role_catalog_handler.go:37` → `RoleCatalogRepository.ListPublicRoleDefinitions` | Je **1 SELECT**, zusammen3. Öffentliche Route ohne JWT. Helper `cache: no-store`; Handler setzt keinen eigenen Cache-Control. Ergebnis direktes Array mit strengem Parser; fehlerhafter Vertrag ergibt502 im Clienthelper. Provider erhält je Kontext Daten bzw. einen Fehler. |
| AppShell nach Clientinitialisierung und aktiver Session (Access **oder** Refresh), erneut bei Retry/Profile-change | `frontend/src/components/layout/AppShellClientWrapper.tsx:78` / `:87` / `:107` → `getOwnProfile`, `api.ts:3190` → GET `/api/v1/me/profile` → Authmiddleware (`backend/cmd/server/main.go:356`) → `handlers/app_profile.go:73` → `MemberProfileRepository.GetOwnProfile` | Profilrepo **2 SELECTs ohne verknüpften Member**, **6 mit Member**, jeweils zusätzlich BEGIN/COMMIT. Authmiddleware kommt dazu, siehe12.3. Helper `no-store`; Handler kein eigener Cache-Control. Kein routenabhängiger Reload im Effekt; manuelle Wiederholungen sind konditional. |
| Zentraler Sessionrefresh bei fehlendem Access mit Refresh oder Ablauf innerhalb60s; alternativ einmal nach401 | `api.ts:847` / `:1330` / `:1373` / `:1416` → `refreshKeycloakToken`, `frontend/src/lib/keycloakAuth.ts:231` → POST `/api/auth/keycloak/token` → `frontend/src/app/api/auth/keycloak/token/route.ts:5` → Keycloak Tokenendpoint | Kein Team4s-SQL im Proxy. Ein konditionaler Browser-POST und ein externer serverseitiger POST an `/realms/{realm}/protocol/openid-connect/token` (`frontend/src/lib/server/keycloakProxy.ts:43`). Serverfetch und Proxyantwort `no-store`. Keycloak-interne SQL-Anzahl nicht geprüft. Keine Refreshmutation im Audit ausgeführt. |
| Nach erfolgreichem zentralem Keycloakrefresh, Identität des erneuerten Tokens auflösen | `getCurrentUserWithBearerToken`, `api.ts:1295` → GET `/api/v1/me` mit übersprungener Preflightrekursion; auch `getCurrentUser`, `api.ts:3164`, ist vorhandene zentrale Auflösung → Authmiddleware → `backend/internal/handlers/app_auth.go:103` | Handler liefert bereits aufgelöste Middlewareidentität, **0 eigene SQLs**, aber Authmiddleware siehe12.3. Helper kein ausdrückliches cache-Flag, Handler kein eigenes Cache-Control. Keine gemessene Cachewirkung behauptet. Kein zusätzlicher fixer /me-Aufruf durch AppShell bei gültigem Access. |

Rollenkatalog-SQL (`backend/internal/repository/role_catalog_repository.go:39`): `role_definitions rd LEFT JOIN role_capabilities rc ON rc.role_code=rd.code`, Filter `$1=ANY(rd.contexts) AND NOT rd.reserved`, GROUP BY Rollendaten, ORDER BY sort_order/code, keine Pagination. Payload: code, label_de, contexts, sort_order, assignable, color_key, icon_key, operative_capability_count und daraus berechnetes has_operative_capabilities. Enthält Präsentationsmetadaten und einen aggregierten Capabilitycount, keine individuellen Grants, Overrides oder IdP-Rollen. Die drei Kontexte bleiben drei SQLs; kein belegtes N+1.

`useAuthSession` (`frontend/src/lib/useAuthSession.ts:30`) und AuthSessionSwitchGuard abonnieren lokale Session-/Focus-/Storage-/Visibilitysignale; sie sind selbst keine Netzwerkpoller. `runtimeSessionRefreshPromise` (`api.ts:1326`) bündelt gleichzeitig anstehende Browserrefreshes. Das garantiert keinen requestübergreifenden SSR-/Browsercache. Zentraler Fetch kann einen401 einmal nach Refresh wiederholen; Netzwerkretry ist ebenfalls konditional und kein Bestandteil des Grundbudgets.

### 12.2 OwnProfile bis SQL und tatsächlich verwendeter Payload

`backend/internal/repository/member_profile_own_repository.go:14` führt feste, sequenzielle Abfragen aus:

1. `ensureProfileBase` (`:350`) BEGIN → `member_profile_ensure_repository.go:16` → COMMIT. Ein SELECT auf app_users perID mit globalen Rollen, LATERAL bestätigtem member_claim/member (ORDER/LIMIT1), Avatar-/Backgroundassets und Files sowie Profilfeldern. `:158` verwendet **FOR UPDATE OF au**: auch dieser Profilread erwirbt einen Rowlock; kein INSERT/UPDATE in dieser Profilbasismethode.
2. `member_profile_memberships_repository.go:10`: ein SELECT auf Gruppen und aktuelle/historische eigene Mitgliedschaften, DISTINCT ON GruppenID; Rollen als aggregierte Arrays/JSON, Logos per LATERAL/Fileauswahl. Eigener Scope mit beiden Includeflags true, kein Gesamtlimit. Ohne Member endet GetOwnProfile danach.
3. Mit Member `member_profile_memberships_repository.go:128`: historische Credits über release_member_roles → release_versions → Gruppen/Rollenkatalog, COUNT DISTINCT Release, gruppiert nach Gruppe/Rolle; ein SELECT, kein Gesamtlimit.
4. `member_profile_recent_repository.go:10`: release_version_media → öffentliche/approved/ready Medien und Releasehierarchie, zugeordneter bestätigter Claim, nicht gelöschte Files; ORDER created_at DESC LIMIT3. Ein SELECT.
5. `member_profile_recent_repository.go:72`: CTE/Union bestätigter anime_contributions und Releasecredits; Projekt-/Rollenaggregation sowie Total-/Workedcounts als Unterabfragen; OwnProfile nutzt publicOnly=false; LIMIT3. Ein Statement, kein proErgebnis nachgeladener Request.
6. `member_profile_own_repository.go:60`: ein SELECT EXISTS bestätigter eigener Animecontributions oder release_member_roles für has_project_assignments.

`handlers/app_profile.go:709` ergänzt Capabilities aus Profil-/Configdaten ohne weitere Repositoryrunde. AppShell nutzt daraus Anzeigename (account_display_name/fansub_name), email, Avatar-public_url, Memberexistenz/-ID, has_project_assignments, memberships und account_global_roles für Navigation. Geschichten/Biografie, Background, historische Credits, RecentMedia und RecentContributions werden für diesen Shellcaller zusätzlich geladen, obwohl dieser sie nicht darstellt. **P2, hohe statische Sicherheit:** eigener Profilrequest lädt für die Navigation den vollständigen Ownerprofile-DTO; Trigger aktive Session, Impact zusätzliche feste SQLs und Payload ohne Nutzen im Shellrender. Beleg Caller `AppShellClientWrapper.tsx:107` plus Repo `member_profile_own_repository.go:35`–`:47`. Keine Laufzeit-/Byteersparnis gemessen; derselbe Endpoint bedient echte Profilseiten, weshalb das Befund keine pauschale DTO-Kürzung verlangt. Kein anonymer Zugriff und keine private Datenabfrage durch den Auditor.

### 12.3 Authmiddleware: GET ist hier keine Garantie für Schreibfreiheit

`backend/cmd/server/main.go:175`–`:189` wählt bei KeycloakEnabled den `KeycloakCurrentUserResolver`. Die folgenden Counts gelten ausdrücklich für diesen konfigurationsabhängigen Zweig, einen bereits vorhandenen verknüpften Account und unveränderte IdP-Rollen:

- `backend/internal/middleware/current_user_auth.go:45`: JWT verifizieren. `backend/internal/auth/oidc.go:117` / `:143` / `:185` erstellt/verwendet den gemeinsamen OIDC-Verifier mit RemoteKeySet. Discovery wird beim Aufbau geladen; mögliche JWKS-Nachladung ist kein hier belegter HTTP-Aufruf proRequest. Keine pauschale Introspectionzählung.
- Revocationchecks über `backend/internal/repository/auth.go:270` und `:281`: Redis EXISTS für Session und Subject; Sessioncheck entfällt bei leerer SessionID. **1–2 Redisreads** im erfolgreichen üblichen Subjectpfad, keine PostgreSQLstatements. Ungültiges JWT endet vorher; fehlender Token auf protected Route endet vor DB.
- `backend/internal/repository/app_auth_repository.go:25` → `:45`: BEGIN; SELECT app_users WHERE keycloak_subject (`:270`); **UPDATE app_users** (`:143`) mit Claims sowie last_login_at/updated_at und RETURNING; COMMIT. Dieser UPDATE passiert auch beim bestehenden unveränderten Account auf jedem erfolgreich aufgelösten authentifizierten GET.
- `backend/internal/repository/authz_keycloak_sync.go:74`: Rollenvergleich mit einem SELECT (`authz.go:118`). Nur bei Delta je Rolle INSERT/DELETE (`authz.go:149` / `:172`) und abschließend zusätzlicher SELECT. Neuaccount oder fehlende Legacybridge kann zusätzlich users/app_users schreiben. Diese Fälle sind kein fester Basispfad.

Damit hat die stabile Middleware **3 Datenstatements =2 SELECT +1 UPDATE**, dazu **2 Transaktionskontrollstatements**. Mit Rollenänderung addiert sie Deltaanzahl Writes +1 SELECT. Handler-/Repo-Counts dürfen diese Arbeit nicht unterschlagen. Dies ist ein belegter bestehender JIT-Identitäts-/Rollensynchronisationspfad, kein im Audit hergeleiteter Berechtigungsfehler. **Prüfgrenze:** keine privaten Tokens/Profile gelesen, kein authentifizierter GET und kein Refresh zum Messen ausgeführt, weil dabei trotz GET DB-Schreiboperationen entstehen können.

GET /me-Payload: app_user_id, legacy_user_id, display_name, email, keycloak_subject, status, global_roles, is_platform_admin, session_id (`handlers/app_auth.go:103`). Die zentrale Refreshauflösung benötigt dies zum Persistieren der erneuerten Runtimeidentität. /me/profile ist der separate reichhaltige Owner-Datensatz; /me ist daher kein weiterer fixer Profilrequest.

### 12.4 Fixe und konditionale Budgets, ohne Vermischung mit Messwerten

| Szenario / Zusatz | Fachliche HTTP-Calls | Statische Team4s-DatenSQLs | Zusätzliche BEGIN/COMMIT |
|---|---:|---:|---:|
| Anonymer frischer Initialbesuch inklusive RootLayout | 10 GET | 38 SELECT | 0 |
| Eigene Profilnavigation, kein Member; stabiler Keycloakaccount | +1 GET | +5 =2 ProfilSELECT +3 Authdatenstatements | +4 |
| Eigene Profilnavigation, Member; stabiler Keycloakaccount | +1 GET | +9 =6 ProfilSELECT +3 Authdatenstatements | +4 |
| SSR-Watchlist nur bei weitergereichtem Access; stabiler Keycloakaccount | +1 GET | +4 =1 WatchlistSELECT +3 Authdatenstatements | +2 |
| Erfolgreicher Keycloakrefresh vor einem Browserrequest | +1 ProxyPOST, +1 GET /me; zusätzlich1 externer TokenPOST | +3 für /me | +2 |
| Rollenänderung im jeweiligen Authrequest | kein eigener HTTP-Call | +DeltaWrites +1 SELECT | 0 zusätzlich |

Beispiel mit gültigem Access, verknüpftem Member, erfolgreichem SSR-Watchlistread und OwnProfile ohne Refresh: **12 fachliche GETs, 51 DatenSQLs (davon2 Auth-UPDATES), plus6 BEGIN/COMMIT =57 Statements einschließlich Transaktionskontrolle**. Ohne Member entsprechend47 DatenSQLs plus6 Transaktionskontrolle. Dies ist ein konditionales Rechenbeispiel, keine gemessene Session und keine Zusage für alle Accounts. Sessionrefresh, Role-Delta, Fehler/Retry und neue Accounts verändern es. Mit reiner Refreshsession fehlt der serverseitige Watchlistread nach dem untersuchten SSR-Gate; AppShell löst Browserrefresh dagegen über die zentrale Sessiongrenze aus.


## 13. Requestbodies der nur statisch geprüften Aktionen

Alle oben genannten GETs und Watchlist-DELETE haben keinen Body; ID, Pagination, Kontexte, Größen und optionale Streamparameter stehen in Pfad/Query. Die Responseformen und ihre Consumer sind in Abschnitt3/12 sowie den Public-APIshapes dokumentiert.

- Kommentar: `CommentForm.tsx:64` → `createAnimeComment`, `api.ts:2949` sendet JSON `{ content: trimmedContent }`; Antwort `{ data: { id, anime_id, author_name, content, created_at } }` laut `frontend/src/types/comment.ts:3–21`. Lokaler Consumer benutzt die neue Row, danach router.refresh. Nicht ausgeführt.
- Watchlist: `api.ts:3013–3026` sendet POST-JSON `{ anime_id: animeID }`; GET liefert denselben WatchlistCreateResponse-Typ, Seite nutzt ausschließlich Erfolg/Fehler als Anwesenheit. DELETE `api.ts:3064` hat keinen Body und keine vom UI konsumierte Antwortrow. Nicht ausgeführt.
- Playrelay: `frontend/src/app/api/releases/[id]/stream/route.ts:48–69` übernimmt Range/User-Agent, optional grant und numerische startTimeTicks; UI liefert im geprüften Link nur die ID. Grantrequest `frontend/src/lib/server/streamRelayAuth.ts:117–123` ist POST ohne Body, mit zentral aufgelöstem Bearer und no-store; Antwort grant_token wird ausschließlich für Relayzielbildung benötigt. Keine Grants oder Videos eines Releases im Audit angefordert.

Diese Angaben sind Vertrags-/Quellcodebelege, keine ausgeführten Mutationsproben. Hintergrundvideo-GETs im Runtimeprotokoll gehören zu neutralen Anime-Artworks und sind davon getrennt.
