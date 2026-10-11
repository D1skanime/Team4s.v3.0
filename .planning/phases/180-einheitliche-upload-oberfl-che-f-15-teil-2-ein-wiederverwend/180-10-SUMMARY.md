---
phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
plan: 10
subsystem: ui
tags: [react, nextjs, upload, dropzone, design-system, vitest, fansubs]

# Dependency graph
requires:
  - phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
    provides: "UploadDropzone presentation primitive (180-01), consumed directly here"
provides:
  - "Weg 6 (Release-Theme-Assets, both entry points) rendering through UploadDropzone instead of raw native file inputs"
  - "Corrected 180-UI-SPEC.md row-6 assumption: both entry points are single-file (multiple=false), not gallery-style multiple=true"
  - "Real drag&drop (D-17) on both Weg-6 entry points for the first time"
affects: [180-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "When a consumer's existing onChange handler reads File directly off a DOM ref/event (not a File passed as an argument), adopting UploadDropzone requires adapting that handler's signature to accept File|null directly — UploadDropzone owns its own internal hidden input and cannot be pointed at an externally-supplied ref."

key-files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeDrawerSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/useReleaseMediaDrawer.ts
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseMediaDrawer.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeDrawerSection.test.tsx

key-decisions:
  - "Adapted handleThemeUploadInputChange's signature from () => void (reading themeUploadInputRef.current.files[0]) to (file: File | null) => void, and handleDrawerUploadClick now reads a new themeUploadFile state instead of the DOM ref — UploadDropzone owns its own internal file input and exposes selected files only via onFilesSelected(files: File[]), so the old ref-reading pattern could not be preserved without an awkward synthetic-event cast. This fully removed the now-dead themeUploadInputRef plumbing from the hook, ReleaseMediaDrawer.tsx (pass-through), and the section's prop type/test."
  - "ReleaseThemeAssetsSection.tsx's adjacent native upload-trigger <button> was also replaced with the global Button component in the same task, per plan instruction and CLAUDE.md's no-native-button-for-a-covered-primitive rule — fixed as a direct side effect while the surrounding markup was already being touched."

patterns-established:
  - "UploadDropzone dropHintLabel used to surface the currently-selected filename directly inside the dropzone (ReleaseThemeAssetsSection); where a dedicated filename-display element already exists next to the dropzone (ReleaseThemeDrawerSection), that element is kept as the single source of truth instead of duplicating the filename via dropHintLabel."

requirements-completed: [D-01, D-04, D-13, D-17]

# Metrics
duration: 18min
completed: 2026-10-11
---

# Phase 180 Plan 10: Weg 6 (Release-Theme-Assets) UploadDropzone Adoption Summary

**Both Weg-6 entry points (anime-level `ReleaseThemeAssetsSection.tsx`, release-level `ReleaseThemeDrawerSection.tsx`) now render their single-file video-replace upload through the shared `UploadDropzone` primitive, gaining real drag&drop (D-17) for the first time while rights, upload flow, and single-file-replace semantics stay byte-for-byte unchanged.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-10-11T20:49:00Z
- **Completed:** 2026-10-11T20:53:33Z
- **Tasks:** 2
- **Files modified:** 5 (2 from plan's explicit list + 3 necessary follow-on edits to the release-level entry point's supporting hook/parent/test)

## Accomplishments
- `ReleaseThemeAssetsSection.tsx`: raw `<input type="file" accept="video/*">` replaced with `UploadDropzone` (`multiple={false}`, `allowDrop={true}`); adjacent raw upload-trigger `<button>` replaced with the global `Button` component (fixes a pre-existing CLAUDE.md UI-primitive violation touched by this task).
- `ReleaseThemeDrawerSection.tsx`: raw `<input ref={themeUploadInputRef} type="file">` + its "Datei wählen" trigger `Button` replaced with a single `UploadDropzone` (`multiple={false}`, `allowDrop={true}`); the existing filename display, upload-status meta text, and "Upload starten"/"Asset entfernen" action buttons are unchanged.
- `180-UI-SPEC.md`'s row-6 "gallery character, multiple=true" guess is confirmed wrong by live-code verification and corrected to `multiple=false` for both entry points, matching the plan's objective.
- Both entry points gain real drag&drop for the first time (D-17) — a drop now reaches the exact same `setFile`/`handleThemeUploadInputChange` callback a click-pick already used, with zero new code path, gated by the same existing `canManageReleaseThemeAssets`/`disabled` authorization as before.

## Task Commits

Each task was committed atomically:

1. **Task 1: Anime-level entry — ReleaseThemeAssetsSection.tsx** - `4c6521e5` (feat)
2. **Task 2: Release-level entry — ReleaseThemeDrawerSection.tsx** - `8cdcc81a` (feat)

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx` - Native file input replaced with `UploadDropzone`; native upload-trigger button replaced with global `Button`.
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeDrawerSection.tsx` - Native file input + trigger `Button` pair replaced with `UploadDropzone`; `handleThemeUploadInputChange` prop type changed from `() => void` to `(file: File | null) => void`; `themeUploadInputRef` prop removed (no longer needed).
- `frontend/src/app/admin/fansubs/[id]/edit/useReleaseMediaDrawer.ts` - Added `themeUploadFile` state; `handleThemeUploadInputChange` now receives the `File | null` directly instead of reading `themeUploadInputRef.current?.files?.[0]`; `handleDrawerUploadClick` reads `themeUploadFile` state instead of the ref; `themeUploadInputRef` declaration and all its usages (`clearThemeUploadInput`, the stale-card-cleanup effect, `resetDrawerState`, the hook's return object) removed as dead code.
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseMediaDrawer.tsx` - Stopped destructuring/passing the now-removed `themeUploadInputRef` through to `ReleaseThemeDrawerSection`.
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeDrawerSection.test.tsx` - Removed the now-nonexistent `themeUploadInputRef` prop from the test's render call (required to keep `tsc --noEmit` green after the prop was removed).

## Decisions Made
- `handleThemeUploadInputChange`'s signature was adapted to accept `File | null` directly rather than keeping an event-shaped cast, per the plan's own explicit guidance ("check its definition in the parent... prefer that over an event-shape cast"). This was the cleaner option because `UploadDropzone` owns its own internal hidden file input and has no prop to accept an externally-supplied `ref` — there is no DOM node left for `themeUploadInputRef` to attach to once the native `<input>` is removed.
- Kept the existing separate filename-display `<span>` in `ReleaseThemeDrawerSection.tsx` as the sole filename indicator (not duplicated via `UploadDropzone`'s `dropHintLabel`), per the plan's explicit instruction to keep "the filename display... unchanged." `ReleaseThemeAssetsSection.tsx` has no equivalent separate filename element, so `dropHintLabel` is used there instead to surface the selected filename.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted `useReleaseMediaDrawer.ts`/`ReleaseMediaDrawer.tsx`/test beyond the plan's declared `files_modified`**
- **Found during:** Task 2 (`ReleaseThemeDrawerSection.tsx`)
- **Issue:** `handleThemeUploadInputChange` and `handleDrawerUploadClick` read the selected file off `themeUploadInputRef.current.files[0]` — a DOM ref to the native `<input>` being removed. `UploadDropzone` cannot attach to an externally-owned ref, so the ref-reading pattern would have silently broken (file always `undefined`) without changing the hook.
- **Fix:** Changed `handleThemeUploadInputChange`'s signature to accept `(file: File | null)` directly, added a `themeUploadFile` state in the hook for `handleDrawerUploadClick` to read, and removed the now-dead `themeUploadInputRef` from the hook, `ReleaseMediaDrawer.tsx`'s pass-through, and the section's prop type. The test file's render call needed the now-removed prop deleted to keep `tsc --noEmit` passing.
- **Files modified:** `useReleaseMediaDrawer.ts`, `ReleaseMediaDrawer.tsx`, `ReleaseThemeDrawerSection.test.tsx` (in addition to the plan's declared `ReleaseThemeDrawerSection.tsx`)
- **Verification:** `npx vitest run` on both plan test files (4/4 passing), full `src/app/admin/fansubs` suite (48 files / 389 tests passing), `npm run typecheck` clean, `npx eslint` clean on all five touched files.
- **Committed in:** `8cdcc81a` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, explicitly anticipated and sanctioned by the plan's own action text)
**Impact on plan:** Necessary to correctly adopt `UploadDropzone` for the release-level entry point; the plan itself flagged this exact possibility ("prefer that over an event-shape cast... check its definition in the parent before deciding"). No scope creep beyond what the plan anticipated.

## Issues Encountered
None beyond the signature adaptation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Weg 6 (both entry points) now fully adopts `UploadDropzone`; 6 of 8 ways are done (per prior plans' summaries: 180-01 foundation, 180-02 through 180-09 per-way adoptions, this plan covers Weg 6).
- 180-12 (final cleanup/decision plan) can now see this way's final prop values (`allowDrop={true}` used on both entry points) when deciding whether `allowDrop`'s `false` branch is still needed anywhere.
- No blockers.

## Self-Check: PASSED

All 5 claimed modified files exist on disk with the expected changes; both claimed commit hashes (4c6521e5, 8cdcc81a) exist in git history (`git log --oneline -3` confirms both plus the prior plan's completion commit).

---
*Phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend*
*Completed: 2026-10-11*
