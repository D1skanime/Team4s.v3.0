---
phase: quick-260805-7lu
plan: "01"
subsystem: ui
tags: [react, focal-carousel, accessibility, reduced-motion, request-animation-frame, vitest, docker]
status: awaiting-human-verification
requires:
  - phase: 120-06
    provides: Deferred shared FocalCarousel interaction and settle state machine
  - phase: 120-12
    provides: Stable badge geometry and responsive cached WebP delivery
provides:
  - Deterministic interpolated arrow-button navigation under prefers-reduced-motion
  - Deterministic carousel-level ArrowLeft, ArrowRight, Home, and End navigation under prefers-reduced-motion
  - Reduced-motion regression coverage for intermediate positions, retargeting, cleanup, and settled-only activation
affects: [FocalCarousel, public-member-profile, badge-collections, fansub-projects]
tech-stack:
  added: []
  patterns: [reduced-motion-only rAF interpolation within existing pending-target settle path]
key-files:
  created: []
  modified:
    - frontend/src/components/ui/FocalCarousel.tsx
    - frontend/src/components/ui/FocalCarousel.module.css
    - frontend/src/components/ui/FocalCarousel.test.tsx
key-decisions:
  - "Treat only arrow-button and carousel-level keyboard focusItem calls as deliberate smooth navigation; preference-change reconciliation remains immediate."
  - "Use a bounded 280 ms ease-out interpolation under reduced motion because Chromium collapses native smooth scrolling for that preference."
  - "Suspend mandatory scroll snap only while the reduced-motion interpolation owns the track, then restore it before settling."
  - "Calculate programmatic targets and settled proximity from live track-relative rectangles, falling back to offsets only without layout geometry."
patterns-established:
  - "Reduced motion remains authoritative for pointer momentum and preference changes, while explicit carousel commands use a cancellable component-owned interpolation."
  - "Programmatic reduced-motion interpolation and pointer dragging use separate temporary snap-suppression classes."
requirements-completed: []
duration: 34min
completed: 2026-08-05
---

# Quick Task 260805-7lu: Reduced-Motion FocalCarousel Navigation Summary

**FocalCarousel arrow and carousel-level keyboard commands now use live track-relative targets with a snap-free, cancellable 280 ms rAF interpolation before the existing 160 ms settle path under reduced motion.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-08-05T05:36:00Z
- **Automation completed:** 2026-08-05T06:09:51Z
- **Tasks:** 2/3 complete; Task 3 awaits blocking live tablet verification
- **Files modified:** 5

## Accomplishments

- Deliberate arrow-button and carousel-level ArrowLeft/ArrowRight/Home/End commands use native smooth scrolling normally and deterministic 280 ms ease-out interpolation when reduced motion would suppress native movement.
- The interpolator advances through measurable intermediate `scrollLeft` values, retargets from the current physical position, and cancels on wheel, pointer input, preference changes, or unmount.
- Narrow role cards now constrain their grid and children to the real focal-item width without altering shared carousel geometry.
- General collection family cards now use the same definite-grid containment while preserving the internal stage rail and separate special-award layout.
- Mandatory scroll snapping is suspended only while that reduced-motion interpolator owns the track and is restored before the final settle; pointer dragging keeps its independent `.dragging` policy.
- Programmatic targets and nearest-card reconciliation use viewport rectangles in one coordinate space, eliminating the 52 px overshoot that native snap previously corrected afterward.
- Reduced-motion preference-change reconciliation remains immediate, and `reducedMotionRef` remains unchanged for pointer-release momentum.
- Added reduced-motion tests proving intermediate positions, rapid pending-target retargeting, animation cleanup, moving-state `aria-current` suppression, and settled-only activation.
- Rebuilt and deployed only `team4sv30-frontend`; both Linux port 3000 and the Windows SSH tunnel on port 3300 return HTTP 200.

## Task Commits

1. **Task 1 RED: Specify reduced-motion deliberate navigation** - `1b0c0fb9` (test)
2. **Task 1 GREEN: Smooth deliberate carousel navigation** - `3333300b` (feat)
3. **Task 3 remediation RED: Require deterministic interpolation** - `c67b9b78` (test)
4. **Task 3 remediation GREEN: Interpolate and cancel reduced-motion commands** - `672dac07` (fix)
5. **Task 3 snap remediation RED: Require temporary snap suppression** - `e49a997c` (test)
6. **Task 3 snap remediation GREEN: Suspend snap during interpolation** - `ad841832` (fix)
7. **Task 3 geometry remediation RED: Pin track-relative targets** - `aa3680b0` (test)
8. **Task 3 geometry remediation GREEN: Center from live geometry** - `91a0edc3` (fix)
9. **Task 3 mobile containment remediation: Constrain role-card grid** - d7b27467 (fix)
10. **Task 3 family-card containment remediation** - 5f6add3d (fix)
11. **Task 3 responsive carousel remediation** - 159ff1a1 (fix)

