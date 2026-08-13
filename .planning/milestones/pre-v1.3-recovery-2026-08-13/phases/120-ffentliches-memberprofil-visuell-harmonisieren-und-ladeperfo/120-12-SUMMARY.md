---
phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
plan: "12"
subsystem: ui
tags: [react, next-image, responsive-images, horizontal-scroll, accessibility, focal-carousel]
requires:
  - phase: 119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha
    provides: Badge collection cards, role progression, and authorized overlap snapshot
  - phase: 120-05
    provides: ResponsiveImage optimization and original-display fallback
  - phase: 120-06
    provides: Deferred FocalCarousel interaction contract
provides:
  - Six underlined badge category headings with collection-card H3 hierarchy
  - Visible mouse, trackpad, and touch scrolling for compact badge stage strips
  - Responsive optimized badge delivery with stable deferred-carousel skeleton geometry
affects: [public-member-profile, badge-collections, image-delivery, phase-120-final-verification]
tech-stack:
  added: []
  patterns: [non-passive inner wheel rail, ResponsiveImage size classes, deferred carousel skeleton overlay]
key-files:
  created:
    - .planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/evidence/120-12-task1-overlap.json
    - .planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/evidence/120-12-task2-overlap.json
  modified:
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
key-decisions:
  - "Use a native non-passive wheel listener only on compact stage strips so vertical wheel input becomes horizontal movement while the strip can advance."
  - "Keep full badge markup in SSR and overlay aria-hidden geometry until the shared FocalCarousel activates near the viewport."
patterns-established:
  - "Compact badge art declares the 72/96 responsive size class; active art declares 248/280/320."
  - "Focused and unfocused artwork share one reserved box per breakpoint; focus changes decoration, not dimensions."
requirements-completed: [D-07, D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19, D-20, D-21]
duration: 20min
completed: 2026-08-04
---

# Phase 120 Plan 12: Optimized Badge Collections Summary

**Six semantic badge categories now retain complete SSR content while offering visibly scrollable compact stages and responsive WebP delivery without focus-driven layout shifts.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-08-04T15:43:59Z
- **Completed:** 2026-08-04T16:03:28Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Promoted every nonempty badge category to an underlined H2 while preserving category order, counters, rank truth, and H3 collection titles.
- Kept compact stage rails within the page width and made their horizontal scrollbar visible; touch, trackpad, and mouse-wheel input now move the inner rail reliably.
- Routed static badge art through `ResponsiveImage`, verified WebP/alpha/cache/original fallback, and reserved fixed 320/280/248 active-art geometry.
- Deferred both badge carousel interaction sites through the shared global observer and added aria-hidden, pointer-free skeleton overlays without removing SSR markup.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Define badge heading hierarchy** - `f62be997` (test)
2. **Task 1 GREEN: Promote badge category hierarchy** - `687a0370` (feat)
3. **Task 2 RED: Define optimized scrollable badge strips** - `e3ddf2c0` (test)
4. **Task 2 GREEN: Optimize scrollable badge collections** - `7847eb73` (feat)

## Files Created/Modified

- `frontend/src/components/profile/MemberBadgeChain.tsx` - Semantic headings, shared deferred carousel opt-in, responsive images, skeleton markup, and non-passive wheel mapping.
- `frontend/src/components/profile/MemberBadgeChain.module.css` - Visible strip scrollbar, containment, stable art geometry, and skeleton dimensions.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - Heading, scroll-input, overflow, image-size, SSR, and listener regression coverage.
- `evidence/120-12-task1-overlap.json` - Immutable Task 1 overlap-chain proof.
- `evidence/120-12-task2-overlap.json` - Immutable Task 2 overlap-chain proof.

## Decisions Made

- A native `{ passive: false }` listener is scoped to each compact stage strip because React's delegated wheel path cannot reliably cancel vertical page scrolling; it yields to the page at rail boundaries.
- Existing `ResponsiveImage` is imported from its owning module because the UI barrel does not export it; no duplicate image component was introduced.
- Badge PNG sources remain untouched. Responsive WebP is delivered by the existing Next optimizer, with the component's one-shot original PNG display fallback preserving geometry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Made mouse-wheel cancellation effective**
- **Found during:** Task 2 focused regression gate
- **Issue:** React's delegated wheel event updated the rail but did not reliably cancel native vertical scrolling.
- **Fix:** Attached a scoped native non-passive wheel listener and retained page scrolling when the rail cannot move further.
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.tsx`, `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- **Verification:** Native cancelable wheel regression passes and advances `scrollLeft` from 20 to 100.
- **Committed in:** `7847eb73`

---

**Total deviations:** 1 auto-fixed bug
**Impact on plan:** The correction is required for the requested mouse-wheel behavior and stays inside the compact stage-strip seam.

## Issues Encountered

- The scoped production typecheck reaches only the pre-existing `src/components/ui/ResponsiveImage.config.test.ts(4,24)` TS7016 error for the missing `next.config.mjs` declaration. All Task 2 TypeScript errors were corrected before the final run.
- The focused carousel suite emits its existing React `act(...)` warning in `FocalCarousel.test.tsx`; all 71 assertions pass.

## Verification

- `MemberBadgeChain.test.tsx` + `FocalCarousel.test.tsx`: 71/71 passed.
- Phase 120 production image probe: passed all five URL classes, required 128/160/512/640 widths, alpha preservation, cache hit, and original fallback.
- Typecheck: Task 2 files clean; blocked only by the inherited missing declaration noted above.
- `git diff --check`: passed.
- Task 1 and Task 2 immutable overlap manifests: passed.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for Phase 120 final member-profile UAT at `/members/csubs-leader`, including narrow-viewport scrollbar visibility and page-width containment.
- The inherited `next.config.mjs` declaration gap remains available for a separate narrow tooling cleanup.

## Self-Check: PASSED

All declared files and commits exist; no blocking stubs or unexpected deletions were found.

---
*Phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo*
*Completed: 2026-08-04*
