---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 12
subsystem: ui
tags: [nextjs, image-optimization, config, vitest]

# Dependency graph
requires:
  - phase: 173 (173-04, in-progress)
    provides: the /media/fansub/<group_id>/... public media namespace this config entry targets
provides:
  - "frontend/next.config.mjs images.localPatterns entry for /media/fansub/**"
  - "frontend/next.config.mjs images.qualities now includes 85 alongside 75"
  - "regression test proving the new namespace is allow-listed and /media/admin/** stays rejected"
affects: [173-13, 173-14, 173-15]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Narrow per-namespace localPatterns entries (T-143-07-01 precedent) instead of a blanket /media/** wildcard"

key-files:
  created: []
  modified:
    - frontend/next.config.mjs
    - frontend/src/components/ui/ResponsiveImage.config.test.ts

key-decisions:
  - "qualities: [75, 85] keeps 75 for existing consumers while adding 85 as the D-02 quality floor the 173-13/173-14/173-15 display-sourced public components will pass explicitly."
  - "Used a dedicated /media/fansub/** entry (not a widened /media/** wildcard) to preserve the narrow-allowlist discipline already established for anime/profile/release-version namespaces."

patterns-established:
  - "Pattern: new backend-produced public media namespaces get both a dedicated localPatterns entry and a positive+negative pair of regression assertions in ResponsiveImage.config.test.ts."

requirements-completed: [REQ-173-13, REQ-173-14]

# Metrics
duration: 6min
completed: 2026-10-02
---

# Phase 173 Plan 12: Next.js fansub media localPatterns + quality=85 config Summary

**Added a dedicated `/media/fansub/**` localPatterns allow-list entry and `qualities: 85` to `next.config.mjs`, with regression tests proving both.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-10-02T16:49:00Z
- **Completed:** 2026-10-02T16:55:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- `images.localPatterns` now recognizes the 173-04 `/media/fansub/<group_id>/...` namespace without widening the allow-list to all of `/media/**`.
- `images.qualities` now includes `85` (D-02 quality floor) alongside the existing `75`, ready for `173-13/173-14/173-15` to pass `quality={85}` on `ResponsiveImage`.
- `ResponsiveImage.config.test.ts` gained a positive/negative regression pair for the new namespace and an extended qualities assertion.

## Task Commits

Each task was committed atomically (TDD: test → feat):

1. **Task 1 (RED): failing test for /media/fansub + qualities=85** - `d8124822` (test)
2. **Task 1 (GREEN): next.config.mjs localPatterns + qualities update** - `f3d9038b` (feat)

**Plan metadata:** commit pending (docs: complete plan)

## Files Created/Modified
- `frontend/next.config.mjs` - Added `/media/fansub/**` to `images.localPatterns`; changed `images.qualities` from `[75]` to `[75, 85]`.
- `frontend/src/components/ui/ResponsiveImage.config.test.ts` - Added a test asserting `/media/fansub/42/logo-xyz.png` matches and `/media/admin/private/original.jpg` is still rejected; extended the qualities bounds test to also assert `toContain(85)`.

## Decisions Made
- Followed the plan's exact interface spec (pathname entry placement, comment convention, test placement in the same `describe` block) with no deviation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Local `frontend/node_modules` is not installed on the host (vitest unresolved via `npx` locally); ran the verification test inside the already-running `team4sv30-frontend` Docker container (`docker exec -w /app team4sv30-frontend npx vitest run ...`) instead, consistent with the project's Docker Compose canonical dev environment. No code impact.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `173-13/173-14/173-15` can now wire `ResponsiveImage` with `quality={85}` against `/media/fansub/**` URLs once `173-04`'s backend write path exists; this plan's config/test changes are independent of `173-04`'s completion status and do not block on it.
- No blockers.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*

## Self-Check: PASSED

- FOUND: frontend/next.config.mjs
- FOUND: frontend/src/components/ui/ResponsiveImage.config.test.ts
- FOUND commit: d8124822
- FOUND commit: f3d9038b
