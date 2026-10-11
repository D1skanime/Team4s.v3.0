---
phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
plan: 02
subsystem: frontend-hooks
tags: [react, hooks, upload, vitest, testing-library, state-machine]

# Dependency graph
requires:
  - phase: 180
    plan: 01
    provides: "UploadDropzone/UploadFileRow presentation primitives (this plan does not import them directly, but its adapter output is designed to feed them in 180-05/180-07)"
provides:
  - "useUploadQueue<TResult>() — adapter-parametrized orchestration hook (merge, startUpload, retryUpload, clearQueue)"
  - "UploadAdapter<TResult> interface — the per-way contract (uploadFiles/readyResultId/isReady/readErrorFromResult/patchMetadata)"
  - "useUploadQueue.helpers.ts pure functions (mergeFileSelection, fileKey, isTerminalUploadStatus, readUploadError)"
affects: [180-03, 180-04, 180-05, 180-06, 180-07, 180-08, 180-09, 180-10, 180-11, 180-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Adapter-parametrized state-machine hook: one hook, N per-way adapters supplied at call time, instead of N near-duplicate hooks"
    - "itemsRef kept in sync via useEffect for synchronous reads inside startUpload/retryUpload (avoids the stale-closure trap of reading React state via a setState-updater side-channel)"
    - "Pure helpers file with zero React/JSX import, consumed by the orchestration hook via direct function import"

key-files:
  created:
    - frontend/src/hooks/useUploadQueue.helpers.ts
    - frontend/src/hooks/useUploadQueue.helpers.test.ts
    - frontend/src/hooks/useUploadQueue.ts
    - frontend/src/hooks/useUploadQueue.test.ts
  modified: []

key-decisions:
  - "startUpload(adapter, config?) reads the queue to upload from the hook's own current `items` state (populated earlier via selectFiles) rather than taking a drafts argument — matches the plan's literal exported signature over a stricter reading of one descriptive sentence in <behavior>, confirmed consistent with the acceptance-criteria test shapes (selectFiles then startUpload, no drafts parameter anywhere in the public signature)"
  - "itemsRef+useEffect sync instead of a setState-updater read-trick for synchronous access to current queue inside startUpload/retryUpload — a first implementation using `setItems((current) => { captured = current; return current })` silently failed because React 18 batches the updater call past the point where the surrounding async function already read the (still-empty) captured variable; itemsRef mirrors useReleaseVersionMedia.ts's own itemsRef precedent"

patterns-established:
  - "useUploadQueue.helpers.ts: pure-function exports tested directly without DOM simulation, consistent with ReleaseVersionMediaSection.helpers.tsx's existing pattern"

requirements-completed: [D-02, D-05, D-08, D-09, D-10, D-12]

# Metrics
duration: 25min
completed: 2026-10-11
---

# Phase 180 Plan 02: useUploadQueue Orchestration Hook Summary

**Adapter-parametrized upload state machine (`useUploadQueue`) generalizing `useReleaseVersionMedia.ts`'s proven merge/startUpload/retryUpload cluster behind a small per-way `UploadAdapter<TResult>` contract, so Weg 1 and Weg 2 share one correct implementation instead of two diverging copies.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-11T18:55:00Z
- **Completed:** 2026-10-11T19:04:00Z
- **Tasks:** 2
- **Files modified:** 4 (4 created)

## Accomplishments
- `useUploadQueue.helpers.ts`: `fileKey` (identical key shape to Weg 1's proven implementation), `mergeFileSelection` (pure, never mutates `current`, never drops/reorders existing entries — the direct fix for D-01/D-03's replace-not-merge bug, generalized from `ReleaseVersionMediaSection.tsx`'s `handleFiles`), `isTerminalUploadStatus`, `readUploadError` (copied verbatim from `useReleaseVersionMedia.ts`).
- `useUploadQueue.ts`: exports `UploadAdapter<TResult>` and `useUploadQueue<TResult>()` returning `{ items, selectFiles, removeDraft, updateDraft, startUpload, retryUpload, clearQueue, error }`. `startUpload` uploads the entire current queue in one `adapter.uploadFiles` call, maps per-position results through `uploading -> processing -> ready/failed`, and runs an optional `patchMetadata` step after a successful upload. `retryUpload` branches exactly on `resultId === null` (re-run the single-file upload pipeline, scoped to only that index) vs. `resultId !== null` (re-run only `patchMetadata`, never re-upload the binary) — the single highest-risk branch called out in 180-RESEARCH.md Pitfall 2.
- `selectFiles` never triggers a network call (D-10) — files only reach the network when `startUpload`/`retryUpload` is explicitly invoked.
- The hook contains no field or parameter named `review_status`/`visibility`/`reviewStatusCode` of its own — confirmed by grep, the only occurrence is a doc-comment line describing what the adapter contract deliberately keeps out of the hook (Pitfall 5).

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure helpers — mergeFileSelection, fileKey, isTerminalUploadStatus, readUploadError** - `cf836ddf` (feat)
2. **Task 2: useUploadQueue orchestration hook (merge, startUpload, retryUpload)** - `71711c3f` (feat)

_No TDD RED/GREEN commit split was used — both files were net-new with tests written and run together per task, matching 180-01's established convention for this phase's `tdd="true"` tasks (acceptance-criteria-as-tests structure rather than a separate failing-test-first commit)._

## Files Created/Modified
- `frontend/src/hooks/useUploadQueue.helpers.ts` - Pure functions: `fileKey`, `mergeFileSelection`, `isTerminalUploadStatus`, `readUploadError`; zero React/JSX import
- `frontend/src/hooks/useUploadQueue.helpers.test.ts` - 12 tests: merge-preserves-references, merge-into-empty, merge-never-mutates/reorders, dedup-skip, fileKey shape, terminal-status mapping, readUploadError's three input shapes
- `frontend/src/hooks/useUploadQueue.ts` - `UploadAdapter<TResult>` interface + `useUploadQueue<TResult>()` hook: `items`, `selectFiles`, `removeDraft`, `updateDraft`, `startUpload`, `retryUpload`, `clearQueue`, `error`
- `frontend/src/hooks/useUploadQueue.test.ts` - 8 tests via real `renderHook`: merge-not-replace, D-10 no-network-on-select, mixed ready/failed without cross-contamination, both `retryUpload` branches (resultId null vs. non-null), `clearQueue`, `removeDraft`, hard-failure error surfacing

## Decisions Made
- `startUpload`'s exported signature takes `(adapter, config?)` with no drafts parameter, per the plan's literal `<action>` text; the queue to upload is whatever is already in the hook's `items` state (populated by an earlier `selectFiles` call). This reading was cross-checked against the acceptance-criteria test descriptions, which all call `selectFiles` before `startUpload` and never pass a drafts argument.
- Replaced a first-draft `setItems((current) => { captured = current; return current })` synchronous-read pattern with an `itemsRef` kept in sync via `useEffect` (mirroring `useReleaseVersionMedia.ts`'s own `itemsRef`) — the state-updater trick does not reliably run before the surrounding async function reads the captured variable under React 18's batching, which caused all four upload/retry tests to see a stale empty queue until fixed.

## Deviations from Plan

None - plan executed as written. The two implementation details above were resolved by following the plan's own literal signatures and an explicit precedent already in the codebase (`useReleaseVersionMedia.ts`'s `itemsRef`), not treated as scope changes.

## Issues Encountered
- TypeScript inferred a zero-argument tuple for `uploadFiles` mocks in the test file when the mock's arrow function body only declared a return-type annotation (`async (): Promise<StubResult[]> => [...]`) without parameter types, causing `mock.calls[0][0]` to fail to typecheck (`Tuple type '[]' of length '0' has no element at index '0'`). Fixed by giving the mock's arrow function explicit `(_files: File[], _onProgress: (percent: number) => void)` parameters matching `UploadAdapter['uploadFiles']`'s real signature.

## Next Phase Readiness
- `useUploadQueue` + `UploadAdapter<TResult>` are ready for 180-05 (Weg 1 adoption, rewiring `useReleaseVersionMedia.ts` to call this hook with a `release_version_media_id`-based adapter) and 180-07 (Weg 2 adoption, a `fansub_group_media_id`-based adapter per D-14).
- No blockers. `npx tsc --noEmit` is clean across the whole frontend project; both new test files are green (20/20 tests); ESLint reports 0 errors (5 pre-existing-style warnings for intentionally-unused underscore-prefixed mock parameters, consistent with the rest of the codebase's convention).

## Self-Check: PASSED

All 4 claimed files exist on disk; both claimed commit hashes (cf836ddf, 71711c3f) exist in git history.

---
*Phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend*
*Completed: 2026-10-11*
