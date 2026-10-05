---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 13
subsystem: ui
tags: [react, nextjs, jsx-decomposition, refactoring, fansubs]

# Dependency graph
requires:
  - phase: 174-12
    provides: useGroupMediaReviewActions hook isolating the async data-loading/mutation logic, leaving the component's return() as the main remaining bulk
provides:
  - "GroupMediaReviewUploadPanel.tsx, GroupMediaReviewFilterBar.tsx, GroupMediaReviewGrid.tsx, GroupMediaReviewBulkActionBar.tsx, GroupMediaReviewDetailDrawer.tsx — 5 named, props-driven presentational section components"
  - "GroupMediaReviewSectionInner reduced to an orchestrator composing the 5 section components, with state/handlers still centralized per plan"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Orchestrator-delegating-to-named-sections shape (same as FansubEditClient.tsx -> CoverageMatrix/FansubOpEdSection/ContributionsReviewSection), applied to GroupMediaReviewSection"
    - "Duplicated tiny pure helpers/constants (itemToDraft, getMediaDisplayTitle, formatDate, CATEGORY_OPTIONS/REVIEW_STATUS_OPTIONS/VISIBILITY_OPTIONS) into each extracted section file that needs them, to avoid circular imports between the orchestrator and its own child components (same convention established in 174-12's hook extraction)"
    - "MutableRefObject<HTMLInputElement | null> (not RefObject) used for the file-input ref prop crossing a component boundary, matching the existing ReleaseThemeDrawerSection.tsx convention in the same directory — required because TypeScript's inline-ref assignability heuristic for useRef<T | null>() does not survive being passed through an explicit prop interface"

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewFilterBar.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewBulkActionBar.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewDetailDrawer.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx

key-decisions:
  - "Kept the small reorder-error/hint paragraphs (two one-line conditionals) in the orchestrator rather than folding them into GroupMediaReviewGrid.tsx, since they are tangential to the grid's own render decision and D-02 discourages artificial fragmentation of single-line conditionals into a component's prop surface"
  - "GroupMediaReviewGrid.tsx owns the full empty-state/grid/load-more region (not just the .map() block) so it reads as one complete 'List' unit per the must_haves framing, rather than splitting load-more into a 6th file"
  - "GroupMediaReviewDetailDrawer.tsx bundles the Drawer and the delete-confirm Modal in one file (as the plan explicitly directs) since the Modal is the direct consequence of the Drawer's danger-zone action and both share pendingDeleteItem state"

requirements-completed: [D-14, D-02, D-19, D-21, D-22]

# Metrics
duration: 17min
completed: 2026-10-05
---

# Phase 174 Plan 13: GroupMediaReviewSection JSX decomposition Summary

**Split GroupMediaReviewSection.tsx's 1,220-line monolithic return() into 5 named, props-driven presentational components (upload panel, filter bar, media grid, bulk-action bar, detail drawer+delete-confirm modal), with zero markup/behavior change proven by the unmodified 605-line test suite (23/23 passing).**

## Performance

- **Duration:** 17 min
- **Started:** 2026-10-05T11:36:00Z (approx.)
- **Completed:** 2026-10-05T11:53:35Z
- **Tasks:** 3
- **Files modified:** 1 (orchestrator), 5 created (section components)

