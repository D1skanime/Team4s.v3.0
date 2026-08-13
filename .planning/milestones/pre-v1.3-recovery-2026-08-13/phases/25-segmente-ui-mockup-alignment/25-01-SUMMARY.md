---
phase: 25-segmente-ui-mockup-alignment
plan: 01
subsystem: backend-segments-suggestions
tags: [segments, suggestions, source-contract, backend, frontend-types]
dependency_graph:
  requires: []
  provides: [segments/suggestions-route, AdminSegmentSuggestionsResponse, getAnimeSegmentSuggestions, AdminSegmentSourceType]
  affects: [frontend/src/types/admin.ts, frontend/src/lib/api.ts, backend/internal/repository/admin_content_anime_themes.go, backend/internal/handlers/admin_content_segments.go]
tech_stack:
  added: []
  patterns: [repository-method-filter, gin-handler-query-params, typescript-discriminated-union]
key_files:
  created:
    - backend/internal/handlers/admin_content_segments.go
  modified:
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
    - frontend/src/types/admin.ts
    - frontend/src/lib/api.ts
decisions:
  - Segment suggestions filter by episode range (start_episode <= N <= end_episode), NULL-safe
  - Current group/version combination excluded only when both or either parameter is non-zero/non-empty
  - source_jellyfin_item_id retained on AdminThemeSegment for backwards compatibility; new fields source_type/source_ref/source_label added as optional
  - No free Jellyfin search helper added (out of scope for Phase 25 plan 01)
metrics:
  duration: 8min
  completed: "2026-04-27T09:40:00Z"
  tasks: 3
  files: 5
---

# Phase 25 Plan 01: Suggestions-Backend und Segment-Source-Contract Summary

Segment-Vorschlaege-Endpunkt und explizites Quellenmodell fuer Release-Segmente: Repository-Methode mit Episodenbereich-Filter, Handler mit Query-Parameter-Parsing, neue Route und typsichere Frontend-Helfer ohne vorgezogenen Jellyfin-Picker.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Repository-Methode ListAnimeSegmentSuggestions | 390448b2 | admin_content_anime_themes.go, admin_content_handler.go |
| 2 | Handler GetAnimeSegmentSuggestions | 7beef612 | admin_content_segments.go (neu), admin_routes.go |
| 3 | Frontend-Typen und API-Helfer | 5804dd5d | admin.ts, api.ts |

## What Was Built

**Backend:**
- `ListAnimeSegmentSuggestions` in `AdminContentRepository`: filtert Segmente nach Episodenbereich (`start_episode <= N <= end_episode`, NULL-safe), schliesst optionale aktuelle (group_id, version)-Kombination aus
- `GetAnimeSegmentSuggestions` Handler in neuem `admin_content_segments.go`: parst `episode` (Pflicht), `exclude_group_id` und `exclude_version` (optional), gibt `{data: []}` zurueck
- Route `GET /admin/anime/:id/segments/suggestions` in `admin_routes.go` registriert

**Frontend:**
- `AdminSegmentSourceType = 'none' | 'jellyfin_theme' | 'release_asset'` exportiert
- `AdminThemeSegment` erweitert um optionale Felder `source_type`, `source_ref`, `source_label`
- `AdminSegmentSuggestionsResponse` Typ hinzugefuegt
- `getAnimeSegmentSuggestions(animeId, episode, excludeGroupId?, excludeVersion?)` API-Helfer exportiert

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - alle neuen Felder (`source_type`, `source_ref`, `source_label`) sind optionale Erweiterungen; sie werden von spaeteren Phase-25-Plaenen mit Daten befuellt. Die vorhandene `source_jellyfin_item_id` bleibt fuer bestehende Segmente weiterhin befuellt.

## Self-Check: PASSED

- `backend/internal/handlers/admin_content_segments.go` — FOUND
- `backend/internal/repository/admin_content_anime_themes.go` (ListAnimeSegmentSuggestions) — FOUND
- `backend/cmd/server/admin_routes.go` (segments/suggestions route) — FOUND
- `frontend/src/types/admin.ts` (AdminSegmentSourceType, AdminSegmentSuggestionsResponse) — FOUND
- `frontend/src/lib/api.ts` (getAnimeSegmentSuggestions) — FOUND
- Commits: 390448b2, 7beef612, 5804dd5d — FOUND
