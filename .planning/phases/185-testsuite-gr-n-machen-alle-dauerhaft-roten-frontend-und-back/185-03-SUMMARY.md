---
phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back
plan: 03
subsystem: database
tags: [go, migrations, pgx, postgres, testing]

# Dependency graph
requires:
  - phase: 185-01/185-02
    provides: Ist-Stand-Analyse der dauerhaft roten Tests (185-CONTEXT.md), inkl. Identifikation
      des D-04-Produktbugs in ResolveMigrationsDir
provides:
  - "ResolveMigrationsDir bevorzugt deterministisch die repo-root database/migrations/ (368 Dateien)
    vor jedem flacheren CWD-relativen Kandidaten"
  - "Stray backend/database/migrations/ (2 veraltete Dateien + README) entfernt"
  - "runner.go auf 3 Dateien je <=450 Zeilen aufgeteilt (migrations_dir.go, migration_file_loader.go,
    runner.go)"
  - "TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible ist gruen"
affects: [185-weitere-Plaene, backend/internal/migrations, backend/cmd/migrate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Datei-Split vor inhaltlicher Aenderung: pure Umbau-Commit (Funktionskoerper
      byte-identisch verglichen) zuerst, dann der eigentliche Verhaltensfix als
      separater Commit (CLAUDE.md 'Übergroße Dateien beim Anfassen aufteilen')"
    - "Candidate-Order-Pruefung per deepest-first statt shallowest-first, um stale
      Verzeichnisse mit gleichem Namen nie wieder silent gewinnen zu lassen"

key-files:
  created:
    - backend/internal/migrations/migrations_dir.go
    - backend/internal/migrations/migration_file_loader.go
  modified:
    - backend/internal/migrations/runner.go
  deleted:
    - backend/database/migrations/001_create_media_tables.up.sql
    - backend/database/migrations/001_create_media_tables.down.sql
    - backend/database/migrations/README.md

key-decisions:
  - "ResolveMigrationsDir-candidates-Liste wurde nur umgekehrt (deepest-first), nicht
    neu konstruiert -- erfuellt D-04 ohne neue Fallback-Logik einzufuehren"
  - "Verifikation des reinen Datei-Splits erfolgte per automatisiertem Funktionskoerper-Diff
    (Original vs. aufgeteilte Dateien) statt nur 'Tests laufen durch', um
    Copy/Paste-Fehler auszuschliessen"

requirements-completed: [D-04]

# Metrics
duration: ~8min
completed: 2026-10-16
---

# Phase 185 Plan 03: D-04 ResolveMigrationsDir-Fix + runner.go-Split Summary

**ResolveMigrationsDir bevorzugt jetzt deterministisch die echte repo-root database/migrations/
(368 Dateien) statt eines veralteten, flacheren backend/database/migrations/-Stray-Ordners (2
Dateien vom 30. Juli); runner.go wurde dafür zuerst verhaltensgleich in 3 Dateien je ≤450 Zeilen
aufgeteilt.**

## Performance

- **Duration:** ~8 min
- **Tasks:** 2/2
- **Files modified:** 6 (3 verschoben/neu angelegt via Split, 3 gelöscht, 1 inhaltlich geändert)

## Accomplishments

- `runner.go` (471 Zeilen, über dem 450-Zeilen-CLAUDE.md-Limit) in 3 Dateien aufgeteilt:
  `migrations_dir.go` (56 Zeilen: `ResolveMigrationsDir`, `validateMigrationDir`, `isDir`),
  `migration_file_loader.go` (78 Zeilen: `migrationFilePattern`, `loadMigrations`,
  `parseMigrationFilename`), `runner.go` (351 Zeilen: Typen, `NewRunner`, alle `Runner`-Methoden).
  Per automatisiertem Funktionskörper-Diff (Original gegen aufgeteilte Dateien) bestätigt:
  jede Funktion/Typ/Var ist byte-identisch zum Original übernommen worden.
- Stray `backend/database/migrations/` (2 Dateien + README, zuletzt am 30. Juli angefasst, aus
  der Zeit vor der echten Migrationssystem-Reorganisation) nach repo-weitem Grep-Audit
  (`.go`/`.yml`/`.yaml`/`.sh`/`Dockerfile*`, keine Treffer außerhalb des Ordners selbst) entfernt.
- `candidates`-Liste in `ResolveMigrationsDir` umgekehrt: die tiefste (repo-root-näheste)
  Kandidatentiefe wird jetzt zuerst geprüft, sodass ein künftig erneut auftauchender flacher
  Stray-Ordner nie wieder silent gewinnen kann.
- `TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible` läuft jetzt gegen die echten
  368 Migrationsdateien (statt die veralteten 2) und ist grün.
- Live-Sanity-Check: `go run ./cmd/migrate status` (CWD=`backend`, wie die reale
  `cd backend && go run ./cmd/migrate`-Nutzung) gegen eine eigens angelegte Wegwerf-Datenbank
  (`team4s_185_03_sanity_check`, danach wieder gedroppt) findet korrekt 184 Migrationen
  (0 angewendet) — der reale Migrate-Tool-Pfad ist durch die Umkehrung unverändert
  funktionsfähig.

## Task Commits

1. **Task 1: Pure refactor — runner.go in 3 Dateien aufteilen** - `e1774a6da` (refactor)
2. **Task 2: D-04-Fix — Stray-Verzeichnis löschen + candidates umkehren** - `33941b424` (fix) +
   `0a7ed6eb0` (fix, Nachtrag für eine versehentlich nicht gestagte Zeile, siehe Deviations)

**Plan metadata:** (dieser Commit folgt nach der SUMMARY)

## Files Created/Modified

- `backend/internal/migrations/migrations_dir.go` - `ResolveMigrationsDir` (jetzt mit
  deepest-first-candidates), `validateMigrationDir`, `isDir`
- `backend/internal/migrations/migration_file_loader.go` - `migrationFilePattern`,
  `loadMigrations`, `parseMigrationFilename`
- `backend/internal/migrations/runner.go` - nur noch Typen, `NewRunner`, alle `Runner`-Methoden
- `backend/database/migrations/` - komplett entfernt (001_create_media_tables.up/down.sql, README.md)

## Decisions Made

- `candidates`-Liste wurde nur umgekehrt (nicht neu konstruiert), um exakt die im Plan
  spezifizierte minimale, risikoarme Änderung umzusetzen.
- Verifikation des Task-1-Splits erfolgte nicht nur über "Tests laufen durch", sondern über
  einen automatisierten Funktionskörper-Vergleich (Original-`runner.go` vs. die drei neuen
  Dateien), um sicherzustellen, dass beim Verschieben kein Zeichen verändert wurde.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `git add` mit mehreren Pfaden schlug auf einem bereits via `git rm`
gestagten Pfad fehl und ließ die restliche Pathspec-Liste ungestaged**
- **Found during:** Task 2, beim Commit-Versuch
- **Issue:** `git add <3-gelöschte-Dateien> <migrations_dir.go>` brach beim ersten Pfad mit
  "did not match any files" ab (da `git rm -r` die Datei bereits aus dem Arbeitsverzeichnis
  entfernt hatte), wodurch `migrations_dir.go` NICHT gestaged wurde. Der Commit `33941b424`
  enthielt dadurch nur die 3 Löschungen, nicht die eigentliche candidates-Umkehrung.
- **Fix:** Fehlender Stage-Schritt sofort erkannt (Diff gegen HEAD nach dem Commit geprüft),
  `migrations_dir.go` in einem eigenen Nachtrags-Commit `0a7ed6eb0` gestaged und committet.
- **Files modified:** `backend/internal/migrations/migrations_dir.go`
- **Verification:** `git diff HEAD -- backend/internal/migrations/migrations_dir.go` zeigt nach
  `0a7ed6eb0` keine Abweichung mehr; `git status --short` ist clean.
- **Committed in:** `0a7ed6eb0`

**2. [Rule 1 - Bug] Docker-Bind-Mount legte versehentlich wieder ein leeres
`backend/database/migrations/`-Verzeichnis an**
- **Found during:** Task 2, während der Live-Sanity-Check-Vorbereitung
- **Issue:** Ein `docker run`-Aufruf zur Verifikation band `$(pwd)/database/migrations` nach
  `/app/database/migrations` (innerhalb des Containers, der `backend/` auf `/app` mountet);
  Docker legt beim Bind-Mount fehlende Host-Pfade automatisch an, wodurch
  `backend/database/migrations/` (root-owned, leer) nach dem bewussten `git rm` erneut auf dem
  Host entstand.
- **Fix:** Verzeichnis sofort mit `sudo rmdir` entfernt, nachdem `git status --short` es als
  nicht-tracked Leerverzeichnis zeigte; kein Git-Tracking betroffen, keine Code-Änderung nötig.
- **Files modified:** keine (nur Dateisystem-Aufräumung, nichts committet)
- **Verification:** `test -d backend/database/migrations` liefert jetzt wieder "false";
  `git status --short` zeigt keine Spur mehr.
- **Committed in:** n/a (reine lokale Dateisystem-Korrektur, nicht Teil der Historie)

---

**Total deviations:** 2 auto-fixed (1 Blocking-Staging-Fehler, 1 Bug durch Docker-Bind-Mount-Nebeneffekt)
**Impact on plan:** Beide Korrekturen waren rein mechanisch/operativ und haben den eigentlichen
D-04-Fix nicht verändert. Kein Scope Creep.

## Issues Encountered

- Lokale Shell hat kein `go`-Binary (`go: command not found`); alle `go build`/`go vet`/
  `go test`/`go run`-Aufrufe liefen stattdessen via `docker run` mit dem bestehenden
  `team4s-team4sv30-backend:latest`-Image und einem Bind-Mount von `backend/` nach `/app`
  (plus `team4s_backend_go_build`-Cache-Volume für Geschwindigkeit und `--network
  team4s_default`, um die laufende `team4sv30-db` zu erreichen). Für den Live-`cmd/migrate
  status`-Sanity-Check wurde eine eigens angelegte Wegwerf-Datenbank
  (`team4s_185_03_sanity_check`) auf `team4sv30-db` verwendet und danach wieder gedroppt — zu
  keinem Zeitpunkt wurde gegen `team4s_v2` getestet.
- Beim ersten vollständigen `go test ./internal/migrations/...`-Lauf (ohne
  `TEAM4S_PHASE134_MIGRATION_DSN`) zeigten sich zahlreiche vorbestehende FAIL/SKIP-Ergebnisse
  für andere, unabhängige historische Migrationstests (z. B. fehlende
  `0145_member_public_identity_visibility.up.sql`, fehlendes `TEAM4S_PHASE128_TEST_DSN`). Diese
  sind laut 185-CONTEXT.md bereits bekannt und außerhalb des D-04-Scopes dieses Plans — nicht
  gefixt, nur dokumentiert. Ein automatisierter Vorher/Nachher-Vergleich (86 PASS/FAIL/SKIP-Zeilen,
  identische Umgebung) bestätigte, dass der reine Datei-Split (Task 1) exakt null neue
  Fehlschläge einführte.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness

- D-04 ist vollständig geschlossen: der einzige in 185-CONTEXT.md identifizierte echte
  Produktbug ist behoben, verifiziert über den Ziel-Test plus einen Live-Sanity-Check des
  echten `cmd/migrate`-Tools.
- `runner.go`, `migrations_dir.go`, `migration_file_loader.go` liegen alle unter dem
  450-Zeilen-CLAUDE.md-Limit (351/56/78 Zeilen).
- Die übrigen, vorbestehenden roten Tests in `backend/internal/migrations/` (Phase-128/136/137/142/147
  und Release-Review-Lifecycle, jeweils fehlende historische Migrationsdateien oder fehlende
  DSN-Env-Vars) sind unverändert und liegen außerhalb des D-04-Scopes dieses Plans — vermutlich
  Gegenstand eines anderen 185-xx-Plans gemäß 185-CONTEXT.md.

---
*Phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back*
*Completed: 2026-10-16*
