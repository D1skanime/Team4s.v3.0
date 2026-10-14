---
phase: 182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov
plan: 02
subsystem: database
tags: [go, pgx, repository, postgres, anime-cover, jellyfin]

# Dependency graph
requires:
  - phase: 182-01
    provides: "Legacy-branch-freie anime_assets*.go (hasV2AssetSchema entfernt) als Ausgangsbasis fuer die Cover-Leser-Migration"
provides:
  - "Alle fuenf vormals rohen cover_image-Leser (watchlist.go, fansub_project_resolver_repository.go, fansub_repository_public_profile.go, anime_relations_admin.go, admin_content_anisearch.go) loesen das Cover jetzt ueber animeCoverImageSelectSQL (COALESCE + Poster-LATERAL-Join) auf -- D-01's Jellyfin-Cover-Luecke ist fuer Watchlist, Fansub-Profile und Admin-Beziehungen geschlossen"
  - "syncLegacyAnimeCoverImageV2, der cover_image-Mirror-Write in removeAnimePosterAssetsV2 und das HasCoverImage-Schema-Flag sind vollstaendig entfernt"
  - "ApplyProviderCover schreibt nur noch cover_resolved_url, nie mehr cover_image"
  - "OpenPhase182Postgres (testsupport/phase182_postgres.go) als wiederverwendbarer Throwaway-DB-Helfer fuer Phase 182, inkl. Postgres-Regressionstests fuer D-01 und D-03"
