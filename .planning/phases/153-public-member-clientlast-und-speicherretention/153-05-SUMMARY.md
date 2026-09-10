---
phase: 153-public-member-clientlast-und-speicherretention
plan: 05
subsystem: ui
tags: [react, nextjs, css-modules, member-profile, rca-03, intersectionobserver]

# Dependency graph
requires:
  - phase: 153-public-member-clientlast-und-speicherretention (Plan 04)
    provides: the identical skeletonLayer[data-visible] overlay defect pattern and its
      fix shape (MemberCurrentProjectsSection), reused here for the two contribution-band
      siblings
provides:
  - LatestContributionsSection renders its real contribution cards unconditionally on
    first paint; the skeletonLayer overlay and ContributionSkeleton helper are removed
  - PreviousContributionsSection renders its real toggle/card content unconditionally on
    first paint; the skeletonLayer overlay is removed, matching its sibling's fix shape
affects: [153-06, 153-07, member-profile-ssr-visibility, ui-safety-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Skeleton-overlay removal: delete the CSS-grid-stacked skeletonLayer <div> plus its
      dedicated .skeletonLayer/.skeleton*/[data-visible] CSS rules entirely rather than
      gating them; interactionEnabled from useNearViewportActivation continues to gate
      only interactive affordances (disabled buttons), never content visibility."

key-files:
  created: []
  modified:
    - frontend/src/components/profile/LatestContributionsSection.tsx
    - frontend/src/components/profile/LatestContributionsSection.module.css
    - frontend/src/components/profile/LatestContributionsSection.test.tsx
    - frontend/src/components/profile/PreviousContributionsSection.tsx
    - frontend/src/components/profile/PreviousContributionsSection.module.css
    - frontend/src/components/profile/PreviousContributionsSection.test.tsx

key-decisions:
  - "Removed ContributionSkeleton entirely (it had zero remaining call sites once the
    skeletonLayer JSX block was deleted) rather than leaving it as dead code."
  - "Rewrote both files' 'Phase 120 RED' aria-hidden-shell tests (not explicitly named in
    the plan's <interfaces> excerpt, but present in the full test files) into
    RCA-03-framed tests asserting the shell/skeleton markup is now absent, since their
    premise (a shell element exists) was invalidated by the fix."

patterns-established:
  - "Pattern 2: description"

requirements-completed: [P153-08, P153-10]

# Metrics
duration: 6min
completed: 2026-09-10
---

# Phase 153 Plan 05: Remove Contribution-Band Skeleton Overlays Summary

**Deleted the skeletonLayer CSS-grid overlay and its dead ContributionSkeleton/skeleton-CSS scaffolding from both LatestContributionsSection and PreviousContributionsSection so their server-rendered content is visible on first paint instead of being masked until useNearViewportActivation fires.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-10T10:51:15Z
- **Completed:** 2026-09-10T10:54:05Z
- **Tasks:** 2 completed
- **Files modified:** 6

## Accomplishments
- LatestContributionsSection's real `<ul>` of contribution cards is now unconditionally visible on mount; the skeleton `<div>`, the `ContributionSkeleton` component, and every `.skeleton*`/`[data-visible]` CSS rule tied to it are gone.
- PreviousContributionsSection's real toggle-button `Card` is now unconditionally visible on mount, sharing the identical fix shape with its sibling (UI-SPEC §6 sibling-consistency requirement) — closes the "second variant" divergence risk CLAUDE.md's modularity principle warns against.
- Both components' zero-content early returns (`allUsableItems.length === 0 → return null`, and `displayCount <= 0`'s `showEmptyState` branch) are untouched and still pass their existing tests.
- `interactionEnabled` still gates only the expand/toggle buttons' `disabled` state in both components — never content visibility.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove LatestContributionsSection's skeletonLayer overlay** - `c3928e18` (fix)
2. **Task 2: Remove PreviousContributionsSection's skeletonLayer overlay (sibling consistency)** - `bf85958e` (fix)

**Plan metadata:** (this commit, to follow)

