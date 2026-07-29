---
phase: 117-kara-segment-zeit-override-anzeige
plan: 03
subsystem: backend
tags: [postgresql, go, repository, theme-segments, kara-segments, release-versions, render-cache, tdd]

# Dependency graph
requires:
  - phase: 117-01
    provides: "theme_segment_assignments / theme_segment_episode_overrides / theme_segment_render_cache.release_version_id schema (migrations 0141/0142/0143), legacy 1:1 index deliberately kept coexisting"
  - phase: 117-02
    provides: "theme_segment_assignments.go / theme_segment_overrides.go repo CRUD (Assign/Unassign/List, Upsert/Delete/Get/List override), OpenPhase117Postgres(t) Wave-0 fixture"
provides:
  - "resolveThemeSegmentReleaseVariantTx -- deterministic per-(segment, release-version) playback variant resolution (theme_segment_playback_resolution.go), replacing the range-blind resolved_variant CTE (RESEARCH.md Risk 3)"
  - "syncThemeSegmentPlaybackSourceTx now fans out over ALL current theme_segment_assignments rows, one theme_segment_playback_sources row per (segment, release_version_id), composite ON CONFLICT"
  - "Migration 0144 drops the legacy 1:1 uq_theme_segment_playback_sources_segment index, applied atomically with the ON CONFLICT code switch (Nyquist-Fix W1 closed)"
  - "loadThemeSegmentPlaybackSnapshotTx applies a theme_segment_episode_overrides row before falling back to the segment base time (D-01)"
  - "CreateAnimeSegment(ctx, animeID, input, currentReleaseVersionID) -- optional first assignment inside the same transaction"
  - "GetSegmentReleaseDuration(..., startEpisode, endEpisode) -- episode-range-filtered runtime lookup (RESEARCH.md Risk 3, validation path)"
  - "GetThemeSegmentRenderSource/GetReadyThemeSegmentRenderCache/GetLatestThemeSegmentRenderCache/ListThemeSegmentRenderCaches/DeleteThemeSegmentRenderCaches are release_version_id-scoped (Nyquist-Fix W2 / RESEARCH.md Risk 1)"
  - "hydrateSegmentAssignmentMetadataList -- AssignedReleaseVersionIDs/IsShared/HasEpisodeOverride/AssignedEpisodes (real episode numbers per assignment, B3-fix) for ListAnimeSegments"
  - "TestThemeSegmentPlaybackResolution -- real-DB proof of Risk 1 (incl. cache-key-hash level) and Risk 3, not string-pattern checks"
affects: [117-04, 117-05, 117-06, 117-07, 117-08, 117-09]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Nyquist-Fix W-mod: new focused repository file (theme_segment_playback_resolution.go) instead of growing the already-2259-line admin_content_anime_themes.go further, same split convention as theme_segment_render_cache.go/theme_segment_assignments.go/theme_segment_overrides.go", "package repository_test (external test package) for any repository integration test that also needs to import services -- avoids the repository<->services import cycle that services already has via anime_metadata_backfill.go"]

key-files:
  created:
    - backend/internal/repository/theme_segment_playback_resolution.go
    - backend/internal/repository/theme_segment_playback_resolution_integration_test.go
    - database/migrations/0144_drop_theme_segment_playback_sources_legacy_unique.up.sql
    - database/migrations/0144_drop_theme_segment_playback_sources_legacy_unique.down.sql
  modified:
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/repository/theme_segment_render_cache.go
    - backend/internal/repository/segment_playback_resolution_test.go
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/models/theme_segment_render_cache.go
    - backend/internal/handlers/segment_stream.go
    - backend/internal/handlers/segment_render_refresh.go
    - backend/internal/handlers/segment_render_worker.go
    - backend/internal/handlers/segment_render_worker_test.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_content_anime_theme_segments.go
    - backend/internal/handlers/admin_content_fansub_releases_test.go
    - backend/internal/testsupport/phase117_postgres.go

