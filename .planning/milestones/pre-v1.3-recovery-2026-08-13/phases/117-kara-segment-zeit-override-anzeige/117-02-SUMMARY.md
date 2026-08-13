---
phase: 117-kara-segment-zeit-override-anzeige
plan: 02
subsystem: backend
tags: [postgresql, testsupport, repository, theme-segments, kara-segments, release-versions, tdd]

# Dependency graph
requires:
  - phase: 117-01
    provides: "theme_segment_assignments / theme_segment_episode_overrides / theme_segment_render_cache.release_version_id schema (migrations 0141/0142/0143)"
provides:
  - "OpenPhase117Postgres(t) -- Wave-0 real-DB test fixture, reusable for Plan 117-03"
  - "AssignThemeSegmentToReleaseVersion / UnassignThemeSegmentFromReleaseVersion / ListThemeSegmentAssignments repository CRUD"
  - "UpsertThemeSegmentEpisodeOverride / DeleteThemeSegmentEpisodeOverride / GetThemeSegmentEpisodeOverride / ListThemeSegmentEpisodeOverrides repository CRUD"
  - "AdminThemeSegmentAssignment / AdminThemeSegmentEpisodeOverride(UpsertInput) models + AdminThemeSegment overview fields (AssignedReleaseVersionIDs/IsShared/HasEpisodeOverride)"
affects: [117-03, 117-04, 117-05, 117-06, 117-07, 117-08, 117-09]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Wave-0 real-DB integration testing via testsupport.OpenPhase<N>Postgres, following the Phase 106/107 isolated-schema fixture pattern"]

key-files:
  created:
    - backend/internal/testsupport/phase117_postgres.go
    - backend/internal/testsupport/phase117_postgres_test.go
    - backend/internal/repository/theme_segment_assignments.go
    - backend/internal/repository/theme_segment_overrides.go
    - backend/internal/repository/theme_segment_assignments_integration_test.go
  modified:
    - backend/internal/models/admin_anime_themes.go

key-decisions:
  - "Added a media_assets(id, file_path) stub table to createPhase117Prerequisites beyond the plan's stub list, because migration 0054 declares a nullable FK from theme_segment_playback_sources.media_asset_id to media_assets(id); without the referenced table, ApplySQLFile for 0054 fails at CREATE TABLE time (Rule 3 blocking-issue fix)."
  - "AssignThemeSegmentToReleaseVersion uses ON CONFLICT (theme_segment_id, release_version_id) DO UPDATE SET theme_segment_id = EXCLUDED.theme_segment_id (a no-op self-update) instead of DO NOTHING, because DO NOTHING suppresses RETURNING on the pre-existing row -- the method needs to return the assignment on both the first and every repeated call to stay idempotent per the plan's <behavior> contract."
  - "Integration test data setup uses one pool.Exec call per INSERT statement instead of one multi-statement Exec with all parameters, because pgx rejects multiple semicolon-separated commands in a single parameterized Exec call (SQLSTATE 42601, discovered live while verifying the test against a real DB)."

patterns-established:
  - "theme_segment_assignments.go / theme_segment_overrides.go follow the exact theme_segment_render_cache.go shape: a column-list constant, a scan*(pgx.Row) helper, INSERT ... ON CONFLICT ... RETURNING for upsert-style writes, Exec+RowsAffected() for delete, and Postgres 23503 -> repository.ErrConflict translation via errors.As(*pgconn.PgError)."

requirements-completed: [D-01, D-03]

# Metrics
duration: ~12min
completed: 2026-07-29
---

# Phase 117 Plan 02: Wave-0-DB-Testinfrastruktur + Zuweisungs-/Override-Repository Summary

**`OpenPhase117Postgres(t)`-Fixture (sieben echte Migrationen, isoliertes Schema) plus additive Repository-CRUD-Schicht fuer geteilte Kara-Zuweisung und Per-Version-Zeit-Override, mit Konflikt- und Cascade-Pfad live gegen echtes Postgres verifiziert.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-29T13:49:00Z (approx., nach Abschluss 117-01)
- **Completed:** 2026-07-29T13:56:48Z
- **Tasks:** 3/3 completed
- **Files modified:** 6 (5 neu, 1 erweitert)

