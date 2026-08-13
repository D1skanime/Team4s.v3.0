---
phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe
plan: "01"
subsystem: testing
tags: [go, tdd, vitest, repository, migration-contract, source-scan]

requires:
  - phase: 75-release-version-labels
    provides: release_version_groups junction table + EpisodeVersionRepository structure

provides:
  - Wave-0 RED test suite for P81 (4 backend + 1 frontend, all failing)
  - episode_version_repository.go split into 3 files ≤450 lines (CLAUDE.md compliance)
  - Old collaboration model tests removed from episode_import_repository_test.go

affects:
  - 81-02, 81-03, 81-04 (GREEN phase plans that will make these RED tests pass)

tech-stack:
  added: []
  patterns:
    - source-scan tests via os.ReadFile + strings.Index for Go structural assertions
    - migration contract tests via readMigrationFile + assertContainsAll
    - Vitest jsdom RED import-error pattern for not-yet-created components

key-files:
  created:
    - backend/internal/migrations/phase81_collaboration_removal_test.go
    - backend/internal/repository/episode_version_repository_write_helpers_test.go
    - backend/internal/repository/episode_version_repository_read_helpers_test.go
    - backend/internal/repository/episode_version_repository_read_helpers.go
    - backend/internal/repository/episode_version_repository_write_helpers.go
    - frontend/src/components/anime/ReleaseVersionFansubChips.test.tsx
  modified:
    - backend/internal/repository/episode_version_repository.go (split, 450 lines)
    - backend/internal/repository/episode_import_repository_test.go (2 collab tests removed)
    - backend/internal/repository/runtime_authority_test.go (ListReleaseAssets assertion updated)

key-decisions:
  - "normalizeReleaseAssetType + normalizeReleaseAssetPublicPath bleiben in Kerndatei (nicht in read_helpers) um 450-Zeilen-Limit in beiden Dateien einzuhalten"
  - "TestBuildAnimeFansubLinkGroupIDs_UsesOnlyMemberGroupsNoEffectiveGroup als Source-Scan implementiert (nicht direkter Funktionsaufruf) damit das Repository-Package kompilierbar bleibt während Test RED ist"

patterns-established:
  - "Repository-Split-Pattern: Go-Methoden können über mehrere Dateien im gleichen Package verteilt werden; read_helpers.go für Lese-Queries, write_helpers.go für Schreib-/Sync-Operationen"
  - "Wave-0 RED via Source-Scan: Strukturelle Assertions über zukünftigen Code ohne DB-Anforderungen — schlägt fehl solange Ziel-Muster fehlt"

requirements-completed:
  - P81-SC1
  - P81-SC2
  - P81-SC6
  - P81-SC7
  - P81-SC8

duration: 45min
completed: 2026-06-09
---

# Phase 81 Plan 01: Wave-0-Testgerüst + Pflicht-Split Summary

**Wave-0 RED Test Suite (5 Tests) + Zerlegung von episode_version_repository.go (1246 Z) in drei ≤450-Z-Dateien nach CLAUDE.md-Modularity-Constraint**

## Performance

- **Duration:** 45 min
- **Started:** 2026-06-09T09:00:00Z
- **Completed:** 2026-06-09T09:45:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- `episode_version_repository.go` von 1246 auf 450 Zeilen reduziert; Lesepfad (417 Z) und Schreibpfad (403 Z) in eigene Dateien ausgelagert — alle ≤450, Build grün
- 5 RED-Tests angelegt (4 Backend, 1 Frontend): Migrations-Contract, N-Junction-Write, ErrNotFound-Ordnung, FansubGroups-Plural, Chip-Anzeige
- 2 veraltete Kollaborations-Modell-Tests aus `episode_import_repository_test.go` entfernt; `runtime_authority_test.go` für neue Datei-Aufteilung korrigiert

## Task Commits

1. **Task 1: episode_version_repository.go splitten** - `654bae74` (feat)
2. **Task 2: Wave-0 RED Backend-Tests** - `b7385be7` (test)
3. **Task 3: Wave-0 RED Frontend-Test** - `d646c247` (test)

## Files Created/Modified

