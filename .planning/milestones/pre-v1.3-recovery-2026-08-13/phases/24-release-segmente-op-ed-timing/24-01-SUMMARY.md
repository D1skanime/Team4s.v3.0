---
phase: 24-release-segmente-op-ed-timing
plan: 01
subsystem: backend
tags: [migration, theme-segments, crud, go, postgres]
dependency_graph:
  requires: []
  provides: [theme-segment-crud-api, migration-0049]
  affects: [admin_content_anime_themes, theme_segments_table]
tech_stack:
  added: []
  patterns: [dynamic-set-builder-patch, interval-as-text-scan]
key_files:
  created:
    - database/migrations/0049_extend_theme_segments.up.sql
    - database/migrations/0049_extend_theme_segments.down.sql
  modified:
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/handlers/admin_content_anime_theme_segments.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
decisions:
  - "Interval-Spalten per ::text-Cast gescannt sodass Go einen HH:MM:SS-String erhaelt statt pgtype.Interval"
  - "adminThemeRepository-Interface aktualisiert um Compilezeit-Verifikation der Implementierung zu erhalten"
  - "version-Default 'v1' wird im Handler gesetzt wenn Body-Feld leer ist"
metrics:
  duration: 25min
  completed: 2026-04-26T19:00:06Z
  tasks: 3
  files: 7
---

# Phase 24 Plan 01: Migration 0049 + Segment CRUD Backend Summary

**One-liner:** Migration 0049 ersetzt FK-basierte Episodenbereiche in theme_segments durch plain integers, fuegt Release-Kontext (fansub_group_id, version, Zeitbereich) hinzu, und vier neue CRUD-Endpunkte ersetzen die alten themeId-gebundenen Segment-Handler vollstaendig.

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Migration 0049 — theme_segments erweitern | Completed | 7ea03c6 |
| 2 | Go-Model und Repository — neue Segment-CRUD-Methoden | Completed | e61e2b2 |
| 3 | Handler ersetzen und Routen neu registrieren | Completed | c410fb4 |

## What Was Built

### Migration 0049
- `theme_segments` erhaelt 7 neue Spalten: `fansub_group_id` (FK auf fansub_groups), `version` (varchar, default 'v1'), `start_episode` (integer), `end_episode` (integer), `start_time` (interval), `end_time` (interval), `source_jellyfin_item_id` (text)
- Alte FK-Spalten `start_episode_id` und `end_episode_id` (FK auf episodes) werden gedropt
- CHECK-Constraints `chk_episode_range` und `chk_time_range` sichern Bereichsgueltigkeit
- Zwei Indizes fuer Playback-Query: `idx_theme_segment_group` und `idx_theme_segment_ep_range`
- Down-Migration restoriert die alten FK-Spalten und entfernt neue Spalten

### Model
- `AdminAnimeThemeSegment` und `AdminAnimeThemeSegmentCreateInput` durch `AdminThemeSegment`, `AdminThemeSegmentCreateInput`, `AdminThemeSegmentPatchInput` ersetzt

### Repository
- `ListAdminAnimeThemeSegments`, `CreateAdminAnimeThemeSegment`, `DeleteAdminAnimeThemeSegment` entfernt
- `ListAnimeSegments(ctx, animeID, groupID, version)` — dynamisch gefiltert, JOINt themes+theme_types, scannt interval als ::text
- `CreateAnimeSegment(ctx, animeID, input)` — prueft Theme-Anime-Zugehoerigkeit, inserted mit ::interval-Cast, laedt vollstaendigen Datensatz nach
- `UpdateAnimeSegment(ctx, segmentID, input)` — dynamischer SET-Builder, 23514=ErrConflict fuer CHECK-Constraints
- `DeleteAnimeSegment(ctx, segmentID)` — einfacher DELETE mit RowsAffected-Pruefung

### Handler + Routen
- `admin_content_anime_theme_segments.go` komplett neu: 4 Handler (List, Create, Update, Delete)
- `adminThemeRepository`-Interface aktualisiert: alte 3 Methoden durch neue 4 ersetzt
- `admin_routes.go`: alte 3 themeId/segments-Routen entfernt, 4 neue /admin/anime/:id/segments Routen eingetragen

## New API Surface

| Method | URL | Status |
|--------|-----|--------|
| GET | /api/v1/admin/anime/:id/segments?group_id=X&version=v1 | 200 mit Array |
| POST | /api/v1/admin/anime/:id/segments | 201 mit Objekt |
| PATCH | /api/v1/admin/anime/:id/segments/:segmentId | 204 |
| DELETE | /api/v1/admin/anime/:id/segments/:segmentId | 204 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] adminThemeRepository-Interface muss aktualisiert werden**
- **Found during:** Task 3 — go build ./... schlug fehl
- **Issue:** `admin_content_handler.go` definiert das `adminThemeRepository`-Interface mit den alten Methoden; der Plan erwaehnte diese Datei nicht
- **Fix:** Interface-Methoden `ListAdminAnimeThemeSegments`, `CreateAdminAnimeThemeSegment`, `DeleteAdminAnimeThemeSegment` durch `ListAnimeSegments`, `CreateAnimeSegment`, `UpdateAnimeSegment`, `DeleteAnimeSegment` ersetzt
- **Files modified:** `backend/internal/handlers/admin_content_handler.go`
- **Commit:** c410fb4

## Known Stubs

None — alle Endpunkte greifen direkt auf die Datenbank zu, keine Mocks oder Platzhalter.

## Self-Check: PASSED

- database/migrations/0049_extend_theme_segments.up.sql: FOUND
- database/migrations/0049_extend_theme_segments.down.sql: FOUND
- backend/internal/models/admin_anime_themes.go (AdminThemeSegment): FOUND
- backend/internal/repository/admin_content_anime_themes.go (ListAnimeSegments): FOUND
- backend/internal/handlers/admin_content_anime_theme_segments.go (ListAnimeSegments handler): FOUND
- backend/cmd/server/admin_routes.go (4 neue Segment-Routen): FOUND
- Commits 7ea03c6, e61e2b2, c410fb4: FOUND
- go build ./...: PASSED
- Keine alten ListAdminAnimeThemeSegments-Referenzen: BESTÄTIGT