Task 2 was validation/deployment only and produced no source commit. Plan, summary, state, and roadmap metadata remain uncommitted for the orchestrator.

## Files Created/Modified

- `frontend/src/components/ui/FocalCarousel.tsx` - Adds reduced-motion-only rAF interpolation with retarget, input, preference-change, and unmount cancellation.
- `frontend/src/components/ui/FocalCarousel.module.css` - Adds the interpolation-only snap-suppression class without changing `.dragging` or normal `.trackInteractive` snapping.
- `frontend/src/components/ui/FocalCarousel.test.tsx` - Covers intermediate positions, reduced-motion arrows, rapid retargeting, Arrow/Home/End, cleanup, moving state, and delayed activation.
- frontend/src/components/profile/MemberBadgeChain.module.css - Constrains the role-card grid to its focal-item content box.
- frontend/src/components/profile/MemberBadgeChain.test.tsx - Pins the narrow-card containment CSS contract.

## Decisions Made

- Added an internal `deliberateNavigation` argument to the existing `focusItem` seam. Arrow and keyboard callers retain the default deliberate behavior; the media-query change handler passes `false` so it preserves its prior immediate reconciliation.
- Uses a fixed 280 ms cubic ease-out duration: long enough to remain visibly traversable under Chromium reduced motion, while calm and bounded independent of distance.
- Uses a separate `programmaticScrolling` CSS-module class instead of generic `isNavigating`, so native smooth navigation retains mandatory snapping.
- Uses `track.scrollLeft + elementCenterInViewport - trackCenterInViewport`, clamped to the scroll range, so both navigation and settle reconciliation agree with physical centering.
- Did not add props, CSS motion overrides, timers, listeners, consumer-local carousel logic, or image changes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced UA-collapsed native smooth scrolling under reduced motion**
- **Found during:** Task 3 live human verification
- **Issue:** Chromium moved from `scrollLeft` 405 to 796 before the first 20 ms sample despite `behavior: 'smooth'`.
- **Fix:** Added reduced-motion-only rAF interpolation with safe retargeting and cleanup, while retaining native smooth scrolling outside reduced motion.
- **Files modified:** `frontend/src/components/ui/FocalCarousel.tsx`, `frontend/src/components/ui/FocalCarousel.test.tsx`
- **Verification:** Fake-frame tests observe intermediate positions, rapid retargeting, final settle, and unmount cancellation; expanded Docker gates pass.
- **Committed in:** `c67b9b78`, `672dac07`

**2. [Rule 1 - Bug] Prevented mandatory snap from quantizing rAF frames**
- **Found during:** Task 3 second live human verification
- **Issue:** The component stayed moving for 280 ms, but `.trackInteractive { scroll-snap-type: x mandatory; }` snapped each intermediate `scrollLeft` assignment immediately to a card.
- **Fix:** Temporarily apply `programmaticScrolling { scroll-snap-type: none; }` only during reduced-motion interpolation and remove it before settle or on retarget, input cancellation, preference change, and unmount.
- **Files modified:** `frontend/src/components/ui/FocalCarousel.tsx`, `frontend/src/components/ui/FocalCarousel.module.css`, `frontend/src/components/ui/FocalCarousel.test.tsx`
- **Verification:** Tests require the class during intermediate frames and its removal on finish, pointer cancellation, and unmount; full Docker gates pass.
- **Committed in:** `e49a997c`, `ad841832`

**3. [Rule 1 - Bug] Corrected mismatched target coordinate spaces**
- **Found during:** Task 3 third live human verification
- **Issue:** The rAF path moved monotonically to 457, then mandatory snap corrected backward to the true centered position 405 because `offsetLeft` and track viewport geometry differed by 52 px.
- **Fix:** Calculate targets and nearest-card distances from live element/track rectangles plus current `scrollLeft`, with the old offset formula retained only as a layout-less fallback.
- **Files modified:** `frontend/src/components/ui/FocalCarousel.tsx`, `frontend/src/components/ui/FocalCarousel.test.tsx`
- **Verification:** A mismatched-coordinate fixture now moves monotonically to exact centers 405, 14, and 796 for forward, reverse, and rapid-retarget paths.
- **Committed in:** `aa3680b0`, `91a0edc3`

**Total deviations:** 5 auto-fixed bugs discovered during live human checkpoints.
**Impact on plan:** The geometry correction is shared by explicit navigation and physical settle reconciliation without changing consumer or pointer/wheel contracts.

**4. [Rule 1 - Bug] Constrained narrow mobile role-card content**
- **Found during:** Task 3 live human verification at 319x876
- **Issue:** The implicit grid column resolved to max-content, so 248 px role artwork and progress children overflowed the roughly 180 px focal card.
- **Fix:** Gave the existing role card a definite border-box width and minmax(0, 1fr) column, allowing the existing child max-width constraints to resolve against the card.
- **Files modified:** frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx
- **Verification:** The regression failed before the CSS fix, then the 78 focused MemberBadgeChain/FocalCarousel tests and all build/image gates passed.
- **Committed in:** d7b27467

