---
phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back
plan: 07
subsystem: testing
tags: [go, postgres, pgx, integration-test, fixture, role_definitions, episode_classification]

# Dependency graph
requires:
  - phase: 185 (sibling plans 185-02, 185-06)
    provides: Established pattern of hand-rolled fixture schemas drifting behind production migrations, and the precedent of investigating/fixing deeper gaps rather than surface-patching.
provides:
  - "episodes.episode_type_source column in openEpisodeImportSourceFixture, unblocking episode_classification.go's SELECT/RETURNING across 9 tests"
  - "episodes.filler_source + episode_type_source columns in openEpisodeVersionPublicFixture, unblocking the admin=true subtest of TestEpisodeVersionDateEditorContextBothSurfacesAndFailure"
  - "role_capabilities minimal stand-in plus role_definitions.color_key/icon_key/reserved columns in the Phase-135 fixture, unblocking TestListFansubGroupRoleDefinitionsGroupContextRoles"
affects: [185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back follow-on plans touching episode_classification.go, hist_group_member_roles_repository.go, or the Phase-135/Phase-117 fixture families]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "When a hand-rolled test fixture's real migration chain stops short of a column/table a later migration adds, and applying that later migration file in full would pull in unrelated tables the fixture never creates, mirror only the additive ALTER TABLE/CREATE TABLE statements with that migration's own defaults instead of the full file."

key-files:
  created: []
  modified:
    - backend/internal/repository/episode_import_source_integration_test.go
    - backend/internal/repository/episode_version_public_integration_test.go
    - backend/internal/testsupport/phase135_postgres.go

key-decisions:
  - "Mirrored migration 0146's role_definitions.color_key/icon_key additive columns by hand instead of applying 0146 in full, because 0146 also requires action_definitions.user_overridable plus app_users/fansub_groups rows that this minimal fixture never creates."
  - "Mirrored migration 0160's role_definitions.reserved additive column by hand instead of applying 0160 in full, because 0160's INSERT INTO role_capabilities ... ON CONFLICT (role_code, action_code) needs a UNIQUE/PK constraint that the deliberately constraint-free role_capabilities stand-in omits."
  - "Did not insert migration 0160's 'group_member' reserved pseudo-role row: the target test's expected result set never includes it regardless of presence, since the production query filters WHERE NOT rd.reserved."

requirements-completed: [D-02]

# Metrics
duration: ~25min
completed: 2026-10-16
---

# Phase 185 Plan 07: Three Independent Missing-Column/Table Fixture Gaps Summary

**Closed three unrelated hand-rolled-fixture-vs-production-schema drift gaps across episode classification and fansub-group role listing, surfacing and fixing a deeper two-migration gap in the Phase-135 fixture beyond what the plan anticipated.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-10-16T20:52:31Z
- **Tasks:** 3 (all type="auto")
- **Files modified:** 3

## Accomplishments
- `openEpisodeImportSourceFixture` gained `episodes.episode_type_source`, fixing all 7 tests in `episode_import_source_integration_test.go` plus 2 read-only consumers in `episode_version_delete_integration_test.go` (9 tests total).
- `openEpisodeVersionPublicFixture` gained `episodes.filler_source` and `episodes.episode_type_source`, fixing the `admin=true` subtest of `TestEpisodeVersionDateEditorContextBothSurfacesAndFailure`.
- The Phase-135 fixture gained a minimal empty `role_capabilities` stand-in plus (deviation, see below) `role_definitions.color_key`/`icon_key`/`reserved`, fixing `TestListFansubGroupRoleDefinitionsGroupContextRoles`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add episode_type_source to openEpisodeImportSourceFixture** - `6a45323ca` (fix)
2. **Task 2: Add filler_source and episode_type_source to openEpisodeVersionPublicFixture** - `f7e68d821` (fix)
3. **Task 3: Add a minimal empty role_capabilities stand-in to the Phase-135 fixture (plus the deeper color_key/icon_key/reserved gap, see Deviations)** - `56d79be40` (fix)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `backend/internal/repository/episode_import_source_integration_test.go` - Added `episode_type_source TEXT` to the existing `ALTER TABLE episodes ADD COLUMN ...` list in `openEpisodeImportSourceFixture`.
- `backend/internal/repository/episode_version_public_integration_test.go` - Extended the `ALTER TABLE episodes ADD COLUMN filler_type_id BIGINT, ADD COLUMN episode_type_id BIGINT` statement with `filler_source TEXT` and `episode_type_source TEXT`.
- `backend/internal/testsupport/phase135_postgres.go` - Added `CREATE TABLE role_capabilities (role_code TEXT, action_code TEXT)` stand-in next to the existing `hist_group_member_roles` stand-in, and added a second additive `ALTER TABLE role_definitions ADD COLUMN color_key ..., ADD COLUMN icon_key ..., ADD COLUMN reserved ...` statement mirroring migrations 0146 and 0160's new columns (see Deviations).