## Accomplishments
- `GroupMediaReviewUploadPanel.tsx`: the category-select/drag-drop-zone/file-preview-grid/upload-footer Card, taking the upload state and `handleUpload`/`handleSelectedFiles`/`handleUploadDrop` as props
- `GroupMediaReviewFilterBar.tsx`: the management toolbar (summary counts, reset/select-all/filter-toggle buttons) plus the collapsible filter-field row, taking all 5 filter state pairs and the computed summary counts as props
- `GroupMediaReviewGrid.tsx`: the full media-card list region — both EmptyState branches, the `visibleMediaItems.map()` card rendering (selection, drag-reorder handle, owner-flag, compact actions), and the load-more button — as one cohesive "List" unit
- `GroupMediaReviewBulkActionBar.tsx`: the `role="region" aria-label="Bulk-Aktionen..."` bar, computing `selectedCount`/`isBulkSaving` internally from the `selectedMediaIds`/`bulkSavingStatus` props
- `GroupMediaReviewDetailDrawer.tsx`: the `editingItem`-gated detail `Drawer` (preview frame, title/alt-text/description/category/visibility/review-status fields, danger-zone trigger) and the delete-confirm `Modal`, bundled in one file since the modal is the direct consequence of the drawer's danger-zone action
- `GroupMediaReviewSectionInner`'s `return (...)` now composes the 5 extracted components inside the unchanged outer `<div className={styles.reviewSection}>` wrapper — state ownership and the `useGroupMediaReviewActions` hook call (from 174-12) stay fully in the orchestrator, exactly as the plan specified
- Removed now-dead imports, helper functions (`getCategoryLabel`, `getReviewStatusOption`, `getVisibilityLabel`, `getOverviewImageURL`, `getDetailImageURL`, `getUploaderLine`), and constants (`CATEGORY_OPTIONS`, `REVIEW_STATUS_OPTIONS`, `VISIBILITY_OPTIONS`) from the orchestrator once each was fully absorbed into its extracted component (each extracted file carries its own local copy, per the circular-import-avoidance convention from 174-12)
- Full 605-line `GroupMediaReviewSection.test.tsx` suite (23 tests) passes unmodified against the decomposed component tree
- `grep -c "use client"` confirms exactly 1 occurrence, in the orchestrator only; all 5 new files have 0

## Task Commits

1. **Task 1: Extract upload panel and filter bar** - `6fc6e716` (refactor)
2. **Task 2: Extract media review grid and bulk action bar** - `3461e8cc` (refactor)
3. **Task 3: Extract detail drawer + delete-confirm dialog, finalize orchestrator, run full gate** - `50003a59` (refactor)

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.tsx` (171 lines) - drop-zone/category/file-preview upload Card
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewFilterBar.tsx` (176 lines) - management toolbar + filter-field row
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx` (387 lines) - empty states, media-card list, load-more button
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewBulkActionBar.tsx` (66 lines) - bulk-action region
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewDetailDrawer.tsx` (338 lines) - detail Drawer + delete-confirm Modal
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` (632 lines, down from 1,220) - now the orchestrator: centralized state/memos/handlers plus a `return()` composing the 5 section components

