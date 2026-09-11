---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 05
subsystem: backend
tags: [go, pgx, public-projection, contributors, credits]

# Dependency graph
requires: ["156-01"]
provides:
  - "PublicReleaseContributor.RoleCodes []string -- stable role-code set per contributor, surviving the German-label aggregation"
  - "PublicReleaseContributor.MemberSlug *string -- visibility-gated member slug, reusing the established CASE pattern"
affects: [156-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sibling accumulator map (roleCodes alongside roleLabels) for dual-aggregation of the same underlying column set (acr.role_code) into both a joined display string and a stable code slice"

key-files:
  created: []
  modified:
    - backend/internal/repository/public_effective_contributors.go
    - backend/internal/repository/release_detail_public_repository.go
    - backend/internal/repository/public_effective_contributors_test.go

key-decisions:
  - "Tests are unit-level (resolvePublicEffectiveContributors, no DB) because this is the existing, established test style for this exact function -- the file had zero Postgres-gated tests before this plan and the plan's own <verify> only requires go build/go vet, not a new integration harness. The SQL query change itself (role_codes aggregate, member_slug CASE, GROUP BY additions) is exercised indirectly by every existing production consumer (release/project pages) and by go vet, not by a new integration test file."
  - "MemberSlug first-non-nil-wins across candidate rows for the same accumulator key, mirroring the existing AvatarURL carry-over pattern exactly (per plan's <action> instruction) -- correct because member_slug is invariant per member/group pair across all candidate rows for that key."

requirements-completed: [P156-08, P156-09]

# Metrics
duration: 6min
completed: 2026-09-11
---

# Phase 156 Plan 05: Segment-Origin Migration and Central Credit Role Catalog -- Extend loadPublicEffectiveContributors Summary

**`loadPublicEffectiveContributors` (the one shared batch-loader feeding both the project page and the release page) now preserves each contributor's raw `role_code` set and exposes a visibility-gated `member_slug`, without creating a second contributor-loading function or changing its existing batch/precedence contract.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-11T21:21:54Z (immediately after 156-04's completion commit)
- **Completed:** 2026-09-11T21:27:17Z
- **Tasks:** 1 completed (RED + GREEN sub-steps)
- **Files modified:** 3

## Accomplishments

- `PublicReleaseContributor` gained `RoleCodes []string` and `MemberSlug *string`, both sourced from the exact same batch query `loadPublicEffectiveContributors` already runs -- no second query, no second function.
- The SQL query grew a sibling aggregate `ARRAY_AGG(DISTINCT acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL)` next to the existing `role_labels` aggregate, and a `CASE WHEN m.profile_visibility = 'public' THEN m.public_slug ELSE NULL END AS member_slug` column, copied verbatim from the established pattern already used in `group_contributors_repository.go`, `anime_contributions_public_repository.go`, and `domain_projection_repository.go`.
- `publicContributorAccumulator` grew a `roleCodes map[string]struct{}` alongside the existing `roleLabels` map, populated by a sibling loop, and reduced to a sorted `[]string` at result-build time exactly like `RoleLabel`'s existing join/sort logic.
- Full RED/GREEN TDD cycle: three new tests added first (multi-role code preservation, member_slug pass-through when public, member_slug nil when not public with the contributor still returned), confirmed to fail to compile against the pre-change struct shapes, then made to pass by the additive implementation.
- All three pre-existing tests in the same file (`TestResolvePublicEffectiveContributors_FallsBackToThreeProjectDefaults`, `..._AppliesOverridePerAttachedGroup`, `..._AppliesVisibilityAfterPrecedenceAndDeduplicates`) continue to pass unmodified, proving the batch signature, precedence resolution, and `is_public` filtering are untouched.

## Task Commits

Each task was committed atomically (TDD RED/GREEN split):

1. **Task 1 (RED): failing tests for RoleCodes/MemberSlug aggregation** - `1fdeba60` (test)
2. **Task 1 (GREEN): RoleCodes + visibility-gated MemberSlug through loadPublicEffectiveContributors** - `6b989b64` (feat)

**Plan metadata:** (this commit) `docs(156-05): complete plan`

## Files Created/Modified