- `backend/internal/repository/episode_version_repository.go` — Kerndatei nach Split: struct, CRUD-Methoden, normalize-Helfer (450 Z)
- `backend/internal/repository/episode_version_repository_read_helpers.go` — Lese-Queries, rowScanner, scanReleaseVariantAsEpisodeVersion, ListReleaseAssets (417 Z)
- `backend/internal/repository/episode_version_repository_write_helpers.go` — State-Load, applyMetadata, ensureStream, syncSelectedGroups, Delete (403 Z)
- `backend/internal/migrations/phase81_collaboration_removal_test.go` — Contract-Tests für 0101+0102 Migrationen (RED: Dateien fehlen)
- `backend/internal/repository/episode_version_repository_write_helpers_test.go` — Source-Scan-Tests für N-Junction, ErrNotFound, neue Signatur (RED)
- `backend/internal/repository/episode_version_repository_read_helpers_test.go` — Source-Scan-Test für FansubGroups Plural (RED)
- `backend/internal/repository/episode_import_repository_test.go` — 2 Kollaborations-Tests entfernt
- `backend/internal/repository/runtime_authority_test.go` — ListReleaseAssets-Assertion auf read_helpers.go umgeleitet (Rule 1 Fix)
- `frontend/src/components/anime/ReleaseVersionFansubChips.test.tsx` — 3 Vitest-Tests für Chip-Anzeige (RED: Komponente fehlt)

## Decisions Made

- `normalizeReleaseAssetType` + `normalizeReleaseAssetPublicPath` in Kerndatei belassen (nicht in read_helpers): ermöglichte exakt 450 Zeilen in Kerndatei + 417 in read_helpers — beide unter Limit
- `TestBuildAnimeFansubLinkGroupIDs_UsesOnlyMemberGroupsNoEffectiveGroup` als Source-Scan implementiert statt Direktaufruf: Package bleibt kompilierbar während die Funktion noch alte Signatur hat — RED durch Assertion statt Kompilierungsfehler

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] runtime_authority_test.go nach Split korrigiert**
- **Found during:** Task 2 (Wave-0 RED Backend-Tests)
- **Issue:** `TestReleaseRuntimeAuthorityUsesReleaseNativeTables` prüfte `episode_version_repository.go` auf `ListReleaseAssets`-Inhalt — nach dem Split liegt diese Funktion in `episode_version_repository_read_helpers.go`
- **Fix:** Test auf `readRepositorySource("episode_version_repository_read_helpers.go")` umgestellt
- **Files modified:** `backend/internal/repository/runtime_authority_test.go`
- **Verification:** `go test ./internal/repository/... -run TestReleaseRuntimeAuthority...` grün
- **Committed in:** `b7385be7` (Teil des Task-2-Commits)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Notwendige Korrektur durch den Split in Task 1 ausgelöst. Kein Scope Creep.

## Issues Encountered

- **450-Zeilen-Limit im Split:** Mehrere Iterationen notwendig um alle drei Dateien ≤450 zu bringen. Finale Lösung: zwei normalize-Hilfsfunktionen in Kerndatei behalten + doppelten Leerzeilen und redundante switch-Cases komprimieren.
- **Kompilierbarkeit während RED:** `TestBuildAnimeFansubLinkGroupIDs_UsesOnlyMemberGroupsNoEffectiveGroup` ursprünglich als Direktaufruf geplant — würde Package-Kompilierung brechen. Ersetzt durch Source-Scan-Muster (Assertion auf Funktionssignatur im Source-String).

## User Setup Required

Keine — rein strukturelle Test-Ergänzung ohne neue externe Abhängigkeiten.

## Next Phase Readiness

- Wave-0-Testgerüst vollständig: alle 5 RED-Tests vorhanden, kompilieren, schlagen mit inhaltlichen Assertions fehl
- Split-Dateien kompilieren; kein Algorithmus wurde geändert (Stub-Logik bleibt)
- Bereit für Plan 02 (Migrations 0101+0102 schreiben → Migrations-Contract-Tests grün) und Plan 03 (Write-Helper N-fach Logik → Backend RED-Tests grün)

---
*Phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe*
*Completed: 2026-06-09*