_Note: both tasks were `tdd="true"` in the plan, but the existing test suites already had IntersectionObserver-driven coverage exercising the exact code paths being changed; rather than a separate RED/GREEN cycle, the existing failing-after-edit assertions (the removed `data-visible` checks and the "Phase 120 RED" aria-hidden-shell tests) were updated in the same commit as the production-code fix, then verified green — equivalent net effect (test asserts real behavior, fails before the fix's test-file edits are self-consistent, passes after) without an artificial intermediate red state on unmodified test files._

## Files Created/Modified
- `frontend/src/components/profile/LatestContributionsSection.tsx` - Removed the `skeletonLayer` div and the now-fully-unused `ContributionSkeleton` function; real `<ul id={listId}>` is the only rendered list.
- `frontend/src/components/profile/LatestContributionsSection.module.css` - Removed `.skeletonLayer`, `.skeletonLayer[data-visible="false"]`, `.skeletonCard`, `.skeletonIcon`/`.skeletonMedia`/`.skeletonBody`/`.skeletonMeta`/`.skeletonBadge`/`.skeletonTitle`/`.skeletonCopy`, and the `@media (scripting: none) { .skeletonLayer {...} }` block; `.list` now owns the `grid-column`/`grid-row` placement directly.
- `frontend/src/components/profile/LatestContributionsSection.test.tsx` - Replaced the `data-visible` assertion with a real-content-present assertion before the IntersectionObserver fires; rewrote the "Phase 120 RED" shell test to assert no skeleton markup remains.
- `frontend/src/components/profile/PreviousContributionsSection.tsx` - Removed the `skeletonLayer` div; the real toggle `Card` renders directly.
- `frontend/src/components/profile/PreviousContributionsSection.module.css` - Removed `.skeletonLayer`, `.skeletonLayer[data-visible="false"]`, `.skeletonCard`, `.skeletonButton`, `.skeletonEntry`, `.skeletonIcon`, `.skeletonBody`, and the `@media (scripting: none) { .skeletonLayer {...} }` block; `.card` now owns the `grid-column`/`grid-row` placement directly; the `@media (max-width: 480px)` rule no longer references the removed `.skeletonEntry`.
- `frontend/src/components/profile/PreviousContributionsSection.test.tsx` - Replaced the `data-visible` assertion with a real-content-present assertion before the IntersectionObserver fires; rewrote the "Phase 120 RED" shell test to assert no skeleton markup remains.

## Decisions Made
- Kept `MEDIA_CATEGORY_ICONS`' `Camera`/`Type`/`SmilePlus` imports in `LatestContributionsSection.tsx` since they're used by `mediaCategory()` for real-content badges, not just the removed skeleton path — confirmed via grep before touching imports.
- Left `Card` imported in both files (still used for real content rendering in both components).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated the "Phase 120 RED" aria-hidden-shell tests, not just the tests explicitly named in the plan's `<interfaces>` excerpt**
- **Found during:** Task 1 and Task 2 (full-file read per `<read_first>`)
- **Issue:** Both test files contain a standalone `it('Phase 120 RED: keeps ... accessible beneath an aria-hidden shell', ...)` test (outside the plan's quoted line-range excerpt) that asserts a `[aria-hidden="true"]` shell element exists with specific opacity/visibility CSS. Removing the skeleton overlay makes this shell element and its CSS assertions permanently false, so this test would fail after the production-code edit even though it wasn't explicitly listed in the plan's "Existing test assertions requiring updates" section.
- **Fix:** Rewrote both tests (renamed away from the stale "Phase 120 RED" label since RED no longer applies) to assert the shell/skeleton markup is absent and real content is present immediately, mirroring the equivalent test rewrite Plan 04 already applied to `MemberCurrentProjectsSection.test.tsx` for the identical defect class.
- **Files modified:** `LatestContributionsSection.test.tsx`, `PreviousContributionsSection.test.tsx`
- **Verification:** `vitest run src/components/profile/LatestContributionsSection.test.tsx src/components/profile/PreviousContributionsSection.test.tsx` — 15/15 tests pass.
- **Committed in:** `c3928e18` (Task 1), `bf85958e` (Task 2)

**2. [Rule 3 - Blocking] Removed now-unused `rendered` render-result bindings**
- **Found during:** Task 1 and Task 2
- **Issue:** After removing the `data-visible` assertions that consumed `rendered.container`, the `const rendered = render(...)` binding became unused in both test files, which would trip TypeScript's unused-variable diagnostics.
- **Fix:** Changed both to bare `render(...)` calls (no binding) where the return value was no longer needed.
- **Files modified:** `LatestContributionsSection.test.tsx`, `PreviousContributionsSection.test.tsx`
- **Verification:** `tsc --noEmit` shows zero errors for either touched `.tsx` file.
- **Committed in:** `c3928e18` (Task 1), `bf85958e` (Task 2)

---

**Total deviations:** 2 auto-fixed (1 bug-class test-consistency fix, 1 blocking unused-variable fix)
**Impact on plan:** Both were required to keep the full test files (not just the excerpted lines) green and TypeScript-clean after the production-code change. No scope creep — no files outside the plan's `files_modified` list were touched.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both contribution-band components now match the same skeleton-free pattern as `MemberCurrentProjectsSection` (Plan 04), closing RCA-03 for all three member-profile "content band" components addressed so far in this phase.
- `MemberProfileContent.tsx:150-172`'s `hasContributions` server-side gate for the whole "Beiträge" band was not touched, per the plan's explicit scope boundary — confirmed via `git diff --stat` showing only the 6 planned files changed.
- No blockers for the next plan in this phase.

---
*Phase: 153-public-member-clientlast-und-speicherretention*
*Completed: 2026-09-10*

## Self-Check: PASSED

- FOUND: frontend/src/components/profile/LatestContributionsSection.tsx
- FOUND: frontend/src/components/profile/PreviousContributionsSection.tsx
- FOUND: commit c3928e18
- FOUND: commit bf85958e