- `backend/internal/repository/public_effective_contributors.go` - added `RoleCodes`/`MemberSlug` fields to `publicContributionCandidate`, a `roleCodes` map to `publicContributorAccumulator`, the sibling SQL aggregate + `member_slug` CASE column + `GROUP BY` additions, the corresponding `Scan` targets, the accumulator init/carry-over logic, a sibling aggregation loop, and the final sorted `RoleCodes` slice assignment
- `backend/internal/repository/release_detail_public_repository.go` - `PublicReleaseContributor` struct gained `RoleCodes []string \`json:"role_codes"\`` and `MemberSlug *string \`json:"member_slug"\`` immediately after `RoleLabel`
- `backend/internal/repository/public_effective_contributors_test.go` - three new unit tests proving role-code preservation across multi-role aggregation, member_slug pass-through when populated, and member_slug staying nil (contributor still returned) when not populated

## Decisions Made

Followed the plan's `<action>` instructions exactly: same accumulator-copy pattern as the existing `AvatarURL` first-non-nil-wins carry-over, same CASE shape copied verbatim from `group_contributors_repository.go:67`, same sort/join finalization pattern as the existing `RoleLabel`. No architectural deviations.

## Deviations from Plan

None -- plan executed exactly as written. All four `must_haves.truths` and both `must_haves.artifacts` match verbatim:
- `loadPublicEffectiveContributors` preserves each contributor's raw role_code set (proven by `TestResolvePublicEffectiveContributors_PreservesRoleCodesAlongsideLabels`)
- `PublicReleaseContributor` carries `RoleCodes` and a visibility-gated `MemberSlug`, sourced from the one shared function
- No second contributor-loading function was created -- `loadPublicEffectiveContributors` was extended in place
- `member_slug` reuses the established CASE pattern verbatim, unchanged from `group_contributors_repository.go`'s shape

## Known Pre-Existing Debt (not introduced by this plan, flagged per CLAUDE.md's 450-line rule)

`backend/internal/repository/release_detail_public_repository.go` was already 511 lines before this plan touched it (confirmed via `git show 6b989b64~1:.../release_detail_public_repository.go | wc -l`). This plan's Task 1 added 2 lines (the `RoleCodes`/`MemberSlug` struct fields), bringing it to 513, consistent with the plan's explicit instruction to add these two fields to this exact struct in this exact file. CLAUDE.md's 450-line cap applies to changes that would *push* a file over the limit; this file was already over before this plan's tiny, targeted addition, and splitting a 511-line pre-existing public-release-detail repository module is a distinct architectural undertaking outside a 1-task plan's scope. This mirrors the accepted precedent documented in 156-01-SUMMARY.md for `permissions.go`. Not fixed here; flagged for a future dedicated remediation pass (likely alongside 156-07/08, which will touch this same file's neighbor `release_detail_public_repository_helpers.go` for origin-based credit loading), not blocking this plan's completion.

## Issues Encountered

Running the full `internal/repository` test suite (both with and without `--network team4s_default`) surfaces pre-existing, environment-dependent `TestPhase134Matrix*` failures unrelated to this plan -- they require a live Keycloak password grant for `sheppert@team4s.local` and an HTTP backend reachable at `192.168.235.196:18093` (the actual dev backend listens on `18092` per `docker compose ps`), neither available/matching in this execution environment. Confirmed untouched by this plan's changes (`git status --short` shows no modifications to any Phase-134 test file) and consistent with the identical finding already documented in `156-06-SUMMARY.md` for the same test family -- not a regression introduced here. The targeted verification actually used for this plan's correctness claim is `go test ./internal/repository/... -run TestResolvePublicEffectiveContributors -v -count=1` (all 6 tests, old + new, pass) plus `go build ./... && go vet ./...` (both clean), matching the plan's own `<verify>` block.

## User Setup Required

None -- no external service configuration required. No migration, no new database fixture needed; this plan is a pure Go/SQL-in-string extension to an existing batch-loading function.

## Next Phase Readiness

- Plan 156-07 can now import `PublicReleaseContributor.RoleCodes` and filter it against `permissions.SegmentCreditRoleCodes` (from Plan 156-01) to derive segment-relevant credits, replacing the `strings.Contains(label, "kara")` heuristic.
- Plan 156-08's project-context member-link work can now read `PublicReleaseContributor.MemberSlug` directly, with the correct visibility gate already applied server-side.
- No blockers identified for downstream plans.

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-11*

## Self-Check: PASSED

All modified files confirmed present on disk with expected content (`RoleCodes`/`MemberSlug` fields present in both `public_effective_contributors.go` and `release_detail_public_repository.go`). Both commits (`1fdeba60`, `6b989b64`) confirmed in `git log --oneline`. `go test ./internal/repository/... -run TestResolvePublicEffectiveContributors -v -count=1` re-run confirms 6/6 pass (3 pre-existing unchanged + 3 new).