key-decisions:
  - "release_version_id is now REQUIRED for GetThemeSegmentRenderSource/GetReadyThemeSegmentRenderCache/GetLatestThemeSegmentRenderCache/ListThemeSegmentRenderCaches/DeleteThemeSegmentRenderCaches (a shared Kara can have multiple theme_segment_playback_sources rows now, one per assigned release version -- the old segmentID-only lookup became ambiguous). At the three handler call sites without a release_version_id in scope yet (RenderSegment, StreamSegment's authenticated-grant path), a new optional release_version_id query parameter defaults to 0 to stay backward compatible with existing unit tests until Plan 117-04/117-05 wire the real per-release-version admin UI flow through."
  - "CreateAnimeSegment/GetSegmentReleaseDuration handler call sites pass currentReleaseVersionID=0 / startEpisode=endEpisode=0 (explicit TODO comments referencing Plan 117-04/117-05) -- the repository signatures already accept the real parameters so downstream plans only need to change the call sites, not the repository contracts again."
  - "syncThemeSegmentPlaybackSourceTx reads theme_segment_assignments directly via tx.Query inside the same transaction (not via the Plan 117-02 repository receiver methods) to stay inside one transaction boundary; the per-version decision tree was extracted into syncThemeSegmentPlaybackSourceForReleaseVersionTx (kept in admin_content_anime_themes.go, in-place evolution) and is functionally byte-identical to the old global version, just parameterized by release_version_id."
  - "TestThemeSegmentPlaybackResolution lives in package repository_test (not repository) because it needs services.BuildSegmentRenderCacheKey to prove the W2 fix, and services already imports repository (anime_metadata_backfill.go) -- an internal-package test importing services would create a real Go import cycle. Same pattern already used by review_credit_repository_test.go."

patterns-established:
  - "theme_segment_playback_resolution.go: resolveThemeSegmentReleaseVariantTx + hydrateSegmentAssignmentMetadataList live here, not in admin_content_anime_themes.go -- CLAUDE.md 450-line guideline enforcement continues for this subsystem."

requirements-completed: [D-01, D-03]

# Metrics
duration: ~75min
completed: 2026-07-29
---

# Phase 117 Plan 03: Deterministische Pro-Release-Version-Playback-Auflösung + Override-aware Sync Summary

**Ersetzt die geraten-basierte, ungefilterte `resolved_variant`-Playback-Auflösung durch eine deterministische Pro-(Segment, Release-Version)-Auflösung, macht `syncThemeSegmentPlaybackSourceTx` und alle Render-Cache-Lookups `release_version_id`-scoped, und schließt das in Plan 117-01 offengelassene Migrationsfenster (0144) atomar mit der Code-Umstellung — bewiesen mit einer echten Postgres-Integrationstest-Suite, nicht nur String-Pattern-Checks.**

## Performance

- **Duration:** ~75 min
- **Tasks:** 3/3 completed
- **Files modified:** 15 (2 new production files, 2 new migration files, 1 new test file, 10 modified)

## Accomplishments

