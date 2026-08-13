---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "00"
subsystem: testing
tags: [go, vitest, jsdom, public-profile, fansub-member, red-tests]
requires:
  - phase: 99-ffentliches-fansub-member-profil-redesign
    provides: "99-CONTEXT and 99-RESEARCH public Fansub member profile redesign requirements"
provides:
  - "Wave 0 RED tests for public member profile route composition"
  - "Wave 0 RED tests for badge chain, latest contributions, story clamp, and previous-history UI behavior"
  - "Backend RED source-invariant tests for public profile DTO/query semantics and media ownership filters"
affects: [phase-99, public-member-profile, member-profile-repository, profile-components]
tech-stack:
  added: []
  patterns:
    - "RED frontend tests may use @vite-ignore runtime imports when Phase 99 target components intentionally do not exist yet"
    - "Backend repository RED coverage follows the existing source-invariant test pattern in member_profile_repository_test.go"
key-files:
  created:
    - "frontend/src/app/members/[slug]/page.test.tsx"
    - "frontend/src/components/profile/MemberBadgeChain.test.tsx"
    - "frontend/src/components/profile/LatestContributionsSection.test.tsx"
    - "frontend/src/components/profile/MemberStorySection.test.tsx"
    - "frontend/src/components/profile/PreviousContributionsSection.test.tsx"
  modified:
    - "backend/internal/repository/member_profile_repository_test.go"
key-decisions:
  - "Plan 99-00 remains RED-only; Plans 99-01 through 99-03 are the intended GREEN implementation waves."
  - "STATE.md and ROADMAP.md were not touched because STATE.md was dirty before execution and the user explicitly requested committing only Plan 99-00 changes."
patterns-established:
  - "Runtime import RED tests collect successfully while still failing on intentionally missing Phase 99 components."
requirements-completed:
  - "Phase 99 CONTEXT D-01-D-20"
  - "Phase 99 CONTEXT A-01-A-05"
duration: 8min
completed: 2026-07-07T17:21:23Z
---

# Phase 99 Plan 00: Wave 0 RED Tests Summary

**Executable RED tests for the public Fansub member profile redesign, covering section order, public data filters, media ownership, badge chain, latest feed cards, story clamp, and collapsed previous history**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-07T17:13:12Z
- **Completed:** 2026-07-07T17:21:23Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added backend RED tests for missing public profile projection/query seams: `current_projects`, unified `latest_contributions`, previous-history count/items, active/completed period split, public note filters, release-version-media ownership, and no `release_media`/episode-media fallback.
- Added frontend route RED tests proving the old tabbed page still violates the locked Phase 99 section order while preserving the hidden-profile owner preview path.
- Added frontend component RED tests for the new badge chain, latest contribution cards, story overflow toggle, and collapsed previous-history behavior.

## Task Commits

Each task is captured in the single Plan 99-00 RED-test commit:

1. **Task 1: Backend RED tests for public profile data semantics** - this commit (`test(99): add public member profile redesign red tests`)
2. **Task 2: Frontend RED tests for route order, badges, and latest contribution layouts** - this commit (`test(99): add public member profile redesign red tests`)
3. **Task 3: Frontend RED tests for story clamp and collapsed previous contributions** - this commit (`test(99): add public member profile redesign red tests`)

## Files Created/Modified

- `backend/internal/repository/member_profile_repository_test.go` - Adds RED source-invariant assertions for Phase 99 public profile DTO/query semantics and release-version-media filters.
- `frontend/src/app/members/[slug]/page.test.tsx` - Adds route composition RED tests for the locked single-scroll public page and the old tab/navigation removal.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - Adds badge-chain RED tests for earned/locked states, progress copy, and no invented badge tiers.
- `frontend/src/components/profile/LatestContributionsSection.test.tsx` - Adds latest-feed RED tests for exactly three non-empty items, text-card clamp, 16:9 media previews, and no archive link.
- `frontend/src/components/profile/MemberStorySection.test.tsx` - Adds story RED tests for empty suppression, `RichTextRenderer` use, measured overflow, and read-more toggling.
- `frontend/src/components/profile/PreviousContributionsSection.test.tsx` - Adds previous-history RED tests for collapsed reveal, no-period exclusion, and no archive navigation.

## Decisions Made

- Kept Plan 99-00 strictly RED-only and did not add production components, DTOs, repository queries, contracts, migrations, endpoints, or upload/media flows.
- Used source-invariant backend tests because the existing `member_profile_repository_test.go` pattern is source-based rather than database-fixture-based.
- Left pre-existing dirty `.planning/STATE.md` untouched to avoid mixing unrelated planning-state changes into the requested atomic Plan 99-00 commit.

## Deviations from Plan

None - plan executed within the requested RED-test scope.

## Issues Encountered

- Initial frontend tests had transform/setup issues from static dynamic imports and hoisted mocks. These were corrected so the final frontend runs collect tests and fail on expected Phase 99 behavior gaps.
- `git diff --check` reported only a Git line-ending warning for the modified Go test file; whitespace validation passed.

## Verification

- `cd backend; go test ./internal/repository -run "PublicMember(Profile|Latest|Previous|Current|Media)"` - RED failures in `TestPublicMemberProfileRedesignProjectionSourceInvariants` and `TestPublicMemberLatestContributionFeedSourceInvariants`, showing missing Phase 99 DTO/query/filter behavior.
- `cd frontend; npm run test -- src/app/members/[slug]/page.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/profile/LatestContributionsSection.test.tsx` - RED failures: missing new badge/latest components and current route still rendering old section navigation/labels.
- `cd frontend; npm run test -- src/components/profile/MemberStorySection.test.tsx src/components/profile/PreviousContributionsSection.test.tsx` - RED failures: missing new story and previous-history components.
- `git diff --check -- [Plan 99-00 touched files]` - passed.

## Known Stubs

None. The new files are tests with explicit mock data, not production placeholders.

## Threat Flags

None. This plan adds tests only and introduces no new endpoint, auth path, file access path, upload flow, schema, or runtime trust boundary.

## TDD Gate Compliance

Plan 99-00 intentionally creates the RED gate only. No GREEN `feat(...)` commit is expected in this plan because production implementation is assigned to later Phase 99 plans.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plans 99-01 through 99-03 can now implement against the RED contract: backend public DTO/query additions, route composition replacement, badge chain, latest feed, story clamp, and previous-history reveal.

## Self-Check: PASSED

- All seven Plan 99-00 files exist on disk.
- The Plan 99-00 atomic commit was created successfully.
- No unrelated dirty files were staged in the Plan 99-00 commit.

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-07*
