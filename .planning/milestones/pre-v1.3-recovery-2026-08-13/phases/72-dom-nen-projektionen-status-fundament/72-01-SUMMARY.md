---
phase: 72-dom-nen-projektionen-status-fundament
plan: 01
subsystem: database
tags: [postgres, migrations, go, source-fragment-test, status-foundation]

requires:
  - phase: 67-release-episode-credits
    provides: anime_contributions release_version_id and four-column uniqueness baseline
  - phase: 70-tiptap-bilder-fuer-member-profilgeschichte
    provides: media_assets.owner_member_id baseline for member media ownership
provides:
  - Migration 0096 with profile_status, dispute_state, visibility_id, review_status_id, and review_statuses lookup
  - No-DB Go source-fragment test guarding up/down SQL and status-axis invariants
affects: [phase-72, phase-73, phase-74, phase-76, phase-78, phase-79, phase-80]

tech-stack:
  added: []
  patterns: [append-only postgres migration, no-db source-fragment guard]

key-files:
  created:
    - database/migrations/0096_v12_status_foundation.up.sql
    - database/migrations/0096_v12_status_foundation.down.sql
    - backend/internal/repository/v12_status_foundation_migration_test.go
  modified: []

key-decisions:
  - "Review-Status bleibt Lookup-basiert via review_statuses und review_status_id; keine denormalisierte review_status VARCHAR-Spalte."
  - "Phase 72-01 fuehrt nur Schema und Test ein; keine Schreib-Endpunkte oder Setter fuer memorial/dispute/review/visibility."

patterns-established:
  - "Migration 0096 ist additiv und benennt Constraints/FKs explizit, damit down.sql exakt spiegeln kann."
  - "Wave-0-Migrationstests lesen SQL-Dateien ohne DB-Pool und pruefen positive Fragmente plus negative Status-Invarianten."

requirements-completed: [J, G]

duration: 9min
completed: 2026-06-05
---

# Phase 72 Plan 01: Status-Fundament Summary

**Append-only Migration 0096 fuer memorial-faehige Profile, getrennte Contribution-Konflikte und FK-basierte Visibility-/Review-Achsen auf Contributions und Media Assets.**

## Performance

- **Duration:** 9min
- **Started:** 2026-06-05T08:15:53Z
- **Completed:** 2026-06-05T08:24:35Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `members.profile_status` mit `active`, `historical`, `memorial` eingefuehrt.
- `anime_contributions.dispute_state` als separate Konflikt-Dimension neben dem Content-Status eingefuehrt.
- `review_statuses` Lookup mit `in_review`, `approved`, `rejected`, `archived`, `removed` plus FK-Spalten auf `anime_contributions` und `media_assets` angelegt.
- No-DB Source-Fragment-Test deckt up/down-Mirror, Seed-Werte, FK-Form und negative Status-/UNIQUE-Invarianten ab.

## Task Commits

1. **Task 1: Wave-0 Source-Fragment-Test gegen 0096 up/down SQL** - `30a4e358` (test)
2. **Task 2: Migration 0096 additive Statusfelder up/down** - `a566483c` (feat)

## Files Created/Modified

- `backend/internal/repository/v12_status_foundation_migration_test.go` - Load-bearing SQL-Fragmenttest ohne DB-Pool.
- `database/migrations/0096_v12_status_foundation.up.sql` - Additive Statusfelder, Review-Lookup, FK-Constraints und partielle Indizes.
- `database/migrations/0096_v12_status_foundation.down.sql` - Exakter Rollback fuer Indizes, Constraints, Spalten und Lookup-Tabelle.

## Decisions Made

- Review bleibt Lookup-basiert (`review_statuses` + `review_status_id`) und wird nicht als freie oder denormalisierte `review_status VARCHAR`-Spalte angelegt.
- Die lokale Migrate-CLI akzeptiert Rollbacks als `down -steps 1`; die Planform `down 1` wurde nur fuer die Ausfuehrung angepasst, nicht als Schema- oder API-Entscheidung.

## Deviations from Plan

None - plan executed as specified. The only command-level adjustment was using the repository's actual migrate syntax `down -steps 1`.

## Issues Encountered

- The first migration roundtrip attempt failed because `DATABASE_URL` was not set in the shell. Resolved by using the local docker-compose URL `postgres://team4s:team4s_dev_password@127.0.0.1:5433/team4s_v2?sslmode=disable`.
- The local database already showed version 96 as applied before the explicit roundtrip. The verification still ran `up` as an idempotent no-op, then `down -steps 1`, then `up`.
- A patch-path mistake briefly created the test file in the main checkout; it was removed before any plan commit. All committed files for this plan are in `C:\Users\admin\Documents\Team4s-phase72`.

## Checks Executed

- `cd backend && go test ./internal/repository/... -run TestV12StatusFoundation` - expected RED before migration files existed.
- `cd backend && go test ./internal/repository/... -run TestV12StatusFoundation -count=1` - passed after migration.
- `cd backend && go run ./cmd/migrate up -database-url ... -dir ..\database\migrations` - passed as no-op when 96 was already applied.
- `cd backend && go run ./cmd/migrate down -steps 1 -database-url ... -dir ..\database\migrations` - passed.
- `cd backend && go run ./cmd/migrate up -database-url ... -dir ..\database\migrations` - passed and applied 0096.
- `cd backend && go run ./cmd/migrate status -database-url ... -dir ..\database\migrations` - showed 96 applied, pending 0.
- `git diff --check` - passed.
- Focused `rg` negative scan for `anime_contributions.status`, `media_assets.status`, `dispute_state` in UNIQUE, and `review_status VARCHAR` - passed.

## Known Stubs

None.

## Auth Gates

None.

## Next Phase Readiness

Plan 02/03 can now join `visibilities` and `review_statuses` via FK fields and project `dispute_state` without reusing the existing content or technical status columns.

## Self-Check: PASSED

- Found created files: test file, up migration, down migration, summary.
- Found task commits: `30a4e358`, `a566483c`.

---
*Phase: 72-dom-nen-projektionen-status-fundament*
*Completed: 2026-06-05*