**5. [Rule 1 - Bug] Constrained narrow mobile family-card content**
- **Found during:** Task 3 follow-up live human verification at 319x876
- **Issue:** Fortschritt, Punkte-Meilensteine, Beiträge, and Mitgliedschaft retained 248 px max-content grid tracks inside roughly 180 px focal cards.
- **Fix:** Applied the definite border-box width, minmax(0, 1fr) column, and direct-child constraints to the shared familyCard while leaving the internally scrollable stage rail and special awards unchanged.
- **Files modified:** frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx
- **Verification:** The family-card contract failed before the fix, then 78 focused tests and all type/lint/build/image gates passed.
- **Committed in:** 5f6add3d

## Issues Encountered

- The running development container's `npm run typecheck` saw stale `.next/dev` generated types for `app/members/[slug]/page.tsx`. The required isolated `/app/.next` typecheck passed, and both isolated and image Docker production builds passed. No unrelated source was edited.
- Lint passed with 0 errors and 326 pre-existing warnings outside the two scoped files.
- The focused carousel suite retains its pre-existing React `act(...)` warning for the horizontal-wheel test; all assertions pass.
- Initial live UAT failed because the real Chromium reduced-motion policy suppressed native smooth scrolling. The deterministic rAF remediation is deployed and awaiting repeat live review.
- Second live UAT showed mandatory CSS scroll snap quantizing the rAF positions. The interpolation-only snap suppression is deployed and awaiting repeat live review.
- Third live UAT exposed a 52 px offset-coordinate mismatch previously hidden by final snap correction. Live rectangle targeting is deployed and awaiting repeat live review.

## Verification
- Mobile-containment RED gate: the new role-card grid contract failed before the CSS fix.
- Mobile-containment focused suite: 78/78 MemberBadgeChain and FocalCarousel tests passed.
- Family-card containment RED gate failed before the CSS fix; post-fix and post-deploy focused suites passed 78/78.
- Container-query RED gate failed in both focused suites before the responsive CSS was added.
- Responsive focused suite: 79/79 MemberBadgeChain and FocalCarousel tests passed.
- Live Playwright geometry: 390, 768, and 1440 px all keep the active role card fully visible and centered with zero page overflow; 390 px moves both controls below the track.
- Scoped ESLint passed with 0 errors. The running dev container still exposes the documented stale generated route-prop type error.
- Family-card remediation image: sha256:dd30200bc3b1b1fc13f542f5ff35f378460d5ea54e2deced494a47021621ea68; frontend force-recreated and HTTP 200.
- Remediation image: sha256:813ce4ef2e5bbb82ed73eb93e4cb4564eecd316edb371ca990f177a6cf0d5708; frontend force-recreated and HTTP 200.

- RED gate: 2 new assertions failed against the previous `behavior: 'auto'` branch as expected.
- Initial focused Task 1 suite: 80/80 tests passed.
- Remediation RED gate: 3 new assertions failed against native instant scrolling as expected.
- Remediation focused suite: 20/20 tests passed.
- Snap-remediation RED gate: 4 assertions failed against the missing class/CSS contract as expected.
- Snap-remediation focused suite: 20/20 tests passed.
- Geometry-remediation RED gate: the new physical-centering test ended at 457 instead of 405 as expected.
- Geometry-remediation focused suite: 21/21 tests passed.
- Expanded remediation suite: 83/83 tests passed.
- Post-deploy checkpoint suite: 78/78 tests passed.
- Isolated frontend typecheck: passed.
- Frontend lint: passed with 0 errors (326 existing warnings).
- Isolated Next.js production build: passed.
- Docker image build: passed; image `sha256:f420b35804f1890bfa063037ae640f50970e01bf94b878ad9ddcee339968335c`.
- Phase-120 image probe: passed all five URL classes, required 128/160/512/640 widths, alpha, cache-hit, and original-fallback gates.
- `git diff --check`: passed.
- `team4sv30-frontend`: Up after force recreation; Linux and tunneled frontend health checks return HTTP 200.

## Known Stubs

None.

## User Setup Required

None.

## Next Phase Readiness

- Task 3 remains intentionally blocked on live 319x876 mobile containment and 768x1024 in-app-browser verification with reduced motion still enabled.
- Requirement `260805-7lu-scope` remains open until the user explicitly approves the live gesture and visual behavior.

## Self-Check: PASSED

All five modified source files and this summary exist in the canonical repository; all task commits through 5f6add3d are present in Git history, and the scoped stub scan is clear.

---
*Phase: quick-260805-7lu*
*Automation completed: 2026-08-05*
