---
phase: 38-release-version-media-gallery-ux-hover-preview-und-drag-and-drop-reorder
plan: "01"
subsystem: frontend
tags:
  - drag-and-drop
  - gallery
  - reorder
  - ux
dependency_graph:
  requires:
    - "36-01 (ReleaseVersionMediaGallery, ReleaseVersionMediaDetailPanel, useReleaseVersionMedia)"
    - "35-* (backend reorder endpoint POST /media/reorder)"
  provides:
    - "category-scoped drag-and-drop reorder in gallery"
    - "live in-memory re-sort after sort_order changes"
    - "correct ReleaseVersionMediaReorderRequest type matching backend contract"
  affects:
    - "frontend/src/types/releaseVersionMedia.ts"
    - "frontend/src/lib/api.ts (reorderReleaseVersionMedia now uses correct type)"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/*"
tech_stack:
  added: []
  patterns:
    - "Native HTML5 drag-and-drop (no new library) for category-scoped card reorder"
    - "TDD: RED tests before GREEN implementation per plan spec"
key_files:
  created: []
  modified:
    - frontend/src/types/releaseVersionMedia.ts
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.module.css
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
decisions:
  - "Native HTML5 drag-and-drop over adding a new library: plan spec said project-owned seam first, no concrete blocker found"
  - "Sort-order form removed from detail panel; reorder is now gallery-exclusive via drag-and-drop"
  - "Re-sort in patchItem triggered only when sort_order field is in the patch, not on every update"
  - "Reorder payload uses gap-of-10 sort_order values (matching existing backend convention)"
metrics:
  duration: "~25 min"
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_modified: 10
---

# Phase 38 Plan 01: Reorder Foundation — Sort Field Removal and Category-Scoped Drag-and-Drop Summary

Native drag-and-drop gallery reorder replaces the legacy sort_order number input, live in-memory re-sort fires on patchItem, and the frontend reorder type now matches the backend `items:[{id, sort_order}]` contract.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Fix reorder contract type + live resort in patchItem + expose reorderItems | 2276c56f |
| 2 | Remove sort-order form, add category-scoped drag-and-drop to gallery | 476eb997 |

## What Was Built

### Task 1: Reorder Contract Fix + Live Re-Sort

- **`ReleaseVersionMediaReorderRequest`**: Replaced stale `ordered_ids: number[]` with `items: ReleaseVersionMediaReorderItem[]` where each item has `{ id: number, sort_order: number }` — matches the backend `rvmReorderItem` struct exactly.
- **`useReleaseVersionMedia.ts`**: Added `reorderItems` function to the hook. Fixed `patchItem` to re-sort the in-memory `items` array immediately when `sort_order` is part of the patch (no full reload needed).
- **Interface extension**: `UseReleaseVersionMediaResult` now includes `reorderItems: (versionId: number, body: ReleaseVersionMediaReorderRequest) => Promise<void>`.

### Task 2: Sort-Order Form Removal + Drag-and-Drop

- **`ReleaseVersionMediaDetailPanel.tsx`**: Removed the `Sortierung` number input and `Sortierung speichern` button entirely. State variable `sortOrder` and `saveSortOrder` function removed.
- **`ReleaseVersionMediaGallery.tsx`**: All cards now have `draggable={true}`. Native HTML5 dragStart/dragOver/drop/dragEnd handlers manage category-scoped reorder. Cross-category drops are silently ignored. On drop, new sort_order values are computed with a gap of 10 and `onReorder` is called.
- **`ReleaseVersionMediaGallery.module.css`**: Added `cardDragging` (opacity 0.5) and `cardDropTarget` (green border + background) classes for visual drag feedback.
- **`ReleaseVersionMediaSection.tsx`**: Passes `media.reorderItems` as `onReorder` prop to the gallery.

## Deviations from Plan

None — plan executed exactly as written. Native drag-and-drop was chosen without needing a DnD library as the plan's decision D-03 preferred.

## Test Coverage

- 394 tests pass (up from 390 before this plan)
- New test suites added:
  - `ReleaseVersionMediaReorderRequest contract` — shape verification + ts-expect-error for old `ordered_ids`
  - `useReleaseVersionMedia live-resort behavior` — patchItem re-sorts, reorderItems seam exposed, payload shape
  - `Task 2: DragAndDrop reorder — legacy sort field removed` — no sort form, draggable cards, local drag-drop, cross-category blocked

## Self-Check: PASSED

Files confirmed present:
- frontend/src/types/releaseVersionMedia.ts — FOUND (ReleaseVersionMediaReorderItem + updated ReleaseVersionMediaReorderRequest)
- frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts — FOUND (reorderItems in interface + return)
- frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx — FOUND (draggable cards + drop handlers)
- frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx — FOUND (sort-order form removed)

Commits confirmed:
- 2276c56f feat(38-01): fix reorder contract type and add live resort to patchItem
- 476eb997 feat(38-01): remove sort-order form, add category-scoped drag-and-drop reorder
