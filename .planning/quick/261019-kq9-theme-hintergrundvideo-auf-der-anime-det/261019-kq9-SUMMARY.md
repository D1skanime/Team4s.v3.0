---
phase: 261019-kq9-theme-hintergrundvideo-auf-der-anime-det
plan: 01
subsystem: ui
tags: [frontend, react, vitest, anime-detail, theme-video, navigation]

requires: []
provides:
  - "Navigation-aware guard that prevents navigating link clicks/Enter keydowns from enabling theme video audio"
  - "Immediate theme video stop (mute + pause + unload) on navigation start, unmount, and pagehide"
affects: [anime-detail-page, media-playback]

tech-stack:
  added: []
  patterns:
    - "Pure navigation-detection helpers (resolvesToDifferentLocation, isNavigationLinkTarget, isNavigationTriggerEvent) tested without DOM render simulation, using structural plain-object targets"
    - "Local const-capture of a ref's current value at effect-body start, reused in nested closures and cleanup, to avoid stale-ref React pitfalls and preserve TypeScript narrowing (arrow functions, not function declarations, to keep closures narrowed)"

key-files:
  created: []
  modified:
    - frontend/src/components/anime/themeVideoAudio.ts
    - frontend/src/components/anime/themeVideoAudio.test.ts
    - frontend/src/components/anime/AnimeBackdropRotator.tsx

key-decisions:
  - "Used arrow function expressions (not function declarations) for the window event handlers in the new stop-effect so TypeScript's control-flow narrowing of the locally captured `video` const survives inside the closures (function declarations are hoisted and lose narrowing)."
  - "target=\"_blank\" anchors are excluded from navigation detection since they open a new tab and leave the current page (and its theme video) running."

requirements-completed: []

duration: ~11min
completed: 2026-10-19
---

# Quick Task 261019-kq9: Theme-Hintergrundvideo stoppt Ton sofort bei Navigation Summary

**Navigationsklicks/Enter-Tastendrucke auf Links aktivieren den Theme-Video-Ton nicht mehr; ein laufendes Theme-Video wird bei Navigationsbeginn, Unmount und `pagehide` sofort gemutet, pausiert und entladen.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-10-19T15:01:22Z
- **Completed:** 2026-10-19T15:11:45Z
- **Tasks:** 3/3 completed
- **Files modified:** 3

## Accomplishments
- Added pure, fully unit-tested navigation-detection logic (`resolvesToDifferentLocation`, `isNavigationLinkTarget`, `isNavigationTriggerEvent`) and a `stopThemeVideoPlayback` helper to `themeVideoAudio.ts`.
- Wired `AnimeBackdropRotator.tsx` so the existing audio-activation listener ignores navigating clicks/Enter keydowns, and added a separate effect that stops the theme video immediately on navigation start, component unmount, and `pagehide`.
- Verified full frontend test/typecheck/lint suite in the Docker container and restarted the frontend container.

## Task Commits

Each task was committed atomically (TDD RED -> GREEN):

1. **Task 1: Reine Navigations- und Stopp-Logik in themeVideoAudio.ts + Tests**
   - `350eaf542` test(261019-kq9): add failing tests for navigation-aware theme video audio logic (RED)
   - `63c774854` feat(261019-kq9): add navigation detection and theme video stop logic (GREEN)
2. **Task 2: AnimeBackdropRotator.tsx verdrahtet** - `e8c9f36f8` feat(261019-kq9): stop theme video audio on navigation, unmount, and pagehide
3. **Task 3: Vollstaendige Checks, Recherche testbarer Anime-IDs, Container-Neustart** - no code commit (verification only)

**Plan metadata:** committed separately by the orchestrator.

## Files Created/Modified
- `frontend/src/components/anime/themeVideoAudio.ts` - Added `resolvesToDifferentLocation`, `isNavigationLinkTarget`, `isNavigationTriggerEvent`, `StoppableVideo`, `stopThemeVideoPlayback` alongside the unchanged `shouldRenderEnableAudioButton` (69 lines total).
- `frontend/src/components/anime/themeVideoAudio.test.ts` - Added `describe` blocks covering all behavior cases listed in the plan for the four new functions (19 tests total, all passing).
- `frontend/src/components/anime/AnimeBackdropRotator.tsx` - Audio-activation listener now returns early on navigating events via `isNavigationTriggerEvent`; new independent effect stops the active video (`stopThemeVideoPlayback`) on navigating `pointerdown`/`keydown`, on `pagehide`, and in its own cleanup (covering unmount and `activeThemeVideoUrl`/`showThemeVideo` changes). File grew from 154 to 190 lines, still well under the 450-line project limit.

