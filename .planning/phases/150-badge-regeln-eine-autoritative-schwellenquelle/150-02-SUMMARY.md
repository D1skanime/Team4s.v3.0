---
phase: 150-badge-regeln-eine-autoritative-schwellenquelle
plan: 02
subsystem: api
tags: [go, badges, gamification, thresholds, member-profile, dashboard, contracts]

# Dependency graph
requires:
  - phase: 150-badge-regeln-eine-autoritative-schwellenquelle (Plan 01)
    provides: "backend/internal/badges package (RoleVolume, Points, Progress, ContributionProjects, ContributionChronicle, ContributionArchivist, Membership families + MembershipLongTermYears/Membership7Years/Membership10Years constants) with CurrentTier/NextTier/Remaining helpers"
provides:
  - "member_profile_contribution_badges_repository.go's three tier functions (highestContribProjectsTier/Chronicle/Archivist) delegate to the badges registry -- no local switch-statement threshold copies"
  - "member_profile_dashboard_repository.go's contribFamilyAscendingThresholds/contribFamilyTierFuncs maps removed; buildContribCategoryProgress resolves each family via a name->badges.Family lookup"
  - "OwnDashboardRoleVolumeEntry gains CurrentTier/CurrentThreshold/NextThreshold/RemainingCount/NextTier, server-computed from badges.RoleVolume"
  - "OwnDashboardData gains PointsProgress (family: points), server-computed from badges.Points"
  - "shared/contracts/openapi.yaml and frontend/src/types/dashboard.ts updated field-for-field, including closing the pre-existing remaining_count/next_tier documentation gap on OwnDashboardCategoryProgress"
  - "services/badge_service.go's membership (7/10 years), long-term (5-year make_interval parameter), and productive (10/25/50, filtered from badges.Progress) thresholds all read from the registry; no literal INTERVAL '5 years' remains"
  - "backend/internal/testsupport/phase150_postgres.go: dedicated TEAM4S_PHASE150_TEST_DSN fixture for services-package badge_service Postgres tests"