- `resolveThemeSegmentReleaseVariantTx` (neue Datei `theme_segment_playback_resolution.go`, Nyquist-Fix W-mod) löst die Playback-Variante direkt anhand der bekannten `release_version_id` auf — die alte `resolved_variant`-CTE, die "irgendeine passende Variante irgendeiner Episode" ohne Bereichsfilter suchte (RESEARCH.md Risk 3), ist strukturell ersetzt, nicht nur um einen Zusatzfilter ergänzt.
- `syncThemeSegmentPlaybackSourceTx` iteriert jetzt über ALLE aktuell in `theme_segment_assignments` zugewiesenen Release-Versionen eines Segments und schreibt für jede eine eigene `theme_segment_playback_sources`-Zeile via composite `ON CONFLICT (theme_segment_id, release_version_id)`; verwaiste Zeilen (keine Zuweisung mehr / keine auflösbare Quelle für eine bestimmte Zuweisung) werden per abschließendem `DELETE ... WHERE NOT (release_version_id = ANY(...))` aufgeräumt.
- Migration 0144 entfernt den in Plan 117-01 bewusst zurückgehaltenen 1:1-Legacy-Index `uq_theme_segment_playback_sources_segment` — live gegen die lokale Dev-DB angewendet und verifiziert: `\d theme_segment_playback_sources` zeigt danach nur noch den composite Index (Nyquist-Fix W1 vollständig geschlossen, kein Zeitfenster mit inkonsistentem Code/Schema-Stand).
- `loadThemeSegmentPlaybackSnapshotTx` berücksichtigt einen vorhandenen `theme_segment_episode_overrides`-Eintrag (`COALESCE(ov.start_time, ts.start_time)`) vor der Segment-Basis-Zeit — live per DB-Integrationstest bewiesen: Override für Folge B ändert NICHT die Offset-Werte von Folge A desselben geteilten Segments (D-01).
- Alle fünf Render-Cache-Lookup-Methoden (`GetThemeSegmentRenderSource`, `GetReadyThemeSegmentRenderCache`, `GetLatestThemeSegmentRenderCache`, `ListThemeSegmentRenderCaches`, `DeleteThemeSegmentRenderCaches`) sind jetzt `release_version_id`-scoped — live bewiesen, dass ein `ready`-Cache-Eintrag für Folge 7 nicht für Folge 1 desselben Segments zurückgeliefert wird (RESEARCH.md Risk 1).
- **Nyquist-Fix W2 explizit erfüllt:** ein eigener Testfall ruft `services.BuildSegmentRenderCacheKey` direkt mit den aus `GetThemeSegmentRenderSource` für zwei Release-Versionen abgeleiteten `SourceIdentity`-Werten auf und beweist zwei unterschiedliche Cache-Key-Strings — der Fix wirkt auf Ebene der tatsächlich genutzten Hash-Funktion, nicht nur der neuen DB-Spalte.
- `hydrateSegmentAssignmentMetadataList` (neue Datei) befüllt `AssignedReleaseVersionIDs`/`IsShared`/`HasEpisodeOverride` UND `AssignedEpisodes` (echte Episodennummer je Zuweisung über den Join `release_versions -> fansub_releases -> episodes`, B3-Fix) für `ListAnimeSegments` — Grundlage für die "Folge {N}"-Zuweisungs-Chips in Plan 117-07.
- Fünf `t.Run`-Subtests in `TestThemeSegmentPlaybackResolution` live grün gegen eine temporäre, isolierte Postgres-Datenbank (`team4s_phase117_test_b` auf `team4sv30-db`, danach gelöscht) verifiziert — inklusive `GetSegmentReleaseDuration` mit Episoden-Bereichsfilter.

## Task Commits

Each task was committed atomically (with one pragmatic combination, see Deviations):

1. **Task 1 + Task 2 (kombiniert): Deterministische Pro-Release-Version-Auflösung, Override-aware Sync, Drop des 1:1-Legacy-Index, Release-Version-scoped Render-Cache + Zuweisungs-Hydration** - `7c26ab14` (feat)
2. **Task 3: DB-Integrationstest für Mehr-Folgen-Auflösung, Override-Isolation, Cache-Nicht-Kollision (inkl. Cache-Key-Beweis)** - `ccdffaae` (test)

