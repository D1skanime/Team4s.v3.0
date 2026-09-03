---
phase: quick-260903-flw
plan: 01
subsystem: ui
tags: [react, typescript, vitest, upload, error-handling, observability]

requires: []
provides:
  - runUpload/startUpload/retryUpload re-throw on hard failure and return a real UploadRunResult built from locally-tracked per-file outcomes
  - handleUploadClick gates the success toast/drawer-close on every queued file actually reaching status 'ready'
  - handleRetryClick wrapper preventing unhandled promise rejections on retry
affects: [release-version-media-upload]

tech-stack:
  added: []
  patterns:
    - "Async hook methods that can fail must re-throw in their catch block (matching patchItem/replaceItem/deleteItem/reorderItems) instead of silently swallowing errors"
    - "Per-run result objects (UploadRunResult) are built from plain local consts inside the async function body, never from a post-await read of React state or a ref mutated inside a setState updater"

key-files:
  created: []
  modified:
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx"
    - ".planning/notes/2026-09-02-altlasten-cr01-wr02.md"

key-decisions:
  - "runUpload's outcomes array is built as a plain local const from files[loopIndex]/response.results position, not read back from uploadItems state, keeping the change StrictMode-pure (no ref mutation inside a setState updater)."
  - "handleUploadClick's existing catch block is unchanged; it now actually runs for hard failures since startUpload can reject again. The allSucceeded gate is a separate early return placed before the success side-effects."
  - "The 'error list discarded before being seen' failure mode described in CR-01 is defused by construction, not by new code: since the drawer now stays open on any failure, openUploadSheet's resetUploadDraft()/clearUploadQueue() path is never reached again before the admin has seen the failure."

requirements-completed: [QUICK-260903-FLW-01]

duration: 11min
completed: 2026-09-03
---

# Quick Task 260903-flw Summary

**`runUpload` re-throws on hard upload failure and returns a real `{ items, allSucceeded }` result computed from actual per-file outcomes, so the "Upload abgeschlossen." toast and drawer auto-close only fire when every queued file genuinely reached `status: 'ready'`.**

## Performance

- **Duration:** 11 min (first commit 11:24:55Z, last code commit 11:35:06Z)
- **Started:** 2026-09-03T11:24:55Z
- **Completed:** 2026-09-03T11:35:06Z
- **Tasks:** 3/3 completed
- **Files modified:** 5

## Accomplishments

- Fixed CR-01: hard upload failures (network/5xx) and HTTP-200-with-per-file-failure responses no longer show a false-positive "Upload abgeschlossen." toast or silently close the drawer with lost files.
- `runUpload`/`startUpload`/`retryUpload` now share a real `Promise<UploadRunResult>` contract (`{ items: UploadQueueItem[]; allSucceeded: boolean }`), matching the throw-on-error convention already used by `patchItem`/`replaceItem`/`deleteItem`/`reorderItems`.
- Retry clicks can no longer produce an unhandled promise rejection.
- Full frontend vitest suite proven green post-fix (0 failures), with 8 new regression tests added and zero regressions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Make runUpload throw on hard failure and return a real per-run result contract** - `6d4955d3` (fix)
2. **Task 2: Gate the success toast/drawer-close on the real per-run result, and stop the retry-click unhandled rejection** - `fb15c178` (fix)
3. **Task 3: Full-suite proof and close out CR-01 in the Altlasten note** - `d52675a1` (docs)

_No plan-metadata commit yet - orchestrator handles the docs commit (SUMMARY.md/STATE.md/ROADMAP.md) separately per this task's constraints._

## Files Created/Modified

- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` - Exports new `UploadRunResult` type; `runUpload` builds a locally-tracked `outcomes` array and returns `{ items, allSucceeded }` on success, re-throws in its catch block on hard failure; `startUpload`/`retryUpload` propagate the same `Promise<UploadRunResult>` contract; `UseReleaseVersionMediaResult` interface updated accordingly.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts` - 3 new hook-level regression tests (hard failure rejects; HTTP-200 total failure resolves `allSucceeded: false`; HTTP-200 partial failure resolves with mixed item statuses) plus the existing parametrized upload test extended to assert on the resolved `UploadRunResult`.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` - `handleUploadClick` gates the success toast/drawer-close/selection-clear on `result.allSucceeded`; new `handleRetryClick(index)` wrapper catches `retryUpload` rejections and surfaces a friendly German error instead of letting the promise go unhandled; the Retry button's `onClick` now calls the wrapper.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx` - Added `@/lib/api` mock (vi.hoisted pattern) so the real `useReleaseVersionMedia` hook can be exercised end-to-end without `mediaState`; 5 new component-level tests (hard failure, HTTP-200 total failure, HTTP-200 partial failure, unchanged success, retry-rejection robustness); updated the pre-existing upload-success test and the `makeMediaState` defaults to the new `UploadRunResult` contract.
- `.planning/notes/2026-09-02-altlasten-cr01-wr02.md` - CR-01 section marked resolved with a dated note referencing the fix and this quick task's directory; WR-02 section left completely untouched (verified via `git show` diff).