affects: [150-03, 150-04, 150-05, 150-06, 150-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "buildContribCategoryProgress/GetOwnDashboard/computeProductiveTiers all resolve tiers via badges.Family.CurrentTier/NextTier/Remaining instead of local literal tables -- the pattern later 150-03/150-04 plans should follow for the remaining fundstellen (progress_repository.go, role_volume_repository.go, frontend memberBadgeLabels.ts)"

key-files:
  created:
    - backend/internal/testsupport/phase150_postgres.go
    - backend/internal/services/badge_service_postgres_test.go
    - .planning/phases/150-badge-regeln-eine-autoritative-schwellenquelle/deferred-items.md
  modified:
    - backend/internal/repository/member_profile_contribution_badges_repository.go
    - backend/internal/repository/member_profile_contribution_badges_repository_test.go
    - backend/internal/repository/member_profile_dashboard_repository.go
    - backend/internal/repository/member_profile_dashboard_repository_test.go
    - backend/internal/services/badge_service.go
    - backend/internal/services/badge_service_test.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/dashboard.ts
    - frontend/src/app/me/dashboard/components/CategoryProgressTable.tsx
    - frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx
    - frontend/src/app/me/dashboard/components/DashboardMetrics.test.tsx
    - frontend/src/lib/api.dashboard.test.ts

key-decisions:
  - "current_threshold (int64, nullable) was added to OwnDashboardRoleVolumeEntry as a companion addition requested by Plan 150-05's second revision pass -- NOT part of the phase's original four-gap (D-07/D-08) list. Plan 150-05's dashboard role-volume badge label ('Bronze · 12+') needs the registry threshold belonging to the row's OWN current tier, and PublicMemberBadgeProgress.stages (Plan 150-03's planned addition) cannot supply it because it lives on the public member-profile response, not on /me/dashboard -- the two response shapes are not shared. Computed in the same GetOwnDashboard function from the same already-loaded badges.RoleVolume.Tiers scan, no new query or endpoint."
  - "backend/internal/testsupport/phase150_postgres.go uses minimal schema-isolated stand-in tables for hist_fansub_group_members/anime_contributions/member_badges (mirroring this codebase's own member_profile_dashboard_repository_test.go openOwnDashboardPostgres precedent) rather than chaining the full real production migration history (0082->0086->0087->0105->0114) -- the full chain would additionally require role_definitions/anime/fansub_groups stand-ins solely to satisfy FK constraints on columns badge_service.go's queries never touch."
  - "TestGetOwnDashboardPostgresRoleVolumeRawEntriesVersusBadgesCount's expected BadgesCount corrected from 3 to 5: the test's own fixture data (25 awarded release_role_credit_lifecycles rows for release_version 30/fansub_group 20) also produces real ledger points (>=1, point milestone) and makes that release_version 'fully carried' (contribution_projects bronze) as an inherent, correct side effect of reusing shared fixture rows across families -- the original comment simply never accounted for it."

requirements-completed: [SC-1, SC-4, SC-7, SC-8]

# Metrics
duration: 35min
completed: 2026-09-06
---

# Phase 150 Plan 02: Repoint contribution/dashboard/membership thresholds to the registry Summary

**Contribution-tier switches, the dashboard's independently-maintained threshold map, and badge_service.go's membership/productive/long-term thresholds all now read from `backend/internal/badges`; the dashboard contract gains role-volume tier/threshold/remaining plus a dedicated points-progress row.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-09-06T22:24:00Z
- **Completed:** 2026-09-06T22:58:49Z
- **Tasks:** 3
- **Files modified:** 12 (8 modified across the 3 task commits, plus 4 newly created: testsupport fixture, new Postgres test file, deferred-items.md, this SUMMARY)

## Accomplishments
- `highestContribProjectsTier`/`Chronicle`/`Archivist` now delegate to `badges.ContributionProjects/Chronicle/Archivist.CurrentTier` -- no local 1/5/15 or 10/50/150 switch-statement copies remain.
- `member_profile_dashboard_repository.go`'s `contribFamilyAscendingThresholds`/`contribFamilyTierFuncs` maps (the ones the file's own comment falsely called "not a duplicate") are gone; `buildContribCategoryProgress` resolves each family through a small local `family -> badges.Family` lookup and calls `.CurrentTier`/`.NextTier`/`.Remaining` directly.
- `OwnDashboardRoleVolumeEntry` gained `CurrentTier`/`CurrentThreshold`/`NextThreshold`/`RemainingCount`/`NextTier` (the last four via D-07, `CurrentThreshold` via the 2026-09-06 companion revision for Plan 150-05); `OwnDashboardData` gained `PointsProgress` (D-08) -- both computed in `GetOwnDashboard` from already-loaded raw counts, no new queries.
- `shared/contracts/openapi.yaml` and `frontend/src/types/dashboard.ts` updated field-for-field, including documenting the pre-existing `remaining_count`/`next_tier` schema-drift gap on `OwnDashboardCategoryProgress` that the Go struct had already been emitting.
- `badge_service.go`'s `computeMembershipMilestone` call sites, `computeLongTermMember`'s SQL (now `make_interval(years => $2)` bound to `badges.MembershipLongTermYears`, replacing two literal `INTERVAL '5 years'` fragments), and `computeProductiveTiers` (now a loop over `badges.Progress.Tiers` filtered to `productive_*` codes) are all registry-sourced.
- New `backend/internal/testsupport/phase150_postgres.go` and `backend/internal/services/badge_service_postgres_test.go` replace the stale/removed source-substring number-fragment assertions with real-Postgres proofs at the exact 9/10/24/25/49/50 (productive tiers) and 7/10-year (membership) / 5-year (long-term, both already-left and still-active branches, plus a one-day-short negative case) boundaries the plan required (D-20).

## Task Commits

Each task was committed atomically:

