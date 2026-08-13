---
phase: 127-besondere-auszeichnungen-kompakt-in-bestehenden-member-header-integrieren
plan: 01
subsystem: testing
tags: [vitest, tdd, member-profile, badges, dirty-worktree-isolation]
requires:
  - phase: 125
    provides: contribution-family baseline (still incomplete)
  - phase: 126
    provides: membership-stage dirty baseline (still incomplete)
provides:
  - fail-closed RED contracts for compact header specials
  - legacy Special suppression and artwork extraction preservation oracle
affects: [127-02, 127-03, member-profile]
tech-stack:
  added: []
  patterns: [named exact-failure RED gate, baseline-relative index patching]
key-files:
  created: [frontend/src/components/profile/badgeArtwork.test.ts, evidence/phase127-red-gate.sh]
  modified: [frontend/src/components/profile/MemberProfileHero.test.tsx, frontend/src/app/members/[slug]/page.test.tsx, frontend/src/components/profile/MemberBadgeChain.test.tsx]
key-decisions:
  - "RED verification selects only Phase 127 named tests so inherited Phase 125/126 failures cannot be mistaken for expected RED."
patterns-established:
  - "Exact named failure count plus failure-title allow-list is required before a RED wrapper exits successfully."
requirements-completed: [D-04, D-05, D-06, D-07, D-12, D-13, D-14, D-15, D-16, D-18, D-19, D-20, D-21, D-22, D-27, D-29, D-30, D-31, D-32, D-33, D-34, D-35, D-36, D-37, D-41, D-42, D-43, D-44, D-45, D-46, D-47]
duration: 24min
completed: 2026-08-11
---

# Phase 127 Plan 01: Compact Member-Header Awards RED Contract Summary

**Eight exact Phase-127 RED failures define header award projection, SSR reuse, legacy suppression, and complete artwork resolver preservation without production edits.**

## Performance

- **Duration:** 24 min
- **Completed:** 2026-08-11
- **Tasks:** 2
- **Production files modified:** 0

## Accomplishments

- Added zero/one/both, catalog-order, Verified-once, Founding-only, accessibility and responsive hero contracts.
- Added one-request SSR forwarding and old Special collection suppression coverage.
- Replaced only the obsolete positive Special assertion and added a preservation oracle for every current artwork mapping/fallback.
- Captured the dirty baseline tree, cached patch, blob manifest, hashes, byte copies, and protected FocalCarousel hashes.

## Task Commits

1. **Task 1: RED hero/page contracts** - `5981cceb`
2. **Task 2: RED chain/artwork contracts** - `f291c9ab`

## Files Created/Modified

- `frontend/src/components/profile/MemberProfileHero.test.tsx` - compact hero specials contract.
- `frontend/src/app/members/[slug]/page.test.tsx` - cached SSR prop-flow and deduplication contract.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - legacy Special suppression with retained-family assertions.
- `frontend/src/components/profile/badgeArtwork.test.ts` - resolver extraction preservation oracle.
- `evidence/phase127-red-gate.sh` - exact named-failure RED verifier with durable raw logs.

## Decisions Made

- The gate uses a Phase-127 title filter and validates the complete named failing set. This isolates the intended RED state from known predecessor failures.
- Missing `./badgeArtwork` is asserted inside a named test via dynamic import, so it is an expected test failure rather than an accepted suite-startup failure.

## Deviations from Plan

None - plan executed without production, backend, API, DB, asset, or FocalCarousel changes.

## Known Stubs

None. The missing production `badgeArtwork` module and hero prop are deliberate TDD RED targets, not shipped stubs.

## Verification

- `phase127-red-gate.sh hero-page`: PASS, accepting exactly 6 named failures.
- `phase127-red-gate.sh chain-artwork`: PASS, accepting exactly 2 named failures.
- `git diff --check`: PASS.
- `git diff --cached --check`: PASS.
- Protected FocalCarousel SHA-256 values match the incoming manifest.
- Typecheck/build were not used as green gates because this is the mandatory RED plan and intentionally references the not-yet-created prop/module.

## Issues Encountered

- Phase 125 remains incomplete. Phase 126 production work remains dirty/worktree-only; neither status is changed or claimed complete.
- `MemberBadgeChain.test.tsx` had incoming user-owned changes. Only the obsolete Special assertion hunk was committed; the remaining incoming delta stays unstaged.

## Next Phase Readiness

- Plan 127-02 can implement the smallest production seams required to turn these exact failures green.
- Predecessor dirty changes and protected FocalCarousel/assets remain untouched.

## Self-Check: PASSED

All five contract/gate files exist and commits `5981cceb` and `f291c9ab` are present.

---
*Phase: 127-besondere-auszeichnungen-kompakt-in-bestehenden-member-header-integrieren*
*Completed: 2026-08-11*
