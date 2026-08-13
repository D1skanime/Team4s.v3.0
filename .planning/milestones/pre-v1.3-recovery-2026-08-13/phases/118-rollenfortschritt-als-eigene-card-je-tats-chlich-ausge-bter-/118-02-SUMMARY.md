---
phase: 118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-
plan: "02"
subsystem: frontend-ui
tags: [react, carousel, accessibility, pointer, wheel]
requires: [118-01]
provides: [endpoint-safe focal geometry, boundary-aware wheel routing, optional carousel counter]
affects: [118-03, FansubProjectsGrid]
tech-stack:
  added: []
  patterns: [layout-metric snap targets, opt-in shared counter, cleaned native wheel listener]
key-files:
  created: []
  modified:
    - frontend/src/components/ui/FocalCarousel.tsx
    - frontend/src/components/ui/FocalCarousel.module.css
    - frontend/src/components/ui/FocalCarousel.test.tsx
key-decisions:
  - "Snap and nearest-item calculations use offsetLeft/offsetWidth and clamped scroll extents, never transformed rectangles."
  - "The counter is generic and defaults off so FansubProjectsGrid remains unchanged."
requirements-completed: [D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19]
duration: 12min
completed: 2026-08-03
---

# Phase 118 Plan 02: Global Focal Carousel Summary

**The global FocalCarousel now uses endpoint-safe layout geometry, direct pointer and boundary-aware wheel input, bounded release projection, accessible endpoint keys, normalized proximity styling, and an opt-in generic counter.**

## Accomplishments

- Replaced transformed rectangle geometry with clamped offset-based center targets.
- Added vertical/horizontal wheel routing that calls preventDefault only while horizontal movement remains.
- Added sampled pointer velocity with bounded release projection and reduced-motion bypass.
- Added normalized proximity CSS interpolation, Home/End, 44 px arrow targets, and singular/plural counter formatting.
- Preserved the existing render-item, preview/grid, show-all, focus restoration, and counter-off consumer contract.

## Task Commits

1. **Task 1: Add deterministic contract regressions** - `f12732e0` (test)
2. **Task 2: Extend the global carousel state machine** - `f31c8bc2` (feat)

## Files Modified

- `frontend/src/components/ui/FocalCarousel.tsx`
- `frontend/src/components/ui/FocalCarousel.module.css`
- `frontend/src/components/ui/FocalCarousel.test.tsx`

## Deviations from Plan

None - implementation remained in the global component and did not change consumer production code.

## Verification

- Focused FocalCarousel and FansubProjectsGrid Vitest: PASS (8/8).
- Frontend TypeScript typecheck: PASS.
- `git diff --check`: PASS.
- ASVS L1 HIGH T-118-02: listener cleanup is effect-owned; pointer capture remains lifecycle-scoped.
- ASVS L1 HIGH T-118-06: layout targets and nearest calculations use clamped offset geometry.
- FansubProjectsGrid remains the mandatory passing second consumer with its counter off.

## Known Stubs

None.

## Threat Flags

None. No network, auth, file, schema, or persisted-data trust boundary was introduced.

