---
phase: quick-260903-flw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
  - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx
  - .planning/notes/2026-09-02-altlasten-cr01-wr02.md
autonomous: true
requirements: [QUICK-260903-FLW-01]

must_haves:
  truths:
    - "A hard upload failure (network error, 5xx, malformed response) shows the error banner, never shows the 'Upload abgeschlossen.' toast, and leaves the upload drawer open."
    - "A backend response with HTTP 200 where every file has status 'failed' never shows the success toast and never closes the drawer; every failed file stays visible with its error message and a retry action."
    - "A backend response with HTTP 200 where some files are 'ready' and some are 'failed' (partial failure) never shows the success toast, leaves the drawer open, and the failed file stays visible with its message."
    - "A fully successful upload (all files 'ready') still shows the 'Upload abgeschlossen.' toast, closes the drawer, and clears the selection -- unchanged regression behavior."
    - "Retrying a failed upload item never produces an unhandled promise rejection, even when the retry itself fails again."
  artifacts:
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts"
      provides: "runUpload rethrows on hard failure (mirroring patchItem/replaceItem/deleteItem/reorderItems) and returns an UploadRunResult ({ items, allSucceeded }) built from locally-tracked outcomes, never from post-await state reads; startUpload and retryUpload propagate the same contract."
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts"
      provides: "Hook-level regression tests proving hard failure rejects, HTTP-200 total/partial failure resolve with allSucceeded=false and correct per-item status/errorMessage, and full success resolves with allSucceeded=true."
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx"
      provides: "handleUploadClick gates the success toast and drawer close on result.allSucceeded instead of promise resolution alone; a retry click wrapper catches retryUpload rejections instead of firing an unhandled promise."
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx"
      provides: "Component-level regression tests proving the four required UI-observable behaviors end to end (real hook, mocked @/lib/api), plus the existing success-path test updated to the new resolved-value contract."
  key_links:
    - from: "frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts (runUpload catch block)"
      to: "throw uploadError"
      via: "re-throw after setError/setUploadItems, matching the sibling methods' catch blocks"
      pattern: "throw (uploadError|patchError|replaceItemError|deleteItemError|reorderItemsError)"
    - from: "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx (handleUploadClick)"
      to: "media.startUpload(...)'s resolved UploadRunResult.allSucceeded"
      via: "if (!result.allSucceeded) return  -- before touching selectedFiles/toast/isUploadOpen"
      pattern: "allSucceeded"
    - from: "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx (retry button onClick)"
      to: "media.retryUpload(index)"
      via: "a local handleRetryClick wrapper that calls .catch() on the returned promise"
      pattern: "retryUpload\\(index\\)\\.catch"
---

<objective>
Fix CR-01: `useReleaseVersionMedia.ts`'s `runUpload` swallows every upload error (catches without re-throwing), so `handleUploadClick`'s catch branch in `ReleaseVersionMediaSection.tsx` is dead code and the "Upload abgeschlossen." success toast fires unconditionally -- even on a hard network/5xx failure, and even when the backend responds HTTP 200 with every file's `status` field set to `'failed'` (the backend intentionally never uses a non-2xx status for per-file failures). Admins currently get a false-positive "success" signal in both cases, and in the HTTP-200-with-failures case there isn't even an error banner -- the failed files are silently lost.

Purpose: operational errors must be visible immediately in the UI (CLAUDE.md observability constraint). An admin who believes an upload succeeded when it silently failed has no reason to retry or investigate, and the failed media is gone.

Output: `runUpload` re-throws on hard failure like its sibling methods (`patchItem`, `replaceItem`, `reorderItems`, `deleteItem` all already throw) and returns a locally-built `{ items, allSucceeded }` result on normal completion so `handleUploadClick` can gate the success toast/drawer-close on every queued file actually reaching `status: 'ready'`, without ever reading `uploadItems` state in the same tick as the `await` (React batches that update). CR-01 in `.planning/notes/2026-09-02-altlasten-cr01-wr02.md` marked resolved; WR-02 in the same note is untouched.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@.planning/notes/2026-09-02-altlasten-cr01-wr02.md