## Files Created/Modified
- `backend/internal/repository/theme_segment_playback_resolution.go` - NEU (W-mod): `resolveThemeSegmentReleaseVariantTx`, `hydrateSegmentAssignmentMetadataList`
- `backend/internal/repository/admin_content_anime_themes.go` - `syncThemeSegmentPlaybackSourceTx`/`syncThemeSegmentPlaybackSourceForReleaseVersionTx`/`loadThemeSegmentPlaybackSnapshotTx` per-Release-Version umgebaut; `CreateAnimeSegment`/`GetSegmentReleaseDuration` erweitert; `ListAnimeSegments` ruft neue Hydration auf; `hydrateSegmentPlaybackMetadata` (single-row) mit `ORDER BY release_version_id` fuer Determinismus abgesichert
- `backend/internal/repository/theme_segment_render_cache.go` - fünf Lookup-Methoden `release_version_id`-scoped, `UpsertThemeSegmentRenderCacheQueued`-Spaltenliste erweitert
- `backend/internal/repository/segment_playback_resolution_test.go` - ein String-Pattern-Test auf beide Dateien (`admin_content_anime_themes.go` + neue `theme_segment_playback_resolution.go`) umgestellt (W-mod-Split-Konsequenz)
- `backend/internal/repository/theme_segment_playback_resolution_integration_test.go` - NEU, Task 3, `package repository_test`
- `backend/internal/models/admin_anime_themes.go` - `AssignedEpisodes` + `AdminThemeSegmentAssignmentEpisode`
- `backend/internal/models/theme_segment_render_cache.go` - `ReleaseVersionID *int64` auf `ThemeSegmentRenderCache`/`ThemeSegmentRenderCacheUpsertInput`
- `backend/internal/handlers/segment_stream.go` - Interface + drei Call-Sites auf neue Signaturen; neuer optionaler `release_version_id`-Query-Parameter
- `backend/internal/handlers/segment_render_refresh.go` / `segment_render_worker.go` - Call-Sites auf neue Signaturen
- `backend/internal/handlers/segment_render_worker_test.go` - Fake-Repo-Methoden an neue Interface-Signaturen angepasst
- `backend/internal/handlers/admin_content_handler.go` - `adminThemeRepository`-Interface: `CreateAnimeSegment`/`GetSegmentReleaseDuration`
- `backend/internal/handlers/admin_content_anime_theme_segments.go` - Call-Sites mit TODO-Kommentaren für Plan 117-04/117-05
- `backend/internal/handlers/admin_content_fansub_releases_test.go` - Stub-Repo an neue Signaturen angepasst
- `backend/internal/testsupport/phase117_postgres.go` - Migration 0144 in Fixture-Liste; `release_streams.jellyfin_item_id` + `release_versions.title` Stub-Spalten ergänzt
- `database/migrations/0144_drop_theme_segment_playback_sources_legacy_unique.{up,down}.sql` - NEU

## Decisions Made

Siehe `key-decisions` im Frontmatter. Zusammengefasst: `release_version_id` ist jetzt an allen Render-Cache-Lookups ein Pflichtparameter (da ein geteiltes Segment jetzt mehrere `theme_segment_playback_sources`-Zeilen haben kann); für die drei Handler-Einstiegspunkte, die noch keine `release_version_id` aus dem Request kennen (`RenderSegment`, `StreamSegment`s authentifizierter Grant-Pfad), wurde bewusst ein optionaler Query-Parameter mit Default 0 gewählt statt eines Pflichtparameters, damit die bestehenden Unit-Tests (`TestRenderSegment_*`, `TestStreamSegmentAcceptsMatchingPublicGrant`) unverändert grün bleiben — die volle Handler-Verdrahtung ist explizit Plan 117-04/117-05.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `TestLoadThemeSegmentPlaybackSnapshotTx_ContainsReleaseVariantJoins` brach durch den W-mod-Datei-Split**
- **Found during:** Task 1/2 (nach Verschieben der `release_variants`/`release_streams`/`stream_sources`-JOINs in die neue Datei)
- **Issue:** Der bestehende String-Pattern-Test prüfte diese Muster ausschließlich in `admin_content_anime_themes.go`. Da die Playback-Resolution-Query per Plan-Vorgabe (W-mod) in die neue `theme_segment_playback_resolution.go` verschoben wurde, verschwanden die Muster aus der geprüften Datei — der Test wäre ohne Anpassung fälschlich rot geworden, obwohl die Funktionalität korrekt vorhanden ist, nur an einem anderen Ort.
- **Fix:** Test liest jetzt beide Dateien (`admin_content_anime_themes.go` + `theme_segment_playback_resolution.go`) kombiniert.
- **Files modified:** `backend/internal/repository/segment_playback_resolution_test.go`
- **Committed in:** `7c26ab14`

