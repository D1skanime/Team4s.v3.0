---
phase: quick
plan: 260803-be5
subsystem: ui
tags: [react, css-modules, carousel, responsive-layout, vitest]
requires:
  - phase: 118
    provides: role progress cards and shared FocalCarousel
provides:
  - normalized layered artwork geometry
  - physical-center-derived carousel active state
  - shared 1480px member width and fansub overflow containment
affects: [member-profile, public-fansub-page, FocalCarousel]
tech-stack:
  added: []
  patterns: [untransformed offset geometry drives carousel state]
key-files:
  created: []
  modified: [frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx, frontend/src/components/ui/FocalCarousel.tsx, frontend/src/components/ui/FocalCarousel.test.tsx, frontend/src/app/members/[slug]/page.module.css, frontend/src/app/members/[slug]/page.test.tsx, frontend/src/app/fansubs/[slug]/page.module.css, frontend/src/app/fansubs/__tests__/publicPageWidthContract.test.ts]
key-decisions:
  - "Physical carousel endpoints override stale programmatic targets."
  - "Fansub decoration is clipped outside internal scrollers."
requirements-completed: [QUICK-BE5-BADGES, QUICK-BE5-CAROUSEL, QUICK-BE5-WIDTH]
duration: 12min
completed: 2026-08-03
status: complete
---

# Quick 260803-be5 Summary

**Aligned layered role artwork, physical-center carousel state, shared 1480px public width, and locally contained fansub decoration without clipping carousel scrolling.**

## Accomplishments

- Preserved 320/280/248px role hero sizes while reducing the backdrop and motif circles for Design, Administration and Andere.
- Centralized nearest-item and proximity calculation on offset geometry; real endpoints now override stale requested targets.
- Switched the member shell to shared width tokens and contained fansub full-bleed decoration while track overflow-x remains auto.
- UAT correction: removed the inherited 920px cap from every visible member profile section shell, so hero, projects, badges, and the other main cards consume the full public content width.

## Task Commits

1. Task 1 RED: 52ec10ce
2. Task 1 GREEN: cad862c2
3. Task 2 RED: 67d4592d
4. Task 2 GREEN: ebc16567
5. Rule 1 follow-up: 62718f09
6. UAT width RED: 5f36fbcc
7. UAT width GREEN: e3d611a5

## Automated Checks

- PASS: MemberBadgeChain, FocalCarousel and FansubProjectsGrid, 55 tests; UAT width correction suite: 56 tests.
- PASS: member width, fansub containment, and FocalCarousel task-owned assertions.
- PASS: ESLint, zero errors; 329 existing warnings.
- PASS: git diff --check.
- Existing blocker: typecheck reports generated .next/dev/types route/page signature errors already recorded by Phase 118 verification.
- Existing unrelated assertion: publicPageWidthContract still expects the current release page to use @media (min-width: 769px); release-page files are outside this task.

## Deviations from Plan

- Rule 1: documented the intentional item-count-bound wheel listener dependency so the carousel change adds no lint warning (62718f09).
- Rule 3: used the actual Compose service team4sv30-frontend because the plan's frontend service name is stale.

## Known Stubs

None.

## Threat Flags

None.

## UAT Correction

Desktop UAT found that the outer main reached 1480px while each visible section remained capped at 920px. Commits 5f36fbcc and e3d611a5 add the failing regression and remove that shell-level cap.

## Live UAT Remaining

Root must complete Task 3 at desktop and 390px: badge sizing, End to 11 von 11, width comparison, document scroll-width equality, and internal carousel scrolling.

## Self-Check: PASSED

All eight modified files exist and commits 52ec10ce, cad862c2, 67d4592d, ebc16567, and 62718f09, 5f36fbcc, and e3d611a5 are present.
