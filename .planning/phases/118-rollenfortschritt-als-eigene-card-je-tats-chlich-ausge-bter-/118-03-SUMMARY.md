---
phase: 118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-
plan: "03"
subsystem: ui
tags: [react, accessibility, focal-carousel, member-profile, badges]
requires:
  - phase: 118-01
    provides: enriched public badge DTO with exact role contribution counts
  - phase: 118-02
    provides: global FocalCarousel counter, keyboard, pointer, and responsive behavior
provides:
  - earned-only role progress cards with five real medal stages
  - exact threshold, progress, terminal, reversal, and locked-state presentation
  - responsive Sketch-A artwork composition through the global carousel
affects: [118-04, public-member-profile, role-badges]
tech-stack:
  added: []
  patterns: [typed threshold presentation resolver, domain content rendered through global FocalCarousel]
key-files:
  created: []
  modified:
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
    - frontend/src/components/profile/memberBadgeLabels.ts
    - frontend/src/components/profile/memberBadgeLabels.test.ts
key-decisions:
  - "Role cards use enriched DTO counts as authority and infer threshold counts only for legacy badge fixtures missing current_count."
  - "The five-stage medal list stays semantic and informative while the shared carousel remains the only interaction station."
patterns-established:
  - "Role thresholds and visible copy are resolved once in resolveRoleProgressPresentation rather than duplicated in JSX."
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-13, D-16, D-17, D-20, D-21, D-22, D-23]
duration: 20min
completed: 2026-08-03
---

# Phase 118 Plan 03: Earned Role Progress Cards Summary

**Earned-only member role cards with five-stage medal artwork, exact contribution progress, and responsive shared-carousel composition**

## Performance

- **Duration:** 20 min
- **Started:** 2026-08-03T05:35:00Z
- **Completed:** 2026-08-03T05:55:17Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Filters public role data to known, actually exercised roles in stable role order and removes the entire role section at zero.
- Renders Einstieg, Bronze, Silber, Gold, and Platin with truthful reached/current/locked states, real artwork, exact German copy, and clamped accessible progress.
- Reuses global Card, Badge, and FocalCarousel primitives with responsive 320/280/248 px hero sizing and no local input or motion owner.
- Covers all 0/1/11/12/107/108/319/320/509/510 boundaries, reversal, independent roles, foreign roles, terminal values, counter copy, and tab-stop safety.

## Task Commits

1. **Task 1: Lock role-card state, copy and accessibility** - `c5859913` (test)
2. **Task 2: Build Sketch-A role cards through global FocalCarousel** - `771610f3` (feat)

## Files Created/Modified

- `frontend/src/components/profile/MemberBadgeChain.tsx` - earned-role filtering and complete five-medal card composition.
- `frontend/src/components/profile/MemberBadgeChain.module.css` - responsive Sketch-A card, artwork, progress, lock, and current-state styling.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - card composition, accessibility, reversal, and security regression coverage.
- `frontend/src/components/profile/memberBadgeLabels.ts` - single typed role-progress presentation resolver.
- `frontend/src/components/profile/memberBadgeLabels.test.ts` - exhaustive threshold and exact-copy matrix.

## Decisions Made

- The enriched `current_count` remains authoritative. A badge-code-derived count is used only when older fixtures omit the new field, preserving established artwork tests without changing runtime truth.
- Medal stages are a nested semantic list with no interactive elements or tab indices; FocalCarousel owns the sole keyboard station.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Regression] Preserved legacy badge fixture rendering**
- **Found during:** Task 2
- **Issue:** Existing artwork tests and older callers provide earned role badges without the enriched `current_count`, which initially hid valid earned cards.
- **Fix:** Added a constrained fallback derived from the existing badge suffix and `ROLE_VOLUME_TIER_THRESHOLDS`; explicit DTO counts, including zero, always win.
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.tsx`
- **Verification:** All 86 focused role, carousel, and consumer regression tests pass.
- **Committed in:** `771610f3`

---

**Total deviations:** 1 auto-fixed (1 regression)
**Impact on plan:** Compatibility was retained without adding a parallel threshold source or weakening earned-only filtering.

## Issues Encountered

- ESLint passes with zero errors and reports 328 existing warnings outside the Plan 118-03 files.

## Known Stubs

None.

## Verification

- `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx src/components/profile/memberBadgeLabels.test.ts src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` — 86 passed.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — passed.
- `docker compose exec -T team4sv30-frontend npm run lint` — passed with zero errors; pre-existing warnings only.
- No `addEventListener`, `requestAnimationFrame`, or `scrollIntoView` exists in MemberBadgeChain.
- `git diff --check` — passed.

## Security Review

ASVS L1 HIGH gates pass: zero and foreign roles are excluded, explicit zero cannot be overridden by compatibility inference, shared carousel cleanup tests pass, and TypeScript validates the enriched DTO consumption.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 118-04 can integrate and visually verify the completed role-card composition on the public member profile. No blockers remain.

## Self-Check: PASSED

- All five declared implementation/test files exist.
- Task commits `c5859913` and `771610f3` exist.
- No unexpected tracked-file deletions or untracked generated files were introduced.

---
*Phase: 118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-*
*Completed: 2026-08-03*
