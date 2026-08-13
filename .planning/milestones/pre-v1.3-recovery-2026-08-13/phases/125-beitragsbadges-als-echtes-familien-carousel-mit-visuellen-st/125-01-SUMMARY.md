---
phase: 125-beitragsbadges-als-echtes-familien-carousel-mit-visuellen-st
plan: 01
subsystem: testing
tags: [react, vitest, accessibility, carousel, contribution-badges]
requires:
  - phase: 121-rollen-badges-visuell-und-funktional-perfektionieren
    provides: responsive same-DOM FocalCarousel contracts
  - phase: 124-punkte-meilensteine-als-responsive-single-family-achievement
    provides: authoritative achievement Stage progress contracts
provides:
  - Exact contribution-family boundary oracle for all PRD values
  - RED integration contracts for Contribution Stage state, accessibility, and geometry
affects: [125-02, 125-03, 125-04]
tech-stack:
  added: []
  patterns: [authoritative badge_progress oracle, clean targeted dirty-worktree patching]
key-files:
  created: [.planning/phases/125-beitragsbadges-als-echtes-familien-carousel-mit-visuellen-st/125-01-SUMMARY.md]
  modified: [frontend/src/components/profile/memberBadgeLabels.test.ts, frontend/src/components/profile/MemberBadgeChain.test.tsx]
key-decisions:
  - "Keep Phase 125 tests RED only for missing Contribution Stage behavior and the locked Medienbeitrag copy."
  - "Relocate the Phase 125 integration-test hunk to a clean HEAD-owned boundary so no pre-existing dirty hunk is committed."
patterns-established:
  - "Boundary tables pass backend-projected progress directly into resolveMemberBadgeFamilies."
  - "Contribution family selection and tier preview are asserted as independent interaction states."
requirements-completed: [P125-01, P125-02, P125-03, P125-04, P125-06, P125-07, P125-08, P125-09, P125-10, P125-12, P125-13, P125-14, P125-15, P125-16]
duration: 24min
completed: 2026-08-11
---

# Phase 125 Plan 01: Contribution Carousel Contract Summary

**Exact authoritative boundary coverage plus isolated RED contracts for the three-family Contribution carousel and its native Bronze/Silber/Gold Stage**

## Performance

- **Duration:** 24 min
- **Completed:** 2026-08-11
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Covered Projects 0/1/4/5/14/15/20 and Chronicle/Archivist 0/10/49/50/149/150/200.
- Locked canonical family order, earned/locked/current state, next/remainder, cumulative percent, terminal values, and German units.
- Added RED component contracts for zero state, tier preview, bounded terminal ARIA, same-DOM expanded mode, and responsive contained artwork.
- Preserved all pre-existing MemberBadgeChain, FocalCarousel, PNG, and roadmap changes outside both task commits.

## Task Commits

1. **Task 1: Lock authoritative boundary oracle** - 063a02dd
2. **Task 2: Lock Stage and integration contracts** - 8b55a191

## Files Created/Modified

- frontend/src/components/profile/memberBadgeLabels.test.ts - authoritative table-driven boundary oracle.
- frontend/src/components/profile/MemberBadgeChain.test.tsx - Contribution Stage and outer-carousel RED contracts.
- 125-01-SUMMARY.md - execution evidence.

## Decisions Made

- The plan intentionally records RED tests: seven label cases fail only because Archivist still exposes Bildarchivbeitrag/Bildarchivbeiträge; three component cases fail only because the new Contribution Stage and expanded contract are not implemented yet.
- Existing FocalCarousel code and tests remained untouched; its focused suite is green.

## Deviations from Plan

None - plan executed within its test-only scope.

## Issues Encountered

- The first Task 2 insertion landed adjacent to a protected dirty EOF hunk. It was removed before staging and reapplied at a clean HEAD-owned boundary; the final commit contains only the 70-line Phase 125 patch.
- The GSD init command updated .planning/STATE.md in the dirty worktree. It was deliberately excluded from both task commits and this plan metadata commit.

## Verification

- Labels: 82 passed, 7 expected RED (Medienbeitrag copy only).
- Chain/carousel/public profile: 112 passed, 1 skipped, 3 expected RED; FocalCarousel 22/22 and public profile 15/15 green.
- git diff --check: passed.
- Cached task patches contained only their assigned Phase 125 test file; no FocalCarousel, PNG, ROADMAP, or unrelated baseline hunk was staged.

## Known Stubs

None.

## Self-Check: PASSED

Both modified test files and commits 063a02dd / 8b55a191 exist. The RED failures correspond exactly to implementation work scheduled by later Phase 125 plans.

---
*Phase: 125-beitragsbadges-als-echtes-familien-carousel-mit-visuellen-st*
*Completed: 2026-08-11*
