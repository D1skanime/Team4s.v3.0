---
phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
plan: 05
subsystem: ui
tags: [react, nextjs, upload, dropzone, vitest, testing-library, release-version-media]

# Dependency graph
requires:
  - phase: 180
    plan: 01
    provides: "UploadDropzone/UploadFileRow presentation primitives"
  - phase: 180
    plan: 02
    provides: "useUploadQueue<TResult>() adapter-parametrized orchestration hook + UploadAdapter<TResult> contract"
  - phase: 180
    plan: 04
    provides: "ReleaseVersionMediaSection.tsx already split into Grid/EditDrawer, at 578 lines, upload cluster intact for this plan to extract"
provides:
  - "ReleaseVersionMediaUploadDrawer.tsx: Weg-1 upload drawer composed from UploadDropzone + UploadFileRow + useUploadQueue, with the Weg-1-specific preview-candidate radio control kept outside the shared primitive"
  - "First proven real consumer of useUploadQueue/UploadAdapter (180-02) and UploadDropzone/UploadFileRow (180-01)"
  - "ReleaseVersionMediaSection.tsx and useReleaseVersionMedia.ts both under the 450-line CLAUDE.md budget (D-06)"
affects: [180-07, 180-08, 180-09, 180-10, 180-11, 180-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Weg-1-specific state (preview-candidate selection, source_revision threading) lives in the per-way drawer component, composed AROUND the shared primitive/hook pair rather than inside it, so other ways (Weg 2+) never inherit a UI control or field their backend has no column for"
    - "A field patched via the generic adapter.patchMetadata path is skipped entirely by useUploadQueue when title+caption are both empty — any per-way state that must survive that skip (here: is_preview_candidate) needs its own follow-up API call made directly by the drawer after startUpload/retryUpload resolves, not folded into patchMetadata's patch object"

key-files:
  created:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaUploadDrawer.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaUploadDrawer.test.tsx
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
  deleted:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaUploadQueue.tsx

key-decisions:
  - "Preview-candidate selection (Weg-1-only, no backend column for Weg 2) is applied via a dedicated follow-up patchReleaseVersionMediaItem call issued by the drawer itself after startUpload/retryUpload resolves, rather than folded into the adapter's patchMetadata — useUploadQueue's internal patchUploadedItem skips calling patchMetadata entirely when the per-item patch object (title/caption only) is empty, so a file with no title/caption would never have gotten its preview flag set if that flag depended on patchMetadata firing"
  - "source_revision for the optimistic-concurrency guard (T-180-10) is tracked in a closure-local useRef<Map<number, number>> inside the drawer, seeded from each upload result and updated from each patch response — exactly the mechanism the plan's interfaces section specified, verified via the live-hook CR-01 test block continuing to pass"
  - "Dropped the old 'disable sibling category buttons while this category's upload is busy' behavior: that required the hook to expose upload-busy state up to the parent, which the plan's architecture intentionally does not do (upload state is now fully internal to the per-open drawer instance). Switching categories mid-upload now simply unmounts the open drawer's queue state; the in-flight request's promise chain still completes and still calls onUploadComplete (reload + toast) since it does not depend on the drawer still being mounted."
  - "ReleaseVersionMediaSection.test.tsx (not in this plan's declared files_modified, but required to stay green per the plan's own verification step) was substantially rewritten: tests that previously asserted against an injected mediaState.startUpload/uploadItems/retryUpload/clearUploadQueue now assert against the real useReleaseVersionMedia hook + mocked @/lib/api, since those fields no longer exist on UseReleaseVersionMediaResult and the drawer talks to the API directly"
  - "Two call sites outside this plan's declared files (frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx and frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx) built UseReleaseVersionMediaResult test fixtures including the now-removed upload fields; trimmed both (Rule 3 — blocking compile error, not a scope change)"

patterns-established:
  - "Pattern: when a per-item generic patch step can be skipped by the orchestration hook for files with no metadata, state that MUST survive that skip belongs in a drawer-level follow-up call after the batch resolves, not inside the adapter's patch closure"

requirements-completed: [D-01, D-02, D-06, D-08, D-09, D-10, D-11, D-12, D-13]

# Metrics
duration: 45min
completed: 2026-10-11
---

# Phase 180 Plan 05: Weg 1 Upload Drawer Rewire Summary

**Rebuilt Weg 1's (release-version media) upload drawer on the shared UploadDropzone + UploadFileRow + useUploadQueue primitives from plans 180-01/02, cutting ReleaseVersionMediaSection.tsx to 398 lines and useReleaseVersionMedia.ts to 365 lines — both now under the 450-line CLAUDE.md budget — while preserving the Weg-1-only preview-candidate selection and the Phase-144 optimistic-concurrency revision guard.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-10-11T19:40:00Z (approx.)
- **Completed:** 2026-10-11T20:06:00Z
- **Tasks:** 2/2
- **Files modified:** 9 (2 created, 6 modified, 1 deleted)

## Accomplishments
- `ReleaseVersionMediaUploadDrawer.tsx` (250 lines) built on `useUploadQueue<ReleaseVersionMediaUploadResult>()` + `UploadDropzone` + `UploadFileRow`, replacing the hand-rolled dropzone/queue markup that previously lived inline in `ReleaseVersionMediaSection.tsx` and in the now-deleted `ReleaseVersionMediaUploadQueue.tsx`.
- Weg-1's preview-candidate radio stays a drawer-local concern (never promoted into `UploadFileRow`), applied via a dedicated follow-up `patchReleaseVersionMediaItem` call after upload/retry resolves — necessary because `useUploadQueue`'s generic metadata-patch step is skipped entirely for files with no title/caption, so folding the preview flag into that path would silently drop it for blank-metadata files.
- `source_revision` threaded through a closure-local `useRef<Map<number, number>>` across upload→patch calls, preserving the Phase-144 lost-update guard (T-180-10) without the generic hook needing to know about it.
- `useReleaseVersionMedia.ts` lost its entire upload/retry/patch-after-upload state machine (`patchUploadedItem`/`runUpload`/`startUpload`/`retryUpload`/`clearUploadQueue`, `uploadItems`, `lastUploadConfigRef`) — 554 → 365 lines. `reload()` stayed exported so the new drawer's `onUploadComplete` can still refresh the persisted grid on success.
- `ReleaseVersionMediaSection.tsx` lost all upload-related state/handlers now owned by the drawer — 578 → 398 lines — and renders `<ReleaseVersionMediaUploadDrawer>` in place of the old inline `<Drawer>` JSX.
- `ReleaseVersionMediaUploadQueue.tsx` deleted outright (fully superseded by `UploadFileRow` + the new drawer's composition); confirmed zero remaining references.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build ReleaseVersionMediaUploadDrawer.tsx on UploadDropzone + UploadFileRow + useUploadQueue** - `dd742a94` (feat)
2. **Task 2: Shrink useReleaseVersionMedia.ts and wire the new drawer into ReleaseVersionMediaSection.tsx** - `4bf2baa5` (feat)

_No TDD RED/GREEN commit split was used — both tasks produced net-new/refactored files with tests written and run together per task, matching this phase's established convention for `tdd="true"` tasks (acceptance-criteria-as-tests structure)._

## Files Created/Modified
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaUploadDrawer.tsx` - new: Weg-1 upload drawer on shared primitives/hook (250 lines)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaUploadDrawer.test.tsx` - new: merge-proof + disabled-upload-button-before-selection tests
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` - upload/retry state machine removed (554 → 365 lines); `reload()`, patch/replace/delete/reorder/highlight untouched
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts` - removed the 10 test blocks that exercised the deleted startUpload/retryUpload/patchUploadedItem cluster; kept the 9 non-upload test blocks unchanged
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` - upload state/handlers removed, renders the new drawer (578 → 398 lines)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx` - upload-flow tests rewritten against the real hook + mocked `@/lib/api` instead of injected `mediaState.startUpload`/`uploadItems`; one test (`cannot switch categories or reset an active upload queue`) and one duplicate (`keeps failed upload retry rows inside the upload sheet`, now covered by the CR-01 block) removed
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx` - removed `statusLabel`/`statusClassName` (dead after the queue file's deletion); `isTerminalStatus` now takes an inline status union instead of importing the removed `UploadQueueItem` type
- `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx` - trimmed the now-nonexistent `uploadItems`/`startUpload`/`retryUpload`/`clearUploadQueue` fields from its `UseReleaseVersionMediaResult` fixture (Rule 3)
- `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` - same trim as above (Rule 3)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaUploadQueue.tsx` - deleted (fully superseded)

## Decisions Made
See `key-decisions` in frontmatter for the full rationale on: (1) the preview-candidate follow-up-call design, (2) `source_revision` threading via a drawer-local ref, (3) dropping the "disable sibling category buttons while busy" behavior, (4) the necessity of rewriting `ReleaseVersionMediaSection.test.tsx` despite it not being in `files_modified`, and (5) the two out-of-plan `page.test.tsx` fixture fixes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rewrote `ReleaseVersionMediaSection.test.tsx`'s upload-flow tests**
- **Found during:** Task 2
- **Issue:** The plan's `files_modified` list did not include this test file, but it imports `UploadQueueItem`/`UploadRunResult` and injects `startUpload`/`retryUpload`/`uploadItems`/`clearUploadQueue` into `mediaState` — all removed from `UseReleaseVersionMediaResult` by this task. Left unchanged, the whole test file would fail to typecheck and its own `<verify>` step (explicitly listed in the plan) would fail.
- **Fix:** Rewrote the affected tests to render the real `useReleaseVersionMedia` hook against the already-mocked `@/lib/api` module (the same pattern the plan's own CR-01 describe block already used), asserting against `api.uploadReleaseVersionMedia`/`api.patchReleaseVersionMediaItem` instead of an injected mediaState function. Removed one test whose entire premise (busy-state-driven category-button disabling) no longer applies to the new architecture, and one duplicate test now fully covered by the CR-01 block.
- **Files modified:** `ReleaseVersionMediaSection.test.tsx`
- **Verification:** All 37 tests in the file pass; `npm run typecheck` clean.
- **Committed in:** `4bf2baa5` (Task 2 commit)

**2. [Rule 3 - Blocking] Trimmed two `page.test.tsx` fixtures outside this plan's declared files**
- **Found during:** Task 2
- **Issue:** `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx` and `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` each build a `UseReleaseVersionMediaResult` fixture that still included `uploadItems`/`startUpload`/`retryUpload`/`clearUploadQueue`, causing `tsc --noEmit` to fail project-wide after the interface change.
- **Fix:** Removed those four fields from both fixtures.
- **Files modified:** `page.test.tsx` (episode-versions edit), `page.test.tsx` (fansubs edit)
- **Verification:** `npm run typecheck` clean across the whole project afterward.
- **Committed in:** `4bf2baa5` (Task 2 commit)

**3. [Rule 1 - Bug] Reset the preview-candidate selection when its file is removed from the queue**
- **Found during:** Task 2, while rewriting `ReleaseVersionMediaSection.test.tsx`'s "removes only the selected draft" test
- **Issue:** First drawer implementation didn't clear `previewFileKey` when the file it referred to was removed via `onRemove`, leaving the "Keine neue Vorschau" radio unchecked after removing the currently-selected preview file — the pre-180-05 code had this reset explicitly (`setPreviewFileKey((current) => current === key ? null : current)`), and the drawer's rewrite had dropped it.
- **Fix:** Added `handleRemoveDraft` wrapping `removeDraft` with the same reset.
- **Files modified:** `ReleaseVersionMediaUploadDrawer.tsx`
- **Verification:** Test passes; `npx tsc --noEmit` and `npx eslint` clean.
- **Committed in:** `4bf2baa5` (Task 2 commit, test caught it before the Task 1 commit landed — fixed in the drawer file touched by Task 2's rewrite pass)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All three were required to keep the full frontend suite green and the plan's own `<verification>` step passing. No scope creep beyond files this plan's interface changes directly broke.

## Issues Encountered
- A hard upload failure (network/5xx) sets the same error message in two places simultaneously — the drawer's own error banner (from `useUploadQueue`'s `error` state) and the affected file's per-row `errorMessage` (both derive from the same thrown `Error`'s message). Two of the rewritten CR-01 tests originally used `screen.getByText(...)` (which throws on ambiguous matches) and had to be changed to `screen.getAllByText(...).length > 0` — this is pre-existing dual-surfacing behavior inherited from the pre-180-05 code (`useReleaseVersionMedia.ts`'s old `runUpload` catch block also set both `error` and the per-item `errorMessage` to the same string), not a regression introduced by this plan.
- Three frontend test files fail when run outside the Linux Docker Compose environment (`badgeArtwork.test.ts` requires `API_INTERNAL_URL`; `RoleCapabilityDetail.membershipBaselineDrift.test.ts` reads an absolute `/backend/...` path; `ResponsiveImage.config.test.ts` fails independent of this plan's changes) — confirmed via `git log` that none of the three files were touched by this plan or any recent related work; pre-existing environment-dependent failures, not caused by this plan.

## Next Phase Readiness
- `useUploadQueue`/`UploadAdapter` (180-02) and `UploadDropzone`/`UploadFileRow` (180-01) now have a real, fully-tested consumer (Weg 1) proving the adapter contract end to end, including the two trickiest cases noted in 180-RESEARCH.md: retry-without-re-upload (`resultId !== null` branch) and per-way state that must live outside the shared hook (preview-candidate, source_revision).
- Both of plan 180-04/180-05's target files (`ReleaseVersionMediaSection.tsx`, `useReleaseVersionMedia.ts`) are now comfortably under the 450-line budget (398 and 365 lines respectively), with margin for future additions.
- No blockers for 180-07 (Weg 2 adoption). The one architecturally-relevant takeaway for 180-07+: if any other way needs its own per-item flag that the generic `patchMetadata` step would skip for metadata-empty files, it will need the same "drawer issues its own follow-up call" pattern established here, not an extension to the shared adapter's `patch` object shape.

## Self-Check: PASSED

- FOUND: `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaUploadDrawer.tsx`
- FOUND: `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaUploadDrawer.test.tsx`
- FOUND: `ReleaseVersionMediaUploadQueue.tsx` correctly absent (deleted)
- FOUND: commit `dd742a94` (Task 1)
- FOUND: commit `4bf2baa5` (Task 2)

---
*Phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend*
*Completed: 2026-10-11*
