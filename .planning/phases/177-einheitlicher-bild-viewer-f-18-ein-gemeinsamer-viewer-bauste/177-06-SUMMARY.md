---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 06
subsystem: ui
tags: [react, nextjs, css-modules, media-viewer, project-member-profile]

# Dependency graph
requires:
  - phase: 177-04
    provides: "FansubMediaLightbox.tsx (widened PublicImageLightboxItem, Modal variant='stage', MediaViewerStage prefetch/zoom, MediaViewerMetadataPanel stacked metadata with release_href CTA)"
provides:
  - "ProjectMemberMediaGallery.tsx rendering the shared FansubMediaLightbox instead of a bespoke viewer"
  - "projectMemberMediaMapping.ts: toProjectMemberLightboxItem, pure ProjectMemberMediaItem -> PublicImageLightboxItem mapping"
affects: ["Future ProjectMemberMediaGallery/ProjectMember-profile work inherits the shared viewer's zoom/prefetch/metadata behavior automatically"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "toProjectMemberLightboxItem follows the project's established toLightboxItem precedent (ReleaseGallery.tsx) -- a pure, zero-React mapping function colocated with its consumer, directly unit-tested without render/fireEvent (D-13)"

key-files:
  created:
    - frontend/src/components/fansubs/projectMember/projectMemberMediaMapping.ts
    - frontend/src/components/fansubs/projectMember/projectMemberMediaMapping.test.ts
  modified:
    - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.test.tsx
  deleted:
    - frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.test.tsx

key-decisions:
  - "Fixed a pre-existing integration test (ProjectMemberMediaGallery.test.tsx, not in the plan's own file list) that broke as a direct consequence of this plan's render-target swap: its vi.mock('@/lib/api') fully replaced the module instead of partially mocking it, which left resolveApiUrl undefined once the shared viewer (MediaViewerStage) started calling it. Switched to the project's established importOriginal partial-mock pattern."
  - "Updated two now-stale assertions in that same test file to match the shared viewer's real DOM contract: the dialog's accessible name is the resolved item title (via Modal's aria-labelledby), not the old viewer's fixed 'Medienansicht' label; and Escape must be dispatched on the dialog element itself since Modal's Escape handling is a React onKeyDown on the dialog div, not a window-level listener like the old bespoke viewer used."

requirements-completed: [D-02, D-10]

# Metrics
duration: ~20min
completed: 2026-10-09
---

# Phase 177 Plan 06: Project-Member Gallery Migration Summary

**`ProjectMemberMediaGallery.tsx` now opens images through the shared `FansubMediaLightbox` via a new pure `toProjectMemberLightboxItem` mapping function; the bespoke `ProjectMemberMediaViewer.tsx` and its dedicated CSS are deleted outright, with zero feature loss and zero dual old/new surface.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-10-09
- **Tasks:** 2 completed
- **Files modified:** 7 (2 created, 3 modified, 2 deleted)

## Accomplishments
- `projectMemberMediaMapping.ts`: `toProjectMemberLightboxItem(item, projectPath)` maps `ProjectMemberMediaItem` onto the shared viewer's widened `PublicImageLightboxItem` contract — verbatim-preserved `CATEGORY_LABELS` fallback for `media_type`, `preview_url` → `original_url` (confirmed the original-quality image for this consumer, per 177-RESEARCH.md), `display_url` always `undefined` (no display-variant join exists for this consumer, out of phase scope), and `release_href` built as `${projectPath}/releases/${release_version_id}` (always present, since this is the one data source carrying a `release_version_id` on every item)
- `ProjectMemberMediaGallery.tsx` now renders `FansubMediaLightbox` with `media={shown.map((item) => toProjectMemberLightboxItem(item, projectPath))}`; the grid rendering, pagination buttons, `SectionHeader` usage, and the `openViewer`/`closeViewer`/focus-return logic are all byte-identical to before
- `ProjectMemberMediaViewer.tsx` and `ProjectMemberMediaViewer.test.tsx` deleted outright (D-10 — no dual old/new surface survives); confirmed zero importers before deletion
- `ProjectMemberMediaGallery.module.css`'s dead `.viewer*` rule group (`.viewerBackdrop`/`.viewer`/`.viewerClose`/`.viewerImageWrap`/`.viewerImage`/`.viewerInfo`/`.viewerCategory`/`.viewerMeta`/`.viewerCaption`/`.viewerReleaseLink`/`.viewerNav`/`.viewerMain`/`.viewer:focus-visible`) removed; `.grid`/`.card`/`.thumb*`/`.cardMeta`/`.loadMoreWrap`/`.loadingText`/`.error` left untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the mapping function and swap the gallery's render call onto the shared viewer** - `8780dedc` (feat)
2. **Task 2: Delete ProjectMemberMediaViewer.tsx and its dead CSS, verify no regression** - `ff18fde7` (fix)

## Files Created/Modified/Deleted
- `frontend/src/components/fansubs/projectMember/projectMemberMediaMapping.ts` - new; `toProjectMemberLightboxItem` pure mapping function
- `frontend/src/components/fansubs/projectMember/projectMemberMediaMapping.test.ts` - new; 5 D-13-compliant test cases (category-label resolution, unknown-category fallback, release_href construction, always-undefined display_url, pass-through fields)
- `frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.tsx` - import/render swap from `ProjectMemberMediaViewer` to `FansubMediaLightbox`
- `frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.module.css` - dead `.viewer*` rule group removed (125 lines)
- `frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.test.tsx` - fixed `@/lib/api` mock to partially mock via `importOriginal` (preserves real `resolveApiUrl`); updated dialog-name and Escape-dispatch-target assertions to match the shared viewer's DOM contract
- `frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.tsx` - deleted
- `frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.test.tsx` - deleted

## Decisions Made
- See `key-decisions` in frontmatter: the `ProjectMemberMediaGallery.test.tsx` fixes were required because this plan's own render-target swap broke a pre-existing integration test outside the plan's listed `<files>` — directly caused by the current task's change, so fixed in scope (Rule 1).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing integration test broke due to this plan's own render-target swap**
- **Found during:** Task 2, post-deletion regression verification
- **Issue:** `ProjectMemberMediaGallery.test.tsx` (not listed in this plan's `<files>`, but a direct consumer of the component this plan modifies) fully replaced the `@/lib/api` module via `vi.mock('@/lib/api', () => ({ getProjectMemberMedia: ... }))`. Once the gallery started rendering `FansubMediaLightbox` → `MediaViewerStage`, which calls `resolveApiUrl` from `@/lib/api`, that export became `undefined` under the full-replacement mock, crashing the render.
- **Fix:** Switched the mock to the project's established `importOriginal` partial-mock pattern (precedent: `animeDetailData.test.ts`), preserving all real exports except the one being stubbed. Also updated two now-stale assertions: the dialog's accessible name is the resolved item title (via Modal's `aria-labelledby`), not the old viewer's hardcoded `'Medienansicht'` label; and the Escape-key test now dispatches on the dialog element itself, since Modal's Escape handling is a React `onKeyDown` on the dialog `div` (not a `window` listener like the deleted bespoke viewer used).
- **Files modified:** `frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.test.tsx`
- **Commit:** `ff18fde7`

None of these changes touched the mapping function's own behavior, the gallery's grid/pagination logic, or any file outside the `ProjectMemberMediaGallery`/`ProjectMemberMediaViewer` cluster.

## Issues Encountered
- Local `npx tsc`/`npx vitest`/`npx eslint` outside the Docker container fail to resolve dependencies (no host-side `node_modules`, Docker-only dev environment per `CLAUDE.md`). All verification commands were run inside the running `team4sv30-frontend` container.
- A full, unscoped `npx vitest run` (369 test files, 3292 tests) was run as an extra safety net beyond the plan's own scoped verification command, to confirm zero regressions anywhere else in the frontend suite. Result: 368/369 files passed (1 pre-existing, unrelated skip), 3289/3292 tests passed (3 pre-existing `todo`), 0 failures.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- `ProjectMemberMediaGallery` now inherits every future improvement to the shared `FansubMediaLightbox`/`MediaViewerStage`/`MediaViewerMetadataPanel` stack automatically, with zero bespoke-viewer code left to maintain.
- Confirms the richest data shape in the cluster (per 177-RESEARCH.md, "the structural template for D-19's requirement") maps cleanly onto the shared viewer contract, validating the unification approach for the remaining consumer(s) (177-07: `GroupAssetsExperience`).
- No blockers.

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED
- FOUND: frontend/src/components/fansubs/projectMember/projectMemberMediaMapping.ts
- FOUND: frontend/src/components/fansubs/projectMember/projectMemberMediaMapping.test.ts
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.tsx
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.module.css
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.test.tsx
- CONFIRMED DELETED: frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.tsx
- CONFIRMED DELETED: frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.test.tsx
- FOUND commit: 8780dedc (Task 1)
- FOUND commit: ff18fde7 (Task 2)
