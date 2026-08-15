---
phase: 132-shared-ssr-composition-race-safe-frontend-state
plan: 01
subsystem: api
tags: [go, postgres, openapi, typescript, public-profile, aggregation]

# Dependency graph
requires:
  - phase: 131-set-based-delivery-pagination-performance-budgets
    provides: countCurrentProjects full-set filter pattern and the locked constant query-budget test this plan extends (19 -> 20)
provides:
  - "known_for server-authoritative aggregate (active_years, top_roles, known_groups) on PublicMemberProfile/PublicMemberProfileData"
  - "loadKnownFor repository query, filter-identical to countCurrentProjects, wired into GetPublicMemberProfileByID"
  - "OpenAPI PublicMemberKnownFor schema + Go/TS contract parity, enforced by TestPublicMemberProfileMatchesOpenAPIAllowList"
affects: [132-02, 132-03, 132-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Full-set backend aggregate query sibling to countCurrentProjects (same joins/WHERE clause) instead of extending the scalar COUNT query in place"

key-files:
  created: []
  modified:
    - backend/internal/models/member_profile.go
    - backend/internal/repository/member_profile_projects_repository.go
    - backend/internal/repository/member_profile_public_repository.go
    - backend/internal/repository/member_profile_query_budget_test.go
    - backend/internal/repository/member_profile_public_repository_postgres_test.go
    - backend/internal/handlers/public_member_profile_contract_test.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/profile.ts
    - frontend/src/app/members/[slug]/page.test.tsx
    - frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx
    - frontend/src/components/profile/MemberProfileHero.test.tsx

key-decisions:
  - "One new object PublicMemberKnownFor { active_years, top_roles, known_groups } mirrors deriveKnownFor.ts's KnownForResult shape (snake_case), not several flat fields (RESEARCH.md Open Question 1, resolved)."
  - "Dedicated loadKnownFor query instead of extending countCurrentProjects in place, since the aggregate needs row-level role/group/year data a scalar COUNT cannot produce without changing its return shape (RESEARCH.md Open Question 2, resolved)."
  - "active_years is a formatted display string ('min-max' en-dash or single year), matching deriveKnownFor.ts's existing display-string precedent rather than raw {from,to} years."

patterns-established:
  - "Backend full-set aggregate queries MUST reuse the exact WHERE-clause filter set of the sibling COUNT query they parallel (documented inline with a Phase/decision-ID comment) rather than re-deriving a parallel, potentially looser filter."

requirements-completed: [PMFE-11, PMFE-05, PMFE-06]

# Metrics
duration: 25min
completed: 2026-08-15
---

# Phase 132 Plan 01: Server-Authoritative Known-For Aggregate Summary

**New `known_for` DTO field (active_years, top_roles, known_groups) computed server-side by a dedicated `loadKnownFor` query over the member's complete approved current-project set, with full Go/OpenAPI/TypeScript contract parity.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-15T21:11:14Z (first task commit context)
- **Completed:** 2026-08-15T21:18:22Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Closed the PMFE-11 data-correctness bug at its source: `known_for` is now computed backend-side over the COMPLETE approved current-project set (reusing `countCurrentProjects`'s exact filter set), instead of the frontend deriving "Schwerpunkte" from only the first paginated page of 6 current projects.
- Raised the Phase-131 locked constant query-budget (19 -> 20) for one intentional, documented new loader, with the constant-query-budget gate still asserting the count stays independent of project count.
- Landed full cross-layer contract parity (Go struct + OpenAPI schema + TypeScript interface) for the new field, enforced by the existing allow-list/forbidden-field contract test mechanism (no new test function needed).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the loadKnownFor aggregate query, wire it into the profile assembly, and update the locked query budget** - `3185a76f` (feat)
2. **Task 2: Extend the OpenAPI contract, the forbidden-field/allow-list Go test, and the frontend TypeScript type** - `0aaf8090` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `backend/internal/models/member_profile.go` - New `PublicMemberKnownFor` struct; `KnownFor` field on `PublicMemberProfile`; `MarshalJSON` null-normalizes `TopRoles`/`KnownGroups` to `[]string{}`
- `backend/internal/repository/member_profile_projects_repository.go` - New `loadKnownFor` query (role/group/year aggregation in Go, filter-identical to `countCurrentProjects`); `knownForTopRolesLimit = 3` constant
- `backend/internal/repository/member_profile_public_repository.go` - Wires `loadKnownFor` into `GetPublicMemberProfileByID` after `countCurrentProjects`
- `backend/internal/repository/member_profile_query_budget_test.go` - `phase131ConstantQueryBudget` raised 19 -> 20 with a documented reason
- `backend/internal/repository/member_profile_public_repository_postgres_test.go` - New `TestPhase132PublicProfileKnownForUsesApprovedFullSet` Postgres integration test (skip-if-unset, `TEAM4S_PHASE129_TEST_DSN`)
- `backend/internal/handlers/public_member_profile_contract_test.go` - `fullyPopulatedPublicMemberProfile()` fixture populates `KnownFor`
- `shared/contracts/openapi.yaml` - New `PublicMemberKnownFor` schema; `known_for` added to `PublicMemberProfileData`'s `required` list and `properties`
- `frontend/src/types/profile.ts` - New `PublicMemberKnownFor` interface; required `known_for` field on `PublicMemberProfileData`
- `frontend/src/app/members/[slug]/page.test.tsx`, `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx`, `frontend/src/components/profile/MemberProfileHero.test.tsx` - Updated the three full `PublicMemberProfileData`/`PublicMemberProfileResponse` test fixtures with a neutral `known_for` default so the suite keeps typechecking

## Decisions Made
- `PublicMemberKnownFor { active_years: string; top_roles: string[]; known_groups: string[] }` as one object field, mirroring the existing (unused) `deriveKnownFor.ts` `KnownForResult` shape in snake_case, per `profile.ts` convention.
- A dedicated `loadKnownFor` query rather than extending `countCurrentProjects`'s scalar `COUNT(*)` in place, since row-level role/group/year data is required for the Go-side aggregation (frequency-ranked top roles, distinct ordered groups, min/max started_year) that a `GROUP BY` collapse on the counting query cannot produce without changing its return shape.
- `active_years` is a formatted `"min–max"` (en-dash) display string, or a single year when min equals max, or an empty string when no `started_year` values exist in the approved set — matching `deriveKnownFor.ts`'s existing display-string precedent rather than introducing a second raw `{from, to}` year contract.

## Deviations from Plan

None - plan executed exactly as written. The `TestPublicMemberProfileMatchesOpenAPIAllowList`/`TestPublicMemberProfileForbiddenFieldsAbsent` and `getMemberProjects`-adjacent tests both required only the fixture update the plan specified, with no new test function.

## Issues Encountered
- The `team4sv30-backend` Docker container (per `docker-compose.override.yml`'s dev watch-sync setup) does not bind-mount `shared/contracts/` or `frontend/src/types/`, so `TestPublicMemberProfileMatchesOpenAPIAllowList` (which reads `../../../shared/contracts/openapi.yaml` relative to the container's `/app`) cannot resolve that path via a plain `docker exec`. Verified this is a pre-existing environment gap unrelated to this plan (the `os.ReadFile` call predates this plan's changes) by temporarily `docker cp`-ing `shared/` into the running container for verification only (`docker cp shared team4sv30-backend:/shared`, removed again after the test run — no persistent infrastructure change). `TestPublicMemberProfileMatchesOpenAPIAllowList` passed with the new `known_for` field in place. A separate, unrelated test (`TestPublicBadgeNextTierEnumParity`, reading `frontend/src/types/profile.ts`) has the same pre-existing gap and is out of this plan's scope.
- `TEAM4S_PHASE129_TEST_DSN` is not set in this environment, so the new `TestPhase132PublicProfileKnownForUsesApprovedFullSet` Postgres integration test (and all other `openPhase129Postgres`-gated tests in the same file) skip rather than run — consistent with every other test in that file and with the plan's `skip-if-unset` pattern. Not exercised live in this session; recommend running with the dedicated `team4s_phase129_test` DSN before merge/UAT if available.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `profile.known_for` (Go/OpenAPI/TS) is ready for Plan 132-02+ (or a later wave in this phase) to redirect `MemberProfileHero.tsx`'s `deriveKnownForFromPublicProfile` to read `profile.known_for` directly, removing the client-side re-aggregation bug and the now-duplicate `deriveKnownFor.ts` logic (D-11).
- No blockers. The `TestPhase132PublicProfileKnownForUsesApprovedFullSet` Postgres test should be run against a live `team4s_phase129_test` DSN as part of this phase's eventual live-UAT pass (Phase 134) to confirm the full-set aggregation behavior end-to-end, since it could not run in this session's environment.

---
*Phase: 132-shared-ssr-composition-race-safe-frontend-state*
*Completed: 2026-08-15*
