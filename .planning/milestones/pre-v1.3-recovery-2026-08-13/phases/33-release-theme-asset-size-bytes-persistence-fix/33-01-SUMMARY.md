---
phase: 33-release-theme-asset-size-bytes-persistence-fix
plan: 01
subsystem: api
tags: [go, media, repository, upload, media_files]

# Dependency graph
requires:
  - phase: 32-fansub-release-side-drawer
    provides: Release-Theme-Asset-Upload-Handler (UploadReleaseThemeAsset, UploadReleaseThemeAssetForRelease)
provides:
  - InsertMediaFile-Methode auf MediaRepository mit korrektem INSERT INTO media_files
  - Beide Upload-Handler persistieren tatsaechliche Dateigroesse in media_files
  - Rollback (DeleteMediaAsset + removeFileQuietly) bei InsertMediaFile-Fehler
affects: [release-theme-assets-list-api, size_bytes-in-admin-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [source-text-tests fuer handler/repository-contract-pruefung]

key-files:
  created:
    - backend/internal/handlers/admin_content_release_theme_assets_test.go
  modified:
    - backend/internal/repository/media_repository.go
    - backend/internal/handlers/admin_content_release_theme_assets.go

key-decisions:
  - "InsertMediaFile als separate Methode auf MediaRepository statt in MediaUploadRepository — kein Legacy-Upload-Schema benoetigt"
  - "width=0 height=0 hardcoded fuer Video-Assets in InsertMediaFile (D-02)"
  - "Rollback-Reihenfolge: erst DeleteMediaAsset, dann removeFileQuietly — konsistent mit CreateReleaseThemeAsset-Rollback"

patterns-established:
  - "Source-Text-Tests: os.ReadFile liest Handler/Repository-Quelle und strings.Contains/Count prueft Contract ohne DB-Mock"

requirements-completed: [FIX-01, FIX-02, FIX-03]

# Metrics
duration: 15min
completed: 2026-05-05
---

# Phase 33 Plan 01: Release-Theme-Asset size_bytes Persistence Fix Summary

**InsertMediaFile-Methode auf MediaRepository und beide Upload-Handler gepatcht so dass media_files-Eintrag nach jedem Asset-Upload gespeichert wird und size_bytes in der List-API nicht mehr 0 liefert**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-05T00:00:00Z
- **Completed:** 2026-05-05T00:15:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- InsertMediaFile-Methode auf *MediaRepository hinzugefuegt mit SQL: `INSERT INTO media_files (media_id, variant, path, width, height, size) VALUES ($1, $2, $3, 0, 0, $4)`
- Beide Upload-Handler (UploadReleaseThemeAsset und UploadReleaseThemeAssetForRelease) rufen InsertMediaFile nach CreateMediaAsset auf
- Rollback-Seam bei InsertMediaFile-Fehler: DeleteMediaAsset + removeFileQuietly korrekt verdrahtet
- Source-Text-Tests FIX-01, FIX-02, FIX-03 alle gruen; gesamtes Backend kompiliert und alle internen Tests bestehen

## Task Commits

1. **Task 1: InsertMediaFile-Methode und Source-Text-Tests (RED + Repository-Methode)** - `844093ca` (test)
2. **Task 2: Beide Upload-Handler um InsertMediaFile erweitert (GREEN)** - `bb9ff3f7` (feat)

**Plan metadata:** (final-docs-commit, siehe unten)

## Files Created/Modified
- `backend/internal/repository/media_repository.go` - InsertMediaFile-Methode hinzugefuegt
- `backend/internal/handlers/admin_content_release_theme_assets.go` - Beide Upload-Handler gepatcht
- `backend/internal/handlers/admin_content_release_theme_assets_test.go` - Source-Text-Tests FIX-01/02/03

## Decisions Made
- InsertMediaFile als separate Methode auf MediaRepository statt Nutzung von MediaUploadRepository — passt zur bestehenden Architektur im Handler (h.mediaRepo ohne Legacy-Schema-Abhaengigkeit)
- Path-Fix fuer os.ReadFile in Tests: `../repository/` statt `../../repository/` — beide Pakete liegen unter `internal/`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Umbenennung readHandlerSource/readRepoSource wegen Namenskollision**
- **Found during:** Task 1 (Source-Text-Tests schreiben)
- **Issue:** `readHandlerSource` war bereits in `admin_content_test.go` deklariert mit anderer Signatur; `readRepoSource` wuerde ebenfalls kollidieren
- **Fix:** Umbenannt zu `readReleaseThemeHandlerSource` und `readMediaRepoSource`
- **Files modified:** backend/internal/handlers/admin_content_release_theme_assets_test.go
- **Verification:** `go test ./internal/handlers/... -run TestReleaseThemeAsset` — PASS
- **Committed in:** 844093ca (Teil von Task 1 commit)

**2. [Rule 3 - Blocking] Pfad-Korrektur in os.ReadFile fuer Repository-Quelle**
- **Found during:** Task 1 (Tests ausfuehren)
- **Issue:** Plan spezifizierte `../../repository/media_repository.go` — falsch, da beide Pakete direkt unter `internal/` liegen
- **Fix:** Geaendert auf `../repository/media_repository.go`
- **Files modified:** backend/internal/handlers/admin_content_release_theme_assets_test.go
- **Verification:** os.ReadFile liefert Inhalt, FIX-01 besteht nach Repository-Patch
- **Committed in:** 844093ca (Teil von Task 1 commit)

---

**Total deviations:** 2 auto-fixed (beide Rule 3 - Blocking)
**Impact on plan:** Beide Korrekturen notwendig damit Tests ueberhaupt kompilieren und laufen. Kein Scope-Creep.

## Issues Encountered
- Namenskollision in `handlers`-Paket-Tests: bestehende `readHandlerSource(t, name string)` in admin_content_test.go; geloest durch neue Funktionsnamen
- Windows relative Pfade von `go test`: Plan-Pfad `../../repository/` war falsch; `../repository/` korrekt

## User Setup Required
None - kein Frontend-Touch, kein Schema-Change, kein neuer Env-Wert.

## Next Phase Readiness
- Release-Theme-Asset-Uploads persistieren ab sofort `size_bytes` korrekt in `media_files`
- Die List-API (`ListReleaseThemeAssets`) gibt echte Dateigroesse zurueck statt 0
- Kein Backfill fuer bestehende Assets (per D-03 explizit ausser Scope)
- Docker-Rebuild noetig damit Backend-Container den Fix erhaelt

---
*Phase: 33-release-theme-asset-size-bytes-persistence-fix*
*Completed: 2026-05-05*
