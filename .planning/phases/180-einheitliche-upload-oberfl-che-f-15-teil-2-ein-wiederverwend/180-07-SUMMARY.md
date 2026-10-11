---
phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
plan: 07
subsystem: ui
tags: [react, nextjs, upload, dropzone, vitest, testing-library, fansub-group-media]

# Dependency graph
requires:
  - phase: 180
    plan: 01
    provides: "UploadDropzone/UploadFileRow presentation primitives"
  - phase: 180
    plan: 02
    provides: "useUploadQueue<TResult>() adapter-parametrized orchestration hook + UploadAdapter<TResult> contract"
  - phase: 180
    plan: 03
    provides: "fansub_group_media_id on the group-media upload response, enabling relation-ID addressing instead of sort_order"
  - phase: 180
    plan: 05
    provides: "Proven Weg-1 UploadDropzone/UploadFileRow/useUploadQueue adapter pattern mirrored here for Weg 2"
  - phase: 180
    plan: 06
    provides: "useGroupMediaReviewFilters extraction axis (first half of the combined 450-line-budget fix)"
provides:
  - "GroupMediaReviewUploadPanel.tsx rebuilt on UploadDropzone + UploadFileRow + useUploadQueue (Weg 2 functional parity with Weg 1)"
  - "Weg-2 adapter wrapping uploadFansubGroupMedia/patchFansubMediaReview, addressing uploads by fansub_group_media_id"
  - "useGroupMediaReviewReorder.ts: drag/pointer reorder state+handlers as a second, independent extraction axis"
  - "GroupMediaReviewSection.tsx under the CLAUDE.md 450-line budget (415 lines)"
