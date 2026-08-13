---
phase: 97-revoke-rollen-lifecycle-uebergang
plan: 02
subsystem: api
tags: [go, handlers, postgres, fansub-members, contracts]

requires:
  - phase: 97-revoke-rollen-lifecycle-uebergang
    provides: 97-01 DATE schema migration
provides:
  - DATE-based backend repository structs for historical members and roles
  - Admin handler DTOs accepting ISO date strings
  - Fansub contract fields for historical member/role dates
  - Compatibility SQL for legacy year-shaped public/profile projections
affects: [fansub-admin-api, historical-members, member-profile, badge-service, domain-projection]

tech-stack:
  added: []
  patterns: [shared optional date parsing, legacy year projection from DATE columns]

key-files:
  created:
    - backend/internal/handlers/fansub_hist_date_helpers.go
  modified:
    - backend/internal/repository/hist_group_member_roles_repository.go
    - backend/internal/repository/hist_group_members_repository.go
    - backend/internal/handlers/fansub_hist_group_member_roles_handler.go
    - backend/internal/handlers/fansub_hist_group_members_handler.go
    - shared/contracts/fansubs.yaml
    - backend/internal/services/badge_service.go
    - backend/internal/repository/member_profile_repository.go
    - backend/internal/repository/domain_projection_repository.go
    - backend/internal/repository/contributor_dashboard_repository.go
    - backend/internal/repository/anime_contributions_public_repository.go

key-decisions:
  - "Admin historical member/role APIs now use *_date fields; unrelated public/profile year APIs derive years from DATE columns for compatibility."
  - "Date parse helpers live in a shared handler file to keep nullable PATCH semantics consistent."

patterns-established:
  - "PATCH nullable date fields use **string at the handler boundary and **time.Time in repositories."
  - "Legacy year responses over migrated historical tables use EXTRACT(YEAR FROM date_col)::int."

requirements-completed: [D-02, D-08]

duration: 55min
completed: 2026-07-01
---

# Phase 97-02: Backend Date API Summary

**Historical fansub member and role admin APIs now read/write DATE fields while legacy year-shaped views stay runtime-safe.**

## Performance

- **Duration:** 55min
- **Started:** 2026-07-01T15:35:00+02:00
- **Completed:** 2026-07-01T16:30:00+02:00
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Replaced historical member/role repository year fields with `*time.Time` date fields.
- Changed admin create/patch DTOs to `joined_date`, `left_date`, `started_date`, and `ended_date`.
- Added shared ISO date parsing with `YYYY-MM-DD` validation and 400 responses for invalid input.
- Updated `shared/contracts/fansubs.yaml` for the changed admin request/response shape.
- Fixed additional SQL references to removed historical year columns in badge, profile, domain projection, contributor dashboard, and public contribution paths.

## Task Commits

1. **Task 1/2: Admin repository + handler date API** - `aa2a277f` (feat)
2. **Runtime compatibility fix** - `a8deb90f` (fix)

**Plan metadata:** pending this summary commit.

## Files Created/Modified

- `backend/internal/handlers/fansub_hist_date_helpers.go` - Shared optional date parsing helpers.
- `backend/internal/repository/hist_group_member_roles_repository.go` - DATE structs and SQL for historical roles.
- `backend/internal/repository/hist_group_members_repository.go` - DATE structs and SQL for historical members.
- `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` - Role date request parsing.
- `backend/internal/handlers/fansub_hist_group_members_handler.go` - Member date request parsing.
- `shared/contracts/fansubs.yaml` - Focused Fansub API contract date fields.
- Runtime projection files - Derived legacy years from DATE columns where public/profile models still expose years.

## Decisions Made

- Kept public/profile year contracts stable for now and derived years from migrated DATE columns.
- Did not update `admin-content.yaml`; its matching `started_year` fields belong to anime contributions, not historical group roles.

## Deviations from Plan

### Auto-fixed Issues

**1. Additional runtime SQL references to dropped columns**
- **Found during:** Post-repository grep after core changes.
- **Issue:** Badge, profile, projection, dashboard, and public contribution queries still referenced `hist_*.*_year` columns that no longer exist.
- **Fix:** Swapped those references to DATE columns or `EXTRACT(YEAR FROM date_col)::int` where response contracts remain year-shaped.
- **Files modified:** `badge_service.go`, `member_profile_repository.go`, `domain_projection_repository.go`, `contributor_dashboard_repository.go`, `anime_contributions_public_repository.go`
- **Verification:** Runtime grep for old historical table aliases returned no matches; `go build ./...` passed.
- **Committed in:** `a8deb90f`

**2. File line limits not achieved**
- **Found during:** Final file count check.
- **Issue:** Some target files were already above the <=450 guideline before the change; extracting date helpers avoided further helper bloat but did not bring all files under 450.
- **Fix:** Kept functional scope small and documented the residual line-count mismatch instead of doing unrelated refactors.
- **Verification:** `go build ./...` passed.
- **Committed in:** `aa2a277f`

---

**Total deviations:** 2 documented (runtime safety, pre-existing file-size constraint)
**Impact on plan:** Necessary to keep the migrated schema usable across existing runtime paths.

## Issues Encountered

- Full `go test ./internal/repository/... ./internal/handlers/...` still fails on the intentional Wave-0 Plan-04 RED test for missing `ResolvePendingRolesToActive`.

## Verification

- `cd backend && go build ./...` - passed.
- `cd backend && go test ./internal/repository -run "TestHistRole"` - passed.
- `cd backend && go test ./internal/handlers/...` - passed.
- `cd backend && go test ./internal/repository -run "TestResolvePendingRolesToActive_ExistsOnRepository"` - expected FAIL until Plan 04.
- Runtime grep for historical table alias references to removed year columns returned no matches.
- Target-file grep found no `StartedYear`, `EndedYear`, `JoinedYear`, `LeftYear`, or old JSON year fields in the four Plan-02 files.

## User Setup Required

None.

## Next Phase Readiness

Wave 3 can now update frontend types and date-input UI against the backend date contract.

---
*Phase: 97-revoke-rollen-lifecycle-uebergang*
*Completed: 2026-07-01*
