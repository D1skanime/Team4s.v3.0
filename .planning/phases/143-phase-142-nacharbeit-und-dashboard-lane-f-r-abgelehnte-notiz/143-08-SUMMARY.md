---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 08
subsystem: database
tags: [postgresql, migrations, role-capabilities, permissions, idempotency]

# Dependency graph
requires:
  - phase: 143 (Waves 05/06/07)
    provides: prior Phase-143 remediation work this plan's migration numbering (0159) follows
provides:
  - "Migration 0159: idempotent, reversible role_capabilities reset superseding 0154's unconditional-DELETE/no-op-down pattern without editing 0154"
  - "Regression proof (TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible) that 0159's raw SQL is genuinely idempotent and its down.sql preserves migration 0153's 12 techadmin rows"
affects: [143-later-waves, any-future-role-capability-catalog-changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Append-only migration superseding an earlier migration's intent (0159 supersedes 0154 without editing it)"
    - "Force a real second execution of a tracked migration's raw SQL in a test by deleting only that migration's own schema_migrations row between two Runner.Up() calls (a bare second Up() call is always a no-op regardless of SQL content)"

key-files:
  created:
    - database/migrations/0159_role_capability_defaults_reset.up.sql
    - database/migrations/0159_role_capability_defaults_reset.down.sql
    - backend/internal/migrations/phase143_role_capability_defaults_reset_test.go
  modified: []

key-decisions:
  - "0154 is left untouched (append-only) per CLAUDE.md/CONTEXT.md Kriterium 2 — 0159 is a new migration that establishes the corrected target state instead"
  - "0159's up.sql row list is generated programmatically as a byte-identical copy of 0154's 232-tuple VALUES list (same order), with ON CONFLICT (role_code, action_code) DO NOTHING added for true idempotency"
  - "0159's down.sql deletes exactly the 220 non-techadmin tuples, leaving the 12 techadmin rows migration 0153 established intact"

patterns-established:
  - "Migration idempotency/reversibility proof pattern: ephemeral DB via testsupport.OpenPhase134MaintenancePool + DropAndCreatePhase134FreshDatabase, full chain Up(), delete one migration's own schema_migrations row, Up() again to force real re-execution, then Down(ctx, 1) to test reversibility"

requirements-completed: ["Criterion-2"]

# Metrics
duration: ~20min
completed: 2026-09-01
---

# Phase 143 Plan 08: Migration 0159 idempotent role-capability reset Summary

**New append-only migration 0159 replaces migration 0154's blunt unconditional `DELETE FROM role_capabilities` + no-op `down.sql` with an idempotent (`ON CONFLICT DO NOTHING`), reversible pattern that preserves migration 0153's 12 techadmin rows, proven against a real ephemeral Postgres database.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-01T21:46:22Z
- **Tasks:** 2 completed
- **Files modified:** 3 (all new files)

## Accomplishments
- `database/migrations/0159_role_capability_defaults_reset.up.sql` establishes the exact same approved 232-row `role_capabilities` catalog as 0154 (byte-identical tuples, same order, extracted programmatically from 0154's own file to avoid transcription error), through a `DELETE` + `INSERT ... ON CONFLICT (role_code, action_code) DO NOTHING` pattern that is a true no-op on re-application
- `database/migrations/0159_role_capability_defaults_reset.down.sql` deletes only the 220 non-techadmin tuples, leaving migration 0153's 12 `techadmin` rows in place — closing 0154's empty `BEGIN;COMMIT;` no-op-down gap
- New regression test `TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible` proves both properties against a genuinely fresh, migration-chain-applied database: it forces a real second execution of 0159's raw SQL (by deleting only its own `schema_migrations` tracking row, not a bare second `Runner.Up()` call, which the plan's interface notes correctly flags as a no-op for any migration regardless of content) and asserts the `role_capabilities` row count is unchanged, then reverts via `Runner.Down(ctx, 1)` and asserts the 12 techadmin rows survive

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migration 0159 (idempotent reset + techadmin-preserving down)** - `651546c2` (feat)
2. **Task 2: Write the migration-chain idempotency + reversibility test** - `1df5db39` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `database/migrations/0159_role_capability_defaults_reset.up.sql` - Idempotent reset of `role_capabilities` to the approved 232-row catalog
- `database/migrations/0159_role_capability_defaults_reset.down.sql` - Reverts 0159's insert while preserving migration 0153's 12 techadmin rows
- `backend/internal/migrations/phase143_role_capability_defaults_reset_test.go` - Ephemeral-database proof of idempotency and reversibility

## Decisions Made
- Generated both SQL files' VALUES lists programmatically (Python script parsing 0154's actual file content) rather than hand-transcribing 232 tuples, to guarantee byte-identical catalog content and eliminate transcription risk
- Reworded the up.sql header comment to avoid literally containing the string `DELETE FROM role_capabilities;` inside a comment line, since the plan's acceptance criteria greps for exactly one occurrence of that unconditional statement (the comment's first draft accidentally created a second match)

## Deviations from Plan

None - plan executed exactly as written. The one self-correction (comment wording adjusted so the acceptance-criteria grep count stayed exactly 1) was caught and fixed before the Task 1 commit, not a deviation from the shipped result.

## Issues Encountered
- The plan's own verification commands (`docker compose exec team4sv30-backend go test ./internal/migrations/... -run TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible -v`) fail with a `t.Fatalf` on `TEAM4S_PHASE134_MIGRATION_DSN is required` when run without that env var, exactly as 143-VALIDATION.md's "Backend Gate Qualification" section documents as expected/pre-existing behavior for this package. Ran the qualified form instead: `docker compose exec -T -e TEAM4S_PHASE134_MIGRATION_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/postgres?sslmode=disable' team4sv30-backend go test ./internal/migrations/... -run TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible -v -count=1 -timeout=180s` — passed (0.78s). `go build ./...` passed unconditionally with no DSN required.
- The new Go test file was not picked up automatically inside the running `team4sv30-backend` container (Docker Compose `develop: watch` sync is not active in this session, per the phase's operational note); copied it explicitly via `docker cp` before running `go build`/`go test`, then confirmed the container copy is byte-identical to the host file via `diff`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Migration 0159 is ready to apply against the live `team4s_v2` database (currently at migration 158, 259 `role_capabilities` rows) whenever the next migrate-up runs; it will converge the catalog to the same 232-row target 0154 already established, now with a genuinely idempotent/reversible pattern.
- No blockers for subsequent Phase 143 Wave 2 plans (143-05/06/07 dependencies already satisfied; this plan introduces no new dependency).

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-01*

## Self-Check: PASSED

All created files and commit hashes verified present:
- `database/migrations/0159_role_capability_defaults_reset.up.sql` - FOUND
- `database/migrations/0159_role_capability_defaults_reset.down.sql` - FOUND
- `backend/internal/migrations/phase143_role_capability_defaults_reset_test.go` - FOUND
- Commit `651546c2` (Task 1) - FOUND
- Commit `1df5db39` (Task 2) - FOUND
- Commit `d5d834ee` (plan metadata) - FOUND
