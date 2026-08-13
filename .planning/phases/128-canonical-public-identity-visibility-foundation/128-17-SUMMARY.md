---
phase: 128-canonical-public-identity-visibility-foundation
plan: 17
subsystem: frontend-ui
tags: [nextjs, vitest, public-identity, canonical-slug, privacy]
requires:
  - phase: 128-03
    provides: Own-profile refresh and stored-link RED contracts
  - phase: 128-05
    provides: Persisted immutable canonical public slugs
  - phase: 128-13
    provides: Required slug on the typed central profile API result
provides:
  - Stored-slug-only public navigation from both own-profile link producers
  - Missing-slug suppression with nickname-stability regression coverage
affects: [128-18, 128-validation, own-profile-navigation]
tech-stack:
  added: []
  patterns:
    - Canonical identity links render only from the required stored API slug
    - Missing canonical identity suppresses navigation instead of falling back
key-files:
  created: []
  modified:
    - frontend/src/app/me/profile/page.tsx
    - frontend/src/app/me/profile/page.test.tsx
    - frontend/src/app/me/profile/components/MemberProfileHero.tsx
key-decisions:
  - "Own-profile public actions are omitted when the typed profile result has no stored slug; member IDs and nicknames never substitute for canonical identity."
patterns-established:
  - "Own-profile link rule: profile.slug is the sole URL input, while fansub_name remains display text only."
requirements-completed: [PMID-03]
metrics:
  duration: 9min
  completed: 2026-08-13
---

# Phase 128 Plan 17: Stored-Slug Own-Profile Navigation Summary

**Both own-profile public actions now require the immutable stored slug and disappear instead of generating numeric or nickname-derived fallback URLs.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-08-13T17:04:36Z
- **Completed:** 2026-08-13T17:13:30Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Changed the active own-profile page action to build the public member path exclusively from MemberProfileData.slug.
- Changed the retained local MemberProfileHero action to the same stored-slug-only contract.
- Suppressed both public actions when the canonical slug is absent, with no member-ID or nickname fallback.
- Added nickname-change, missing-slug, page-source, and rendered local-hero regression coverage.

## Task Commits

1. **Task 1 RED: Canonical profile-link contracts** - d23237d8 (test)
2. **Task 1 GREEN: Stored-slug-only own-profile navigation** - 7ddea887 (feat)

## Files Created/Modified

- frontend/src/app/me/profile/page.tsx - Returns a public href only from a present stored slug and conditionally renders the action.
- frontend/src/app/me/profile/page.test.tsx - Proves nickname stability, missing-slug suppression, source invariants, and local-hero behavior.
- frontend/src/app/me/profile/components/MemberProfileHero.tsx - Uses the same slug-only conditional action without numeric fallback.

## Decisions Made

- The typed central profile DTO remains the only identity authority; no fetch, token, cookie, slugifier, or alternate lookup seam was added.
- Missing canonical identity is treated as an unavailable action state, not as permission to expose a numeric member route.
- Nickname remains visible editable text and does not participate in public URL construction.

## Verification

- RED gate: focused page suite failed exactly on numeric missing-slug navigation and the fallback source invariant (37 passed, 2 expected failures).
- GREEN gate: docker compose exec -T team4sv30-frontend npm test -- --run src/app/me/profile/page.test.tsx passed 40/40.
- Focused ESLint on the three plan files passed with 0 errors and one pre-existing native-textarea warning in the editor test mock.
- Full frontend typecheck reported no Plan-128-17 file errors; it remains red on known downstream Plan-16 visibility/preview work, generated ranking route props, and user-owned dirty badge tests.
- Both source producers construct member paths from profile.slug only; the test rejects slug-or-ID and direct numeric URL patterns.
- Repository git diff --check passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Aligned the touched profile fixture with the canonical visibility type**
- **Found during:** Task 1 RED
- **Issue:** The plan-owned test fixture still used the removed members_only value from before the Phase-128 contract synchronization.
- **Fix:** Changed the fixture to the canonical private value while adding the link regressions.
- **Files modified:** frontend/src/app/me/profile/page.test.tsx
- **Verification:** The focused suite passes and typecheck reports no Plan-128-17 file errors.
- **Committed in:** d23237d8

---

**Total deviations:** 1 auto-fixed (1 blocking contract-fixture alignment).
**Impact on plan:** The adjustment keeps the touched test on the already-approved Phase-128 DTO contract without changing runtime behavior or scope.

## Issues Encountered

- The repository-wide lint script also scanned the user's untracked frontend/capture-responsive.cjs and failed on two unrelated CommonJS-import errors. Direct ESLint on the three plan files passed.
- The full frontend typecheck remains blocked by out-of-scope downstream and user-owned files; none of the errors reference the three Plan-128-17 files.
- The backend service remains intentionally down on migration 0145's non-empty-members precondition. This frontend-only plan required no live API and did not reset, reseed, or retry the blocked migration.
- One combined metadata-help command timed out after 34 seconds without mutating state; close-out continued with the documented direct handlers.

## Known Stubs

None.

## TDD Gate Compliance

- RED commit: d23237d8
- GREEN commit: 7ddea887
- Commit order and focused RED-to-GREEN behavior were verified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Own-profile navigation now consumes the immutable identity contract expected by later public-profile hardening plans.
- Backend live UAT remains deferred to the separately approved reset/reseed work; it is not required for this source-level frontend correction.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*

## Self-Check: PASSED

All three plan files, the summary, and commits d23237d8 and 7ddea887 were verified in the canonical Linux repository. The RED/GREEN order and plan-level acceptance checks passed.
