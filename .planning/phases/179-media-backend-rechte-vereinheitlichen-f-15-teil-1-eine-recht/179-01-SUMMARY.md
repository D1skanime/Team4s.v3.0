---
phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht
plan: 01
subsystem: api
tags: [go, permissions, capability-registry, postgres-migration, authorization]

# Dependency graph
requires:
  - phase: 178
    provides: stable main branch state for Phase 179 to build on
provides:
  - "ActionReleaseThemeAssetUpload permissions.Action constant, registered in allKnownActions"
  - "Migration 0182 seeding action_definitions/role_capabilities for release_version_theme_asset.upload (11 roles)"
  - "9 capability-catalog test fixtures updated to stay green with the new action"
affects: [179-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Data-driven permission action registration via action_definitions + role_capabilities migration (mirrors migration 0173's shape)"

key-files:
  created:
    - database/migrations/0182_release_version_theme_asset_upload.up.sql
    - database/migrations/0182_release_version_theme_asset_upload.down.sql
    - .planning/phases/179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht/deferred-items.md
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/handlers/app_auth_test.go
    - backend/internal/handlers/dashboard_me_handler_test.go
    - backend/internal/services/review_service_test.go
    - backend/internal/services/effective_rights_service_test.go
    - backend/internal/permissions/capability_registry_test.go
    - backend/internal/permissions/permissions_reload_test.go
    - backend/internal/repository/membership_baseline_registry_test.go
    - backend/internal/repository/authz_permissions_test.go
    - backend/internal/repository/release_review_query_repository_test.go

key-decisions:
  - "D-12: ActionReleaseThemeAssetUpload gets the exact 11-role list release_version_media.upload already has — no rights change for existing users, just a correctly-named action"
  - "New action inserted into allKnownActions (not standaloneActions) since it has real role_capabilities rows per D-12"

patterns-established:
  - "New data-driven action = one forward/reverse SQL migration (action_definitions + role_capabilities) + one Action const in permissions.go's const block + one allKnownActions entry"

requirements-completed: [D-12]

# Metrics
duration: ~45min
completed: 2026-10-10
---

# Phase 179 Plan 01: Register release_version_theme_asset.upload capability Summary

**New `ActionReleaseThemeAssetUpload` permission action registered end-to-end (migration 0182 + Go constant + allKnownActions), with the exact 11-role list `release_version_media.upload` already grants, and all 9 hardcoded capability-catalog test fixtures updated so `go test ./...` stays green.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-10-10T20:53:00Z (approx.)
- **Completed:** 2026-10-10T21:38:28Z
- **Tasks:** 3 completed
- **Files modified:** 11 (2 new migration files, 1 permissions.go, 9 test fixtures) + 1 new deferred-items.md

## Accomplishments
- Migration 0182 (up/down) seeds `action_definitions` + 11 `role_capabilities` rows for the new `release_version_theme_asset.upload` action, verified via the real full-chain fresh-apply/rollback proof test against an isolated ephemeral database (never `team4s_v2`)
- `permissions.ActionReleaseThemeAssetUpload` declared and wired into `allKnownActions` (not `standaloneActions`), keeping the server's fail-closed `validateCapabilityCatalog` check satisfied
- All 9 pre-existing hardcoded "complete capability catalog" test fixtures across `handlers`, `services`, `permissions`, and `repository` packages updated with the new action in a safe bucket, preserving `app_auth_test.go`'s deliberate `RoleProjectLead`/`RoleEncoder`/`RoleRawProvider` negative fixtures that Plan 179-02 needs

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migration 0182 (up/down) for release_version_theme_asset.upload** - `31af4cc2` (feat)
2. **Task 2: Register ActionReleaseThemeAssetUpload in permissions.go** - `ae31d940` (feat)
3. **Task 3: Repair the 9 hardcoded "complete capability catalog" test fixtures** - `e4c056fb` (fix)

_No TDD tasks in this plan; all three were straightforward data/registration/fixture tasks._

## Files Created/Modified
- `database/migrations/0182_release_version_theme_asset_upload.up.sql` - seeds the new action_definitions row (category `release`, sort_order 90) and 11 role_capabilities rows
- `database/migrations/0182_release_version_theme_asset_upload.down.sql` - reverses both inserts
- `backend/internal/permissions/permissions.go` - new `ActionReleaseThemeAssetUpload` const, added to `allKnownActions`
- `backend/internal/handlers/app_auth_test.go` - added to the `allActions` local slice only (not the narrower per-role entries, preserving Plan 179-02's negative-fixture needs)
- `backend/internal/handlers/dashboard_me_handler_test.go` - added to the `RoleFansubLead` bucket
- `backend/internal/services/review_service_test.go` - added to the `_review_service_test_unused_role` bucket
- `backend/internal/services/effective_rights_service_test.go` - added to the `_effective_rights_test_unused_role` bucket
- `backend/internal/permissions/capability_registry_test.go` - added to the `RoleFansubLead` bucket in `roleMatrixStubData()`
- `backend/internal/permissions/permissions_reload_test.go` - added to the `RoleFansubLead` bucket in `fullValidCacheData()`
- `backend/internal/repository/membership_baseline_registry_test.go` - added to the filler-list in `membershipBaselineFillGapCacheLoader`
- `backend/internal/repository/authz_permissions_test.go` - added to the `_authz_permissions_test_unused_role` bucket
- `backend/internal/repository/release_review_query_repository_test.go` - added to the `_release_review_test_unused_role` bucket
- `.planning/phases/179-.../deferred-items.md` - logs 5 confirmed pre-existing, out-of-scope test failures found while verifying `go test ./...`

## Decisions Made
- Followed D-12 verbatim: identical 11-role list, no rights change for existing users
- `sort_order=90`, `category='release'`, `user_overridable=false` chosen to mirror `release_version_media.upload`'s own `action_definitions` row exactly (per the plan's research)

## Deviations from Plan

None - plan executed exactly as written. All 3 tasks' files, actions, and acceptance criteria match the plan verbatim. The only extra artifact produced (`deferred-items.md`) documents out-of-scope findings rather than modifying any in-scope code, consistent with the plan's own "Scope Boundary" guidance.

## Issues Encountered

**Task 3's acceptance criterion ("`go test ./...` reports no FAIL line") could not be met literally** because of 5 categories of pre-existing, unrelated failures already present on `main` before this plan started (confirmed by reverting touched files back to commit `fda8b921` and re-running the affected tests in isolation):

1. Two tests (`TestPhase141RevokedDelegationImmediateEffect`, `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes`) fail with `Action "release_version_media.reorder" fehlt in role_capabilities` — their fixtures were already missing an older, unrelated action before this plan touched them.
2. Multiple repository/migration tests require `TEAM4S_PHASE128_TEST_DSN` / `TEAM4S_PHASE134_TEST_DSN` / `TEAM4S_PHASE134_MIGRATION_DSN` env vars that are not exported by default in this environment.
3. `TestPhase134Matrix*` tests require a live backend on port 18093 and working Keycloak credentials — both unavailable in this execution context.
4. Three Jellyfin-related handler tests reference missing fixture files under `docs/audits/2026-09-15-jellyfin12/fixtures/`.
5. One stale source-grep test (`TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers`) references a method name/signature that no longer exists in `member_claims_repository.go`.

All 5 categories are logged in detail in `deferred-items.md` with evidence of pre-existence. None reference `release_version_theme_asset.upload`, confirming this plan's own work introduced zero new failures. The plan's three `<verification>` commands (Task 1's migration proof, Task 2's `go build`, and the targeted scope of Task 3's own 9-file completeness check) all pass cleanly.

## User Setup Required

None - no external service configuration required. Migration 0182 has not yet been applied to the live `team4s_v2` database (per project convention, migrations are applied separately via `cmd/migrate`, not during plan execution); it was only verified against the isolated `team4s_phase134_migration_fresh` ephemeral database used by the fresh-apply/rollback proof test.

## Next Phase Readiness

Plan 179-02 (swapping the reused `release_version_media.upload` action for the new `ActionReleaseThemeAssetUpload` in the two theme-asset upload handlers) can proceed immediately: the new constant is compiled, registered in `allKnownActions`, and `app_auth_test.go`'s `RoleProjectLead`/`RoleEncoder`/`RoleRawProvider` entries deliberately still lack the new action, preserving the negative-fixture contrast Plan 179-02's tests need to prove the handler swap actually changed which action is checked.

---
*Phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht*
*Completed: 2026-10-10*

## Self-Check: PASSED

- FOUND: database/migrations/0182_release_version_theme_asset_upload.up.sql
- FOUND: database/migrations/0182_release_version_theme_asset_upload.down.sql
- FOUND: .planning/phases/179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht/deferred-items.md
- FOUND: .planning/phases/179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht/179-01-SUMMARY.md
- FOUND commit: 31af4cc2 (Task 1)
- FOUND commit: ae31d940 (Task 2)
- FOUND commit: e4c056fb (Task 3)
