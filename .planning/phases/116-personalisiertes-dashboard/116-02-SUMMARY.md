---
phase: 116-personalisiertes-dashboard
plan: 02
subsystem: api
tags: [go, gin, pgx, postgres, openapi, member-profile, gamification, dashboard]

# Dependency graph
requires:
  - phase: 112
    provides: highestRoleVolumeTier / loadRoleVolumeBadges (Typ 3 Rollen-Volumen)
  - phase: 113
    provides: highestContribProjectsTier/ChronicleTier/ArchivistTier (Contribution-Familien)
provides:
  - "GET /api/v1/me/dashboard: read-only D-03/D-04 aggregation for the logged-in member's own view"
  - "resolveVerifiedMemberIDForAppUser: shared package-level ownership-gate seam in backend/internal/handlers"
  - "GetOwnDashboard repository method reusing Phase 112/113 raw-count helpers"
affects: [116-05, 116-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rohzahl-Extraktion statt Tier-Only-Rueckgabe: loadContribXCount/loadRoleVolumeCounts als separate Methoden, von Tier-Ableitung UND neuer Aggregation wiederverwendet"
    - "Package-level ownership-gate helper (resolveVerifiedMemberIDForAppUser) statt Handler-lokaler Methode, damit mehrere /me/*-Handler denselben Seam teilen"
    - "D-09 graceful empty state (200 + has_member_profile=false) als bewusster Kontrast zum bestehenden 403-Pattern (respondMemberProfileRequired)"

key-files:
  created:
    - backend/internal/repository/member_profile_dashboard_repository.go
    - backend/internal/repository/member_profile_dashboard_repository_test.go
    - backend/internal/repository/member_profile_role_volume_repository_test.go
    - backend/internal/handlers/me_identity_helpers.go
    - backend/internal/handlers/dashboard_me_handler.go
    - backend/internal/handlers/dashboard_me_handler_test.go
  modified:
    - backend/internal/repository/member_profile_contribution_badges_repository.go
    - backend/internal/repository/member_profile_contribution_badges_repository_test.go
    - backend/internal/repository/member_profile_role_volume_repository.go
    - backend/internal/handlers/contributions_me_handler.go
    - backend/cmd/server/main.go
    - shared/contracts/openapi.yaml

key-decisions:
  - "D-08 confirmed in code: memberID resolved exclusively via resolveVerifiedMemberIDForAppUser(ctx, db, identity.AppUserID), never from query/param/body"
  - "D-09 confirmed in code: no verified member_claims row returns 200 + has_member_profile=false, not the 403 MEMBER_PROFILE_REQUIRED pattern"
  - "ProjectsCount (D-03 Kennzahl) uses a NEW anime_contributions aggregate, deliberately distinct from the Familie-1 raw count (Pitfall 6) -- proven by an explicit divergence regression test"
  - "ImagesCount/ContributionsCount map directly to archivistCount/chronicleCount, never previous_contributions_count (Pitfall 2)"

patterns-established:
  - "Raw-count extraction: highestContribXTier/highestRoleVolumeTier stay the single source of truth for thresholds; loadContribXCount/loadRoleVolumeCounts expose the number that both the public-profile tier derivation AND the own-dashboard aggregation reuse"
  - "Shared ownership-gate helper (me_identity_helpers.go) as the pattern for future /me/* handlers needing the same verified-member resolution"

requirements-completed: [D-03, D-04, D-08, D-09]

# Metrics
duration: ~55min
completed: 2026-07-29
---

# Phase 116 Plan 02: Personalisiertes Dashboard — Backend-Aggregation Summary

**Neuer read-only `GET /api/v1/me/dashboard`-Endpunkt buendelt Punkte, Badge-Anzahl, Projekte-Anzahl, Bilder-/Beitrags-Zaehlungen, Rollen-Volumen-Rohzahlen und Kategorie-Fortschritt fuer die eigene Sicht — ueber den verifizierten Member-Claims-Seam, nie ueber eine client-gelieferte member_id.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3/3 completed
- **Files modified:** 12 (6 created, 6 modified)

## Accomplishments

- Extracted the three Phase-113 contribution-family raw counts
  (`loadContribProjectsCount`/`loadContribChronicleCount`/`loadContribArchivistCount`) and the
  Phase-112 `loadRoleVolumeCounts` out of their tier-only-returning callers, without changing a
  single line of SQL or the existing `GetPublicMemberProfile` output.
- Added `GetOwnDashboard` (new `member_profile_dashboard_repository.go`), reusing those raw-count
  helpers plus two genuinely new queries (distinct role-entry count, "Projekte (Anzahl)"
  aggregate) to build the full D-03/D-04 response envelope.
- Added `GET /api/v1/me/dashboard` behind `authMiddleware`, resolving the acting member
  exclusively through a new shared package-level helper
  (`resolveVerifiedMemberIDForAppUser`), which `ContributionsMeHandler.resolveVerifiedMemberID`
  now delegates to instead of duplicating the SQL.
- Implemented the D-09 graceful empty state (200 + `has_member_profile=false`) as an explicit
  code-level contrast to the existing 403 `MEMBER_PROFILE_REQUIRED` pattern used by
  `ListMyAnimeContributions`.
- Documented the new route and its four response schemas additively in `openapi.yaml`.

## Task Commits

1. **Task 1: Extract raw-count helpers from the Phase-112/113 badge repositories** - `5fa8f8a9` (refactor)
2. **Task 2: New GetOwnDashboard aggregation** - `57ce700d` (feat)
3. **Task 3: Handler, shared ownership-gate helper, route, and OpenAPI contract** - `ba24d8b8` (feat)

_Note: tdd="true" tasks were executed test-first at the function level (raw-count/aggregation
behavior asserted before/alongside implementation); no separate RED-only commit was made since
the underlying repository methods and their tests were authored together per task, matching the
existing project convention in this file group (see e.g. `member_profile_contribution_badges_repository_test.go`,
which mixes pure-function threshold tests with Postgres-gated regression tests in one file)._

**Plan metadata:** (this commit)

## Files Created/Modified

- `backend/internal/repository/member_profile_contribution_badges_repository.go` - Extracted `loadContribProjectsCount`/`loadContribChronicleCount`/`loadContribArchivistCount`; `loadContributionBadges` now delegates to them (behavior-preserving)
- `backend/internal/repository/member_profile_contribution_badges_repository_test.go` - Added raw-count regression tests (`TestLoadContributionBadgesProjectsCountPostgresMatchesRawValueAndBadgeDerivation` and siblings), renamed to match the plan's `-run "ContributionBadges|..."` filter
- `backend/internal/repository/member_profile_role_volume_repository.go` - Added `RoleVolumeCount` + `loadRoleVolumeCounts`; `loadRoleVolumeBadges` now delegates to it
- `backend/internal/repository/member_profile_role_volume_repository_test.go` - New Postgres-gated regression tests for the raw-count extraction
- `backend/internal/repository/member_profile_dashboard_repository.go` - New `GetOwnDashboard` aggregation (`OwnDashboardData`/`OwnDashboardRoleVolumeEntry`/`OwnDashboardCategoryProgress`)
- `backend/internal/repository/member_profile_dashboard_repository_test.go` - Postgres-gated tests covering all four plan behavior bullets, including the Pitfall-6 divergence proof
- `backend/internal/handlers/me_identity_helpers.go` - New shared `resolveVerifiedMemberIDForAppUser` ownership-gate seam
- `backend/internal/handlers/contributions_me_handler.go` - `resolveVerifiedMemberID` now delegates to the shared helper (zero other line changes)
- `backend/internal/handlers/dashboard_me_handler.go` - New `DashboardMeHandler.GetOwnDashboard` HTTP handler (D-08 gate, D-09 graceful empty state)
- `backend/internal/handlers/dashboard_me_handler_test.go` - Auth-required test, source-inspection D-08/D-09 regressions, empty-state contract test
- `backend/cmd/server/main.go` - `dashboardMeHandler` construction + `v1.GET("/me/dashboard", authMiddleware, ...)` registration
- `shared/contracts/openapi.yaml` - Additive `/api/v1/me/dashboard` path + `OwnDashboardResponse`/`OwnDashboardData`/`OwnDashboardRoleVolumeEntry`/`OwnDashboardCategoryProgress` schemas

## Decisions Made

- Kept the ownership-gate extraction as a package-level function (`resolveVerifiedMemberIDForAppUser`) rather than a method on a shared base type, since `ContributionsMeHandler` and `DashboardMeHandler` don't otherwise share a struct — this matches the plan's exact interface signature and required zero changes to `ContributionsMeHandler`'s other call sites.
- `DashboardMeHandler.dashboardRepo` is typed as a narrow `ownDashboardLoader` interface (only `GetOwnDashboard`), not the concrete `*repository.MemberProfileRepository`, per the plan's explicit "or a narrower interface" option — this keeps the handler decoupled from the full repository surface.
- Category-progress thresholds live in a small local map (`contribFamilyAscendingThresholds`) that mirrors the existing `highestContribXTier` switch values verbatim (1/5/15, 10/50/150, 10/50/150) with an explicit comment against introducing different numbers, per the plan's "Don't Hand-Roll" guidance.

## Deviations from Plan

**1. [Rule 1 - Test correctness] Renamed three new repository test functions to match the plan's mandated `-run` filter**
- **Found during:** Final overall verification pass
- **Issue:** The three new raw-count regression tests in `member_profile_contribution_badges_repository_test.go` were initially named `TestLoadContribProjectsCountPostgres...` (etc.) — these do not contain the substring `ContributionBadges`, so they would silently NOT run under the plan's own required verification command (`go test ./internal/repository/... -run "ContributionBadges|RoleVolume" -v`), even though they compiled and were otherwise correct.
- **Fix:** Renamed to `TestLoadContributionBadgesProjectsCountPostgresMatchesRawValueAndBadgeDerivation` (and the Chronicle/Archivist siblings) so they match the mandated filter.
- **Files modified:** `backend/internal/repository/member_profile_contribution_badges_repository_test.go`
- **Verification:** `go test ./internal/repository/... -run "ContributionBadges|RoleVolume|Dashboard" -v` now lists and (skip-)runs all new tests.
- **Committed in:** `ba24d8b8` (bundled with the Task 3 commit)

**2. [Deferred, out of scope — logged not fixed] Pre-existing 450-line violation in `contributions_me_handler.go`**
- **Found during:** Task 3 (before editing the file)
- **Issue:** The file was already 671 lines before this plan touched it — a pre-existing CLAUDE.md 450-line-limit violation unrelated to this plan's scope.
- **Action taken:** Logged in `.planning/phases/116-personalisiertes-dashboard/deferred-items.md` instead of performing an unplanned split (this plan's edit only shrank the file by ~10 lines via the delegate extraction; splitting the file is a separate follow-up task).

---

**Total deviations:** 1 auto-fixed (test-naming correctness), 1 deferred (pre-existing file-size violation, logged not fixed).
**Impact on plan:** No scope creep — both items were handled per the deviation-rules scope boundary (Rule 1 fix for the plan's own verification correctness; out-of-scope pre-existing issue logged to `deferred-items.md`).

## Issues Encountered

- Docker/Postgres was not reachable in this environment (consistent with the project memory note on Docker Desktop being down) — all new Postgres-gated regression tests (repository and handler packages) compile, run, and skip gracefully via the existing `TEAM4S_PHASE106_TEST_DSN` opt-in gate, exactly like the pre-existing tests in the same files. Per this plan's own execution instructions, `go build ./...` + the targeted `go test -run` commands were treated as sufficient acceptance evidence; the Docker rebuild + live-DB verification is deferred to the phase-level live-UAT (as already noted in STATE.md for Phase 115/116).
- `go` toolchain (`go1.26.1`) was available and used directly; no environment gaps.

## User Setup Required

None — no external service configuration required. This plan adds no new environment variables, dependencies, or infrastructure.

## Next Phase Readiness

- `GET /api/v1/me/dashboard` is implemented, builds, and passes all automatable tests; it is ready for the frontend `getOwnDashboard()` client (`frontend/src/lib/api.ts`) and the `/me/dashboard` page (Plans 116-05/116-06) to consume.
- Live-DB verification of the four Postgres-gated repository/handler test suites, plus a `docker compose up -d --build team4sv30-backend` + manual `/api/v1/me/dashboard` smoke check, remain outstanding and should be folded into the Phase 116 live-UAT alongside the already-pending Phase 115 checks (see STATE.md `project_batched_live_uat_114_116` memory note).
- The pre-existing `contributions_me_handler.go` 450-line violation (see `deferred-items.md`) should be picked up as its own follow-up quick task, not bundled into a future Phase 116 plan.

---
*Phase: 116-personalisiertes-dashboard*
*Completed: 2026-07-29*