**2. [Rule 3 - Blocking Issue] Import-Zyklus `repository` <-> `services` beim ursprünglich geplanten `package repository` für den neuen Integrationstest**
- **Found during:** Task 3 (`go vet` nach erstem Schreiben der Testdatei)
- **Issue:** Der Plan verlangt `import "team4s.v3/backend/internal/services"` im neuen Integrationstest fürs `BuildSegmentRenderCacheKey`-Beweisstück. `services` importiert seinerseits bereits `repository` (`anime_metadata_backfill.go`) — ein Test in `package repository`, der zusätzlich `services` importiert, erzeugt einen echten Go-Import-Zyklus (`go vet` schlägt fehl: "import cycle not allowed in test").
- **Fix:** Testdatei auf `package repository_test` (externes Testpaket) umgestellt, exakt das im Repository bereits etablierte Muster (`review_credit_repository_test.go`); `repository.NewAdminContentRepository(...)` statt direktem Empfänger-Zugriff, keine Nutzung unexportierter Repository-Helfer mehr (`derefString` durch manuelles Dereferenzieren ersetzt).
- **Files modified:** `backend/internal/repository/theme_segment_playback_resolution_integration_test.go`
- **Verification:** `go vet ./...` grün, Test läuft und ist grün gegen echte Postgres-Instanz.
- **Committed in:** `ccdffaae`

**3. [Rule 3 - Blocking Issue] Wave-0-Fixture (`testsupport/phase117_postgres.go`) fehlten drei Voraussetzungen für einen echten DB-Lauf**
- **Found during:** Task 3 (Live-Verifikation gegen die temporäre isolierte Postgres-Datenbank)
- **Issue:** (a) Migration 0144 fehlte in der Fixture-Migrationsliste — ohne sie hätte der alte 1:1-Index eine zweite `theme_segment_playback_sources`-Zeile für dasselbe Segment (zweite Release-Version-Zuweisung, genau das Kernszenario dieses Plans) mit einem Constraint-Fehler abgelehnt. (b) Der Stub für `release_streams` hatte keine `jellyfin_item_id`-Spalte, obwohl `GetThemeSegmentRenderSource` sie referenziert (in der echten Produktions-DB existiert die Spalte, im Wave-0-Stub fehlte sie). (c) Der Stub für `release_versions` hatte keine `title`-Spalte, ebenfalls von `GetThemeSegmentRenderSource` referenziert.
- **Fix:** Migration 0144 zur Fixture-Liste hinzugefügt; `jellyfin_item_id VARCHAR(255)` zu `release_streams` und `title TEXT` zu `release_versions` im Stub-SQL ergänzt.
- **Files modified:** `backend/internal/testsupport/phase117_postgres.go`
- **Verification:** Alle fünf Testfälle liefen nach den drei Fixes live grün gegen eine echte, isolierte Postgres-Instanz.
- **Committed in:** `ccdffaae`

