---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 03
subsystem: database
tags: [go, repository-split, code-quality, modularity]

# Dependency graph
requires:
  - phase: 143-01
    provides: precedent for splitting oversized repository files (app_auth.go)
  - phase: 143-02
    provides: precedent for splitting oversized repository files (member_claims_repository.go)
provides:
  - anime_contributions_proposal_repository.go at 251 lines (was 461)
  - anime_contributions_proposal_member_repository.go (new, 226 lines) holding member-dashboard/self-publish proposal reads
  - member_profile_projects_repository.go at 323 lines (was 458)
  - member_profile_projects_release_versions_repository.go (new, 151 lines) holding batch release-version loading + role-set helpers
affects: [anime_contributions_repository, member_profile_repository, dashboard_me_handler]

# Tech tracking
tech-stack:
  added: []
  patterns: [same-package file split by responsibility, mirrors 143-01/143-02]

key-files:
  created:
    - backend/internal/repository/anime_contributions_proposal_member_repository.go
    - backend/internal/repository/member_profile_projects_release_versions_repository.go
  modified:
    - backend/internal/repository/anime_contributions_proposal_repository.go
    - backend/internal/repository/member_profile_projects_repository.go
    - backend/internal/repository/anime_contributions_proposal_repository_test.go
    - backend/internal/repository/anime_contributions_member_anchor_test.go
    - backend/internal/handlers/contribution_proposals_me_test.go

key-decisions:
  - "Pure move, zero behavior/SQL change: both splits are receiver-preserving relocations within package repository."
  - "Fixed 3 pre-existing source-inspection tests (Rule 1) that read a single hardcoded filename and broke because the code they inspect physically moved to a new file."

patterns-established:
  - "Source-inspection tests that assert on a repository file's raw text must be updated in the same commit set as any split that moves the asserted code out of that file."

requirements-completed: ["Randbedingung-450-line-anime_contributions_proposal_repository", "Randbedingung-450-line-member_profile_projects_repository"]

# Metrics
duration: 8min
completed: 2026-09-01
---

# Phase 143 Plan 03: Split two oversized repository files past the 450-line cap Summary

**Split `anime_contributions_proposal_repository.go` (461→251 lines) and `member_profile_projects_repository.go` (458→323 lines) into four files, zero SQL/logic change, fixing three pre-existing source-inspection tests broken by the relocation.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-09-01T20:42:00Z
- **Completed:** 2026-09-01T20:48:18Z
- **Tasks:** 2 completed (plus 1 unplanned test-fix commit, Rule 1)
- **Files modified:** 7 (2 new, 2 split-source, 3 test fixes)

