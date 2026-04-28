---
phase: 28-segment-playback-sources-from-jellyfin-runtime
plan: 02
subsystem: frontend-segment-editor
tags:
  - segment-playback
  - release-variant
  - ux
  - frontend
dependency_graph:
  requires:
    - 28-01 (backend playback resolution contract)
  provides:
    - release-variant-aware segment API helpers
    - default-playback UI with explicit uploaded fallback
    - runtime-aware editor UX for known/null duration
  affects:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/
tech_stack:
  added: []
  patterns:
    - effectiveDuration derived from playback_duration_seconds then page-level duration_seconds
    - releaseVariantId threaded as query param through segment list/create/update
    - playback_source_kind/label shown as primary source indicator in table
key_files:
  created: []
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/types/admin.ts (no change needed — fields already present)
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
decisions:
  - releaseVariantId passed as query param (not body field) to keep create/update request payloads backward-compatible
  - updateAnimeSegment return type changed from void to { data: AdminThemeSegment } to consume hydrated DTO
  - useReleaseSegments.update() returns { data: AdminThemeSegment } | null instead of boolean
  - effectiveDuration uses playback_duration_seconds as primary authority and falls back to page-level durationSeconds
  - Timeline falls back to max playback_duration_seconds across segments when page duration null
  - Source selector labels reworded: 'none' -> Episode-Version/Jellyfin-Stream (Standard), 'release_asset' -> Hochgeladener Fallback, 'jellyfin_theme' -> Legacy
metrics:
  duration: 5min
  completed: "2026-04-28"
  tasks: 3
  files: 5
---

# Phase 28 Plan 02: Frontend Segment Playback Context Wiring — Summary

**One-liner:** Release-variant-aware segment API helpers, default episode-version playback UI copy, and playback_duration_seconds-first runtime clamping in the segment editor.

## Tasks Completed

### Task 1: Thread release-variant playback context through the existing segment API contract

- `getAnimeSegments`, `createAnimeSegment`, `updateAnimeSegment` each accept optional `releaseVariantId` and send it as `release_variant_id` query parameter
- `updateAnimeSegment` return type changed from `Promise<void>` to `Promise<{ data: AdminThemeSegment }>` to consume the hydrated DTO returned by the backend (implemented in Plan 01)
- `useReleaseSegments` accepts `releaseVariantId` option, threads it through `load`, `create`, and `update` calls; `update()` return type updated accordingly
- `SegmenteTab` accepts `releaseVariantId` prop, forwards to `useReleaseSegments`
- `EpisodeVersionEditorPage` passes `editor.contextData?.version.id` as `releaseVariantId`
- `AdminThemeSegment` already had all required playback fields (`playback_source_kind`, `playback_release_variant_id`, `playback_jellyfin_item_id`, `playback_source_label`, `playback_duration_seconds`) — no type changes needed

**Commit:** `6a062ead`

### Task 2: Reframe the editor around default episode-version playback and explicit uploaded fallback

- `SegmentEditPanel` source selector reworded: `none` maps to "Episode-Version / Jellyfin-Stream (Standard)", `release_asset` maps to "Hochgeladener Fallback (eigene Datei)", `jellyfin_theme` marked "(Legacy)"
- When editing an existing segment with `playback_source_kind`, panel shows a resolved playback status box above the source selector
- `SegmenteTab` table "Quelle" column shows `playback_source_label` or resolved kind label when `playback_source_kind` is present, falls back to `resolveSourceLabel` for backwards compatibility

**Commit:** `0868f735`

### Task 3: Runtime-aware UX for known-duration clamps and null-duration fallback

- `SegmentEditPanel` derives `effectiveDuration = editingSegment?.playback_duration_seconds ?? durationSeconds ?? null`
- End-time clamp on blur uses `effectiveDuration` instead of `durationSeconds`
- Helper text explicitly states when runtime is known (with source: Jellyfin/Release vs Version), or honestly explains no bound is available
- Backend validation errors for `start_time`/`end_time` detected from `formError` text and highlight the corresponding field with a red border and inline message
- `SegmenteTab.handleSave` uses same `effectiveDuration` logic (playback-first) for server-side clamp
- Timeline falls back to max `playback_duration_seconds` across loaded segments when page-level `durationSeconds` is null; labels this source

**Commit:** `bd7eab3b`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All wired data flows from the hydrated backend DTO fields.

## Self-Check: PASSED

- Commit `6a062ead` FOUND
- Commit `0868f735` FOUND
- Commit `bd7eab3b` FOUND
- All modified files verified present in repository
- Frontend build passes (verified during Task 2 and Task 3 execution)
