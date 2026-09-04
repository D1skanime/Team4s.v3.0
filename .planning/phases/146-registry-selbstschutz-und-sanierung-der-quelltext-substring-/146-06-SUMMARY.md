---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring
plan: 06
subsystem: testing
tags: [go, postgres, pgx, testify, repository, member-identity, teststil]

# Dependency graph
requires:
  - phase: 146 (Plans 01-03)
    provides: real-Postgres test fixture harnesses (testsupport.OpenPhase128Postgres, real migration 0145) this plan's rewrites build on
  - phase: 146 (Plan 04)
    provides: the frozen 20-file SecurityRelevantTestFiles list (backend/internal/testquality/security_relevant_test_files.go) defining Block-2 scope and the presence-vs-absence violation rule (D-09)
provides:
  - member_archive_repository_test.go's "uses canonical stored slug" claim now proven via a real MemberArchiveRepository.SearchMembers call against a seeded Phase-128 Postgres fixture
  - member_point_totals_repository_test.go's "uses canonical stored slug" claim now proven via a real MemberPointTotalsRepository.ListRanking call, reusing the file's existing real-Postgres fixture
affects: [146-07, 146-08, 146-09, 146-10, 146-11, 146-12, 146-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Repository-layer Block-2 remediation: real Postgres call replaces os.ReadFile+strings.Contains presence assertion, sanctioned absence checks stay verbatim in the same function (D-10)"
    - "Seed a member with a nickname deliberately divergent from its stored public_slug (e.g. nickname 'archive-divergent-nickname' vs public_slug 'stable-archive-slug') to prove the projection returns the stored column value rather than any nickname-derived or numeric-fallback slug"
    - "New minimal-stand-in fixture (openMemberArchivePostgres) built on testsupport.OpenPhase128Postgres plus the real production migration 0145 (adds members.public_slug) plus hand-rolled minimal tables for the exact columns SearchMembers's query joins through (fansub_groups, hist_fansub_group_members, anime_contributions, anime_contribution_roles, media_assets) -- mirrors the established minimal-stand-in convention already used by testsupport's Phase 106/128/137/145 fixtures"

key-files:
  created: []
  modified:
    - backend/internal/repository/member_archive_repository_test.go
    - backend/internal/repository/member_point_totals_repository_test.go

key-decisions:
  - "Built a new local fixture helper (openMemberArchivePostgres) in member_archive_repository_test.go rather than adding a new exported testsupport.OpenPhaseXXXPostgres function, since this plan's files_modified scope is limited to the two test files and no existing fixture already assembled the exact visibility chain (members.public_slug + hist_fansub_group_members + anime_contributions) SearchMembers needs"
  - "Reused member_point_totals_repository_test.go's existing openMemberPointTotalsPostgres/postgresAwardInputForMember/pointStringPtr helpers unchanged for Task 2 rather than inventing a new fixture, since the file already established the exact real-Postgres schema (members, point_rules, point_ledger_entries) ListRanking needs"
  - "Both seeded test members use nickname values that are lowercase-hyphenated so no slugification collision is possible with the divergent hand-set public_slug, keeping the proof unambiguous (a real nickname-derived slugifier would produce 'archive-divergent-nickname'/'ranking-divergent-nickname', not the distinct 'stable-archive-slug'/'stable-ranking-slug' values asserted)"

requirements-completed: ["Criterion 5", "Criterion 6"]

# Metrics
duration: 24min
completed: 2026-09-04
---

# Phase 146 Plan 06: Remediate member_archive_repository_test.go + member_point_totals_repository_test.go Summary

**Replaced 2 source-substring presence assertions across 2 locked security-relevant repository test files with real Postgres calls into SearchMembers and ListRanking, proving the Phase-128 canonical-identity invariant by executing the query against a seeded, deliberately nickname-divergent member row instead of grepping SQL text.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-09-04T16:20:00Z (approx, first Read call)
- **Completed:** 2026-09-04T16:44:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `TestArchiveUsesCanonicalStoredMemberSlug` now seeds a member (nickname `archive-divergent-nickname`, stored `public_slug` `stable-archive-slug`) wired through the full public-visibility chain (public profile, public `hist_fansub_group_members` row, confirmed public `anime_contributions` row) and proves via a real `MemberArchiveRepository.SearchMembers` call that the returned row's slug is the stored `public_slug`, not a nickname-derived or generated fallback.
- `TestMemberPointTotalsRankingUsesCanonicalStoredSlug` now seeds a member (nickname `ranking-divergent-nickname`, stored `public_slug` `stable-ranking-slug`) with one awarded point-ledger entry and proves via a real `MemberPointTotalsRepository.ListRanking` call that the returned ranking row's slug is the stored `public_slug`.
- A new minimal-stand-in Postgres fixture (`openMemberArchivePostgres`) was added to `member_archive_repository_test.go`, built on `testsupport.OpenPhase128Postgres` plus the real production migration `0145_member_public_identity_visibility.up.sql` (adds `members.public_slug`) plus hand-rolled minimal tables for exactly the columns `SearchMembers`'s query touches.
- Both files' sanctioned 4-item forbidden-fragment absence loops (`memberslugexpr`, `regexp_replace`, `coalesce(m.public_slug`, `id::text`) are preserved byte-identical per D-10 / CLAUDE.md's Teststil exception 1.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remediate member_archive_repository_test.go** - `568c5634` (test)
2. **Task 2: Remediate member_point_totals_repository_test.go** - `3fcd6007` (test)

## Files Created/Modified

- `backend/internal/repository/member_archive_repository_test.go` - Added `archiveMigrationPath` and `openMemberArchivePostgres` fixture helpers; replaced the single `strings.Contains(compact, "m.public_slug as slug")` presence assertion in `TestArchiveUsesCanonicalStoredMemberSlug` with a real `SearchMembers` call and result assertion; kept the absence loop and the file's three other pre-existing source-inspection tests (`TestArchiveVisibilityFilter`, `TestArchivePaginationBounds`, `TestArchiveRoleFilter` — out of this task's scope per the plan's `<interfaces>` note) untouched.
- `backend/internal/repository/member_point_totals_repository_test.go` - Replaced the single `require.Contains(t, compact, "m.public_slug as slug", ...)` presence assertion in `TestMemberPointTotalsRankingUsesCanonicalStoredSlug` with a real `ListRanking` call and result assertion, reusing the file's existing `openMemberPointTotalsPostgres`/`postgresAwardInputForMember`/`pointStringPtr` helpers unchanged; kept the absence loop.

## Decisions Made

- No existing fixture already assembled `members.public_slug` + `hist_fansub_group_members` + `anime_contributions` together, so Task 1 built a new local, minimal-stand-in fixture rather than reusing or extending an existing `testsupport.OpenPhaseXXXPostgres` function — kept in scope by defining it directly inside `member_archive_repository_test.go` (this plan's only files-modified entry for that file), following the same minimal-column-stand-in convention `testsupport`'s other Phase fixtures already use.
- Task 2 needed no new fixture at all — `member_point_totals_repository_test.go` already had a real-Postgres harness (`openMemberPointTotalsPostgres`) and reusable award-input builders from its neighboring concurrency/reversal/ranking tests, so the rewrite is a pure body replacement with zero new helper code.

## Deviations from Plan

None — both production methods (`MemberArchiveRepository.SearchMembers`, `MemberPointTotalsRepository.ListRanking`) were used exactly as documented in the plan's `<interfaces>` section, with no production-code changes.

## Issues Encountered

None blocking. Verification required setting `TEAM4S_PHASE128_TEST_DSN` to the existing `team4s_phase128_test` database on the shared dev Postgres container (`team4sv30-db`), reached via `docker exec team4sv30-backend` since no `go` binary is on the host PATH — this mirrors 146-05's documented setup, no new provisioning needed. A broader unscoped `go test ./internal/repository/...` run with that DSN set surfaced ~30-50 failures in unrelated files (Phase-134 live-Keycloak matrix tests, badge/dashboard Postgres tests) — confirmed via a baseline run (both with and without the DSN set) that every one of these failures pre-exists this plan's changes and is caused by missing environment dependencies (unreachable live backend/Keycloak on port 18093, shared-database test-data assumptions in unrelated files), not by anything touched here. Both of this plan's target tests moved cleanly from FAIL (DSN unset, per `OpenPhase128Postgres`'s mandatory-DSN fail-closed contract) to PASS (DSN set) with no other regression introduced.

## User Setup Required

None — no external service configuration required. Both real-Postgres verification runs used the existing `team4s_phase128_test` fixture database already present on the shared dev Postgres container.

## Next Phase Readiness

Two more of the 20 locked Block-2 security-relevant files are now fully remediated (4/20 file-level cumulative across Plans 146-05/06; overall Block-2 progress tracked across Plans 146-04 through 146-12). Plans 146-07 through 146-12 remain, touching a disjoint set of files, and can proceed independently. No blockers.

---
*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring*
*Completed: 2026-09-04*

## Self-Check: PASSED

- FOUND: backend/internal/repository/member_archive_repository_test.go
- FOUND: backend/internal/repository/member_point_totals_repository_test.go
- FOUND: .planning/phases/146-registry-selbstschutz-und-sanierung-der-quelltext-substring-/146-06-SUMMARY.md
- FOUND commit: 568c5634
- FOUND commit: 3fcd6007