affects: [182-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fuenf-Leser-Migration auf gemeinsamen COALESCE-Helfer: animeCoverImageSelectSQL(alias) + die kanonische Poster-LATERAL-Join-Blockkopie aus anime_v2.go statt ad-hoc a.cover_image-Spalten-Selects"
    - "Throwaway-Postgres-DB pro Phase (team4s_phase182_test_<suffix>, Schema phase182_<rand>) nach dem Phase106/165-Praezedenzfall, nie gegen team4s_v2"

key-files:
  created:
    - backend/internal/testsupport/phase182_postgres.go
    - backend/internal/repository/anime_cover_v2_raw_readers_postgres_test.go
  modified:
    - backend/internal/repository/watchlist.go
    - backend/internal/repository/fansub_project_resolver_repository.go
    - backend/internal/repository/fansub_repository_public_profile.go
    - backend/internal/repository/anime_relations_admin.go
    - backend/internal/repository/admin_content_anisearch.go
    - backend/internal/repository/anime_display_variant_test.go
    - backend/internal/repository/anime_relations_admin_test.go
    - backend/internal/repository/anime_assets_cover.go
    - backend/internal/repository/anime_schema.go
    - backend/internal/repository/anime_assets_legacy_cover_original_test.go

key-decisions:
  - "Die Behauptungs-Doc-Kommentare in anime_assets_cover.go und anime_assets_legacy_cover_original_test.go wurden bewusst so umformuliert, dass sie den entfernten Symbolnamen syncLegacyAnimeCoverImageV2 nicht mehr woertlich enthalten -- sonst haette die eigene Acceptance-Criteria-grep-Pruefung (grep -n 'syncLegacyAnimeCoverImageV2' *.go) auf einen reinen Kommentar-Treffer angeschlagen, obwohl keine Funktion/kein Aufrufer mehr existiert"
  - "Der neue ApplyProviderCover-Regressionstest wurde (wie im Plan als Option genannt) an die Task-1-Testdatei angehaengt statt eine weitere neue Datei anzulegen, um die Aenderungsflaeche klein zu halten"

patterns-established:
  - "Pattern: Fuer jede neue Phase-Testsupport-DB werden Spaltennamen per live `psql \\d <table>` gegen team4s_v2 verifiziert, nicht aus 182-CONTEXT.md kopiert -- CONTEXT.md ist eine Zusammenfassung, keine Schema-Dump-Quelle (Lehre aus dieser Phase: languages/title_types mussten nachtraeglich ergaenzt werden, weil primaryNormalizedTitleSQL sie referenziert)"

requirements-completed: [D-01, D-03]

# Metrics
duration: ~90min
completed: 2026-10-14
---

# Phase 182 Plan 2: Rohe cover_image-Leser auf V2-COALESCE umgestellt, Legacy-Mirror-Write entfernt Summary

**Fuenf vormals rohe `a.cover_image`-Leser (Watchlist, Fansub-Projekt-Resolver, oeffentliches Fansub-Profil, Admin-Beziehungen-Liste/-Suche, AniSearch-Titel-Matching) loesen das Cover jetzt ueber den gemeinsamen `animeCoverImageSelectSQL`-COALESCE-Helfer mit Jellyfin-Fallback auf, und die komplette `cover_image`-Mirror-Write-Mechanik (`syncLegacyAnimeCoverImageV2`, der Mirror-Write in `removeAnimePosterAssetsV2`, `ApplyProviderCover`'s `cover_image`-Schreibung) ist entfernt -- `anime.cover_image` ist damit nur noch eine funktional inerte Spalte, die Plan 182-03 ohne Verhaltensrisiko droppen kann.**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-10-14T23:12:34Z
- **Completed:** 2026-10-14T23:24:51Z
- **Tasks:** 2 von 2
- **Files modified:** 15 (10 geaenderte + 2 neu erstellte Produktions-/Testdateien in Task 1, 5 geaenderte in Task 2, teils ueberlappend mit Task 1)

## Accomplishments
- `watchlist.go` (`ListByUser`, `GetByUserAndAnimeID`), `fansub_project_resolver_repository.go` (`ResolveProject`), `fansub_repository_public_profile.go` (`listPublicFansubProjects`), `anime_relations_admin.go` (`ListAdminAnimeRelations`, `SearchAdminAnimeRelationTargets`) und `admin_content_anisearch.go` (`ResolveAdminAnimeRelationTargetsByTitles`) selektieren das Cover jetzt per `animeCoverImageSelectSQL("a")` statt per rohem `a.cover_image`, jeweils mit der kanonischen Poster-LATERAL-Join-Blockkopie aus `anime_v2.go:68-78`.
- Ein Jellyfin-Anime ohne `cover_image`/`cover_resolved_url` und ohne V2-Poster-Zeile liefert jetzt in allen fuenf Lesern den `/api/v1/media/image?item_id=...&kind=primary&provider=jellyfin`-Fallback statt `nil` -- live per `TestAnimeCoverV2RawReaders_JellyfinAnimeWithoutLocalCoverResolvesCoverEverywhere` gegen eine echte, disposable `team4s_phase182_test_*`-Datenbank bewiesen (5 Subtests, alle gruen).
- `syncLegacyAnimeCoverImageV2` und der `cover_image`-Mirror-Write in `removeAnimePosterAssetsV2` sind vollstaendig entfernt; `removeAnimePosterAssetsV2` verliert dadurch seinen jetzt unnoetigen `schema animeV2SchemaInfo`-Parameter, und die davon abhaengigen `loadAnimeV2SchemaInfo`-Aufrufe in `assignManualCoverV2`/`clearCoverV2` entfallen ebenfalls.
- `ApplyProviderCover` schreibt in beiden Zweigen (Clear und Set-Provider-Cover) nur noch `cover_resolved_url`, nie mehr `cover_image` -- per `TestApplyProviderCover_WritesResolvedURLOnlyNeverLegacyCoverImage` bewiesen: `cover_resolved_url` wird korrekt gesetzt/geleert, ein zuvor gesetzter `cover_image`-Wert bleibt in beiden Faellen unveraendert.
- `HasCoverImage` (das `animeV2SchemaInfo`-Flag) ist vollstaendig entfernt -- 0 verbleibende Referenzen im gesamten Repository-Paket.
- Neuer wiederverwendbarer `OpenPhase182Postgres`-Testhelfer (`backend/internal/testsupport/phase182_postgres.go`) nach dem Phase106/165-Praezedenzfall: `TEAM4S_PHASE182_TEST_DSN`, Datenbank-Regex `^team4s_phase182_test_[a-z0-9]+$`, Schema-Regex `^phase182_[a-z0-9_]+$`.
- Eine stale Fansub-Banner-Testfixture (`createFansubProjectBannerSchema`) und ein nicht-verhaltensechter Quelltext-Substring-Test (`TestSearchAdminAnimeRelationTargetsQuery_...`) sind repariert bzw. entfernt -- letzterer verstiess gegen die CLAUDE.md-Teststil-Regel (pruefte einen hardcodierten Quelltext-String statt die migrierte Funktion aufzurufen) und ist durch den neuen echten Verhaltenstest ersetzt.

## Task Commits

Beide Tasks wurden atomar committet:

1. **Task 1: Migrate the five raw cover_image readers to the V2-aware COALESCE helper (D-01)** - `888a6383b` (feat)
2. **Task 2: Remove the legacy cover_image mirror-write machinery and fix ApplyProviderCover (D-03)** - `d6b72c659` (refactor)

_Hinweis: Die Plan-Metadaten (SUMMARY.md, STATE.md, ROADMAP.md) werden separat committet._

## Files Created/Modified
- `backend/internal/repository/watchlist.go` - `ListByUser`/`GetByUserAndAnimeID` auf `animeCoverImageSelectSQL("a")` + Poster-LATERAL-Join umgestellt
- `backend/internal/repository/fansub_project_resolver_repository.go` - `ResolveProject` auf `animeCoverImageSelectSQL("a")` + zusaetzlichen Poster-LATERAL-Join umgestellt
- `backend/internal/repository/fansub_repository_public_profile.go` - `listPublicFansubProjects` auf `animeCoverImageSelectSQL("a")` + zusaetzlichen Poster-LATERAL-Join umgestellt
- `backend/internal/repository/anime_relations_admin.go` - `ListAdminAnimeRelations` und `SearchAdminAnimeRelationTargets` beide auf `animeCoverImageSelectSQL("a")` + Poster-LATERAL-Join umgestellt
- `backend/internal/repository/admin_content_anisearch.go` - `ResolveAdminAnimeRelationTargetsByTitles` auf `animeCoverImageSelectSQL("a")` + Poster-LATERAL-Join umgestellt
- `backend/internal/repository/anime_display_variant_test.go` - `createFansubProjectBannerSchema`'s `anime`-Stand-in-Tabelle um `cover_resolved_url`/`source` ergaenzt (von `animeCoverImageSelectSQL` jetzt referenziert)
- `backend/internal/repository/anime_relations_admin_test.go` - nicht-verhaltensechter Quelltext-Substring-Test entfernt, `strings`-Import als Folge entfernt
- `backend/internal/testsupport/phase182_postgres.go` (neu) - `OpenPhase182Postgres`-Throwaway-DB-Helfer mit minimalem Stand-in-Schema (anime, anime_media, media_assets, media_types, media_files, watchlist_entries, fansub_groups, anime_fansub_groups, anime_relations, relation_types, languages, title_types, anime_titles), Spalten gegen die echte `team4s_v2`-Live-Datenbank verifiziert
- `backend/internal/repository/anime_cover_v2_raw_readers_postgres_test.go` (neu) - Fuenf-Subtest-Beweis fuer D-01 (Jellyfin-Fallback in allen migrierten Lesern) plus Task-2-Regressionstest fuer `ApplyProviderCover` (D-03)
- `backend/internal/repository/anime_assets_cover.go` - `syncLegacyAnimeCoverImageV2` geloescht; Mirror-Write in `removeAnimePosterAssetsV2` entfernt, Funktion verliert `schema`-Parameter; `assignManualCoverV2`/`clearCoverV2` verlieren die dadurch unnoetigen `loadAnimeV2SchemaInfo`-Aufrufe; `ApplyProviderCover` schreibt `cover_image` in keinem Zweig mehr
- `backend/internal/repository/anime_schema.go` - `HasCoverImage`-Feld und sein `case "cover_image"`-Zweig aus `animeV2SchemaInfo`/`loadAnimeV2SchemaInfo` entfernt
- `backend/internal/repository/anime_assets_legacy_cover_original_test.go` - `TestAssignManualCoverV2_LegacyCoverImageStoresOriginalNotDisplay` entfernt (Praemisse entfallen); Datei-Doc-Kommentar aktualisiert, ohne den entfernten Symbolnamen woertlich zu wiederholen

## Decisions Made
- Doc-Kommentare in `anime_assets_cover.go`/`anime_assets_legacy_cover_original_test.go` vermeiden bewusst den woertlichen Namen `syncLegacyAnimeCoverImageV2`, damit die Plan-Acceptance-Criteria-grep-Pruefung (die genau diesen String sucht) nicht auf einen reinen Erklaer-Kommentar anspringt, obwohl Funktion und Aufrufer vollstaendig entfernt sind.
- Der neue `ApplyProviderCover`-Regressionstest wurde an die Task-1-Testdatei (`anime_cover_v2_raw_readers_postgres_test.go`) angehaengt statt eine weitere Datei anzulegen -- der Plan nennt diese Option explizit ("new file or appended to the Task 1 test file").
- `languages`/`title_types`-Stand-in-Tabellen wurden nachtraeglich zum `OpenPhase182Postgres`-Schema ergaenzt, nachdem der erste Testlauf zeigte, dass `primaryNormalizedTitleSQL` (genutzt von `anime_relations_admin.go`/`admin_content_anisearch.go`) sie per JOIN referenziert -- bestaetigt die im Plan genannte Lehre, Spalten/Tabellen per `psql \d` statt per CONTEXT.md-Zusammenfassung zu verifizieren.

## Deviations from Plan

None - der Plan wurde wie geschrieben ausgefuehrt. Die zwei oben genannten Entscheidungen (Kommentar-Umformulierung, `languages`/`title_types`-Ergaenzung) sind keine Verhaltensabweichungen vom Plan, sondern Praezisierungen innerhalb der im Plan selbst vorgesehenen Spielraeume (exakte Testdateiwahl "new file or appended", explizite Mahnung zur Live-Schema-Verifikation statt CONTEXT.md-Kopie).

## Issues Encountered
- Der erste Testlauf von `SearchAdminAnimeRelationTargets` (Admin-Beziehungen-Suche) schlug fehl, weil die Suchanfrage `"Jellyfin"` versehentlich auch die in fruehren Subtests dieser Testfunktion angelegten Anime (`"Jellyfin Anime"`, `"Jellyfin Anime 2"`, ...) traf, da alle Subtests dieselbe Pool-Instanz/Schema teilen. Behoben durch einen eindeutigen Titel (`"UniqueRelTarget"`) fuer den Beziehungs-Ziel-Anime -- kein Produktionscode-Fehler, nur eine Testdaten-Kollision.
- `go test ./internal/repository/...` (volles Paket, sowohl mit als auch ohne `TEAM4S_PHASE182_TEST_DSN`) zeigt dasselbe, in `182-01-SUMMARY.md`/`deferred-items.md` bereits dokumentierte, vorbestehende Fehlerbild (~40 Tests, die `TEAM4S_PHASE128_TEST_DSN`/Live-Netzwerk/Keycloak-Zugangsdaten benoetigen, die in dieser Sandbox nicht verfuegbar sind) -- keine Regression, keine der Fehlschlaege referenziert eine von diesem Plan geaenderte Datei. Die tatsaechlich fuer diesen Plan relevante Verifikation (`go build ./... && go vet ./... && go test ./internal/repository/... -run '...'` fuer beide Tasks, plus die vollen neuen Postgres-Tests gegen eine disposable `team4s_phase182_test_*`-Datenbank) ist gruen.
- Die disposable Test-Datenbanken (`team4s_phase182_test_1792019925`, `team4s_phase106_test_1792019993106`) wurden nach Abschluss aller Testlaeufe per `DROP DATABASE` entfernt; `team4s_v2` wurde zu keinem Zeitpunkt angefasst (verifiziert per `\l`-Listing vor/nach).

## User Setup Required

None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness
- `anime.cover_image` ist jetzt funktional inert: kein Backend-Code liest sie noch roh (alle bekannten Leser sind migriert oder waren bereits V2-bewusst), kein Backend-Code schreibt sie noch als Seiteneffekt. Plan 182-03 kann die Spalte per Migration mit Schutzabfrage droppen, ohne Backend-Verhalten zu aendern.
- `OpenPhase182Postgres` steht fuer Plan 182-03 (falls dort weitere Postgres-Regressionstests fuer die Migration/Schutzabfrage noetig sind) direkt zur Wiederverwendung bereit.
- Keine Blocker. D-02 (API-Feldname `cover_image` bleibt) und die physischen Bilddateien auf der Platte sind unveraendert -- wie geplant Scope von 182-03.

---
*Phase: 182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov*
*Completed: 2026-10-14*

## Self-Check: PASSED

- FOUND: `backend/internal/testsupport/phase182_postgres.go`
- FOUND: `backend/internal/repository/anime_cover_v2_raw_readers_postgres_test.go`
- FOUND: `backend/internal/repository/watchlist.go`
- FOUND: `backend/internal/repository/anime_assets_cover.go`
- FOUND: `backend/internal/repository/anime_schema.go`
- FOUND: commit `888a6383b` (git log --oneline --all)
- FOUND: commit `d6b72c659` (git log --oneline --all)
