---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 10
subsystem: ui
tags: [react, nextjs, typescript, admin-anime, hooks, refactoring]

requires:
  - phase: 174-08
    provides: Welle-2 closing export-parity audit confirming api.ts barrel split had no unintended export drift
provides:
  - "useAdminAnimeCreateController.ts reduced to a 9-line facade re-exporting from internal/useAdminAnimeCreateControllerImpl"
  - "Jellyfin-intake async handlers (handleJellyfinSearch, handleJellyfinCandidateReview, handleJellyfinCandidateAdopt) extracted into an independently-readable useJellyfinIntakeActions sub-hook"
  - "AniSearch-intake async handlers (loadAniSearchDraftByID, handleAniSearchDraftLoad, handleAniSearchCandidateSearch, handleAniSearchCandidateSelect) extracted into useAniSearchIntakeActions, including its one pure helper (resolveAniSearchCandidateSearchFeedback)"
  - "UseAdminAnimeCreateControllerActions shared type contract scaffolded in internal/admin-anime-create/types.ts"
affects: [174-11, admin-anime-create-page]

tech-stack:
  added: []
  patterns:
    - "facade+impl+composed-sub-hooks shape (first applied to useEpisodeManager) now also applied to useAdminAnimeCreateController"
    - "pure helpers migrate with their only caller into the sub-hook file, re-exported one level up (impl -> sub-hook) to preserve the facade's existing public import path"

key-files:
  created:
    - frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts
    - frontend/src/app/admin/anime/create/internal/admin-anime-create/types.ts
    - frontend/src/app/admin/anime/create/internal/admin-anime-create/useJellyfinIntakeActions.ts
    - frontend/src/app/admin/anime/create/internal/admin-anime-create/useAniSearchIntakeActions.ts
  modified:
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts

key-decisions:
  - "resolveAniSearchCandidateSearchFeedback (a pure helper with its only caller inside the AniSearch cluster) moved into useAniSearchIntakeActions.ts rather than staying in the impl file, to avoid a circular impl<->sub-hook import; the impl file re-exports it by name so the facade's existing re-export path (and the test's import) stay unchanged"
  - "Kept every ~40 useState/useRef declaration in the impl file per D-14/D-21 — both sub-hooks receive state values and setters as parameters, never own state themselves"
  - "handleJellyfinCandidateSelect, handleRemoveJellyfinAsset, handleJellyfinAdopt, handleDiscardJellyfinPreview stayed in the impl file — they are outside this plan's two named clusters (per the plan's exact scope) and are left for a future plan if warranted"

patterns-established:
  - "D-13 split continuation: 174-11 will extract the remaining asset-staging and submit clusters from the same impl file using this plan's exact shape"

requirements-completed: [D-13, D-02, D-14, D-19, D-21, D-22]

duration: 13min
completed: 2026-10-05
---

# Phase 174 Plan 10: Begin useAdminAnimeCreateController D-13 Split (Jellyfin + AniSearch Intake) Summary

**Split the 1,505-line useAdminAnimeCreateController into a facade + impl + two composed intake sub-hooks (Jellyfin and AniSearch), replicating the production-proven useEpisodeManager shape with zero behavior change.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-10-05T10:54:00Z
- **Completed:** 2026-10-05T11:06:48Z
- **Tasks:** 3 completed
- **Files modified:** 5 (1 facade rewritten, 1 impl file created from moved content, 1 shared types file, 2 new sub-hook files)

## Accomplishments
- `useAdminAnimeCreateController.ts` is now a 9-line facade re-exporting `useAdminAnimeCreateController`, `UseAdminAnimeCreateControllerOptions`, `extractAniSearchCreateConflict`, `resolveCreateCoverState`, and `resolveAniSearchCandidateSearchFeedback` — the exact same names importable from the exact same path as before
- Jellyfin-intake responsibility (search, preview-for-review, preview-then-adopt) is now independently defined in `useJellyfinIntakeActions`, matching the `useEpisodeManagerBulkMutations` parameter-passing shape
- AniSearch-intake responsibility (load-by-ID, draft-load, candidate-search, candidate-select) is now independently defined in `useAniSearchIntakeActions`
- All 25 tests in the existing `useAdminAnimeCreateController.test.ts` suite pass unmodified against the refactored structure

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the facade, impl skeleton, and shared types contract** - `22a81e2b` (refactor)
2. **Task 2: Extract the Jellyfin-intake sub-hook** - `f8591af1` (refactor)
3. **Task 3: Extract the AniSearch-intake sub-hook, finalize composition, run full gate** - `86626c97` (refactor)