<interfaces>
<!-- Current buggy catch in runUpload -- frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts, lines ~228-244 -->
```typescript
} catch (uploadError) {
  const message = readUploadError(uploadError, 'Upload fehlgeschlagen.')
  setError(message)
  setUploadItems((current) =>
    current.map((item, index) =>
      queueIndices.includes(index)
        ? { ...item, status: 'failed', progress: item.progress, errorMessage: message, resultId: null }
        : item,
    ),
  )
  // BUG: no `throw` here. Sibling methods all end their catch with `throw <error>`:
  // patchItem ~325: throw patchItemError
  // replaceItem ~342: throw replaceItemError
  // reorderItems ~363: throw reorderItemsError
  // deleteItem ~382: throw deleteItemError
}
```

<!-- The per-file failure loop inside the try block (HTTP 200, backend-reported failures) -- lines ~166-223 -->
<!-- For each response.results[i]: if status === 'ready' with a numeric release_version_media_id, it patches
     metadata and marks that queue item 'ready' (or 'failed' if the patch itself throws); otherwise it marks
     that queue item 'failed' with errorMessage = result.error_code || 'Upload fehlgeschlagen.' -- but today
     NOTHING is thrown and setError() is NEVER called for this branch. This whole function currently returns
     Promise<void>; nothing captures per-item outcomes for the caller. -->

<!-- Current UseReleaseVersionMediaResult interface (top of file, ~lines 22-41) declares: -->
<!-- startUpload: (category, files, defaultCaption?, isPreviewCandidate?) => Promise<void> -->
<!-- retryUpload: (fileIndex: number) => Promise<void> -->
<!-- Both must change to return a new exported UploadRunResult ({ items: UploadQueueItem[]; allSucceeded: boolean }). -->

<!-- Current dead-catch consumer -- ReleaseVersionMediaSection.tsx, handleUploadClick, lines ~288-307 -->
```typescript
async function handleUploadClick() {
  if (!canUpload) return
  setUploadError(null)
  try {
    await media.startUpload(
      selectedCategory, selectedFiles, defaultCaption,
      canShowPreviewToggle ? isPreviewCandidate : false,
    )
    setSelectedFiles([])
    setDefaultCaption('')
    setIsPreviewCandidate(false)
    setIsUploadOpen(false)
    showToast('Upload abgeschlossen.')          // fires unconditionally today
  } catch (error) {
    setUploadError(error instanceof Error ? error.message : 'Upload fehlgeschlagen.')  // currently dead
  }
}
```

<!-- Retry call site that will need a wrapper once runUpload can throw -- ReleaseVersionMediaSection.tsx, ~line 620 -->
```typescript
onClick={() => void media.retryUpload(index)}
```
<!-- `void asyncFn()` is fire-and-forget: once runUpload can reject, an unhandled retryUpload rejection surfaces
     as an unhandled promise rejection. Add a local wrapper (e.g. handleRetryClick) that calls
     media.retryUpload(index).catch(...) and sets uploadError, mirroring handleUploadClick's catch. -->

<!-- Backend response shape confirming the HTTP-200-with-per-item-failure contract -- backend/internal/handlers/admin_content_release_version_media.go -->
<!-- line 68: `Status string `json:"status"` // "ready" or "failed"` -->
<!-- line 304: `c.JSON(http.StatusOK, gin.H{"results": results})` -- always 200, even when every result.status is "failed" -->

<!-- Response types -- frontend/src/types/releaseVersionMedia.ts -->
```typescript
export interface ReleaseVersionMediaUploadResult {
  client_file_name: string
  status: 'ready' | 'processing' | 'failed'
  media_asset_id?: number
  release_version_media_id?: number
  source_revision?: number
  thumbnail_url?: string | null
  error_code?: string
}
export interface ReleaseVersionMediaUploadResponse {
  results: ReleaseVersionMediaUploadResult[]
}
```

