---
phase: 139-scalable-user-admin-projections
plan: 05
subsystem: api
tags: [go, postgres, permissions, gin, admin, batching]

# Dependency graph
requires:
  - phase: 139-01
    provides: AdminUserRightsSummaryPage/AdminUserGroupRightsSummaryItem/AdminHeadlineCapabilityState DTOs and testsupport.OpenPhase139Postgres
  - phase: 139-04
    provides: AdminUsersRepository's mediaStorageDir constructor-parameter precedent (this plan's own constructor/parameter changes account for it without touching that constructor)
provides:
  - "GET /admin/users/:userId/rights-summary — a genuinely batched endpoint answering every group membership's compact rights summary in O(1) SQL round trips (2-3), never one ResolveGroupRights call per group"
  - "permissions.Service.EvaluateGroupRightsFromSources/ResolveGroupRightsBatch — a thin façade + batch orchestrator over the existing unexported evaluateGroupRights, zero new precedence logic (D21)"
  - "GetUserGroupMemberships real server-side LIMIT/OFFSET pagination (was previously fully unbounded, F-01 finding #1)"
affects: [139-07, 139-08, 139-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GroupRightsMembershipBatchResolver/GroupRightsOverridesBatchResolver/SpecializedGrantBatchProvider — batched counterparts to Phase 137's existing single-group optional-interface discovery convention (type-assert against s.resolver, graceful degradation to empty when unsupported)"
    - "Narrow-interface handler dependency (adminUsersRightsResolver) mirroring admin_effective_rights_handler.go's effectiveRightsPermissionService convention, rather than depending on the concrete *permissions.Service type"
    - "New repository-package file (authz_permissions_batch.go) used to add methods to an existing struct (AuthzRepository) specifically to avoid growing an already-over-450-line file further (CLAUDE.md file-size discipline)"

key-files:
  created:
    - backend/internal/permissions/effective_rights_batch_summary.go
    - backend/internal/permissions/effective_rights_batch_summary_test.go
    - backend/internal/repository/authz_permissions_batch.go
    - backend/internal/repository/admin_users_rights_summary_query.go
    - backend/internal/repository/admin_users_rights_summary_query_test.go
  modified:
    - backend/internal/repository/authz_user_overrides.go
    - backend/internal/repository/admin_users_tab_repository.go
    - backend/internal/repository/admin_users_repository_test.go
    - backend/internal/models/admin_users.go
    - backend/internal/handlers/admin_users_handler.go
    - backend/internal/handlers/admin_users_handler_test.go
    - backend/internal/handlers/admin_capability_contract_test.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - shared/contracts/admin-capabilities.yaml

key-decisions:
  - "GroupRightsSourcesInput.Roles is []string (group role codes, e.g. \"fansub_lead\"), NOT []Action as the plan's own <interfaces> block literally stated — the actual unexported groupRightsSources.Roles field (effective_rights.go) has always been []string, and Action is a distinct capability-code vocabulary (e.g. \"fansub_group.edit\") evaluateGroupRights never mixes with role codes. Followed the real existing type, not the plan's inaccurate restatement of it."
  - "AdminUsersRepository.GetUserRightsSummary accepts a resolver as a CALL parameter (AdminUsersRightsBatchResolver, repository-package narrow interface), not via the repository's constructor — keeps NewAdminUsersRepository's existing (db, mediaStorageDir) signature stable for its other already-wired callers, per the plan's own explicitly offered option."
  - "AdminHeadlineCapabilityState.Label (already locked by 139-01/139-02's DTO shapes) is populated with REAL action_definitions.label_de / role_definitions.label_de catalog labels (two additional one-time queries, not per-group), rather than left as a raw action_code duplicate — the plan's own text flagged this as an open executor choice ('prefer NOT resolving labels server-side... whichever avoids duplicating label-resolution logic'), but since the DTO's Label field already exists as a non-optional contract field, populating it with real catalog data was judged more honest than leaving a placeholder that duplicates action_code with a different name."
  - "The batched review-grant/membership/overrides methods live in a NEW file (authz_permissions_batch.go) rather than growing authz_permissions.go, which is already 571 lines (127% over CLAUDE.md's 450-line cap, pre-existing Phase-137 debt) — CLAUDE.md's file-size discipline takes precedence over adding to an already-oversized file."
  - "Added two integration test files (effective_rights_batch_summary_test.go, admin_users_rights_summary_query_test.go) beyond the plan's literal file list, since Task 2's own acceptance criteria named a `-run TestGetUserRightsSummary` test command with no corresponding test file in the plan's stated files_modified — closing that gap was necessary to satisfy the plan's own stated verification command."

requirements-completed: [UADM-06]

# Metrics
duration: 20min
completed: 2026-08-24
---

# Phase 139 Plan 05: Batched Rights-Summary Endpoint (F-01) Summary

**New `GET /admin/users/:userId/rights-summary` answers every group membership's compact rights summary in a fixed 5-7 SQL round trips (regardless of group count) via a new `permissions.Service.ResolveGroupRightsBatch` batch orchestrator that reuses Phase 137's unmodified precedence engine — closing UADM-06's more consequential half (the default Overview tab), which the external review package's Rights-tab-only fix left open.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-24 (session start, after ~15 min of context/code investigation)
- **Completed:** 2026-08-24
- **Tasks:** 3/3 completed
- **Files modified:** 15 (5 created, 10 modified)

## Accomplishments

- `permissions.Service.EvaluateGroupRightsFromSources` — a thin type-conversion wrapper over the existing unexported `evaluateGroupRights`, proven byte-identical to `ResolveGroupRights` given the same facts (D21, zero new precedence logic).
- `permissions.Service.ResolveGroupRightsBatch` — batches membership/overrides/specialized-grant loading across N groups in exactly 2-3 SQL round trips (proven constant for 3 vs 30 groups via a fake-call-count test), never looping `ResolveGroupRights` per group.
- `GetUserGroupMemberships` gained real `LIMIT`/`OFFSET` pagination with `COUNT(*) OVER()` over the same grouped result (F-01 finding #1 — was previously fully unbounded).
- New `AdminUsersRepository.GetUserRightsSummary` assembles the full F-01 response (role label, up-to-3 headline capability states sorted by action code, `has_deviation` over the FULL action set, `open_claims_count` reusing the existing per-user source) via exactly one `ResolveGroupRightsBatch` call plus 4 constant-cost catalog/actor queries.
- `AuthzRepository` now implements all three new batch-resolver interfaces (`GroupRightsMembershipBatchResolver`/`GroupRightsOverridesBatchResolver`/`SpecializedGrantBatchProvider`), each backed by a genuine single-query batch load (never a per-group loop).
- New route `GET /admin/users/:userId/rights-summary`, contract-documented in `admin-capabilities.yaml` (F-02 Option B: same contract family as the existing effective-rights endpoints), with a new `TestAdminUserRightsSummarySchemaContract` proving Go DTO ↔ YAML field parity.
- Full scoped regression (`go build ./...`, `go vet ./...`, `go test ./internal/permissions/... ./internal/repository/... ./internal/handlers/...`): exactly 60 pre-existing failures (0 + 36 + 24), matching `139-BASELINE.md`'s documented count exactly — zero new failures introduced by any file this plan touches.

## Task Commits

Each task was committed atomically:

1. **Task 1: permissions package — exported batch-evaluation façade** - `36422142` (feat)
2. **Task 2: Batched repository primitives + GetUserGroupMemberships pagination + GetUserRightsSummary** - `356cde16` (feat)
3. **Task 3: Handler + route + admin-capabilities.yaml contract + interface/stub lockstep update** - `8255bd3c` (feat)

**Plan metadata:** (pending — this SUMMARY's own commit)

## Files Created/Modified

- `backend/internal/permissions/effective_rights_batch_summary.go` - `GroupRightsSourcesInput`, `EvaluateGroupRightsFromSources`, `GroupRightsMembershipBatchResolver`/`GroupRightsOverridesBatchResolver`/`SpecializedGrantBatchProvider`, `ResolveGroupRightsBatch`
- `backend/internal/permissions/effective_rights_batch_summary_test.go` - 3 tests proving pure re-projection, per-group parity (including platform-admin fast path + real user_deny), and constant fake-call count for 3 vs 30 groups
- `backend/internal/repository/authz_user_overrides.go` - new `LoadCurrentOverridesForGroups` (one query across `fansub_group_id = ANY($2)`)
- `backend/internal/repository/authz_permissions_batch.go` - new file: `AuthzRepository.ResolveActorGroupMembershipsForGroups`/`ResolveActorUserOverridesForGroups`/`ResolveActorReviewGrantContextsForGroups`/`ResolveGroupGrantsForGroups`, plus the 3 compile-time interface assertions
- `backend/internal/repository/admin_users_tab_repository.go` - `GetUserGroupMemberships` gains `limit`/`offset` + `COUNT(*) OVER()` + `Meta`; new thin `GetUserRightsSummary` delegator
- `backend/internal/repository/admin_users_rights_summary_query.go` - new file: `listUserRightsSummary` (the real F-01 assembly logic), `AdminUsersRightsBatchResolver` narrow interface, actor/open-claims/action-label/role-label helpers
- `backend/internal/repository/admin_users_rights_summary_query_test.go` - 2 integration tests against `testsupport.OpenPhase139Postgres` proving single-batch-call wiring and correct assembly
- `backend/internal/repository/admin_users_repository_test.go` - static interface assertion updated to the new `GetUserGroupMemberships`/`GetUserRightsSummary` signatures
- `backend/internal/models/admin_users.go` - `AdminUserGroupMembershipsResult` gains an additive `Meta AdminListMeta` field
- `backend/internal/handlers/admin_users_handler.go` - `AdminUsersRepository` interface updated; new `adminUsersRightsResolver` narrow interface; `AdminUsersHandler`/`NewAdminUsersHandler` gain the 4th dependency; `GetUserGroupMemberships` parses limit/offset; new `GetUserRightsSummary` handler
- `backend/internal/handlers/admin_users_handler_test.go` - `adminUsersRepoStub` updated in lockstep (limit/offset + new `GetUserRightsSummary` stub method); new `adminUsersRightsResolverStub`; `buildAdminUsersHandler` passes the 4th argument
- `backend/internal/handlers/admin_capability_contract_test.go` - new `TestAdminUserRightsSummarySchemaContract`
- `backend/cmd/server/admin_routes.go` - new route registration
- `backend/cmd/server/main.go` - `NewAdminUsersHandler` call site passes `permissionSvc`
- `shared/contracts/admin-capabilities.yaml` - new path + `AdminHeadlineCapabilityState`/`AdminUserGroupRightsSummaryItem`/`AdminUserRightsSummaryPage` schemas

## Decisions Made

- Followed the actual, real `groupRightsSources.Roles []string` type (role codes) rather than the plan's own `<interfaces>` block, which incorrectly restated it as `[]Action` — verified directly against `effective_rights.go`.
- `GetUserRightsSummary` takes its resolver as a call parameter (not a constructor field), keeping `NewAdminUsersRepository`'s existing 2-arg signature stable.
- Populated `AdminHeadlineCapabilityState.Label` with real `action_definitions`/`role_definitions` catalog labels (2 additional constant-cost queries), since the field already exists as a non-optional part of the locked 139-01/139-02 DTO contract.
- Placed the new batch-resolver methods in a new `authz_permissions_batch.go` file rather than growing the already-571-line `authz_permissions.go` (pre-existing over-cap debt), per CLAUDE.md's 450-line file discipline.
- Added 2 integration test files beyond the plan's literal file list, since Task 2's acceptance criteria named a test command (`-run TestGetUserRightsSummary`) with no backing test file specified in the plan — closing that gap satisfies the plan's own verification requirement (Rule 2: missing critical functionality).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in plan text] `GroupRightsSourcesInput.Roles` type corrected from the plan's stated `[]Action` to the actual `[]string`**
- **Found during:** Task 1 (reading `effective_rights.go` before writing the façade)
- **Issue:** The plan's `<interfaces>` block literally states `type groupRightsSources struct { Roles []Action; ... }`, but the real, existing unexported `groupRightsSources.Roles` field (and `ListActorGroupRoles`, and `AdminGroupMembershipSummary.Roles`) has always been `[]string` (role codes like `"fansub_lead"`). `Action` is a distinct capability-code vocabulary (e.g. `"fansub_group.edit"`) that `evaluateGroupRights` never mixes with role codes.
- **Fix:** Declared `GroupRightsSourcesInput.Roles` as `[]string`, matching the real `groupRightsSources` shape exactly, and threaded `map[int64][]string` through `ResolveGroupRightsBatch`'s `rolesByGroup` parameter and the repository layer consistently.
- **Files modified:** `backend/internal/permissions/effective_rights_batch_summary.go`, `backend/internal/repository/admin_users_rights_summary_query.go`, `backend/internal/repository/authz_permissions_batch.go`
- **Verification:** `go build ./...` clean; `TestEvaluateGroupRightsFromSourcesMatchesResolveGroupRights`/`TestResolveGroupRightsBatchMatchesPerGroupResolveGroupRights` both pass, proving byte-identical results against the real single-group resolver which also uses `[]string` roles.
- **Committed in:** `36422142` (Task 1 commit)

**2. [Rule 3 - Blocking issue] `admin_users_repository_test.go`'s static interface assertion required updating for the new method signatures**
- **Found during:** Task 2 (`go build ./internal/repository/...` after changing `GetUserGroupMemberships`)
- **Issue:** A locally-declared interface literal in this test file asserted `AdminUsersRepository` satisfies the OLD `GetUserGroupMemberships(ctx, appUserID)` signature and had no `GetUserRightsSummary` entry — this is a compile-time assertion, so the whole `repository` package failed to build once the concrete method's signature changed.
- **Fix:** Updated the assertion's `GetUserGroupMemberships` entry to `(ctx, appUserID, limit, offset)` and added the new `GetUserRightsSummary(ctx, appUserID, limit, offset, resolver AdminUsersRightsBatchResolver)` entry.
- **Files modified:** `backend/internal/repository/admin_users_repository_test.go`
- **Verification:** `go build ./... ` and `go test ./internal/repository/...` both clean afterward.
- **Committed in:** `356cde16` (Task 2 commit)

---

**Total deviations:** 1 plan-text correction (Rule 1) + 1 blocking-compile fix (Rule 3). Both necessary for the plan's own stated must-haves to actually compile and hold true; no scope creep — no functionality was added beyond what F-01/UADM-06 requires.

## Issues Encountered

The disposable Phase-139 Postgres database (`team4s_phase139_test_r05`) did not exist yet this session and had to be created manually before the real-Postgres integration tests could run (documented, expected convention per `139-RESEARCH.md`'s Environment Availability table — every phase's executor creates/drops its own disposable DB per session). Created via `docker exec team4sv30-db psql -U team4s -d postgres -c "CREATE DATABASE team4s_phase139_test_r05;"`, used for all Task 2/Task 3 real-Postgres test runs, and dropped again at the end of this plan's execution.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `GET /admin/users/:userId/rights-summary` is live end-to-end (repository → handler → route → contract), ready for the frontend tab-rewrite plans (139-07/08/09) to consume in place of `UserOverviewTab.tsx`'s current per-group `Promise.all(getEffectiveRights)` fan-out.
- `frontend/src/lib/api.ts` has no `getAdminUserRightsSummary` helper yet and `UserOverviewTab.tsx` still calls the old per-group fan-out — this is expected and untouched by design (139-05 is backend-only per its own scope); a later frontend plan must wire the new endpoint and delete the fan-out.
- The disclosed F-01 scope note (review-delegation specialized grants ARE included in this batched path, since `ResolveGroupGrantsForGroups` is wired in this same plan — unlike the plan's own worst-case caveat, which anticipated a resolver that might NOT implement the batch variant) means this endpoint's `headline_states`/`has_deviation` are at full fidelity today, not degraded.
- No blockers for 139-06 (QUAL-06 gates) or the frontend tab-rewrite plans.

---
*Phase: 139-scalable-user-admin-projections*
*Completed: 2026-08-24*

## Self-Check: PASSED

- FOUND: `backend/internal/permissions/effective_rights_batch_summary.go`
- FOUND: `backend/internal/permissions/effective_rights_batch_summary_test.go`
- FOUND: `backend/internal/repository/authz_permissions_batch.go`
- FOUND: `backend/internal/repository/admin_users_rights_summary_query.go`
- FOUND: `backend/internal/repository/admin_users_rights_summary_query_test.go`
- FOUND: commit `36422142` in `git log`
- FOUND: commit `356cde16` in `git log`
- FOUND: commit `8255bd3c` in `git log`
- FOUND: `go build ./...` / `go vet ./...` clean
- FOUND: `go test ./internal/permissions/... ./internal/repository/... ./internal/handlers/...` FAIL count = 60 (0 + 36 + 24), matches 139-BASELINE.md documented baseline exactly
