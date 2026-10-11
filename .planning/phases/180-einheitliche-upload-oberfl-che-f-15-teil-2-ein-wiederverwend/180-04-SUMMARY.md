---
phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
plan: 04
subsystem: ui
tags: [react, nextjs, typescript, admin, release-version-media, modularization]

# Dependency graph
requires:
  - phase: 180 (plans 01-03)
    provides: release-version media backend/frontend baseline this plan structurally splits
provides:
  - "ReleaseVersionMediaGrid.tsx: extracted, standalone persisted-media grid component (story/kara cards, drag-reorder, preview/highlight actions)"
  - "ReleaseVersionMediaEditDrawer.tsx: extracted, standalone edit/view drawer for a selected media item"
  - "D-15 resolved: ReleaseVersionMediaGallery.tsx (+.module.css/.test.tsx) deleted as documented superseded dead code, not reactivated"
  - "ReleaseVersionMediaSection.tsx reduced from 826 to 578 lines ahead of plan 180-05's upload-drawer rewire"
affects: [180-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure structural JSX extraction into a sibling component, keeping all state/handlers in the parent and passing them down as typed props"
    - "ESLint no-restricted-syntax ratchet-list extension for pure relocations of pre-existing native-input debt (same pattern as 156-14/174-14)"

key-files:
  created:
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGrid.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaEditDrawer.tsx"
  modified:
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx"
    - "frontend/eslint.config.mjs"

key-decisions:
  - "Deleted ReleaseVersionMediaGallery.tsx outright instead of adapting it: it has no branch for the kara-segment story-item variant and its onReorder payload cannot emit kara-type reorder entries, so it is structurally incompatible with the live ReleaseVersionAdminStoryItem data model, not just stale."
  - "Added ReleaseVersionMediaEditDrawer.tsx to eslint.config.mjs's frozen LEGACY_NO_RESTRICTED_SYNTAX_FILES ratchet list, since the two native <input> elements it contains are a pure relocation of debt already warn-listed via ReleaseVersionMediaSection.tsx, not new UI-primitive debt introduced by this plan."
  - "Dropped the unused draggedStoryKey prop from ReleaseVersionMediaGrid's interface during Task 3 cleanup: the extracted grid JSX never reads it (only dragOverStoryKey drives drop-target styling), so carrying it as a prop would have invented an unnecessary prop contrary to the plan's own guidance."

patterns-established:
  - "Pattern: when extracting JSX into a new component, pass only the handlers/helpers that JSX block actually calls (not the full superset implied by prior documentation) to avoid dead prop surface"

requirements-completed: [D-06, D-15]

# Metrics
duration: 14min
completed: 2026-10-11
---

# Phase 180 Plan 04: ReleaseVersionMediaSection Structural Split Summary

**Split the 826-line ReleaseVersionMediaSection.tsx into three files (Grid, EditDrawer, and the now-578-line parent) via pure JSX extraction, and resolved D-15 by deleting the incompatible dead ReleaseVersionMediaGallery.tsx instead of reactivating it.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-10-11T19:12:00Z (approx.)
- **Completed:** 2026-10-11T19:25:48Z
- **Tasks:** 3/3
- **Files modified:** 5 (2 created, 2 modified, 3 deleted)

## Accomplishments
- D-15 closed: `ReleaseVersionMediaGallery.tsx` + `.module.css` + `.test.tsx` deleted with a documented, field-specific incompatibility finding (no kara-segment branch, no kara-type reorder payload), confirmed zero remaining references via `grep -rln`.
- `ReleaseVersionMediaGrid.tsx` created (242 lines) — the persisted-media grid (story/kara cards, drag-reorder, preview/highlight actions) extracted verbatim, including every `data-testid`/`data-drop-target`/`draggable` attribute.
- `ReleaseVersionMediaEditDrawer.tsx` created (185 lines) — the edit/view drawer for a selected media item (title/caption/category/replace/delete) extracted verbatim.
- `ReleaseVersionMediaSection.tsx` reduced from 826 to 578 lines, measurably ahead of the ~650-line checkpoint this plan's acceptance criteria required, leaving plan 180-05 room to extract the upload drawer down to the final 450-line target.
- Zero behavioral regression: `ReleaseVersionMediaSection.test.tsx` 39/39 passing unchanged before and after both extractions; `npm run typecheck` clean; `npx eslint` on all three touched files reports 0 errors.

## Task Commits

Each task was committed atomically:

1. **Task 1: D-15 — audit ReleaseVersionMediaGallery.tsx and delete it as superseded dead code** - `f032829d` (chore)
2. **Task 2: Extract ReleaseVersionMediaGrid.tsx from ReleaseVersionMediaSection.tsx** - `6e6f6352` (feat)
3. **Task 3: Extract ReleaseVersionMediaEditDrawer.tsx from ReleaseVersionMediaSection.tsx** - `e3471ecd` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGrid.tsx` - new: persisted-media grid component (story/kara cards, drag-reorder, preview/highlight)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaEditDrawer.tsx` - new: edit/view drawer component for a selected media item
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` - reduced from 826 to 578 lines; now imports and renders the two extracted components, keeping all upload-related state/handlers for 180-05
- `frontend/eslint.config.mjs` - added `ReleaseVersionMediaEditDrawer.tsx` to the frozen `LEGACY_NO_RESTRICTED_SYNTAX_FILES` ratchet list (pure relocation of pre-existing native-input debt, not new debt)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx` - deleted (D-15, superseded dead code)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.module.css` - deleted (D-15)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.test.tsx` - deleted (D-15)

## Decisions Made
- **D-15 resolution:** `ReleaseVersionMediaGallery.tsx` took a flat `ReleaseVersionMediaItem[]` and grouped it client-side by category; the live grid consumes `media.storyItems: ReleaseVersionAdminStoryItem[]`, a discriminated union of `{type:'media', ...}` and `{type:'kara', segment, ...}` entries sorted into one combined story order. The Gallery file has no branch at all for the kara-segment variant and its `onReorder` payload only ever emits `{type:'media', ...}` entries — it cannot represent or round-trip a mixed story order. This is a structural incompatibility, not staleness, so the file was deleted outright per the plan's explicit instruction rather than adapted.
- **Prop-contract trimming (Task 3):** removed the `draggedStoryKey` prop from `ReleaseVersionMediaGrid` (introduced in Task 2 following the plan's descriptive interface list) once it became clear the extracted JSX never reads it — only `dragOverStoryKey` drives the drop-target CSS. Kept the prop surface to what the JSX actually consumes, per the plan's own "do not invent new props beyond what is needed" instruction.
- **ESLint ratchet-list extension:** `ReleaseVersionMediaEditDrawer.tsx` is a brand-new file, so ESLint's `no-restricted-syntax` rule applied full `error` severity to its two relocated native `<input>` elements (replace-file picker, preview checkbox) even though the identical elements were only `warn`-severity debt in the already-listed `ReleaseVersionMediaSection.tsx`. Followed the exact precedent set by the existing 156-14/174-14 ratchet-list comments: added the new file to `LEGACY_NO_RESTRICTED_SYNTAX_FILES` with a dated, documented comment explaining this is a pure code move of pre-existing debt, not new debt — consistent with CLAUDE.md's global-UI-primitive rule, which only requires `error` severity for genuinely new violations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript ref-type mismatch for the replace-file input**
- **Found during:** Task 3 (ReleaseVersionMediaEditDrawer extraction)
- **Issue:** Declared the `replaceFileInputRef` prop as `RefObject<HTMLInputElement | null>`, which `tsc --noEmit` rejected when assigned to the native `<input ref={...}>` JSX attribute (`LegacyRef<HTMLInputElement>` expects `RefObject<HTMLInputElement>` — React's `RefObject<T>.current` is already `T | null`, so the extra `| null` in the generic was redundant and type-incompatible).
- **Fix:** Changed the prop type to `RefObject<HTMLInputElement>`.
- **Files modified:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaEditDrawer.tsx`
- **Verification:** `npm run typecheck` clean afterward.
- **Committed in:** `e3471ecd` (part of Task 3 commit)

**2. [Rule 3 - Blocking] Registered the new EditDrawer file in the ESLint native-input ratchet list**
- **Found during:** Task 3 (ReleaseVersionMediaEditDrawer extraction)
- **Issue:** `npx eslint` reported 2 `no-restricted-syntax` errors (not just warnings) for the relocated native `<input>` elements, because the rule applies full `error` severity to any file not already on the frozen legacy-warn list, and the new file was not yet on it.
- **Fix:** Added `ReleaseVersionMediaEditDrawer.tsx` to `LEGACY_NO_RESTRICTED_SYNTAX_FILES` in `frontend/eslint.config.mjs`, with a comment following the exact 156-14/174-14 precedent (pure code move, no new native elements).
- **Files modified:** `frontend/eslint.config.mjs`
- **Verification:** `npx eslint` on all three touched files afterward reports 0 errors, 7 pre-existing warnings.
- **Committed in:** `e3471ecd` (part of Task 3 commit)

**3. [Rule 1 - Bug] Removed dead `draggedStoryKey` prop and `ReleaseVersionAdminStoryItem` import**
- **Found during:** Task 3 cleanup pass (post-extraction lint check)
- **Issue:** `eslint` flagged `draggedStoryKey` (unused prop in `ReleaseVersionMediaGrid.tsx`, added in Task 2 per the plan's descriptive prop list but never read by the extracted JSX) and `ReleaseVersionAdminStoryItem` (unused type import left behind in `ReleaseVersionMediaSection.tsx` after the grid JSX moved out).
- **Fix:** Removed both the unused prop (and its parent-side pass-through) and the unused import.
- **Files modified:** `ReleaseVersionMediaGrid.tsx`, `ReleaseVersionMediaSection.tsx`
- **Verification:** `npx eslint` clean of these two warnings afterward; `npm run typecheck` and the 39-test suite still pass.
- **Committed in:** `e3471ecd` (part of Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All three were needed to keep the extraction behavior-identical and lint/type clean; no scope creep beyond the plan's own files.

## Issues Encountered
- The plan's Task 2 acceptance-criteria grep (`grep -n "data-testid=.admin-kara-card-" ...`) does not actually match the real source text `data-testid={'admin-kara-card-' + segment.id}` — the regex's single `.` wildcard cannot absorb the two literal characters `{'` between `=` and `admin`. Confirmed via `git show` that this exact grep also fails against the pre-extraction baseline file, so this is a pre-existing imprecision in the plan's shorthand regex, not a regression introduced by this plan. Verified the actual intent (the `data-testid` attribute and its value are preserved verbatim) via a plain `grep -n "data-testid"` instead, which found the expected line in `ReleaseVersionMediaGrid.tsx`.

## Next Phase Readiness
- `ReleaseVersionMediaSection.tsx` is at 578 lines with only upload-logic JSX/handlers remaining — exactly the shape plan 180-05 expects for extracting the upload drawer into `ReleaseVersionMediaUploadDrawer.tsx` and rewiring it onto `UploadDropzone`/`UploadFileRow`/`useUploadQueue`.
- No blockers. The Gallery dead-code question (D-15) is fully closed and cannot resurface in 180-05's scope.

---
*Phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend*
*Completed: 2026-10-11*

## Self-Check: PASSED

- FOUND: `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGrid.tsx`
- FOUND: `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaEditDrawer.tsx`
- FOUND: `ReleaseVersionMediaGallery.tsx` correctly absent (D-15)
- FOUND: commit `f032829d` (Task 1)
- FOUND: commit `6e6f6352` (Task 2)
- FOUND: commit `e3471ecd` (Task 3)