## Decisions Made

- The `outcomes` array inside `runUpload` is built as a plain local `const` from `files[loopIndex]` positionally aligned with `response.results`, never read back from `uploadItems` React state and never mutated via a ref inside a `setUploadItems` updater — keeping the change StrictMode-pure per the plan's hard safety constraint.
- `handleUploadClick`'s pre-existing `catch (error)` block was left exactly as-is; Task 1 alone (making `runUpload` throw again) was sufficient to make that branch live again for hard failures. Task 2 only added the `allSucceeded` gate as a new early return.
- Confirmed by inspection (no code change needed) that the "error list discarded before being seen" scenario from the CR-01 note is defused by construction: since the drawer no longer auto-closes on any failure, an admin cannot re-trigger `openUploadSheet()` → `resetUploadDraft()` → `clearUploadQueue()` before seeing the failed rows.

## Deviations from Plan

None - plan executed exactly as written. All three tasks' `<action>` and `<behavior>` blocks were followed literally, including the RED-before-GREEN TDD sequence for Tasks 1 and 2.

## Issues Encountered

- **Full-suite flakiness (not a regression):** The full frontend vitest suite has one intermittently failing test that is unrelated to this task's files — it surfaced as `ReviewDelegationSection.test.tsx` in one run and `DefaultCrewManager.test.tsx` (fansubs edit) in another, with a third run showing 0 failures. Both failing files live outside the touched `episode-versions/[versionId]/edit` directory and are pre-existing, environment/timing-sensitive flakiness, not something introduced by this fix. See measured counts below; the reported post-fix numbers are from the clean (0-failure) run.
- **Comparing pre/post-fix full-suite counts without reverting commits:** Since Tasks 1-2 were already committed by the time Task 3 ran, the pre-fix baseline was captured by temporarily checking out the pre-fix versions of the 4 touched files via `git checkout <parent-commit> -- <files>` (not `git stash`), running the suite, then restoring via `git checkout HEAD -- <files>`. Verified restoration was correct (`handleRetryClick` and the `allSucceeded` gate present again) before proceeding.

## Full-Suite Vitest Counts (measured, not paraphrased)

**Pre-fix baseline** (working tree with the 4 touched files reverted to commit `8b168f18`, the parent of Task 1's commit):
```
Test Files  1 failed | 288 passed | 1 skipped (290)
     Tests  1 failed | 2174 passed | 1 skipped | 3 todo (2179)
```
The 1 failure was `src/app/admin/users/tabs/ReviewDelegationSection.test.tsx` — unrelated to CR-01's files.

**Post-fix** (working tree restored to this task's commits `6d4955d3`/`fb15c178`/`d52675a1`), run 3 times to characterize flakiness:
- Run 1: `1 failed | 288 passed | 1 skipped (290)` files, `2182 passed` — failure in `DefaultCrewManager.test.tsx` (fansubs, unrelated).
- Run 2: `1 failed | 288 passed | 1 skipped (290)` files, `2182 passed` — failure in `ReviewDelegationSection.test.tsx` (same file as the pre-fix baseline's failure, unrelated).
- Run 3 (clean):
  ```
  Test Files  289 passed | 1 skipped (290)
       Tests  2183 passed | 1 skipped | 3 todo (2187)
  ```
  0 failures.

Post-fix test count (2187) is exactly pre-fix (2179) + 8 — the 3 new hook-level tests (Task 1) plus the 5 new component-level tests (Task 2), confirming no tests were dropped or skipped by the fix. The targeted verification commands (`useReleaseVersionMedia.test.ts` + `ReleaseVersionMediaSection.test.tsx` alone) are consistently green: 34/34 passing on every run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

CR-01 is closed. WR-02 (test-substring-instead-of-behavior debt in the backend replace/upload handler tests, documented in the same Altlasten note) remains open and untouched, as scoped.

---
*Quick task: 260903-flw-cr-01-fehlgeschlagene-uploads-duerfen-ni*
*Completed: 2026-09-03*

## Self-Check: PASSED

All 5 modified files found on disk; all 3 task commits (`6d4955d3`, `fb15c178`, `d52675a1`) found in `git log`.