## Accomplishments
- `OpenPhase117Postgres(t)` als duenner Wrapper um das paketweit vorhandene `openPhasePostgres`-Fixture-Muster (dediziertes `TEAM4S_PHASE117_TEST_DSN`, Datenbank-/Schema-Namens-Guards, `public`-Schema-Verbot) angelegt; wendet 12 Stub-FK-Eltern-Tabellen plus sieben echte Migrationsdateien (0049/0051/0054/0122/0141/0142/0143) an.
- `AssignThemeSegmentToReleaseVersion` / `UnassignThemeSegmentFromReleaseVersion` / `ListThemeSegmentAssignments` als CRUD auf `theme_segment_assignments` (D-03) -- idempotente Zuweisung, Cascade-faehiges Entfernen.
- `UpsertThemeSegmentEpisodeOverride` / `DeleteThemeSegmentEpisodeOverride` / `GetThemeSegmentEpisodeOverride` / `ListThemeSegmentEpisodeOverrides` als CRUD auf `theme_segment_episode_overrides` (D-01) -- ein Upsert fuer eine nicht zugewiesene Release-Version wird ueber die DB-seitige composite FK abgelehnt (Postgres 23503 -> `ErrConflict`), kein stiller Erfolg.
- `AdminThemeSegment` um `AssignedReleaseVersionIDs`/`IsShared`/`HasEpisodeOverride` erweitert; neue Modelle `AdminThemeSegmentAssignment`, `AdminThemeSegmentEpisodeOverride`, `AdminThemeSegmentEpisodeOverrideUpsertInput`.
- Vier Integrationstest-Faelle (Doppel-Zuweisung+Liste, Override-Isolation ohne Cross-Talk, Konflikt-Ablehnung bei fehlender Zuweisung, Cascade-Loeschung bei Unassign) gegen eine echte, temporaer angelegte, isolierte Postgres-Datenbank live gruen verifiziert -- nicht nur der eingebaute Skip-Fall.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave-0-Testfixture OpenPhase117Postgres** - `4bf4ffea` (feat)
2. **Task 2: Modelle + Repository-CRUD fuer Zuweisung und Zeit-Override** - `878dea42` (feat)
3. **Task 3: DB-Integrationstest fuer Zuweisung + Override-Datenintegritaet** - `93527b58` (test)

## Files Created/Modified
- `backend/internal/testsupport/phase117_postgres.go` - Wave-0-Fixture (Stub-Tabellen + 7 Migrationen), Guard-Funktionen
- `backend/internal/testsupport/phase117_postgres_test.go` - vier Guard-Tests (DSN-Skip, Phasen-Isolation, DB-/Schema-Namensvalidierung)
- `backend/internal/models/admin_anime_themes.go` - `AdminThemeSegment`-Erweiterung + drei neue Modelle
- `backend/internal/repository/theme_segment_assignments.go` - Zuweisungs-CRUD (129 Zeilen)
- `backend/internal/repository/theme_segment_overrides.go` - Override-CRUD (181 Zeilen)
- `backend/internal/repository/theme_segment_assignments_integration_test.go` - vier Behavior-Faelle als `t.Run`-Subtests

## Decisions Made
- `media_assets`-Stub-Tabelle ueber die Plan-Vorgabe hinaus ergaenzt (Migration 0054 deklariert eine nullable FK darauf; ohne Stub schlaegt `ApplySQLFile` fuer 0054 fehl) -- siehe Deviations.
- `ON CONFLICT ... DO UPDATE SET theme_segment_id = EXCLUDED.theme_segment_id` statt `DO NOTHING` in `AssignThemeSegmentToReleaseVersion`, damit `RETURNING` auch bei einem wiederholten Aufruf die bestehende Zeile liefert (idempotent laut `<behavior>`-Block, aber mit Rueckgabewert).
- Integrationstest-Setup nutzt separate `pool.Exec`-Aufrufe pro INSERT statt eines gemeinsamen Multi-Statement-Execs mit Parametern (Postgres/pgx lehnt mehrere Kommandos in einem parametrisierten Statement ab, SQLSTATE 42601 -- live beim Testlauf entdeckt und behoben).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] `media_assets`-Stub-Tabelle fehlte im Plan-Text**
- **Found during:** Task 1 (Analyse von Migration 0054 vor Implementierung der Fixture)
- **Issue:** Der Plan listet die Stub-FK-Eltern-Tabellen fuer `createPhase117Prerequisites` explizit auf, `media_assets` fehlt darin. Migration `0054_theme_segment_playback_sources.up.sql` deklariert jedoch `media_asset_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL` als Spalte der neuen Tabelle -- ohne existierende `media_assets`-Tabelle schlaegt `CREATE TABLE theme_segment_playback_sources` mit einem Postgres-FK-Zieltabelle-fehlt-Fehler fehl, noch bevor irgendein Repository-Code laeuft.
- **Fix:** Minimaler Stub `CREATE TABLE media_assets (id BIGINT PRIMARY KEY, file_path TEXT)` vor den Migrationsaufrufen ergaenzt (file_path zusaetzlich, da eine spaetere Query in `theme_segment_render_cache.go` diese Spalte bereits konsumiert).
- **Files modified:** `backend/internal/testsupport/phase117_postgres.go`
- **Commit:** `4bf4ffea`