## Accomplishments
- `anime_contributions_proposal_repository.go` reduced from 461 to 251 lines; `MemberContributionWithProposalRow`, `ListByMemberIDWithProposalFields`, `hasAnimeContributionReviewNoteColumn`, `SelfPublish` moved intact into new `anime_contributions_proposal_member_repository.go` (226 lines).
- `member_profile_projects_repository.go` reduced from 458 to 323 lines; `memberProjectKey`, `loadCurrentProjectReleaseVersionsBatch`, `sameMemberRoleSets`, `decodeMemberRoles` moved intact into new `member_profile_projects_release_versions_repository.go` (151 lines).
- All four target files verified `<= 450` lines via `wc -l`; backend builds and vets clean; both moved-method acceptance-criteria greps pass.
- Fixed three pre-existing source-inspection tests that hardcoded the original filename and would otherwise have gone red immediately after the split (Rule 1 — direct consequence of this plan's own file move, not unrelated pre-existing debt).

## Task Commits

Each task was committed atomically:

1. **Task 1: Split anime_contributions_proposal_repository.go** - `9f0ff5d0` (refactor)
2. **Task 2: Split member_profile_projects_repository.go** - `aaeb5dc6` (refactor)
3. **Rule 1 fix: repoint source-inspection tests at moved file** - `a4973084` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `backend/internal/repository/anime_contributions_proposal_repository.go` - trimmed to `ProposalInput`, `GroupProposalRow`, `CreateProposal`, `ListProposedByGroup`, `Confirm`, `Reject`
- `backend/internal/repository/anime_contributions_proposal_member_repository.go` (new) - `MemberContributionWithProposalRow`, `ListByMemberIDWithProposalFields`, `hasAnimeContributionReviewNoteColumn`, `SelfPublish`
- `backend/internal/repository/member_profile_projects_repository.go` - trimmed to `loadCurrentProjects`, `countCurrentProjects`, `loadKnownFor`, `GetPublicMemberProjects`, `GetPublicMemberProjectsByID`; dropped now-unused `encoding/json` import
- `backend/internal/repository/member_profile_projects_release_versions_repository.go` (new) - `memberProjectKey`, `loadCurrentProjectReleaseVersionsBatch`, `sameMemberRoleSets`, `decodeMemberRoles`
- `backend/internal/repository/anime_contributions_proposal_repository_test.go` - two source-inspection tests now concatenate both proposal files before searching for moved SQL fragments
- `backend/internal/repository/anime_contributions_member_anchor_test.go` - anchor-fallback source check now also reads `anime_contributions_proposal_member_repository.go`
- `backend/internal/handlers/contribution_proposals_me_test.go` - `TestSelfPublish_StatusBleibtProposed` now reads `anime_contributions_proposal_member_repository.go` directly (where `SelfPublish` now lives)

## Decisions Made
- Both splits preserve the exact receiver type (`*AnimeContributionsRepository` / `*MemberProfileRepository`) and package (`repository`), per the plan's explicit boundary — no interface or call-site changes were needed anywhere else in the codebase.
- `sameMemberRoleSets`/`decodeMemberRoles` kept as plain package-level functions (no receiver) in the new file, matching their original shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Three pre-existing source-inspection tests broke as a direct consequence of the file split**
- **Found during:** Task 1 verification (running the plan's `go test ./internal/repository/... -run "TestAnimeContributionsRepository|TestMemberProfileRepository|TestGetPublicMemberProjects"` first passed only because the running container had not yet received the split — see Deviation 2 below; once synced, targeted re-runs of the broader test suite surfaced these three failures)
- **Issue:** `TestListByMemberIDWithProposalFields_SelectsWorkedTotalSubqueries`, `TestListByMemberIDWithProposalFields_SelectsOwnReleaseWork` (in `anime_contributions_proposal_repository_test.go`), `TestAnimeContributionsMeQueriesUseMemberIDAnchorFallback` (in `anime_contributions_member_anchor_test.go`), and `TestSelfPublish_StatusBleibtProposed` (in `backend/internal/handlers/contribution_proposals_me_test.go`) each do raw `os.ReadFile` + `strings.Contains` source inspection against the literal filename `anime_contributions_proposal_repository.go`. Once `ListByMemberIDWithProposalFields`/`SelfPublish` moved to the new file, these tests could no longer find the SQL fragments/function bodies they assert on.
- **Fix:** Updated the three affected test files to also read (or read instead, for `TestSelfPublish_StatusBleibtProposed`) `anime_contributions_proposal_member_repository.go`, mirroring the existing `TestCreateProposal_IsRoleScopedAndSerialized` pattern in the same file, which already concatenated two source files.
- **Files modified:** `backend/internal/repository/anime_contributions_proposal_repository_test.go`, `backend/internal/repository/anime_contributions_member_anchor_test.go`, `backend/internal/handlers/contribution_proposals_me_test.go`
- **Verification:** All four previously-failing tests, plus the plan's literal verification command and the full `internal/repository` and `internal/handlers` packages, pass (remaining `internal/repository` failures are pre-existing environmental failures requiring `TEAM4S_PHASE128_TEST_DSN` or a live server on port 18093/Keycloak — none touch the files this plan changed).
- **Committed in:** `a4973084`

### Notes (not deviations, informational)

**2. Docker Compose `develop: watch` sync was not active during this session.** `docker-compose.override.yml` mounts backend source via `develop: watch` (`action: sync`), which only applies changes when `docker compose watch` is running as a foreground process. Since no such process was running, `docker compose exec team4sv30-backend` initially operated against a 13-hour-stale copy of the source inside the container (confirmed via `wc -l` mismatch and a test that "passed" against pre-split code). Used `docker cp` to push each edited/new file into the running container before every build/test cycle. This is an environment characteristic of the CLAUDE.md-mandated Linux Docker Compose workflow, not a code change — flagged here so the next executor knows to either run `docker compose watch` or `docker cp` synced files before trusting `docker compose exec ... go test` results.

## Self-Check

- `backend/internal/repository/anime_contributions_proposal_repository.go` exists, 251 lines: FOUND
- `backend/internal/repository/anime_contributions_proposal_member_repository.go` exists, 226 lines: FOUND
- `backend/internal/repository/member_profile_projects_repository.go` exists, 323 lines: FOUND
- `backend/internal/repository/member_profile_projects_release_versions_repository.go` exists, 151 lines: FOUND
- Commit `9f0ff5d0`: FOUND
- Commit `aaeb5dc6`: FOUND
- Commit `a4973084`: FOUND
