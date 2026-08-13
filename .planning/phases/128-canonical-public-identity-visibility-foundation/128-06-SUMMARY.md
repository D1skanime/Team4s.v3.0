---
phase: 128-canonical-public-identity-visibility-foundation
plan: 06
subsystem: backend-repository
tags: [go, postgresql, public-identity, visibility, contributions]
requires:
  - phase: 128-04
    provides: Canonical immutable members.public_slug and closed public/private visibility
provides:
  - Visibility-aware stored-slug projections for anime contributions
  - Visibility-aware stored-slug projections for release-version participants
  - Source contracts rejecting nickname-derived outbound member links
affects: [128-10, public-contributions, release-version-projections]
tech-stack:
  added: []
  patterns:
    - Nullable public identity projection from members.public_slug
    - Projection-scoped source invariant tests
key-files:
  created: []
  modified:
    - backend/internal/repository/anime_contributions_public_repository.go
    - backend/internal/repository/anime_contributions_public_member_test.go
    - backend/internal/repository/anime_contributions_public_versions_repository.go
    - backend/internal/repository/anime_contributions_public_versions_repository_test.go
key-decisions:
  - "Outbound contribution links select members.public_slug only when profile_visibility is public; private identities remain NULL."
  - "The shared nickname-derived memberSlugExpr declaration remains temporarily for Plan 128-10, but no owned outbound projection consumes it."
patterns-established:
  - "Stable nullable links: CASE WHEN m.profile_visibility = 'public' THEN m.public_slug ELSE NULL END."
requirements-completed: [PMID-03]
metrics:
  duration: 16m
  completed: 2026-08-13
---

# Phase 128 Plan 06: Stored Contribution Identity Projections Summary

**Anime contribution and release-version participant links now use immutable stored public slugs while private member identities remain unlinked.**

## Performance

- **Duration:** 16m
- **Started:** 2026-08-13T13:56:58Z
- **Completed:** 2026-08-13T14:12:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced both anime/group contribution nickname-derived outbound slug selections with visibility-aware reads from `members.public_slug`.
- Replaced the release-version participant slug selection through the same canonical nullable projection without changing release, version, episode, or fansub ownership joins.
- Added TDD source contracts that require stored identity and reject `memberSlugExpr`, nickname regex derivation, and public-slug fallback behavior in owned projections.
- Preserved the shared `memberSlugExpr` declaration for Plan 128-10 while removing every use from the projections owned by this plan.

## Task Commits

Each TDD task was committed through RED then GREEN:

1. **Task 1 RED: Stored contribution slug contract** - `e0331d05` (test)
2. **Task 1 GREEN: Stored contribution slug projections** - `89a46c88` (feat)
3. **Task 2 RED: Stored version participant slug contract** - `851187a3` (test)
4. **Task 2 GREEN: Stored version participant slug projection** - `d30125ec` (feat)

## Files Created/Modified

- `backend/internal/repository/anime_contributions_public_repository.go` - Uses stored public identity for anime contributors and group leaders with private-null behavior.
- `backend/internal/repository/anime_contributions_public_member_test.go` - Proves the two outbound contribution projections cannot derive or fall back to nickname identity.
- `backend/internal/repository/anime_contributions_public_versions_repository.go` - Uses stored public identity for release-version participants while preserving ownership joins.
- `backend/internal/repository/anime_contributions_public_versions_repository_test.go` - Proves the version projection uses canonical stored identity and preserves required grouping.

## Verification

- Guarded canonical-source repository test `PublicMemberContributions|MemberSlugProjection`: passed.
- Guarded canonical-source repository test `Public.*Versions|MemberSlugProjection`: passed.
- Repository package compile with `go test ./internal/repository -run '^$' -count=1`: passed.
- `go vet ./internal/repository`: passed.
- Projection source inventory: exactly three visibility-aware `m.public_slug` selections, with no `memberSlugExpr`, `REGEXP_REPLACE`, or `COALESCE(m.public_slug...)` in the owned outbound projection sections.
- Shared declaration inventory: exactly one `memberSlugExpr` declaration remains as required for Plan 128-10.
- Repository-wide `git diff --check`: passed.

## Decisions Made

- Kept member display-name selection independent from link identity: nickname may still supply display text, but can no longer determine outbound URLs.
- Added `m.profile_visibility` and `m.public_slug` only to grouped projections that require them; release/version/fansub join ownership and response fields remain unchanged.
- Retained nullable DTO behavior so private profiles render without discoverable member links.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Verified canonical source through disposable Compose containers**

- **Found during:** Task 1 RED verification
- **Issue:** The long-running backend container predates the new test and initially produced a false pass from stale source.
- **Fix:** Reused the established Phase-128 verification pattern by bind-mounting canonical `/home/d1sk/team4s/backend` into disposable Compose backend containers.
- **Files modified:** None
- **Verification:** Both RED tests failed for their intended missing stored-slug assertions; all GREEN and plan-wide checks passed against canonical source.
- **Committed in:** No code change required.

**2. [Rule 1 - Bug] Restored milestone and activity metadata after GSD state advancement**

- **Found during:** Final tracking updates
- **Issue:** The repository-local GSD wrapper reset `milestone_name` to `milestone` and reduced last-activity fields to a bare date.
- **Fix:** Restored `Public Member Profile Hardening` and recorded Plan 128-06 as the completed activity without changing progress, decisions, metrics, or session position.
- **Files modified:** `.planning/STATE.md`
- **Verification:** STATE frontmatter, current position, decisions, performance metrics, and session continuity were reread after correction.
- **Committed in:** Final metadata commit.

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking).
**Impact on plan:** Verification used the canonical repository and metadata remained durable without changing runtime data, API behavior, authentication, or domain ownership.

## Issues Encountered

- The first RED commit temporarily included two pre-existing staged frontend files. The post-commit audit caught this immediately; the commit was amended to contain only the planned test while the exact original staged and mixed worktree snapshots were restored.
- An optional source-only `-race` invocation was unavailable because the backend image has CGO disabled. The plan does not specify a race gate; all specified guarded tests, compile, and vet checks passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 128-10 can remove the retained shared nickname-derived declaration together with inbound resolution and remaining consumers.
- Downstream contribution surfaces now receive stable stored slugs without discovering private member identities.
- No blocker remains for the next Phase-128 plan.

## Self-Check: PASSED

All four modified repository files, this summary, and task commits `e0331d05`, `89a46c88`, `851187a3`, and `d30125ec` were verified on disk and in Git.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
