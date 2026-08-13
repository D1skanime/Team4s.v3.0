---
phase: 28-segment-playback-sources-from-jellyfin-runtime
plan: "01"
subsystem: backend-segment-playback
tags: [segment, playback, jellyfin, release-variant, validation, repository]
dependency_graph:
  requires: []
  provides:
    - loadThemeSegmentPlaybackSnapshotTx resolves release variant, Jellyfin stream, and duration_seconds
    - syncThemeSegmentPlaybackSourceTx uses explicit episode_version-first precedence
    - GetSegmentReleaseDuration repository method for handler-layer duration lookups
    - validateSegmentTimes shared seam for runtime-aware segment saves
  affects:
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/handlers/admin_content_anime_theme_segments.go
    - backend/internal/handlers/admin_content_handler.go
tech_stack:
  added: []
  patterns:
    - CTE-based snapshot resolution (WITH resolved_variant AS ...)
    - Explicit playback precedence switch (uploaded_asset > episode_version > jellyfin_theme > fallback)
    - Shared handler validation seam (validateSegmentTimes + parseClockToSeconds)
key_files:
  created:
    - backend/internal/repository/segment_playback_resolution_test.go
    - backend/internal/handlers/segment_validation_test.go
  modified:
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/handlers/admin_content_anime_theme_segments.go
    - backend/internal/handlers/admin_content_handler.go
decisions:
  - loadThemeSegmentPlaybackSnapshotTx uses a CTE (WITH resolved_variant AS ...) to cleanly separate the variant lookup from the main segment row scan
  - Variant resolution prefers Jellyfin-backed streams via ORDER BY CASE WHEN ss.external_id IS NOT NULL THEN 0 ELSE 1 END, rv.id ASC with LIMIT 1
  - syncThemeSegmentPlaybackSourceTx uses a switch-case block with an explicit comments-documented precedence table for clarity
  - UpdateAnimeSegment now returns 200 + hydrated segment DTO instead of 204 so frontend gets updated playback fields immediately
  - GetSegmentReleaseDuration is nullable-safe and non-fatal in the handler; missing runtime simply skips upper-bound validation
metrics:
  duration: "8 min"
  completed_date: "2026-04-28"
  tasks_completed: 3
  files_modified: 5
  files_created: 2
---

# Phase 28 Plan 01: Backend Playback Resolution Contract Summary

**One-liner:** Real release-variant snapshot joins, episode-version-first playback precedence, and duration-aware backend validation for theme segment saves.

## What Was Built

### Task 1: Release Variant and Jellyfin Runtime in the Playback Snapshot

`loadThemeSegmentPlaybackSnapshotTx` in `admin_content_anime_themes.go` now joins:
- `release_version_groups` (via `fansub_group_id`)
- `release_versions` (version match with COALESCE fallback to 'v1')
- `fansub_releases` + `episodes` (anime_id anchor)
- `release_variants` (gets `id` and `duration_seconds`)
- `release_streams` + `stream_sources` (gets Jellyfin `external_id`)

The former `NULL::BIGINT AS release_variant_id` and `NULL::INTEGER AS duration_seconds` hardcodes are gone. The CTE uses `ORDER BY (Jellyfin stream present) DESC, rv.id ASC LIMIT 1` for deterministic results.

A new `GetSegmentReleaseDuration(animeID, fansubGroupID, version)` method was added for handler-layer lookups before segment create/update.

### Task 2: Episode-Version-First Playback Precedence

`syncThemeSegmentPlaybackSourceTx` now implements an explicit precedence table:

1. `release_asset` source type + concrete `source_ref` + resolved media asset → `uploaded_asset`
2. (fallback within case 1) resolved release variant → `episode_version`
3. Resolved release variant (default for all other source types) → `episode_version`
4. Explicit `jellyfin_theme` source type + valid item ID → `jellyfin_theme`
5. Resolved media asset via source_ref (no variant) → `uploaded_asset`
6. None → delete playback row

The key product fix: segments without an explicit uploaded-file source now default to `episode_version` when the current release variant is resolvable from the segment's `fansub_group_id + version + anime` context.

### Task 3: Runtime-Aware Handler Validation

`admin_content_anime_theme_segments.go` received:

- `validateSegmentTimes(startTime, endTime, durationSeconds)` — shared seam
  - Rejects `start_time >= end_time` unconditionally
  - Rejects `end_time > duration_seconds` when runtime is known
  - Returns empty string (valid) when runtime is null
- `parseClockToSeconds(raw)` — HH:MM:SS/MM:SS to integer seconds parser

Both `CreateAnimeSegment` and `UpdateAnimeSegment` call `validateSegmentTimes` before persisting. `UpdateAnimeSegment` now returns `200 + hydrated segment DTO` instead of `204` so the frontend immediately receives updated `playback_*` fields.

## Commits

- `ff95e3e2`: feat(28-01): resolve release variant and Jellyfin runtime in playback snapshot
- `acba1739`: feat(28-01): add runtime-aware segment validation and hydrated update response

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Minor scope note

Tasks 1 and 2 share the same source file (`admin_content_anime_themes.go`) and were committed together. The plan listed them as separate tasks, but since the snapshot query and sync function are in the same file and the changes are logically coupled (snapshot feeds the sync), a single atomic commit was more coherent.

## Known Stubs

None — all implemented paths are fully wired. The `PlaybackDuration` field continues to be null for segments without a matched release variant (by design — nullable runtime is expected and handled).

## Self-Check: PASSED

- FOUND: backend/internal/repository/admin_content_anime_themes.go (modified)
- FOUND: backend/internal/repository/segment_playback_resolution_test.go (created)
- FOUND: backend/internal/handlers/admin_content_anime_theme_segments.go (modified)
- FOUND: backend/internal/handlers/admin_content_handler.go (modified)
- FOUND: backend/internal/handlers/segment_validation_test.go (created)
- FOUND: commit ff95e3e2 (Task 1+2 repository changes)
- FOUND: commit acba1739 (Task 3 handler validation)
- FOUND: 28-01-SUMMARY.md
