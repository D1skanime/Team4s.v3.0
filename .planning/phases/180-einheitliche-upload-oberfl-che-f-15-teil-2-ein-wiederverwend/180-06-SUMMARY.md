---
phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
plan: 06
subsystem: ui
tags: [react, hooks, typescript, vitest, admin-fansubs, modularization]

# Dependency graph
requires: []
provides:
  - "useGroupMediaReviewFilters hook: category/status/visibility/sort/search filter state, pagination (visibleLimit), and bulk-review selection (selectedMediaIds/bulkSavingStatus/bulkError) for GroupMediaReviewSection"
  - "GroupMediaReviewSection.tsx shrunk from 632 to 517 lines via a second, independent extraction axis (filtering, not upload)"
affects: [180-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Second extraction axis per oversized component: filter/sort/search/pagination/selection state factored into its own dedicated hook file, independent of and in parallel with an upload-state extraction axis (180-07), so neither extraction alone has to hit the 450-line budget"

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewFilters.ts
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewFilters.test.ts
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx

key-decisions:
  - "isFilterOpen stays parent-owned UI state (not part of the extracted filter model, per the plan's interfaces block); the parent keeps a thin resetFilters() wrapper that calls the hook's resetFilterValues() then setIsFilterOpen(false), preserving the exact prior click behavior (filter panel closes on reset) without the hook needing to own panel-open state."
  - "LOAD_MORE_MEDIA_COUNT is exported from the hook file (not kept in the parent) so the parent's existing onLoadMore={() => setVisibleLimit((current) => current + LOAD_MORE_MEDIA_COUNT)} call site works unchanged with a single import."

requirements-completed: [D-06]

# Metrics
duration: ~15min
completed: 2026-10-11
---

# Phase 180 Plan 06: Extract useGroupMediaReviewFilters Summary

**New `useGroupMediaReviewFilters` hook pulls filter/sort/search/pagination/selection state out of `GroupMediaReviewSection.tsx`, shrinking it from 632 to 517 lines with zero behavior change.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-11T19:28:00Z
- **Completed:** 2026-10-11T19:34:17Z
- **Tasks:** 1 (TDD: test -> feat)
- **Files modified:** 3 (1 created hook, 1 created test, 1 modified component)

## Accomplishments
- Extracted `useGroupMediaReviewFilters(mediaItems)` into its own file: owns `categoryFilter`/`statusFilter`/`visibilityFilter`/`sortMode`/`searchTerm`/`visibleLimit` state, the derived `filteredMediaItems`/`visibleMediaItems`/`filteredMediaIdSet`/`remainingMediaCount`/`activeFilterCount`/`isCanonicalReorderView` memos, bulk-review selection state (`selectedMediaIds`/`bulkSavingStatus`/`bulkError`/`allFilteredSelected`), and the `resetFilters`/`toggleMediaSelection`/`clearSelection`/`toggleAllFilteredSelection` functions — moved verbatim with identical comparator/matcher logic.
- Moved the two effects verbatim: reset `visibleLimit` to 40 on any filter-affecting state change, and prune `selectedMediaIds` to the current `filteredMediaIdSet` whenever it changes (the T-180-09 threat mitigation).
- Moved `getMediaDisplayTitle`/`formatDate` helpers (only used by the search-match logic) and the `INITIAL_VISIBLE_MEDIA_COUNT`/`LOAD_MORE_MEDIA_COUNT` constants into the new hook file.
- `GroupMediaReviewSection.tsx` now calls the hook once and destructures its result; the component's own `resetFilters()` is now a 2-line wrapper that also closes the filter panel.
- Net result: `GroupMediaReviewSection.tsx` 632 -> 517 lines (115 lines removed), still over the 450-line CLAUDE.md budget alone — as expected, since this plan's explicit purpose is to combine with 180-07's upload-state extraction to cross the threshold together.

## Task Commits

TDD task, two commits:

1. **Task 1 (RED): add failing test for useGroupMediaReviewFilters hook** - `ac99e1cc` (test)
2. **Task 1 (GREEN): extract useGroupMediaReviewFilters from GroupMediaReviewSection** - `62641f87` (feat)

_No REFACTOR commit needed — GREEN implementation already matched target shape._

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewFilters.ts` (248 lines) - the new hook: filter/sort/search/pagination/selection state + derived memos + effects + mutator functions
- `frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewFilters.test.ts` (96 lines) - `renderHook`-based behavior tests (category-filter narrowing + visibleLimit reset, toggleAllFilteredSelection scoping to filtered set, selection pruning when mediaItems shrinks)
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` - removed the extracted `useState`/`useMemo`/`useEffect` declarations and the four extracted functions; now calls `useGroupMediaReviewFilters(mediaItems)` and destructures

## Decisions Made
- `isFilterOpen` was intentionally left as parent-owned state (not listed in the plan's `<interfaces>` extraction set) — the hook's `resetFilters` only resets filter values; the parent wraps it to also close the panel, matching prior behavior exactly.
- `LOAD_MORE_MEDIA_COUNT` is exported from the hook (rather than staying duplicated in the parent) since it is a pure constant with no state dependency, keeping the parent's `onLoadMore` call site a one-line change (added import only).

## Deviations from Plan

None - plan executed exactly as written. The TDD RED/GREEN gate sequence is present in git log (`ac99e1cc` test commit before `62641f87` feat commit).

## Issues Encountered

None. `npm --prefix frontend run typecheck` passed clean, `npx eslint` on all three touched files produced no output, and the full `src/app/admin/fansubs/[id]/edit/` test directory (37 files / 265 tests, including the unmodified black-box `GroupMediaReviewSection.test.tsx`) passed with no new failures.

## TDD Gate Compliance

- RED gate: `ac99e1cc test(180-06): add failing test for useGroupMediaReviewFilters hook` — confirmed failing (`Failed to resolve import "./useGroupMediaReviewFilters"`) before commit.
- GREEN gate: `62641f87 feat(180-06): extract useGroupMediaReviewFilters from GroupMediaReviewSection` — confirmed all 3 hook tests + 24 component tests passing after commit.
- No REFACTOR commit was needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 180-07 can proceed with its upload-state extraction axis against the now-517-line `GroupMediaReviewSection.tsx`. Combined with this plan's 115-line reduction, 180-07 needs to remove at least 68 more lines to land the file at or under the 450-line CLAUDE.md ceiling — the plan's stated purpose ("neither plan alone having to do all the work") holds: 115 lines down, roughly 67 lines of margin still needed from 180-07's independent axis.
- No blockers. `useGroupMediaReviewFilters.ts` exports `CategoryFilter`/`ReviewStatusFilter`/`VisibilityFilter`/`SortMode`/`LOAD_MORE_MEDIA_COUNT` for reuse if 180-07 needs them, though `GroupMediaReviewFilterBar.tsx` already redeclares its own structurally-identical local copies (unchanged by this plan).

---
*Phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend*
*Completed: 2026-10-11*

## Self-Check: PASSED

All created files verified present on disk; both commit hashes (`ac99e1cc`, `62641f87`) verified present in `git log --oneline --all`.