## Decisions Made
- Hand-mirrored only the new columns from migrations 0146 and 0160 instead of applying either file in full (see Deviations below) — this keeps the fixture minimal and avoids pulling in `action_definitions`/`app_users`/`fansub_groups` or adding a constraint the stand-in deliberately omits.
- Did not insert migration 0160's `group_member` reserved pseudo-role data row: unnecessary for the target test's assertions and avoids reintroducing the `ON CONFLICT` constraint problem that blocked applying 0160 as a real file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking, deeper gap than plan assumed] Phase-135 fixture also missing role_definitions.color_key/icon_key/reserved**
- **Found during:** Task 3 (adding the planned `role_capabilities` stand-in)
- **Issue:** After adding the plan's `role_capabilities` stand-in, `TestListFansubGroupRoleDefinitionsGroupContextRoles` still failed — first with `column rd.color_key does not exist`, then (after that fix) with `column rd.reserved does not exist`. `ListFansubGroupRoleDefinitions`'s SELECT reads `rd.color_key, rd.icon_key` (added by migration 0146, applied long after this fixture's 0085/0100/0103/0112 migration-chain cutoff) and filters `WHERE NOT rd.reserved` (added by migration 0160, also after the cutoff). Applying migration 0146 in full requires `action_definitions.user_overridable` plus populated `app_users`/`fansub_groups` rows the fixture never creates; applying migration 0160 in full fails with `there is no unique or exclusion constraint matching the ON CONFLICT specification` because its `INSERT INTO role_capabilities ... ON CONFLICT (role_code, action_code) DO NOTHING` needs a PK/UNIQUE constraint the plan's intentionally constraint-free `role_capabilities` stand-in omits.
- **Fix:** Added one additional `ALTER TABLE role_definitions ADD COLUMN color_key TEXT NOT NULL DEFAULT 'other', ADD COLUMN icon_key TEXT NOT NULL DEFAULT 'other', ADD COLUMN reserved BOOLEAN NOT NULL DEFAULT false;` statement after the real migration chain, mirroring each source migration's own column defaults without pulling in either migration's unrelated table dependencies or data inserts. Verified the target test's expected 14-role result set is unaffected by the absence of 0160's `group_member` row (the production query excludes `reserved=true` rows regardless).
- **Files modified:** `backend/internal/testsupport/phase135_postgres.go`
- **Verification:** `TestListFansubGroupRoleDefinitionsGroupContextRoles` passes against a throwaway `team4s_phase135_test_185p07` database; the full `internal/repository` package test run (named tests plus all `TestEpisodeImportSource*`/`TestEpisodeVersionPublic*`/`TestEpisodeVersionDate*`/`TestEpisodeVersionDelete*` suites) shows no regressions.
- **Committed in:** `56d79be40` (part of Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking/deeper-gap, per the reminder's 185-02/185-06 precedent)
**Impact on plan:** The plan's stated interface for `role_capabilities` (no FK) was followed exactly; the extra columns were a necessary correctness fix to make the one named test in Task 3 actually pass, not scope creep. No other files or behaviors were touched.

## Issues Encountered
None beyond the deviation documented above — each discovery (missing `color_key`/`icon_key`, then missing `reserved`) was found by iterating the actual `go test` failure output against a throwaway Postgres database, not guessed in advance.

## User Setup Required
None - no external service configuration required. All verification used throwaway `team4s_phase117_test_185p07`/`team4s_phase135_test_185p07` databases on the existing `team4sv30-db` compose service; both were dropped after verification. `team4s_v2` was never touched.

## Next Phase Readiness
- All 11 tests named in the plan's success criteria pass (9 + 1 + 1).
- `go build ./...`, `go vet ./internal/repository/... ./internal/testsupport/...`, and `gofmt -l` are clean on all three modified files.
- No stubs introduced; all changes are additive test-fixture schema extensions matching the threat model's "accept" disposition (no production code touched).

---
*Phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back*
*Completed: 2026-10-16*

## Self-Check: PASSED

All 3 modified files found on disk; all 4 commit hashes (`6a45323ca`, `f7e68d821`, `56d79be40`, `c6fab99a1`) found in `git log --oneline --all`.
