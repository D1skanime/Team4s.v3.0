---
phase: 137-central-effective-rights-resolver-overrides
plan: 13
subsystem: database
tags: [postgresql, migrations, rbac, permissions, vitest, go-test]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides
    provides: migration 0109's fansub_group_media.view seed, migration 0146's fansub_group_media.upload/.update/.reorder role grants, migration 0150's user_overridable pilot flags
provides:
  - migration 0151 seeding fansub_group_media.view for co_leader, founder, gfxler, and techadmin
  - a backend migration-contract/live-round-trip/role-scope regression test suite for migration 0151
  - a frontend regression test proving canUseMainTab's existing media-tab gate needs no code change
affects: [fansub-group-media, admin-fansub-edit, effective-rights-resolver]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "additive role_capabilities seed migration reusing the exact 0109 INSERT/ON CONFLICT (role_code, action_code) DO NOTHING shape"
    - "backend migration test package reuses phase136/phase137 shared helpers (readPhase136Migration, phase136MigrationPath, requirePhase136SQLContains, testsupport.OpenPhase106Postgres/ApplySQLFile) rather than redeclaring them"

key-files:
  created:
    - database/migrations/0151_fansub_group_media_view_role_defaults.up.sql
    - database/migrations/0151_fansub_group_media_view_role_defaults.down.sql
    - backend/internal/migrations/phase137_fansub_group_media_view_test.go
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts

key-decisions:
  - "Migration comments describe fansub_lead/project_lead only by role/description, never by literal role code string, so the acceptance-criteria grep for zero mentions of those two role codes in the migration files passes while still documenting intent."
  - "Zero change to fansubEditAccess.ts: the existing case \"media\": return capabilities.can_view_group_media gate already produces the correct result once the capability flag is true post-migration; only a new regression test was needed."

requirements-completed: [CAP-01, CAP-05, CAP-06, CAP-07]

# Metrics
duration: ~20min
completed: 2026-08-21
---

# Phase 137 Plan 13: Fansub Group Media View Role Defaults Summary

**Additive migration 0151 grants `fansub_group_media.view` to co_leader, founder, gfxler, and techadmin, closing the GAP-07/UAT-137-01 media-tab visibility gap for the four roles that already have write access, with zero frontend code change.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 completed
- **Files modified:** 4 (2 created migration files, 1 created test file, 1 modified test file)

## Accomplishments
- Migration 0151 (up/down) additively seeds `fansub_group_media.view` for exactly `co_leader`, `founder`, `gfxler`, `techadmin`, without touching migration 0109's `fansub_lead`/`project_lead` seeds or migrations 0146/0150
- New backend test suite (`phase137_fansub_group_media_view_test.go`) proves the migration's literal SQL text scope, a real live up/down/up round trip against Postgres (2 pre-existing rows -> 6 rows -> 2 rows -> 6 rows), and that a role with no prior media capabilities (`translator`) does not gain the grant
- New frontend regression test proves `canUseMainTab("media", false, caps)` is already `true` for a co_leader-shaped capability set once `can_view_group_media` is `true` — confirming zero change was needed to `fansubEditAccess.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migration 0151 (up + down) seeding fansub_group_media.view for the four roles** - `e46127bc` (feat)
2. **Task 2: Backend migration contract + regression tests, and frontend tab-gate regression test** - `f7cbb3ff` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `database/migrations/0151_fansub_group_media_view_role_defaults.up.sql` - additive `INSERT INTO role_capabilities ... ON CONFLICT (role_code, action_code) DO NOTHING` seeding the four target roles
- `database/migrations/0151_fansub_group_media_view_role_defaults.down.sql` - scoped `DELETE FROM role_capabilities WHERE action_code = 'fansub_group_media.view' AND role_code IN (...)` removing only the four new grants
- `backend/internal/migrations/phase137_fansub_group_media_view_test.go` - `TestPhase137FansubGroupMediaViewMigrationSourceContract`, `TestPhase137FansubGroupMediaViewMigrationLiveUpDownUp`, `TestPhase137FansubGroupMediaViewGrantedOnlyToTargetRoles`
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts` - new `it(...)` asserting the media tab becomes reachable for a co_leader-shaped capability set

## Decisions Made
- Migration header/rollback comments refer to `fansub_lead`/`project_lead` only descriptively ("the two original group-leadership roles" / "migration 0109's original two ... seeds") instead of by literal role-code string, satisfying the plan's strict acceptance criterion that neither file mentions these two role codes at all while keeping the intent documented for future readers.
- Followed the plan's explicit instruction to make no change to `fansubEditAccess.ts` — the existing gate (`capabilities.can_view_group_media`) already implements the correct behavior once the new migration is applied; only a proving test was added.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The plan's acceptance criteria for Task 1 required `grep -c "fansub_lead\|project_lead" ...` to print `0` for both migration files, but the first draft's explanatory comments named those roles directly, tripping the grep. Rewrote both header comments to describe the roles by their prior seeding role/history instead of by literal role code, re-verified the grep now prints `0` for both files before committing (caught before commit, not a post-hoc fix).
- Backend live-Postgres tests default to `SKIP` without `TEAM4S_PHASE106_TEST_DSN`. Created a disposable `team4s_phase106_test_13713` database (matching the required `^team4s_phase106_test_[a-z0-9]+$` naming pattern), ran the full verification suite against it for real, and dropped it afterward — following the same disposable-test-database convention documented in prior Phase 137 plan summaries (e.g. 137-01, 137-03).

## Verification Results
- `go test ./internal/migrations/... -run 'TestPhase137FansubGroupMediaView' -v -count=1` (real Postgres via disposable DB): all 3 new tests PASS
- `go test ./internal/migrations/... -count=1` (full package, same DSN): only the 5 pre-existing, unrelated failures remain (`TestPhase134MigrationFreshUpDownProof` needs `TEAM4S_PHASE134_MIGRATION_DSN`; 4 `TestPhase128*` tests need `TEAM4S_PHASE128_TEST_DSN`) — zero regressions from this plan's changes
- `go test ./internal/permissions/... -count=1`: PASS (unaffected, confirms no resolver-precedence change)
- `npm test -- --run "src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts"`: 10/10 tests PASS (9 pre-existing + 1 new)
- `gofmt -l internal/migrations/phase137_fansub_group_media_view_test.go`: clean (no output)
- `git diff --name-only` across both task commits shows exactly the 4 files declared in this plan's `files_modified` frontmatter and nothing else — `fansubEditAccess.ts`, `0146_capability_policy_catalog.up.sql`, and `0150_effective_rights_overrides.up.sql` are all byte-for-byte unmodified

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GAP-07 (UAT-137-01) is closed: `co_leader`, `founder`, `gfxler`, and `techadmin` will see and can access the fansub group media tab/list once migration 0151 is applied, matching their existing write capabilities.
- No outstanding follow-up work identified for this specific gap. Phase 137's remaining open item is GAP-06 (dispositioned as Fall C, decision required — see 137-12-SUMMARY.md), which is independent of this plan.

---
*Phase: 137-central-effective-rights-resolver-overrides*
*Completed: 2026-08-21*

## Self-Check: PASSED

All 5 created/modified files confirmed present on disk; both task commits (`e46127bc`, `f7cbb3ff`) confirmed present in git history.
