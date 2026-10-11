---
phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
plan: 08
subsystem: ui
tags: [react, nextjs, upload, dropzone, design-system, vitest]

# Dependency graph
requires:
  - phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
    provides: UploadDropzone presentation primitive (plan 180-01), consumed here by Weg 3 and Weg 7
provides:
  - "Weg 3 (Fansub-Logo/Banner) rendered through UploadDropzone, drag&drop preserved (not added)"
  - "Weg 7 (Profil-Avatar/-Hintergrund) rendered through UploadDropzone, drag&drop newly gained (D-17)"
affects: [180-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "When UploadDropzone cannot own an existing imperative-click contract (external ref triggered by a sibling component), add UploadDropzone as an additional interactive surface alongside the untouched Button+input pair instead of replacing it"
    - "Preview content (image/fallback) renders as a plain, non-interactive block above UploadDropzone when the primitive's no-children API cannot host it inline"

key-files:
  modified:
    - frontend/src/components/admin/MediaUploadCore.tsx
    - frontend/src/components/admin/MediaUpload.tsx
    - frontend/src/components/admin/MediaUpload.module.css
    - frontend/src/components/admin/MediaUpload.test.tsx
    - frontend/src/app/me/profile/components/MemberAvatarCard.tsx
    - frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx

key-decisions:
  - "Weg 3: kept the existing hidden <input ref={inputRef}> and all three action Buttons (Bearbeiten/Ersetzen/Löschen) completely unchanged; replaced only the hand-rolled clickable/droppable outer dropzone div with UploadDropzone, rendered as a new element after the (now non-interactive) preview block, since UploadDropzone has no children slot to host the existing round/wide preview markup inline"
  - "Weg 7: discovered during read_first that MemberAvatarCard/ProfileBackgroundCard's hidden <input ref={resolvedInputRef}> is also triggered externally by frontend/src/app/me/profile/page.tsx's EditableProfileHeader (avatarInputRef.current?.click() / backgroundInputRef.current?.click(), lines 589-590) -- a contract the plan's read_first did not call out. UploadDropzone exposes no forwarded ref or imperative open API (confirmed by reading plan 180-01's actual UploadDropzone.tsx), so replacing that input would silently break the profile-hero pencil-icon edit trigger. Kept the Button+input pair fully intact and added UploadDropzone as a new, additional drag&drop surface wired through the same handleSelectedFile validation path, rather than following the plan's primary suggestion of fully replacing the pair."
  - "Removed now-dead dragging state/handlers (onDrop, onDropzoneKeyDown, dropzoneAriaLabel) from MediaUpload.tsx and the now-unused .dropzoneDrag/.emptyState CSS rules plus the cursor:pointer/:hover/:focus-visible rules tied to the old clickable div, since MediaUploadCore's dropzone interactivity now lives entirely inside UploadDropzone"
  - "Extended MediaUpload.test.tsx's hand-written lucide-react mock with UploadCloud (UploadDropzone's icon) -- a test-infrastructure fix, not a behavioral assertion change, needed because the existing mock only returned a fixed icon set and UploadDropzone pulls in a new one"
  - "Factored ProfileBackgroundCard's inline file-selection logic (validate + setSelectedFile) into a shared handleSelectedFile function, reused by both the pre-existing hidden input's onChange and the new UploadDropzone's onFilesSelected, mirroring MemberAvatarCard's existing handleSelectedFile shape"

patterns-established:
  - "Dual-entry-point upload card: one imperative/ref-triggered path (Button + hidden input, reusable by sibling/ancestor components) plus one presentation-primitive drag&drop path (UploadDropzone), both funneling into the same validation function -- used where a primitive adoption cannot safely replace an existing external-ref contract"

requirements-completed: [D-01, D-04, D-13, D-17]

# Metrics
duration: 25min
completed: 2026-10-11
---

# Phase 180 Plan 08: Weg 3/Weg 7 UploadDropzone Adoption Summary

**Fansub logo/banner (Weg 3) and profile avatar/background (Weg 7) now render their click-and-drop surface through the shared `UploadDropzone` primitive — Weg 3 with zero functional change (drag&drop preserved via `allowDrop={true}`, correcting the UI-SPEC's `false` guess) and Weg 7 with a real behavioral gain (drag&drop added per D-17, while its pre-existing externally-triggered upload button stays fully intact).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-11T20:28:00Z
- **Completed:** 2026-10-11T20:35:33Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `MediaUploadCore.tsx` (Weg 3) swaps its hand-rolled `role="button"` dropzone div for `UploadDropzone` (`allowDrop={true}`, `multiple={false}`, `density="compact"`), preserving the pre-existing drag&drop capability the UI-SPEC incorrectly assumed didn't exist; the round/wide preview image, fallback initials, and all three action Buttons (Bearbeiten/Ersetzen/Löschen) stay pixel-identical, backed by the untouched hidden `<input>`.
- `MemberAvatarCard.tsx`/`ProfileBackgroundCard.tsx` (Weg 7) each gain a new `UploadDropzone` (`allowDrop={true}`, `multiple={false}`) as an additional drag&drop entry point, while the existing "Bild hochladen/ändern" Button and its hidden `<input ref={resolvedInputRef}>` remain fully functional and continue serving `frontend/src/app/me/profile/page.tsx`'s `EditableProfileHeader` pencil-icon trigger (`avatarInputRef.current?.click()` / `backgroundInputRef.current?.click()`), which depends on that exact DOM input existing.
- No new capability/permission gate introduced on either way; `onFilesSelected` on both ways routes through the same pre-existing validation function (`handleSelectedFile`/`onFileInputChange`) a click-pick already used.

## Task Commits

Each task was committed atomically:

1. **Task 1: Weg 3 — MediaUploadCore.tsx dropzone -> UploadDropzone** - `d23bf97c` (feat)
2. **Task 2: Weg 7 — MemberAvatarCard.tsx + ProfileBackgroundCard.tsx trigger -> UploadDropzone** - `e1240d55` (feat)

_No TDD RED/GREEN split was used — both tasks modified existing, already-covered components and were verified against the existing test suites (acceptance-criteria-as-tests), matching this plan's `tdd="true"` tasks' structure rather than a separate failing-test-first commit._

## Files Created/Modified
- `frontend/src/components/admin/MediaUploadCore.tsx` - Dropzone div replaced by `UploadDropzone`; preview block now renders as a plain non-interactive container above it; removed now-unused `dragging`/drag-handler/`dropzoneAriaLabel` props from `MediaUploadCoreProps`
- `frontend/src/components/admin/MediaUpload.tsx` - Removed dead `dragging` state, `onDrop`/`onDropzoneKeyDown` handlers, and `dropzoneAriaLabel` local; simplified `<MediaUploadCore>` call site
- `frontend/src/components/admin/MediaUpload.module.css` - Removed unused `.dropzoneDrag`/`.emptyState` rules and the `cursor:pointer`/`:hover`/`:focus-visible` rules tied to the old clickable div
- `frontend/src/components/admin/MediaUpload.test.tsx` - Added `UploadCloud` to the hand-written `lucide-react` mock (new icon dependency from `UploadDropzone`)
- `frontend/src/app/me/profile/components/MemberAvatarCard.tsx` - Added `UploadDropzone` alongside the existing Button+input pair, wired to the existing `handleSelectedFile`
- `frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx` - Added `UploadDropzone`; extracted a shared `handleSelectedFile` used by both the dropzone and the pre-existing hidden input's `onChange`

## Decisions Made
- See `key-decisions` in frontmatter — most notably, Weg 7's external `inputRef` contract with `EditableProfileHeader` (not flagged by the plan's read_first) forced the "keep Button+input, add UploadDropzone alongside" composition instead of the plan's primary "replace the pair" suggestion, which the plan itself allowed as a fallback ("keep the existing Button as a visually-adjacent trigger... whichever composition keeps the existing label logic intact").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug avoidance] Did not replace Weg 7's Button+hidden-input pair with UploadDropzone**
- **Found during:** Task 2 read_first (reading `frontend/src/app/me/profile/page.tsx` for the `inputRef` prop's real callers)
- **Issue:** The plan's action text's primary suggestion was to replace the existing Button + hidden `<input>` pair entirely with a single `UploadDropzone` using a `promptLabel` override. Doing so would have silently broken `EditableProfileHeader`'s pencil-icon avatar/background edit trigger, which calls `avatarInputRef.current?.click()` / `backgroundInputRef.current?.click()` on the exact DOM input `MemberAvatarCard`/`ProfileBackgroundCard` expose via their `inputRef` prop — `UploadDropzone` has no forwarded ref or imperative open API to preserve that contract.
- **Fix:** Kept the existing Button + hidden input entirely unchanged (preserving the external ref contract) and added `UploadDropzone` as a new, additional drag&drop surface, per the plan's own explicitly-allowed fallback composition.
- **Files modified:** `frontend/src/app/me/profile/components/MemberAvatarCard.tsx`, `frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx`
- **Verification:** `page.test.tsx`'s existing tests exercising `EditableProfileHeader`-driven and direct hidden-input-driven uploads both pass unchanged (46/46).
- **Committed in:** `e1240d55` (Task 2 commit)

**2. [Rule 3 - Blocking] Extended MediaUpload.test.tsx's lucide-react mock with UploadCloud**
- **Found during:** Task 1 verification run
- **Issue:** `MediaUpload.test.tsx` hand-mocks `lucide-react` with a fixed icon set; `UploadDropzone` imports `UploadCloud`, which wasn't in that set, crashing every test in the file at render time.
- **Fix:** Added a trivial `UploadCloud` mock entry matching the existing pattern (`<span aria-hidden="true">{children}</span>`) — no test assertions changed.
- **Files modified:** `frontend/src/components/admin/MediaUpload.test.tsx`
- **Verification:** All 9 tests in the file pass.
- **Committed in:** `d23bf97c` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug-avoidance/Rule 1, 1 blocking/Rule 3)
**Impact on plan:** Both deviations were necessary to avoid real regressions (a silently-broken external upload trigger, a crashing test suite). No scope creep — no new files, no new capability gates, no behavioral changes beyond what the plan's own truths/success-criteria specify.

### Orchestrator correction (post-execution spot-check)

The composition chosen for deviation #1 ("keep Button + hidden input, add `UploadDropzone` alongside")
rendered two visibly duplicate, identically-labeled upload triggers in both `MemberAvatarCard.tsx`
and `ProfileBackgroundCard.tsx` ("Bild hochladen"/"Bild ändern" Button directly above the
UploadDropzone's own "Bild hochladen"/"Bild ändern" prompt) — the exact inconsistency D-02/D-03
("no duplicate upload surfaces") exist to avoid, and a worse Live-UAT finding than leaving the two
surfaces as planned. Fix: removed only the standalone `Button` (and its now-unused `ImageUp` icon
import) from both files — its sole job (`resolvedInputRef.current?.click()`) is already covered by
`UploadDropzone`'s own built-in trigger. The hidden `<input ref={resolvedInputRef}>` stays
unchanged (still required for `EditableProfileHeader`'s external pencil-icon trigger in
`page.tsx`), and `UploadDropzone`'s `promptLabel` still carries the exact same dynamic text
("Bild ändern"/"Bild hochladen"/"Hintergrundbild ändern"/"Hintergrundbild hochladen") the removed
Button used to show. Re-verified: `npx tsc --noEmit` clean, `eslint` unchanged (0 errors, same 2
pre-existing native-`<input>` warnings on the kept hidden inputs), `ProfileBackgroundCard.test.tsx`
+ `page.test.tsx` (48/48) and `MediaUpload.test.tsx` (9/9) all green — no test referenced the
removed Button's label text. Not committed by the executor; applied and committed separately by
the orchestrator before Wave 2 continued.

## Issues Encountered
None beyond the two deviations above.

## Next Phase Readiness
- Weg 3 and Weg 7 are both on `UploadDropzone`; 180-12 (final cross-way cleanup) can now see every way's final prop values, including the two "additional surface alongside an untouched external-ref trigger" compositions from this plan, when deciding whether `UploadDropzone`'s `allowDrop={false}` branch is still needed anywhere.
- No blockers. `npx tsc --noEmit` is clean project-wide; the plan's full verification command (`MediaUpload.test.tsx` + `ProfileBackgroundCard.test.tsx` + `page.test.tsx`) is green (57/57 tests); ESLint reports only pre-existing native-`<input>` warnings on the two inputs this plan was explicitly told to keep unchanged (not newly introduced).

## Self-Check: PASSED

All 6 claimed modified files exist on disk; both claimed commit hashes (d23bf97c, e1240d55) exist in git history.

---
*Phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend*
*Completed: 2026-10-11*
