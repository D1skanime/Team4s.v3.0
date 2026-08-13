---
phase: 128-canonical-public-identity-visibility-foundation
plan: 18
subsystem: ui
tags: [react, typescript, canonical-slug, public-identity, vitest]

requires:
  - phase: 128-03
    provides: Required stored slug on public and own profile DTOs
  - phase: 128-05
    provides: Canonical immutable public slug persistence
  - phase: 128-13
    provides: Canonical public profile response and shared composition
provides:
  - Shared MemberProfileHero links derived only from the stored DTO slug
  - Runtime guard that omits the public-profile action when no slug is present
  - Regression coverage for both DTOs, nickname mutation, and forbidden fallbacks
affects: [public-member-profile, own-profile, owner-preview, phase-128]

tech-stack:
  added: []
  patterns: [stored identity is the only public member link authority]

key-files:
  created: []
  modified:
    - frontend/src/components/profile/MemberProfileHero.tsx
    - frontend/src/components/profile/MemberProfileHero.test.tsx

key-decisions:
  - 'The shared hero uses only profile.slug for public member links and renders no link when runtime data lacks that stored identity.'

patterns-established:
  - 'Canonical link rule: display-name changes never influence a public member URL.'

requirements-completed: [PMID-03]

duration: 6min
completed: 2026-08-13
---

# Phase 128 Plan 18: Canonical Shared Hero Link Summary

**The shared profile hero now treats the stored slug as the sole public identity and never substitutes a member ID or nickname-derived value.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-13T17:19:55Z
- **Completed:** 2026-08-13T17:25:36Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Replaced the shared hero's union-shape and numeric fallback with direct typed slug use.
- Hid the public-profile action when malformed runtime data has no stored slug.
- Added render and source-invariant coverage for public and own DTOs, nickname mutation, and forbidden generated fallbacks.

## Task Commits

TDD produced separate RED and GREEN commits:

1. **RED: canonical shared hero link contracts** - `26addf1b` (test)
2. **GREEN: canonical-slug-only shared hero link** - `c6a1548e` (feat)

## Files Created/Modified

- `frontend/src/components/profile/MemberProfileHero.tsx` - Uses the stored DTO slug only and omits the link when unavailable.
- `frontend/src/components/profile/MemberProfileHero.test.tsx` - Covers both DTOs, nickname stability, absent-slug behavior, and source fallbacks.

## Decisions Made

- The typed DTO slug remains the only link input; member IDs and display names are never identity substitutes.
- Missing runtime slug data removes the public action instead of producing an invalid or enumeratable member URL.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Planning Metadata Bug] Corrected stale ROADMAP progress count**

- **Found during:** Post-task state synchronization
- **Issue:** The GSD roadmap updater checked Plan 128-18 and reported 17 summaries, but left the aggregate row at 14/22.
- **Fix:** Corrected the aggregate Phase 128 progress row to 17/22.
- **Files modified:** `.planning/ROADMAP.md`
- **Verification:** Summary files on disk and STATE both report 17 completed plans.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 1 auto-fixed (1 planning metadata bug).
**Impact on plan:** Planning metadata now reflects the completed summary count; production scope is unchanged.

## Issues Encountered

- The full frontend typecheck remains blocked by pre-existing out-of-scope errors in the ranking page, visibility/owner-preview work, profile labels, and the user-dirty badge test. Neither owned hero file appears in the diagnostics. The exact hero suite and focused ESLint pass.
- The backend runtime remained down at migration 0145 as instructed; no backend, database, reset, reseed, restart, or retry action was attempted.

## Known Stubs

None.

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberProfileHero.test.tsx` - PASS (25/25)
- `docker compose exec -T team4sv30-frontend npx eslint src/components/profile/MemberProfileHero.tsx src/components/profile/MemberProfileHero.test.tsx` - PASS
- Source invariant rejects member ID, union-shape, slugification, normalization, and display-name fallbacks - PASS
- `git diff --check 26addf1b^..c6a1548e` - PASS
- Full `npm run typecheck` - BLOCKED by documented pre-existing out-of-scope errors; no owned-file diagnostic

## Next Phase Readiness

- The shared hero is ready for remaining Phase 128 canonical-identity consumers.
- Plan 128-19 can proceed without a shared-hero numeric fallback.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*

## Self-Check: PASSED

- Both modified hero files and this summary exist.
- RED commit `26addf1b` and GREEN commit `c6a1548e` exist in repository history.
- All completion claims were rechecked before state updates.
