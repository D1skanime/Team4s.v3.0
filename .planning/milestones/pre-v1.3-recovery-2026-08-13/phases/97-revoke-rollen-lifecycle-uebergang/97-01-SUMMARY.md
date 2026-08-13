---
phase: 97-revoke-rollen-lifecycle-uebergang
plan: 01
subsystem: database
tags: [postgres, migrations, fansub-members, role-lifecycle, dates]

requires:
  - phase: 97-revoke-rollen-lifecycle-uebergang
    provides: 97-00 RED tests for DATE fields and lifecycle behavior
provides:
  - DATE-based historical role and historical member schema
  - Active role tenure start column
  - D-10 auto-archive write path using DATE columns
affects: [hist_group_member_roles, hist_fansub_group_members, fansub_group_member_roles, fansub-group-app-members-repository]

tech-stack:
  added: []
  patterns: [transactional reversible migrations, date-truncated active role tenure]

key-files:
  created:
    - database/migrations/0114_hist_roles_date_migration.up.sql
    - database/migrations/0114_hist_roles_date_migration.down.sql
    - database/migrations/0115_active_roles_tenure_date.up.sql
    - database/migrations/0115_active_roles_tenure_date.down.sql
  modified:
    - backend/internal/repository/fansub_group_app_members_repository.go

key-decisions:
  - "Initial member creation now also writes tenure_started_on for active roles, not only SetRole enable."
  - "Down-migration was tested only after confirming local DATE values were still Jan 1 derived values."

patterns-established:
  - "Historical year-to-date migrations map existing year integers to MAKE_DATE(year, 1, 1)."
  - "Active role assignment writes DATE tenure with UTC day truncation."

requirements-completed: [D-02, D-04]

duration: 30min
completed: 2026-07-01
---

# Phase 97-01: Date Schema Migration Summary

**Historical member/role periods now use DATE columns, active roles have tenure start dates, and D-10 auto-archive writes date ranges.**

## Performance

- **Duration:** 30min
- **Started:** 2026-07-01T15:05:00+02:00
- **Completed:** 2026-07-01T15:35:00+02:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added reversible migrations `0114` and `0115`.
- Migrated `started_year`/`ended_year` and `joined_year`/`left_year` to DATE columns with `MAKE_DATE(year, 1, 1)`.
- Added `fansub_group_member_roles.tenure_started_on`.
- Updated active role insert and D-10 archive paths to write DATE values.

## Task Commits

1. **Task 1: SQL migrations** - `d21c7b89` (db)
2. **Task 2: Repository write paths** - `ebfe0c90` (fix)

**Plan metadata:** pending this summary commit.

## Files Created/Modified

- `database/migrations/0114_hist_roles_date_migration.up.sql` - Converts historical role/member year columns to DATE columns.
- `database/migrations/0114_hist_roles_date_migration.down.sql` - Restores year columns from DATE columns via `EXTRACT(YEAR FROM ...)`.
- `database/migrations/0115_active_roles_tenure_date.up.sql` - Adds nullable `tenure_started_on`.
- `database/migrations/0115_active_roles_tenure_date.down.sql` - Drops `tenure_started_on`.
- `backend/internal/repository/fansub_group_app_members_repository.go` - Writes active tenure dates and archives removed roles with `started_date`/`ended_date`.

## Decisions Made

- Extended the tenure write to `Create` as well as `SetRole`, because both paths create active role rows.
- Tested rollback only after confirming local migrated dates had no day/month precision beyond Jan 1.

## Deviations from Plan

### Auto-fixed Issues

**1. Active role creation path also needed tenure_started_on**
- **Found during:** Task 2 (repository write path)
- **Issue:** The plan named `SetRole` enable only, but `Create` also inserts rows into `fansub_group_member_roles`.
- **Fix:** Added one shared UTC-truncated date value for initial role inserts.
- **Files modified:** `backend/internal/repository/fansub_group_app_members_repository.go`
- **Verification:** `go build ./...` passed.
- **Committed in:** `ebfe0c90`

---

**Total deviations:** 1 auto-fixed (missing write path)
**Impact on plan:** Keeps the active-role tenure invariant stronger without changing API behavior.

## Issues Encountered

- Direct `psql -U team4s -d team4s` failed because the local DB is `team4s_v2`; verification then used `DATABASE_URL` from the backend container.
- A parallel status check ran before `migrate up` completed and briefly showed pending migrations; a serial re-check confirmed `Applied: 115, Pending: 0`.

## Verification

- `cd backend && go build ./...` - passed.
- `docker compose exec -T team4sv30-backend ./migrate status` - showed `114` and `115` pending before migration.
- `docker compose exec -T team4sv30-backend ./migrate up` - applied 2 migrations.
- Schema checks confirmed `started_date`, `ended_date`, `joined_date`, `left_date`, and `tenure_started_on` as `date`.
- Negative old-column checks for `started_year` and `joined_year` failed with `column does not exist`, as expected.
- Safety check before rollback found 0 non-Jan1 historical role/member dates.
- `docker compose exec -T team4sv30-backend ./migrate down -steps 2` - rolled back 2 migrations.
- `docker compose exec -T team4sv30-backend ./migrate up` - re-applied 2 migrations.
- Final status confirmed `Applied: 115, Pending: 0`.

## User Setup Required

None for local dev; the local Docker DB has already applied migrations `0114` and `0115`.

## Next Phase Readiness

Wave 2 can now update backend repository structs, DTOs, handlers, and contracts from year fields to date fields against the migrated schema.

---
*Phase: 97-revoke-rollen-lifecycle-uebergang*
*Completed: 2026-07-01*