<!-- Existing hook test file's mocking pattern to reuse verbatim -- useReleaseVersionMedia.test.ts, lines 1-11 -->
```typescript
// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getReleaseVersionMedia: vi.fn(), getReleaseVersionCapabilities: vi.fn(), patchReleaseVersionMediaItem: vi.fn(),
  deleteReleaseVersionMediaItem: vi.fn(), reorderReleaseVersionMedia: vi.fn(), uploadReleaseVersionMedia: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ ApiError: class extends Error {}, ...api }))

import { useReleaseVersionMedia } from './useReleaseVersionMedia'
```
<!-- This file already has an upload test (it.each over categories) around line 35-54 that mocks
     api.uploadReleaseVersionMedia to resolve with a single 'ready' result and calls
     `await act(async () => result.current.startUpload(category, [file]))` without capturing the return value.
     Extend that test (don't duplicate its setup) to also capture and assert on the resolved UploadRunResult. -->

<!-- ReleaseVersionMediaSection.test.tsx's existing renderSection() helper always passes a fully mocked
     mediaState prop (real hook is never exercised there). For the new component-level regression tests,
     render WITHOUT mediaState (renders <ReleaseVersionMediaSection versionId={...} .../> only) so the real
     internalMedia = useReleaseVersionMedia(versionId) hook runs, and mock '@/lib/api' the same way
     useReleaseVersionMedia.test.ts does (vi.hoisted + vi.mock('@/lib/api', ...)) including
     getReleaseVersionCapabilities/getReleaseVersionMedia so the component mounts cleanly. This is the only
     way to observe media.uploadItems (failed rows + retry buttons) actually populate as a real consequence
     of clicking "Upload starten", not as a hand-set static prop. -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Make runUpload throw on hard failure and return a real per-run result contract</name>
  <files>frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts, frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts</files>
  <behavior>
    - Test A (hard failure): `api.uploadReleaseVersionMedia` rejects (network/5xx). `startUpload(...)` must reject
      with that same error; after the rejection, `result.current.error` is the failure message and the queued
      item's status is `'failed'` with that `errorMessage`.
    - Test B (total failure at HTTP 200): `api.uploadReleaseVersionMedia` resolves with `results: [{ status:
      'failed', error_code: 'INVALID_MIME_TYPE', client_file_name: ... }]` for a single queued file.
      `startUpload(...)` must resolve (not reject) with `{ allSucceeded: false, items: [{ status: 'failed',
      errorMessage: 'INVALID_MIME_TYPE', ... }] }`, and `result.current.uploadItems[0].status` must be
      `'failed'`.
    - Test C (partial failure): two queued files, `results` has one `status: 'ready'` (with a numeric
      `release_version_media_id`) and one `status: 'failed'`. `startUpload(...)` must resolve with
      `allSucceeded: false` and `items` containing one `'ready'` and one `'failed'` entry in the same order as
      the input files.
    - Test D (success, extend the existing parametrized upload test around line 35): capture the return value
      of `startUpload(...)` and assert it resolves with `allSucceeded: true` and an `items` entry whose
      `status` is `'ready'`.
    Run all four against the current (unfixed) code first and confirm A, B, C fail (D already exists but its
    new assertion on the return value also fails against current code, which returns `undefined`).
  </behavior>
  <action>
    RED: add tests A, B, C and extend D as described in `<behavior>`, in
    `useReleaseVersionMedia.test.ts`, reusing the existing `vi.hoisted`/`vi.mock('@/lib/api', ...)` setup at the
    top of the file (see interfaces block) -- do not create a second mock setup. Run them against the current
    implementation and confirm the RED failures.

    GREEN, in `useReleaseVersionMedia.ts`:
    1. Export a new `UploadRunResult` interface next to `UploadQueueItem`: `{ items: UploadQueueItem[];
       allSucceeded: boolean }`.
    2. Change `runUpload`'s return type from `Promise<void>` to `Promise<UploadRunResult>`. Inside the try
       block's per-result loop (the existing `for` over `response.results`, currently indexed via
       `nextQueue.shift()`), build a local `outcomes: UploadQueueItem[]` array by pushing the same
       `{ file, status, progress, errorMessage, resultId }` object you pass into each `setUploadItems` updater
       call for that iteration -- do not read `uploadItems` React state to construct this array (state updates
       from the same render pass are not guaranteed visible yet; build it from local values only, per the
       Nyquist/StrictMode-purity constraint below). Index into `files` by loop position so each outcome carries
       the correct source `File`. After the loop, compute `allSucceeded = outcomes.length === files.length &&
       outcomes.every((item) => item.status === 'ready')` and `return { items: outcomes, allSucceeded }`.
    3. In the top-level `if (versionId === null || files.length === 0) { return }` guard at the start of
       `runUpload`, return `{ items: [], allSucceeded: true }` instead of `return` (nothing to do is vacuously
       not a failure; the caller in `ReleaseVersionMediaSection.tsx` never reaches this branch since the
       "Upload starten" button is disabled when `selectedFiles.length === 0`).
    4. In the `catch (uploadError)` block, keep the existing `setError`/`setUploadItems` calls exactly as they
       are, then add `throw uploadError` as the last line -- matching `patchItem`/`replaceItem`/`reorderItems`/
       `deleteItem`'s catch blocks exactly (see interfaces block).
    5. Change `startUpload`'s return type to `Promise<UploadRunResult>`. Its `if (files.length === 0) { return }`
       guard must return `{ items: [], allSucceeded: true }` too. Its final statement should `return
       runUpload(...)` (not `await runUpload(...)` followed by a bare `return`) so a rejection from `runUpload`
       propagates as a rejection of `startUpload` without an intermediate unhandled state.
    6. Change `retryUpload`'s return type to `Promise<UploadRunResult>`; its early-return guard (`if (!config ||
       !queueItem)`) should return `{ items: [], allSucceeded: true }`, and its final statement should `return
       runUpload([fileIndex], [queueItem.file], config)`.
    7. Update the `UseReleaseVersionMediaResult` interface at the top of the file: `startUpload` and
       `retryUpload` both return `Promise<UploadRunResult>` instead of `Promise<void>`.

    Re-run tests A-D; confirm all pass, plus the full existing test file (the pre-existing preview-reconciliation
    and rejected-revision tests must still pass unchanged).

    MANDATORY CONSTRAINT: do not mutate `itemsRef.current` or any ref inside a `setState` updater function anywhere
    you touch. The `outcomes` array is a plain local `const` built inside the async function body (not inside an
    updater), which is StrictMode-safe by construction -- keep it that way.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts'"</automated>
  </verify>
  <done>useReleaseVersionMedia.test.ts has 4 passing cases proving hard failure rejects (with error state + failed item), HTTP-200 total failure resolves allSucceeded=false, HTTP-200 partial failure resolves allSucceeded=false with mixed item statuses, and full success resolves allSucceeded=true; all pre-existing tests in the file still pass; runUpload/startUpload/retryUpload's return types and the UseReleaseVersionMediaResult interface all reflect the new Promise&lt;UploadRunResult&gt; contract.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Gate the success toast/drawer-close on the real per-run result, and stop the retry-click unhandled rejection</name>
  <files>frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx, frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx</files>
  <behavior>
    Component-level, end-to-end (real hook, `@/lib/api` mocked -- see interfaces block for the render-without-
    mediaState pattern):
    - Hard failure: `api.uploadReleaseVersionMedia` rejects. After selecting a file and clicking "Upload
      starten", the error banner (`role="alert"`-equivalent error box text) appears, no element with text
      "Upload abgeschlossen." appears, and the "Medien hochladen" dialog is still present (`screen.getByRole
      ('dialog', { name: 'Medien hochladen' })` does not throw).
    - Total failure at HTTP 200: `api.uploadReleaseVersionMedia` resolves with every result `status: 'failed'`.
      After clicking "Upload starten": no "Upload abgeschlossen." text, dialog still present, the failed
      filename's error message and a "Retry" button are visible inside the dialog.
    - Partial failure: one `status: 'ready'` + one `status: 'failed'` result. After clicking "Upload starten":
      no "Upload abgeschlossen." text, dialog still present, the failed file's row with its error message is
      visible.
    - Success unchanged: all `status: 'ready'`. After clicking "Upload starten": "Upload abgeschlossen." toast
      appears and the "Medien hochladen" dialog is gone (`screen.queryByRole('dialog', { name: 'Medien
      hochladen' })` is null).
    Also update the existing "starts upload with the active category after a file was selected" test (~line
    164): its `startUpload` mock currently `mockResolvedValue(undefined)`; change it to resolve
    `{ allSucceeded: true, items: [...] }` matching the new contract so the test keeps asserting the real
    success path instead of accidentally passing due to a type mismatch.
    Retry robustness: with a `mediaState` override (existing static-prop style test, same as "keeps failed
    upload retry rows..." around line 387), set `retryUpload: vi.fn().mockRejectedValue(new Error('Netzwerk-
    fehler'))`, click the "Retry" button, and assert the error text appears in the upload sheet's error box
    with no unhandled-rejection test failure.
  </behavior>
  <action>
    RED: add the four end-to-end tests plus the retry-robustness test described in `<behavior>`. Run them
    against the current (unfixed, but Task-1-fixed-hook) component code and confirm they fail because
    `handleUploadClick` still unconditionally shows the toast/closes the drawer, and the retry `onClick` is
    still bare `void media.retryUpload(index)`.

    GREEN, in `ReleaseVersionMediaSection.tsx`:
    1. In `handleUploadClick`, capture `const result = await media.startUpload(...)`. Immediately after,
       `if (!result.allSucceeded) { return }` -- before `setSelectedFiles([])`, `setDefaultCaption('')`,
       `setIsPreviewCandidate(false)`, `setIsUploadOpen(false)`, and `showToast('Upload abgeschlossen.')`. The
       existing `catch (error)` block (setting `uploadError`) stays exactly as-is; it now actually runs for
       hard failures because `startUpload` can reject again (Task 1).
    2. Add a local `function handleRetryClick(index: number)` that calls `media.retryUpload(index)` and chains
       `.catch((error) => setUploadError(error instanceof Error ? error.message : 'Erneuter Versuch
       fehlgeschlagen.'))`. Change the Retry button's `onClick={() => void media.retryUpload(index)}` (~line
       620) to `onClick={() => handleRetryClick(index)}`.
    3. Re-check the `openUploadSheet -> resetUploadDraft -> clearUploadQueue` path noted in the task brief: since
       the drawer now stays open on any failure (both hard and HTTP-200-reported), the admin sees the failure
       before ever triggering `openUploadSheet` again, so the "error list discarded before being seen" failure
       mode described in the CR-01 note is defused by construction. Confirm this holds by inspection (no code
       change expected here) and note it explicitly in the plan's SUMMARY.
    Every user-facing string you touch or add (toast text, error fallback text) must use correct German
    umlauts -- no ASCII substitutions. Use only `@/components/ui` primitives if you add any new interactive
    element (you should not need to add any: this task only wires existing `Button`/`Drawer` structure).

    Re-run all tests in this file; confirm all pass, including every test added in earlier phases.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx'"</automated>
  </verify>
  <done>ReleaseVersionMediaSection.test.tsx has passing end-to-end tests for hard failure, HTTP-200 total failure, HTTP-200 partial failure, and unchanged success (toast + close + clear), plus a passing retry-rejection-robustness test; the existing upload-success test is updated to the new UploadRunResult contract and still passes; handleUploadClick gates on result.allSucceeded; the retry button no longer fires a bare unhandled promise.</done>
</task>

<task type="auto">
  <name>Task 3: Full-suite proof and close out CR-01 in the Altlasten note</name>
  <files>.planning/notes/2026-09-02-altlasten-cr01-wr02.md</files>
  <action>
    First measure the CURRENT baseline: run the entire frontend vitest suite (no path filter) inside the
    container and record the exact reported file/test/failure counts. Then re-run it after Tasks 1-2 are
    committed in the working tree (same command) and record the actual post-fix counts -- do not assume the
    reference baseline mentioned in the task brief (289 files / 2175 tests / 0 failures) is still accurate;
    report the numbers vitest actually prints. The post-fix run must show 0 failures and a test count that is
    at least the pre-fix count plus the new tests added in Tasks 1 and 2 (do not report a lower total than
    before -- that would indicate a broken/skipped suite, not a clean fix).

    Then edit `.planning/notes/2026-09-02-altlasten-cr01-wr02.md`: under the `## CR-01` heading, add a short
    resolved-status note (e.g. a line stating it was fixed by this quick task, with the date, referencing
    `runUpload`'s re-throw + the `UploadRunResult` contract) without deleting any of the existing analysis
    prose. Do NOT touch the `## WR-02` section -- it stays open and unresolved, exactly as it is today.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run" 2>&1 | tail -20</automated>
  </verify>
  <done>Final assistant report states the actual measured pre-fix and post-fix frontend vitest file/test/failure counts (not "should pass"); post-fix run shows 0 failures; .planning/notes/2026-09-02-altlasten-cr01-wr02.md's CR-01 section is marked resolved with a dated note while its WR-02 section is unchanged.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Backend upload response -> frontend upload state | The backend intentionally returns HTTP 200 with per-file `status` fields (`ready`/`failed`) instead of using HTTP status codes for partial failure; the frontend must not conflate "request succeeded" (200) with "operation succeeded" (all files ready). |
| Admin-visible toast/drawer state -> admin trust | The success toast and drawer auto-close are the primary success signal an admin acts on; a false positive here causes silently lost uploads with no recovery path (CR-01's exact regression). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-QUICK260903-FLW-01 | Repudiation | `runUpload`'s success/failure signal | mitigate | `runUpload` re-throws on hard failure and returns a locally-built `{ items, allSucceeded }` result computed from actual per-file outcomes, not promise resolution alone (Task 1) |
| T-QUICK260903-FLW-02 | Information Disclosure / Repudiation | `handleUploadClick`'s toast/close gating | mitigate | Success UI only fires when `result.allSucceeded === true`; failures keep the drawer open with per-file retry UI already wired to `media.uploadItems` (Task 2) |
| T-QUICK260903-FLW-03 | Denial of Service (client-side) | Retry button `onClick` after `runUpload` gains a throw path | mitigate | `handleRetryClick` wrapper catches `retryUpload` rejections instead of leaving a bare `void asyncFn()` fire-and-forget call, preventing unhandled promise rejections (Task 2) |

No package-manager installs are part of this plan; the Package Legitimacy Gate does not apply.
</threat_model>

<verification>
1. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts'"` -- all hook-level cases (hard failure, total failure @ 200, partial failure, success) pass.
2. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx'"` -- all component-level end-to-end cases plus the retry-robustness case pass.
3. `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` -- full suite, 0 failures, actual counts reported in the final summary.
</verification>

<success_criteria>
- [ ] `runUpload` re-throws on hard failure exactly like its sibling methods; nothing in the catch path is silently swallowed.
- [ ] `runUpload`/`startUpload`/`retryUpload` return a real `UploadRunResult` built from locally-tracked outcomes, never from a post-`await` read of React state.
- [ ] `handleUploadClick` shows the success toast and closes the drawer only when every queued file reached `status: 'ready'`.
- [ ] Failed uploads (hard failure or HTTP-200-reported failure, total or partial) leave the drawer open with the failing file(s) and their error message(s)/retry action visible.
- [ ] Retry clicks can never produce an unhandled promise rejection.
- [ ] No setState updater mutates a ref (StrictMode-pure); confirmed by code inspection of every touched updater.
- [ ] Only `@/components/ui` primitives used for any touched/added interactive UI; all user-facing strings use correct German umlauts.
- [ ] Full frontend vitest suite passes with 0 failures; actual measured pre-fix and post-fix counts reported.
- [ ] `.planning/notes/2026-09-02-altlasten-cr01-wr02.md`'s CR-01 section marked resolved; WR-02 section untouched.
</success_criteria>

<output>
Create `.planning/quick/260903-flw-cr-01-fehlgeschlagene-uploads-duerfen-ni/260903-flw-SUMMARY.md` when done
</output>
