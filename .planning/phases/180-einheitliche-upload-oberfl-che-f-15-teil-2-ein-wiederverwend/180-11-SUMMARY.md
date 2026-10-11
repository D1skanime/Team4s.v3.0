---
phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
plan: 11
subsystem: ui
tags: [react, nextjs, upload, dropzone, anime-admin, drag-drop, vitest]

# Dependency graph
requires:
  - phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
    plan: "01"
    provides: UploadDropzone presentation primitive (click + drag&drop + keyboard, single-slot slicing via sliceToSingleFileIfNeeded, multiFileOnSingleSlotWarning default text)
provides:
  - "Weg 4 (Anime-Assets: Cover/Banner/Logo/Background/Background-Video) now has real drag&drop on all five slots, not just click-to-pick"
affects: [180-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared renderPersistedBody code paths (banner/logo/background_video) keep a single UploadDropzone JSX call site per shared branch, matching the pre-existing shared-button architecture rather than duplicating markup per slot"

key-files:
  modified:
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.test.tsx

key-decisions:
  - "Kept the pre-existing shared render branch for banner/logo/background_video (one JSX call site handling three slots) instead of duplicating markup three times to hit a literal grep count — the task's own <action> text explicitly says 'do not change the gating structure, only what renders inside it', and duplicating code to satisfy a text-search heuristic would directly violate that instruction and this repo's modularity constraint"
  - "background_video's UploadDropzone keeps accept=\"video/mp4,video/webm,video/ogg\" (not image/*) per the pre-existing hidden-input's accept attribute and EDIT_UPLOAD_TARGETS.background_video's actual asset type — confirmed by reading animeJellyfinAssetUpload.ts before wiring"
  - "Removed the single isPlatformAdmin-gated wrapper that previously surrounded all five hidden <input type=\"file\"> elements, since those inputs no longer exist (each UploadDropzone now owns its own internal file input) — this is pure plumbing removal, not a visible-UI gate removal; see Deviations"

requirements-completed: [D-01, D-04, D-13, D-16, D-17]

# Metrics
duration: ~25min
completed: 2026-10-11
---

# Phase 180 Plan 11: Weg 4 Anime-Asset Slots Drag&Drop Summary

**All five Anime-Asset slots (Cover, Banner, Logo, Background, Background-Video) now render through `UploadDropzone` with real drag&drop, keeping the exact pre-existing `isPlatformAdmin` display gate and single-file-per-slot handler wiring, while fixing a pre-existing design-system violation (raw `<button className={styles.button}>` triggers) as a direct side effect.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-10-11
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced all five native `<input type="file">` + raw-`<button>` trigger pairs (cover, banner, logo, background, background_video) with `UploadDropzone` instances, each still calling the exact same existing handler (`handleCoverUpload` / `handleManualUpload(target, file)`) with a single `File`.
- Each `UploadDropzone` keeps the identical `isPlatformAdmin`-gated conditional the old button lived inside, and the identical `isBusy` (`disabled || isMutatingAssets || isUploadingCover`) disable expression.
- `background_video`'s dropzone correctly keeps `accept="video/mp4,video/webm,video/ogg"` (confirmed via `animeJellyfinAssetUpload.ts` and the pre-existing hidden input's `accept`, not hardcoded to `image/*` like the other four slots).
- D-16's locked multi-file warning (`multiFileOnSingleSlotWarning`) is used via `UploadDropzone`'s own default — not overridden, not re-implemented as a separate toast.
- Removed now-dead `coverInputRef`/`bannerInputRef`/`logoInputRef`/`backgroundInputRef`/`backgroundVideoInputRef` refs and the `triggerUpload`/`triggerCoverUpload` click-proxy functions, since `UploadDropzone` owns its own internal file input.
- Extended `AnimeJellyfinAssetUploadControls.test.tsx` with three new, really-executed tests: a single-file drop on the cover slot calling the upload mock once with that file; a two-file drop on the cover slot calling the upload mock once with only `files[0]` plus the visible D-16 warning text; and a non-platform-admin render asserting absence of all five `UploadDropzone` trigger roles (cover/banner/logo/background/background_video), not just two as before.

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace all five upload triggers with UploadDropzone + wire the D-16 multi-file guard** - `d3527d7b` (feat)
2. **Task 2: Extend AnimeJellyfinAssetUploadControls.test.tsx for drag&drop + multi-file-on-single-slot** - `b56cb956` (test)

## Files Modified
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx` - Five `UploadDropzone` instances replacing five native-input/button trigger pairs; dead refs and trigger functions removed
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.test.tsx` - Three new drag&drop / multi-file-guard / non-admin-gating tests, following the file's existing `vi.mock('@/lib/api', ...)` convention