**4. [Rule 1 - Bug] `hydrateSegmentPlaybackMetadata` (single-row Variante) wäre seit Task 1 nicht-deterministisch geworden**
- **Found during:** Task 1 (Analyse, welche bestehenden Codepfade von "ein Segment kann jetzt mehrere `theme_segment_playback_sources`-Zeilen haben" betroffen sind)
- **Issue:** `hydrateSegmentPlaybackMetadata` (verwendet u. a. von `loadSegmentByID`, `GetAnimeSegmentByID`, dem Rückgabewert nach `CreateAnimeSegment`/`UpdateAnimeSegment`) las die Playback-Quelle bisher per `QueryRow` ohne `ORDER BY` — solange es garantiert nur eine Zeile pro Segment gab, war das unproblematisch. Seit Task 1 kann ein geteiltes Segment mehrere Zeilen haben; `QueryRow` hätte dann eine arbiträre, nicht-deterministische Zeile geliefert.
- **Fix:** `ORDER BY release_version_id ASC NULLS LAST, id ASC LIMIT 1` ergänzt (liefert bewusst eine repräsentative Zeile; die vollständige, release_version_id-scoped Auflösung bleibt `GetThemeSegmentRenderSource` vorbehalten).
- **Files modified:** `backend/internal/repository/admin_content_anime_themes.go`
- **Committed in:** `7c26ab14`

---

**Total deviations:** 4 auto-fixed (1 Rule 1 test-adjustment, 1 Rule 3 import-cycle fix, 1 Rule 3 fixture-gap fix, 1 Rule 1 determinism-bug fix)
**Impact on plan:** Alle vier Fixes waren notwendig, damit `go build`/`go vet`/`go test` (inkl. Live-DB) tatsächlich grün sind, wie es die Plan-Verifikation verlangt. Kein Scope-Creep über die Plan-Absicht hinaus.

### Pragmatic Task-Commit-Kombination (kein Auto-Fix, sondern Ausführungs-Entscheidung)

Task 1 und Task 2 wurden in EINEM Commit (`7c26ab14`) statt in zwei separaten Commits zusammengefasst. Grund: Die Implementierung wurde ganzheitlich entwickelt (z. B. berührt `admin_content_anime_themes.go` sowohl Task-1-Funktionen wie `syncThemeSegmentPlaybackSourceTx` als auch die Task-2-Hydration-Aufruf-Ergänzung in `ListAnimeSegments`; die neue Datei `theme_segment_playback_resolution.go` enthält sowohl die Task-1-Funktion `resolveThemeSegmentReleaseVariantTx` als auch die Task-2-Funktion `hydrateSegmentAssignmentMetadataList`), eine nachträgliche Aufteilung in exakt zwei separate, jeweils eigenständig buildbare Commits hätte erheblichen Mehraufwand ohne inhaltlichen Mehrwert bedeutet. Beide logischen Task-Inhalte sind im Commit-Text vollständig dokumentiert und jede der fünf Task-1/Task-2-Akzeptanzkriterien ist erfüllt und verifiziert (siehe Verification Evidence). Task 3 (DB-Integrationstest) blieb als eigener, klar abgegrenzter Commit bestehen.

## Issues Encountered

Keine blockierenden Probleme außerhalb der oben dokumentierten Deviations.

## Verification Evidence (live, gegen lokales Docker-Postgres)

- `go build ./...` und `go vet ./...` liefen nach jeder Änderung fehlerfrei (Backend-Repo-Root).
- `go test ./internal/repository/... ./internal/handlers/... ./internal/models/... ./internal/services/... ./internal/testsupport/...` — alle Pakete grün, inklusive aller bestehenden Segment-Tests (`go test ./internal/repository/... ./internal/handlers/... -run Segment -v`, siehe Kommandozeilen-Output oben: 40+ Testfälle grün, keiner rot).
- `cd backend && go run ./cmd/migrate up -dir "<repo-root>/database/migrations"` (mit `DATABASE_URL` auf `localhost:5433/team4s_v2`, dem echten Docker-Dev-Postgres) wandte Migration 0144 fehlerfrei an: `migrations applied: 1`.
- `\d theme_segment_playback_sources` (psql, gegen `team4sv30-db`) zeigt danach NUR noch `uq_theme_segment_playback_sources_segment_version` (composite) — der alte `uq_theme_segment_playback_sources_segment` existiert nicht mehr.
- Temporäre, isolierte Datenbank `team4s_phase117_test_b` auf `team4sv30-db` angelegt, `TEAM4S_PHASE117_TEST_DSN` darauf gesetzt: `go test ./internal/repository/... -run TestThemeSegmentPlaybackResolution -v` — alle fünf Subtests grün:
  - `resolves distinct StreamExternalID per release version (RESEARCH.md Risk 3)` — PASS
  - `episode override applies only to its own release version, base time for the other stays unchanged (D-01)` — PASS
  - `ready render cache lookup is release_version_id-scoped, no cross-episode leak (RESEARCH.md Risk 1)` — PASS
  - `BuildSegmentRenderCacheKey produces distinct keys for distinct release versions (Nyquist-Fix W2)` — PASS
  - `GetSegmentReleaseDuration returns nil when the only matching variant lies outside the requested episode range (RESEARCH.md Risk 3)` — PASS
