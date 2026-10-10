---
phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht
plan: 05
subsystem: ui
tags: [react, nextjs, frontend, permissions, defense-in-depth, vitest]

# Dependency graph
requires: []
provides:
  - AnimeJellyfinAssetUploadControls self-resolves is_platform_admin via getCurrentUser() and hides its own cover/banner/logo/background/background-video upload inputs and trigger buttons for non-platform-admins
  - First test file for AnimeJellyfinAssetUploadControls, proving admin-visible, non-admin-hidden, and pre-resolution-hidden states
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Component-level self-fetch of is_platform_admin (fail-closed useState(false) default, cancelled-flag cleanup) as defense-in-depth alongside a page-level <PlatformAdminGate> wrapper, mirroring FansubEditAccessGate.tsx's existing precedent"

key-files:
  created:
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.test.tsx
  modified:
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx

key-decisions:
  - "Scoped the isPlatformAdmin conditional to only the upload-trigger markup (5 hidden file inputs + their trigger/add buttons for cover/banner/logo/background/background_video), leaving remove buttons, persisted-status badges, and provider-preview chrome unconditional — matches D-13's literal wording (pure UI-visibility correction scoped to upload controls, not a rights expansion) and keeps the diff minimal"
  - "Self-fetch via getCurrentUser() in a local useEffect rather than threading a new prop through both call sites (admin/anime/[id]/edit/page.tsx and admin/anime/create/page.tsx) — lower blast radius per 179-RESEARCH.md's Pitfall 4, touches no shared component signature"

requirements-completed: [D-13]

# Metrics
duration: 35min
completed: 2026-10-10
---

# Phase 179 Plan 05: Anime-Asset-Upload-Steuerelemente auf Platform-Admin-Sichtbarkeit gaten Summary

**AnimeJellyfinAssetUploadControls self-resolves is_platform_admin via getCurrentUser() and hides its cover/banner/logo/background/background-video upload controls (not the surrounding card chrome) for non-platform-admins, closing Permission-Matrix row 1.4 (Weg 4) with a defense-in-depth UI check that mirrors the existing backend-only requirePlatformAdminIdentity enforcement.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-10-10T21:58:00Z
- **Completed:** 2026-10-10T22:04:41Z
- **Tasks:** 1
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- `AnimeJellyfinAssetUploadControls.tsx` now self-fetches `getCurrentUser()` on mount (fail-closed `useState(false)` default, `cancelled`-flag cleanup) and conditionally renders the five hidden `<input type="file">` elements plus their corresponding upload-trigger buttons (Cover/Banner/Logo/Background/Background-Video) only when `is_platform_admin` resolves `true`
- The component's two existing page call sites (`admin/anime/[id]/edit/page.tsx` via `AnimeJellyfinMetadataSection.tsx`, and `admin/anime/create/page.tsx`) are unaffected and compile cleanly — no prop signature changes
- `segment_preview`'s own separate authorization path (not present in this component today) remains untouched
- New first test file for this component (`AnimeJellyfinAssetUploadControls.test.tsx`, 3 tests) proves: (1) upload controls render when `is_platform_admin: true`, (2) upload controls are fully absent (`queryBy*` finds nothing, not just visually hidden) when `is_platform_admin: false`, with the component still rendering a non-crashed, non-empty state (asset card headings), and (3) no default-allow flash — upload controls stay absent while `getCurrentUser()`'s promise is still pending

## Task Commits

Each task was committed atomically:

1. **Task 1: Thread a self-fetched isPlatformAdmin flag into AnimeJellyfinAssetUploadControls** - `7f12af27` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx` - Added `isPlatformAdmin` state + `getCurrentUser()`-backed resolution effect; wrapped the 5 hidden file inputs and their trigger buttons (Cover hochladen, Banner/Logo/Background-Video trigger, Background hochladen) in `{isPlatformAdmin ? (...) : null}`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.test.tsx` - New test file (3 tests): admin-visible, non-admin-hidden (via real `queryByRole`, not disabled-attribute checks), pre-resolution-hidden (no flash)

## Decisions Made
- Gated only the upload-trigger inputs/buttons, not the remove buttons or persisted-status/provider-preview chrome — follows the plan's literal "wrap only the upload controls' JSX" instruction and D-13's narrow scope (pure UI-visibility fix, not a rights expansion)
- Used the component-self-fetch pattern (option a from 179-RESEARCH.md's Pitfall 4) instead of threading a new prop through both call sites, matching the precedent in `FansubEditAccessGate.tsx`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. An initial version of the "pending promise" test produced an `act()` warning from React Testing Library because the promise was released outside of `act()`; fixed by wrapping the release in `await act(async () => { ...; await Promise.resolve() })`. This was a test-only correctness fix within the same task, not a deviation from the plan's required behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `AnimeJellyfinAssetUploadControls.tsx` and its test file are both frontend-only, with no backend/contract changes — no coordination needed with any other 179-* plan
- `cd frontend && npm test -- AnimeJellyfinAssetUploadControls` (3/3 passing) and `npm run build` (exit 0) both verified; a broader re-run of `npx vitest run src/app/admin/anime` (55 files / 494 tests) confirmed no regressions in sibling components that render this one

---
*Phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht*
*Completed: 2026-10-10*

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.test.tsx
- FOUND: frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx
- FOUND: commit 7f12af27 in git log