affects: [180-08, 180-09, 180-10, 180-11, 180-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Weg-2 adapter maps patch.caption -> description (FansubMediaReviewPatch has no caption field) and hardcodes reviewStatusCode: 'in_review' unconditionally, proven by a dedicated test asserting the mock's call arguments directly (T-180-12/T-180-13)"
    - "Second, independent extraction axis (useGroupMediaReviewReorder.ts) applied in addition to 180-06's useGroupMediaReviewFilters.ts to cross the 450-line threshold together, mirroring the established pattern from that plan's own summary"

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewReorder.ts
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewActions.ts
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.module.css

key-decisions:
  - "Added a new useGroupMediaReviewReorder.ts hook (not in the plan's declared files_modified) because the plan's literal Task 2 removals alone left GroupMediaReviewSection.tsx at 471 lines, still over the 450-line CLAUDE.md budget the plan's own must_haves truth requires; extracted drag/pointer-reorder state and handlers as a second, independent extraction axis, landing at 415 lines"
  - "Rewrote two GroupMediaReviewSection.test.tsx tests that asserted old dropzone implementation details (fixed input id, 'dropZoneActive' CSS class, no-ID-gated ready status) to match the new shared-primitive markup and the fansub_group_media_id-gated ready/failed branching introduced by this plan"
  - "Kept the Weg-2 panel as a Card-based inline panel (not a Drawer, unlike Weg 1) per the plan's explicit action text, reusing the existing uploadPanel/uploadControls/cardFooterActions CSS classes and adding one new .uploadQueue class for the UploadFileRow list container"

patterns-established:
  - "useGroupMediaReviewReorder.ts: drag/pointer-reorder extraction mirrors useGroupMediaReviewFilters.ts's own pattern note about combining two independent extraction axes to cross a line-count budget"

requirements-completed: [D-01, D-03, D-04, D-09, D-11, D-12, D-13, D-14]

# Metrics
duration: ~47min
completed: 2026-10-11
---

# Phase 180 Plan 07: Weg 2 (Gruppenmedien) Upload Migration Summary

**Rebuilt `GroupMediaReviewUploadPanel.tsx` on the shared `UploadDropzone`/`UploadFileRow`/`useUploadQueue` stack with a Weg-2 adapter addressing uploads by `fansub_group_media_id`, fixing the merge-selection bug and giving per-file retry/metadata — while a second extraction axis (`useGroupMediaReviewReorder.ts`) brings `GroupMediaReviewSection.tsx` from 517 to 415 lines, under the CLAUDE.md budget.**

## Performance

- **Duration:** ~47 min
- **Started:** 2026-10-11T19:35:00Z (approx.)
- **Completed:** 2026-10-11T20:22:34Z
- **Tasks:** 2/2
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- `GroupMediaReviewUploadPanel.tsx` rebuilt as a self-contained component (`fansubId`, `uploadCategory`, `setUploadCategory`, `onUploadComplete`) on `useUploadQueue<FansubGroupMediaUploadResult>()` + `UploadDropzone` + `UploadFileRow`, fixing the replace-semantics bug (`setSelectedFiles(files.filter(...))`) that discarded earlier selections when a second batch was chosen.
- Weg-2 adapter: `uploadFiles` wraps `uploadFansubGroupMedia` with `reviewStatusCode: 'in_review'` hardcoded unconditionally (Pitfall 5/T-180-12, proven by a dedicated test asserting the mock's call arguments); `readyResultId`/`isReady` key off `fansub_group_media_id` (the D-14 field shipped in 180-03) instead of a fragile sort_order workaround; `patchMetadata` maps the generic `patch.caption` onto `FansubMediaReviewPatch.description` (T-180-13, there is no `caption` field on that type) and issues a direct, unconditional `patchFansubMediaReview` call (no `source_revision` concept on this endpoint, unlike Weg 1).
- Each uploaded file now has its own optional Titel/Beschreibung fields (D-11) and its own status/retry button via `UploadFileRow` (D-12) — a partial batch failure no longer produces one combined, non-retryable error message.
- `useGroupMediaReviewActions.ts` lost its `handleUpload` function and all upload-related params; the hook now only owns `loadMedia`/`handleSave`/`handleQuickReview`/`handleBulkReview`/`applyMediaReorder`/`handleReorderDrop`/`handlePointerDragEnd`/`handleDelete`.
- `GroupMediaReviewSection.tsx` lost its `selectedFiles`/`isUploadDragging`/`uploadProgress`/`uploadError`/`selectedFilePreviews` state and `handleSelectedFiles`/`handleUploadDrop`/`resetUploadForm` handlers — all upload state is now opaque to the parent, owned entirely by the rebuilt panel. `shouldShowUploadPanel` now depends only on `canUpload && isUploadOpen`.
- New `useGroupMediaReviewReorder.ts` extracts the drag/pointer-based reorder state (`draggedMediaId`/`dragOverMediaId`/`reorderSaving`/`reorderError`/`pointerReorderRef`) and handlers (`handleDragStart`/`handleDragOver`/`handleDragEnd`/`getPointerTargetMediaId`/`handlePointerDragStart`/`handlePointerDragMove`) as a second, independent extraction axis — combined with 180-06's filter extraction, `GroupMediaReviewSection.tsx` now sits at 415 lines, comfortably under the 450-line CLAUDE.md budget.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild GroupMediaReviewUploadPanel.tsx on UploadDropzone + UploadFileRow + useUploadQueue** - `1c9831a7` (feat)
2. **Task 2: Remove the superseded code in useGroupMediaReviewActions.ts and GroupMediaReviewSection.tsx** - `787dd007` (feat)

_No TDD RED/GREEN commit split was used — both tasks produced net-new/refactored files with tests written and run together per task, matching this phase's established convention for `tdd="true"` tasks (acceptance-criteria-as-tests structure)._

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.tsx` - rebuilt on shared primitives/hook; Weg-2 adapter; merge/retry/optional-metadata behavior
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.test.tsx` - new: 3 tests (merge proof, hardcoded `reviewStatusCode: 'in_review'` proof, per-row retry-visibility proof for a mixed ready/failed result)
- `frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewActions.ts` - `handleUpload` and its upload-related params removed; unused `uploadFansubGroupMedia` import removed
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` - upload state/handlers removed (517 -> 471 lines after plan's literal Task 2 removals); drag/pointer-reorder extracted to `useGroupMediaReviewReorder.ts` (471 -> 415 lines)
- `frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewReorder.ts` - new: drag/pointer reorder state + handlers, second extraction axis
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx` - two upload-flow tests updated for the new shared-primitive markup and `fansub_group_media_id`-gated ready status
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.module.css` - added `.uploadQueue` (grid gap wrapper for the new `UploadFileRow` list)

## Decisions Made
See `key-decisions` in frontmatter. In short: (1) added the `useGroupMediaReviewReorder.ts` extraction beyond the plan's literal text because the stated removals alone did not reach the plan's own 450-line acceptance criterion; (2) rewrote two pre-existing tests that encoded old dropzone implementation details now superseded by the shared `UploadDropzone`/`UploadFileRow` primitives; (3) kept the panel as an inline `Card` (not a `Drawer`) per the plan's explicit action text, since Weg 2 has never used a drawer-based upload UI.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extracted drag/pointer-reorder state into useGroupMediaReviewReorder.ts to reach the 450-line budget**
- **Found during:** Task 2
- **Issue:** After the plan's literal Task 2 removals, `GroupMediaReviewSection.tsx` was 471 lines — still over the 450-line CLAUDE.md budget that this plan's own `must_haves.truths` explicitly requires ("GroupMediaReviewSection.tsx is now under 450 lines").
- **Fix:** Extracted the drag/pointer-based reorder state and handlers (previously declared inline) into a new `useGroupMediaReviewReorder.ts` hook, mirroring 180-06's own "second extraction axis" pattern. This brought the file to 415 lines.
- **Files modified:** `GroupMediaReviewSection.tsx`, `useGroupMediaReviewReorder.ts` (new)
- **Verification:** `wc -l` reports 415 lines; `npm run typecheck` clean; full frontend test suite green (no regression in the 2 reorder-behavior tests in `GroupMediaReviewSection.test.tsx`).
- **Committed in:** `787dd007` (Task 2 commit)

**2. [Rule 1 - Bug] Rewrote two GroupMediaReviewSection.test.tsx tests asserting superseded dropzone implementation details**
- **Found during:** Task 2, running the full suite per the plan's own `<verify>` step
- **Issue:** `setzt Dateiauswahl und Upload-Kategorie nach erfolgreichem Upload zurück` asserted a bare `status: 'ready'` upload result was treated as success — but the rebuilt adapter's `isReady` check now requires `fansub_group_media_id` to be a number (D-14), so the un-updated mock produced a `failed` outcome instead. `zeigt beim Ziehen von Bildern einen aktiven Dropbereich...` asserted the old hand-rolled dropzone's `dropZoneActive` CSS class and a fixed `id="group-media-file-input"`, both of which the shared `UploadDropzone` primitive does not reproduce (it uses `dropzoneDragging` and has no fixed input id).
- **Fix:** Updated the first test's mock to include `fansub_group_media_id: 555`; updated the second test's assertions to `dropzoneDragging` and dropped the fixed-id assertion (replaced with asserting the `UploadFileRow` preview renders, which is the behaviorally-relevant proof).
- **Files modified:** `GroupMediaReviewSection.test.tsx`
- **Verification:** All 24 tests in the file pass; full frontend suite green aside from 3 pre-existing, unrelated environment-dependent failures.
- **Committed in:** `787dd007` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — required to meet this plan's own stated acceptance criteria/line budget and to keep the full suite green per its own `<verify>` step)
**Impact on plan:** No scope creep beyond what this plan's own acceptance criteria and verification step required.

## Issues Encountered
- Three frontend test files fail independent of this plan's changes (`badgeArtwork.test.ts` requires `API_INTERNAL_URL`; `RoleCapabilityDetail.membershipBaselineDrift.test.ts` reads an absolute `/backend/...` path; `ResponsiveImage.config.test.ts` fails independent of recent work) — confirmed via `git log` that none were touched by this plan; same pre-existing environment-dependent failures already documented in 180-05's summary.
- `UploadFileRow`'s `FilePreview` forwards a ref to `next/image`, which this test file's local `next/image` mock (a plain function component) does not support via `React.forwardRef` — produces a harmless React console warning ("Function components cannot be given refs") during the two upload-flow tests, but does not affect assertions or pass/fail. Pre-existing mock pattern in this test file, not modified by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Weg 1 (180-05) and Weg 2 (180-07) are both now proven real consumers of `useUploadQueue`/`UploadAdapter` (180-02) and `UploadDropzone`/`UploadFileRow` (180-01), with both their files comfortably under the 450-line CLAUDE.md budget.
- No blockers for 180-08 through 180-11 (remaining per-way adoptions). No new per-item state pattern was needed beyond what 180-05 already established — Weg 2 had no preview-candidate-equivalent concern, so no drawer-level follow-up-call pattern was required here.

## Self-Check: PASSED

- FOUND: `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.tsx`
- FOUND: `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.test.tsx`
- FOUND: `frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewReorder.ts`
- FOUND: commit `1c9831a7` (Task 1)
- FOUND: commit `787dd007` (Task 2)

---
*Phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend*
*Completed: 2026-10-11*