- Skip-Fall (kein `TEAM4S_PHASE117_TEST_DSN`) erneut bestätigt sauber grün nach Löschen der temporären Test-DB (`DROP DATABASE team4s_phase117_test_b`) — kein Rückstand, `team4s_v2` (Dev-DB) wurde außer für die Migrations-Anwendung selbst zu keinem Zeitpunkt mit Testdaten beschrieben.

## User Setup Required

None - alle Verifikationsschritte liefen gegen lokale Ressourcen (Docker-Postgres, isolierte Wegwerf-Datenbank).

## Next Phase Readiness

- Backend-Repository-/Handler-Grundlage für Pro-Release-Version-Playback ist vollständig und live verifiziert. Plan 117-04 kann direkt auf `syncThemeSegmentPlaybackSourceTx`/`resolveThemeSegmentReleaseVariantTx` aufbauen, insbesondere den Fan-Out über ALLE zugewiesenen Release-Versionen bei einer Basis-Zeit-Änderung (`resetAndQueueSegmentRenderAfterChange` ruft aktuell bewusst nur `release_version_id=0` — TODO-Kommentar verweist explizit auf 117-04).
- Plan 117-05 kann `CreateAnimeSegment`/`GetSegmentReleaseDuration` direkt mit den echten `currentReleaseVersionID`/`startEpisode`/`endEpisode`-Werten aus dem Request verdrahten, ohne die Repository-Signaturen erneut ändern zu müssen (TODO-Kommentare markieren exakt die betroffenen Call-Sites).
- Plan 117-07 kann `AssignedEpisodes` (echte Episodennummern je Zuweisung) direkt für die "Folge {N}"-Zuweisungs-Chips konsumieren.
- **Bekannte, dokumentierte Zwischenzustand-Lücke bis 117-04/117-05:** `RenderSegment`/`StreamSegment` (authentifizierter Grant-Pfad) akzeptieren `release_version_id` aktuell nur als optionalen Query-Parameter mit Default 0; ohne echte Frontend-Verdrahtung in 117-04/117-05 würde ein Aufruf ohne diesen Parameter gegen reale (nicht Test-)Daten `segment nicht gefunden` liefern, da `tps.release_version_id = 0` nie matcht. Das ist ein bewusster, im Plan-Text selbst angelegter Zwischenzustand ("Repository-Methode muss den neuen Parameter bereits jetzt akzeptieren, damit Plan 117-04 nur noch den Call-Site anpassen muss") — kein Blocker für diesen Plan, aber ein Punkt, der vor einer gebündelten Live-UAT der gesamten Phase 117 durch 117-04/117-05 geschlossen sein muss.
- Kein Blocker für Plan 117-04.

---
*Phase: 117-kara-segment-zeit-override-anzeige*
*Completed: 2026-07-29*

## Self-Check: PASSED

All created files verified present on disk (`theme_segment_playback_resolution.go`, `theme_segment_playback_resolution_integration_test.go`, migration 0144 up/down). Task commits `7c26ab14` and `ccdffaae` verified present in `git log`.