## Decisions Made
- See `key-decisions` in frontmatter for the three scoping calls made during extraction (reorder-hint placement, Grid's full-region scope, Drawer+Modal bundling).
- Used `MutableRefObject<HTMLInputElement | null>` (matching the existing `ReleaseThemeDrawerSection.tsx` convention) rather than `RefObject<HTMLInputElement | null>` for the file-input ref prop on `GroupMediaReviewUploadPanel`, after `tsc --noEmit` flagged a `RefObject<HTMLInputElement | null>` → `LegacyRef<HTMLInputElement>` assignability error that does not occur when the same ref is bound to `<Input ref=.../>` inline in the same function scope (a known TypeScript narrowing quirk for `useRef<T | null>()` that doesn't survive being passed through an explicit prop interface boundary).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched the upload-panel file-input ref prop type from `RefObject` to `MutableRefObject`**
- **Found during:** Task 1 (regression gate)
- **Issue:** `npx tsc --noEmit` flagged `GroupMediaReviewUploadPanel.tsx`'s `<Input ref={fileInputRef} />` with `Type 'RefObject<HTMLInputElement | null>' is not assignable to type 'LegacyRef<HTMLInputElement> | undefined'` once the ref crossed the new component-prop boundary — this never errored in the original monolith because the ref was bound inline in the same scope where it was declared
- **Fix:** Changed the prop type to `MutableRefObject<HTMLInputElement | null>`, matching the identical pattern already used by `ReleaseThemeDrawerSection.tsx` (`themeUploadInputRef: MutableRefObject<HTMLInputElement | null>`) in the same directory
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.tsx`
- **Verification:** `npx tsc --noEmit` shows zero `GroupMediaReview*` findings afterward
- **Committed in:** `6fc6e716`

**2. [Rule 3 - Blocking] Removed now-dead imports, helper functions, and constants from the orchestrator after each extraction task**
- **Found during:** Tasks 1-3 (regression gate after each extraction)
- **Issue:** As each JSX region moved into its own file, the icons (`Filter`, `Ban`, `Check`, `Edit3`, `GripVertical`, `Archive`, `Save`, `Image`), UI imports (`Badge`, `EmptyState`, `Drawer`, `FormField`, `Input`, `Modal`, `Select`, `Textarea`), `resolveApiUrl`, the three option-array constants, and several helper functions (`getCategoryLabel`, `getReviewStatusOption`, `getVisibilityLabel`, `getOverviewImageURL`, `getDetailImageURL`, `getUploaderLine`) became unused in `GroupMediaReviewSection.tsx`, which `npx eslint .` flagged as `@typescript-eslint/no-unused-vars` warnings
- **Fix:** Removed each dead import/constant/function from the orchestrator once its last remaining JSX consumer moved into an extracted file; each extracted file carries its own local copy (circular-import-avoidance convention from 174-12, since the children cannot import these back from the orchestrator without creating `orchestrator -> child -> orchestrator` cycles)
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx`
- **Verification:** `npx eslint .` on all 6 files returns zero warnings; `npx tsc --noEmit` shows zero `GroupMediaReview*` findings; 605-line test suite passes unmodified
- **Committed in:** `6fc6e716`, `3461e8cc`, `50003a59`

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking fixes required to satisfy the plan's own `npx tsc --noEmit && npx eslint .` acceptance gate). No scope creep — no behavior changed, no files outside the plan's `files_modified` list were touched.

## Note on the plan's literal verification command

The plan's Task 3 acceptance criteria specifies `grep -c '"use client"' GroupMediaReviewSection.tsx` returning exactly 1. Run literally, this returns **0** — not because the directive is missing, but because this codebase (and this file, unchanged from before this plan) uses single-quoted `'use client'`, not double-quoted `"use client"`. The semantically equivalent check (`grep -c "use client"`, matching the directive regardless of quote style) confirms exactly 1 occurrence in `GroupMediaReviewSection.tsx` and 0 in all 5 new files — satisfying the plan's actual intent (no new client boundary introduced). This is a pre-existing quote-style fact about the codebase, not a deviation introduced by this plan.

## Issues Encountered
- `GroupMediaReviewSection.tsx` is now 632 lines (down from 1,220, a 48% reduction), but still above the project's 450-line modularity guideline (`CLAUDE.md`). This is expected and in-scope for this plan: the plan explicitly keeps state ownership, memoized derivations, and event-handler definitions centralized in the orchestrator (174-12 already extracted the 9 async data/mutation handlers into `useGroupMediaReviewActions`; this plan's scope was JSX decomposition only, not further logic extraction). No plan in the 174-1x wave currently targets a further split of this file's remaining state/handler bulk — flagging this as a residual item for a possible future phase rather than silently exceeding scope to force a number.
- `npx tsc --noEmit` across the whole frontend project surfaces several pre-existing, unrelated type errors (Next.js 16 generated page-prop types for `anime/page.ts` and the release-detail-hero page, plus `ReleaseDetailHero.test.tsx` missing a `previous` field) — confirmed via `grep` that none reference `GroupMediaReview*.tsx`; left untouched per the Scope Boundary rule.
- `npx eslint .` across the whole frontend project exits non-zero due to 4 pre-existing errors in unrelated files (`capture-responsive.cjs` require-imports, a memoization-compilation-skip note, and an unescaped-entity warning in `CapabilityDetailRow.tsx`) — confirmed unrelated to this plan's files via line-by-line review of the eslint output.

## Self-Check: PASSED

- FOUND: `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.tsx`
- FOUND: `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewFilterBar.tsx`
- FOUND: `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx`
- FOUND: `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewBulkActionBar.tsx`
- FOUND: `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewDetailDrawer.tsx`
- FOUND: `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx`
- FOUND commit `6fc6e716` in `git log --oneline --all`
- FOUND commit `3461e8cc` in `git log --oneline --all`
- FOUND commit `50003a59` in `git log --oneline --all`