_No separate plan-metadata commit required beyond the three task commits above; STATE.md/ROADMAP.md updates are captured in the final docs commit below._

## Files Created/Modified
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` - 9-line facade; re-exports the hook plus every previously-exported helper/type from the impl file
- `frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts` - holds all ~40 state hooks, memos, and the handlers not yet extracted (asset-staging/submit clusters remain for 174-11); composes `useJellyfinIntakeActions` and `useAniSearchIntakeActions`
- `frontend/src/app/admin/anime/create/internal/admin-anime-create/types.ts` - `UseAdminAnimeCreateControllerActions` contract listing the 7 extracted action signatures so far
- `frontend/src/app/admin/anime/create/internal/admin-anime-create/useJellyfinIntakeActions.ts` - `handleJellyfinSearch`, `handleJellyfinCandidateReview`, `handleJellyfinCandidateAdopt`
- `frontend/src/app/admin/anime/create/internal/admin-anime-create/useAniSearchIntakeActions.ts` - `loadAniSearchDraftByID`, `handleAniSearchDraftLoad`, `handleAniSearchCandidateSearch`, `handleAniSearchCandidateSelect`, plus the re-exported `resolveAniSearchCandidateSearchFeedback` helper

## Decisions Made
- `resolveAniSearchCandidateSearchFeedback` moved into `useAniSearchIntakeActions.ts` alongside its only caller instead of staying in the impl file, because the impl file importing it back from a sub-hook (to keep it there) would need the sub-hook to import the impl — a circular dependency. The impl file instead re-exports the name from the sub-hook (`export { resolveAniSearchCandidateSearchFeedback } from "./admin-anime-create/useAniSearchIntakeActions"`), which is a one-directional dependency and keeps the facade's re-export list (and the test's import) completely unchanged.
- State ownership stayed 100% in the impl file (D-14/D-21): both sub-hooks are pure parameter-receiving functions with no `useState`/`useRef` of their own, matching `useEpisodeManagerBulkMutations`.
- Stuck to the plan's exact two named clusters — `handleJellyfinCandidateSelect`, `handleRemoveJellyfinAsset`, `handleJellyfinAdopt`, and `handleDiscardJellyfinPreview` were deliberately left in the impl file since they weren't named in this plan's scope (D-02: no extraction without an actual justified, separable responsibility named in the plan).

## Deviations from Plan

None - plan executed exactly as written. Import paths were adjusted one level deeper when moving content into `internal/` (e.g. `./createPageHelpers` → `../createPageHelpers`), which is a mechanical consequence of the plan's own directory-move instruction, not a deviation from it.

## Issues Encountered
- `npx tsc --noEmit` across the whole frontend reports pre-existing errors unrelated to any file this plan touches (stale `.next/dev` generated `PageProps` type artifacts, and a `ReleaseDetailHero.test.tsx` fixture gap introduced by an older, unrelated commit). Confirmed via `grep` that none of the `tsc` output references `admin-anime-create`, `useAdminAnimeCreateController`, or any file in this plan's `files_modified` list. Logged to `deferred-items.md` per the scope-boundary rule rather than fixed.
- `npx eslint .` across the whole frontend reports 1 pre-existing warning in the moved impl file (`resetStagedAssets` defined but never used) that predates this plan's changes — confirmed by checking the Task 1 commit's content, which already had zero callers for that function before any extraction began.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 174-11 can proceed directly: the impl file (`internal/useAdminAnimeCreateControllerImpl.ts`) still holds the asset-staging and submit-cluster handlers (`handleAssetCandidateSearch`, `handleLoadMoreAssets`, `handleAssetCandidateAdoption`, `submitCreate`, `handleCreateSubmit`, `handleCoverUpload`, and the asset-input-change handlers), ready for the same facade+impl+sub-hook extraction pattern.
- The impl file is still ~1,320 lines (above the 450-line guardrail) — this is the expected, documented interim state per this plan's objective; 174-11 is the plan that brings it under the guardrail.
- No blockers.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

## Self-Check: PASSED

All created/modified files confirmed present on disk; all 4 commit hashes
(`22a81e2b`, `f8591af1`, `86626c97`, `4f3c83b6`) confirmed present in `git log`.
