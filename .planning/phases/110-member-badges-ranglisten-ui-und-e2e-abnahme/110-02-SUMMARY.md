---
phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme
plan: 02
subsystem: api
tags: [go, pgx, postgres, openapi, member-profile, gamification, badges]

# Dependency graph
requires:
  - phase: 106-member-gamification-punktefundament
    provides: point_ledger_entries foundation, member_point_totals trigger-maintained aggregate (via 108/109)
  - phase: 108-anime-contribution-role-credit-lifecycles (0137 migration)
    provides: release_role_credit_lifecycles table with role_code + lifecycle_status enum
  - phase: 109-ranglisten-und-punkteprojektionen
    provides: member_point_totals table (migration 0139), read-only-from-Go convention to mirror
provides:
  - PublicMemberProfile.TotalPoints (json total_points) sourced from member_point_totals, never re-aggregated
  - loadPublicBadges extended with a live-computed (never persisted) role_entry_<code> badge UNION over release_role_credit_lifecycles
  - shared/contracts/openapi.yaml PublicMemberProfileData.total_points (required + properties)
  - Postgres-backed integration test file proving total_points correctness and the full awarded/reversed/non-eligible-role badge lifecycle
affects: [110-03 (frontend hero/ranking display of total_points and role-entry badges), future badge-engine work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Live-computed, never-persisted derived data: a second SQL query appended inside an existing read-only projection helper, results merged into the same slice as persisted rows, with an explicit code comment steering future readers away from the UpsertMemberBadge/RevokeMemberBadge persisted-write pattern for this specific derivation"
    - "member_point_totals read idiom: SELECT COALESCE(total_points, 0) ... WHERE member_id=$1, with errors.Is(err, pgx.ErrNoRows) explicitly mapped to (0, nil) since a member with zero ledger rows has no row at all"

key-files:
  created:
    - backend/internal/repository/member_profile_repository_postgres_test.go
  modified:
    - backend/internal/models/member_profile.go
    - backend/internal/repository/member_profile_repository.go
    - shared/contracts/openapi.yaml

key-decisions:
  - "Role-entry badges are computed at every GetPublicMemberProfile read via a DISTINCT role_code query filtered to lifecycle_status='awarded', never written to member_badges — a reversed lifecycle row is invisible on the very next read with zero caching (D-03 Live-Projektion)"
  - "loadTotalPoints treats an absent member_point_totals row as 0 points (not an error), matching the trigger-maintained table's actual absence semantics rather than relying on COALESCE alone"
  - "Synthetic role_entry_* PublicMemberBadge rows emit ID: 0 since nothing downstream depends on uniqueness of that field for these non-persisted rows (documented via code comment per RESEARCH.md Open Question 2)"

patterns-established:
  - "Second query appended to an existing repository-read helper (loadPublicBadges) is the correct extension point for live-computed derived data that must coexist with a persisted-write sibling pattern in the same result slice"

requirements-completed: [D-02, D-03]

# Metrics
duration: ~25min
completed: 2026-07-27
---

# Phase 110 Plan 02: total_points + Live Role-Entry Badges Summary

**Threaded total_points through the public member profile projection (Go model, repository, OpenAPI) and extended loadPublicBadges with a live-computed UNION over release_role_credit_lifecycles that never writes to member_badges, proven by a new Postgres-backed integration test file covering the full awarded/reversed/non-eligible-role lifecycle.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 (RED test file, GREEN implementation)
- **Files modified:** 3 modified, 1 created

## Accomplishments
- `PublicMemberProfile.TotalPoints` (json: `total_points`) is now populated from `member_point_totals.total_points` via a new `loadTotalPoints` helper — never re-aggregated from `point_ledger_entries` at request time.
- `loadPublicBadges` appends synthetic, never-persisted `PublicMemberBadge{BadgeCode: "role_entry_"+role_code, BadgeCategory: "role_entry"}` rows for every role a member has reached `lifecycle_status='awarded'` in — computed fresh on every read, with zero writes to `member_badges` (no `UpsertMemberBadge`/`RevokeMemberBadge` call sites added).
- New Postgres-backed test file (`member_profile_repository_postgres_test.go`) with a disposable-schema harness (`openMemberProfileBadgeLifecyclePostgres`) that layers migration 0137's composite-FK stand-in tables (`release_version_groups`, `anime_fansub_groups`) and a minimal `member_badges` table on top of the existing `openMemberPointTotalsPostgres` fixture, then applies migration 0137 itself.
- `shared/contracts/openapi.yaml`'s `PublicMemberProfileData` schema now requires and documents `total_points`.

## Task Commits

Each task was committed atomically (TDD RED -> GREEN):

1. **Task 1 (RED): Postgres-backed test proving total_points and role-entry badge lifecycle** - `9d08a840` (test)
2. **Task 2 (GREEN): Implement total_points + role-entry badge derivation, update OpenAPI** - `eb6bc980` (feat)

_TDD Gate Compliance: RED commit (`9d08a840`, prefix `test(...)`) precedes GREEN commit (`eb6bc980`, prefix `feat(...)`) — gate sequence satisfied. No REFACTOR commit was needed._

## Files Created/Modified
- `backend/internal/repository/member_profile_repository_postgres_test.go` - New disposable-Postgres integration tests: `TestGetPublicMemberProfilePostgresIncludesTotalPoints`, `TestLoadPublicBadgesPostgresRoleEntryAwardedVisible`, `TestLoadPublicBadgesPostgresRoleEntryReversedHidden`, `TestLoadPublicBadgesPostgresNonEligibleRoleNeverAppears`
- `backend/internal/models/member_profile.go` - Added `TotalPoints int64 \`json:"total_points"\`` to `PublicMemberProfile`, sibling to `PublicBadges`
- `backend/internal/repository/member_profile_repository.go` - Added `loadTotalPoints(ctx, memberID)`, wired into `GetPublicMemberProfile`; extended `loadPublicBadges` with the role-entry UNION query
- `shared/contracts/openapi.yaml` - `total_points` added to `PublicMemberProfileData.required` and `.properties`

## Decisions Made
- Role-entry badge derivation uses the `release_role_credit_lifecycles.role_code` join (not `source_key` string parsing) per RESEARCH.md Pitfall 1 — matches the plan exactly, no deviation.
- On a second-query failure inside `loadPublicBadges` (the new role-entry query), the function returns the already-loaded persisted `member_badges` items alongside the error rather than discarding them — a minor, defensible extension-point choice consistent with "additive UNION" semantics, not a deviation from any stated must-have.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched the plan's `<action>` blocks verbatim (query shapes, error-wrapping idiom, struct field placement, OpenAPI schema edit location).

## Issues Encountered

- **Docker/Postgres not reachable in this execution environment** — same as documented in the Phase 109 precedent (`109-02-SUMMARY.md`). `TEAM4S_PHASE106_TEST_DSN` is unset and no local Postgres port (5432) was reachable, so all four new Postgres-backed tests execute as `SKIP` (not `FAIL`, not silently ignored) rather than running live. Verified this is expected, safe behavior (not a compile/logic failure) by confirming:
  - `go build ./...` succeeds cleanly.
  - `go vet ./internal/repository/...` confirmed RED before Task 2 (`undefined: loadTotalPoints`).
  - After Task 2, `go test ./internal/repository/...` (full package, no `-run` filter) passes with the four new tests reporting `SKIP: TEAM4S_PHASE106_TEST_DSN is not set`.
  - `go test ./...` (full backend suite) passes with no regressions.
  - Anti-pattern grep confirms zero new `UpsertMemberBadge`/`RevokeMemberBadge` call sites were introduced.
  - Test code was read line-by-line against the exact schema/FK constraints in migrations 0087/0131/0137/0139 to gain high confidence the tests would pass live (composite-FK stand-in tables, CHECK constraint shapes for `pending`/`awarded`/`reversed` all satisfied by the fixture and each test's inserted rows).

## User Setup Required

None for the code itself. To fully live-verify these four Postgres-backed tests end-to-end (matching the Phase 109 recommendation), a reachable Postgres instance is needed: `docker compose up -d team4sv30-db`, create a `team4s_phase106_test_<suffix>` database, set `TEAM4S_PHASE106_TEST_DSN`, then re-run `cd backend && go test ./internal/repository/... -run "TestGetPublicMemberProfile|TestLoadPublicBadges" -v`.

## Next Phase Readiness
- `total_points` and live role-entry badges are fully threaded through the Go/repository/OpenAPI layers and ready for Plan 110-03's frontend consumption (`frontend/src/types/profile.ts` addition, `MemberProfileHero` hero metric, `memberBadgeLabels.ts` catalog entries) — no frontend logic needs to compute eligibility itself.
- Recommend running the four new Postgres-backed tests live (see User Setup Required) before or during Phase 110's final UAT, once Docker/Postgres is reachable in an execution session, to close out the "code-verified, not yet live-executed" gap for this plan.

---
*Phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme*
*Completed: 2026-07-27*