## TDD Gate Compliance

RED gate confirmed: 15 of the newly added tests failed with `TypeError: ... is not a function` before implementation (ran `npx vitest run src/components/anime/themeVideoAudio.test.ts` against the test-only commit). GREEN gate confirmed: all 19 tests pass after adding the implementation. No REFACTOR commit was needed.

## Verification Results

- `npx vitest run src/components/anime/themeVideoAudio.test.ts` -> 19/19 passed.
- `npx vitest run src/components/anime` -> 7 test files, 53/53 tests passed (jsdom logs `HTMLMediaElement.pause/load not implemented` stderr warnings during an existing unrelated test's unmount cleanup path through the new stop logic; these are expected jsdom limitations, not assertion failures, and do not affect test results).
- `npm run typecheck` -> clean (an initial run showed a stale `.next/dev/types/app/anime/page.ts` type error unrelated to any of the 3 touched files; it disappeared after `docker restart team4sv30-frontend` regenerated the cache).
- `npm run lint` -> the 3 touched files are fully clean (no warnings/errors). The full-repo run still reports 4 pre-existing errors and 223 pre-existing warnings in unrelated files (see `deferred-items.md`), none of which are new or caused by this change.
- `docker restart team4sv30-frontend` -> executed; container back up and serving within ~10s.

## Anime IDs with a theme video for live testing

Queried the live `/api/v1/anime/:id/backdrops` endpoint for all 12 anime currently in the local database. These have a non-empty `theme_videos` array and are suitable for the manual navigation test (click from one of these to another anime card/relation while the theme video is playing with audio enabled, and confirm no audio continues after navigating away):

- **Anime 1** (`/anime/1`) - persisted theme video `/media/anime/1/background_video/.../original.mp4`
- **Anime 2** (`/anime/2`) - theme video via Jellyfin proxy
- Also available: Anime 3, 8, 10, 11, 12 (all have at least one theme video)

Anime 4, 6, 7, 9, 13 have no theme video (`theme_videos: []`) and are not suitable for this test.

Recommended manual test: open `/anime/1`, let the theme video start, click "Ton aktivieren", then click a relation/card link to `/anime/2` (or any of 3/8/10/11/12) before the navigation completes - audio must stop immediately and not resume.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript narrowing lost across function-declaration closures**
- **Found during:** Task 2, initial `tsc --noEmit` run after wiring the new stop-effect.
- **Issue:** The locally captured `const video = themeVideoRef.current` (narrowed to `HTMLVideoElement` after the `if (!video) return undefined` guard) lost its narrowing inside the nested `function onPotentialNavigation(...)` / `function onPageHide(...)` declarations, because TypeScript does not propagate const narrowing into hoisted function declarations. `tsc` reported `HTMLVideoElement | null` is not assignable to `StoppableVideo`.
- **Fix:** Changed both nested handlers from `function` declarations to `const ... = (event) => {...}` arrow function expressions, which preserves the outer narrowing.
- **Files modified:** `frontend/src/components/anime/AnimeBackdropRotator.tsx`
- **Commit:** `e8c9f36f8`

### Out-of-scope items logged (not fixed)

See `.planning/quick/261019-kq9-theme-hintergrundvideo-auf-der-anime-det/deferred-items.md`:
- A flaky, pre-existing test in `DefaultCrewManager.test.tsx` (unrelated file, passes in isolation, intermittently fails only under the full parallel suite run).
- 4 pre-existing lint errors in `capture-responsive.cjs`, `useReleaseVersionMedia.ts`, and `CapabilityDetailRow.tsx` (none of the 3 files touched by this plan).

## Known Stubs

None - no stubs introduced.

## Threat Flags

None - purely client-side UX correction; no new network endpoints, auth paths, file access patterns, or schema changes. Consistent with the plan's threat model (`T-261019-01`, disposition `accept`).

## Self-Check: PASSED

- FOUND: frontend/src/components/anime/themeVideoAudio.ts
- FOUND: frontend/src/components/anime/themeVideoAudio.test.ts
- FOUND: frontend/src/components/anime/AnimeBackdropRotator.tsx
- FOUND commit: 350eaf542
- FOUND commit: 63c774854
- FOUND commit: e8c9f36f8
