---
phase: 26-segment-source-asset-upload-and-persistence
plan: "01"
subsystem: segment-asset-backend
tags: [migration, media-service, repository, handlers, api-helpers]
dependency_graph:
  requires: []
  provides: [segment-asset-upload-route, segment-asset-delete-route, real-source-columns, SaveSegmentAsset]
  affects: [theme_segments, media_assets, adminThemeRepository, api.ts]
tech_stack:
  added: [MediaKindSegmentAsset, SegmentAssetContext, SaveSegmentAsset, sanitizeSegmentFilename]
  patterns: [deterministic-asset-path, multipart-upload, repository-clear-and-reload]
key_files:
  created:
    - database/migrations/0051_extend_theme_segments_source.up.sql
    - database/migrations/0051_extend_theme_segments_source.down.sql
  modified:
    - backend/internal/models/media.go
    - backend/internal/services/media_service.go
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/repository/media_repository.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_content_anime_theme_segments.go
    - backend/cmd/server/admin_routes.go
    - frontend/src/lib/api.ts
decisions:
  - Migration 0051 adds source_type/source_ref/source_label as real columns; source_jellyfin_item_id retained for backwards compatibility
  - SaveSegmentAsset builds deterministic path from AnimeID/GroupID/Version/SegmentType; sanitizes filename to [a-z0-9._-], max 80 chars
  - Only mp4/webm/mkv allowed for segment assets; 150MB limit (stricter than 500MB for theme videos)
  - Repository reads/writes real source columns directly; legacy encoding still maintained for source_jellyfin_item_id column
  - Upload handler cleans old asset before saving new one to prevent disk leaks
  - mediaTypeNameForKind returns "video" for MediaKindSegmentAsset (reuses existing video media_type row)
metrics:
  duration: "~7 min"
  completed: "2026-04-27"
  tasks: 5
  files: 10
---

# Phase 26 Plan 01: Segment Source Asset Upload and Persistence — Summary

Backend- und API-Grundlage fuer echte Segment-Asset-Speicherung: Migration 0051 fuer source_type/source_ref/source_label-Spalten, deterministischer SaveSegmentAsset-Pfad, Repository auf echte Spalten umgestellt, Upload/Delete-Handler mit eigenen Routen, typsichere Frontend-Helfer.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration 0051 fuer source-Spalten | 81d23582 | 2 migrations |
| 2 | MediaService: SegmentAssetContext + SaveSegmentAsset | 10a425d1 | models/media.go, services/media_service.go |
| 3 | Repository auf echte source-Spalten + neue Methoden | ea12c5d5 | admin_content_anime_themes.go, media_repository.go, admin_content_handler.go |
| 4 | Segment-Asset-Handler + Routen | 03956433 | admin_content_anime_theme_segments.go, admin_routes.go |
| 5 | Frontend-API-Helfer uploadSegmentAsset/deleteSegmentAsset | 49b3f1d4 | frontend/src/lib/api.ts |

## What Was Built

### Migration 0051
Fuegt drei echte Spalten zu `theme_segments` hinzu:
- `source_type VARCHAR(20) CHECK (... IN ('none', 'jellyfin_theme', 'release_asset'))`
- `source_ref TEXT` — relativer Pfad zum Asset
- `source_label TEXT` — menschenlesbares Label

`source_jellyfin_item_id` bleibt als Rueckwaertskompatibilitaet bestehen.

### SaveSegmentAsset (MediaService)
Deterministischer Pfad: `segments/anime_{id}/group_{id}/{version}/{segmentType}/{sanitizedFilename}`

Dateiname-Sanitierung: lowercase, Leerzeichen → `-`, nur `[a-z0-9._-]`, max 80 Zeichen. Erlaubte Formate: `mp4`, `webm`, `mkv`. Limit: 150 MB.

### Repository-Aenderungen
- `ListAnimeSegments`, `ListAnimeSegmentSuggestions`: lesen jetzt `source_type/source_ref/source_label` direkt aus DB
- `CreateAnimeSegment`: schreibt alle drei Spalten direkt
- `UpdateAnimeSegment`: patcht alle drei Spalten direkt (zusaetzlich zur Legacy-Kodierung in `source_jellyfin_item_id`)
- Neu: `GetAnimeSegmentByID` — laedt Segment mit Anime-Ownership-Check
- Neu: `ClearSegmentAsset` — setzt source_type/ref/label = NULL, gibt vorherigen ref zurueck
- `mediaTypeNameForKind`/`mediaFormatForKind` unterstuetzen jetzt `MediaKindSegmentAsset` → `"video"`

### Handler-Routen
- `POST /api/v1/admin/anime/:id/segments/:segmentId/asset` — Upload-Flow mit Cleanup bestehender Assets
- `DELETE /api/v1/admin/anime/:id/segments/:segmentId/asset` — Delete-Flow mit Datei- und DB-Cleanup

### Frontend-API-Helfer
- `uploadSegmentAsset(animeId, segmentId, file, authToken?)` — multipart/form-data
- `deleteSegmentAsset(animeId, segmentId, authToken?)` — DELETE, keine Query-Parameter

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All source-field paths wire to real DB columns and a real storage path. Frontend helpers call real endpoints.

## Self-Check: PASSED

- database/migrations/0051_extend_theme_segments_source.up.sql: EXISTS
- database/migrations/0051_extend_theme_segments_source.down.sql: EXISTS
- `go build ./...`: PASSED (no output)
- POST/DELETE routes for `segments/:segmentId/asset` in admin_routes.go: PRESENT
- `uploadSegmentAsset` and `deleteSegmentAsset` exported from api.ts: PRESENT
- Repository uses real `source_type/source_ref/source_label` columns: CONFIRMED
