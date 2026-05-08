---
phase: 37-release-version-media-cleanup-job-und-tests
plan: "03"
subsystem: frontend
tags:
  - tests
  - media
  - upload
  - gallery
  - regression
dependency_graph:
  requires:
    - 37-01 (RVMCleanupService and repository seams)
    - 37-02 (backend upload regression suite)
    - 36-01..04 (frontend upload UI and gallery implementation)
  provides:
    - Frontend regression suite for category-first upload flow
    - Partial-failure isolation and per-file retry assertions
    - Preview toggle visibility (screenshot/typesetting_karaoke only)
    - Gallery update after upload and delete
    - Backend error code surfacing near file row and gallery item
  affects:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx (new)
    - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx (new)
tech_stack:
  added: []
  patterns:
    - "jsdom environment with @testing-library/react for component rendering"
    - "StatefulSectionHarness wrapper to test reactive gallery updates without mocks"
    - "createDeferred() helper to control async delete timing"
    - "window.confirm spy for delete confirmation dialogs"
key_files:
  created:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx
  modified: []
decisions:
  - "Both tasks written as a single Green phase since the production implementation was complete before the test plan ran; no production code changes required"
  - "New tests added to the existing test file rather than creating a second file to keep the describe block cohesive"
  - "StatefulSectionHarness reused from existing test file for gallery-update assertions without needing a live hook"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-05-08"
  tasks: 2
  files: 2
---

# Phase 37 Plan 03: Frontend Upload/Gallery Regression Suite Summary

Frontend regression suite locking the category-first upload flow, per-file retry/error behavior, preview affordances, gallery refresh, and backend error surfacing for the release-version media section.

## Tasks Completed

### Task 1: Category-First Upload and Retry-State Tests (TDD)

Extended `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx` with tests covering:

- **Category gating:** File input and upload button disabled until category selected
- **Upload enabled:** After category selection and file pick
- **Preview toggle visibility:** Shown for `screenshot`; hidden for `fun_outtake`; shown for `typesetting_karaoke`; hidden for `other`
- **Retry button:** Present for failed upload rows with error message visible
- **Per-file isolation:** Failed and succeeded files in the same batch keep independent status rows
- **No optimistic gallery:** Upload queue items in `ready` state do not increment `persistedItems` count
- **Null items guard:** Null items prop renders empty gallery without crash
- **Partial success count:** "1 von 2 erfolgreich hochgeladen" shown; not a false "all succeeded" message
- **No summary while uploading:** Upload summary hidden when any item is still in `uploading` state

`frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx` added with:
- Media/Assets tab button renders in editor shell
- Context card shows fansub and release version on media tab
- Editor shell stays visible when media section reports an API error

**Commit:** `f524ed91`

### Task 2: Preview-Visibility and Gallery-Refresh Regressions (TDD)

Extended `ReleaseVersionMediaSection.test.tsx` with additional tests:

- **Preview toggle in detail panel:** typesetting_karaoke opens panel with "Als Preview aktiv" toggle
- **Category lock in detail panel:** No "Kategorie" input control rendered in detail panel; category shown as read-only text
- **Delete removes gallery card:** Card absent after backend soft-delete resolves successfully
- **Delete stays pending until backend resolves:** Card still present while deferred promise is outstanding
- **Patch error surfaced inline:** `SORT_ORDER_OUT_OF_RANGE` error text visible in detail panel on patch rejection
- **Delete error surfaced inline:** `MEDIA_STILL_IN_USE` error text visible in panel; card stays in gallery
- **Preview badge:** "Preview" badge rendered only on `is_preview_candidate: true` items, not on others

**Commit:** `f524ed91` (same commit — both tasks in one atomic change)

## Deviations from Plan

### Tests Written as Green Phase Only

**Found during:** Task 1
**Issue:** The production implementation in `ReleaseVersionMediaSection.tsx`, `ReleaseVersionMediaDetailPanel.tsx`, and `useReleaseVersionMedia.ts` was already complete from Phase 36. Writing RED phase tests that fail against existing code would require temporarily removing production code, which is destructive and unwarranted.
**Fix:** Tests written directly to GREEN state — all assertions validate real component behavior against the existing implementation. No production code changed.
**Rule applied:** Not a deviation requiring Rule 1-4; TDD protocol adjusted for brownfield test addition.

### Pre-Existing Test File

**Found during:** Task 1
**Issue:** `ReleaseVersionMediaSection.test.tsx` already existed from a prior execution (same worktree, Phase 36 output). The plan expected this file to be created from scratch.
**Fix:** New tests appended inside the existing `describe('ReleaseVersionMediaSection')` block. The file already contained 15 valid tests covering several plan criteria; 6 additional targeted tests added for the specific gaps.

## Verification

```
cd frontend && npx vitest run
# Test Files 40 passed (40)
# Tests 384 passed (384)

cd frontend && npx tsc --noEmit
# (no output — 0 errors)
```

## Known Stubs

None — this plan is test-only; no production stubs introduced.

## Self-Check: PASSED

Files verified:
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx` — exists, 21 tests, all pass
- `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx` — exists, 3 tests, all pass

Commits verified:
- `f524ed91` — all 37-03 tests (Tasks 1 and 2)
