---
phase: 260707-ehc-profil-letzte-projekte-auch-aus-anime-co
plan: 01
subsystem: api
tags: [postgres, member-profile, anime_contributions, sql-union]

# Dependency graph
requires:
  - phase: 82 (Mitwirkende projektweit zuordnen)
    provides: anime_contributions table + anime_contribution_roles junction that member-level cast/crew credits are anchored on
provides:
  - loadRecentContributions now unions release_member_roles credits with anime_contributions credits so cast/crew-only members see projects on their profile
affects: [member-profile, public-member-profile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UNION ALL of two credit-source CTEs feeding a shared dedupe/aggregate pipeline (all_credit_rows -> deduped -> project_rows)"

key-files:
  created: []
  modified:
    - backend/internal/repository/member_profile_repository.go
    - backend/internal/repository/member_profile_repository_test.go

key-decisions:
  - "publicOnly bool parameter added to loadRecentContributions; gates only the anime_contributions branch via (NOT $2 OR ac.is_public_on_member_profile = true), release_member_roles branch stays unfiltered as before"
  - "INNER JOIN on anime_contribution_roles/contributor_roles in the new branch (not LEFT JOIN) so only role-attached contributions count as a project, keeping ARRAY_AGG(DISTINCT role_label) safe from NULLs"
  - "Own profile (GetOwnProfile) passes publicOnly=false to see all confirmed contributions; public profile (GetPublicMemberProfile) passes publicOnly=true"

requirements-completed: [D-01]

# Metrics
duration: 12min
completed: 2026-07-07
---

# Quick Task 260707-ehc: Letzte Projekte auch aus anime_contributions Summary

**loadRecentContributions unions release_member_roles credits with a new anime_contributions branch via UNION ALL, gated by a publicOnly parameter, so cast/crew-only members see their projects in "Letzte Projekte"**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-07T08:20:00Z
- **Completed:** 2026-07-07T08:32:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- `loadRecentContributions` reads from two credit sources (`release_credit_rows` for release-based crew roles, new `contribution_credit_rows` for anime_contributions/Besetzung) merged via `UNION ALL` before the existing dedupe/aggregate pipeline
- New `publicOnly bool` parameter added to the function signature; only the `anime_contributions` branch is gated by `is_public_on_member_profile` — the `release_member_roles` branch is unaffected (no visibility flag exists there)
- Both call sites updated: `GetOwnProfile` passes `false` (owner sees all confirmed contributions), `GetPublicMemberProfile` passes `true` (public visitors see only public-flagged contributions)
- Member sheppert (member_id 2), who only has an `anime_contributions` row and no `release_member_roles` credit, will now appear correctly in `recent_contributions` once deployed

## Task Commits

Each task was committed atomically (TDD RED/GREEN):

1. **Task 1 RED: failing source-invariant assertions** - `b2003a3e` (test)
2. **Task 1 GREEN: anime_contributions UNION ALL + publicOnly param** - `055f9a06` (feat)

**Plan metadata:** committed separately by orchestrator (docs)

## Files Created/Modified
- `backend/internal/repository/member_profile_repository.go` - `loadRecentContributions` signature extended with `publicOnly bool`; new `contribution_credit_rows` CTE sources from `anime_contributions` (INNER JOIN `anime_contribution_roles`/`contributor_roles`, `status='confirmed'`, publicOnly-gated); `all_credit_rows` UNION ALL feeds the existing `deduped`/`project_rows` CTEs unchanged; both call sites (`GetOwnProfile`, `GetPublicMemberProfile`) updated
- `backend/internal/repository/member_profile_repository_test.go` - 10 new source-invariant assertions for the new CTE, join conditions, publicOnly gate, UNION ALL, and both call-site signatures; one pre-existing assertion (line 63) updated to match the new 3-arg call signature at the `GetOwnProfile` call site

## Decisions Made
- INNER JOIN (not LEFT JOIN) on `anime_contribution_roles`/`contributor_roles` in the new branch — consistent with the release branch (which always has a role) and avoids NULL `role_label` breaking `ARRAY_AGG(DISTINCT role_label ...)`. Contributions with zero roles do not count as a project (open question, explicitly deferred per plan).
- `release_version_id` in the new CTE is `ac.release_version_id` (nullable) — `COUNT(DISTINCT release_version_id)` in the aggregate ignores NULL, so no double-counting risk.
- No file split performed: `member_profile_repository.go` was already well over the 450-line CLAUDE.md limit before this change (pre-existing condition per STATE.md Phase 74-01/82 notes); this plan only adds one CTE to an existing function and explicitly stays out of scope for a broader file split.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated stale source-invariant assertion string to match new call signature**
- **Found during:** Task 1 GREEN verification (test run after implementation)
- **Issue:** A pre-existing assertion in `member_profile_repository_test.go` (line 63) checked for the literal string `base.RecentContributions, err = r.loadRecentContributions(ctx, base.MemberID)` (2-arg, old signature). Once the signature was extended to 3 args per the plan, this string no longer existed in the source, so the pre-existing assertion started failing as a side effect of correctly implementing the plan.
- **Fix:** Updated the assertion string to `base.RecentContributions, err = r.loadRecentContributions(ctx, base.MemberID, false)`, matching the plan's mandated call-site change (key_links in plan frontmatter explicitly specifies this exact string).
- **Files modified:** backend/internal/repository/member_profile_repository_test.go
- **Verification:** `go test ./internal/repository/... -run TestMemberProfileRepositorySourceInvariants -v` passes; full `go test ./internal/repository/...` suite passes.
- **Committed in:** 055f9a06 (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, directly required to land the plan's own call-site change)
**Impact on plan:** Necessary consequence of the signature change explicitly mandated by the plan; no scope creep.

## Issues Encountered
None beyond the auto-fixed stale assertion above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend code change is complete, builds cleanly (`go build ./...`), and all repository tests pass (`go test ./internal/repository/...`).
- Docker rebuild/restart of the backend container is required before this is live (per task constraints, orchestrator handles this — not run in this execution).
- Live verification pending: after rebuild, confirm sheppert (member_id 2) sees the anime_contributions-sourced project in `recent_contributions` on both own profile and public profile (per plan's verification step 3).

---
*Phase: 260707-ehc-profil-letzte-projekte-auch-aus-anime-co*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: backend/internal/repository/member_profile_repository.go
- FOUND: backend/internal/repository/member_profile_repository_test.go
- FOUND: .planning/quick/260707-ehc-profil-letzte-projekte-auch-aus-anime-co/260707-ehc-SUMMARY.md
- FOUND commit: b2003a3e (test: RED)
- FOUND commit: 055f9a06 (feat: GREEN)