1. **Task 1: Repoint contribution-tier functions to the registry** - `2663159f` (feat)
2. **Task 2: Repoint dashboard thresholds and close role-volume/points contract gaps** - `c7aeefc7` (feat)
3. **Task 3: Repoint badge_service.go thresholds, parameterize the 5-year interval** - `e8c5370e` (feat)

## Files Created/Modified
- `backend/internal/repository/member_profile_contribution_badges_repository.go` - three tier functions delegate to `badges.ContributionProjects/Chronicle/Archivist.CurrentTier`
- `backend/internal/repository/member_profile_contribution_badges_repository_test.go` - fixed pre-existing schema drift (nickname/public_slug NOT NULL, duplicate `member_claims` table, missing media_assets/visibilities/review_statuses join tables) so this task's own `<verify>` tests actually run against real Postgres
- `backend/internal/repository/member_profile_dashboard_repository.go` - removed the local threshold maps; `buildContribCategoryProgress`, `GetOwnDashboard`'s role-volume loop, and the new `PointsProgress` block are all registry-driven
- `backend/internal/repository/member_profile_dashboard_repository_test.go` - fixed two pre-existing bugs (point-award snapshot-trigger mismatch, badges-count miscount) and added two new real-Postgres tests proving the new role-volume/points-progress fields at the plan's named boundaries
- `backend/internal/services/badge_service.go` - membership/long-term/productive thresholds registry-sourced; 5-year interval parameterized
- `backend/internal/services/badge_service_test.go` - removed stale productive-tier number-fragment checks; updated the membership-milestone call-site fragment strings to match the new `int(badges.Membership7Years)`/`int(badges.Membership10Years)` source text
- `backend/internal/services/badge_service_postgres_test.go` - new real-Postgres boundary proofs (membership 7/10 years, long-term 5 years, productive 9/10/24/25/49/50)
- `backend/internal/testsupport/phase150_postgres.go` - new dedicated `TEAM4S_PHASE150_TEST_DSN` fixture
- `shared/contracts/openapi.yaml` - `OwnDashboardRoleVolumeEntry`/`OwnDashboardCategoryProgress`/`OwnDashboardData` schemas updated to match the Go structs exactly
- `frontend/src/types/dashboard.ts` - TypeScript interfaces mirror the new Go/OpenAPI fields; stale architecture comment replaced
- `frontend/src/app/me/dashboard/components/CategoryProgressTable.tsx` - added a `points` entry to `CATEGORY_FAMILY_LABELS` for type completeness only (no rendering-logic change; D-12's client-side derivation rework stays a later plan's scope)
- `frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx`, `DashboardMetrics.test.tsx`, `frontend/src/lib/api.dashboard.test.ts` - fixture literals updated with the new required fields so `tsc --noEmit` and the existing vitest suites stay green

