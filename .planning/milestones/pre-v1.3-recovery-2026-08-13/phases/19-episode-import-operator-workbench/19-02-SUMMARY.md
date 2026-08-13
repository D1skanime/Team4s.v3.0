---
phase: 19-episode-import-operator-workbench
plan: 02
subsystem: frontend
tags: [typescript, react, episode-import, ux, admin, batch-controls]

requires:
  - phase: 19-episode-import-operator-workbench
    plan: 01
    provides: file_name and display_path on EpisodeImportMappingRow; parallel release apply semantics

provides:
  - Operator workbench layout with episode-grouped mapping rows
  - Context strip showing AniSearch ID, Jellyfin series ID, folder path at a glance
  - Summary pills replacing large metric cards for compact density
  - Bulk-skip and bulk-confirm actions for all suggested rows
  - Per-episode quick-confirm and quick-skip actions in grouped workbench
  - MappingRow shows file_name + display_path instead of opaque media_item_id
  - markAllSuggestedSkipped / markAllSuggestedConfirmed helpers
  - confirmEpisodeMappingRows / skipEpisodeMappingRows helpers
  - 9 locked helper tests (4 original + 5 new batch semantics)

affects:
  - 19-03-PLAN (remaining wave 3 improvements can build on this workbench baseline)

tech-stack:
  added: []
  patterns:
    - "Episode groups cluster mapping rows by suggested episode number for spatial clarity"
    - "Bulk resolution actions: global (all-suggested) and per-episode (single episode group)"
    - "Context strip surfaces import-critical metadata without requiring the sources panel to be open"
    - "Status-based left border accent on mapping rows (yellow=suggested, green=confirmed, red=conflict, grey=skipped)"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/page.module.css
    - frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts

key-decisions:
  - "Episode groups are keyed by the first suggested_episode_numbers entry, giving spatial proximity to rows about the same canonical episode"
  - "Global bulk actions (all-suggested) sit in the workbench panel header; per-episode actions are inline on each group header"
  - "The context strip is always visible after context load, keeping AniSearch ID / Jellyfin series / folder path stable without scrolling"
  - "Source config panel is collapsed to a 2-field compact input (AniSearch ID + Season Offset) now that context is surfaced separately"
  - "Parallel releases showing as conflict when bulk-confirmed is accepted: operator sees conflict badge and resolves per-episode"

requirements-completed:
  - P19-SC3

duration: ~5min
completed: 2026-04-20
---

# Phase 19 Plan 02: Operator-readable Workbench UI and Practical Bulk Controls Summary

**Mapping rows now show readable file evidence grouped by episode, and operators can resolve entire episodes or the full list with one or two clicks.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-20T11:07:36Z
- **Completed:** 2026-04-20T11:12:02Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

### Task 1: Refactor the page into a readable mapping workbench

- Added **context strip** that keeps AniSearch ID, Jellyfin series, folder path, and source visible in a compact bar below the hero — no more hunting through the sources panel for diagnostic info
- Replaced six oversized metric cards with **compact summary pills** that fit in a single horizontal strip
- Collapsed source config to two fields (AniSearch ID + Season Offset) now that context is shown inline
- Replaced the flat mapping list with **episode groups**: rows for the same canonical episode are clustered together with the episode number and title visible as a group header
- Mapping rows now display `file_name` (bold) and `display_path` (monospace) from the Phase 19-01 contract instead of raw `media_item_id`
- Added **status-based left border accent** on mapping rows (yellow for suggested, green for confirmed, red for conflict, grey for skipped) for at-a-glance triage
- `Überspringen` button in active rows changes to `Reaktivieren` when the row is already skipped
- Full German umlauts throughout: Zurück, Überspringen, Vorschau, Bestätigt, Übersprungen, etc.
- Apply button and workbench bulk actions moved into the mapping panel header, keeping the operator flow top-to-bottom
- Apply result section links directly to the episode overview

### Task 2: Add practical grouped or batch resolution controls

- **`markAllSuggestedSkipped`**: skips every row still in `suggested` state in one action — clears the queue for files that should all be skipped
- **`markAllSuggestedConfirmed`**: confirms every `suggested` row using its existing target episode numbers — accepts all preview suggestions at once
- **`confirmEpisodeMappingRows`**: confirms only rows whose `suggested_episode_numbers` includes a given episode — used by the per-episode "Alle bestätigen" button in each group header
- **`skipEpisodeMappingRows`**: skips only rows for a given episode — used by the per-episode "Alle überspringen" button
- Hook exposes `skipAllSuggested`, `confirmAllSuggested`, `confirmEpisodeRows`, `skipEpisodeRows`, `hasSuggestedRows`, `episodeGroups`, `unmappedMappingRows`
- 5 new tests lock batch semantics; 9 tests total, all passing

## Task Commits

1. **Task 1: Refactor import page into operator workbench layout** - `73cdc27` (feat)
2. **Task 2: Add bulk and per-episode resolution controls with locked tests** - `a758664` (feat)

## Files Created/Modified

- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` — complete workbench layout: context strip, summary pills, episode groups, MappingRow component, EpisodeGroup component, batch action buttons
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` — new classes for context strip, summary pills, episode groups, mapping row accents, micro buttons
- `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` — added episodeGroups, unmappedMappingRows, hasSuggestedRows; exposed skipAllSuggested, confirmAllSuggested, confirmEpisodeRows, skipEpisodeRows
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` — added markAllSuggestedSkipped, markAllSuggestedConfirmed, confirmEpisodeMappingRows, skipEpisodeMappingRows
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts` — 5 new test cases for batch/per-episode resolution; 9 total

## Decisions Made

- Episode groups are keyed by `suggested_episode_numbers[0]` — the primary suggestion is the spatial anchor; files with no suggestion go to an "Ohne Episodenzuordnung" section at the bottom
- Global bulk actions (all-suggested) live in the workbench panel header; per-episode quick-actions live inline on each group header — two levels of resolution granularity
- When bulk-confirming parallel releases for the same episode, `detectMappingConflicts` correctly sets them to `conflict`, giving the operator a clear signal to check if it is intentional versioning — this is the correct behavior per Phase 19-01 semantics
- Source panel simplified to two inputs; readonly context (Jellyfin series, folder path) moved to the always-visible context strip

## Deviations from Plan

None — plan executed exactly as written. The page rework and batch controls were implemented in two clean task commits.

## Known Stubs

None — all new fields (`file_name`, `display_path`) are populated from real backend data. Episode groups are derived from live mapping rows.

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
- FOUND: frontend/src/app/admin/anime/[id]/episodes/import/page.module.css
- FOUND: frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
- FOUND: frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
- FOUND: frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts
- FOUND: commit 73cdc27 (Task 1)
- FOUND: commit a758664 (Task 2)

---
*Phase: 19-episode-import-operator-workbench*
*Completed: 2026-04-20*
