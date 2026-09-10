---
phase: 153-public-member-clientlast-und-speicherretention
plan: 06
subsystem: ui
tags: [react, nextjs, css-modules, vitest, ssr, focal-carousel]

# Dependency graph
requires:
  - phase: 153-01
    provides: "AchievementArtwork.tsx sizes-string fix that removed the auto, prefix; already carried through into MemberBadgeChain.test.tsx's own sizes assertions as a Rule-1 side-effect of Plan 01"
provides:
  - "MemberBadgeChain's badge/role carousel now shows its real SSR-rendered content on first paint instead of a skeleton overlay masking it until post-hydration"
  - "carouselSkeleton CSS masking mechanism (:has([data-interaction-enabled=true]), :has(.badgeGrid)) fully removed"
  - "MemberBadgeChain.test.tsx's skeleton-presence assertions corrected to assert absence"
affects: [153-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Skeleton-overlay removal without touching content-determining logic (`buildMemberBadgeGroups`), verified via git diff inspection rather than tests alone"

key-files:
  created: []
  modified:
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/MemberBadgeChain.test.tsx

key-decisions:
  - "The locked/gesperrte badge ladder's content and element count (kara: 606 DOM elements) are deliberately unchanged by this plan per the binding Auftraggeber decision quoted in the plan objective; only skeleton-visibility timing changed"
  - "The plan's referenced test line numbers (1110/1335/1338 for auto-prefixed sizes strings) no longer matched current file state, since Plan 01 had already fixed MemberBadgeChain.test.tsx's sizes assertions as a Rule-1 side-effect; grep-confirmed zero `auto, ` strings remained before this plan started, so only the skeleton-presence assertions (line 1339, 1549) needed updates"

patterns-established:
  - "Skeleton overlay removal for props-driven (no client fetch) components: delete the skeleton DOM node and its CSS masking selectors, leave all rendering/data logic untouched, and prove it via git diff on the exact content-determining line range rather than relying on test coverage alone"

requirements-completed: [P153-08, P153-09, P153-10]

duration: 3min
completed: 2026-09-10
---

# Phase 153 Plan 06: MemberBadgeChain Skeleton-Overlay Removal Summary

**Removed MemberBadgeChain's `carouselSkeleton` overlay and its `:has()`-based CSS masking so the badge/role carousel's SSR content is visible immediately, while the locked badge ladder's content stays byte-identical.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-10T10:58:00Z
- **Completed:** 2026-09-10T10:59:41Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Deleted the `carouselSkeleton` `<div>` block from `MemberBadgeChain.tsx` (Task 1) — `FocalCarousel` is now the sole child of `.carouselShell`, and the real, already-SSR'd badge/role content is visible on first paint instead of being masked until `data-interaction-enabled="true"` fires post-hydration.
- Removed the now-unused `.carouselSkeleton` rule, both `:has()` masking selectors, `.skeletonControl`/`.skeletonCard` declarations, and the matching `@container member-badge-carousel (max-width: 480px)` skeleton rules from `MemberBadgeChain.module.css`.
- Verified via `git diff` that `buildMemberBadgeGroups`, `catalogWithEarnedBadges`, the `groups`/`collectionGroups` construction, and every `renderItem` branch are byte-identical — the diff touches only the 8-line skeleton `<div>` block.
- Updated `MemberBadgeChain.test.tsx`'s two skeleton-presence assertions (line 1339: `toHaveLength(1)` → `toHaveLength(0)`; line 1549: `.not.toBeNull()` → `.toBeNull()`) to assert absence, matching the removed overlay. The three already-correct absence assertions (lines 474, 1222, 1726, specialized single-stage displays that never had `carouselSkeleton`) needed no change.
- Confirmed the `sizes`-string ripple named in the plan's context block (lines ~1110/1335/1338, `auto, ` prefix) was already resolved: `grep -n "'auto\|auto, "` returned zero matches before this plan touched the file, since Plan 01 had already applied that fix as a Rule-1 side-effect. No further edit was needed for that part of Task 2.

## Task Commits

1. **Task 1: Remove the carouselSkeleton overlay without touching badge/tier content** - `95b4e1d7` (fix)
2. **Task 2: Update MemberBadgeChain.test.tsx for the removed skeleton (sizes-string ripple already resolved by Plan 01)** - `46950275` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/components/profile/MemberBadgeChain.tsx` - Removed the `carouselSkeleton` overlay `<div>`; no other line changed
- `frontend/src/components/profile/MemberBadgeChain.module.css` - Removed `.carouselSkeleton`, its two `:has()` masking selectors, `.skeletonControl`/`.skeletonCard`, and their container-query variant
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - Corrected two skeleton-presence assertions to assert absence

## Decisions Made
- Plan's cited line numbers for the `auto, (min-width` sizes-string assertions (1110/1335/1338) no longer matched current file state, since Plan 01 had already fixed them as a documented Rule-1 side-effect (per this plan's binding run context). Verified by grep before editing rather than assuming the plan's line numbers/strings still applied; zero changes were needed for that part of Task 2.
- The line-1549 skeleton assertion (`[data-badge-skeleton="true"]`) was changed to a plain `[data-badge-skeleton]` selector with `.toBeNull()` rather than removed outright, since the surrounding test ("toggles a clean independent expanded roles grid and restores the carousel") still has meaningful assertions around it (expanded-state counts, region presence) — the skeleton line was incidental, not the test's premise, so it was corrected in place rather than deleted.

## Deviations from Plan

None — plan executed exactly as written. The only adjustment was verifying current file state before editing (per binding run context instruction), which confirmed the `sizes`-string assertions needed no further change since Plan 01 already corrected them.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `MemberBadgeChain`'s carousel content is now visible immediately post-mount, matching the same defect-class fix already applied in Plans 04/05.
- Full `MemberBadgeChain.test.tsx` suite: 94/94 tests pass.
- `npx tsc --noEmit` shows zero errors for `MemberBadgeChain.tsx`/`MemberBadgeChain.test.tsx`.
- No regressions expected for other files; this plan touched only the three files listed above.

---
*Phase: 153-public-member-clientlast-und-speicherretention*
*Completed: 2026-09-10*