## Decisions Made
- Preserved the pre-existing shared render branch covering banner/logo/background_video as a single JSX call site rather than duplicating the `UploadDropzone` markup three times — the plan's own Task 1 `<action>` text explicitly instructs not to change the gating/render structure, only what renders inside each conditional, and the project's 450-line modularity constraint disfavors introducing duplicate markup purely to satisfy a text-search count.
- Kept `background_video`'s `accept` attribute as a genuine video MIME list, distinct from the other four image slots, matching the pre-existing hidden input and `EDIT_UPLOAD_TARGETS.background_video`'s asset type.

## Deviations from Plan

### Acceptance-criteria text vs. actual architecture (documented, not a bug)

**1. `grep -c "UploadDropzone"` reports 4, not "at least 5"**
- **Found during:** Task 1 verification
- **Issue:** The plan's acceptance criteria assumed one literal `UploadDropzone` JSX call site per slot (5 total). The pre-existing component architecture already shared one render branch (`renderPersistedBody`'s default case) across banner/logo/background_video — the *old* trigger `<button>` for those three slots was likewise a single JSX call site, not three. Grep-counting source lines therefore yields: 1 import line + 1 cover call site + 1 background call site + 1 shared banner/logo/background_video call site = 4 lines matching `"UploadDropzone"` (verified with `grep -no`), while 5 slots are genuinely rendered through `UploadDropzone` at runtime.
- **Resolution:** Did not duplicate markup to force the literal count to 5, since doing so would (a) directly violate Task 1's own `<action>` instruction to not change the gating/render structure, only what renders inside it, and (b) reintroduce the exact kind of per-slot-exception duplication the project's modularity constraint and D-16's "generic, not pile of slot-specific exceptions" intent are meant to avoid. The real behavioral guarantee — all five slots individually gated and wired through `UploadDropzone` — is proven directly by Task 2's non-platform-admin test, which explicitly queries for all five slot labels (`Cover hochladen`, `Banner hochladen`, `Logo hochladen`, `Background hochladen`, `Background-Video hochladen`) and asserts none render.
- **Files:** No additional files changed; this is a verification-methodology note only.

**2. `isPlatformAdmin ? (` gate count went from 7 to 6, not "same as before"**
- **Found during:** Task 1 verification
- **Issue:** Before this task, 7 `isPlatformAdmin ? (` conditionals existed: 6 wrapped individually-rendered, user-visible trigger/remove buttons (cover-upload, cover-remove, background-gallery-per-item-remove, background-upload, banner/logo/background_video-upload (shared), banner/logo/background_video-remove (shared)), and 1 wrapped the block of five hidden `<input type="file">` elements (pure plumbing, never itself rendered as visible UI). Task 1's own `<action>` text explicitly instructs removing these five inputs once no code path calls `.current?.click()` on them. Removing the now-pointless inputs-wrapper gate along with the inputs it wrapped reduces the literal count to 6.
- **Resolution:** Did not keep a dead, empty `isPlatformAdmin ? (...) : null` wrapper around nothing just to preserve a literal count. The threat model's actual mitigation goal (T-180-20: drag&drop never becomes reachable without the same gate the click flow already required) is satisfied — all 6 remaining gates correspond 1:1 to the 6 pre-existing user-visible-surface gates, and the new Task 2 non-admin test independently proves none of the five `UploadDropzone` dropzones (the actual reachable surface) render for a non-platform-admin user.
- **Files:** `AnimeJellyfinAssetUploadControls.tsx`

No functional deviations. No Rule 1-4 auto-fixes were needed; both items above are plan-acceptance-criteria-wording notes rather than code defects, documented here per the deviation-tracking requirement.

## Issues Encountered
None beyond the two documented acceptance-criteria wording notes above.

## Verification
- `npm --prefix frontend run typecheck` — clean.
- `cd frontend && npx vitest run src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.test.tsx` — 7/7 tests passed (4 pre-existing D-13 tests + 3 new D-16/D-17 tests).
- `cd frontend && npx eslint ...AnimeJellyfinAssetUploadControls.tsx ...test.tsx` — 0 errors, 4 pre-existing warnings (3 `no-img-element`, 1 unused `isBackgroundVideo` variable — none introduced by this plan, out of scope per the deviation rules' scope boundary).
- `grep -n 'type="file"'` on the modified file — no matches (all five native inputs removed).
- Manual diff review confirms only the five upload-trigger buttons were touched; the separate Entfernen/Öffnen/delete buttons remain untouched native `<button>`/`<a>` elements, consistent with 180-PATTERNS.md's explicit scope note referenced in the plan.

## Next Phase Readiness
- Weg 4's five Anime-Asset slots are now consistent with every other way's `UploadDropzone` adoption (180-02 through 180-10) for 180-12's final cross-way consolidation pass (e.g. revisiting whether `allowDrop`'s `false` branch is still needed anywhere).
- No blockers.

## Self-Check: PASSED

Verified `AnimeJellyfinAssetUploadControls.tsx` and `AnimeJellyfinAssetUploadControls.test.tsx` exist on disk with the expected changes, and both commit hashes (`d3527d7b`, `b56cb956`) exist in git history (`git log --oneline -5` above).

---
*Phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend*
*Completed: 2026-10-11*