**2. [Rule 1 - Bug] `ON CONFLICT DO NOTHING` haette `RETURNING` bei wiederholtem Aufruf leer gelassen**
- **Found during:** Task 2 (Implementierung von `AssignThemeSegmentToReleaseVersion`)
- **Issue:** Der Plan-Text nennt explizit `ON CONFLICT (theme_segment_id, release_version_id) DO NOTHING` als Zielverhalten. Mit `DO NOTHING` liefert Postgres bei einem Konfliktfall (Zeile existiert bereits) keine Zeile fuer `RETURNING` zurueck -- die Methode haette bei ihrem zweiten (idempotenten) Aufruf `nil, ErrNotFound` zurueckgegeben statt der bestehenden Zuweisung, was die im `<behavior>`-Block geforderte Idempotenz (kein Fehler) verletzt haette, sobald ein Aufrufer den Rueckgabewert erwartet.
- **Fix:** `DO UPDATE SET theme_segment_id = EXCLUDED.theme_segment_id` (ein wirkungsloses Self-Update) statt `DO NOTHING` verwendet, damit `RETURNING` in jedem Fall die (neue oder bestehende) Zeile liefert.
- **Files modified:** `backend/internal/repository/theme_segment_assignments.go`
- **Commit:** `878dea42`

**3. [Rule 1 - Bug] Multi-Statement-Exec mit Parametern schlug im Integrationstest fehl**
- **Found during:** Task 3 (Live-Verifikation gegen echte Postgres-DB)
- **Issue:** Die urspruengliche Testdaten-Erzeugung buendelte alle INSERTs in einem einzigen `pool.Exec`-Aufruf mit `$1..$9`-Parametern und mehreren durch `;` getrennten Anweisungen. pgx/Postgres lehnt das mit `SQLSTATE 42601 (cannot insert multiple commands into a prepared statement)` ab, sobald Parameter im Spiel sind.
- **Fix:** Aufteilung in einen `pool.Exec`-Aufruf pro INSERT-Anweisung.
- **Files modified:** `backend/internal/repository/theme_segment_assignments_integration_test.go`
- **Commit:** `93527b58`

## Issues Encountered

Keine blockierenden Probleme ausserhalb der oben dokumentierten Deviations.

## Verification Evidence (live, against a throwaway isolated Postgres database)

- `go build ./...` und `go vet ./...` liefen nach jedem Task fehlerfrei (Backend-Repo-Root).
- Skip-Fall (kein `TEAM4S_PHASE117_TEST_DSN`): `go test ./internal/testsupport/... -run Phase117 -v` und `go test ./internal/repository/... -run TestThemeSegmentAssignments -v` beide gruen mit sauberem `SKIP`.
- Zusaetzlich, ueber die Plan-Mindestanforderung hinaus: eine temporaere Datenbank `team4s_phase117_test_a` wurde auf dem lokalen Docker-Postgres (`team4sv30-db`, Host-Port 5433) angelegt, `TEAM4S_PHASE117_TEST_DSN` darauf gesetzt, und beide Testsuiten liefen echt durch:
  - `OpenPhase117Postgres(t)` wendet alle sieben Migrationsdateien fehlerfrei an und liefert einen nutzbaren, schema-isolierten Pool.
  - `TestThemeSegmentAssignmentsAndOverrides` -- alle vier Subtests (Doppel-Zuweisung+Liste, Override-Isolation, Konflikt-Ablehnung, Cascade-Loeschung) gruen.
- Die temporaere Datenbank wurde nach der Verifikation wieder geloescht (`DROP DATABASE team4s_phase117_test_a`); der Skip-Fall wurde anschliessend erneut bestaetigt gruen, kein Rueckstand in `team4s_v2` (Dev-DB wurde zu keinem Zeitpunkt beruehrt).

## User Setup Required

Keine. Alle Verifikationsschritte liefen gegen lokale Ressourcen (Docker-Postgres, isolierte Wegwerf-Datenbank).

## Next Phase Readiness

- `OpenPhase117Postgres(t)` steht als wiederverwendbare Wave-0-Fixture fuer Plan 117-03 (Resolution-Logik-Umbau, `syncThemeSegmentPlaybackSourceTx` `ON CONFLICT`-Umstellung, Drop des alten 1:1-Index) bereit.
- Repository-CRUD ist additiv und beruehrt die bestehende Resolution-Logik (`resolved_variant`, `ListAnimeSegments`) nicht -- unveraendert lauffaehig auf `main`.
- Kein Blocker fuer Plan 117-03 identifiziert.

---
*Phase: 117-kara-segment-zeit-override-anzeige*
*Completed: 2026-07-29*

## Self-Check: PASSED

All 6 created/modified files verified present on disk; task commits `4bf4ffea`, `878dea42`, `93527b58` verified present in `git log`.