## Decisions Made
See `key-decisions` in frontmatter: `current_threshold` companion addition for Plan 150-05, the minimal-stand-in-schema choice for `phase150_postgres.go`, and the corrected `BadgesCount` expectation (3 -> 5) in the pre-existing role-volume dashboard test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing Postgres fixture breakage in `member_profile_contribution_badges_repository_test.go`, unrelated to this task's own change**
- **Found during:** Task 1
- **Issue:** Three separate, independent pre-existing bugs surfaced only when actually running these tests against real Postgres (they are opt-in via `TEAM4S_PHASE128_TEST_DSN` and evidently hadn't been run in a while): (a) `INSERT INTO members (id) VALUES (2)` violated the `nickname`/`public_slug` NOT NULL constraints migration 0145 (Phase 128) added; (b) a duplicate `CREATE TABLE member_claims` collided with the one already provided by `testsupport.OpenPhase128Postgres`'s base fixture; (c) `loadContribArchivistCount`'s Phase-129 PMDA-06 visibility/review-status gate (`JOIN media_assets/visibilities/review_statuses`) was never reflected in this fixture, so the fixture's `release_version_media` rows never actually satisfied the query and every archivist-count assertion silently exercised a query that would always return 0.
- **Fix:** Added `nickname`/`public_slug` to the member-2 insert; removed the duplicate `member_claims` table (base fixture already provides it); added `visibilities`/`review_statuses`/`media_assets` stand-in tables plus a default public+approved+ready `media_assets` row (id 9000) that `release_version_media` now defaults `media_asset_id` to.
- **Files modified:** `backend/internal/repository/member_profile_contribution_badges_repository_test.go`
- **Verification:** `go test ./internal/repository/... -run 'TestHighestContrib|TestLoadContributionBadges'` green (real Postgres).
- **Committed in:** `2663159f`

**2. [Rule 1 - Bug] Pre-existing point-award snapshot mismatch in `TestGetOwnDashboardPostgresPointMilestoneIncrementsBadgesCount`**
- **Found during:** Task 2
- **Issue:** The test overrode a single award's `RulePointValue` to 50 while referencing the fixture's only `point_rules` row (`point_value=10`); migration 0131's `validate_point_ledger_insert` trigger has always required `point_value`/`rule_point_value_snapshot` to match the referenced rule's `point_value` -- the test never actually exercised this path successfully.
- **Fix:** Replaced the single 50-point award with five 10-point awards (same total, matches the seeded rule).
- **Files modified:** `backend/internal/repository/member_profile_dashboard_repository_test.go`
- **Verification:** Test passes against real Postgres.
- **Committed in:** `c7aeefc7`

**3. [Rule 1 - Bug] Incorrect hand-computed `BadgesCount` expectation in `TestGetOwnDashboardPostgresRoleVolumeRawEntriesVersusBadgesCount`**
- **Found during:** Task 2
- **Issue:** The test expected `BadgesCount == 3` (distinct-role-entry + role-volume-bronze only), but its own 25 `ledger.InsertAward` calls produce real ledger points (>=1, triggering the point-milestone `+1`) and its 20 awarded `release_role_credit_lifecycles` rows on `release_version 30` also make that release version "fully carried" for `contribution_projects` (`+1` more) -- both genuine, correct side effects of the production code that the original comment never accounted for.
- **Fix:** Corrected the expectation to `5` with the full breakdown documented inline.
- **Files modified:** `backend/internal/repository/member_profile_dashboard_repository_test.go`
- **Verification:** Test passes against real Postgres.
- **Committed in:** `c7aeefc7`

**4. [Rule 3 - Blocking issue] Widened required TypeScript fields broke `tsc --noEmit` on downstream fixture literals**
- **Found during:** Task 2
- **Issue:** Adding required fields to `OwnDashboardRoleVolumeEntry`/`OwnDashboardCategoryProgress` (per D-07/D-08) broke `tsc --noEmit` on object literals in `CategoryProgressTable.test.tsx`, `DashboardMetrics.test.tsx`, `api.dashboard.test.ts` (missing the new required fields) and on `CATEGORY_FAMILY_LABELS`'s `Record` type in `CategoryProgressTable.tsx` (missing the new `"points"` family key).
- **Fix:** Added the missing fields/keys with neutral, internally-consistent values; `CategoryProgressTable.tsx`'s own points-row rendering logic was left untouched (D-12's client-side derivation rework is explicitly a later plan's scope).
- **Files modified:** `frontend/src/app/me/dashboard/components/CategoryProgressTable.tsx`, `CategoryProgressTable.test.tsx`, `DashboardMetrics.test.tsx`, `frontend/src/lib/api.dashboard.test.ts`
- **Verification:** `cd frontend && npx tsc --noEmit` clean (except two pre-existing, unrelated `.next/dev/types` generated-file errors -- see Known Issues below); `npx vitest run` on the three touched test files: 12/12 passing.
- **Committed in:** `c7aeefc7`

**5. [Rule 1 - Bug, per plan's own explicit instruction] Stale source-substring test debt in `badge_service_test.go`**
- **Found during:** Task 3
- **Issue:** `TestComputeProductiveTiers`'s number-fragment source-substring assertions (`"productive_bronze", 10` etc.) and `TestComputeAndStoreBadges_CallsAllFunctions`'s literal `7`/`10` call-site fragment checks both collided with this task's own registry-sourcing edit (the plan's own action section explicitly anticipated and required this fix, D-20).
- **Fix:** Removed the stale number-fragment checks from `TestComputeProductiveTiers` (kept function-exists/SQL/upsert-revoke checks); added a new real-Postgres test (`TestComputeProductiveTiersPostgresBoundaries`) proving the 9/10/24/25/49/50 boundaries via actual `anime_contributions` rows and `member_badges` reads; updated `TestComputeAndStoreBadges_CallsAllFunctions`'s fragment strings to the new `int(badges.Membership7Years)`/`int(badges.Membership10Years)` source text (minimal in-place update of a pre-existing pattern, not a new instance of it).
- **Files modified:** `backend/internal/services/badge_service_test.go`, new `backend/internal/services/badge_service_postgres_test.go`, new `backend/internal/testsupport/phase150_postgres.go`
- **Verification:** `go test ./internal/services/... -run 'TestComputeMembershipMilestone|TestComputeLongTermMember|TestComputeProductiveTiers'` green against real Postgres.
- **Committed in:** `e8c5370e`

### Out-of-Scope Discoveries (logged, NOT fixed)

While running the full `go test ./internal/repository/...` suite as an extra sanity check (broader than any task's own `<verify>` command), several pre-existing failures unrelated to this plan's changes surfaced: a memorial-profile claim guard not yet implemented, an unrelated member-mutation-conflict test, a role-volume progress-boundary schema/fixture mismatch (owned by a fundstelle explicitly out of 150-02's scope -- `highestRoleVolumeTier`/`roleVolumeProgressBadge`, likely 150-03's territory), and several Phase-134 tests requiring a reachable live backend server plus Keycloak fixture accounts (`sheppert`/`csubs-leader`) already documented as absent from this environment in Plan 150-01's SUMMARY. Full detail in `.planning/phases/150-badge-regeln-eine-autoritative-schwellenquelle/deferred-items.md`. None of these are in any 150-02 task's `<files>` list; none block this plan's own `<verify>` commands, which all pass.

## Known Issues (pre-existing, unrelated, not fixed)
- `cd frontend && npx tsc --noEmit` reports two errors in generated `.next/dev/types/app/anime/[id]/group/[groupId]/releases/...` page type files (Next.js `PageProps` `params` Promise-typing) -- unconnected to the dashboard/badges contract this plan touches, confirmed pre-existing by inspection (these routes were never touched by this plan).

## Next Phase Readiness
- All three of this plan's `<files_modified>` production files (`member_profile_contribution_badges_repository.go`, `member_profile_dashboard_repository.go`, `badge_service.go`) are fully registry-sourced; `grep -rn "contribFamilyAscendingThresholds|contribFamilyTierFuncs" backend/` returns nothing.
- The dashboard contract now carries `current_threshold`/`current_tier`/`next_threshold`/`remaining_count`/`next_tier` on role-volume rows and a `points_progress` row -- ready for Plan 150-05's frontend consumption.
- `backend/internal/testsupport/phase150_postgres.go` is available for any later plan in this phase needing a lightweight `hist_fansub_group_members`/`anime_contributions`/`member_badges` Postgres fixture in the `services` package.
- Two of the phase's remaining backend fundstellen (`member_profile_progress_repository.go`'s `loadBadgeProgress` literals, `member_profile_role_volume_repository.go`'s `highestRoleVolumeTier`/`roleVolumeProgressBadge`) are untouched by this plan, as intended (D-02 assigns them elsewhere in this phase's plan sequence) -- confirmed by direct inspection, not just by absence from this plan's file list.

---
*Phase: 150-badge-regeln-eine-autoritative-schwellenquelle*
*Completed: 2026-09-06*

## Self-Check: PASSED

All created files found on disk; all three task commits (`2663159f`, `c7aeefc7`, `e8c5370e`) found in git history.
